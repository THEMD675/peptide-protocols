/**
 * Shared pptides email template module.
 * RTL, Cairo font, emerald green branding. All inline CSS for email client compatibility.
 */

const SUPPORT_EMAIL = 'contact@pptides.com'
const BRAND_COLOR = '#059669' // emerald-600

/**
 * Wraps content in the standard pptides email layout.
 * Includes: RTL, Cairo font, max-width 600px centered, logo at top, footer with tagline and support email.
 */
export function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"></head>
<body>
<div dir="rtl" style="font-family: 'Cairo', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; line-height: 1.8;">
  <p style="margin: 0 0 24px 0; font-size: 20px; font-weight: bold; color: ${BRAND_COLOR};">pptides</p>
  ${content}
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
  <p style="color: #a8a29e; font-size: 12px;">
    pptides — أشمل دليل عربي للببتيدات العلاجية
  </p>
  <p style="color: #a8a29e; font-size: 11px; margin-top: 8px;">
    محتوى تعليمي بحثي. استشر طبيبك قبل استخدام أي ببتيد.
  </p>
  <p style="color: #a8a29e; font-size: 11px; margin-top: 16px;">
    لإلغاء الاشتراك من رسائلنا، تواصل معنا: <a href="mailto:${SUPPORT_EMAIL}" style="color: #a8a29e;">${SUPPORT_EMAIL}</a>
  </p>
</div>
</body>
</html>
`.trim()
}

/**
 * Generates a CTA button with emerald green branding.
 */
export function emailButton(text: string, url: string): string {
  return `<a href="${url}" style="display: inline-block; background: ${BRAND_COLOR}; color: white; padding: 16px 40px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 16px;">${text}</a>`
}

/**
 * Standard email headers for marketing/transactional emails.
 * Includes List-Unsubscribe with both HTTPS and mailto for RFC 8058 + RFC 2369 compliance.
 */
export async function unsubscribeHeaders(email?: string): Promise<Record<string, string>> {
  const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
  const headers: Record<string, string> = {
    'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
  if (email) {
    const secret = Deno.env.get('UNSUBSCRIBE_HMAC_SECRET') || Deno.env.get('CRON_SECRET') || ''
    if (secret) {
      try {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw', encoder.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        )
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(email.toLowerCase()))
        const token = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
        const url = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
        headers['List-Unsubscribe'] = `<${url}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`
      } catch { /* fallback to mailto-only */ }
    }
  }
  return headers
}
