/**
 * Send transactional emails via SMTP (Gmail) or Resend API.
 * SMTP is the primary provider; Resend is fallback.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10)
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'pptides <contact@amirisgroup.co>'

interface EmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send email via SMTP (preferred) or Resend API fallback.
 * Auth emails (signup confirm, password reset) use Supabase's built-in SMTP.
 * This function handles transactional emails (welcome, reminders, admin replies).
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  // Try SMTP first (Gmail)
  if (SMTP_USER && SMTP_PASS) {
    try {
      const client = new SMTPClient({
        connection: {
          hostname: SMTP_HOST,
          port: SMTP_PORT,
          tls: true,
          auth: {
            username: SMTP_USER,
            password: SMTP_PASS,
          },
        },
      })

      await client.send({
        from: FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        content: 'Please view this email in an HTML-capable client.',
        html: payload.html,
        headers: {
          'Reply-To': payload.replyTo || 'contact@pptides.com',
          'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
        },
      })

      await client.close()
      return { ok: true }
    } catch (err) {
      console.error('sendEmail: SMTP error:', err)
      // Fall through to Resend
    }
  }

  // Try Resend as fallback
  if (RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        }),
      })
      if (res.ok) return { ok: true }
      const body = await res.text()
      console.error('sendEmail: Resend API error:', res.status, body)
    } catch (err) {
      console.error('sendEmail: Resend fetch error:', err)
    }
  }

  // No working email provider
  console.error('sendEmail: All providers failed. Could not send to:', payload.to)
  return { ok: false, error: 'all_providers_failed' }
}
