import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/send-email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const authHeader = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  if (!authHeader || !cronSecret || (!constantTimeCompare(authHeader, cronSecret) && !constantTimeCompare(authHeader, `Bearer ${cronSecret}`))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  }

  const checks: Record<string, { status: 'ok' | 'error' | 'warning'; detail: string; ms: number }> = {}

  // 1. Supabase DB connection
  const dbStart = Date.now()
  try {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await admin.from('subscriptions').select('id', { count: 'exact', head: true })
    checks.database = { status: error ? 'error' : 'ok', detail: error ? error.message : 'connected', ms: Date.now() - dbStart }
  } catch (e) {
    checks.database = { status: 'error', detail: String(e), ms: Date.now() - dbStart }
  }

  // 2. Supabase Auth
  const authStart = Date.now()
  try {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 })
    checks.auth = { status: error ? 'error' : 'ok', detail: error ? error.message : `${data.users.length} user(s)`, ms: Date.now() - authStart }
  } catch (e) {
    checks.auth = { status: 'error', detail: String(e), ms: Date.now() - authStart }
  }

  // 3. Stripe API
  const stripeStart = Date.now()
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
    const balance = await stripe.balance.retrieve()
    checks.stripe = { status: 'ok', detail: `connected, ${balance.available.length} currency(ies)`, ms: Date.now() - stripeStart }
  } catch (e) {
    checks.stripe = { status: stripeKey ? 'error' : 'warning', detail: stripeKey ? String(e) : 'STRIPE_SECRET_KEY not set', ms: Date.now() - stripeStart }
  }

  // 4. Email provider (SMTP or Resend)
  const emailProviderStart = Date.now()
  try {
    const smtpUser = Deno.env.get('SMTP_USER')
    if (smtpUser) {
      checks.email = { status: 'ok', detail: `SMTP configured (${smtpUser})`, ms: Date.now() - emailProviderStart }
    } else if (resendKey) {
      const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${resendKey}` } })
      checks.email = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'Resend connected' : `Resend HTTP ${res.status}`, ms: Date.now() - emailProviderStart }
    } else {
      throw new Error('No email provider configured (SMTP_USER or RESEND_API_KEY)')
    }
  } catch (e) {
    checks.email = { status: 'warning', detail: String(e), ms: Date.now() - emailProviderStart }
  }

  // 5. DeepSeek API
  const aiStart = Date.now()
  try {
    if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not set')
    const res = await fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${deepseekKey}` } })
    checks.deepseek = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'connected' : `HTTP ${res.status}`, ms: Date.now() - aiStart }
  } catch (e) {
    checks.deepseek = { status: 'warning', detail: String(e), ms: Date.now() - aiStart }
  }

  // 6. Environment variables
  const envVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SMTP_USER', 'DEEPSEEK_API_KEY', 'APP_URL', 'CRON_SECRET', 'STRIPE_PRICE_ESSENTIALS', 'STRIPE_PRICE_ELITE', 'STRIPE_PRICE_ESSENTIALS_ANNUAL', 'STRIPE_PRICE_ELITE_ANNUAL']
  const missing = envVars.filter(v => !Deno.env.get(v))
  checks.env_vars = { status: missing.length === 0 ? 'ok' : 'error', detail: missing.length === 0 ? `all ${envVars.length} set` : `missing: ${missing.join(', ')}`, ms: 0 }

  // 7. Recent errors check
  const errStart = Date.now()
  try {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString()
    const { count } = await admin.from('processed_webhook_events').select('event_id', { count: 'exact', head: true }).gte('processed_at', fiveMinAgo)
    checks.webhook_activity = { status: 'ok', detail: `${count ?? 0} events in last 5min`, ms: Date.now() - errStart }
  } catch (e) {
    checks.webhook_activity = { status: 'warning', detail: String(e), ms: Date.now() - errStart }
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok')
  const hasError = Object.values(checks).some(c => c.status === 'error')

  // Send alert email if any errors (max 1 per hour to prevent flooding)
  if (hasError && supabaseUrl && supabaseServiceKey) {
    const db = createClient(supabaseUrl, supabaseServiceKey)
    let shouldSend = true
    try {
      const hourAgo = new Date(Date.now() - 3600000).toISOString()
      const { count } = await db.from('email_logs').select('id', { count: 'exact', head: true }).eq('type', 'health_alert').gte('created_at', hourAgo)
      if ((count ?? 0) > 0) shouldSend = false
    } catch { /* send anyway if dedup check fails */ }

    if (shouldSend) {
      const errorDetails = Object.entries(checks).filter(([, c]) => c.status === 'error').map(([name, c]) => `${name}: ${c.detail}`).join('\n')
      await sendEmail({
        to: 'contact@pptides.com',
        subject: 'pptides Health Check FAILED',
        html: `<pre style="white-space: pre-wrap; font-family: monospace;">Health check detected errors:\n\n${errorDetails}\n\nFull report: ${JSON.stringify(checks, null, 2)}</pre>`,
      }).catch(e => console.error('Alert email failed:', e))
      await db.from('email_logs').insert({ email: 'contact@pptides.com', type: 'health_alert', status: 'sent' }).catch(() => {})
    }
  }

  return new Response(JSON.stringify({
    status: allOk ? 'healthy' : hasError ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, null, 2), { status: allOk ? 200 : hasError ? 503 : 200, headers })
})
