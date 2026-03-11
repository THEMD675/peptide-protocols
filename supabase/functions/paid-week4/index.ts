/**
 * Paid Week 4 — Engagement / Monthly Check-in
 * Sent 28 days after subscription. Progress report, community, stacks, feedback.
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

    // Find paid users who subscribed ~28 days ago (27-29 day window)
    const minCreated = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString()
    const maxCreated = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000).toISOString()

    const { data: paidUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, created_at')
      .eq('status', 'active')
      .gte('created_at', minCreated)
      .lte('created_at', maxCreated)

    if (queryError) {
      console.error('paid-week4: query failed:', queryError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!paidUsers || paidUsers.length === 0) {
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

    for (const sub of paidUsers) {
      try {
        const email = userIdToEmail.get(sub.user_id)
        if (!email) { skipped++; continue }

        // Dedup check
        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: 'paid_week4' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          console.error('paid-week4: dedup error:', dedupErr)
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: email,
          subject: 'شهر كامل! إليك تقريرك — pptides',
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">شهر كامل! إليك خلاصة رحلتك</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              مبروك على إكمال شهرك الأول مع pptides! هذا إنجاز حقيقي — معظم الناس لا يلتزمون بعد الأسبوع الأول.
            </p>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <p style="margin: 0 0 16px; font-size: 17px; font-weight: bold; color: #059669;">خطواتك القادمة</p>

              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">استكشف الستاكات (التوليفات)</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  بعد شهر من الخبرة، أنت جاهز للمستوى التالي. اكتشف كيف تجمع ببتيدات مختلفة لنتائج أقوى.
                </p>
                <a href="${APP_URL}/stacks" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">استكشف التوليفات ←</a>
              </div>

              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">👥 انضم للمجتمع</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  تواصل مع مستخدمين آخرين، شارك تجربتك، واستفد من خبرات المجتمع العربي.
                </p>
                <a href="${APP_URL}/community" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">ادخل المجتمع ←</a>
              </div>

              <div>
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">📊 راجع تقدّمك</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  تابع سجل التتبع وقارن نتائجك مع خط الأساس. التحسّن التدريجي هو المفتاح.
                </p>
                <a href="${APP_URL}/tracker" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">راجع سجلك ←</a>
              </div>
            </div>

            <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1e40af;">💬 رأيك يهمّنا!</p>
              <p style="margin: 8px 0 16px; font-size: 14px; color: #1e40af; line-height: 1.7;">
                كيف كانت تجربتك خلال الشهر الأول؟ ما الذي يمكننا تحسينه؟<br/>
                ردّ على هذا الإيميل مباشرة — نقرأ كل رسالة.
              </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              ${emailButton('استكشف الستاكات', `${APP_URL}/stacks`)}
            </div>
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`paid-week4: failed to send to ${email}:`, emailResult.error)
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'paid_week4').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('paid-week4: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('paid-week4 unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
