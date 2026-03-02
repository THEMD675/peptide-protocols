import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FORWARD_TO = Deno.env.get('SUPPORT_FORWARD_EMAIL') ?? 'contact@pptides.com'
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, svix-id, svix-timestamp, svix-signature',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const rawBody = await req.text()

    if (!RESEND_WEBHOOK_SECRET) {
      console.error('inbound-email: RESEND_WEBHOOK_SECRET not configured — rejecting request')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    {
      const svixId = req.headers.get('svix-id')
      const svixTimestamp = req.headers.get('svix-timestamp')
      const svixSignature = req.headers.get('svix-signature')
      if (!svixId || !svixTimestamp || !svixSignature) {
        return new Response(JSON.stringify({ error: 'Missing webhook headers' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const ts = parseInt(svixTimestamp, 10)
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - ts) > 300) {
        return new Response(JSON.stringify({ error: 'Timestamp too old' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const toSign = `${svixId}.${svixTimestamp}.${rawBody}`
      const secretBytes = Uint8Array.from(atob(RESEND_WEBHOOK_SECRET.replace('whsec_', '')), c => c.charCodeAt(0))
      const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign))
      const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
      const signatures = svixSignature.split(' ')
      const valid = signatures.some(s => {
        const val = s.startsWith('v1,') ? s.slice(3) : s
        return val === expected
      })
      if (!valid) {
        console.error('inbound-email: invalid webhook signature')
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    let event: { type?: string; data?: Record<string, unknown> }
    try {
      event = JSON.parse(rawBody)
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    if (event.type !== 'email.received') {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { email_id, from, to, subject } = (event.data ?? {}) as { email_id?: string; from?: string; to?: string | string[]; subject?: string }
    if (!from || !subject) {
      return new Response('Missing email fields', { status: 400 })
    }
    const recipients = Array.isArray(to) ? to.join(', ') : to

    console.log(`Inbound email: from=${from} to=${recipients} subject=${subject}`)

    let bodyText = ''
    let bodyHtml = ''
    if (email_id && RESEND_API_KEY) {
      try {
        const contentRes = await fetch(`https://api.resend.com/emails/${email_id}/content`, {
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        })
        if (contentRes.ok) {
          const content = await contentRes.json()
          bodyText = content.text ?? ''
          bodyHtml = content.html ?? ''
        }
      } catch (e) {
        console.error('Failed to fetch email content:', e)
      }
    }

    if (!bodyText && !bodyHtml) {
      bodyText = `[محتوى الرسالة غير متاح — الرجاء التحقق من Resend Dashboard]\n\nEmail ID: ${email_id}\nFrom: ${from}\nSubject: ${subject}`
    }

    if (!RESEND_API_KEY) {
      console.error('inbound-email: RESEND_API_KEY not configured, cannot forward')
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const forwardHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 13px; color: #78716c;"><strong>From:</strong> ${escapeHtml(from)}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #78716c;"><strong>To:</strong> ${escapeHtml(recipients)}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #78716c;"><strong>Subject:</strong> ${escapeHtml(subject ?? '(no subject)')}</p>
        </div>
        <div style="padding: 8px 0;">
          ${bodyHtml ? bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=/gi, 'data-blocked=') : `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(bodyText || '(empty body)')}</pre>`}
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `pptides Inbox <noreply@pptides.com>`,
        to: FORWARD_TO,
        subject: `[pptides] ${subject ?? '(no subject)'} — from ${from}`,
        html: forwardHtml,
        reply_to: from,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('Forward failed:', res.status, errBody)
      return new Response(JSON.stringify({ error: 'Forward failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Forwarded to ${FORWARD_TO}`)
    return new Response(JSON.stringify({ forwarded: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('inbound-email error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
