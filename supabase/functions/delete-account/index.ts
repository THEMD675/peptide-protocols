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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!allowedOrigin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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

    const { error: revDelErr } = await supabase.from('reviews').delete().eq('user_id', user.id)
    if (revDelErr) console.error('delete-account: failed to delete reviews:', revDelErr)

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

    await supabase.from('user_protocols').delete().eq('user_id', user.id).catch(() => {})
    await supabase.from('user_profiles').delete().eq('user_id', user.id).catch(() => {})
    await supabase.from('lab_results').delete().eq('user_id', user.id).catch(() => {})
    await supabase.from('side_effect_logs').delete().eq('user_id', user.id).catch(() => {})
    await supabase.from('wellness_logs').delete().eq('user_id', user.id).catch(() => {})

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('delete-account: failed to delete auth user:', deleteError)
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(JSON.stringify({ action: 'delete_account', user_id: user.id, email: user.email ?? null, result: 'success', timestamp: new Date().toISOString() }))

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY && user.email) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'pptides <noreply@pptides.com>',
          reply_to: 'contact@pptides.com',
          to: user.email,
          subject: 'تم حذف حسابك في pptides',
          headers: { 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>' },
          html: `<div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 24px;">تم حذف حسابك</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">تم حذف حسابك وجميع بياناتك من pptides بنجاح. إذا كان هذا خطأ، تواصل معنا فورًا.</p>
            <p style="color: #78716c; font-size: 13px;">contact@pptides.com</p>
          </div>`,
        }),
      }).catch(e => console.error('account deletion email failed:', e))
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
