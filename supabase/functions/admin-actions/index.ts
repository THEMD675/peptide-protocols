import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse as json } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { getServiceClient, supabaseUrl, supabaseServiceKey } from '../_shared/supabase.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { sendEmail, sendBatchEmails } from '../_shared/send-email.ts'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const cors = getCorsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)
  if (!supabaseUrl || !supabaseServiceKey) return json({ error: 'Server misconfigured' }, 500, cors)

  const { user, error: authResp } = await requireAdmin(req)
  if (authResp) return authResp

  const admin = getServiceClient()

  // Rate limit: 60 actions per minute per admin
  const rlAllowed = await checkRateLimit(admin, {
    endpoint: 'admin-actions',
    identifier: user.id,
    windowSeconds: 60,
    maxRequests: 60,
  })
  if (!rlAllowed) return json({ error: 'Too many actions — slow down' }, 429, cors)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400, cors) }

  const action = body.action as string
  if (!action) return json({ error: 'Missing action' }, 400, cors)

  console.log(JSON.stringify({ admin_action: action, by: user.email, timestamp: new Date().toISOString() }))

  // Fire-and-forget audit log — never blocks the action
  admin.from('admin_audit_log').insert({
    admin_email: user.email,
    action,
    target_user_id: (body.user_id as string) || null,
    details: body,
  }).then(({ error: auditErr }) => { if (auditErr) console.error('audit log insert failed:', auditErr) })

  try {
    // ================================================================
    // EXTEND TRIAL
    // ================================================================
    if (action === 'extend_trial') {
      const userId = body.user_id as string
      const days = body.days != null ? Number(body.days) : 3
      if (!userId || !Number.isFinite(days) || days < 0) return json({ error: 'Missing user_id or invalid days' }, 400, cors)

      const { data: sub, error: fetchErr } = await admin
        .from('subscriptions').select('id, trial_ends_at, status, stripe_subscription_id').eq('user_id', userId).maybeSingle()
      if (fetchErr || !sub) return json({ error: 'Subscription not found' }, 404, cors)

      const baseDate = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date()
      const newEnd = new Date(Math.max(baseDate.getTime(), Date.now()) + days * 86400000)
      const newEndIso = newEnd.toISOString()

      const { error: updateErr } = await admin.from('subscriptions').update({
        trial_ends_at: newEndIso,
        status: sub.status === 'expired' || sub.status === 'none' ? 'trial' : sub.status,
        updated_at: new Date().toISOString(),
      }).eq('id', sub.id)

      if (updateErr) return json({ error: updateErr.message }, 500, cors)

      // Sync trial_end with Stripe if subscription has stripe_subscription_id (DB is primary; log but don't fail)
      if (sub.stripe_subscription_id && stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            trial_end: Math.floor(newEnd.getTime() / 1000),
          })
        } catch (e) {
          console.error('Stripe trial_end sync failed (DB updated):', e)
        }
      }

      return json({ ok: true, trial_ends_at: newEndIso }, 200, cors)
    }

    // ================================================================
    // GRANT SUBSCRIPTION
    // ================================================================
    if (action === 'grant_subscription') {
      const userId = body.user_id as string
      const tier = body.tier as string
      const status = (body.status as string) || 'active'
      const durationDays = body.duration_days != null ? Number(body.duration_days) : 30
      if (!userId || !tier || !Number.isFinite(durationDays) || durationDays < 1) return json({ error: 'Missing user_id, tier, or invalid duration' }, 400, cors)

      const periodEnd = new Date(Date.now() + durationDays * 86400000).toISOString()
      const grantSource = `admin_comp:${user.email}:${new Date().toISOString()}`
      const { data: existing } = await admin.from('subscriptions').select('id').eq('user_id', userId).maybeSingle()

      if (existing) {
        const { error } = await admin.from('subscriptions').update({
          tier, status, current_period_end: periodEnd,
          grant_source: grantSource,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
        if (error) return json({ error: error.message }, 500, cors)
      } else {
        const { error } = await admin.from('subscriptions').insert({
          user_id: userId, tier, status, current_period_end: periodEnd,
          grant_source: grantSource,
          trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        })
        if (error) return json({ error: error.message }, 500, cors)
      }
      return json({ ok: true, tier, status, current_period_end: periodEnd, grant_source: grantSource }, 200, cors)
    }

    // ================================================================
    // UPDATE SUBSCRIPTION
    // ================================================================
    if (action === 'update_subscription') {
      const userId = body.user_id as string
      const updates: Record<string, unknown> = {}
      const VALID_STATUSES = ['active', 'trial', 'cancelled', 'expired', 'past_due', 'none']
      const VALID_TIERS = ['free', 'essentials', 'elite']
      if (body.tier) {
        if (!VALID_TIERS.includes(body.tier as string)) return json({ error: `Invalid tier: ${body.tier}. Must be one of: ${VALID_TIERS.join(', ')}` }, 400, cors)
        updates.tier = body.tier
      }
      if (body.status) {
        if (!VALID_STATUSES.includes(body.status as string)) return json({ error: `Invalid status: ${body.status}. Must be one of: ${VALID_STATUSES.join(', ')}` }, 400, cors)
        updates.status = body.status
      }
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
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
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

      const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
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

      // Cancel Stripe subscription first (so user is not charged while banned)
      const { data: sub } = await admin.from('subscriptions')
        .select('stripe_subscription_id, status').eq('user_id', userId).maybeSingle()
      if (sub?.stripe_subscription_id && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id)
        } catch (e) {
          console.error('Stripe cancel during suspend failed:', e)
        }
      }

      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '87600h' })
      if (error) return json({ error: error.message }, 500, cors)

      await admin.from('subscriptions').update({
        status: 'expired',
        pre_suspend_status: sub?.status ?? null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
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

      // Restore pre-suspension subscription status if available
      const { data: sub } = await admin.from('subscriptions')
        .select('pre_suspend_status').eq('user_id', userId).maybeSingle()
      if (sub?.pre_suspend_status) {
        await admin.from('subscriptions').update({
          status: sub.pre_suspend_status,
          pre_suspend_status: null,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }

      return json({ ok: true, restored_status: sub?.pre_suspend_status ?? null }, 200, cors)
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
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
        if (sub.stripe_subscription_id) {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(e => console.error('stripe sub cancel:', e))
        }
        if (sub.stripe_customer_id) {
          await stripe.customers.del(sub.stripe_customer_id).catch(e => console.error('stripe customer del:', e))
        }
      }

      // Delete user data via RPC — abort if this fails to prevent orphaned Stripe data
      const { error: rpcErr } = await admin.rpc('delete_user_data', {
        p_user_id: userId,
        p_user_email: targetUser?.email ?? null,
      })
      if (rpcErr) {
        console.error('delete_user_data RPC failed — aborting auth deletion:', rpcErr)
        return json({ error: `Data cleanup failed: ${rpcErr.message}. Auth user NOT deleted.` }, 500, cors)
      }

      // Delete auth user (only after data cleanup succeeded)
      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
      if (deleteErr) return json({ error: deleteErr.message }, 500, cors)

      return json({ ok: true, deleted_email: targetUser?.email }, 200, cors)
    }

    // ================================================================
    // SEND EMAIL
    // ================================================================
    if (action === 'send_email') {
      const to = (body.to as string)?.trim()
      const subject = (body.subject as string)?.trim()
      const htmlBody = (body.html as string)?.trim()
      const textBody = (body.text as string)?.trim()
      if (!to || !subject || (!htmlBody && !textBody)) return json({ error: 'Missing to, subject, or body' }, 400, cors)

      if (to === 'bulk') {
        const audience = (body.audience as string) ?? 'all'
        let emails: string[] = []

        if (audience === 'all') {
          // Paginate all users (listUsers returns max 1000 per page)
          const collected: string[] = []
          let pg = 1
          while (true) {
            const { data: { users: pageUsers }, error: pgErr } = await admin.auth.admin.listUsers({ page: pg, perPage: 1000 })
            if (pgErr || !pageUsers || pageUsers.length === 0) break
            pageUsers.forEach(u => { if (u.email) collected.push(u.email) })
            if (pageUsers.length < 1000) break
            pg++
          }
          emails = collected
        } else {
          const statusMap: Record<string, string> = { trial: 'trial', active: 'active', expired: 'expired' }
          const status = statusMap[audience]
          if (status) {
            const { data: subs } = await admin.from('subscriptions').select('user_id').eq('status', status)
            if (subs?.length) {
              const userIds = new Set(subs.map((s: { user_id: string }) => s.user_id))
              // Paginate all auth users (listUsers returns max 1000 per page)
              const allUsers: typeof emails = []
              let pg = 1
              while (true) {
                const { data: { users: pageUsers }, error: pgErr } = await admin.auth.admin.listUsers({ page: pg, perPage: 1000 })
                if (pgErr || !pageUsers || pageUsers.length === 0) break
                pageUsers.forEach(u => { if (u.email && userIds.has(u.id)) allUsers.push(u.email) })
                if (pageUsers.length < 1000) break
                pg++
              }
              emails = allUsers
            }
          }
        }

        // FIX 6: Bulk email safeguard — max 50 per batch with rate limiting
        const MAX_BATCH_SIZE = 50
        const batch = emails.slice(0, MAX_BATCH_SIZE)
        
        // Check if admin has sent too many bulk emails recently (max 3 batches per hour)
        const bulkRlAllowed = await checkRateLimit(admin, {
          endpoint: 'admin-bulk-email',
          identifier: user.id,
          windowSeconds: 3600,
          maxRequests: 3,
        })
        if (!bulkRlAllowed) {
          return json({ error: 'تم إرسال عدد كبير من الرسائل — حاول بعد ساعة', rateLimited: true }, 429, cors)
        }

        const emailContent = htmlBody || `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(textBody ?? '')}</pre>`
        const batchPayload = batch.map(email => ({
          to: email,
          subject,
          html: emailContent,
          replyTo: 'contact@pptides.com',
          tags: [{ name: 'type', value: 'admin_bulk' }, { name: 'audience', value: audience }],
        }))

        const { sent, failed } = await sendBatchEmails(batchPayload)

        for (const email of batch) {
          await admin.from('email_logs').insert({ email, type: 'admin_bulk', status: 'sent' }).catch(() => {})
        }

        // Log bulk send to audit log with details
        admin.from('admin_audit_log').insert({
          admin_email: user.email,
          action: 'bulk_email_sent',
          details: { audience, subject, total_recipients: emails.length, batch_size: batch.length, sent, failed },
        }).catch(() => {})

        return json({ ok: true, sent, failed, total: batch.length, totalEligible: emails.length, maxBatch: MAX_BATCH_SIZE }, 200, cors)
      }

      const emailResult = await sendEmail({
        to,
        subject,
        html: htmlBody || `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(textBody ?? '')}</pre>`,
        replyTo: 'contact@pptides.com',
      })
      if (!emailResult.ok) {
        return json({ error: `Email error: ${emailResult.error}` }, 502, cors)
      }

      await admin.from('email_logs').insert({ email: to, type: 'admin_manual', status: 'sent' }).catch(() => {})
      return json({ ok: true }, 200, cors)
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
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
        await stripe.balance.retrieve()
        checks.stripe = { status: 'ok', detail: 'connected', ms: Date.now() - stripeStart }
      } catch (e) { checks.stripe = { status: stripeKey ? 'error' : 'warning', detail: String(e), ms: Date.now() - stripeStart } }

      // Email provider (SMTP or Resend)
      const emailStart = Date.now()
      try {
        const smtpUser = Deno.env.get('SMTP_USER')
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (smtpUser) {
          checks.email = { status: 'ok', detail: `SMTP configured (${smtpUser})`, ms: Date.now() - emailStart }
        } else if (resendKey) {
          const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${resendKey}` } })
          checks.email = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'Resend connected' : `Resend HTTP ${res.status}`, ms: Date.now() - emailStart }
        } else {
          throw new Error('No email provider configured (SMTP_USER or RESEND_API_KEY)')
        }
      } catch (e) { checks.email = { status: 'warning', detail: String(e), ms: Date.now() - emailStart } }

      // DeepSeek
      const aiStart = Date.now()
      const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
      try {
        if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not set')
        const res = await fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${deepseekKey}` } })
        checks.deepseek = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'connected' : `HTTP ${res.status}`, ms: Date.now() - aiStart }
      } catch (e) { checks.deepseek = { status: 'warning', detail: String(e), ms: Date.now() - aiStart } }

      // Env vars
      const envVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SMTP_USER', 'DEEPSEEK_API_KEY', 'APP_URL', 'CRON_SECRET']
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
      // Only use env-configured price IDs — no hardcoded fallbacks that could silently verify wrong prices
      const essentialsPriceId = Deno.env.get('STRIPE_PRICE_ESSENTIALS')
      const elitePriceId = Deno.env.get('STRIPE_PRICE_ELITE')
      const EXPECTED: Record<string, string> = {
        ...(essentialsPriceId ? { essentials: essentialsPriceId } : {}),
        ...(elitePriceId ? { elite: elitePriceId } : {}),
      }
      if (Object.keys(EXPECTED).length === 0) {
        return json({ error: 'No price IDs configured — set STRIPE_PRICE_ESSENTIALS and STRIPE_PRICE_ELITE env vars' }, 500, cors)
      }
      const result: { prices: Record<string, unknown>; webhooks: unknown[]; eventsOk: boolean; missingEvents: string[] } = {
        prices: {},
        webhooks: [],
        eventsOk: false,
        missingEvents: [],
      }
      if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not set', ...result }, 500, cors)
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
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

    // ================================================================
    // GET USER DETAIL
    // ================================================================
    if (action === 'get_user_detail') {
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { data: { user: authUser } } = await admin.auth.admin.getUserById(userId)
      if (!authUser) return json({ error: 'User not found' }, 404, cors)

      const email = authUser.email ?? ''

      const [subsRes, injectionsRes, wellnessRes, sideEffectsRes, protocolsRes, coachCountRes, enquiriesRes, emailLogsRes] = await Promise.all([
        admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
        admin.from('injection_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        admin.from('wellness_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        admin.from('side_effect_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        admin.from('user_protocols').select('*').eq('user_id', userId),
        admin.from('ai_coach_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        admin.from('enquiries').select('*').eq('email', email).order('created_at', { ascending: false }),
        admin.from('email_logs').select('*').eq('email', email).order('created_at', { ascending: false }).limit(20),
      ])

      return json({
        ok: true,
        user: {
          id: authUser.id,
          email: authUser.email,
          provider: authUser.app_metadata?.provider ?? 'email',
          confirmed: !!authUser.email_confirmed_at,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          banned_until: authUser.banned_until,
        },
        subscription: subsRes.data ?? null,
        injection_logs: injectionsRes.data ?? [],
        wellness_logs: wellnessRes.data ?? [],
        side_effect_logs: sideEffectsRes.data ?? [],
        user_protocols: protocolsRes.data ?? [],
        ai_coach_request_count: coachCountRes.count ?? 0,
        enquiries: enquiriesRes.data ?? [],
        email_logs: emailLogsRes.data ?? [],
      }, 200, cors)
    }

    // ================================================================
    // ADD USER NOTE
    // ================================================================
    if (action === 'add_user_note') {
      const userId = body.user_id as string
      const note = (body.note as string)?.trim()
      if (!userId || !note) return json({ error: 'Missing user_id or note' }, 400, cors)

      const { error } = await admin.from('admin_user_notes').insert({
        user_id: userId,
        note,
        admin_email: user.email,
      })
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true }, 200, cors)
    }

    // ================================================================
    // GET USER NOTES
    // ================================================================
    if (action === 'get_user_notes') {
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { data, error } = await admin.from('admin_user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true, data: data ?? [] }, 200, cors)
    }

    // ================================================================
    // GET AUDIT LOG
    // ================================================================
    if (action === 'get_audit_log') {
      const { data, error } = await admin.from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) return json({ error: error.message }, 500, cors)
      return json({ ok: true, data: data ?? [] }, 200, cors)
    }

    // ================================================================
    // REPLY TO ENQUIRY (update DB + send email)
    // ================================================================
    if (action === 'reply_enquiry') {
      const enquiryId = body.enquiry_id as string
      const reply = (body.reply as string)?.trim()
      const to = (body.to as string)?.trim()
      const subject = (body.subject as string)?.trim()
      if (!enquiryId || !reply) return json({ error: 'Missing enquiry_id or reply' }, 400, cors)

      const { error: updateErr } = await admin.from('enquiries').update({
        status: 'replied',
        admin_notes: reply,
        replied_at: new Date().toISOString(),
      }).eq('id', enquiryId)
      if (updateErr) return json({ error: updateErr.message }, 500, cors)

      let emailSent = false
      if (to && subject) {
        try {
          const r = await sendEmail({
            to,
            subject,
            html: `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(reply)}</pre>`,
            replyTo: 'contact@pptides.com',
          })
          emailSent = r.ok
          await admin.from('email_logs').insert({ email: to, type: 'enquiry_reply', status: r.ok ? 'sent' : 'failed' }).catch(() => {})
        } catch { /* email failure is non-fatal */ }
      }

      return json({ ok: true, email_sent: emailSent }, 200, cors)
    }

    // ================================================================
    // GET PAYMENTS (for refund auto-lookup)
    // ================================================================
    if (action === 'get_payments') {
      if (!stripeKey) return json({ error: 'Stripe not configured' }, 500, cors)
      const userId = body.user_id as string
      if (!userId) return json({ error: 'Missing user_id' }, 400, cors)

      const { data: sub } = await admin.from('subscriptions')
        .select('stripe_customer_id').eq('user_id', userId).maybeSingle()

      if (!sub?.stripe_customer_id) return json({ error: 'لا يوجد عميل Stripe لهذا المستخدم' }, 404, cors)

      const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
      const charges = await stripe.charges.list({ customer: sub.stripe_customer_id, limit: 5 })

      const payments = charges.data.map((c: { id: string; payment_intent: string | null; amount: number; currency: string; status: string; created: number }) => ({
        id: c.id,
        payment_intent: c.payment_intent,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        created: new Date(c.created * 1000).toISOString(),
      }))

      return json({ ok: true, payments }, 200, cors)
    }

    if (action === 'sync_email') {
      const userId = body.user_id as string
      const newEmail = (body.new_email as string)?.trim().toLowerCase()
      if (!userId || !newEmail) return json({ error: 'Missing user_id or new_email' }, 400, cors)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
      if (!emailRegex.test(newEmail)) return json({ error: 'Invalid email format' }, 400, cors)
      const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle()
      if (sub?.stripe_customer_id && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })
        try {
          await stripe.customers.update(sub.stripe_customer_id, { email: newEmail })
        } catch (e) { console.error('sync_email Stripe error:', e) }
      }
      return json({ ok: true }, 200, cors)
    }

    return json({ error: `Unknown action: ${action}` }, 400, cors)

  } catch (err) {
    console.error('admin-actions error:', err)
    return json({ error: 'Internal error' }, 500, cors)
  }
})
