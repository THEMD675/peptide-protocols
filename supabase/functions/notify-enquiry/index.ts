import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { emailWrapper } from '../_shared/email-template.ts'
import { sendEmail } from '../_shared/send-email.ts'

const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAIL_WHITELIST') || 'contact@pptides.com').split(',').map(e => e.trim()).filter(Boolean)

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    // Validate user auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)

    const body = await req.json() as { subject?: string; email?: string; name?: string }
    const subject = body.subject || 'استفسار جديد'
    const senderEmail = body.email || user.email || 'unknown'
    const senderName = body.name || ''

    const html = emailWrapper(`
      <h2 style="color:#059669;margin-bottom:16px;">استفسار جديد من ${senderName || senderEmail}</h2>
      <p><strong>الموضوع:</strong> ${subject}</p>
      <p><strong>البريد:</strong> ${senderEmail}</p>
      <p style="margin-top:16px;">يمكنك الرد من <a href="https://pptides.com/admin" style="color:#059669;">لوحة التحكم</a></p>
    `)

    // Send to first admin email (fire and forget for others)
    const primary = ADMIN_EMAILS[0] || 'contact@pptides.com'
    await sendEmail({
      to: primary,
      subject: `استفسار جديد: ${subject}`,
      html,
      tags: [{ name: 'type', value: 'enquiry-notification' }],
    })

    return jsonResponse({ ok: true }, 200, corsHeaders)
  } catch (err) {
    console.error('notify-enquiry error:', err)
    return jsonResponse({ error: 'Internal error' }, 500, corsHeaders)
  }
})
