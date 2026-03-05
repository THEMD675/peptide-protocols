import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { getServiceClient, supabaseServiceKey } from '../_shared/supabase.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    const { user: admin, error: authResp } = await requireAdmin(req)
    if (authResp) return authResp

    // Rate limit: 30 replies per 10 minutes per admin
    if (admin && supabaseServiceKey) {
      const supabase = getServiceClient()
      const allowed = await checkRateLimit(supabase, {
        endpoint: 'send-enquiry-reply',
        identifier: admin.id,
        windowSeconds: 600,
        maxRequests: 30,
      })
      if (!allowed) {
        return jsonResponse({ error: 'Too many replies — wait a few minutes' }, 429, corsHeaders)
      }
    }

    if (!RESEND_API_KEY) {
      return jsonResponse({ error: 'Email service not configured' }, 500, corsHeaders)
    }

    const body = await req.json() as { to?: string; subject?: string; reply?: string }
    const to = body?.to?.trim()
    const subject = body?.subject ?? 'رد على استفسارك — pptides'
    const reply = body?.reply?.trim()
    if (!to || !reply || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse({ error: 'Invalid request: to and reply required' }, 400, corsHeaders)
    }

    const sanitizedReply = reply
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'pptides <contact@pptides.com>',
        to,
        reply_to: 'contact@pptides.com',
        subject,
        html: `
          <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 20px;">رد على استفسارك</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${sanitizedReply}</p>
            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
            <p style="color: #78716c; font-size: 13px; margin-top: 24px;">
              إذا كان لديك أي سؤال إضافي، تواصل معنا: <a href="mailto:contact@pptides.com" style="color: #059669;">contact@pptides.com</a>
            </p>
            <p style="color: #a8a29e; font-size: 11px; margin-top: 16px;">pptides.com — محتوى تعليمي بحثي</p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('send-enquiry-reply Resend error:', res.status, errBody)
      return jsonResponse({ error: 'Email delivery failed' }, 502, corsHeaders)
    }

    // Log the sent email
    if (supabaseServiceKey) {
      const serviceDb = getServiceClient()
      await serviceDb.from('email_logs').insert({
        email: to,
        type: 'enquiry_reply',
        status: 'sent',
      }).catch(e => console.error('email_logs insert failed:', e))
    }

    return jsonResponse({ ok: true }, 200, corsHeaders)
  } catch (e) {
    console.error('send-enquiry-reply:', e)
    return jsonResponse({ error: 'Failed to send reply' }, 500, corsHeaders)
  }
})
