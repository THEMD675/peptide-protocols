import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { getServiceClient, supabaseUrl, supabaseServiceKey } from '../_shared/supabase.ts'

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500, corsHeaders)
  }

  try {
    const { error: authResp } = await requireAdmin(req)
    if (authResp) return authResp

    const admin = getServiceClient()

    async function getAllAuthUsers() {
      const collected: typeof paginatedUsers = []
      let page = 1
      while (true) {
        const { data: { users }, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error || !users || users.length === 0) break
        collected.push(...users)
        if (users.length < 1000) break
        page++
      }
      return collected
    }
    type AuthUser = Awaited<ReturnType<typeof admin.auth.admin.listUsers>>['data']['users'][number]
    let paginatedUsers: AuthUser[] = []

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
      getAllAuthUsers().then(u => { paginatedUsers = u }),
      admin.from('subscriptions').select('*').order('created_at', { ascending: false }),
      admin.from('injection_logs').select('id, user_id, peptide_name, logged_at', { count: 'exact', head: false }).order('logged_at', { ascending: false }).limit(100),
      admin.from('reviews').select('*').order('created_at', { ascending: false }),
      admin.from('community_logs').select('id, peptide_name, goal, rating, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(50),
      admin.from('ai_coach_requests').select('id, user_id, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(50),
      admin.from('email_list').select('*').order('created_at', { ascending: false }),
      admin.from('enquiries').select('*').order('created_at', { ascending: false }).limit(50),
      admin.from('email_logs').select('id, email, type, status, created_at').order('created_at', { ascending: false }).limit(50),
      admin.from('processed_webhook_events').select('event_id, event_type, processed_at').order('processed_at', { ascending: false }).limit(30).then(r => r).catch(() => ({ data: null, error: null })),
    ])

    const url = new URL(req.url)
    const searchQuery = url.searchParams.get('search')?.trim().toLowerCase() ?? ''

    const allUsers = paginatedUsers
    const subs = subsResult.data ?? []
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

    // MRR only from real Stripe subscriptions. SOURCE OF TRUTH: 34 SAR (Essentials), 371 SAR (Elite); override via MRR_ESSENTIALS_SAR, MRR_ELITE_SAR env
    // Note: counts all active subs at monthly rate. Annual subs (296/2963 SAR/year) are overcounted. Fix requires Stripe metadata.
    const mrrEssentialsSar = parseFloat(Deno.env.get('MRR_ESSENTIALS_SAR') ?? '34')
    const mrrEliteSar = parseFloat(Deno.env.get('MRR_ELITE_SAR') ?? '371')
    const mrr = essentialsSubs.length * mrrEssentialsSar + eliteSubs.length * mrrEliteSar
    const trialEssentials = trialSubs.filter(s => s.tier === 'essentials')
    const trialElite = trialSubs.filter(s => s.tier === 'elite')

    const signupsToday = users.filter(u => new Date(u.created_at) > dayAgo).length
    const signupsWeek = users.filter(u => new Date(u.created_at) > weekAgo).length
    const signupsMonth = users.filter(u => new Date(u.created_at) > monthAgo).length

    const recentUsersSource = searchQuery
      ? users.filter(u => u.email?.toLowerCase().includes(searchQuery))
      : users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)

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
      const sub = subs.find(s => s.user_id === u.id)
      return {
        ...u,
        subscription: sub ? {
          status: sub.status,
          tier: sub.tier,
          stripe_subscription_id: sub.stripe_subscription_id,
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
        const u = allUsers.find(au => au.id === s.user_id)
        return u?.email ?? s.user_id
      })
      alerts.push({ type: 'trial_expiring', severity: 'critical', message: `${expiringTrials.length} trial(s) expiring within 48h`, data: { emails: trialEmails } })
    }
    if (pastDueSubs.length > 0) {
      alerts.push({ type: 'past_due', severity: 'critical', message: `${pastDueSubs.length} subscription(s) past due — revenue at risk` })
    }
    const pendingEnquiriesCount = enquiriesData.filter((e: { status: string }) => e.status === 'pending').length
    if (pendingEnquiriesCount > 0) {
      alerts.push({ type: 'pending_enquiries', severity: 'warning', message: `${pendingEnquiriesCount} unanswered enquiry(ies)` })
    }
    if (pendingReviews.length > 0) {
      alerts.push({ type: 'pending_reviews', severity: 'info', message: `${pendingReviews.length} review(s) awaiting approval` })
    }
    if (emailLogsData.length === 0 && users.length > 3) {
      alerts.push({ type: 'no_emails', severity: 'warning', message: 'No email delivery logs found — emails may not be sending' })
    }
    if (webhookEventsData.length === 0 && paidSubs.length > 0) {
      alerts.push({ type: 'no_webhooks', severity: 'warning', message: 'No webhook events recorded despite active Stripe subscriptions' })
    }

    // --- ACTIVITY FEED: unified timeline across all tables ---
    type ActivityItem = { type: string; description: string; email?: string; created_at: string }
    const activityFeed: ActivityItem[] = []

    // Signups
    users.filter(u => new Date(u.created_at) > weekAgo).forEach(u => {
      activityFeed.push({ type: 'signup', description: 'Signed up', email: u.email ?? undefined, created_at: u.created_at })
    })
    // Coach requests
    coachRequests.slice(0, 20).forEach((r: { user_id: string; created_at: string }) => {
      const u = allUsers.find(au => au.id === r.user_id)
      activityFeed.push({ type: 'coach', description: 'Used AI Coach', email: u?.email ?? undefined, created_at: r.created_at })
    })
    // Injection logs
    logs.slice(0, 20).forEach((l: { user_id: string; peptide_name: string; logged_at: string }) => {
      const u = allUsers.find(au => au.id === l.user_id)
      activityFeed.push({ type: 'injection', description: `Logged: ${l.peptide_name}`, email: u?.email ?? undefined, created_at: l.logged_at })
    })
    // Community posts
    community.slice(0, 10).forEach((c: { peptide_name?: string; created_at: string }) => {
      activityFeed.push({ type: 'community', description: `Community post: ${c.peptide_name ?? 'general'}`, created_at: c.created_at })
    })
    // Reviews
    reviews.slice(0, 10).forEach((r: { name: string; rating: number; created_at: string }) => {
      activityFeed.push({ type: 'review', description: `Review by ${r.name} (${r.rating}/5)`, created_at: r.created_at })
    })
    // Enquiries
    enquiriesData.slice(0, 10).forEach((e: { email: string; subject: string; created_at: string }) => {
      activityFeed.push({ type: 'enquiry', description: `Enquiry: ${e.subject}`, email: e.email, created_at: e.created_at })
    })
    activityFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // --- FUNNEL: conversion tracking ---
    const totalSignups = users.length
    const trialStarts = paidSubs.length // anyone who started a Stripe trial/sub
    const paidConversions = activeSubs.length
    const funnel = {
      totalSignups,
      trialStarts,
      paidConversions,
      signupToTrial: totalSignups > 0 ? Math.round((trialStarts / totalSignups) * 100) : 0,
      trialToPaid: trialStarts > 0 ? Math.round((paidConversions / trialStarts) * 100) : 0,
    }

    const stats = {
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
