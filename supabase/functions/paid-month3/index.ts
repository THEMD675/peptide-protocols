/**
 * Paid Month 3 — Loyalty & Referral
 * Sent 90 days after subscription. Referral program, advanced topics.
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

    // Find paid users who subscribed ~90 days ago (89-91 day window)
    const minCreated = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString()
    const maxCreated = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString()

    const { data: paidUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, created_at')
      .eq('status', 'active')
      .gte('created_at', minCreated)
      .lte('created_at', maxCreated)

    if (queryError) {
      console.error('paid-month3: query failed:', queryError)
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
          .insert({ user_id: sub.user_id, reminder_type: 'paid_month3' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          console.error('paid-month3: dedup error:', dedupErr)
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: email,
          subject: '3 أشهر من التعلم المستمر! 🏆 — pptides',
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">3 أشهر من التعلم المستمر! 🏆</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              ٩٠ يوم مع pptides — أنت الآن من أقدم أعضائنا! شكرًا لثقتك المستمرة.
            </p>

            <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 28px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 36px;">🎁</p>
              <p style="margin: 12px 0 4px; font-size: 20px; font-weight: bold; color: #92400e;">شارك واحصل على شهر مجاني!</p>
              <p style="margin: 0 0 20px; color: #78350f; font-size: 15px; line-height: 1.7;">
                ادعُ صديقًا واحدًا لـ pptides — إذا اشترك، تحصل على شهر مجاني هدية منّا.<br/>
                رابط الدعوة الخاص بك موجود في صفحة حسابك.
              </p>
              ${emailButton('احصل على رابط الدعوة', `${APP_URL}/account/referral`)}
            </div>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <p style="margin: 0 0 16px; font-size: 17px; font-weight: bold; color: #059669;">🎓 مواضيع متقدمة لك</p>

              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">ببتيدات التعافي المتقدمة</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  تعمّق في بروتوكولات TB-500 و Thymosin Alpha-1 وكيف تعمل مع BPC-157.
                </p>
                <a href="${APP_URL}/library?tag=recovery" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">اقرأ المزيد ←</a>
              </div>

              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #d1fae5;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">ستاكات هرمون النمو</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  CJC-1295 + Ipamorelin + MK-677 — متى تجمع ومتى تختار واحد فقط؟
                </p>
                <a href="${APP_URL}/library?tag=growth-hormone" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">اقرأ المزيد ←</a>
              </div>

              <div>
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1c1917;">ببتيدات مضادات الشيخوخة</p>
                <p style="margin: 8px 0 0; color: #44403c; font-size: 14px; line-height: 1.7;">
                  Epitalon و GHK-Cu — أحدث الأبحاث عن الببتيدات المضادة للشيخوخة.
                </p>
                <a href="${APP_URL}/library?tag=anti-aging" style="color: #059669; font-size: 14px; font-weight: bold; text-decoration: none;">اقرأ المزيد ←</a>
              </div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 15px; color: #166534; font-weight: bold;">🙏 شكرًا لكونك جزءًا من المجتمع</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #166534; line-height: 1.7;">
                وجودك يدفعنا لتقديم محتوى أفضل كل يوم. نحن نبني أكبر مرجع عربي للببتيدات — وأنت جزء أساسي من هذه الرحلة.
              </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              ${emailButton('شارك واحصل على شهر مجاني', `${APP_URL}/account/referral`)}
            </div>
          `),
          replyTo: 'contact@pptides.com',
        })

        if (emailResult.ok) {
          sent++
        } else {
          console.error(`paid-month3: failed to send to ${email}:`, emailResult.error)
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'paid_month3').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('paid-month3: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('paid-month3 unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
