/**
 * Send transactional emails via Resend API (primary) or SMTP (Gmail fallback).
 * Resend Pro features used: batch API, tags for analytics, delivery tracking headers.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10)
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''
const FROM_EMAIL_SMTP = Deno.env.get('FROM_EMAIL') || 'pptides <contact@amirisgroup.co>'
const FROM_EMAIL_RESEND = Deno.env.get('FROM_EMAIL_RESEND') || 'pptides <contact@pptides.com>'

interface EmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

interface BatchEmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        signal: AbortSignal.timeout(10000),
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
          ...(payload.tags?.length ? { tags: payload.tags } : {}),
          headers: {
            'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ok: true, id: data.id }
      }
      const body = await res.text()
      console.error('sendEmail: Resend API error:', res.status, body)
    } catch (err) {
      console.error('sendEmail: Resend fetch error:', err)
    }
  }

  if (SMTP_USER && SMTP_PASS) {
    try {
      const client = new SMTPClient({
        connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: true, auth: { username: SMTP_USER, password: SMTP_PASS } },
      })
      const smtpTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SMTP timeout after 15s')), 15000))
      await Promise.race([
        client.send({
          from: FROM_EMAIL_SMTP, to: payload.to, subject: payload.subject,
          content: 'Please view this email in an HTML-capable client.', html: payload.html,
          headers: { 'Reply-To': payload.replyTo || 'contact@pptides.com', 'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }),
        smtpTimeout,
      ])
      await client.close()
      return { ok: true }
    } catch (err) {
      console.error('sendEmail: SMTP error:', err)
    }
  }

  console.error('sendEmail: All providers failed. Could not send to:', payload.to)
  return { ok: false, error: 'all_providers_failed' }
}

/**
 * Send up to 100 emails in a single Resend API call (Pro feature).
 * Falls back to sequential sends if batch API fails.
 */
export async function sendBatchEmails(emails: BatchEmailPayload[]): Promise<{ sent: number; failed: number; ids: string[] }> {
  if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith('re_') || emails.length === 0) {
    let sent = 0, failed = 0
    for (const e of emails) {
      const r = await sendEmail(e)
      if (r.ok) sent++; else failed++
    }
    return { sent, failed, ids: [] }
  }

  const chunks: BatchEmailPayload[][] = []
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100))
  }

  let totalSent = 0, totalFailed = 0
  const allIds: string[] = []

  for (const chunk of chunks) {
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        signal: AbortSignal.timeout(30000),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(chunk.map(e => ({
          from: FROM_EMAIL_RESEND,
          to: e.to,
          subject: e.subject,
          html: e.html,
          ...(e.replyTo ? { reply_to: e.replyTo } : {}),
          ...(e.tags?.length ? { tags: e.tags } : {}),
          headers: {
            'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }))),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({ data: [] }))
        const ids = (data.data ?? []).map((d: { id: string }) => d.id)
        allIds.push(...ids)
        totalSent += chunk.length
      } else {
        const body = await res.text()
        console.error('sendBatchEmails: Resend batch error:', res.status, body)
        for (const e of chunk) {
          const r = await sendEmail(e)
          if (r.ok) totalSent++; else totalFailed++
        }
      }
    } catch (err) {
      console.error('sendBatchEmails: Resend batch fetch error:', err)
      for (const e of chunk) {
        const r = await sendEmail(e)
        if (r.ok) totalSent++; else totalFailed++
      }
    }
  }

  return { sent: totalSent, failed: totalFailed, ids: allIds }
}
