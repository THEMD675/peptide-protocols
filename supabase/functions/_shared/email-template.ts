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
 * Includes List-Unsubscribe (mailto) for RFC 2369 compliance.
 */
export function unsubscribeHeaders(): Record<string, string> {
  return {
    'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
  }
}
