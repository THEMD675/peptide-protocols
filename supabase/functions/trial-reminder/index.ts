import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const ALLOWED_ORIGINS = ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('trial-reminder: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (expectedSecret && cronSecret !== expectedSecret) {
      console.error('trial-reminder: invalid cron secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.error('trial-reminder: RESEND_API_KEY is not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()

    const { data: trialUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, trial_ends_at, created_at')
      .eq('status', 'trial')

    if (queryError) {
      console.error('trial-reminder: failed to query trial users:', queryError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!trialUsers || trialUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const sub of trialUsers) {
      try {
        if (!sub.trial_ends_at || !sub.created_at) {
          console.error('trial-reminder: missing date fields for user', sub.user_id)
          skipped++
          continue
        }

        const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
        if (!authUser?.user?.email) {
          skipped++
          continue
        }

        const email = authUser.user.email
        const createdAt = new Date(sub.created_at)
        const trialEnds = new Date(sub.trial_ends_at)

        if (isNaN(createdAt.getTime()) || isNaN(trialEnds.getTime())) {
          console.error('trial-reminder: invalid date for user', sub.user_id, { created_at: sub.created_at, trial_ends_at: sub.trial_ends_at })
          skipped++
          continue
        }

        const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        const daysUntilExpiry = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        let subject = ''
        let body = ''

        if (daysSinceSignup === 1) {
          subject = 'هل استكشفت المكتبة؟ — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا 👋</h1>
            <p>أنت الآن في اليوم الثاني من تجربتك المجانية.</p>
            <p><strong>هل جرّبت هذه الأدوات؟</strong></p>
            <ul>
              <li>🔬 <a href="https://pptides.com/library" style="color: #059669;">تصفّح مكتبة 41+ ببتيد</a></li>
              <li>🧮 <a href="https://pptides.com/calculator" style="color: #059669;">احسب جرعتك بالحاسبة</a></li>
              <li>🤖 <a href="https://pptides.com/coach" style="color: #059669;">اسأل المدرب الذكي</a></li>
            </ul>
            <p>استفد من كل يوم — تجربتك تنتهي خلال ${daysUntilExpiry} أيام.</p>
          `
        } else if (daysUntilExpiry === 1) {
          subject = '⚠️ آخر يوم في تجربتك — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">تنتهي تجربتك المجانية غدًا</h1>
            <p>بعد غد ستفقد الوصول إلى:</p>
            <ul>
              <li>✅ البروتوكولات الكاملة لـ 41 ببتيد</li>
              <li>✅ المدرب الذكي بالذكاء الاصطناعي</li>
              <li>✅ دليل التحاليل المخبرية</li>
              <li>✅ البروتوكولات المُجمَّعة</li>
            </ul>
            <p><strong>اشترك الآن وابدأ بـ $9/شهر فقط:</strong></p>
            <a href="https://pptides.com/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن — $9/شهر
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال 3 أيام. بدون مخاطرة.</p>
          `
        } else if (daysUntilExpiry === 0 || daysUntilExpiry === -1) {
          subject = '🔒 انتهت تجربتك — اشترك الآن — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">انتهت تجربتك المجانية</h1>
            <p>لكن لا تقلق — يمكنك الاشتراك الآن والوصول لكل المحتوى:</p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 24px; font-weight: 900; color: #059669;">$9/شهر</p>
              <p style="color: #44403c;">Essentials — كل الأدوات والبروتوكولات</p>
            </div>
            <a href="https://pptides.com/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال 3 أيام. بدون مخاطرة.</p>
          `
        } else {
          skipped++
          continue
        }

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'pptides <noreply@pptides.com>',
            to: email,
            subject,
            html: `
              <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; line-height: 1.8;">
                ${body}
                <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 30px 0;" />
                <p style="color: #a8a29e; font-size: 12px;">
                  pptides.com — محتوى تعليمي بحثي. استشر طبيبك قبل استخدام أي ببتيد.
                </p>
              </div>
            `,
          }),
        })

        if (emailRes.ok) {
          sent++
        } else {
          const errBody = await emailRes.text().catch(() => '')
          console.error(`trial-reminder: failed to send to ${email}:`, emailRes.status, errBody)
          failed++
        }
      } catch (loopErr) {
        console.error('trial-reminder: error processing user', sub.user_id, loopErr)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('trial-reminder unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
