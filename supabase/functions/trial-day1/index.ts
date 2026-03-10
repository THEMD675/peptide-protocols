/**
 * Trial Day 1 — Value Email
 * Sent 24h after signup. Highlights top peptides and AI coach.
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

    // Find trial users who signed up ~24h ago (18-30h window)
    const minCreated = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString()
    const maxCreated = new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString()

    const { data: trialUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, trial_ends_at')
      .eq('status', 'trial')
      .gte('created_at', minCreated)
      .lte('created_at', maxCreated)

    if (queryError) {
      console.error('trial-day1: query failed:', queryError)
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

        // Dedup check
        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: 'trial_day1' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          console.error('trial-day1: dedup error:', dedupErr)
          failed++; continue
        }

        const trialEnds = sub.trial_ends_at
          ? new Date(sub.trial_ends_at).toLocaleDateString('ar-EG', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })
          : ''

        const emailResult = await sendEmail({
          to: email,
          subject: 'اكتشفت أشهر الببتيدات؟ — pptides',
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">أشهر 3 ببتيدات يبحث عنها العرب</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              في يومك الأول، اكتشف البروتوكولات الأكثر شعبية في مكتبتنا:
            </p>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">1. BPC-157</p>
                <p style="margin: 4px 0 0; color: #44403c; font-size: 14px;">ببتيد التعافي — يُستخدم لدعم شفاء الأنسجة والجهاز الهضمي</p>
                <a href="${APP_URL}/library/bpc-157" style="color: #059669; font-size: 13px; font-weight: bold;">اقرأ البروتوكول الكامل ←</a>
              </div>
              <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">2. Semaglutide</p>
                <p style="margin: 4px 0 0; color: #44403c; font-size: 14px;">ببتيد إدارة الوزن — الأكثر بحثًا في العالم العربي</p>
                <a href="${APP_URL}/library/semaglutide" style="color: #059669; font-size: 13px; font-weight: bold;">اقرأ البروتوكول الكامل ←</a>
              </div>
              <div>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">3. CJC-1295</p>
                <p style="margin: 4px 0 0; color: #44403c; font-size: 14px;">ببتيد هرمون النمو — لدعم التعافي وبناء العضلات</p>
                <a href="${APP_URL}/library/cjc-1295" style="color: #059669; font-size: 13px; font-weight: bold;">اقرأ البروتوكول الكامل ←</a>
              </div>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 15px; color: #92400e; font-weight: bold;">💡 هل تعرف أي ببتيد يناسب هدفك؟</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">اسأل المدرب الذكي — يحلل حالتك ويقترح البروتوكول المناسب</p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              ${emailButton('جرّب المدرب الذكي', `${APP_URL}/coach`)}
            </div>

            ${trialEnds ? `<p style="color: #78716c; font-size: 13px; text-align: center;">تنتهي تجربتك المجانية يوم ${trialEnds}</p>` : ''}
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`trial-day1: failed to send to ${email}:`, emailResult.error)
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'trial_day1').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('trial-day1: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('trial-day1 unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
