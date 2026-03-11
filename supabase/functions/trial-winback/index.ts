/**
 * Trial Win-back — Day 5 Email (2 days after trial expired)
 * "نفتقدك!" — 20% off coupon, latest content, last chance urgency.
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
const ESSENTIALS_PRICE = Deno.env.get('ESSENTIALS_PRICE_DISPLAY') ?? '34 ر.س'
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

    // Find users whose trial expired ~2 days ago (expired status, trial_ends_at 42-54h ago)
    // Also check users with status 'expired' who signed up ~5 days ago
    const minExpiry = new Date(now.getTime() - 54 * 60 * 60 * 1000).toISOString()
    const maxExpiry = new Date(now.getTime() - 42 * 60 * 60 * 1000).toISOString()

    const { data: expiredUsers, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, trial_ends_at, stripe_subscription_id')
      .eq('status', 'expired')
      .gte('trial_ends_at', minExpiry)
      .lte('trial_ends_at', maxExpiry)

    if (queryError) {
      console.error('trial-winback: query failed:', queryError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!expiredUsers || expiredUsers.length === 0) {
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

    // Fetch latest blog posts for "what's new" section
    let blogPostsHtml = ''
    try {
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('title, slug')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3)

      if (posts && posts.length > 0) {
        const postItems = posts.map(p =>
          `<li style="margin: 8px 0;"><a href="${APP_URL}/blog/${p.slug}" style="color: #059669; font-weight: bold; text-decoration: none;">${p.title}</a></li>`
        ).join('')
        blogPostsHtml = `
          <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 15px; font-weight: bold; color: #1c1917;">📝 جديد في المدوّنة:</p>
            <ul style="margin: 0; padding: 0 16px;">${postItems}</ul>
          </div>
        `
      }
    } catch { /* blog posts are optional */ }

    // Calculate discounted price
    const originalPrice = 34
    const discountedPrice = Math.round(originalPrice * 0.8) // 20% off = ~27 SAR

    // Batch-fetch notification preferences
    const expiredUserIds = expiredUsers.map(u => u.user_id)
    const emailPrefsMap = new Map<string, boolean>()
    for (let i = 0; i < expiredUserIds.length; i += 500) {
      const chunk = expiredUserIds.slice(i, i + 500)
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

    for (const sub of expiredUsers) {
      try {
        // Skip if they already converted (have a Stripe subscription)
        if (sub.stripe_subscription_id) { skipped++; continue }

        const email = userIdToEmail.get(sub.user_id)
        if (!email) { skipped++; continue }

        // Respect user's email notification preference
        if (emailPrefsMap.get(sub.user_id) === false) { skipped++; continue }

        // Dedup
        const { error: dedupErr } = await supabase
          .from('sent_reminders')
          .insert({ user_id: sub.user_id, reminder_type: 'trial_winback_day5' })
        if (dedupErr) {
          if (dedupErr.code === '23505') { skipped++; continue }
          failed++; continue
        }

        const emailResult = await sendEmail({
          to: email,
          subject: 'نفتقدك! خصم 20% ينتظرك — pptides',
          html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">نفتقدك! 👋</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              انتهت تجربتك المجانية قبل يومين — لكننا نريدك أن تعود.
            </p>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              كهدية ترحيبية، نقدّم لك <strong style="color: #059669;">خصم 20% على أول شهر</strong>:
            </p>

            <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
              <p style="font-size: 14px; color: #78716c; margin: 0; text-decoration: line-through;">${ESSENTIALS_PRICE}/شهر</p>
              <p style="font-size: 32px; font-weight: 900; color: #059669; margin: 8px 0;">${discountedPrice} ر.س<span style="font-size: 16px; font-weight: normal;">/الشهر الأول</span></p>
              <p style="font-size: 13px; color: #44403c; margin: 4px 0;">الخصم يُطبَّق تلقائيًا عند الضغط على الزر أدناه</p>
            </div>

            <p style="color: #44403c; font-size: 15px; line-height: 1.8; font-weight: bold;">ما الذي ستحصل عليه:</p>
            <div style="margin: 12px 0 20px;">
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ مكتبة ${PEPTIDE_COUNT}+ ببتيد بالبروتوكولات الكاملة</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ المدرب الذكي بالذكاء الاصطناعي</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ حاسبة الجرعات الدقيقة</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ تتبّع الحقن والبروتوكولات</p>
              <p style="margin: 6px 0; font-size: 14px; color: #44403c;">✅ دليل التحاليل المخبرية</p>
            </div>

            ${blogPostsHtml}

            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 15px; font-weight: bold; color: #991b1b;">⏰ آخر فرصة — العرض ينتهي قريبًا</p>
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
          console.error(`trial-winback: failed to send to ${email}:`, emailResult.error)
          await supabase.from('sent_reminders').delete()
            .eq('user_id', sub.user_id).eq('reminder_type', 'trial_winback_day5').catch(() => {})
          failed++
        }
      } catch (e) {
        console.error('trial-winback: error for user', sub.user_id, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('trial-winback unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
