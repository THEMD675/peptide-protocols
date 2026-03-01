import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

serve(async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  const authHeader = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  if (authHeader !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const balance = await stripe.balance.retrieve()
    checks.stripe = { status: 'ok', detail: `connected, ${balance.available.length} currency(ies)`, ms: Date.now() - stripeStart }
  } catch (e) {
    checks.stripe = { status: stripeKey ? 'error' : 'warning', detail: stripeKey ? String(e) : 'STRIPE_SECRET_KEY not set', ms: Date.now() - stripeStart }
  }

  // 4. Resend API
  const resendStart = Date.now()
  try {
    if (!resendKey) throw new Error('RESEND_API_KEY not set')
    const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${resendKey}` } })
    checks.resend = { status: res.ok ? 'ok' : 'error', detail: res.ok ? 'connected' : `HTTP ${res.status}`, ms: Date.now() - resendStart }
  } catch (e) {
    checks.resend = { status: 'warning', detail: String(e), ms: Date.now() - resendStart }
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
  const envVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'DEEPSEEK_API_KEY', 'APP_URL', 'CRON_SECRET', 'STRIPE_PRICE_ESSENTIALS', 'STRIPE_PRICE_ELITE']
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

  // Send alert email if any errors
  if (hasError && resendKey) {
    const errorDetails = Object.entries(checks).filter(([, c]) => c.status === 'error').map(([name, c]) => `${name}: ${c.detail}`).join('\n')
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'pptides <noreply@pptides.com>',
        to: 'contact@pptides.com',
        subject: 'pptides Health Check FAILED',
        text: `Health check detected errors:\n\n${errorDetails}\n\nFull report: ${JSON.stringify(checks, null, 2)}`,
      }),
    }).catch(e => console.error('Alert email failed:', e))
  }

  return new Response(JSON.stringify({
    status: allOk ? 'healthy' : hasError ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, null, 2), { status: allOk ? 200 : hasError ? 503 : 200, headers })
})
