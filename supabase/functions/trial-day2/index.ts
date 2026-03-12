/**
 * Trial Day 2 — Social Proof + Urgency Email
 * Sent 48h after signup. Shows community trust, highlights tools, urgency for last day.
 * Cron-triggered via x-cron-secret header.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'
import { sendEmail } from '../_shared/send-email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
const PEPTIDE_COUNT = parseInt(Deno.env.get('PEPTIDE_COUNT') ?? '47', 10)

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
    const now = new Date()

    // Find trial users who signed up ~48h ago (42-54h window)
    const minCreated = new Date(now.getTime() - 54 * 60 * 60 * 1000).toISOString()
    const maxCreated = new Date(now.getTime() - 42 * 60 * 60 * 1000).toISOString()

    const { data: trialUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, trial_ends_at')
      .eq('status', 'trial')
      .gte('created_at', minCreated)
      .lte('created_at', maxCreated)

    if (queryError) {
      console.error('trial-day2: query failed:', queryError)
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

    // Get total user count for social proof
    const { count: totalUsers } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
    const userCount = totalUsers ?? 0

    // Batch-fetch user emails
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

    let sent = 0, skipped = 0, failed = 0

    for (const sub of trialUsers) {
      try {
        const email = userIdToEmail.get(sub.user_id)
        if (!email) { skipped++; continue }

        // Dedup
        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: 'trial_day2' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: email,
          subject: 'أنت لست وحدك — باقي يوم واحد في تجربتك — pptides',
          tags: [{ name: 'type', value: 'trial_day2' }, { name: 'category', value: 'onboarding' }],
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">أنت لست وحدك في رحلة الببتيدات</h1>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
              <p style="font-size: 36px; font-weight: 900; color: #059669; margin: 0;">${userCount > 0 ? `+${userCount}` : '+100'}</p>
              <p style="font-size: 16px; color: #44403c; margin: 8px 0 0;">مستخدم يثق بـ pptides كمرجع للببتيدات العلاجية</p>
            </div>

            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              مجتمعنا ينمو كل يوم — وأنت جزء منه. إليك أدوات ربما لم تجرّبها بعد:
            </p>

            <div style="margin: 20px 0;">
              <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">🧮 حاسبة الجرعات</p>
                <p style="margin: 4px 0 0; color: #44403c; font-size: 14px;">أدخل الببتيد والتركيز — تعرض لك الجرعة بالضبط على السيرنج</p>
                <a href="${APP_URL}/calculator" style="color: #059669; font-size: 13px; font-weight: bold;">جرّبها الآن ←</a>
              </div>
              <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">📊 تتبّع الجرعات</p>
                <p style="margin: 4px 0 0; color: #44403c; font-size: 14px;">سجّل حقنك وتابع تقدمك في البروتوكول</p>
                <a href="${APP_URL}/tracker" style="color: #059669; font-size: 13px; font-weight: bold;">ابدأ التتبّع ←</a>
              </div>
              <div style="background: #f5f5f4; border-radius: 8px; padding: 16px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">📚 مكتبة ${PEPTIDE_COUNT}+ ببتيد</p>
                <p style="margin: 4px 0 0; color: #44403c; font-size: 14px;">بروتوكولات كاملة بالجرعات والمدة والتحذيرات</p>
                <a href="${APP_URL}/library" style="color: #059669; font-size: 13px; font-weight: bold;">تصفّح المكتبة ←</a>
              </div>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: #991b1b;">⏰ باقي يوم واحد في تجربتك المجانية</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #991b1b;">غدًا ستفقد الوصول — استفد من كل لحظة</p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              ${emailButton('استكشف قبل ما تنتهي', `${APP_URL}/dashboard`)}
            </div>
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`trial-day2: failed to send to ${email}:`, emailResult.error)
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'trial_day2').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('trial-day2: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('trial-day2 unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
