/**
 * Re-engagement Email — 14-day inactive subscribers
 * Sends a personalized Arabic email to paying subscribers who haven't
 * signed in for 14+ days, reminding them of key platform features.
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
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // Get active/trialing subscribers
    const { data: subscribers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trial'])

    if (queryError) {
      console.error('reengagement-email: subscriptions query failed:', queryError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Batch-fetch all users to get emails and last_sign_in_at
    const userMap = new Map<string, { email: string; lastSignIn: string | null }>()
    let page = 1
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !users || users.length === 0) break
      for (const u of users) {
        if (u.email) {
          userMap.set(u.id, {
            email: u.email,
            lastSignIn: u.last_sign_in_at ?? null,
          })
        }
      }
      if (users.length < 1000) break
      page++
    }

    let sent = 0, skipped = 0, failed = 0

    for (const sub of subscribers) {
      try {
        const user = userMap.get(sub.user_id)
        if (!user) { skipped++; continue }

        // Skip users who signed in within the last 14 days
        if (user.lastSignIn && user.lastSignIn > fourteenDaysAgo) {
          skipped++
          continue
        }

        // Skip users who never signed in (edge case — shouldn't happen for subscribers)
        if (!user.lastSignIn) { skipped++; continue }

        // Dedup via drip_emails_sent
        const { error: dedupErr } = await supabase
          .from('drip_emails_sent')
          .insert({ user_id: sub.user_id, email_key: 'reengagement_14d' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          console.error('reengagement-email: dedup error:', dedupErr)
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: user.email,
          subject: 'اشتقنالك! ببتيداتك تنتظرك — pptides',
          tags: [{ name: 'type', value: 'reengagement' }, { name: 'category', value: 'retention' }],
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">اشتقنالك!</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              لاحظنا إنك ما زرت pptides من فترة — وحابين نذكّرك إن اشتراكك مفعّل وكل الأدوات جاهزة لك.
            </p>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              هل جربت هالميزات؟ كثير من مشتركينا يستفيدون منها يوميًا:
            </p>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 20px 0;">
              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">🤖 المدرب الذكي (AI Coach)</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 15px; line-height: 1.7;">
                  اسأل أي سؤال عن الببتيدات واحصل على إجابة فورية مبنية على أحدث الأبحاث — مدربك الشخصي متاح ٢٤/٧.
                </p>
                <a href="${APP_URL}/coach" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">جرّب المدرب الذكي ←</a>
              </div>
              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">🧮 حاسبة الجرعات (Dose Calculator)</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 15px; line-height: 1.7;">
                  احسب جرعتك بدقة حسب وزنك وتركيز الببتيد — بدون تخمين، بدون أخطاء.
                </p>
                <a href="${APP_URL}/calculator" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">احسب جرعتك ←</a>
              </div>
              <div>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">متتبع الحقن (Injection Tracker)</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 15px; line-height: 1.7;">
                  سجّل كل حقنة، تابع سلسلة الالتزام، وشوف تقدّمك البصري — ما يضيع عليك شيء.
                </p>
                <a href="${APP_URL}/tracker" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">ابدأ التتبع ←</a>
              </div>
            </div>

            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              رحلتك مع الببتيدات تستاهل متابعة — ارجع وكمّل من حيث وقفت! —
            </p>

            <div style="text-align: center; margin: 28px 0;">
              ${emailButton('ارجع للوحة التحكم', `${APP_URL}/dashboard`)}
            </div>
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`reengagement-email: failed to send to ${user.email}:`, emailResult.error)
          // Rollback dedup so we can retry next run
          await supabase.from('drip_emails_sent').delete()
            .eq('user_id', sub.user_id).eq('email_key', 'reengagement_14d').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('reengagement-email: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('reengagement-email unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
