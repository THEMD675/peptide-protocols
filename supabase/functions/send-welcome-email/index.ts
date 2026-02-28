import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
const IS_PRODUCTION = !Deno.env.get('DENO_DEV')
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? ['https://pptides.com']
  : ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('send-welcome-email: missing SUPABASE_URL or SUPABASE_ANON_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.error('send-welcome-email: RESEND_API_KEY is not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('send-welcome-email auth failed:', authError?.message ?? 'no user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: { email?: string; name?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, name } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (email !== user.email) {
      return new Response(JSON.stringify({ error: 'Email mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const fixTrialDuration = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        const { data: subRow } = await serviceSupabase
          .from('subscriptions')
          .select('id, created_at, trial_ends_at')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!subRow) continue
        if (subRow.created_at && subRow.trial_ends_at) {
          const created = new Date(subRow.created_at).getTime()
          const trialEnd = new Date(subRow.trial_ends_at).getTime()
          const days = (trialEnd - created) / 86400000
          if (days > 4) {
            const correct = new Date(created + 3 * 86400000).toISOString()
            await serviceSupabase.from('subscriptions').update({ trial_ends_at: correct }).eq('id', subRow.id)
          }
        }
        break
      }
    }
    fixTrialDuration().catch(e => console.error('trial fix failed:', e))

    const rawName = name || email.split('@')[0]
    const displayName = rawName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .slice(0, 50)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'pptides <noreply@pptides.com>',
        reply_to: 'contact@pptides.com',
        to: email,
        subject: '⏱️ تجربتك المجانية بدأت — 3 أيام لاستكشاف pptides',
        html: `
          <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا، ${displayName}</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              تجربتك المجانية في pptides بدأت الآن — أمامك <strong style="color: #059669;">3 أيام</strong> لاستكشاف أشمل دليل عربي للببتيدات العلاجية.
            </p>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: bold;">⏱️ تنتهي تجربتك خلال 72 ساعة — استفد من كل دقيقة</p>
            </div>

            <p style="color: #44403c; font-size: 15px; line-height: 1.8; font-weight: bold;">خطتك لـ 3 أيام:</p>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <p style="margin: 10px 0; font-size: 15px;">
                <strong style="color: #059669;">اليوم الأول:</strong> تصفّح <a href="${APP_URL}/library" style="color: #059669; font-weight: bold;">مكتبة 41+ ببتيد</a> — اكتشف البروتوكول المناسب لهدفك
              </p>
              <p style="margin: 10px 0; font-size: 15px;">
                <strong style="color: #059669;">اليوم الثاني:</strong> اسأل <a href="${APP_URL}/coach" style="color: #059669; font-weight: bold;">المدرب الذكي</a> — احصل على بروتوكول مخصّص بالجرعات والتوقيت
              </p>
              <p style="margin: 10px 0; font-size: 15px;">
                <strong style="color: #059669;">اليوم الثالث:</strong> جرّب <a href="${APP_URL}/calculator" style="color: #059669; font-weight: bold;">حاسبة الجرعات</a> — شاهد جرعتك بالضبط على السيرنج
              </p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${APP_URL}/dashboard" style="display: inline-block; background: #059669; color: white; padding: 16px 40px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 16px;">
                ابدأ الآن
              </a>
            </div>

            <p style="color: #78716c; font-size: 13px; line-height: 1.6; margin-top: 24px;">
              بعد 3 أيام، يمكنك الاشتراك بـ $9/شهر للاحتفاظ بالوصول الكامل. ضمان استرداد كامل — بدون أسئلة.
            </p>

            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
            <p style="color: #a8a29e; font-size: 12px;">
              pptides.com — محتوى تعليمي بحثي. استشر طبيبك قبل استخدام أي ببتيد.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('send-welcome-email Resend error:', res.status, errBody)
      return new Response(JSON.stringify({ error: 'Email service error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-welcome-email unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
