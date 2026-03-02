import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
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

    // Rate limit: 2 delete attempts per hour per user
    const allowed = await checkRateLimit(supabase, {
      endpoint: 'delete-account',
      identifier: user.id,
      windowSeconds: 3600,
      maxRequests: 2,
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'محاولات كثيرة — انتظر ساعة وحاول مرة أخرى' }), {
        status: 429,
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

    let stripeCleanupSucceeded = false
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
      stripeCleanupSucceeded = true
    } else if (!stripeKey) {
      console.error('delete-account: STRIPE_SECRET_KEY missing, skipping Stripe cleanup')
    }

    const { error: rpcErr } = await supabase.rpc('delete_user_data', {
      p_user_id: user.id,
      p_user_email: user.email ?? null,
    })
    if (rpcErr) {
      console.error('delete-account: RPC delete_user_data failed:', rpcErr)
      const errorBody = stripeCleanupSucceeded
        ? {
            error: 'تم إلغاء اشتراكك بنجاح، لكن حذف بيانات حسابك فشل. راسلنا فورًا لإكمال الحذف: contact@pptides.com',
            support: 'contact@pptides.com',
          }
        : {
            error: 'حذف البيانات فشل. تواصل معنا لإكمال الحذف.',
            support: 'contact@pptides.com',
          }
      return new Response(JSON.stringify(errorBody), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
      await fetch('https://api.resend.com/emails', {
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
