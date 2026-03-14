import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightIfOptions, jsonResponse as json } from '../_shared/cors.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'
import { decode as base64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let result = 0
  for (let i = 0; i < ab.length; i++) result |= ab[i] ^ bb[i]
  return result === 0
}

async function verifySvixSignature(rawBody: string, headers: Headers): Promise<boolean> {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn('resend-webhook: RESEND_WEBHOOK_SECRET not set — skipping verification')
    return true
  }

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('resend-webhook: Missing svix headers')
    return false
  }

  const ts = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > 300) {
    console.error('resend-webhook: Timestamp too old/new:', now - ts, 'seconds drift')
    return false
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
  const secretBase64 = RESEND_WEBHOOK_SECRET.startsWith('whsec_')
    ? RESEND_WEBHOOK_SECRET.slice(6)
    : RESEND_WEBHOOK_SECRET
  const secretBytes = base64Decode(secretBase64)

  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const expectedSig = base64Encode(new Uint8Array(sig))

  const signatures = svixSignature.split(' ')
  for (const s of signatures) {
    const parts = s.split(',')
    if (parts.length < 2) continue
    const sigValue = parts.slice(1).join(',')
    if (timingSafeEqual(expectedSig, sigValue)) return true
  }

  console.error('resend-webhook: Signature mismatch')
  return false
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight
  const cors = getCorsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)

  try {
    const rawBody = await req.text()

    if (!await verifySvixSignature(rawBody, req.headers)) {
      return json({ error: 'Invalid signature' }, 401, cors)
    }

    const body = JSON.parse(rawBody)
    const eventType = body.type as string
    const data = body.data as Record<string, unknown>

    if (!eventType || !data) {
      return json({ error: 'Invalid webhook payload' }, 400, cors)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const toField = data.to as string[] | string | undefined
    const email = Array.isArray(toField) ? toField[0] : (toField ?? (data.email as string) ?? null)
    const emailId = (data.email_id as string) ?? (data.id as string) ?? null

    console.log(`resend-webhook: ${eventType} for ${email ?? 'unknown'} (id: ${emailId})`)

    switch (eventType) {
      case 'email.sent':
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'sent', resend_id: emailId, created_at: new Date().toISOString() }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.delivered':
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'delivered', resend_id: emailId, created_at: new Date().toISOString() }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.delivery_delayed':
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'delayed', resend_id: emailId, details: JSON.stringify(data), created_at: new Date().toISOString() }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.bounced':
        console.error(`BOUNCE: ${email} — ${JSON.stringify(data)}`)
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'bounced', resend_id: emailId, details: JSON.stringify(data), created_at: new Date().toISOString() }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.complained':
        console.error(`COMPLAINT: ${email} — marking for suppression`)
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'complained', resend_id: emailId, details: JSON.stringify(data), created_at: new Date().toISOString() }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.opened':
        if (email) {
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'opened', resend_id: emailId, created_at: new Date().toISOString() }
          ).catch(e => console.warn('email_logs insert failed:', e))
        }
        break

      case 'email.clicked':
        if (email) {
          const clickData = data.click as Record<string, unknown> | undefined
          await supabase.from('email_logs').insert(
            { email, type: 'resend_event', status: 'clicked', resend_id: emailId, details: JSON.stringify({ url: clickData?.url }), created_at: new Date().toISOString() }
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
