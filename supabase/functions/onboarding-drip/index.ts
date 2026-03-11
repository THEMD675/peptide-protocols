import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
const ESSENTIALS_PRICE = Deno.env.get('ESSENTIALS_PRICE_DISPLAY') ?? '34 ر.س'
const PEPTIDE_COUNT = parseInt(Deno.env.get('PEPTIDE_COUNT') ?? '41', 10)

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ── Drip email definitions ──────────────────────────────────────────────────

interface DripEmail {
  key: string
  delayHours: number // hours after signup
  subject: string
  buildHtml: () => string
  /** If true, skip users who already have an active/trial subscription */
  skipSubscribed?: boolean
}

const dripEmails: DripEmail[] = [
  {
    key: 'welcome_enhanced',
    delayHours: 0,
    subject: 'مرحبًا في pptides! 🧬',
    buildHtml: () => `
      <h1 style="color: #1c1917; font-size: 24px;">مرحبًا بك في pptides!</h1>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        يسعدنا انضمامك! أنت الآن على بُعد خطوة من أشمل مرجع عربي للببتيدات العلاجية.
      </p>
      <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          <strong style="color: #059669;">🧬 ${PEPTIDE_COUNT}+ ببتيد</strong> — بروتوكولات كاملة مدعومة بأبحاث PubMed
        </p>
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          <strong style="color: #059669;">🤖 المدرب الذكي</strong> — اسأل أي سؤال واحصل على إجابة فورية
        </p>
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          <strong style="color: #059669;">💊 حاسبة الجرعات</strong> — جرعتك بالضبط على السيرنج
        </p>
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          <strong style="color: #059669;">⚠️ فاحص التفاعلات</strong> — تأكد من سلامة بروتوكولك
        </p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        ${emailButton('استكشف مكتبة الببتيدات', `${APP_URL}/library`)}
      </div>
      <p style="color: #78716c; font-size: 13px;">
        تجربتك المجانية مدتها 3 أيام — استفد من كل دقيقة!
      </p>
    `,
  },
  {
    key: 'day1_explore',
    delayHours: 24,
    subject: 'أشهر 5 ببتيدات يبدأ بها المحترفون',
    buildHtml: () => `
      <h1 style="color: #1c1917; font-size: 24px;">من أين تبدأ؟</h1>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        هذه أكثر 5 ببتيدات يبحث عنها المحترفون في pptides:
      </p>
      <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 10px 0; font-size: 15px;">
          <strong style="color: #059669;">1.</strong> <a href="${APP_URL}/peptides/bpc-157" style="color: #059669; font-weight: bold;">BPC-157</a> — الببتيد الأشهر للتعافي والالتهابات
        </p>
        <p style="margin: 10px 0; font-size: 15px;">
          <strong style="color: #059669;">2.</strong> <a href="${APP_URL}/peptides/tb-500" style="color: #059669; font-weight: bold;">TB-500</a> — لتسريع شفاء الأنسجة والمفاصل
        </p>
        <p style="margin: 10px 0; font-size: 15px;">
          <strong style="color: #059669;">3.</strong> <a href="${APP_URL}/peptides/ghk-cu" style="color: #059669; font-weight: bold;">GHK-Cu</a> — لتجديد البشرة ومكافحة الشيخوخة
        </p>
        <p style="margin: 10px 0; font-size: 15px;">
          <strong style="color: #059669;">4.</strong> <a href="${APP_URL}/peptides/semaglutide" style="color: #059669; font-weight: bold;">Semaglutide</a> — الأكثر طلبًا لإدارة الوزن
        </p>
        <p style="margin: 10px 0; font-size: 15px;">
          <strong style="color: #059669;">5.</strong> <a href="${APP_URL}/peptides/cjc-1295" style="color: #059669; font-weight: bold;">CJC-1295</a> — لتحفيز هرمون النمو بشكل طبيعي
        </p>
      </div>
      <p style="color: #44403c; font-size: 16px;">
        كل ببتيد يأتي مع بروتوكول كامل: الجرعة، طريقة الحقن، الدورة، والتحاليل المطلوبة.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        ${emailButton('اكتشف البقية', `${APP_URL}/library`)}
      </div>
    `,
  },
  {
    key: 'day2_tools',
    delayHours: 48,
    subject: 'أدوات تساعدك في رحلتك مع الببتيدات',
    buildHtml: () => `
      <h1 style="color: #1c1917; font-size: 24px;">أدوات مصممة لك</h1>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        pptides ليس مجرد مكتبة — هو مساعدك الشخصي في رحلة الببتيدات:
      </p>
      <div style="margin: 20px 0;">
        <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 12px 0;">
          <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 0 0 8px;">🤖 المدرب الذكي</p>
          <p style="color: #44403c; font-size: 15px; margin: 0;">
            اسأل أي سؤال عن الببتيدات واحصل على إجابة فورية مدعومة بالأبحاث. مثل وجود خبير متاح 24/7.
          </p>
        </div>
        <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 12px 0;">
          <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 0 0 8px;">💊 حاسبة الجرعات</p>
          <p style="color: #44403c; font-size: 15px; margin: 0;">
            أدخل الببتيد وتركيز المحلول وشاهد الجرعة بالضبط على السيرنج — بدون حسابات يدوية.
          </p>
        </div>
        <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 12px 0;">
          <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 0 0 8px;">⚠️ فاحص التفاعلات</p>
          <p style="color: #44403c; font-size: 15px; margin: 0;">
            تأكد من أن الببتيدات التي تستخدمها متوافقة مع بعضها — سلامتك أولاً.
          </p>
        </div>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        ${emailButton('جرّب المدرب الذكي', `${APP_URL}/coach`)}
      </div>
    `,
  },
  {
    key: 'day3_trial_ending',
    delayHours: 72,
    subject: '⏰ تجربتك المجانية تنتهي اليوم',
    skipSubscribed: true,
    buildHtml: () => `
      <h1 style="color: #1c1917; font-size: 24px;">تجربتك المجانية تنتهي اليوم</h1>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        خلال الأيام الثلاثة الماضية، كان بإمكانك الوصول إلى:
      </p>
      <ul style="color: #44403c; font-size: 15px; line-height: 2;">
        <li>بروتوكولات كاملة لـ ${PEPTIDE_COUNT}+ ببتيد</li>
        <li>المدرب الذكي بالذكاء الاصطناعي</li>
        <li>حاسبة الجرعات التفاعلية</li>
        <li>فاحص التفاعلات الدوائية</li>
        <li>دليل التحاليل المخبرية</li>
      </ul>
      <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 14px; color: #44403c; margin: 0 0 8px;">اشترك الآن بأقل من ثمن كوب قهوة يوميًا</p>
        <p style="font-size: 32px; font-weight: 900; color: #059669; margin: 0;">${ESSENTIALS_PRICE}<span style="font-size: 16px; font-weight: normal;">/شهر</span></p>
        <p style="font-size: 13px; color: #78716c; margin: 8px 0 0;">ضمان استرداد كامل — بدون أي مخاطرة</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        ${emailButton('اشترك الآن', `${APP_URL}/pricing`)}
      </div>
      <p style="color: #44403c; font-size: 15px; text-align: center; font-weight: bold;">
        انضم لمئات المحترفين الذين يعتمدون على pptides
      </p>
    `,
  },
  {
    key: 'day5_winback',
    delayHours: 120,
    subject: 'لا زلنا هنا من أجلك 💚',
    skipSubscribed: true,
    buildHtml: () => `
      <h1 style="color: #1c1917; font-size: 24px;">نشتاق لك</h1>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        لاحظنا أنك لم تشترك بعد — وهذا طبيعي تمامًا. نحن هنا عندما تكون جاهزًا.
      </p>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        لكن هذا ما تفوّته الآن:
      </p>
      <div style="background: #f5f5f4; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          ❌ بروتوكولات ${PEPTIDE_COUNT}+ ببتيد مع جرعات وتوقيت دقيق
        </p>
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          ❌ المدرب الذكي — إجابات فورية على أسئلتك
        </p>
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          ❌ حاسبة الجرعات وفاحص التفاعلات
        </p>
        <p style="margin: 8px 0; font-size: 15px; color: #44403c;">
          ❌ تحديثات مستمرة بأحدث الأبحاث العلمية
        </p>
      </div>
      <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
        كل هذا بـ <strong style="color: #059669;">${ESSENTIALS_PRICE}/شهر فقط</strong> — مع ضمان استرداد كامل.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        ${emailButton('عد إلى pptides', `${APP_URL}/pricing`)}
      </div>
      <p style="color: #78716c; font-size: 13px; text-align: center;">
        إذا كان لديك أي سؤال، تواصل معنا: contact@pptides.com
      </p>
    `,
  },
]

