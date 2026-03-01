import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const appUrl = Deno.env.get('APP_URL') ?? 'https://pptides.com'

const IS_PRODUCTION = !Deno.env.get('DENO_DEV')
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? ['https://pptides.com']
  : ['https://pptides.com', 'http://localhost:3000']

const PRICE_IDS: Record<string, string> = {
  essentials: Deno.env.get('STRIPE_PRICE_ESSENTIALS') ?? '',
  elite: Deno.env.get('STRIPE_PRICE_ELITE') ?? '',
}

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!allowedOrigin && req.method !== 'OPTIONS') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    const body = await req.json()
    const tier = body.tier as string
    if (!tier || !PRICE_IDS[tier]) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const priceId = PRICE_IDS[tier]
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Price not configured. Contact support.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      subscription_data: {
        trial_period_days: 3,
        metadata: { tier, user_id: user.id },
      },
      metadata: { tier, user_id: user.id },
      success_url: `${appUrl}/dashboard?payment=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?payment=cancelled`,
      allow_promotion_codes: true,
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
