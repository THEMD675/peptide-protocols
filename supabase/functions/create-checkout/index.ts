import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const appUrl = Deno.env.get('APP_URL') ?? 'https://pptides.com'

import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const PRICE_IDS: Record<string, Record<string, string>> = {
  essentials: {
    monthly: Deno.env.get('STRIPE_PRICE_ESSENTIALS') ?? '',
    annual: Deno.env.get('STRIPE_PRICE_ESSENTIALS_ANNUAL') ?? '',
  },
  elite: {
    monthly: Deno.env.get('STRIPE_PRICE_ELITE') ?? '',
    annual: Deno.env.get('STRIPE_PRICE_ELITE_ANNUAL') ?? '',
  },
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!stripeKey || !supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not set — cannot enforce rate limits')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    {
      const adminDb = createClient(supabaseUrl, serviceKey)
      const allowed = await checkRateLimit(adminDb, {
        endpoint: 'create-checkout',
        identifier: user.id,
        windowSeconds: 3600,
        maxRequests: 5,
      })
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'محاولات كثيرة — حاول لاحقًا' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    let body: { tier?: string; billing?: string; referralCode?: string; coupon?: string }
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const tier = body.tier as string
    const billing = body.billing === 'annual' ? 'annual' : 'monthly'
    const referralCode = (body.referralCode && /^PP-[A-Z0-9]{6}$/.test(String(body.referralCode))) ? String(body.referralCode) : undefined
    const couponParam = body.coupon && /^[a-zA-Z0-9_]+$/.test(String(body.coupon)) ? String(body.coupon) : undefined
    if (!tier || !PRICE_IDS[tier]) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const priceId = PRICE_IDS[tier][billing]
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Price not configured. Contact support.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at, stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingSub?.status === 'active' || existingSub?.status === 'past_due') {
      return new Response(JSON.stringify({ error: 'لديك اشتراك فعّال بالفعل', alreadySubscribed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // FIX: If user cancelled (cancel_at_period_end) but sub is still active in Stripe,
    // un-cancel it instead of creating a new checkout session (avoids duplicate subscriptions).
    if (existingSub?.status === 'cancelled' && existingSub?.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id)
        if (stripeSub.status === 'active' && stripeSub.cancel_at_period_end) {
          await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
            cancel_at_period_end: false,
          })
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          if (serviceKey) {
            const adminDb = createClient(supabaseUrl, serviceKey)
            await adminDb.from('subscriptions').update({
              status: 'active',
              updated_at: new Date().toISOString(),
            }).eq('user_id', user.id)
          }
          return new Response(JSON.stringify({ reactivated: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } catch (reactivateErr) {
        console.error('create-checkout: reactivation check failed, proceeding to new checkout:', reactivateErr)
      }
    }

    // Skip Stripe trial if user already had ANY trial (DB trial_ends_at set), a prior Stripe sub, or is currently on trial
    const hadTrialOrSub = !!existingSub?.stripe_subscription_id || !!existingSub?.trial_ends_at || existingSub?.status === 'trial'

    // DB-level lock: prevent double-submit race condition by checking for a recent pending session
    // Uses Supabase service role to upsert a checkout lock record per user
    {
      const adminDb = createClient(supabaseUrl, serviceKey)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: existingLock } = await adminDb
        .from('checkout_locks')
        .select('stripe_session_url, created_at')
        .eq('user_id', user.id)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existingLock?.stripe_session_url) {
        return new Response(JSON.stringify({ url: existingLock.stripe_session_url }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const openSessions = await stripe.checkout.sessions.list({
      limit: 10,
      ...(existingSub?.stripe_customer_id ? { customer: existingSub.stripe_customer_id } : {}),
    })
    const reusable = openSessions.data.find(
      (s) =>
        s.client_reference_id === user.id &&
        s.status === 'open' &&
        s.url &&
        Date.now() - (s.created * 1000) < 5 * 60 * 1000,
    )
    if (reusable?.url) {
      return new Response(JSON.stringify({ url: reusable.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const existingCustomerId = existingSub?.stripe_customer_id ?? null

    // Determine which coupon to apply (if any):
    // Referral: NO discount at checkout. Friend pays full price on first payment.
    // The 40% friend discount is applied to their SECOND invoice via stripe-webhook (invoice.paid).
    // Only explicit coupon params (e.g. retention_20_pct from win-back emails) apply at checkout.
    let checkoutDiscount: string | undefined
    let validatedReferralCode: string | undefined

    if (referralCode) {
      // Validate the referral code exists in the DB — store in subscription metadata only
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (serviceKey) {
        const adminDb = createClient(supabaseUrl, serviceKey)
        const { data: referrerSub } = await adminDb.from('subscriptions')
          .select('user_id')
          .eq('referral_code', referralCode)
          .maybeSingle()
        if (referrerSub) {
          // FIX 5: Referral cap — max 10 referrals per user per month to prevent abuse
          const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
          const { count: referralCount } = await adminDb.from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('referred_by', referrerSub.user_id)
            .gte('created_at', monthAgo)
          
          const MAX_REFERRALS_PER_MONTH = 10
          if ((referralCount ?? 0) < MAX_REFERRALS_PER_MONTH) {
            validatedReferralCode = referralCode
          } else {
            console.log(`Referral cap reached for user ${referrerSub.user_id}: ${referralCount} referrals this month`)
            // Don't fail the checkout — just skip the referral code silently
          }
        }
      }
    }
    if (couponParam) {
      checkoutDiscount = couponParam
    }

    // Idempotency key: user + price + 5-minute bucket to prevent duplicate sessions on double-click/retry
    const idempotencyKey = `${user.id}_${priceId}_${Math.floor(Date.now() / 300000)}`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      locale: 'auto',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: user.email }),
      subscription_data: {
        trial_period_days: hadTrialOrSub ? undefined : 3,
        metadata: { tier, user_id: user.id, ...(validatedReferralCode ? { referral_code: validatedReferralCode } : {}) },
        description: `pptides — ${tier === 'elite' ? 'الباقة المتقدمة' : 'الباقة الأساسية'}`,
      },
      metadata: { tier, user_id: user.id, ...(validatedReferralCode ? { referral_code: validatedReferralCode } : {}) },
      success_url: `${appUrl}/dashboard?payment=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?payment=cancelled`,
      // When a discount coupon is auto-applied, don't also allow manual promo codes (prevents stacking)
      ...(checkoutDiscount
        ? { discounts: [{ coupon: checkoutDiscount }] }
        : { allow_promotion_codes: true }),
      custom_text: {
        submit: { message: hadTrialOrSub ? 'اشتراكك يبدأ فورًا — إلغاء في أي وقت' : 'تجربة مجانية ٣ أيام — لن يتم خصم أي مبلغ الآن' },
      },
    }, {
      idempotencyKey,
    })

    // Persist checkout lock so double-submits within 5 minutes return this session
    if (session.url) {
      try {
        const adminDb = createClient(supabaseUrl, serviceKey)
        await adminDb.from('checkout_locks').upsert({
          user_id: user.id,
          stripe_session_url: session.url,
          stripe_session_id: session.id,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } catch (lockErr) {
        console.error('create-checkout: failed to persist checkout lock:', lockErr)
        // Non-fatal — the session was already created
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('create-checkout error:', error)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
