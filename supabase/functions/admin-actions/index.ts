import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse as json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { getServiceClient, supabaseUrl, supabaseServiceKey } from '../_shared/supabase.ts'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const cors = getCorsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)
  if (!supabaseUrl || !supabaseServiceKey) return json({ error: 'Server misconfigured' }, 500, cors)

  const { user, error: authResp } = await requireAdmin(req)
  if (authResp) return authResp

  const admin = getServiceClient()

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, cors) }

  const action = body.action as string
  if (!action) return json({ error: 'Missing action' }, 400, cors)

  console.log(JSON.stringify({ admin_action: action, by: user.email, timestamp: new Date().toISOString() }))

  try {
    // ================================================================
    // EXTEND TRIAL
    // ================================================================
    if (action === 'extend_trial') {
      const userId = body.user_id as string
      const days = Number(body.days) || 3
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { data: sub, error: fetchErr } = await admin
        .from('subscriptions').select('id, trial_ends_at, status').eq('user_id', userId).maybeSingle()
      if (fetchErr || !sub) return json({ error: 'Subscription not found' }, 404, cors)

      const baseDate = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date()
      const newEnd = new Date(Math.max(baseDate.getTime(), Date.now()) + days * 86400000).toISOString()

      const { error: updateErr } = await admin.from('subscriptions').update({
        trial_ends_at: newEnd,
        status: sub.status === 'expired' || sub.status === 'none' ? 'trial' : sub.status,
        updated_at: new Date().toISOString(),
      }).eq('id', sub.id)

      if (updateErr) return json({ error: updateErr.message }, 500, cors)
      return json({ ok: true, trial_ends_at: newEnd }, 200, cors)
    }

    // ================================================================
    // GRANT SUBSCRIPTION
    // ================================================================
    if (action === 'grant_subscription') {
      const userId = body.user_id as string
      const tier = body.tier as string
      const status = (body.status as string) || 'active'
      const durationDays = Number(body.duration_days) || 30
      if (!userId || !tier) return json({ error: 'Missing user_id or tier' }, 400, cors)

      const periodEnd = new Date(Date.now() + durationDays * 86400000).toISOString()
      const { data: existing } = await admin.from('subscriptions').select('id').eq('user_id', userId).maybeSingle()

      if (existing) {
        const { error } = await admin.from('subscriptions').update({
          tier, status, current_period_end: periodEnd, updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
        if (error) return json({ error: error.message }, 500, cors)
      } else {
        const { error } = await admin.from('subscriptions').insert({
          user_id: userId, tier, status, current_period_end: periodEnd,
          trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        })
        if (error) return json({ error: error.message }, 500, cors)
      }
      return json({ ok: true, tier, status, current_period_end: periodEnd }, 200, cors)
    }

    // ================================================================
    // UPDATE SUBSCRIPTION
    // ================================================================
    if (action === 'update_subscription') {
      const userId = body.user_id as string
      const updates: Record<string, unknown> = {}
      if (body.tier) updates.tier = body.tier
      if (body.status) updates.status = body.status
      if (!userId || Object.keys(updates).length === 0) return json({ error: 'Missing user_id or updates' }, 400, cors)

      updates.updated_at = new Date().toISOString()
      const { error } = await admin.from('subscriptions').update(updates).eq('user_id', userId)
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true, ...updates }, 200, cors)
    }

    // ================================================================
    // CANCEL SUBSCRIPTION (admin-initiated)
    // ================================================================
    if (action === 'cancel_subscription') {
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { data: sub } = await admin.from('subscriptions')
        .select('stripe_subscription_id, status').eq('user_id', userId).maybeSingle()

      if (sub?.stripe_subscription_id && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-18.acacia' })
        try {
          await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true })
        } catch (e) {
          console.error('Stripe cancel failed — aborting DB update to prevent desync:', e)
          return json({ error: 'Stripe cancellation failed — subscription not changed' }, 502, cors)
        }
      }

      const { error } = await admin.from('subscriptions').update({
        status: 'cancelled', updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true }, 200, cors)
    }

    // ================================================================
    // REFUND PAYMENT
    // ================================================================
    if (action === 'refund_payment') {
      if (!stripeKey) return json({ error: 'Stripe not configured' }, 500, cors)
      const paymentIntentId = body.payment_intent_id as string
      const chargeId = body.charge_id as string
      if (!paymentIntentId && !chargeId) return json({ error: 'Missing payment_intent_id or charge_id' }, 400, cors)

      const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-18.acacia' })
      const refund = await stripe.refunds.create({
        ...(paymentIntentId ? { payment_intent: paymentIntentId } : { charge: chargeId }),
        reason: 'requested_by_customer',
      })
      return json({ ok: true, refund_id: refund.id, status: refund.status }, 200, cors)
    }

    // ================================================================
    // SUSPEND USER
    // ================================================================
    if (action === 'suspend_user') {
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '87600h' }) // 10 years
      if (error) return json({ error: error.message }, 500, cors)

      // Also expire their subscription
      await admin.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', userId)
      return json({ ok: true }, 200, cors)
    }

    // ================================================================
    // UNSUSPEND USER
    // ================================================================
    if (action === 'unsuspend_user') {
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true }, 200, cors)
    }

    // ================================================================
    // DELETE USER (admin-initiated)
    // ================================================================
    if (action === 'delete_user') {
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      // Get user info before deletion
      const { data: { user: targetUser } } = await admin.auth.admin.getUserById(userId)

      // Cancel Stripe if exists
      const { data: sub } = await admin.from('subscriptions')
        .select('stripe_subscription_id, stripe_customer_id').eq('user_id', userId).maybeSingle()

      if (sub && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-18.acacia' })
        if (sub.stripe_subscription_id) {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(e => console.error('stripe sub cancel:', e))
        }
        if (sub.stripe_customer_id) {
          await stripe.customers.del(sub.stripe_customer_id).catch(e => console.error('stripe customer del:', e))
        }
      }

      // Delete user data via RPC
      const { error: rpcErr } = await admin.rpc('delete_user_data', {
        p_user_id: userId,
        p_user_email: targetUser?.email ?? null,
      })
      if (rpcErr) console.error('delete_user_data RPC failed:', rpcErr)

      // Delete auth user
      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
      if (deleteErr) return json({ error: deleteErr.message }, 500, cors)

      return json({ ok: true, deleted_email: targetUser?.email }, 200, cors)
    }

    // ================================================================
    // SEND EMAIL
    // ================================================================
    if (action === 'send_email') {
      if (!resendKey) return json({ error: 'Resend not configured' }, 500, cors)
      const to = (body.to as string)?.trim()
      const subject = (body.subject as string)?.trim()
      const htmlBody = (body.html as string)?.trim()
      const textBody = (body.text as string)?.trim()
      if (!to || !subject || (!htmlBody && !textBody)) return json({ error: 'Missing to, subject, or body' }, 400, cors)

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'pptides <contact@pptides.com>',
          reply_to: 'contact@pptides.com',
          to,
          subject,
          ...(htmlBody ? { html: htmlBody } : { text: textBody }),
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        return json({ error: `Resend error: ${res.status} ${errText}` }, 502, cors)
      }
      const data = await res.json()

      // Log it
      await admin.from('email_logs').insert({ email: to, type: 'admin_manual', status: 'sent' }).catch(() => {})
      return json({ ok: true, resend_id: data.id }, 200, cors)
    }

    // ================================================================
    // HEALTH CHECK
    // ================================================================
    if (action === 'health_check') {
      const checks: Record<string, { status: string; detail: string; ms: number }> = {}

      // DB
      const dbStart = Date.now()
      try {
        const { error } = await admin.from('subscriptions').select('id', { count: 'exact', head: true })
        checks.database = { status: error ? 'error' : 'ok', detail: error ? error.message : 'connected', ms: Date.now() - dbStart }
      } catch (e) { checks.database = { status: 'error', detail: String(e), ms: Date.now() - dbStart } }

      // Auth
      const authStart = Date.now()
      try {
        const { error } = await admin.auth.admin.listUsers({ perPage: 1 })
        checks.auth = { status: error ? 'error' : 'ok', detail: error ? error.message : 'connected', ms: Date.now() - authStart }
      } catch (e) { checks.auth = { status: 'error', detail: String(e), ms: Date.now() - authStart } }

      // Stripe
      const stripeStart = Date.now()
      try {
        if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not set')
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-18.acacia' })
        await stripe.balance.retrieve()
        checks.stripe = { status: 'ok', detail: 'connected', ms: Date.now() - stripeStart }
      } catch (e) { checks.stripe = { status: stripeKey ? 'error' : 'warning', detail: String(e), ms: Date.now() - stripeStart } }

      // Resend
      const resendStart = Date.now()
      try {
        if (!resendKey) throw new Error('RESEND_API_KEY not set')
        const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${resendKey}` } })
        checks.resend = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'connected' : `HTTP ${res.status}`, ms: Date.now() - resendStart }
      } catch (e) { checks.resend = { status: 'warning', detail: String(e), ms: Date.now() - resendStart } }

      // DeepSeek
      const aiStart = Date.now()
      const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
      try {
        if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not set')
        const res = await fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${deepseekKey}` } })
        checks.deepseek = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'connected' : `HTTP ${res.status}`, ms: Date.now() - aiStart }
      } catch (e) { checks.deepseek = { status: 'warning', detail: String(e), ms: Date.now() - aiStart } }

      // Env vars
      const envVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'DEEPSEEK_API_KEY', 'APP_URL', 'CRON_SECRET']
      const missing = envVars.filter(v => !Deno.env.get(v))
      checks.env_vars = { status: missing.length === 0 ? 'ok' : 'error', detail: missing.length === 0 ? `all ${envVars.length} set` : `missing: ${missing.join(', ')}`, ms: 0 }

      const allOk = Object.values(checks).every(c => c.status === 'ok')
      const hasError = Object.values(checks).some(c => c.status === 'error')
      return json({ status: allOk ? 'healthy' : hasError ? 'unhealthy' : 'degraded', checks, timestamp: new Date().toISOString() }, 200, cors)
    }

    // ================================================================
    // VERIFY STRIPE (admin-triggered, no CRON_SECRET needed)
    // ================================================================
    if (action === 'verify_stripe') {
      const EXPECTED = {
        essentials: Deno.env.get('STRIPE_PRICE_ESSENTIALS') ?? 'price_1T6QrYAT1lRVVLw7UNdI4t2g',
        elite: Deno.env.get('STRIPE_PRICE_ELITE') ?? 'price_1T6QrZAT1lRVVLw7qu0FZIWT',
      }
      const result: { prices: Record<string, unknown>; webhooks: unknown[]; eventsOk: boolean; missingEvents: string[] } = {
        prices: {},
        webhooks: [],
        eventsOk: false,
        missingEvents: [],
      }
      if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not set', ...result }, 500, cors)
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-18.acacia' })
      try {
        for (const [tier, priceId] of Object.entries(EXPECTED)) {
          const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
          const product = price.product as { name?: string } | null
          result.prices[tier] = {
            id: priceId,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring?.interval || 'one-time',
            productName: product?.name ?? 'N/A',
            ok: true,
          }
        }
      } catch (e) {
        result.prices = { error: String(e) }
      }
      try {
        const webhooks = await stripe.webhookEndpoints.list()
        result.webhooks = webhooks.data.map(w => ({
          url: w.url,
          status: w.status,
          events: w.enabled_events?.slice(0, 5),
          eventsCount: w.enabled_events?.length ?? 0,
        }))
        const required = [
          'checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated',
          'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed',
          'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
          'charge.dispute.created', 'charge.refunded', 'customer.subscription.trial_will_end',
        ]
        const allEvents = webhooks.data.flatMap(w => w.enabled_events || [])
        result.missingEvents = required.filter(e => !allEvents.includes(e))
        result.eventsOk = result.missingEvents.length === 0
      } catch (e) {
        result.webhooks = [{ error: String(e) }]
      }
      const status = result.prices && !('error' in result.prices) && result.eventsOk ? 'ok' : 'issues'
      return json({ status, ...result, timestamp: new Date().toISOString() }, 200, cors)
    }

    // ================================================================
    // EXPORT CSV
    // ================================================================
    if (action === 'export_csv') {
      const table = body.table as string
      if (!table || !['users', 'subscriptions', 'injection_logs', 'ai_coach_requests', 'email_logs', 'email_list', 'enquiries'].includes(table)) {
        return json({ error: 'Invalid table' }, 400, cors)
      }

      if (table === 'users') {
        const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const { data: subs } = await admin.from('subscriptions').select('*')
        const rows = (allUsers ?? []).map(u => {
          const sub = (subs ?? []).find((s: { user_id: string }) => s.user_id === u.id)
          return {
            email: u.email, provider: u.app_metadata?.provider ?? 'email',
            confirmed: u.email_confirmed_at ? 'yes' : 'no', created_at: u.created_at,
            last_sign_in: u.last_sign_in_at ?? '', status: sub?.status ?? 'none',
            tier: sub?.tier ?? '', stripe_sub: sub?.stripe_subscription_id ?? '',
            trial_ends: sub?.trial_ends_at ?? '', period_end: sub?.current_period_end ?? '',
          }
        })
        return json({ ok: true, data: rows, count: rows.length }, 200, cors)
      }

      const { data, error } = await admin.from(table).select('*').order('created_at', { ascending: false }).limit(5000)
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true, data: data ?? [], count: (data ?? []).length }, 200, cors)
    }

    // ================================================================
    // APPROVE / DELETE REVIEW
    // ================================================================
    if (action === 'approve_review' || action === 'delete_review') {
      const reviewId = body.review_id as string
      if (!reviewId) return json({ error: 'Missing review_id' }, 400, cors)

      if (action === 'approve_review') {
        const { error } = await admin.from('reviews').update({ is_approved: true }).eq('id', reviewId)
        if (error) return json({ error: error.message }, 500, cors)
      } else {
        const { error } = await admin.from('reviews').delete().eq('id', reviewId)
        if (error) return json({ error: error.message }, 500, cors)
      }
      return json({ ok: true }, 200, cors)
    }

    return json({ error: `Unknown action: ${action}` }, 400, cors)

  } catch (err) {
    console.error('admin-actions error:', err)
    return json({ error: 'Internal error' }, 500, cors)
  }
})
