import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    if (!stripeKey || !endpointSecret) {
      console.error('stripe-webhook: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
      return jsonResponse({ error: 'Server misconfigured' }, 500)
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('stripe-webhook: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return jsonResponse({ error: 'Server misconfigured' }, 500)
    }

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe signature' }, 400)
    }

    const body = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('stripe-webhook signature verification failed:', (err as Error).message)
      return jsonResponse({ error: 'Invalid webhook signature' }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: dedupError } = await supabase
      .from('processed_webhook_events')
      .insert({ event_id: event.id, event_type: event.type })
    if (dedupError && dedupError.code === '23505') {
      console.log('stripe-webhook: duplicate event skipped:', event.id)
      return jsonResponse({ received: true, duplicate: true })
    }

    let dbFailed = false

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        let userId = session.client_reference_id
        const stripeCustomerId = session.customer as string | null
        const stripeSubscriptionId = session.subscription as string | null

        if (!userId && session.customer_email) {
          const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
          const match = users?.find(u => u.email === session.customer_email)
          if (match) {
            userId = match.id
            console.warn('checkout.session.completed: resolved user via email fallback:', session.customer_email)
          }
        }

        if (!userId) {
          console.error('checkout.session.completed: missing client_reference_id AND email fallback failed')
          dbFailed = true
          break
        }

        let tier = session.metadata?.tier ?? 'essentials'
        if (!session.metadata?.tier && session.amount_total) {
          tier = session.amount_total >= 9900 ? 'elite' : 'essentials'
          console.warn('checkout.session.completed: tier determined by amount fallback, set metadata.tier on checkout session for reliability')
        }

        let checkoutStatus = 'active'
        let trialEndsAt: string | undefined

        if (stripeSubscriptionId) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
            if (stripeSub.status === 'trialing') {
              checkoutStatus = 'trial'
              if (stripeSub.trial_end) {
                trialEndsAt = new Date(stripeSub.trial_end * 1000).toISOString()
              }
            }
          } catch (fetchErr) {
            console.error('checkout: failed to fetch subscription from Stripe:', fetchErr)
          }
        }

        try {
          const updatePayload: Record<string, unknown> = {
            status: checkoutStatus,
            tier,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString(),
          }
          if (trialEndsAt) {
            updatePayload.trial_ends_at = trialEndsAt
          }

          const { error, data: updateData } = await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('user_id', userId)
            .select('id')

          if (error) {
            console.error('checkout.session.completed DB error:', error)
            dbFailed = true
          } else if (!updateData || updateData.length === 0) {
            console.error('checkout.session.completed: no row found, inserting new one for user', userId)
            const { error: insertErr } = await supabase
              .from('subscriptions')
              .insert({ user_id: userId, ...updatePayload })
            if (insertErr) {
              console.error('checkout.session.completed insert fallback error:', insertErr)
              dbFailed = true
            }
          }
        } catch (dbErr) {
          console.error('checkout.session.completed DB exception:', dbErr)
          dbFailed = true
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeSubId = subscription.id
        const stripeStatus = subscription.status
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

        let mappedStatus: string
        if (stripeStatus === 'active') mappedStatus = 'active'
        else if (stripeStatus === 'trialing') mappedStatus = 'trial'
        else if (stripeStatus === 'past_due') mappedStatus = 'past_due'
        else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') mappedStatus = 'cancelled'
        else mappedStatus = 'expired'

        const updatePayload: Record<string, unknown> = {
          status: mappedStatus,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }

        if (stripeStatus === 'trialing' && subscription.trial_end) {
          updatePayload.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
        }

        try {
          const { error, data: rows } = await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('stripe_subscription_id', stripeSubId)
            .select('id')

          if (error) {
            console.error('subscription.updated DB error:', error)
            dbFailed = true
          } else if (!rows || rows.length === 0) {
            console.error('subscription.updated: zero rows matched stripe_subscription_id:', stripeSubId)
            dbFailed = true
          }
        } catch (dbErr) {
          console.error('subscription.updated DB exception:', dbErr)
          dbFailed = true
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeSubId = subscription.id
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

        try {
          const { error, data: rows } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              current_period_end: periodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', stripeSubId)
            .select('id')

          if (error) {
            console.error('subscription.deleted DB error:', error)
            dbFailed = true
          } else if (!rows || rows.length === 0) {
            console.error('subscription.deleted: zero rows matched stripe_subscription_id:', stripeSubId)
            dbFailed = true
          }
        } catch (dbErr) {
          console.error('subscription.deleted DB exception:', dbErr)
          dbFailed = true
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = invoice.subscription as string | null
        const amountPaid = invoice.amount_paid ?? 0

        if (stripeSubId && amountPaid > 0) {
          try {
            const { error, data: rows } = await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', stripeSubId)
              .select('id')

            if (error) {
              console.error('invoice.paid DB error:', error)
              dbFailed = true
            } else if (!rows || rows.length === 0) {
              console.error('invoice.paid: zero rows matched stripe_subscription_id:', stripeSubId)
              dbFailed = true
            }
          } catch (dbErr) {
            console.error('invoice.paid DB exception:', dbErr)
            dbFailed = true
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = invoice.subscription as string | null

        if (stripeSubId) {
          try {
            const { error, data: rows } = await supabase
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', stripeSubId)
              .select('id')

            if (error) {
              console.error('invoice.payment_failed DB error:', error)
              dbFailed = true
            } else if (!rows || rows.length === 0) {
              console.error('invoice.payment_failed: zero rows matched stripe_subscription_id:', stripeSubId)
              dbFailed = true
            } else {
              console.log('payment_failed: status set to past_due, Stripe will retry billing')
            }
          } catch (dbErr) {
            console.error('invoice.payment_failed DB exception:', dbErr)
            dbFailed = true
          }
        } else {
          console.error('invoice.payment_failed: missing subscription ID on invoice', invoice.id)
        }
        break
      }

      default:
        console.log('Unhandled Stripe event type:', event.type)
    }

    if (dbFailed) {
      await supabase.from('processed_webhook_events').delete().eq('event_id', event.id).catch(() => {})
      return jsonResponse({ error: 'Database update failed' }, 500)
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('stripe-webhook unhandled error:', error)
    return jsonResponse({ error: 'Internal webhook error' }, 500)
  }
})
