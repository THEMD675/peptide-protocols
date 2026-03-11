import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
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
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (!expectedSecret) {
      return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cronSecret = req.headers.get('x-cron-secret')
    if (!cronSecret || !constantTimeCompare(cronSecret, expectedSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find active users with push subscriptions who have protocols
    const { data: activeUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trial'])

    if (queryError) {
      console.error('daily-digest: failed to query active users:', queryError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!activeUsers || activeUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = activeUsers.map(u => u.user_id)

    // Fetch users who have push subscriptions
    const { data: pushUsers, error: pushError } = await supabase
      .from('user_profiles')
      .select('user_id, push_subscription')
      .in('user_id', userIds)
      .not('push_subscription', 'is', null)

    if (pushError || !pushUsers || pushUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No users with push subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check who has logged an injection in the last 24h
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const pushUserIds = pushUsers.map(u => u.user_id)

    const { data: recentLogs } = await supabase
      .from('injection_logs')
      .select('user_id')
      .in('user_id', pushUserIds)
      .gte('logged_at', yesterday)

    const usersWithRecentLogs = new Set((recentLogs ?? []).map(l => l.user_id))

    // Send reminders to users who haven't logged today
    const usersToNotify = pushUserIds.filter(id => !usersWithRecentLogs.has(id))

    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'All users already logged today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call send-push for batch notification
    const pushUrl = `${supabaseUrl}/functions/v1/send-push`
    const pushRes = await fetch(pushUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': expectedSecret,
      },
      body: JSON.stringify({
        user_ids: usersToNotify,
        title: 'pptides — تذكير يومي',
        body: 'لا تنسَ تسجيل جرعتك اليوم وتتبّع تقدّمك',
        url: 'https://pptides.com/tracker',
      }),
    })

    const pushResult = await pushRes.json().catch(() => ({}))

    console.log(JSON.stringify({
      action: 'daily_digest',
      total_active: activeUsers.length,
      with_push: pushUsers.length,
      already_logged: usersWithRecentLogs.size,
      notified: usersToNotify.length,
      result: pushResult,
      timestamp: new Date().toISOString(),
    }))

    return new Response(JSON.stringify({
      total_active: activeUsers.length,
      with_push: pushUsers.length,
      already_logged: usersWithRecentLogs.size,
      notified: usersToNotify.length,
      push_result: pushResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('daily-digest unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
