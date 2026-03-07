import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'

const TRIAL_DAYS = 3 // Keep in sync with src/config/trial.ts
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
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
          let page = 1
          while (!userId) {
            const { data: { users }, error: luErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
            if (luErr || !users || users.length === 0) break
            const match = users.find(u => u.email === session.customer_email)
            if (match) {
              userId = match.id
              console.warn('checkout.session.completed: resolved user via email fallback:', session.customer_email)
              break
            }
            if (users.length < 1000) break
            page++
          }
        }

        if (!userId) {
          console.error('checkout.session.completed: missing client_reference_id AND email fallback failed')
          dbFailed = true
          break
        }

        let tier = session.metadata?.tier ?? 'essentials'
        if (!session.metadata?.tier && session.amount_total) {
          // SOURCE OF TRUTH: 9900 halalas = 99 SAR — Elite tier threshold; override via ELITE_AMOUNT_MIN_HALALAS env
          const eliteMinHalalas = parseInt(Deno.env.get('ELITE_AMOUNT_MIN_HALALAS') ?? '9900', 10)
          tier = session.amount_total >= eliteMinHalalas ? 'elite' : 'essentials'
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
            console.error('checkout: failed to fetch subscription from Stripe — defaulting to trial:', fetchErr)
            checkoutStatus = 'trial'
            trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString()
          }
        }

        try {
          const referralFromMeta = session.metadata?.referral_code as string | undefined
          const updatePayload: Record<string, unknown> = {
            status: checkoutStatus,
            tier,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString(),
          }
          if (trialEndsAt) updatePayload.trial_ends_at = trialEndsAt
          if (referralFromMeta && /^PP-[A-Z0-9]{6}$/.test(referralFromMeta)) updatePayload.referred_by = referralFromMeta

          const { error, data: updateData } = await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('user_id', userId)
            .select('id')

          if (error) {
            console.error('checkout.session.completed DB error:', error)
            dbFailed = true
          } else if (!updateData || updateData.length === 0) {
            console.error('checkout.session.completed: no row found, upserting for user', userId)
            const { error: insertErr } = await supabase
              .from('subscriptions')
              .upsert({ user_id: userId, ...updatePayload }, { onConflict: 'user_id' })
            if (insertErr) {
              console.error('checkout.session.completed upsert fallback error:', insertErr)
              dbFailed = true
            }
          }
        } catch (dbErr) {
          console.error('checkout.session.completed DB exception:', dbErr)
          dbFailed = true
        }

        if (!dbFailed) {
          const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
          if (RESEND_API_KEY && session.customer_email) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'pptides <noreply@pptides.com>',
                reply_to: 'contact@pptides.com',
                to: session.customer_email,
                subject: 'تم تفعيل اشتراكك في pptides',
                headers: { 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>' },
                html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">مرحبًا بك في pptides!</h1>
                  <p style="color: #44403c; font-size: 16px; line-height: 1.8;">تم تفعيل اشتراكك في باقة <strong style="color: #059669;">${tier === 'elite' ? 'Elite' : 'Essentials'}</strong> بنجاح.</p>
                  <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #059669;">الخطوة التالية:</strong> تصفّح <a href="https://pptides.com/library" style="color: #059669; font-weight: bold;">مكتبة الببتيدات</a> واكتشف البروتوكول المناسب لك</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #059669;">المدرب الذكي:</strong> اسأل <a href="https://pptides.com/coach" style="color: #059669; font-weight: bold;">المدرب</a> عن بروتوكول مخصّص</p>
                  </div>
                  <div style="text-align: center; margin: 24px 0;">
                    ${emailButton('ابدأ الآن', 'https://pptides.com/dashboard')}
                  </div>
                  <p style="color: #78716c; font-size: 13px;">ضمان استرداد كامل خلال ${TRIAL_DAYS} أيام — تواصل معنا: contact@pptides.com</p>
                `),
              }),
            }).catch(e => console.error('payment confirmation email failed:', e))
          }

          // Update referral status + reward referrer when referred user pays
          if (userId) {
            const { data: userSub } = await supabase.from('subscriptions').select('referred_by').eq('user_id', userId).maybeSingle()
            if (userSub?.referred_by) {
              const { data: referral } = await supabase.from('referrals')
                .update({ status: 'subscribed', converted_at: new Date().toISOString(), reward_given: true })
                .eq('referred_id', userId).eq('referral_code', userSub.referred_by)
                .select('referrer_id').maybeSingle()

              if (referral?.referrer_id) {
                const { data: referrerSub } = await supabase.from('subscriptions')
                  .select('stripe_customer_id').eq('user_id', referral.referrer_id).maybeSingle()
                if (referrerSub?.stripe_customer_id) {
                  try {
                    // SOURCE OF TRUTH: 3400 halalas = 34 SAR = 1 month Essentials free; override via REFERRAL_REWARD_HALALAS env
                    const rewardHalalas = parseInt(Deno.env.get('REFERRAL_REWARD_HALALAS') ?? '3400', 10)
                    await stripe.invoiceItems.create({
                      customer: referrerSub.stripe_customer_id,
                      amount: -rewardHalalas,
                      currency: 'sar',
                      description: 'مكافأة إحالة — شهر مجاني (referral reward)',
                    })
                  } catch (e) { console.error('referral reward failed:', e) }
                }
              }
            }
          }
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
        else if (stripeStatus === 'incomplete' || stripeStatus === 'incomplete_expired') mappedStatus = 'expired'
        else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') mappedStatus = 'cancelled'
        else mappedStatus = 'expired'

        const trialEndsAt = stripeStatus === 'trialing' && subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : undefined

        try {
          const { error, data: rows } = await supabase.rpc('update_subscription_by_stripe_id', {
            p_stripe_subscription_id: stripeSubId,
            p_status: mappedStatus,
            p_current_period_end: periodEnd,
            p_trial_ends_at: trialEndsAt ?? null,
          })

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
          const { error, data: rows } = await supabase.rpc('update_subscription_by_stripe_id', {
            p_stripe_subscription_id: stripeSubId,
            p_status: 'cancelled',
            p_tier: 'free',
            p_current_period_end: periodEnd,
          })

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
            const { error, data: rows } = await supabase.rpc('update_subscription_by_stripe_id', {
              p_stripe_subscription_id: stripeSubId,
              p_status: 'active',
            })

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
            const { error, data: rows } = await supabase.rpc('update_subscription_by_stripe_id', {
              p_stripe_subscription_id: stripeSubId,
              p_status: 'past_due',
            })

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

          if (!dbFailed) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
            if (RESEND_API_KEY) {
              const customer = await stripe.customers.retrieve(invoice.customer as string).catch(() => null)
              const customerEmail = (customer && !customer.deleted) ? customer.email : null
              if (customerEmail) {
                const res = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                  body: JSON.stringify({
                    from: 'pptides <noreply@pptides.com>',
                    reply_to: 'contact@pptides.com',
                    to: customerEmail,
                    subject: 'دفعتك لم تتم — يرجى تحديث بيانات الدفع',
                    headers: { 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>' },
                    html: emailWrapper(`
                      <h1 style="color: #1c1917; font-size: 24px;">دفعتك لم تتم</h1>
                      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">لم تتم معالجة دفعتك. يرجى تحديث بيانات الدفع في حسابك لتجنّب فقدان الوصول.</p>
                      <div style="text-align: center; margin: 24px 0;">
                        ${emailButton('تحديث بيانات الدفع', 'https://pptides.com/account')}
                      </div>
                      <p style="color: #78716c; font-size: 13px;">إذا كنت بحاجة للمساعدة: contact@pptides.com</p>
                    `),
                  }),
                }).catch(e => { console.error('payment failed email error:', e); return null })
                if (res?.ok) {
                  await supabase.from('email_logs').insert({
                    email: customerEmail,
                    type: 'payment_failed',
                    status: 'sent',
                  }).catch(e => console.error('email_logs insert failed:', e))
                }
              }
            }
          }
        } else {
          console.error('invoice.payment_failed: missing subscription ID on invoice', invoice.id)
        }
        break
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (userId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
          if (error) { console.error('async_payment_succeeded DB error:', error); dbFailed = true }
        }
        break
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (userId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
          if (error) { console.error('async_payment_failed DB error:', error); dbFailed = true }
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const customerId = dispute.customer as string
        if (customerId) {
          const { error } = await supabase.from('subscriptions').update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)
          if (error) { console.error('charge.dispute.created DB error:', error); dbFailed = true }
        }
        console.error(JSON.stringify({ severity: 'CRITICAL', action: 'charge_disputed', customer: customerId, amount: dispute.amount, timestamp: new Date().toISOString() }))
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const customerId = charge.customer as string
        if (customerId && (charge.refunded || charge.amount_refunded > 0)) {
          const isFullRefund = charge.refunded
          const { error } = await supabase.from('subscriptions').update({
            status: isFullRefund ? 'cancelled' : 'active',
            ...(isFullRefund && { tier: 'free' }),
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)
          if (error) { console.error('charge.refunded DB error:', error); dbFailed = true }
          if (!isFullRefund) console.log('charge.refunded: partial refund — subscription kept active')
        }
        console.log(JSON.stringify({ action: 'charge_refunded', customer: customerId, amount: charge.amount_refunded, timestamp: new Date().toISOString() }))

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (RESEND_API_KEY && customerId) {
          const customer = await stripe.customers.retrieve(customerId).catch(() => null)
          const email = (customer && !customer.deleted) ? customer.email : null
          if (email) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'pptides <noreply@pptides.com>',
                reply_to: 'contact@pptides.com',
                to: email,
                subject: 'تم استرداد أموالك — pptides',
                headers: { 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>' },
                html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">تم استرداد أموالك</h1>
                  <p style="color: #44403c; font-size: 16px; line-height: 1.8;">تم معالجة استرداد أموالك بنجاح. سيظهر المبلغ في حسابك خلال 5-10 أيام عمل.</p>
                  <p style="color: #78716c; font-size: 13px;">إذا كان لديك أي استفسار: contact@pptides.com</p>
                `),
              }),
            }).catch(e => console.error('refund email failed:', e))
          }
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
        const hoursUntilEnd = trialEnd ? (trialEnd.getTime() - Date.now()) / 3600000 : 0
        const subCreated = subscription.created ? new Date(subscription.created * 1000) : new Date()
        const hoursSinceCreation = (Date.now() - subCreated.getTime()) / 3600000
        if (hoursUntilEnd > 80 || hoursSinceCreation < 24) {
          console.log(`trial_will_end: skipping — hoursUntilEnd=${hoursUntilEnd.toFixed(0)}, hoursSinceCreation=${hoursSinceCreation.toFixed(0)}`)
          break
        }
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (RESEND_API_KEY && customerId) {
          const customer = await stripe.customers.retrieve(customerId).catch(() => null)
          const email = (customer && !customer.deleted) ? customer.email : null
          if (email) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'pptides <noreply@pptides.com>',
                reply_to: 'contact@pptides.com',
                to: email,
                subject: ' تجربتك تنتهي قريبًا — لا تفقد وصولك',
                headers: { 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>' },
                html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">تجربتك تنتهي قريبًا</h1>
                  <p style="color: #44403c; font-size: 16px; line-height: 1.8;">سيتم تحصيل الدفعة تلقائيًا عند انتهاء التجربة. إذا لم ترغب بالاستمرار، يمكنك الإلغاء من حسابك.</p>
                  <div style="text-align: center; margin: 24px 0;">
                    ${emailButton('تصفّح pptides', 'https://pptides.com/dashboard')}
                  </div>
                `),
              }),
            }).catch(e => console.error('trial_will_end email error:', e))
          }
        }
        break
      }

      default:
        console.log('Unhandled Stripe event type:', event.type)
    }

    if (dbFailed) {
      await supabase.from('processed_webhook_events').delete().eq('event_id', event.id).catch(() => {})
      console.error(JSON.stringify({ severity: 'CRITICAL', action: 'webhook_db_failed', event_type: event.type, event_id: event.id, timestamp: new Date().toISOString() }))
      return jsonResponse({ error: 'Database update failed' }, 500)
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error(JSON.stringify({ severity: 'CRITICAL', action: 'webhook_unhandled_error', error: (error as Error).message, timestamp: new Date().toISOString() }))
    return jsonResponse({ error: 'Internal webhook error' }, 500)
  }
})
