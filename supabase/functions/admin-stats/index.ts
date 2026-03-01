import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const ADMIN_EMAILS = ['abdullahalameer@gmail.com', 'contact@pptides.com']

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://pptides.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const [
      usersResult,
      subsResult,
      logsResult,
      reviewsResult,
      communityResult,
      coachResult,
      emailListResult,
    ] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from('subscriptions').select('*').order('created_at', { ascending: false }),
      admin.from('injection_logs').select('id, user_id, peptide_name, logged_at', { count: 'exact', head: false }).order('logged_at', { ascending: false }).limit(100),
      admin.from('reviews').select('*').order('created_at', { ascending: false }),
      admin.from('community_logs').select('id, peptide_name, goal, rating, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(50),
      admin.from('ai_coach_requests').select('id, user_id, created_at', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(50),
      admin.from('email_list').select('*').order('created_at', { ascending: false }),
    ])

    const users = usersResult.data?.users ?? []
    const subs = subsResult.data ?? []
    const logs = logsResult.data ?? []
    const reviews = reviewsResult.data ?? []
    const community = communityResult.data ?? []
    const coachRequests = coachResult.data ?? []
    const emailList = emailListResult.data ?? []

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 86400000)
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const monthAgo = new Date(now.getTime() - 30 * 86400000)

    const activeSubs = subs.filter(s => s.status === 'active')
    const trialSubs = subs.filter(s => s.status === 'trial')
    const expiredSubs = subs.filter(s => s.status === 'expired' || s.status === 'cancelled')
    const pastDueSubs = subs.filter(s => s.status === 'past_due')

    const essentialsSubs = activeSubs.filter(s => s.tier === 'essentials')
    const eliteSubs = activeSubs.filter(s => s.tier === 'elite')

    const mrr = essentialsSubs.length * 9 + eliteSubs.length * 99
    const trialEssentials = trialSubs.filter(s => s.tier === 'essentials')
    const trialElite = trialSubs.filter(s => s.tier === 'elite')

    const signupsToday = users.filter(u => new Date(u.created_at) > dayAgo).length
    const signupsWeek = users.filter(u => new Date(u.created_at) > weekAgo).length
    const signupsMonth = users.filter(u => new Date(u.created_at) > monthAgo).length

    const recentUsers = users
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
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
      },
      recentUsers: userSubs,
      recentLogs: logs.slice(0, 20),
      pendingReviews: pendingReviews.slice(0, 20),
      recentCommunity: community.slice(0, 20),
      emailList: emailList.slice(0, 50),
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
