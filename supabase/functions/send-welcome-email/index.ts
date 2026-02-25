import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const ALLOWED_ORIGINS = ['https://pptides.com', 'http://localhost:3000']

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, name } = await req.json()
    if (!email || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing email or API key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawName = name || email.split('@')[0]
    const displayName = rawName.replace(/[<>"'&]/g, '')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'pptides <noreply@pptides.com>',
        to: email,
        subject: 'مرحبًا في pptides — رحلتك مع الببتيدات تبدأ الآن',
        html: `
          <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا، ${displayName}</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              شكرًا لانضمامك إلى pptides — أشمل دليل عربي للببتيدات العلاجية.
            </p>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              حسابك جاهز. إليك كيف تبدأ:
            </p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>1.</strong> تصفّح <a href="https://pptides.com/library" style="color: #059669;">مكتبة 41+ ببتيد</a></p>
              <p style="margin: 8px 0;"><strong>2.</strong> جرّب <a href="https://pptides.com/calculator" style="color: #059669;">حاسبة الجرعات المجانية</a></p>
              <p style="margin: 8px 0;"><strong>3.</strong> اسأل <a href="https://pptides.com/coach" style="color: #059669;">المدرب الذكي</a> عن أي ببتيد</p>
            </div>
            <a href="https://pptides.com/library" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 16px;">
              ابدأ الاستكشاف
            </a>
            <p style="color: #a8a29e; font-size: 12px; margin-top: 30px;">
              pptides.com — محتوى تعليمي بحثي. استشر طبيبك قبل استخدام أي ببتيد.
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
