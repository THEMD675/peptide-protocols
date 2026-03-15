// Stripe ↔ DB Reconciliation — Daily cron job
// Compares active Stripe subscriptions against the DB `subscriptions` table
// to detect and fix status drift caused by missed webhooks or manual Stripe changes.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { getCorsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

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

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  try {
    const jwt = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    if (payload.role !== 'service_role') {
      return new Response(JSON.stringify({ error: 'Forbidden: service_role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', timeout: 10000 })

  let fixed = 0
  let checked = 0

  try {
    // Fetch DB rows that should be active but might be stale
    const { data: dbSubs } = await supabase
      .from('subscriptions')
      .select('id, user_id, stripe_subscription_id, status')
      .not('stripe_subscription_id', 'is', null)
      .in('status', ['active', 'trial', 'past_due'])

    if (dbSubs && dbSubs.length > 0) {
      for (const row of dbSubs) {
        if (!row.stripe_subscription_id) continue
        checked++
        try {
          const stripeSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id)
          const stripeStatus = stripeSub.status

          const statusMap: Record<string, string> = {
            active: 'active',
            trialing: 'trial',
            past_due: 'past_due',
            canceled: 'cancelled',
            incomplete_expired: 'expired',
            unpaid: 'past_due',
          }
          const expectedDbStatus = statusMap[stripeStatus] ?? row.status

          if (expectedDbStatus !== row.status) {
            await supabase.from('subscriptions').update({
              status: expectedDbStatus,
              updated_at: new Date().toISOString(),
            }).eq('id', row.id)
            console.log(`stripe-reconciliation: fixed ${row.user_id} ${row.status} → ${expectedDbStatus}`)
            fixed++
          }
        } catch (e) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'resource_missing') {
            await supabase.from('subscriptions').update({
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            }).eq('id', row.id)
            console.log(`stripe-reconciliation: sub not found in Stripe, marked cancelled: ${row.user_id}`)
            fixed++
          } else {
            console.error(`stripe-reconciliation: error checking ${row.stripe_subscription_id}:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.error('stripe-reconciliation: fatal error:', e)
    return new Response(JSON.stringify({ error: 'Reconciliation failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ checked, fixed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
