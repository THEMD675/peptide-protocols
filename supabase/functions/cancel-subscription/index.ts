import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
      console.error('cancel-subscription: missing required env vars')
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
      console.error('cancel-subscription auth failed:', authError?.message ?? 'no user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      const oneMinAgo = new Date(Date.now() - 60000).toISOString()
      const { count } = await supabase.from('rate_limits').select('id', { count: 'exact', head: true }).eq('endpoint', 'cancel-subscription').eq('user_id', user.id).gte('created_at', oneMinAgo)
      if ((count ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: 'محاولات كثيرة — انتظر دقيقة' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      supabase.from('rate_limits').insert({ user_id: user.id, endpoint: 'cancel-subscription' }).then(() => {}).catch(() => {})
    } catch (rlErr) { console.error('rate limit check failed:', rlErr) }

    let reqBody: Record<string, unknown> = {}
    try { reqBody = await req.clone().json() } catch { /* empty body is fine for cancel */ }
    const applyCoupon = reqBody.apply_coupon === true

    if (applyCoupon) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!sub?.stripe_subscription_id) {
        return new Response(JSON.stringify({ error: 'No Stripe subscription found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      try {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          coupon: 'STAY30',
        })
        return new Response(JSON.stringify({ ok: true, coupon: 'STAY30' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (e) {
        console.error('apply_retention_coupon error:', e)
        return new Response(JSON.stringify({ error: 'Failed to apply coupon' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data: sub, error: subFetchError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subFetchError) {
      console.error('cancel-subscription: failed to fetch subscription:', subFetchError)
      return new Response(JSON.stringify({ error: 'Failed to look up subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!sub?.stripe_subscription_id) {
      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (updateErr) {
        console.error('cancel-subscription: DB update (no stripe sub) failed:', updateErr)
        return new Response(JSON.stringify({ error: 'تعذّر تحديث حالة الاشتراك', success: false }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true, already_cancelled: false, message: 'No Stripe subscription found, DB updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (sub.status === 'cancelled') {
      let periodEnd: string | null = null
      try {
        const existing = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
        if (existing.cancel_at_period_end) {
          periodEnd = new Date(existing.current_period_end * 1000).toISOString()
        }
      } catch {
        // Stripe sub may already be fully deleted
      }
      return new Response(JSON.stringify({
        success: true,
        already_cancelled: true,
        cancel_at: periodEnd,
        message: 'Subscription is already cancelled',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    if (currentSub.cancel_at_period_end) {
      const periodEnd = new Date(currentSub.current_period_end * 1000).toISOString()
      return new Response(JSON.stringify({
        success: true,
        already_cancelled: true,
        cancel_at: periodEnd,
        message: 'Already cancelled',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let cancelled: Stripe.Subscription
    try {
      cancelled = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    } catch (stripeErr: unknown) {
      const err = stripeErr as { type?: string; message?: string }
      console.error('cancel-subscription Stripe error:', err.type, err.message)
      if (err.type === 'StripeInvalidRequestError') {
        return new Response(JSON.stringify({ error: 'Subscription not found in Stripe' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'Payment provider error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const periodEnd = new Date(cancelled.current_period_end * 1000).toISOString()

    const { error: dbUpdateErr } = await supabase.from('subscriptions').update({
      status: 'cancelled',
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)

    if (dbUpdateErr) {
      console.error('cancel-subscription: DB update after Stripe cancel failed:', dbUpdateErr)
      return new Response(JSON.stringify({
        error: 'تم إلغاء الاشتراك في Stripe لكن تعذّر تحديث قاعدة البيانات. حدّث الصفحة.',
        stripe_cancelled: true
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(JSON.stringify({ action: 'cancel_subscription', user_id: user.id, email: user.email ?? null, result: 'success', timestamp: new Date().toISOString() }))

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY && user.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'pptides <noreply@pptides.com>',
          reply_to: 'contact@pptides.com',
          to: user.email,
          subject: 'تم إلغاء اشتراكك في pptides',
          headers: { 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>' },
          html: emailWrapper(`
            <h2 style="color:#1c1917;font-size:20px;">تم إلغاء اشتراكك</h2>
            <p style="color:#44403c;line-height:1.8;">ستحتفظ بالوصول حتى نهاية الفترة الحالية (${periodEnd.split('T')[0]}).</p>
            <div style="text-align:center;margin:24px 0;">
              ${emailButton('أعد الاشتراك', 'https://pptides.com/pricing')}
            </div>
          `),
        }),
      }).catch(e => console.error('cancel confirmation email failed:', e))
    }

    return new Response(JSON.stringify({
      success: true,
      already_cancelled: false,
      cancel_at: periodEnd,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('cancel-subscription unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
