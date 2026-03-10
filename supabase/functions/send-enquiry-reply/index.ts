import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { emailWrapper } from '../_shared/email-template.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { getServiceClient, supabaseServiceKey } from '../_shared/supabase.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { sendEmail } from '../_shared/send-email.ts'

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

    const body = await req.json() as { to?: string; subject?: string; reply?: string; enquiry_id?: string }
    const to = body?.to?.trim()
    const subject = body?.subject ?? 'رد على استفسارك — pptides'
    const reply = body?.reply?.trim()
    const enquiryId = body?.enquiry_id?.trim() ?? null
    if (!to || !reply || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse({ error: 'Invalid request: to and reply required' }, 400, corsHeaders)
    }

    const sanitizedReply = reply
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const emailResult = await sendEmail({
      to,
      subject,
      html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 20px;">رد على استفسارك</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${sanitizedReply}</p>
            <p style="color: #78716c; font-size: 13px; margin-top: 24px;">
              إذا كان لديك أي سؤال إضافي، تواصل معنا: <a href="mailto:contact@pptides.com" style="color: #059669;">contact@pptides.com</a>
            </p>
        `),
      replyTo: 'contact@pptides.com',
    })

    if (!emailResult.ok) {
      console.error('send-enquiry-reply error:', emailResult.error)
      return jsonResponse({ error: 'Email delivery failed' }, 502, corsHeaders)
    }

    // Log the sent email and mark enquiry as replied
    if (supabaseServiceKey) {
      const serviceDb = getServiceClient()
      await serviceDb.from('email_logs').insert({
        email: to,
        type: 'enquiry_reply',
        status: 'sent',
      }).catch(e => console.error('email_logs insert failed:', e))

      // Mark the enquiry as replied if an enquiry_id was provided
      if (enquiryId) {
        await serviceDb
          .from('enquiries')
          .update({ status: 'replied', updated_at: new Date().toISOString() })
          .eq('id', enquiryId)
          .catch(e => console.error('enquiry status update failed:', e))
      }
    }

    return jsonResponse({ ok: true }, 200, corsHeaders)
  } catch (e) {
    console.error('send-enquiry-reply:', e)
    return jsonResponse({ error: 'Failed to send reply' }, 500, corsHeaders)
  }
})
