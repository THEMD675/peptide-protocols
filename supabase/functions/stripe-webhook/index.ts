import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'
import { sendEmail } from '../_shared/send-email.ts'

const TRIAL_DAYS = 3 // Keep in sync with src/config/trial.ts
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, stripe-signature',
      },
    })
  }

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
    if (dedupError) {
      if (dedupError.code === '23505') {
        console.log('stripe-webhook: duplicate event skipped:', event.id)
        return jsonResponse({ received: true, duplicate: true })
      }
      console.error('stripe-webhook: dedup insert failed (non-duplicate):', dedupError)
      return jsonResponse({ error: 'Dedup check failed' }, 500)
    }

    let dbFailed = false

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        let userId = session.client_reference_id
        const stripeCustomerId = session.customer as string | null
        const stripeSubscriptionId = session.subscription as string | null

        if (!userId && session.customer_email) {
          // Direct lookup by email — O(1) instead of paginating all users
          const { data: profileMatch } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', session.customer_email)
            .limit(1)
            .single()
          if (profileMatch) {
            userId = profileMatch.id
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
            console.error('checkout: failed to fetch subscription from Stripe — NOT defaulting to trial:', fetchErr)
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
            console.error('checkout.session.completed: no row found, inserting for user', userId)
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

        if (!dbFailed) {
          // Mark any abandoned checkout records as recovered
          if (session.customer_email) {
            await supabase.from('abandoned_checkouts')
              .update({ recovered: true })
              .eq('email', session.customer_email)
              .eq('recovered', false)
              .then(({ error: recErr }) => {
                if (recErr) console.error('checkout.session.completed: failed to mark abandoned as recovered:', recErr)
              })
          }

          if (session.customer_email) {
            sendEmail({
              to: session.customer_email,
              subject: 'تم تفعيل اشتراكك في pptides',
              tags: [{ name: 'type', value: 'subscription_activated' }, { name: 'category', value: 'transactional' }],
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
              replyTo: 'contact@pptides.com',
            }).catch(e => console.error('payment confirmation email failed:', e))
          }

          // Update referral status + reward referrer with a promo code when referred user pays
          if (userId) {
            const { data: userSub } = await supabase.from('subscriptions').select('referred_by').eq('user_id', userId).maybeSingle()
            if (userSub?.referred_by) {
              const { data: referral } = await supabase.from('referrals')
                .select('referrer_id, reward_given')
                .eq('referred_id', userId).eq('referral_code', userSub.referred_by)
                .maybeSingle()

              if (referral?.referrer_id && !referral.reward_given) {
                try {
                  // Referral reward cap: max 5 rewards per referrer
                  const { count: rewardCount } = await supabase.from('referrals')
                    .select('id', { count: 'exact', head: true })
                    .eq('referrer_id', referral.referrer_id)
                    .eq('reward_given', true)

                  if ((rewardCount ?? 0) >= 5) {
                    console.log('referral reward cap reached for referrer:', referral.referrer_id)
                    // Mark as converted but don't give reward
                    await supabase.from('referrals')
                      .update({ status: 'converted', converted_at: new Date().toISOString() })
                      .eq('referred_id', userId).eq('referral_code', userSub.referred_by)
                  } else {
                    // Auto-apply the referral_reward coupon directly to the referrer's subscription
                    // (no manual promo code needed — reward is automatic)
                    const { data: referrerSub } = await supabase.from('subscriptions')
                      .select('stripe_subscription_id')
                      .eq('user_id', referral.referrer_id)
                      .maybeSingle()

                    let rewardApplied = false
                    if (referrerSub?.stripe_subscription_id) {
                      try {
                        await stripe.subscriptions.update(referrerSub.stripe_subscription_id, {
                          coupon: 'referral_reward',
                        })
                        rewardApplied = true
                        console.log('referral reward auto-applied to subscription:', referrerSub.stripe_subscription_id, 'for referrer:', referral.referrer_id)
                      } catch (couponErr) {
                        console.error('referral reward auto-apply failed, falling back to promo code:', couponErr)
                      }
                    }

                    // Fallback: create a manual promo code if auto-apply failed (e.g. no active sub)
                    let rewardCode: string | undefined
                    let promoId: string | undefined
                    if (!rewardApplied) {
                      const promoCode = await stripe.promotionCodes.create({
                        coupon: 'referral_reward',
                        max_redemptions: 1,
                        metadata: { referrer_id: referral.referrer_id, referred_id: userId },
                      })
                      rewardCode = promoCode.code
                      promoId = promoCode.id
                      console.log('referral reward promo code created (fallback):', promoCode.code, 'for referrer:', referral.referrer_id)
                    }

                    // Update referral record
                    await supabase.from('referrals')
                      .update({
                        status: 'rewarded',
                        converted_at: new Date().toISOString(),
                        reward_given: true,
                        ...(rewardCode ? { reward_code: rewardCode, stripe_promotion_code_id: promoId } : {}),
                      })
                      .eq('referred_id', userId).eq('referral_code', userSub.referred_by)

                    // Notify the referrer
                    await supabase.from('notifications').insert({
                      user_id: referral.referrer_id,
                      type: 'referral',
                      title_ar: '🎁 مكافأة إحالة!',
                      body_ar: rewardApplied
                        ? 'شكرًا! تم تطبيق شهر مجاني على اشتراكك تلقائيًا لأنك دعوت صديقًا.'
                        : `شكرًا! حصلت على شهر مجاني لأنك دعوت صديقًا. استخدم الكود: ${rewardCode}`,
                    })
                  }
                } catch (e) { console.error('referral reward failed:', e) }
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
        // FIX: If Stripe status is 'active' but cancel_at_period_end is true,
        // the user cancelled — map to 'cancelled' to avoid overwriting the cancel function's DB update.
        if (stripeStatus === 'active' && subscription.cancel_at_period_end) mappedStatus = 'cancelled'
        else if (stripeStatus === 'active') mappedStatus = 'active'
        else if (stripeStatus === 'trialing') mappedStatus = 'trial'
        else if (stripeStatus === 'past_due') mappedStatus = 'past_due'
        else if (stripeStatus === 'incomplete' || stripeStatus === 'incomplete_expired') mappedStatus = 'expired'
        else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') mappedStatus = 'cancelled'
        else mappedStatus = 'expired'

        const trialEndsAt = stripeStatus === 'trialing' && subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : undefined

        // FIX: Sync tier from subscription metadata or infer from price amount
        let tierUpdate: string | undefined
        const metaTier = subscription.metadata?.tier
        if (metaTier && (metaTier === 'essentials' || metaTier === 'elite')) {
          tierUpdate = metaTier
        } else if (subscription.items?.data?.length) {
          // Infer tier from price amount — elite threshold from env or default 9900 halalas (99 SAR)
          const totalAmount = subscription.items.data.reduce((sum, item) => sum + ((item.price?.unit_amount ?? 0) * (item.quantity ?? 1)), 0)
          const eliteMinHalalas = parseInt(Deno.env.get('ELITE_AMOUNT_MIN_HALALAS') ?? '9900', 10)
          tierUpdate = totalAmount >= eliteMinHalalas ? 'elite' : 'essentials'
        }

        // Extract billing interval from Stripe price
        let billingInterval: string | undefined
        if (subscription.items?.data?.length) {
          const priceInterval = subscription.items.data[0]?.price?.recurring?.interval
          if (priceInterval === 'year') billingInterval = 'year'
          else if (priceInterval === 'month') billingInterval = 'month'
        }

        try {
          const rpcParams: Record<string, unknown> = {
            p_stripe_subscription_id: stripeSubId,
            p_status: mappedStatus,
            p_current_period_end: periodEnd,
            p_trial_ends_at: trialEndsAt ?? null,
          }
          if (tierUpdate) rpcParams.p_tier = tierUpdate

          const { error, data: rows } = await supabase.rpc('update_subscription_by_stripe_id', rpcParams)

          if (error) {
            console.error('subscription.updated DB error:', error)
            dbFailed = true
          } else if (!rows || rows.length === 0) {
            console.error('subscription.updated: zero rows matched stripe_subscription_id:', stripeSubId)
            dbFailed = true
          }

          // Store billing_interval separately (not in the existing RPC)
          if (billingInterval) {
            await supabase
              .from('subscriptions')
              .update({ billing_interval: billingInterval })
              .eq('stripe_subscription_id', stripeSubId)
              .then(({ error: biErr }) => {
                if (biErr) console.error('billing_interval update failed:', biErr)
              })
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
            // FIX: pass p_clear_trial=true so trial_ends_at is cleared when a real payment is processed.
            // Previously COALESCE would keep the stale trial_ends_at value even after conversion to paid.
            const { error, data: rows } = await supabase.rpc('update_subscription_by_stripe_id', {
              p_stripe_subscription_id: stripeSubId,
              p_status: 'active',
              p_clear_trial: true,
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

          // REFERRAL FRIEND DISCOUNT: Apply 40% off to the referred user's NEXT (2nd) invoice
          // This fires on the FIRST paid invoice for a referred user.
          // We check: (a) user was referred, (b) this is their first payment, (c) discount not already applied.
          if (!dbFailed) {
            try {
              const { data: subRow } = await supabase.from('subscriptions')
                .select('user_id, referred_by, referral_friend_discount_applied')
                .eq('stripe_subscription_id', stripeSubId)
                .maybeSingle()

              if (subRow?.referred_by && !subRow.referral_friend_discount_applied) {
                // Verify this is from a valid referrer
                const { data: referrerExists } = await supabase.from('subscriptions')
                  .select('user_id')
                  .eq('referral_code', subRow.referred_by)
                  .maybeSingle()

                if (referrerExists) {
                  // Apply 40% coupon to the subscription for the NEXT billing cycle only
                  await stripe.subscriptions.update(stripeSubId, {
                    coupon: 'referral_friend_40_second',
                  })
                  console.log('referral friend 40% discount applied to next invoice for sub:', stripeSubId)

                  // Mark as applied so we don't apply it again on subsequent invoices
                  await supabase.from('subscriptions')
                    .update({ referral_friend_discount_applied: true, updated_at: new Date().toISOString() })
                    .eq('stripe_subscription_id', stripeSubId)
                }
              }
            } catch (refErr) {
              // Non-fatal: log but don't fail the webhook
              console.error('invoice.paid: referral friend discount application failed:', refErr)
            }
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
            const customer = await stripe.customers.retrieve(invoice.customer as string).catch(() => null)
            const customerEmail = (customer && !customer.deleted) ? customer.email : null
            if (customerEmail) {
              const emailResult = await sendEmail({
                to: customerEmail,
                subject: 'دفعتك لم تتم — يرجى تحديث بيانات الدفع',
                tags: [{ name: 'type', value: 'payment_failed' }, { name: 'category', value: 'transactional' }],
                html: emailWrapper(`
                      <h1 style="color: #1c1917; font-size: 24px;">دفعتك لم تتم</h1>
                      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">لم تتم معالجة دفعتك. يرجى تحديث بيانات الدفع في حسابك لتجنّب فقدان الوصول.</p>
                      <div style="text-align: center; margin: 24px 0;">
                        ${emailButton('تحديث بيانات الدفع', 'https://pptides.com/account')}
                      </div>
                      <p style="color: #78716c; font-size: 13px;">إذا كنت بحاجة للمساعدة: contact@pptides.com</p>
                    `),
                replyTo: 'contact@pptides.com',
              }).catch(e => { console.error('payment failed email error:', e); return null })
              if (emailResult?.ok) {
                await supabase.from('email_logs').insert({
                  email: customerEmail,
                  type: 'payment_failed',
                  status: 'sent',
                }).catch(e => console.error('email_logs insert failed:', e))
              }
            }
          }
        } else {
          console.error('invoice.payment_failed: missing subscription ID on invoice', invoice.id)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const email = session.customer_email
        if (email) {
          let tier = session.metadata?.tier ?? 'essentials'
          if (!session.metadata?.tier && session.amount_total) {
            const eliteMinHalalas = parseInt(Deno.env.get('ELITE_AMOUNT_MIN_HALALAS') ?? '9900', 10)
            tier = session.amount_total >= eliteMinHalalas ? 'elite' : 'essentials'
          }
          const { error } = await supabase.from('abandoned_checkouts').insert({
            user_id: userId ?? null,
            email,
            tier,
            stripe_session_id: session.id,
          })
          if (error && error.code !== '23505') {
            console.error('checkout.session.expired: failed to log abandoned checkout:', error)
          }
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
            tier: 'free',
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)
          if (error) { console.error('charge.dispute.created DB error:', error); dbFailed = true }
        }
        console.error(JSON.stringify({ severity: 'CRITICAL', action: 'charge_disputed', customer: customerId, amount: dispute.amount, timestamp: new Date().toISOString() }))

        // Notify admin about the dispute
        if (customerId) {
          const adminEmail = Deno.env.get('ADMIN_EMAIL_WHITELIST')?.split(',')[0]?.trim() || 'contact@pptides.com'
          const customer = await stripe.customers.retrieve(customerId).catch(() => null)
          const customerEmail = (customer && !customer.deleted) ? customer.email : 'unknown'
          sendEmail({
            to: adminEmail,
            subject: 'تنبيه: نزاع دفع جديد — pptides',
            tags: [{ name: 'type', value: 'dispute_alert' }, { name: 'category', value: 'admin_alert' }],
            html: emailWrapper(`
                <h1 style="color: #dc2626; font-size: 24px;">تنبيه: نزاع دفع جديد</h1>
                <p><strong>العميل:</strong> ${customerEmail}</p>
                <p><strong>المبلغ:</strong> ${(dispute.amount / 100).toFixed(2)} ${dispute.currency?.toUpperCase()}</p>
                <p><strong>السبب:</strong> ${dispute.reason ?? 'غير محدد'}</p>
                <p style="color: #dc2626; font-weight: bold;">تم إلغاء اشتراك العميل تلقائيًا. يرجى الرد على النزاع في لوحة Stripe.</p>
                <div style="text-align: center; margin: 24px 0;">
                  ${emailButton('فتح Stripe Dashboard', 'https://dashboard.stripe.com/disputes')}
                </div>
              `),
          }).catch(e => console.error('dispute admin email failed:', e))
        }
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

        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId).catch(() => null)
          const email = (customer && !customer.deleted) ? customer.email : null
          if (email) {
            sendEmail({
              to: email,
              subject: 'تم استرداد أموالك — pptides',
              tags: [{ name: 'type', value: 'refund' }, { name: 'category', value: 'transactional' }],
              html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">تم استرداد أموالك</h1>
                  <p style="color: #44403c; font-size: 16px; line-height: 1.8;">تم معالجة استرداد أموالك بنجاح. سيظهر المبلغ في حسابك خلال 5-10 أيام عمل.</p>
                  <p style="color: #78716c; font-size: 13px;">إذا كان لديك أي استفسار: contact@pptides.com</p>
                `),
              replyTo: 'contact@pptides.com',
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
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId).catch(() => null)
          const email = (customer && !customer.deleted) ? customer.email : null
          if (email) {
            sendEmail({
              to: email,
              subject: 'تجربتك تنتهي قريبًا — لا تفقد وصولك',
              tags: [{ name: 'type', value: 'trial_ending' }, { name: 'category', value: 'transactional' }],
              html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">تجربتك تنتهي قريبًا</h1>
                  <p style="color: #44403c; font-size: 16px; line-height: 1.8;">سيتم تحصيل الدفعة تلقائيًا عند انتهاء التجربة. إذا لم ترغب بالاستمرار، يمكنك الإلغاء من حسابك.</p>
                  <div style="text-align: center; margin: 24px 0;">
                    ${emailButton('تصفّح pptides', 'https://pptides.com/dashboard')}
                  </div>
                `),
              replyTo: 'contact@pptides.com',
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
