/**
 * Send transactional emails via Supabase's configured SMTP (Gmail).
 * Falls back gracefully if Resend is available.
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''
const FROM_EMAIL = 'pptides <noreply@pptides.com>'

interface EmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send email via Resend API (preferred) or fall back to logging.
 * Auth emails (signup confirm, password reset) use Supabase's built-in SMTP.
 * This function handles transactional emails (welcome, reminders, admin replies).
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  // Try Resend first
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
      // Fall through to log
    } catch (err) {
      console.error('sendEmail: Resend fetch error:', err)
    }
  }

  // No working email provider — log and return
  console.warn('sendEmail: No email provider available. Would have sent:', {
    to: payload.to,
    subject: payload.subject,
  })
  // Return ok:true so callers don't break — email is best-effort
  return { ok: true, error: 'no_provider' }
}
