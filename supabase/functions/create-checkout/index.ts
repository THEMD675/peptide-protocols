import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const appUrl = Deno.env.get('APP_URL') ?? 'https://pptides.com'

import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'

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

    try {
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (serviceKey) {
        const adminDb = createClient(supabaseUrl, serviceKey)
        const oneMinAgo = new Date(Date.now() - 60000).toISOString()
        const { count } = await adminDb.from('rate_limits').select('id', { count: 'exact', head: true }).eq('endpoint', 'create-checkout').eq('user_id', user.id).gte('created_at', oneMinAgo)
        if ((count ?? 0) >= 5) {
          return new Response(JSON.stringify({ error: 'محاولات كثيرة — انتظر دقيقة' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        adminDb.from('rate_limits').insert({ user_id: user.id, endpoint: 'create-checkout' }).then(() => {}).catch(() => {})
      }
    } catch (rlErr) { console.error('rate limit check failed:', rlErr) }

    let body: { tier?: string; billing?: string; referralCode?: string }
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const tier = body.tier as string
    const billing = body.billing === 'annual' ? 'annual' : 'monthly'
    const referralCode = (body.referralCode && /^PP-[A-Z0-9]{6}$/.test(String(body.referralCode))) ? String(body.referralCode) : undefined
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

    const hadStripeSub = !!existingSub?.stripe_subscription_id

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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      locale: 'auto',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: user.email }),
      subscription_data: {
        trial_period_days: hadStripeSub ? undefined : 3,
        metadata: { tier, user_id: user.id, ...(referralCode ? { referral_code: referralCode } : {}) },
        description: 'pptides Subscription',
      },
      metadata: { tier, user_id: user.id, ...(referralCode ? { referral_code: referralCode } : {}) },
      success_url: `${appUrl}/dashboard?payment=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?payment=cancelled`,
      allow_promotion_codes: true,
      custom_text: {
        submit: { message: 'Powered by pptides' },
      },
    })

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
