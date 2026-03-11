import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * Coach Notifications v2 — Proactive insights delivered as in-app + push notifications.
 * 
 * Intended to run as a daily cron (or triggered manually).
 * Checks all active users and generates coach-type notifications for:
 * 1. Dose reminders — active protocol but no log today
 * 2. Cycle ending within 7 days
 * 3. Side effects logged recently without follow-up
 * 4. Weekly insight — adherence rate + wellness average
 * 5. Lab test reminders — after 4 weeks on protocol with no lab results
 * 6. Wellness decline alerts — sleep/energy dropping
 * 
 * Also triggers push notifications for users with push_subscription enabled.
 * 
 * Deduplication: won't create a notification if the same type was sent
 * to the same user in the last 24 hours (or 7 days for weekly insight).
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify cron secret or admin auth
  const authHeader = req.headers.get('authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const token = authHeader?.replace('Bearer ', '')
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
  }

  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

    // Get all active protocol users
    const { data: activeProtocols, error: protoErr } = await supabase
      .from('user_protocols')
      .select('user_id, peptide_id, cycle_weeks, started_at, status, dose, dose_unit, frequency')
      .eq('status', 'active')

    if (protoErr) {
      console.error('coach-notifications: failed to fetch protocols:', protoErr.message)
      return new Response(JSON.stringify({ error: 'DB error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const notifications: Array<{
      user_id: string
      type: string
      title_ar: string
      body_ar: string
    }> = []

    const pushTargets: Array<{
      user_id: string
      title: string
      body: string
      url: string
    }> = []

    // Dedup: get recent coach notifications
    const userIds = [...new Set((activeProtocols ?? []).map(p => p.user_id))]

    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('user_id, title_ar, created_at')
      .eq('type', 'coach')
      .gte('created_at', sevenDaysAgo)
      .in('user_id', userIds.length > 0 ? userIds : ['__none__'])

    const recentSet24h = new Set(
      (recentNotifs ?? [])
        .filter(n => new Date(n.created_at) >= new Date(twentyFourHoursAgo))
        .map(n => `${n.user_id}:${n.title_ar}`)
    )
    const recentSet7d = new Set(
      (recentNotifs ?? []).map(n => `${n.user_id}:${n.title_ar}`)
    )

    function addNotification(userId: string, title: string, body: string, url: string, dedup: 'daily' | 'weekly' = 'daily') {
      const key = `${userId}:${title}`
      const set = dedup === 'weekly' ? recentSet7d : recentSet24h
      if (set.has(key)) return
      notifications.push({ user_id: userId, type: 'coach', title_ar: title, body_ar: body })
      pushTargets.push({ user_id: userId, title, body, url })
      set.add(key)
    }

    // Per-user processing
    const userProtocols: Record<string, typeof activeProtocols> = {}
    for (const p of (activeProtocols ?? [])) {
      if (!userProtocols[p.user_id]) userProtocols[p.user_id] = []
      userProtocols[p.user_id].push(p)
    }

    for (const [userId, protocols] of Object.entries(userProtocols)) {
      // --- Check 1: Dose reminder — active protocol, no log today ---
      const { data: todayLogs } = await supabase
        .from('injection_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('logged_at', `${today}T00:00:00`)
        .limit(1)

      if (!todayLogs || todayLogs.length === 0) {
        const peptideNames = protocols.map(p => p.peptide_id).join(' و ')
        addNotification(
          userId,
          'وقت جرعتك اليوم 💉',
          `لم تسجّل حقنة ${peptideNames} اليوم — سجّل جرعتك للحفاظ على سلسلة التزامك.`,
          'https://pptides.com/tracker',
        )
      }

      // --- Check 2: No injection log in 3+ days (more urgent) ---
      const { data: recentLogs } = await supabase
        .from('injection_logs')
        .select('logged_at')
        .eq('user_id', userId)
        .gte('logged_at', threeDaysAgo)
        .limit(1)

      if (!recentLogs || recentLogs.length === 0) {
        addNotification(
          userId,
          'تذكير من مدربك الذكي',
          `لم تسجّل حقنة منذ 3 أيام — الالتزام بالبروتوكول مهم للحصول على أفضل النتائج. عُد اليوم!`,
          'https://pptides.com/tracker',
        )
      }

      // --- Check 3: Cycle ending within 7 days ---
      for (const proto of protocols) {
        if (proto.started_at && proto.cycle_weeks) {
          const startDate = new Date(proto.started_at)
          const endDate = new Date(startDate.getTime() + proto.cycle_weeks * 7 * 24 * 60 * 60 * 1000)
          const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          if (daysRemaining > 0 && daysRemaining <= 7) {
            addNotification(
              userId,
              `دورة ${proto.peptide_id} توشك على الانتهاء`,
              `باقي ${daysRemaining} أيام على نهاية دورتك. اسأل المدرب الذكي عن الخطوة التالية — هل تحتاج فترة راحة أو دورة جديدة؟`,
              'https://pptides.com/coach',
            )
          }
        }
      }

      // --- Check 4: Lab test reminder (4+ weeks on protocol, no lab results) ---
      for (const proto of protocols) {
        if (proto.started_at) {
          const weeksIn = Math.floor(daysSince(proto.started_at) / 7)
          if (weeksIn >= 4) {
            const { data: labs } = await supabase
              .from('lab_results')
              .select('id')
              .eq('user_id', userId)
              .limit(1)

            if (!labs || labs.length === 0) {
              addNotification(
                userId,
                `حان وقت التحاليل 🔬`,
                `أنت في الأسبوع ${weeksIn} من ${proto.peptide_id}. التحاليل تساعدك في قياس التقدم ومعرفة هل البروتوكول يعمل. راجع دليل التحاليل.`,
                'https://pptides.com/lab-guide',
                'weekly',
              )
            }
          }
        }
      }

      // --- Check 5: Weekly insight (Sunday only) ---
      if (now.getDay() === 0) {
        // Get this week's logs count
        const { count: weekLogs } = await supabase
          .from('injection_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('logged_at', sevenDaysAgo)

        // Get this week's wellness average
        const { data: weekWellness } = await supabase
          .from('wellness_logs')
          .select('energy, sleep, mood')
          .eq('user_id', userId)
          .gte('logged_at', sevenDaysAgo)

        const logCount = weekLogs ?? 0
        const totalProtocolDoses = protocols.reduce((sum, p) => {
          const freq = p.frequency === 'bid' ? 14 : p.frequency === 'tid' ? 21 : p.frequency === 'weekly' ? 1 : p.frequency === 'biweekly' ? 0.5 : 7
          return sum + freq
        }, 0)
        const adherenceRate = totalProtocolDoses > 0 ? Math.min(Math.round((logCount / totalProtocolDoses) * 7), 7) : logCount

        let insightBody = `أداؤك هذا الأسبوع: ${adherenceRate}/7 جرعات مسجّلة`

        if (weekWellness && weekWellness.length > 0) {
          const avgEnergy = weekWellness.reduce((s, w) => s + (w.energy ?? 3), 0) / weekWellness.length
          insightBody += `، معدل الطاقة ${avgEnergy.toFixed(1)}/5`
        }

        if (adherenceRate >= 6) {
          insightBody += '. أداء ممتاز — استمر! 🎯'
        } else if (adherenceRate >= 4) {
          insightBody += '. جيد، لكن ممكن تتحسن أكثر — الالتزام مفتاح النتائج.'
        } else {
          insightBody += '. حاول تلتزم أكثر الأسبوع القادم — النتائج تحتاج انتظام.'
        }

        addNotification(
          userId,
          'ملخص أسبوعك 📊',
          insightBody,
          'https://pptides.com/dashboard',
          'weekly',
        )
      }
    }

    // --- Check 6: Recent side effects without follow-up ---
    const { data: recentSideEffects } = await supabase
      .from('side_effect_logs')
      .select('user_id, symptom, peptide_id, created_at')
      .gte('created_at', twentyFourHoursAgo)

    for (const se of (recentSideEffects ?? [])) {
      addNotification(
        se.user_id,
        'المدرب الذكي لاحظ عرضًا جانبيًا',
        `سجّلت "${se.symptom}"${se.peptide_id ? ` مع ${se.peptide_id}` : ''} — تحدّث مع المدرب الذكي للحصول على نصيحة مخصصة لحالتك.`,
        'https://pptides.com/coach',
      )
    }

    // --- Check 7: Wellness decline alerts ---
    for (const userId of userIds) {
      const { data: wellLogs } = await supabase
        .from('wellness_logs')
        .select('energy, sleep, pain, mood, logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(10)

      if (wellLogs && wellLogs.length >= 4) {
        const recent = wellLogs.slice(0, 3)
        const older = wellLogs.slice(3, 7)
        if (older.length > 0) {
          const avgRecentSleep = recent.reduce((s, w) => s + (w.sleep ?? 3), 0) / recent.length
          const avgOlderSleep = older.reduce((s, w) => s + (w.sleep ?? 3), 0) / older.length
          const sleepChange = Math.round(((avgRecentSleep - avgOlderSleep) / Math.max(avgOlderSleep, 0.1)) * 100)

          if (sleepChange < -15) {
            addNotification(
              userId,
              'نومك انخفض مؤخرًا 😴',
              `معدل نومك انخفض ${Math.abs(sleepChange)}% — المدرب الذكي عنده نصائح مخصصة لتحسين نومك.`,
              'https://pptides.com/coach',
            )
          }

          const avgRecentEnergy = recent.reduce((s, w) => s + (w.energy ?? 3), 0) / recent.length
          const avgOlderEnergy = older.reduce((s, w) => s + (w.energy ?? 3), 0) / older.length
          const energyChange = Math.round(((avgRecentEnergy - avgOlderEnergy) / Math.max(avgOlderEnergy, 0.1)) * 100)

          if (energyChange < -15 && sleepChange >= -15) {
            addNotification(
              userId,
              'مستوى طاقتك انخفض ⚡',
              `طاقتك انخفضت ${Math.abs(energyChange)}% — خلّنا نراجع بروتوكولك مع المدرب الذكي.`,
              'https://pptides.com/coach',
            )
          }
        }
      }
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert(notifications)

      if (insertErr) {
        console.error('coach-notifications: insert failed:', insertErr.message)
      }
    }

    // Send push notifications to users with push_subscription enabled
    if (pushTargets.length > 0) {
      const uniquePushUserIds = [...new Set(pushTargets.map(p => p.user_id))]

      // Get users with push subscription
      const { data: pushUsers } = await supabase
        .from('user_profiles')
        .select('user_id, push_subscription')
        .in('user_id', uniquePushUserIds)
        .not('push_subscription', 'is', null)

      const pushEnabledIds = new Set((pushUsers ?? []).map(u => u.user_id))

      // Group push targets by user (send only highest priority per user to avoid spam)
      const userPushMap: Record<string, typeof pushTargets[0]> = {}
      for (const target of pushTargets) {
        if (pushEnabledIds.has(target.user_id) && !userPushMap[target.user_id]) {
          userPushMap[target.user_id] = target
        }
      }

      // Call send-push for each user (via internal function call)
      const pushResults = { sent: 0, failed: 0 }
      for (const [uid, target] of Object.entries(userPushMap)) {
        try {
          const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: uid,
              title: target.title,
              body: target.body,
              url: target.url,
            }),
          })
          if (pushRes.ok) pushResults.sent++
          else pushResults.failed++
        } catch {
          pushResults.failed++
        }
      }

      console.log(`coach-notifications: push results — sent=${pushResults.sent}, failed=${pushResults.failed}`)
    }

    console.log(`coach-notifications: generated ${notifications.length} notifications for ${userIds.length} users, ${pushTargets.length} push targets`)

    return new Response(JSON.stringify({
      success: true,
      generated: notifications.length,
      users_checked: userIds.length,
      push_targets: pushTargets.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('coach-notifications unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
