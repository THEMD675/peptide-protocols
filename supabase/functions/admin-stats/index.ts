import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { getServiceClient, supabaseUrl, supabaseServiceKey } from '../_shared/supabase.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500, corsHeaders)
  }

  try {
    const { user, error: authResp } = await requireAdmin(req)
    if (authResp) return authResp

    const admin = getServiceClient()

    // Rate limit: 30 requests per minute per admin
    const allowed = await checkRateLimit(admin, {
      endpoint: 'admin-stats',
      identifier: user!.id,
      windowSeconds: 60,
      maxRequests: 30,
    })
    if (!allowed) {
      return jsonResponse({ error: 'Rate limited — try again shortly' }, 429, corsHeaders)
    }

    type AuthUser = Awaited<ReturnType<typeof admin.auth.admin.listUsers>>['data']['users'][number]
    let paginatedUsers: AuthUser[] = []
    let usersPaginationCapped = false

    const MAX_AUTH_USERS = 5000
    async function getAllAuthUsers(): Promise<AuthUser[]> {
      const collected: AuthUser[] = []
      let page = 1
      while (true) {
        const { data: { users }, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error || !users || users.length === 0) break
        collected.push(...users)
        if (collected.length >= MAX_AUTH_USERS) {
          usersPaginationCapped = true
          console.warn(`admin-stats: user pagination capped at ${collected.length} (limit ${MAX_AUTH_USERS})`)
          break
        }
        if (users.length < 1000) break
        page++
      }
      return collected
    }

    const [
      ,
      subsResult,
      logsResult,
      reviewsResult,
      communityResult,
      coachResult,
      emailListResult,
      enquiriesResult,
      emailLogsResult,
      webhookEventsResult,
    ] = await Promise.all([
      getAllAuthUsers().then(u => { paginatedUsers = u }).catch(e => { console.error('admin-stats: getAllAuthUsers failed:', e); return undefined }),
      admin.from('subscriptions').select('*').order('created_at', { ascending: false }).catch(e => { console.error('admin-stats: subscriptions query failed:', e); return { data: null, error: e } }),
      admin.from('injection_logs').select('id, user_id, peptide_name, logged_at', { count: 'exact', head: false }).order('logged_at', { ascending: false }).limit(100).catch(e => { console.error('admin-stats: injection_logs failed:', e); return { data: null, error: e, count: 0 } }),
      admin.from('reviews').select('*').order('created_at', { ascending: false }).catch(e => { console.error('admin-stats: reviews failed:', e); return { data: null, error: e } }),
      admin.from('community_logs').select('id, peptide_name, goal, rating, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(200).catch(e => { console.error('admin-stats: community failed:', e); return { data: null, error: e, count: 0 } }),
      admin.from('ai_coach_requests').select('id, user_id, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(200).catch(e => { console.error('admin-stats: coach failed:', e); return { data: null, error: e, count: 0 } }),
      admin.from('email_list').select('*').order('created_at', { ascending: false }).catch(e => { console.error('admin-stats: email_list failed:', e); return { data: null, error: e } }),
      admin.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200).catch(e => { console.error('admin-stats: enquiries failed:', e); return { data: null, error: e } }),
      admin.from('email_logs').select('id, email, type, status, created_at').order('created_at', { ascending: false }).limit(200).catch(e => { console.error('admin-stats: email_logs failed:', e); return { data: null, error: e } }),
      admin.from('processed_webhook_events').select('event_id, event_type, processed_at').order('processed_at', { ascending: false }).limit(30).then(r => r).catch(() => ({ data: null, error: null })),
    ])

    const url = new URL(req.url)
    const searchQuery = url.searchParams.get('search')?.trim().toLowerCase() ?? ''
    const filterParam = url.searchParams.get('filter')?.trim().toLowerCase() ?? '' // active | trial | expired | none
    const pageParam = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const perPageParam = Math.min(100, Math.max(10, parseInt(url.searchParams.get('per_page') ?? '50', 10) || 50))

    const allUsers = paginatedUsers
    const userMap = new Map(allUsers.map(u => [u.id, u]))
    const subs = subsResult.data ?? []
    const subsByUserId = new Map(subs.map(s => [s.user_id, s]))
    const logs = logsResult.data ?? []
    const reviews = reviewsResult.data ?? []
    const community = communityResult.data ?? []
    const coachRequests = coachResult.data ?? []
    const emailList = emailListResult.data ?? []
    const enquiriesData = enquiriesResult?.data ?? []
    const emailLogsData = emailLogsResult?.data ?? []
    const webhookEventsData = webhookEventsResult?.data ?? []

    // Only count confirmed users (not bots/unconfirmed/test)
    const users = allUsers.filter(u => !!u.email_confirmed_at)

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 86400000)
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const monthAgo = new Date(now.getTime() - 30 * 86400000)

    // Only count subscriptions with real Stripe IDs as "paid"
    const paidSubs = subs.filter(s => !!s.stripe_subscription_id)
    const activeSubs = paidSubs.filter(s => s.status === 'active')
    const trialSubs = paidSubs.filter(s => s.status === 'trial')
    const expiredSubs = paidSubs.filter(s => s.status === 'expired' || s.status === 'cancelled')
    const pastDueSubs = paidSubs.filter(s => s.status === 'past_due')

    // Also track non-Stripe subscriptions as "test/manual"
    const manualSubs = subs.filter(s => !s.stripe_subscription_id)

    const essentialsSubs = activeSubs.filter(s => s.tier === 'essentials')
    const eliteSubs = activeSubs.filter(s => s.tier === 'elite')

    // MRR from real Stripe subscriptions, using billing_interval column
    // Hardened: handles monthly, annual (/12), cancelled-but-active (still in period),
    // trial (no revenue), admin-granted (no Stripe ID), mid-month cancellations, refunds
    const mrrEssentialsMonthly = parseFloat(Deno.env.get('MRR_ESSENTIALS_SAR') ?? '34')
    const mrrEliteMonthly = parseFloat(Deno.env.get('MRR_ELITE_SAR') ?? '371')
    const mrrEssentialsAnnual = parseFloat(Deno.env.get('MRR_ESSENTIALS_ANNUAL_SAR') ?? '296')
    const mrrEliteAnnual = parseFloat(Deno.env.get('MRR_ELITE_ANNUAL_SAR') ?? '2963')

    // For MRR, include: active subs + cancelled-but-still-in-period subs (they're still paying)
    // Exclude: trial (not paying yet), expired (period ended), admin-granted (no revenue)
    const mrrEligibleSubs = paidSubs.filter(s => {
      // Exclude trial — no revenue yet
      if (s.status === 'trial') return false
      // Exclude expired — period has ended
      if (s.status === 'expired') return false
      // Exclude admin-granted (no Stripe sub = no revenue)
      if (!s.stripe_subscription_id) return false
      // Include active
      if (s.status === 'active') return true
      // Include cancelled IF current_period_end is still in the future (paying through period)
      if (s.status === 'cancelled' && s.current_period_end) {
        return new Date(s.current_period_end).getTime() > now.getTime()
      }
      // Include past_due — still technically active, Stripe will retry
      if (s.status === 'past_due') return true
      return false
    })

    const essentialsMonthly = mrrEligibleSubs.filter(s => s.tier === 'essentials' && s.billing_interval !== 'year')
    const essentialsAnnual = mrrEligibleSubs.filter(s => s.tier === 'essentials' && s.billing_interval === 'year')
    const eliteMonthly = mrrEligibleSubs.filter(s => s.tier === 'elite' && s.billing_interval !== 'year')
    const eliteAnnual = mrrEligibleSubs.filter(s => s.tier === 'elite' && s.billing_interval === 'year')
    const mrr = (essentialsMonthly.length * mrrEssentialsMonthly)
      + (essentialsAnnual.length * (mrrEssentialsAnnual / 12))
      + (eliteMonthly.length * mrrEliteMonthly)
      + (eliteAnnual.length * (mrrEliteAnnual / 12))
    const trialEssentials = trialSubs.filter(s => s.tier === 'essentials')
    const trialElite = trialSubs.filter(s => s.tier === 'elite')

    const signupsToday = users.filter(u => new Date(u.created_at) > dayAgo).length
    const signupsWeek = users.filter(u => new Date(u.created_at) > weekAgo).length
    const signupsMonth = users.filter(u => new Date(u.created_at) > monthAgo).length

    // Server-side paginated user list with search + subscription filter
    let filteredUsers = searchQuery
      ? users.filter(u => u.email?.toLowerCase().includes(searchQuery))
      : users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Apply subscription status filter if provided
    if (filterParam) {
      filteredUsers = filteredUsers.filter(u => {
        const sub = subsByUserId.get(u.id)
        const status = sub?.status ?? 'none'
        if (filterParam === 'active') return status === 'active'
        if (filterParam === 'trial') return status === 'trial'
        if (filterParam === 'expired') return status === 'expired' || status === 'cancelled'
        if (filterParam === 'none') return status === 'none' || !sub
        return true
      })
    }

    const totalFilteredUsers = filteredUsers.length
    const recentUsersSource = filteredUsers.slice((pageParam - 1) * perPageParam, pageParam * perPageParam)

    const recentUsers = recentUsersSource
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        provider: u.app_metadata?.provider ?? 'email',
        confirmed: !!u.email_confirmed_at,
      }))

    const userSubs = recentUsers.map(u => {
      const sub = subsByUserId.get(u.id)
      return {
        ...u,
        subscription: sub ? {
          status: sub.status,
          tier: sub.tier,
          stripe_subscription_id: sub.stripe_subscription_id,
          grant_source: sub.grant_source ?? null,
          trial_ends_at: sub.trial_ends_at,
          current_period_end: sub.current_period_end,
          created_at: sub.created_at,
        } : null,
      }
    })

    const pendingReviews = reviews.filter(r => !r.is_approved)
    const approvedReviews = reviews.filter(r => r.is_approved)

    // --- ALERTS: proactive issues that need attention ---
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    type Alert = { type: string; severity: 'critical' | 'warning' | 'info'; message: string; data?: Record<string, unknown> }
    const alerts: Alert[] = []

    const expiringTrials = trialSubs.filter(s => {
      const ends = s.trial_ends_at ? new Date(s.trial_ends_at) : null
      return ends && ends <= in48h && ends > now
    })
    if (expiringTrials.length > 0) {
      const trialEmails = expiringTrials.map(s => {
        const u = userMap.get(s.user_id)
        return u?.email ?? s.user_id
      })
      alerts.push({ type: 'trial_expiring', severity: 'critical', message: `${expiringTrials.length} تجربة تنتهي خلال 48 ساعة`, data: { emails: trialEmails } })
    }
    if (pastDueSubs.length > 0) {
      alerts.push({ type: 'past_due', severity: 'critical', message: `${pastDueSubs.length} اشتراك متأخر — إيراد معرّض للخطر` })
    }
    const pendingEnquiriesCount = enquiriesData.filter((e: { status: string }) => e.status === 'pending').length
    if (pendingEnquiriesCount > 0) {
      alerts.push({ type: 'pending_enquiries', severity: 'warning', message: `${pendingEnquiriesCount} استفسار بدون رد` })
    }
    if (pendingReviews.length > 0) {
      alerts.push({ type: 'pending_reviews', severity: 'info', message: `${pendingReviews.length} مراجعة بانتظار الموافقة` })
    }
    if (emailLogsData.length === 0 && users.length > 3) {
      alerts.push({ type: 'no_emails', severity: 'warning', message: 'لا توجد سجلات بريد — قد لا تصل الرسائل' })
    }
    if (webhookEventsData.length === 0 && paidSubs.length > 0) {
      alerts.push({ type: 'no_webhooks', severity: 'warning', message: 'لا توجد أحداث Webhook رغم وجود اشتراكات نشطة' })
    }

    // --- ACTIVITY FEED: unified timeline across all tables ---
    type ActivityItem = { type: string; description: string; email?: string; created_at: string }
    const activityFeed: ActivityItem[] = []

    // Signups
    users.filter(u => new Date(u.created_at) > weekAgo).forEach(u => {
      activityFeed.push({ type: 'signup', description: 'تسجيل جديد', email: u.email ?? undefined, created_at: u.created_at })
    })
    // Coach requests
    coachRequests.slice(0, 20).forEach((r: { user_id: string; created_at: string }) => {
      const u = userMap.get(r.user_id)
      activityFeed.push({ type: 'coach', description: 'استخدم المدرب الذكي', email: u?.email ?? undefined, created_at: r.created_at })
    })
    // Injection logs
    logs.slice(0, 20).forEach((l: { user_id: string; peptide_name: string; logged_at: string }) => {
      const u = userMap.get(l.user_id)
      activityFeed.push({ type: 'injection', description: `سجّل: ${l.peptide_name}`, email: u?.email ?? undefined, created_at: l.logged_at })
    })
    // Community posts
    community.slice(0, 10).forEach((c: { peptide_name?: string; created_at: string }) => {
      activityFeed.push({ type: 'community', description: `مشاركة مجتمع: ${c.peptide_name ?? 'عام'}`, created_at: c.created_at })
    })
    // Reviews
    reviews.slice(0, 10).forEach((r: { name: string; rating: number; created_at: string }) => {
      activityFeed.push({ type: 'review', description: `مراجعة من ${r.name} (${r.rating}/5)`, created_at: r.created_at })
    })
    // Enquiries
    enquiriesData.slice(0, 10).forEach((e: { email: string; subject: string; created_at: string }) => {
      activityFeed.push({ type: 'enquiry', description: `استفسار: ${e.subject}`, email: e.email, created_at: e.created_at })
    })
    activityFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // --- FUNNEL: conversion tracking ---
    const totalSignups = users.length
    const trialStarts = subs.filter(s => s.status === 'trial' || s.trial_ends_at).length
    const paidConversions = activeSubs.length
    const funnel = {
      totalSignups,
      trialStarts,
      paidConversions,
      signupToTrial: totalSignups > 0 ? Math.round((trialStarts / totalSignups) * 100) : 0,
      trialToPaid: trialStarts > 0 ? Math.round((paidConversions / trialStarts) * 100) : 0,
    }

    // --- REVENUE BY MONTH (last 12 months) ---
    const revenueByMonth: { month: string; revenue: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthStart = d.getTime()
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()

      let monthRevenue = 0
      for (const s of paidSubs) {
        if (!s.current_period_end || s.status === 'trial') continue
        const createdAt = new Date(s.created_at).getTime()
        if (createdAt >= monthStart && createdAt < nextMonth) {
          const isAnnual = s.billing_interval === 'year'
          if (s.tier === 'essentials') monthRevenue += isAnnual ? mrrEssentialsAnnual : mrrEssentialsMonthly
          else if (s.tier === 'elite') monthRevenue += isAnnual ? mrrEliteAnnual : mrrEliteMonthly
        }
      }
      revenueByMonth.push({ month: monthStr, revenue: Math.round(monthRevenue) })
    }

    // --- SIGNUPS BY DAY (last 30 days) ---
    const signupsByDay: { date: string; signups: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dayStart = d.getTime()
      const dayEnd = dayStart + 86400000
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`
      const count = users.filter(u => {
        const t = new Date(u.created_at).getTime()
        return t >= dayStart && t < dayEnd
      }).length
      signupsByDay.push({ date: dateStr, signups: count })
    }

    // --- SIGNUPS BY WEEK (last 12 weeks) ---
    const signupsByWeek: { date: string; signups: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7)
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000)
      const wStart = weekStart.getTime()
      const wEnd = weekEnd.getTime()
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
      const count = users.filter(u => {
        const t = new Date(u.created_at).getTime()
        return t >= wStart && t < wEnd
      }).length
      signupsByWeek.push({ date: label, signups: count })
    }

    // --- SIGNUPS BY MONTH (last 12 months) ---
    const signupsByMonth: { date: string; signups: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = d.getTime()
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const count = users.filter(u => {
        const t = new Date(u.created_at).getTime()
        return t >= monthStart && t < nextMonth
      }).length
      signupsByMonth.push({ date: monthStr, signups: count })
    }

    const stats = {
      pagination: {
        page: pageParam,
        perPage: perPageParam,
        totalFilteredUsers,
        totalPages: Math.ceil(totalFilteredUsers / perPageParam),
        searchQuery: searchQuery || null,
      },
      usersPaginationCapped,
      overview: {
        totalUsers: users.length,
        signupsToday,
        signupsWeek,
        signupsMonth,
        totalSubscriptions: subs.length,
        activeSubscriptions: activeSubs.length,
        trialSubscriptions: trialSubs.length,
        expiredSubscriptions: expiredSubs.length,
        pastDueSubscriptions: pastDueSubs.length,
        essentialsActive: essentialsSubs.length,
        eliteActive: eliteSubs.length,
        trialEssentials: trialEssentials.length,
        trialElite: trialElite.length,
        mrr,
        arr: Math.round(mrr * 12),
        arpu: mrrEligibleSubs.length > 0 ? Math.round((mrr / mrrEligibleSubs.length) * 100) / 100 : 0,
        churnRate: (() => {
          const cancelledThisMonth = paidSubs.filter(s =>
            (s.status === 'cancelled' || s.status === 'expired') &&
            s.current_period_end &&
            new Date(s.current_period_end) > monthAgo &&
            new Date(s.current_period_end) <= now
          ).length
          const establishedActive = activeSubs.filter(s =>
            new Date(s.created_at) <= monthAgo
          ).length
          const activeAtMonthStart = establishedActive + cancelledThisMonth
          return activeAtMonthStart > 0 ? Math.round((cancelledThisMonth / activeAtMonthStart) * 100) : 0
        })(),
        totalInjectionLogs: logsResult.count ?? logs.length,
        totalCoachRequests: coachResult.count ?? coachRequests.length,
        totalCommunityPosts: communityResult.count ?? community.length,
        pendingReviews: pendingReviews.length,
        approvedReviews: approvedReviews.length,
        emailListCount: emailList.length,
        pendingEnquiries: pendingEnquiriesCount,
        totalEnquiries: enquiriesData.length,
        totalAuthUsers: allUsers.length,
        unconfirmedUsers: allUsers.length - users.length,
        manualSubscriptions: manualSubs.length,
      },
      alerts,
      funnel,
      activityFeed: activityFeed.slice(0, 50),
      recentUsers: userSubs,
      recentLogs: logs.slice(0, 20),
      pendingReviews: pendingReviews.slice(0, 20),
      recentCommunity: community.slice(0, 20),
      revenueByMonth,
      signupsByDay,
      signupsByWeek,
      signupsByMonth,
      emailList: emailList.slice(0, 50),
      enquiries: enquiriesData.slice(0, 30),
      emailLogs: emailLogsData.slice(0, 50),
      webhookEvents: webhookEventsData.slice(0, 30),
    }

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('admin-stats error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
