/**
 * Send transactional emails via Resend API (primary) or SMTP (Gmail fallback).
 * Resend sends from pptides.com (has SPF+DKIM+DMARC = full auth).
 * SMTP sends from amirisgroup.co (no SPF = emails may land in spam).
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10)
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''
// SMTP (Gmail) uses amirisgroup.co (NO SPF — use only as fallback)
const FROM_EMAIL_SMTP = Deno.env.get('FROM_EMAIL') || 'pptides <contact@amirisgroup.co>'
// Resend uses pptides.com (SPF+DKIM+DMARC all pass — preferred sender)
const FROM_EMAIL_RESEND = Deno.env.get('FROM_EMAIL_RESEND') || 'pptides <contact@pptides.com>'

interface EmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send email via Resend API (preferred) or SMTP (Gmail) fallback.
 * Auth emails (signup confirm, password reset) use Supabase's built-in SMTP.
 * This function handles transactional emails (welcome, reminders, admin replies).
 *
 * Priority: Resend > SMTP because:
 * - pptides.com has full SPF+DKIM+DMARC alignment (verified via Port25)
 * - amirisgroup.co has NO SPF record → emails may be flagged as spam
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  // Try Resend first (pptides.com — full email auth)
  if (RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        signal: AbortSignal.timeout(10000), // 10s timeout — prevents hanging until Supabase's 150s kill
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL_RESEND,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
          headers: {
            'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
      if (res.ok) return { ok: true }
      const body = await res.text()
      console.error('sendEmail: Resend API error:', res.status, body)
      // Fall through to SMTP
    } catch (err) {
      console.error('sendEmail: Resend fetch error:', err)
      // Fall through to SMTP
    }
  }

  // Fallback: SMTP (Gmail — amirisgroup.co, no SPF)
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

      const smtpTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout after 15s')), 15000)
      )
      await Promise.race([
        client.send({
          from: FROM_EMAIL_SMTP,
          to: payload.to,
          subject: payload.subject,
          content: 'Please view this email in an HTML-capable client.',
          html: payload.html,
          headers: {
            'Reply-To': payload.replyTo || 'contact@pptides.com',
            'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
        smtpTimeout,
      ])

      await client.close()
      return { ok: true }
    } catch (err) {
      console.error('sendEmail: SMTP error:', err)
    }
  }

  // No working email provider
  console.error('sendEmail: All providers failed. Could not send to:', payload.to)
  return { ok: false, error: 'all_providers_failed' }
}
