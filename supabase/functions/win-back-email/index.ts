/**
 * Win-back Email — 3 days after subscription cancellation
 * Sends a 20% discount win-back email to users who cancelled.
 * Uses retention_20_pct Stripe coupon.
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

    // Find users who cancelled ~3 days ago (60-84 hours ago window)
    // We check subscriptions with status 'cancelled' and updated_at in that window
    const minCancelTime = new Date(now.getTime() - 84 * 60 * 60 * 1000).toISOString()
    const maxCancelTime = new Date(now.getTime() - 60 * 60 * 60 * 1000).toISOString()

    const { data: cancelledSubs, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, updated_at, stripe_subscription_id, stripe_customer_id')
      .eq('status', 'cancelled')
      .gte('updated_at', minCancelTime)
      .lte('updated_at', maxCancelTime)

    if (queryError) {
      console.error('win-back-email: query failed:', queryError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!cancelledSubs || cancelledSubs.length === 0) {
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

    // Batch-fetch notification preferences
    const cancelledUserIds = cancelledSubs.map(u => u.user_id)
    const emailPrefsMap = new Map<string, boolean>()
    for (let i = 0; i < cancelledUserIds.length; i += 500) {
      const chunk = cancelledUserIds.slice(i, i + 500)
      const { data: prefs } = await supabase
        .from('user_profiles')
        .select('user_id, email_notifications_enabled')
        .in('user_id', chunk)
      if (prefs) {
        for (const p of prefs) {
          emailPrefsMap.set(p.user_id, p.email_notifications_enabled ?? true)
        }
      }
    }

    let sent = 0, skipped = 0, failed = 0

    for (const sub of cancelledSubs) {
      try {
        const email = userIdToEmail.get(sub.user_id)
        if (!email) { skipped++; continue }

        // Respect user's email notification preference
        if (emailPrefsMap.get(sub.user_id) === false) { skipped++; continue }

        // Dedup: only send once per user using sent_reminders table
        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: 'cancel_winback_3d' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue } // Already sent
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: email,
          subject: 'نشتاق لك! خصم 20% ينتظرك — pptides',
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">نشتاق لك! 💚</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              لاحظنا أنك ألغيت اشتراكك في pptides — نتمنى أن نراك مرة أخرى.
            </p>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              كهدية ترحيبية للعودة، نقدّم لك <strong style="color: #059669;">خصم 20% على اشتراكك القادم</strong>:
            </p>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
              <p style="font-size: 32px; font-weight: 900; color: #059669; margin: 8px 0;">خصم 20%</p>
              <p style="font-size: 13px; color: #44403c; margin: 4px 0;">الخصم يُطبَّق تلقائيًا عند الضغط على الزر أدناه</p>
            </div>

            <p style="color: #44403c; font-size: 15px; line-height: 1.8; font-weight: bold;">ما الذي ستحصل عليه عند العودة:</p>
            <div style="margin: 12px 0 20px;">
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ مكتبة ${PEPTIDE_COUNT}+ ببتيد بالبروتوكولات الكاملة</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ المدرب الذكي بالذكاء الاصطناعي</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ حاسبة الجرعات الدقيقة</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ تتبّع الحقن والبروتوكولات</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ دليل التحاليل المخبرية</p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              ${emailButton('اشترك الآن بخصم 20%', `${APP_URL}/pricing?coupon=retention_20_pct`)}
            </div>

            <p style="color: #78716c; font-size: 13px; text-align: center;">
              ضمان استرداد كامل — بدون أسئلة. إذا لم تعجبك الخدمة، استرد أموالك.
            </p>
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`win-back-email: failed to send to ${email}:`, emailResult.error)
          // Rollback dedup so we can retry
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'cancel_winback_3d').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('win-back-email: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('win-back-email unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
