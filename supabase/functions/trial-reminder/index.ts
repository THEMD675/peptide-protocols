import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://pptides.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: trialUsers } = await supabase
      .from('subscriptions')
      .select('user_id, trial_ends_at, created_at')
      .eq('status', 'trial')
      .eq('tier', 'free')

    if (!trialUsers || trialUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0

    for (const sub of trialUsers) {
      const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
      if (!authUser?.user?.email) continue

      const email = authUser.user.email
      const createdAt = new Date(sub.created_at)
      const trialEnds = new Date(sub.trial_ends_at)
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
          <p style="margin-top: 16px; color: #78716c;">أو وفّر 20% مع الاشتراك السنوي بـ $7.17/شهر فقط.</p>
        `
      } else if (daysUntilExpiry === 0 || daysUntilExpiry === -1) {
        subject = '🔒 انتهت تجربتك — عرض خاص لك — pptides'
        body = `
          <h1 style="color: #1c1917; font-size: 24px;">انتهت تجربتك المجانية</h1>
          <p>لكن لا تقلق — لديك عرض خاص:</p>
          <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="font-size: 24px; font-weight: 900; color: #059669;">$7.17/شهر</p>
            <p style="color: #44403c;">وفّر 20% مع الاشتراك السنوي</p>
          </div>
          <a href="https://pptides.com/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
            احصل على العرض
          </a>
          <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال 3 أيام. بدون مخاطرة.</p>
        `
      } else {
        continue
      }

      await fetch('https://api.resend.com/emails', {
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

      sent++
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
