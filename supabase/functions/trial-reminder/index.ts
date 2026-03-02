import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIAL_DAYS = 3 // Keep in sync with src/config/trial.ts
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
// SOURCE OF TRUTH: 34 SAR = 1 month Essentials; override via ESSENTIALS_PRICE_DISPLAY env
const ESSENTIALS_PRICE = Deno.env.get('ESSENTIALS_PRICE_DISPLAY') ?? '34 ر.س'
// SOURCE OF TRUTH: match src/lib/constants.ts (peptides.length); override via PEPTIDE_COUNT env
const PEPTIDE_COUNT = parseInt(Deno.env.get('PEPTIDE_COUNT') ?? '41', 10)

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

import { getCorsHeaders } from '../_shared/cors.ts'

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
    if (!cronSecret || !constantTimeCompare(cronSecret, expectedSecret)) {
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
      .select('user_id, trial_ends_at, created_at, stripe_subscription_id')
      .eq('status', 'trial')
      .limit(10000)

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

        const { data: { user: authUser }, error: userErr } = await supabase.auth.admin.getUserById(sub.user_id)
        if (userErr || !authUser?.email) {
          skipped++
          continue
        }
        const email = authUser.email
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

        if (daysSinceSignup >= 1 && daysSinceSignup <= 2) {
          reminderType = 'day1'
          subject = 'هل استكشفت المكتبة؟ — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا </h1>
            <p>أنت الآن في اليوم الثاني من تجربتك المجانية.</p>
            <p><strong>هل جرّبت هذه الأدوات؟</strong></p>
            <ul>
              <li> <a href="${APP_URL}/library" style="color: #059669;">تصفّح مكتبة الببتيدات</a></li>
              <li> <a href="${APP_URL}/calculator" style="color: #059669;">احسب جرعتك بالحاسبة</a></li>
              <li> <a href="${APP_URL}/coach" style="color: #059669;">اسأل المدرب الذكي</a></li>
            </ul>
            <p>استفد من كل يوم — تجربتك تنتهي خلال ${daysUntilExpiry} أيام.</p>
          `
        } else if (daysUntilExpiry === 1) {
          reminderType = 'last_day'
          subject = ' آخر يوم في تجربتك — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">تنتهي تجربتك المجانية غدًا</h1>
            <p>غدًا ستفقد الوصول إلى:</p>
            <ul>
              <li> البروتوكولات الكاملة لـ ${PEPTIDE_COUNT} ببتيد</li>
              <li> المدرب الذكي بالذكاء الاصطناعي</li>
              <li> دليل التحاليل المخبرية</li>
              <li> البروتوكولات المُجمَّعة</li>
            </ul>
            <p><strong>اشترك الآن وابدأ بـ ${ESSENTIALS_PRICE}/شهر فقط:</strong></p>
            <a href="${APP_URL}/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن — ${ESSENTIALS_PRICE}/شهر
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال ${TRIAL_DAYS} أيام. بدون مخاطرة.</p>
          `
        } else if (daysUntilExpiry <= 0 && daysUntilExpiry >= -3) {
          reminderType = 'expired'
          subject = ' انتهت تجربتك — اشترك الآن — pptides'
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
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال ${TRIAL_DAYS} أيام. بدون مخاطرة.</p>
          `
        } else if (daysUntilExpiry >= -8 && daysUntilExpiry <= -6) {
          reminderType = 'day7_winback'
          subject = ' محتوى جديد في pptides — عد واكتشف'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">نشتاق لك </h1>
            <p>أضفنا تحديثات جديدة على المكتبة والأدوات. لا تفوّت:</p>
            <ul>
              <li> بروتوكولات محدّثة مع أحدث الأبحاث</li>
              <li> حاسبة الجرعات — مجانية دائمًا</li>
              <li> المدرب الذكي جاهز لأي سؤال</li>
            </ul>
            <a href="${APP_URL}/library" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              تصفّح المحتوى الجديد
            </a>
            <p style="margin-top: 16px; color: #78716c;">اشترك بـ ${ESSENTIALS_PRICE}/شهر فقط. ضمان استرداد كامل.</p>
          `
        } else if (daysUntilExpiry >= -15 && daysUntilExpiry <= -13) {
          reminderType = 'day14_winback'
          subject = ' مستخدمون بدأوا بروتوكولاتهم هذا الأسبوع — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">مجتمع pptides ينمو</h1>
            <p>مستخدمون جدد بدأوا بروتوكولات BPC-157 و Semaglutide هذا الأسبوع.</p>
            <p>اكتشف ما يناسبك — البروتوكول الصح يبدأ من المعلومة الصح.</p>
            <a href="${APP_URL}/pricing" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              اشترك الآن — ${ESSENTIALS_PRICE}/شهر
            </a>
            <p style="margin-top: 16px; color: #78716c;">ضمان استرداد كامل خلال ${TRIAL_DAYS} أيام.</p>
          `
        } else if (daysUntilExpiry >= -31 && daysUntilExpiry <= -29) {
          reminderType = 'day30_winback'
          subject = 'آخر تذكير — مفتاحك لـ pptides ينتظرك'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">شهر مرّ — ما زلنا هنا</h1>
            <p>${PEPTIDE_COUNT} بروتوكول ببتيد، حاسبة جرعات، مدرب ذكي، ودليل تحاليل — كل شيء جاهز لك.</p>
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

        if (reminderType === 'last_day' && sub.stripe_subscription_id) {
          skipped++
          continue
        }

        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: reminderType })
        if (dedupErr) {
          if (dedupErr.code === '23505') {
            skipped++
            continue
          }
          console.error('trial-reminder: dedup insert failed:', dedupErr)
          failed++
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
            reply_to: 'contact@pptides.com',
            to: email,
            subject,
            headers: {
              'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
            },
            html: `
              <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; line-height: 1.8;">
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
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id)
            .eq('reminder_type', reminderType)
            .catch(() => {})
          failed++
        }
      } catch (loopErr) {
        console.error('trial-reminder: error processing user', sub.user_id, loopErr)
        failed++
      }
    }

    // Weekly summary email for active subscribers
    const { data: activeSubscribers } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trial'])

    if (activeSubscribers && activeSubscribers.length > 0) {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      for (const sub of activeSubscribers) {
        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(sub.user_id)
          if (!authUser?.email) continue

          const { count: weeklyCount } = await supabase
            .from('injection_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sub.user_id)
            .gte('logged_at', weekAgo)

          if (!weeklyCount || weeklyCount === 0) continue

          const { data: streakData } = await supabase
            .from('injection_logs')
            .select('logged_at')
            .eq('user_id', sub.user_id)
            .order('logged_at', { ascending: false })
            .limit(60)

          let streakDays = 0
          if (streakData && streakData.length > 0) {
            const dates = new Set(streakData.map(d => new Date(d.logged_at).toISOString().slice(0, 10)))
            const today = new Date()
            for (let i = 0; i < 60; i++) {
              const d = new Date(today)
              d.setDate(d.getDate() - i)
              if (dates.has(d.toISOString().slice(0, 10))) streakDays++
              else break
            }
          }

          const { error: dedupErr } = await supabase
            .from('sent_reminders')
            .insert({ user_id: sub.user_id, reminder_type: `weekly_summary_${now.toISOString().slice(0, 10)}` })
          if (dedupErr) continue

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'pptides <noreply@pptides.com>',
              reply_to: 'contact@pptides.com',
              to: authUser.email,
              subject: `ملخصك الأسبوعي — ${weeklyCount} حقنة — pptides`,
              headers: {
                'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
              },
              html: `
                <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; line-height: 1.8;">
                  <h1 style="color: #1c1917; font-size: 24px;">ملخصك الأسبوعي</h1>
                  <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 18px; color: #059669; font-weight: bold;">لقد سجّلت ${weeklyCount} حقنة هذا الأسبوع</p>
                    ${streakDays > 1 ? `<p style="font-size: 16px; color: #44403c; margin-top: 8px;">سلسلتك: ${streakDays} أيام 🔥</p>` : ''}
                  </div>
                  <p>استمر في التتبّع — الانتظام هو المفتاح.</p>
                  <a href="${APP_URL}/tracker" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                    سجّل حقنتك التالية
                  </a>
                  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 30px 0;" />
                  <p style="color: #a8a29e; font-size: 12px;">
                    pptides.com — محتوى تعليمي بحثي. استشر طبيبك قبل استخدام أي ببتيد.
                  </p>
                </div>
              `,
            }),
          })
        } catch (e) {
          console.error('trial-reminder: weekly summary error for user', sub.user_id, e)
        }
      }
    }

    // Server-side trial expiration cleanup
    const { data: expiredTrials } = await supabase
      .from('subscriptions')
      .select('id, user_id, trial_ends_at')
      .eq('status', 'trial')
      .lt('trial_ends_at', new Date().toISOString())

    if (expiredTrials && expiredTrials.length > 0) {
      for (const t of expiredTrials) {
        const { data: sub } = await supabase.from('subscriptions').select('stripe_subscription_id').eq('id', t.id).maybeSingle()
        if (!sub?.stripe_subscription_id) {
          await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', t.id)
        }
      }
    }

    // Cleanup: delete rate limit entries older than 1 hour
    await supabase.from('rate_limits').delete().lt('created_at', new Date(Date.now() - 3600000).toISOString()).catch(() => {})

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
