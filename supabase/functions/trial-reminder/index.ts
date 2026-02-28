import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
const ESSENTIALS_PRICE = '$9'

const IS_PRODUCTION = !Deno.env.get('DENO_DEV')
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? ['https://pptides.com']
  : ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']

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

    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (!expectedSecret) {
      console.error('trial-reminder: CRON_SECRET not configured')
      return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cronSecret = req.headers.get('x-cron-secret')
    if (cronSecret !== expectedSecret) {
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

    const userIds = trialUsers.map(s => s.user_id).filter(Boolean)
    const emailMap = new Map<string, string>()
    for (const uid of userIds) {
      try {
        const { data } = await supabase.auth.admin.getUserById(uid)
        if (data?.user?.email) emailMap.set(uid, data.user.email)
      } catch {
        console.error('trial-reminder: failed to get user', uid)
      }
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

        const email = emailMap.get(sub.user_id)
        if (!email) {
          skipped++
          continue
        }
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
        let reminderType = ''

        if (daysSinceSignup === 1) {
          reminderType = 'day1'
          subject = 'هل استكشفت المكتبة؟ — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا 👋</h1>
            <p>أنت الآن في اليوم الثاني من تجربتك المجانية.</p>
            <p><strong>هل جرّبت هذه الأدوات؟</strong></p>
            <ul>
              <li>🔬 <a href="${APP_URL}/library" style="color: #059669;">تصفّح مكتبة الببتيدات</a></li>
              <li>🧮 <a href="${APP_URL}/calculator" style="color: #059669;">احسب جرعتك بالحاسبة</a></li>
              <li>🤖 <a href="${APP_URL}/coach" style="color: #059669;">اسأل المدرب الذكي</a></li>
            </ul>
            <p>استفد من كل يوم — تجربتك تنتهي خلال ${daysUntilExpiry} أيام.</p>
          `
        } else if (daysUntilExpiry === 1) {
          reminderType = 'last_day'
          subject = '⚠️ آخر يوم في تجربتك — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">تنتهي تجربتك المجانية غدًا</h1>
            <p>غدًا ستفقد الوصول إلى:</p>
            <ul>
              <li>✅ البروتوكولات الكاملة لـ 41 ببتيد</li>
              <li>✅ المدرب الذكي بالذكاء الاصطناعي</li>
              <li>✅ دليل التحاليل المخبرية</li>
              <li>✅ البروتوكولات المُجمَّعة</li>
            </ul>
            <p><strong>اشترك الآن وابدأ بـ ${ESSENTIALS_PRICE}/شهر فقط:</strong></p>
            <a href="${APP_URL}/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن — ${ESSENTIALS_PRICE}/شهر
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال 3 أيام. بدون مخاطرة.</p>
          `
        } else if (daysUntilExpiry <= 0 && daysUntilExpiry >= -3) {
          reminderType = 'expired'
          subject = '🔒 انتهت تجربتك — اشترك الآن — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">انتهت تجربتك المجانية</h1>
            <p>لكن لا تقلق — يمكنك الاشتراك الآن والوصول لكل المحتوى:</p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 24px; font-weight: 900; color: #059669;">${ESSENTIALS_PRICE}/شهر</p>
              <p style="color: #44403c;">Essentials — كل الأدوات والبروتوكولات</p>
            </div>
            <a href="${APP_URL}/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال 3 أيام. بدون مخاطرة.</p>
          `
        } else if (daysUntilExpiry >= -8 && daysUntilExpiry <= -6) {
          reminderType = 'day7_winback'
          subject = '💡 محتوى جديد في pptides — عد واكتشف'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">نشتاق لك 👋</h1>
            <p>أضفنا تحديثات جديدة على المكتبة والأدوات. لا تفوّت:</p>
            <ul>
              <li>🔬 بروتوكولات محدّثة مع أحدث الأبحاث</li>
              <li>🧮 حاسبة الجرعات — مجانية دائمًا</li>
              <li>🤖 المدرب الذكي جاهز لأي سؤال</li>
            </ul>
            <a href="${APP_URL}/library" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              تصفّح المحتوى الجديد
            </a>
            <p style="margin-top: 16px; color: #78716c;">اشترك بـ ${ESSENTIALS_PRICE}/شهر فقط. ضمان استرداد كامل.</p>
          `
        } else if (daysUntilExpiry >= -15 && daysUntilExpiry <= -13) {
          reminderType = 'day14_winback'
          subject = '📊 مستخدمون بدأوا بروتوكولاتهم هذا الأسبوع — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">مجتمع pptides ينمو</h1>
            <p>مستخدمون جدد بدأوا بروتوكولات BPC-157 و Semaglutide هذا الأسبوع.</p>
            <p>اكتشف ما يناسبك — البروتوكول الصح يبدأ من المعلومة الصح.</p>
            <a href="${APP_URL}/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن — ${ESSENTIALS_PRICE}/شهر
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال 3 أيام.</p>
          `
        } else if (daysUntilExpiry >= -31 && daysUntilExpiry <= -29) {
          reminderType = 'day30_winback'
          subject = '🔑 آخر تذكير — مفتاحك لـ pptides ينتظرك'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">شهر مرّ — ما زلنا هنا</h1>
            <p>41 بروتوكول ببتيد، حاسبة جرعات، مدرب ذكي، ودليل تحاليل — كل شيء جاهز لك.</p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 20px; font-weight: 900; color: #059669;">فقط ${ESSENTIALS_PRICE}/شهر</p>
              <p style="color: #44403c;">كل الأدوات + ضمان استرداد كامل</p>
            </div>
            <a href="${APP_URL}/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              ابدأ الآن
            </a>
          `
        } else {
          skipped++
          continue
        }

        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: reminderType })
        if (dedupErr && dedupErr.code === '23505') {
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
