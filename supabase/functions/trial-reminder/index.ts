import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRIAL_DAYS = 3 // Keep in sync with src/config/trial.ts
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
// SOURCE OF TRUTH: 34 SAR = 1 month Essentials; override via ESSENTIALS_PRICE_DISPLAY env
const ESSENTIALS_PRICE = Deno.env.get('ESSENTIALS_PRICE_DISPLAY') ?? '34 ر.س'
// SOURCE OF TRUTH: match src/lib/constants.ts (peptides.length); override via PEPTIDE_COUNT env
const PEPTIDE_COUNT = parseInt(Deno.env.get('PEPTIDE_COUNT') ?? '48', 10)

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

import { getCorsHeaders } from '../_shared/cors.ts'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'
import { sendEmail } from '../_shared/send-email.ts'

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

    // Batch-fetch all auth users to avoid N+1 getUserById calls
    const userIdToEmail = new Map<string, string>()
    let page = 1
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !users || users.length === 0) break
      for (const u of users) {
        if (u.email) userIdToEmail.set(u.id, u.email)
      }
      if (users.length < 1000) break
      page++
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

        const email = userIdToEmail.get(sub.user_id)
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

        if (daysSinceSignup >= 1 && daysSinceSignup <= 2) {
          // Day 1-2 reminders now handled by dedicated trial-day1 and trial-day2 functions
          skipped++
          continue
        } else if (daysUntilExpiry === 1 || daysUntilExpiry === 0) {
          reminderType = 'last_day'
          subject = 'تجربتك تنتهي اليوم! — pptides'
          body = `
            <h1 style="color: #1c1917; font-size: 24px;">⏰ تجربتك المجانية تنتهي اليوم!</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              شكرًا لتجربتك pptides. إليك ملخص ما استكشفته:
            </p>
            <div style="background: #f5f5f4; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0; font-size: 15px;">📚 مكتبة ${PEPTIDE_COUNT}+ ببتيد بالبروتوكولات الكاملة</p>
              <p style="margin: 8px 0; font-size: 15px;">🤖 المدرب الذكي — بروتوكولات مخصّصة لحالتك</p>
              <p style="margin: 8px 0; font-size: 15px;">🧮 حاسبة الجرعات الدقيقة</p>
              <p style="margin: 8px 0; font-size: 15px;">📊 تتبّع الحقن والبروتوكولات</p>
              <p style="margin: 8px 0; font-size: 15px;">🔬 دليل التحاليل المخبرية</p>
            </div>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
              <p style="font-size: 14px; color: #44403c; margin: 0;">كل هذا مقابل:</p>
              <p style="font-size: 36px; font-weight: 900; color: #059669; margin: 8px 0;">${ESSENTIALS_PRICE}<span style="font-size: 16px; font-weight: normal;">/شهر</span></p>
              <p style="font-size: 14px; color: #78716c; margin: 4px 0;">أقل من قهوة واحدة في اليوم ☕</p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              ${emailButton('اشترك الآن — احتفظ بوصولك', `${APP_URL}/pricing`)}
            </div>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 15px; color: #92400e; font-weight: bold;">🛡️ ضمان استرداد كامل</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">إذا لم تعجبك الخدمة — استرد أموالك بالكامل. بدون أسئلة.</p>
            </div>
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

        const emailResult = await sendEmail({
          to: email,
          subject,
          html: emailWrapper(body),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
          // Send push notification alongside email for key reminders
          if (['last_day', 'expired'].includes(reminderType)) {
            const pushTitle = reminderType === 'last_day'
              ? 'آخر يوم في تجربتك المجانية'
              : 'انتهت تجربتك — اشترك الآن'
            const pushMsg = reminderType === 'last_day'
              ? `غدًا ستفقد الوصول — اشترك بـ ${ESSENTIALS_PRICE}/شهر`
              : `اشترك الآن بـ ${ESSENTIALS_PRICE}/شهر واحتفظ بالوصول الكامل`
            fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-cron-secret': expectedSecret },
              body: JSON.stringify({ user_ids: [sub.user_id], title: pushTitle, body: pushMsg, url: `${APP_URL}/pricing` }),
            }).catch(e => console.error('trial-reminder: push failed for', sub.user_id, e))
          }
        } else {
          console.error(`trial-reminder: failed to send to ${email}:`, emailResult.error)
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
    // getISOWeekKey returns e.g. "2026-W10" — ensures each user gets at most one per calendar week
    const getISOWeekKey = (d: Date) => {
      const x = new Date(d)
      x.setHours(0, 0, 0, 0)
      x.setDate(x.getDate() + 4 - (x.getDay() || 7))
      const yearStart = new Date(x.getFullYear(), 0, 1)
      const weekNo = Math.ceil((((x.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return `${x.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
    }
    try {
    const { data: activeSubscribers } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trial'])

    if (activeSubscribers && activeSubscribers.length > 0) {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Safety cap: each user needs ~4 DB queries + 1 email send. At 50ms/query that's ~200ms/user.
      // Cap at 50 to stay well under Supabase's 150s edge function timeout.
      const WEEKLY_SUMMARY_LIMIT = 50
      let weeklySummaryProcessed = 0

      for (const sub of activeSubscribers) {
        if (weeklySummaryProcessed >= WEEKLY_SUMMARY_LIMIT) break
        weeklySummaryProcessed++
        try {
          const email = userIdToEmail.get(sub.user_id)
          if (!email) continue

          const { count: weeklyCount } = await supabase
            .from('injection_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sub.user_id)
            .gte('logged_at', weekAgo)

          if (!weeklyCount || weeklyCount === 0) continue

          const { data: wellnessData } = await supabase
            .from('wellness_logs')
            .select('energy, sleep, mood')
            .eq('user_id', sub.user_id)
            .gte('logged_at', weekAgo)

          const wellnessAvg = wellnessData && wellnessData.length > 0
            ? Math.round(wellnessData.reduce((s, w) => s + (w.energy + w.sleep + w.mood) / 3, 0) / wellnessData.length * 10) / 10
            : 0

          const { data: activeProtocols } = await supabase
            .from('user_protocols')
            .select('peptide_id, cycle_weeks, started_at')
            .eq('user_id', sub.user_id)
            .eq('status', 'active')

          const protocolSummary = activeProtocols && activeProtocols.length > 0
            ? activeProtocols.map(p => {
                const daysIn = Math.floor((now.getTime() - new Date(p.started_at).getTime()) / 86400000)
                const totalDays = p.cycle_weeks * 7
                const pct = Math.min(100, Math.round((daysIn / totalDays) * 100))
                return `${p.peptide_id}: ${pct}% (يوم ${daysIn}/${totalDays})`
              }).join(' | ')
            : ''

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
            .insert({ user_id: sub.user_id, reminder_type: `weekly_summary_${getISOWeekKey(now)}` })
          if (dedupErr) continue

          await sendEmail({
            to: email,
            subject: `ملخصك الأسبوعي — ${weeklyCount} حقنة — pptides`,
            html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">ملخصك الأسبوعي</h1>
                  <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="text-align: center; padding: 8px;">
                          <p style="font-size: 28px; font-weight: 900; color: #059669; margin: 0;">${weeklyCount}</p>
                          <p style="font-size: 12px; color: #44403c; margin: 4px 0 0;">حقنة</p>
                        </td>
                        <td style="text-align: center; padding: 8px;">
                          <p style="font-size: 28px; font-weight: 900; color: #059669; margin: 0;">${streakDays}</p>
                          <p style="font-size: 12px; color: #44403c; margin: 4px 0 0;">يوم متتالي</p>
                        </td>
                        ${wellnessAvg > 0 ? `<td style="text-align: center; padding: 8px;">
                          <p style="font-size: 28px; font-weight: 900; color: #059669; margin: 0;">${wellnessAvg}</p>
                          <p style="font-size: 12px; color: #44403c; margin: 4px 0 0;">معدل العافية</p>
                        </td>` : ''}
                      </tr>
                    </table>
                  </div>
                  ${protocolSummary ? `<div style="background: #f5f5f4; border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="font-size: 13px; font-weight: bold; color: #44403c; margin: 0 0 4px;">بروتوكولاتك النشطة:</p>
                    <p style="font-size: 12px; color: #78716c; margin: 0;" dir="ltr">${protocolSummary}</p>
                  </div>` : ''}
                  <p>استمر في التتبّع — الانتظام هو المفتاح.</p>
                  <div style="text-align: center; margin-top: 16px;">
                    ${emailButton('سجّل حقنتك التالية', `${APP_URL}/tracker`)}
                  </div>
              `),
            replyTo: 'contact@pptides.com',
          })
        } catch (e) {
          console.error('trial-reminder: weekly summary error for user', sub.user_id, e)
        }
      }
    }
    } catch (weeklySummaryErr) {
      console.error('trial-reminder: weekly summary section failed:', weeklySummaryErr)
    }

    // PRO8: Proactive coach check-in — active subscribers who haven't logged injection in 3+ days
    try {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const inactiveCheckinWeekKey = `inactive_checkin_${getISOWeekKey(now)}`
    const { data: activeSubsForCheckin } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
    let inactiveCheckinSent = 0
    const INACTIVE_CHECKIN_LIMIT = 20
    // Safety: each iteration does 1 injection_logs query + possible dedup + email send.
    // Cap total iterations to 200 to prevent timeout when scanning large subscriber lists.
    const INACTIVE_CHECKIN_SCAN_LIMIT = 200
    let inactiveCheckinScanned = 0
    if (activeSubsForCheckin && activeSubsForCheckin.length > 0) {
      for (const sub of activeSubsForCheckin) {
        if (inactiveCheckinSent >= INACTIVE_CHECKIN_LIMIT) break
        if (inactiveCheckinScanned >= INACTIVE_CHECKIN_SCAN_LIMIT) break
        inactiveCheckinScanned++
        try {
          const email = userIdToEmail.get(sub.user_id)
          if (!email) continue
          const { data: latestLog } = await supabase
            .from('injection_logs')
            .select('logged_at')
            .eq('user_id', sub.user_id)
            .order('logged_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (!latestLog || !latestLog.logged_at) continue
          const lastLogged = new Date(latestLog.logged_at)
          if (lastLogged >= new Date(threeDaysAgo)) continue
          const { error: dedupErr } = await supabase
            .from('sent_reminders')
            .insert({ user_id: sub.user_id, reminder_type: inactiveCheckinWeekKey })
          if (dedupErr) {
            if (dedupErr.code === '23505') continue
            console.error('trial-reminder: inactive_checkin dedup failed:', dedupErr)
            continue
          }
          const emailResult = await sendEmail({
            to: email,
            subject: 'هل كل شيء على ما يرام؟ — pptides',
            html: emailWrapper(`
                  <h1 style="color: #1c1917; font-size: 24px;">مرحبًا — لاحظنا أنك لم تسجّل حقنة منذ 3 أيام</h1>
                  <p style="color: #44403c; font-size: 16px;">هل كل شيء على ما يرام مع بروتوكولك؟</p>
                  <div style="text-align: center; margin-top: 16px;">
                    ${emailButton('تحدث مع المدرب الذكي', `${APP_URL}/coach`)}
                  </div>
              `),
            replyTo: 'contact@pptides.com',
          })
          if (emailResult.ok) {
            inactiveCheckinSent++
          } else {
            console.error('trial-reminder: inactive_checkin email failed:', emailResult.error)
            await supabase.from('sent_reminders').delete()
              .eq('user_id', sub.user_id)
              .eq('reminder_type', inactiveCheckinWeekKey)
              .catch(() => {})
          }
        } catch (e) {
          console.error('trial-reminder: inactive_checkin error for user', sub.user_id, e)
        }
      }
    }
    } catch (checkinErr) {
      console.error('trial-reminder: inactive checkin section failed:', checkinErr)
    }

    // Server-side trial expiration cleanup
    try {
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

    // Auto-expire granted (non-Stripe) subscriptions past their period end
    const { data: grantedExpired } = await supabase
      .from('subscriptions')
      .select('id, user_id, grant_source')
      .in('status', ['active', 'trial'])
      .not('grant_source', 'is', null)
      .is('stripe_subscription_id', null)
      .lt('current_period_end', new Date().toISOString())
    if (grantedExpired && grantedExpired.length > 0) {
      for (const gs of grantedExpired) {
        await supabase.from('subscriptions').update({
          status: 'expired', updated_at: new Date().toISOString(),
        }).eq('id', gs.id)
        console.log(`auto-expired granted subscription for user ${gs.user_id} (grant: ${gs.grant_source})`)
      }
    }

    } catch (expirationErr) {
      console.error('trial-reminder: expiration cleanup section failed:', expirationErr)
    }

    // Cleanup: delete rate limit entries older than 1 hour
    try {
      await supabase.from('rate_limits').delete().lt('created_at', new Date(Date.now() - 3600000).toISOString())
    } catch (cleanupErr) {
      console.error('trial-reminder: rate_limits cleanup failed:', cleanupErr)
    }

    // Smart dunning emails for past_due subscribers (day 3, day 7 escalation)
    try {
    const { data: pastDueUsers } = await supabase
      .from('subscriptions')
      .select('user_id, stripe_customer_id, updated_at')
      .eq('status', 'past_due')
    if (pastDueUsers && pastDueUsers.length > 0) {
      for (const pd of pastDueUsers) {
        try {
          const email = userIdToEmail.get(pd.user_id)
          if (!email) continue
          const pastDueSince = pd.updated_at ? new Date(pd.updated_at) : new Date()
          const daysPastDue = Math.floor((now.getTime() - pastDueSince.getTime()) / 86400000)

          let dunningType = ''
          let dunningSubject = ''
          let dunningBody = ''

          if (daysPastDue >= 2 && daysPastDue <= 4) {
            dunningType = 'dunning_day3'
            dunningSubject = 'تذكير: حدّث بيانات الدفع لتجنّب فقدان الوصول — pptides'
            dunningBody = `
              <h1 style="color: #1c1917; font-size: 24px;">دفعتك لم تتم — حدّث بيانات الدفع</h1>
              <p style="color: #44403c; font-size: 16px;">لا نريدك أن تفقد وصولك للمكتبة والمدرب الذكي. حدّث بيانات الدفع الآن.</p>
              <div style="text-align: center; margin: 24px 0;">
                ${emailButton('تحديث بيانات الدفع', `${APP_URL}/account`)}
              </div>
            `
          } else if (daysPastDue >= 6 && daysPastDue <= 8) {
            dunningType = 'dunning_day7'
            dunningSubject = 'آخر تذكير: اشتراكك سيُلغى قريبًا — pptides'
            dunningBody = `
              <h1 style="color: #1c1917; font-size: 24px;">آخر فرصة — اشتراكك سيُلغى</h1>
              <p style="color: #44403c; font-size: 16px;">لم تتم معالجة دفعتك منذ ${daysPastDue} أيام. إذا لم تُحدَّث بيانات الدفع، سيتم إلغاء اشتراكك تلقائيًا.</p>
              <div style="text-align: center; margin: 24px 0;">
                ${emailButton('حدّث الآن — لا تفقد وصولك', `${APP_URL}/account`)}
              </div>
              <p style="color: #78716c; font-size: 13px;">إذا كنت بحاجة للمساعدة: contact@pptides.com</p>
            `
          }

          if (dunningType) {
            const { error: dedupErr } = await supabase
              .from('sent_reminders')
              .insert({ user_id: pd.user_id, reminder_type: dunningType })
            if (dedupErr) continue

            const emailResult = await sendEmail({
              to: email,
              subject: dunningSubject,
              html: emailWrapper(dunningBody),
              replyTo: 'contact@pptides.com',
            })
            if (!emailResult.ok) {
              await supabase.from('sent_reminders').delete()
                .eq('user_id', pd.user_id).eq('reminder_type', dunningType).catch(() => {})
            }
          }
        } catch (e) {
          console.error('dunning email error for user', pd.user_id, e)
        }
      }
    }
    } catch (dunningErr) {
      console.error('trial-reminder: dunning section failed:', dunningErr)
    }

    // RT2: Re-engagement emails for churned/expired users (30-day and 60-day win-back)
    try {
    const { data: churnedUsers } = await supabase
      .from('subscriptions')
      .select('user_id, status, updated_at')
      .in('status', ['expired', 'cancelled'])
    if (churnedUsers && churnedUsers.length > 0) {
      for (const cu of churnedUsers) {
        try {
          const email = userIdToEmail.get(cu.user_id)
          if (!email) continue
          const churned = cu.updated_at ? new Date(cu.updated_at) : new Date()
          const daysSinceChurn = Math.floor((now.getTime() - churned.getTime()) / 86400000)
          let winbackType = ''
          let winbackSubject = ''
          let winbackBody = ''
          if (daysSinceChurn >= 28 && daysSinceChurn <= 32) {
            winbackType = 'winback_30d'
            winbackSubject = 'نشتاق لك — عد واستكمل رحلتك — pptides'
            winbackBody = `
              <h1 style="color: #1c1917; font-size: 24px;">مرّ شهر — ما زلنا هنا</h1>
              <p style="color: #44403c; font-size: 16px;">بروتوكولاتك والمدرب الذكي جاهزون لك. اشترك الآن واستكمل من حيث توقفت.</p>
              <div style="text-align: center; margin: 24px 0;">
                ${emailButton('عد إلى pptides', `${APP_URL}/pricing`)}
              </div>
            `
          } else if (daysSinceChurn >= 58 && daysSinceChurn <= 62) {
            winbackType = 'winback_60d'
            winbackSubject = 'آخر تذكير — محتوى جديد في pptides'
            winbackBody = `
              <h1 style="color: #1c1917; font-size: 24px;">أضفنا محتوى جديد</h1>
              <p style="color: #44403c; font-size: 16px;">${PEPTIDE_COUNT} بروتوكول محدّث، حاسبة جرعات، مدرب ذكي — كل شيء جاهز لك بـ ${ESSENTIALS_PRICE}/شهر فقط.</p>
              <div style="text-align: center; margin: 24px 0;">
                ${emailButton('اشترك الآن', `${APP_URL}/pricing`)}
              </div>
            `
          }
          if (winbackType) {
            const { error: dedupErr } = await supabase.from('sent_reminders').insert({ user_id: cu.user_id, reminder_type: winbackType })
            if (dedupErr) continue
            await sendEmail({
              to: email,
              subject: winbackSubject,
              html: emailWrapper(winbackBody),
              replyTo: 'contact@pptides.com',
            }).catch(() => {})
          }
        } catch (e) { console.error('winback email error:', e) }
      }
    }
    } catch (winbackErr) {
      console.error('trial-reminder: winback section failed:', winbackErr)
    }

    // Admin proactive alert (rate-limited: once per 24h)
    try {
    const adminWhitelist = Deno.env.get('ADMIN_EMAIL_WHITELIST')
    const adminTo = adminWhitelist?.trim()
      ? adminWhitelist.split(',').map((e) => e.trim()).filter(Boolean)[0]
      : 'contact@pptides.com'
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentAlertCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'admin_daily_alert')
      .gte('created_at', twentyFourHoursAgo)
    if (!recentAlertCount || recentAlertCount === 0) {
      const { count: pastDueCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'past_due')
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      const { data: trialsExpiringSoon } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('status', 'trial')
        .gte('trial_ends_at', now.toISOString())
        .lte('trial_ends_at', in24h)
      const { count: pendingEnquiriesCount } = await supabase
        .from('enquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      const x = pastDueCount ?? 0
      const y = trialsExpiringSoon?.length ?? 0
      const z = pendingEnquiriesCount ?? 0
      if (x > 0 || y > 0 || z > 0) {
        const bodyLines: string[] = []
        if (x > 0) bodyLines.push(`• ${x} اشتراكات متأخرة (past_due)`)
        if (y > 0) bodyLines.push(`• ${y} تجارب تنتهي خلال 24 ساعة`)
        if (z > 0) bodyLines.push(`• ${z} استفسارات غير مقروءة (pending)`)
        const alertBody = bodyLines.join('\n')
        const emailResult = await sendEmail({
          to: adminTo,
          subject: 'pptides تنبيه إداري',
          html: emailWrapper(`
                <h1 style="color: #1c1917; font-size: 24px;">تنبيه إداري</h1>
                <p>البنود التالية تتطلب اهتمامك:</p>
                <pre style="background: #f5f5f4; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${alertBody}</pre>
            `),
        })
        if (emailResult.ok) {
          await supabase.from('email_logs').insert({ email: adminTo, type: 'admin_daily_alert', status: 'sent' }).catch(() => {})
        }
      }
    }
    } catch (adminAlertErr) {
      console.error('trial-reminder: admin alert section failed:', adminAlertErr)
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('trial-reminder unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
