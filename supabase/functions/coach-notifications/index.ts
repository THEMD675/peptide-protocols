import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * Coach Notifications — Proactive insights delivered as notifications.
 * 
 * Intended to run as a daily cron (or triggered manually).
 * Checks all active users and generates coach-type notifications for:
 * 1. No injection log in 3+ days (protocol reminder)
 * 2. Cycle ending within 7 days
 * 3. Side effects logged recently without follow-up
 * 
 * Deduplication: won't create a notification if the same type was sent
 * to the same user in the last 24 hours.
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

  // Optional: verify cron secret or admin auth
  const authHeader = req.headers.get('authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow service role calls
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
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

    // Get all active protocol users
    const { data: activeProtocols, error: protoErr } = await supabase
      .from('user_protocols')
      .select('user_id, peptide_id, cycle_weeks, started_at, status')
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

    // Dedup: get recent coach notifications
    const userIds = [...new Set((activeProtocols ?? []).map(p => p.user_id))]

    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('user_id, title_ar, created_at')
      .eq('type', 'coach')
      .gte('created_at', twentyFourHoursAgo)
      .in('user_id', userIds.length > 0 ? userIds : ['__none__'])

    const recentSet = new Set(
      (recentNotifs ?? []).map(n => `${n.user_id}:${n.title_ar}`)
    )

    for (const proto of (activeProtocols ?? [])) {
      const userId = proto.user_id
      const peptide = proto.peptide_id

      // --- Check 1: No injection log in 3+ days ---
      const { data: recentLogs } = await supabase
        .from('injection_logs')
        .select('logged_at')
        .eq('user_id', userId)
        .gte('logged_at', threeDaysAgo)
        .limit(1)

      if (!recentLogs || recentLogs.length === 0) {
        const title = 'تذكير من مدربك الذكي 💉'
        const body = `لم تسجّل حقنة ${peptide} منذ 3 أيام — الالتزام بالبروتوكول مهم للحصول على أفضل النتائج. سجّل حقنتك اليوم!`
        const key = `${userId}:${title}`
        if (!recentSet.has(key)) {
          notifications.push({ user_id: userId, type: 'coach', title_ar: title, body_ar: body })
          recentSet.add(key)
        }
      }

      // --- Check 2: Cycle ending within 7 days ---
      if (proto.started_at && proto.cycle_weeks) {
        const startDate = new Date(proto.started_at)
        const endDate = new Date(startDate.getTime() + proto.cycle_weeks * 7 * 24 * 60 * 60 * 1000)
        const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysRemaining > 0 && daysRemaining <= 7) {
          const title = `دورة ${peptide} توشك على الانتهاء 🎯`
          const body = `باقي ${daysRemaining} أيام على نهاية دورتك. اسأل المدرب الذكي عن الخطوة التالية — هل تحتاج فترة راحة أو دورة جديدة؟`
          const key = `${userId}:${title}`
          if (!recentSet.has(key)) {
            notifications.push({ user_id: userId, type: 'coach', title_ar: title, body_ar: body })
            recentSet.add(key)
          }
        }
      }
    }

    // --- Check 3: Recent side effects without coach conversation ---
    const { data: recentSideEffects } = await supabase
      .from('side_effect_logs')
      .select('user_id, symptom, peptide_id, created_at')
      .gte('created_at', twentyFourHoursAgo)

    for (const se of (recentSideEffects ?? [])) {
      const title = 'المدرب الذكي لاحظ عرضًا جانبيًا 🔬'
      const body = `سجّلت "${se.symptom}"${se.peptide_id ? ` مع ${se.peptide_id}` : ''} — تحدّث مع المدرب الذكي للحصول على نصيحة مخصصة لحالتك.`
      const key = `${se.user_id}:${title}`
      if (!recentSet.has(key)) {
        notifications.push({ user_id: se.user_id, type: 'coach', title_ar: title, body_ar: body })
        recentSet.add(key)
      }
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert(notifications)

      if (insertErr) {
        console.error('coach-notifications: insert failed:', insertErr.message)
        return new Response(JSON.stringify({ error: 'Failed to insert notifications', detail: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    console.log(`coach-notifications: generated ${notifications.length} notifications for ${userIds.length} users`)

    return new Response(JSON.stringify({
      success: true,
      generated: notifications.length,
      users_checked: userIds.length,
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
