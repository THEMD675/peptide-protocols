import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { sendEmail } from '../_shared/send-email.ts'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
const COUPON_RETENTION = Deno.env.get('COUPON_RETENTION') ?? 'retention_20_pct'

import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

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

    {
      const allowed = await checkRateLimit(supabase, {
        endpoint: 'cancel-subscription',
        identifier: user.id,
        windowSeconds: 3600,
        maxRequests: 3,
      })
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'محاولات كثيرة — حاول لاحقًا' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    let reqBody: Record<string, unknown> = {}
    try { reqBody = await req.clone().json() } catch { /* empty body is fine for cancel */ }
    const applyCoupon = reqBody.apply_coupon === true
    const cancelReason = typeof reqBody.reason === 'string'
      ? reqBody.reason.slice(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : null

    // Save cancellation reason to subscriptions table if provided
    if (cancelReason) {
      await supabase.from('subscriptions').update({
        cancel_reason: cancelReason,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id).then(() => {}).catch((e: unknown) => console.error('save cancel reason:', e))
    }

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
          coupon: COUPON_RETENTION,
        })
        return new Response(JSON.stringify({ ok: true, coupon: COUPON_RETENTION }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (e) {
        console.error('apply_retention_coupon error:', e)
        return new Response(JSON.stringify({ error: 'تعذّر تطبيق الخصم', coupon_failed: true }), {
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
      // Trial users WITHOUT a Stripe sub (no card entered) — can't cancel what doesn't exist
      if (sub?.status === 'trial') {
        return new Response(JSON.stringify({ error: 'أنت في فترة تجربة مجانية بدون بطاقة — التجربة ستنتهي تلقائيًا', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (sub?.status === 'none' || !sub) {
        return new Response(JSON.stringify({ error: 'لا يوجد اشتراك نشط لإلغائه', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Only cancel if they had a real paid subscription that lost its Stripe reference
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
      return new Response(JSON.stringify({ error: 'خطأ في مزوّد الدفع — حاول لاحقاً' }), {
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
      // Return success — Stripe cancel succeeded. Webhook will eventually sync DB.
      return new Response(JSON.stringify({
        success: true,
        stripe_cancelled: true,
        db_sync_pending: true,
        cancel_at: periodEnd,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(JSON.stringify({ action: 'cancel_subscription', user_id: user.id, email: user.email ?? null, result: 'success', timestamp: new Date().toISOString() }))

    if (user.email) {
      sendEmail({
        to: user.email,
        subject: 'تم إلغاء اشتراكك في pptides',
        tags: [{ name: 'type', value: 'subscription_cancelled' }, { name: 'category', value: 'transactional' }],
        html: emailWrapper(`
            <h2 style="color:#1c1917;font-size:20px;">تم إلغاء اشتراكك</h2>
            <p style="color:#44403c;line-height:1.8;">ستحتفظ بالوصول حتى نهاية الفترة الحالية (${periodEnd.split('T')[0]}).</p>
            <div style="text-align:center;margin:24px 0;">
              ${emailButton('أعد الاشتراك', `${APP_URL}/pricing`)}
            </div>
          `),
        replyTo: 'contact@pptides.com',
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
