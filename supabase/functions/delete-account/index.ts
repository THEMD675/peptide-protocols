import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { sendEmail } from '../_shared/send-email.ts'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { emailWrapper } from '../_shared/email-template.ts'

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

    // Require explicit confirmation
    let body: { confirm?: boolean } = {}
    try { body = await req.json() } catch { /* empty body ok for backwards compat check */ }
    if (body.confirm !== true) {
      return new Response(JSON.stringify({ error: 'يرجى تأكيد حذف الحساب', requiresConfirm: true }), {
        status: 400,
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
          const stripeErr = e as { code?: string; type?: string; message?: string }
          // Idempotency: if sub is already cancelled / not found, treat as success and continue
          const alreadyGone =
            stripeErr.code === 'resource_missing' ||
            stripeErr.message?.includes('No such subscription') ||
            stripeErr.message?.includes('already been canceled') ||
            stripeErr.message?.includes('already canceled')
          if (alreadyGone) {
            console.warn('delete-account: Stripe sub already cancelled/not found — continuing:', sub.stripe_subscription_id)
          } else {
            console.error('delete-account: failed to cancel Stripe sub:', sub.stripe_subscription_id, e)
            return new Response(JSON.stringify({
              error: 'تعذّر إلغاء اشتراك Stripe. تواصل معنا لإكمال حذف حسابك.',
              support: 'contact@pptides.com'
            }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
      }
      if (sub.stripe_customer_id) {
        try {
          await stripe.customers.del(sub.stripe_customer_id)
        } catch (e) {
          const stripeErr = e as { code?: string; type?: string; message?: string }
          // Idempotency: if customer is already deleted / not found, treat as success and continue
          const alreadyGone =
            stripeErr.code === 'resource_missing' ||
            stripeErr.message?.includes('No such customer') ||
            stripeErr.message?.includes('already deleted')
          if (alreadyGone) {
            console.warn('delete-account: Stripe customer already deleted/not found — continuing:', sub.stripe_customer_id)
          } else {
            console.error('delete-account: failed to delete Stripe customer:', sub.stripe_customer_id, e)
            return new Response(JSON.stringify({
              error: 'تعذّر حذف عميل Stripe. تواصل معنا لإكمال حذف حسابك.',
              support: 'contact@pptides.com'
            }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
      }
      stripeCleanupSucceeded = true
    } else if (stripeKey && !sub && user.email) {
      // No subscription row — try to clean up orphaned Stripe customer by email
      try {
        const { data: customers } = await stripe.customers.list({ email: user.email, limit: 10 })
        if (customers.data.length > 0) {
          for (const c of customers.data) {
            const { data: subs } = await stripe.subscriptions.list({ customer: c.id, status: 'all' })
            for (const s of subs) {
              await stripe.subscriptions.cancel(s.id).catch(() => {})
            }
            await stripe.customers.del(c.id).catch(() => {})
          }
          stripeCleanupSucceeded = true
          console.log('delete-account: cleaned orphaned Stripe customer(s) for', user.email)
        }
      } catch (e) {
        console.warn('delete-account: failed to lookup/clean Stripe by email:', e)
      }
    } else if (!stripeKey) {
      console.error('delete-account: STRIPE_SECRET_KEY missing, skipping Stripe cleanup')
    } else if (!sub) {
      console.warn('delete-account: no subscription row for user', user.id, '— Stripe cleanup skipped (no customer_id)')
    }

    // Explicitly delete tables that may not be covered by the RPC's cascade
    await Promise.allSettled([
      supabase.from('saved_protocols').delete().eq('user_id', user.id),
      supabase.from('lab_results').delete().eq('user_id', user.id),
      supabase.from('community_replies').delete().eq('user_id', user.id),
      supabase.from('community_logs').delete().eq('user_id', user.id),
    ])

    const { error: rpcErr } = await supabase.rpc('delete_user_data', {
      p_user_id: user.id,
      p_user_email: user.email ?? null,
    })
    if (rpcErr) {
      // CRITICAL: If Stripe was already cancelled/deleted but DB cleanup fails, the user is half-deleted.
      // We cannot easily un-cancel Stripe, so log all recovery info for manual admin intervention.
      // Recovery steps: admin must manually call delete_user_data RPC or delete rows from
      // subscriptions, injection_logs, wellness_logs, side_effect_logs, user_protocols, etc. for this user_id.
      if (stripeCleanupSucceeded) {
        console.error(JSON.stringify({
          severity: 'CRITICAL',
          action: 'delete_account_half_deleted',
          message: 'Stripe cancelled but DB delete failed — user is in inconsistent state',
          user_id: user.id,
          email: user.email ?? null,
          stripe_subscription_id: sub?.stripe_subscription_id ?? null,
          stripe_customer_id: sub?.stripe_customer_id ?? null,
          rpc_error: rpcErr.message,
          recovery: 'Admin must manually run delete_user_data RPC or clean DB rows + auth user for this user_id',
          timestamp: new Date().toISOString(),
        }))
      } else {
        console.error('delete-account: RPC delete_user_data failed:', rpcErr)
      }
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
      // CRITICAL: DB data is gone but auth user still exists — orphaned auth record.
      // Recovery: admin must manually call supabase.auth.admin.deleteUser(user_id).
      console.error(JSON.stringify({
        severity: 'CRITICAL',
        action: 'delete_account_auth_orphaned',
        message: 'User data deleted but auth.users deletion failed — orphaned auth record',
        user_id: user.id,
        email: user.email ?? null,
        stripe_subscription_id: sub?.stripe_subscription_id ?? null,
        stripe_customer_id: sub?.stripe_customer_id ?? null,
        auth_error: deleteError.message,
        recovery: 'Admin must manually delete auth user via supabase.auth.admin.deleteUser()',
        timestamp: new Date().toISOString(),
      }))
      return new Response(JSON.stringify({
        error: 'تم حذف بياناتك لكن فشل إزالة حسابك بالكامل — تواصل معنا: contact@pptides.com',
        partial: true,
        support: 'contact@pptides.com',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(JSON.stringify({ action: 'delete_account', user_id: user.id, email: user.email ?? null, result: 'success', timestamp: new Date().toISOString() }))

    if (user.email) {
      sendEmail({
        to: user.email,
        subject: 'تم حذف حسابك في pptides',
        tags: [{ name: 'type', value: 'account_deleted' }, { name: 'category', value: 'transactional' }],
        html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">تم حذف حسابك</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">تم حذف حسابك وجميع بياناتك من pptides بنجاح. إذا كان هذا خطأ، تواصل معنا فورًا.</p>
          `),
        replyTo: 'contact@pptides.com',
      }).catch(e => console.error('account deletion email failed:', e))
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('delete-account unhandled error:', error)
    return new Response(JSON.stringify({ error: 'حدث خطأ — تواصل معنا: contact@pptides.com' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
