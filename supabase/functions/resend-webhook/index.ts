import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightIfOptions, jsonResponse as json } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight
  const cors = getCorsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)

  try {
    const body = await req.json()
    const eventType = body.type as string
    const data = body.data as Record<string, unknown>

    if (!eventType || !data) {
      return json({ error: 'Invalid webhook payload' }, 400, cors)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const email = (data.to as string[] | undefined)?.[0] ?? (data.email as string) ?? null
    const emailId = data.email_id as string ?? data.id as string ?? null

    console.log(`resend-webhook: ${eventType} for ${email ?? 'unknown'} (id: ${emailId})`)

    switch (eventType) {
      case 'email.sent':
        if (email) {
          await supabase.from('email_logs').upsert(
            { email, type: 'resend_sent', status: 'sent', resend_id: emailId, created_at: new Date().toISOString() },
            { onConflict: 'resend_id', ignoreDuplicates: true }
          ).catch(e => console.warn('email_logs upsert failed:', e))
        }
        break

      case 'email.delivered':
        if (email) {
          await supabase.from('email_logs').upsert(
            { email, type: 'resend_delivered', status: 'delivered', resend_id: emailId, created_at: new Date().toISOString() },
            { onConflict: 'resend_id', ignoreDuplicates: true }
          ).catch(e => console.warn('email_logs upsert failed:', e))
        }
        break

      case 'email.bounced':
        console.error(`BOUNCE: ${email} — ${JSON.stringify(data)}`)
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_bounce', status: 'bounced', resend_id: emailId, details: JSON.stringify(data) }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.complained':
        console.error(`COMPLAINT: ${email} — marking for suppression`)
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_complaint', status: 'complained', resend_id: emailId, details: JSON.stringify(data) }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.opened':
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_opened', status: 'opened', resend_id: emailId }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.clicked':
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_clicked', status: 'clicked', resend_id: emailId, details: JSON.stringify({ url: data.click?.url }) }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      default:
        console.log(`resend-webhook: unhandled event type: ${eventType}`)
    }

    return json({ received: true, type: eventType }, 200, cors)
  } catch (err) {
    console.error('resend-webhook error:', err)
    return json({ error: 'Internal error' }, 500, cors)
  }
})
