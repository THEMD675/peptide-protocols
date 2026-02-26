import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2023-10-16' })
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      const stripeCustomerId = session.customer as string
      const stripeSubscriptionId = session.subscription as string

      if (userId) {
        let tier = session.metadata?.tier ?? 'essentials'
        if (!session.metadata?.tier && session.amount_total) {
          tier = session.amount_total >= 5000 ? 'elite' : 'essentials'
        }

        const { error, data: updateData } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            tier,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select('id')

        if (error) {
          console.error('checkout.session.completed DB error:', error)
        } else if (!updateData || updateData.length === 0) {
          console.error('checkout.session.completed: no subscription row found for user', userId)
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubId = subscription.id
      const stripeStatus = subscription.status
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

      let mappedStatus: string
      if (stripeStatus === 'active') mappedStatus = 'active'
      else if (stripeStatus === 'trialing') mappedStatus = 'trial'
      else if (stripeStatus === 'past_due') mappedStatus = 'active'
      else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') mappedStatus = 'cancelled'
      else mappedStatus = 'expired'

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: mappedStatus,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSubId)

      if (error) console.error('subscription.updated DB error:', error)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubId = subscription.id
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSubId)

      if (error) console.error('subscription.deleted DB error:', error)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSubId = invoice.subscription as string

      if (stripeSubId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubId)

        if (error) console.error('payment_failed DB error:', error)
      }
      break
    }

    default:
      console.log('Unhandled event type:', event.type)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