// ── Main handler ────────────────────────────────────────────────────────────

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
      console.error('onboarding-drip: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (!expectedSecret) {
      console.error('onboarding-drip: CRON_SECRET not configured')
      return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cronSecret = req.headers.get('x-cron-secret')
    if (!cronSecret || !constantTimeCompare(cronSecret, expectedSecret)) {
      console.error('onboarding-drip: invalid cron secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.error('onboarding-drip: RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date()

    // Batch-fetch all auth users
    const userIdToEmail = new Map<string, { email: string; createdAt: string }>()
    let page = 1
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !users || users.length === 0) break
      for (const u of users) {
        if (u.email && u.created_at) {
          userIdToEmail.set(u.id, { email: u.email, createdAt: u.created_at })
        }
      }
      if (users.length < 1000) break
      page++
    }

    if (userIdToEmail.size === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, failed: 0, message: 'No users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all active/trial subscriptions to know who's subscribed
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, status')
      .in('status', ['active', 'trial'])

    const subscribedUserIds = new Set(
      (activeSubscriptions ?? []).map((s: { user_id: string }) => s.user_id)
    )

    // Fetch all already-sent drip emails in one query
    const { data: sentDrips } = await supabase
      .from('drip_emails_sent')
      .select('user_id, email_key')

    const sentSet = new Set(
      (sentDrips ?? []).map((d: { user_id: string; email_key: string }) => `${d.user_id}:${d.email_key}`)
    )

    let sent = 0
    let skipped = 0
    let failed = 0

    // Process each user
    for (const [userId, userData] of userIdToEmail) {
      const signupTime = new Date(userData.createdAt)
      if (isNaN(signupTime.getTime())) continue

      const hoursSinceSignup = (now.getTime() - signupTime.getTime()) / (1000 * 60 * 60)

      for (const drip of dripEmails) {
        // Check if it's time to send this drip
        // Send if enough time has passed but not more than delayHours + 48h (window)
        if (hoursSinceSignup < drip.delayHours) continue
        if (hoursSinceSignup > drip.delayHours + 48) continue

        // Check if already sent
        const dedupKey = `${userId}:${drip.key}`
        if (sentSet.has(dedupKey)) continue

        // Skip subscribed users for winback/trial-ending emails
        if (drip.skipSubscribed && subscribedUserIds.has(userId)) {
          skipped++
          continue
        }

        // Try to insert dedup record (unique constraint catches races)
        const { error: dedupErr } = await supabase
          .from('drip_emails_sent')
          .insert({ user_id: userId, email_key: drip.key })

        if (dedupErr) {
          if (dedupErr.code === '23505') {
            // Already sent (race condition)
            skipped++
            continue
          }
          console.error(`onboarding-drip: dedup insert failed for ${userId}/${drip.key}:`, dedupErr)
          failed++
          continue
        }

        // Send the email
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'pptides <noreply@pptides.com>',
              reply_to: 'contact@pptides.com',
              to: userData.email,
              subject: drip.subject,
              headers: {
                'List-Unsubscribe': '<mailto:contact@pptides.com?subject=unsubscribe>',
              },
              html: emailWrapper(drip.buildHtml()),
            }),
          })

          if (emailRes.ok) {
            sent++
            console.log(`onboarding-drip: sent ${drip.key} to ${userData.email}`)
          } else {
            const errBody = await emailRes.text().catch(() => '')
            console.error(`onboarding-drip: Resend error for ${userData.email}/${drip.key}:`, emailRes.status, errBody)
            // Rollback dedup so we can retry next invocation
            await supabase.from('drip_emails_sent').delete()
              .eq('user_id', userId)
              .eq('email_key', drip.key)
              .catch(() => {})
            failed++
          }
        } catch (sendErr) {
          console.error(`onboarding-drip: fetch error for ${userData.email}/${drip.key}:`, sendErr)
          await supabase.from('drip_emails_sent').delete()
            .eq('user_id', userId)
            .eq('email_key', drip.key)
            .catch(() => {})
          failed++
        }
      }
    }

    console.log(`onboarding-drip: complete — sent=${sent}, skipped=${skipped}, failed=${failed}`)

    return new Response(JSON.stringify({ sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('onboarding-drip: unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
