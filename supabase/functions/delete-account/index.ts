import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const IS_PRODUCTION = !Deno.env.get('DENO_DEV')
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? ['https://pptides.com']
  : ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('delete-account: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('delete-account auth failed:', authError?.message ?? 'no user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: sub, error: subFetchError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subFetchError) {
      console.error('delete-account: failed to fetch subscription:', subFetchError)
    }

    if (stripeKey && sub) {
      if (sub.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id)
        } catch (e) {
          console.error('delete-account: failed to cancel Stripe sub:', sub.stripe_subscription_id, e)
          return new Response(JSON.stringify({
            error: 'تعذّر إلغاء اشتراك Stripe. تواصل معنا لإكمال حذف حسابك.',
            support: 'contact@pptides.com'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
      if (sub.stripe_customer_id) {
        try {
          await stripe.customers.del(sub.stripe_customer_id)
        } catch (e) {
          console.error('delete-account: failed to delete Stripe customer:', sub.stripe_customer_id, e)
          return new Response(JSON.stringify({
            error: 'تعذّر حذف عميل Stripe. تواصل معنا لإكمال حذف حسابك.',
            support: 'contact@pptides.com'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
    } else if (!stripeKey) {
      console.error('delete-account: STRIPE_SECRET_KEY missing, skipping Stripe cleanup')
    }

    const { error: subDelErr } = await supabase.from('subscriptions').delete().eq('user_id', user.id)
    if (subDelErr) console.error('delete-account: failed to delete subscriptions row:', subDelErr)

    const { error: logDelErr } = await supabase.from('injection_logs').delete().eq('user_id', user.id)
    if (logDelErr) console.error('delete-account: failed to delete injection_logs:', logDelErr)

    const { error: commDelErr } = await supabase.from('community_logs').delete().eq('user_id', user.id)
    if (commDelErr) console.error('delete-account: failed to delete community_logs:', commDelErr)

    if (user.email) {
      const { error: revDelErr } = await supabase.from('reviews').delete().eq('email', user.email)
      if (revDelErr) console.error('delete-account: failed to delete reviews:', revDelErr)
    }

    const { error: reportsDelErr } = await supabase.from('reports').delete().eq('user_id', user.id)
    if (reportsDelErr) console.error('delete-account: failed to delete reports:', reportsDelErr)

    const { error: aiDelErr } = await supabase.from('ai_coach_requests').delete().eq('user_id', user.id)
    if (aiDelErr) console.error('delete-account: failed to delete ai_coach_requests:', aiDelErr)

    const { error: reminderDelErr } = await supabase.from('sent_reminders').delete().eq('user_id', user.id)
    if (reminderDelErr) console.error('delete-account: failed to delete sent_reminders:', reminderDelErr)

    if (user.email) {
      const { error: emailListDelErr } = await supabase.from('email_list').delete().eq('email', user.email)
      if (emailListDelErr) console.error('delete-account: failed to delete email_list:', emailListDelErr)
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('delete-account: failed to delete auth user:', deleteError)
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('delete-account unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
