/**
 * Paid Week 2 — Deep Dive
 * Sent 14 days after subscription. Check-in, AI Coach, dose calculator.
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

    // Find paid users who subscribed ~14 days ago (13-15 day window)
    const minCreated = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const maxCreated = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString()

    const { data: paidUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, created_at')
      .eq('status', 'active')
      .gte('created_at', minCreated)
      .lte('created_at', maxCreated)

    if (queryError) {
      console.error('paid-week2: query failed:', queryError)
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
          .insert({ user_id: sub.user_id, reminder_type: 'paid_week2' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          console.error('paid-week2: dedup error:', dedupErr)
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: email,
          subject: 'أسبوعك الأول — كيف كانت التجربة؟ — pptides',
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">أسبوعك الأول — كيف كانت التجربة؟ 🤔</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              مرّ أسبوعان على اشتراكك! نتمنى أنك بدأت تستكشف عالم الببتيدات العلاجية.
            </p>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              إذا عندك أي سؤال — سواء عن الجرعات، التخزين، أو اختيار البروتوكول — المدرب الذكي جاهز يساعدك ٢٤/٧.
            </p>

            <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 40px;">🤖</p>
              <p style="margin: 12px 0 4px; font-size: 18px; font-weight: bold; color: #059669;">المدرب الذكي</p>
              <p style="margin: 0 0 16px; color: #44403c; font-size: 14px; line-height: 1.7;">
                اسأل أي سؤال عن الببتيدات واحصل على إجابة مخصصة لحالتك.<br/>
                يفهم العربية ويعتمد على أحدث الأبحاث العلمية.
              </p>
              ${emailButton('اسأل المدرب الذكي', `${APP_URL}/coach`)}
            </div>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 17px; font-weight: bold; color: #059669;">🧮 حاسبة الجرعات</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  أدخل وزنك ونوع الببتيد واحصل على الجرعة المقترحة فورًا — بناءً على البروتوكولات العلمية.
                </p>
                <a href="${APP_URL}/calculator" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">احسب جرعتك ←</a>
              </div>
              <div>
                <p style="margin: 0; font-size: 17px; font-weight: bold; color: #059669;">❄️ دليل التخزين الصحيح</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  التخزين الخاطئ = ببتيد تالف. تعلّم كيف تحفظ ببتيداتك بالطريقة الصحيحة.
                </p>
                <a href="${APP_URL}/blog/storage-guide" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">اقرأ دليل التخزين ←</a>
              </div>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 15px; color: #92400e; font-weight: bold;">📝 سجّل ملاحظاتك</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">أفضل النتائج تأتي من التتبع المنتظم. سجّل تجربتك اليومية في أداة التتبع.</p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              ${emailButton('سجّل تقدّمك', `${APP_URL}/tracker`)}
            </div>
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`paid-week2: failed to send to ${email}:`, emailResult.error)
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'paid_week2').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('paid-week2: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('paid-week2 unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
