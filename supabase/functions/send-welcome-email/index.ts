import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/send-email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'
// SOURCE OF TRUTH: must match src/lib/constants.ts (peptides.length)
const PEPTIDE_COUNT = parseInt(Deno.env.get('PEPTIDE_COUNT') ?? '41', 10)
// SOURCE OF TRUTH: 34 SAR = 1 month Essentials; override via ESSENTIALS_PRICE_DISPLAY env
const ESSENTIALS_PRICE = Deno.env.get('ESSENTIALS_PRICE_DISPLAY') ?? '34 ر.س'
import { getCorsHeaders, handleCorsPreflightIfOptions } from '../_shared/cors.ts'
import { emailWrapper, emailButton } from '../_shared/email-template.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('send-welcome-email: missing SUPABASE_URL or SUPABASE_ANON_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('send-welcome-email auth failed:', authError?.message ?? 'no user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (serviceKey) {
      const serviceDb = createClient(supabaseUrl, serviceKey)
      const allowed = await checkRateLimit(serviceDb, {
        endpoint: 'send-welcome-email',
        identifier: user.id,
        windowSeconds: 3600,
        maxRequests: 3,
      })
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Email already sent' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    let rawBody: string
    try {
      rawBody = await req.text()
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to read request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (rawBody.length > 10_000) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: { email?: string; name?: string; referralCode?: string }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, name, referralCode } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (email !== user.email) {
      return new Response(JSON.stringify({ error: 'Email mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceRoleKey) {
      console.error('send-welcome-email: SUPABASE_SERVICE_ROLE_KEY not set — skipping trial fix')
    }
    const serviceSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

    const fixTrialDuration = async () => {
      if (!serviceSupabase) return
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        const { data: subRow, error: selectErr } = await serviceSupabase
          .from('subscriptions')
          .select('id, created_at, trial_ends_at')
          .eq('user_id', user.id)
          .maybeSingle()
        if (selectErr) { console.error('fixTrialDuration select error:', selectErr); continue }
        if (!subRow) continue
        if (subRow.created_at && subRow.trial_ends_at) {
          const created = new Date(subRow.created_at).getTime()
          const trialEnd = new Date(subRow.trial_ends_at).getTime()
          const days = (trialEnd - created) / 86400000
          if (days > 4) {
            const correct = new Date(created + 3 * 86400000).toISOString()
            const { error: updateErr } = await serviceSupabase.from('subscriptions').update({ trial_ends_at: correct }).eq('id', subRow.id)
            if (updateErr) console.error('fixTrialDuration update error:', updateErr)
          }
        }
        break
      }
    }
    await fixTrialDuration().catch(e => console.error('trial fix failed:', e))

    let trialEndDate = new Date(Date.now() + 3 * 86400000)
    if (serviceSupabase) {
      try {
        const { data: subRow } = await serviceSupabase
          .from('subscriptions')
          .select('trial_ends_at')
          .eq('user_id', user.id)
          .maybeSingle()
        if (subRow?.trial_ends_at) {
          trialEndDate = new Date(subRow.trial_ends_at as string)
        }
      } catch { /* use default */ }
    }
    const trialEndFormatted = trialEndDate.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const rawName = name || email.split('@')[0]
    const displayName = rawName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .slice(0, 50)

    const emailResult = await sendEmail({
      to: email,
      subject: 'مرحبًا بك في pptides — تجربتك المجانية بدأت الآن',
      html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا، ${displayName}</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              تجربتك المجانية في pptides بدأت الآن — أمامك حتى <strong style="color: #059669;">${trialEndFormatted}</strong> لاستكشاف أشمل دليل عربي للببتيدات العلاجية.
            </p>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: bold;">تنتهي تجربتك يوم ${trialEndFormatted} — استفد من كل دقيقة</p>
            </div>
            <p style="color: #44403c; font-size: 15px; line-height: 1.8; font-weight: bold;">خطتك حتى ${trialEndFormatted}:</p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <p style="margin: 10px 0; font-size: 15px;">
                <strong style="color: #059669;">اليوم الأول:</strong> تصفّح <a href="${APP_URL}/library" style="color: #059669; font-weight: bold;">مكتبة ${PEPTIDE_COUNT}+ ببتيد</a> — اكتشف البروتوكول المناسب لهدفك
              </p>
              <p style="margin: 10px 0; font-size: 15px;">
                <strong style="color: #059669;">اليوم الثاني:</strong> اسأل <a href="${APP_URL}/coach" style="color: #059669; font-weight: bold;">المدرب الذكي</a> — احصل على بروتوكول مخصّص بالجرعات والتوقيت
              </p>
              <p style="margin: 10px 0; font-size: 15px;">
                <strong style="color: #059669;">اليوم الثالث:</strong> جرّب <a href="${APP_URL}/calculator" style="color: #059669; font-weight: bold;">حاسبة الجرعات</a> — شاهد جرعتك بالضبط على السيرنج
              </p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              ${emailButton('ابدأ الآن', `${APP_URL}/dashboard`)}
            </div>
            <p style="color: #78716c; font-size: 13px; line-height: 1.6; margin-top: 24px;">
              بعد انتهاء التجربة (${trialEndFormatted})، يمكنك الاشتراك بـ ${ESSENTIALS_PRICE}/شهر للاحتفاظ بالوصول الكامل. ضمان استرداد كامل — بدون أسئلة.
            </p>
        `),
      replyTo: 'contact@pptides.com',
    })

    if (!emailResult.ok) {
      console.error('send-welcome-email error:', emailResult.error)
      return new Response(JSON.stringify({ error: 'Email service error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = { ok: true }

    // Handle referral tracking with service role (bypasses RLS)
    if (referralCode && /^PP-[A-Z0-9]{6}$/.test(referralCode) && serviceSupabase) {
      try {
        // Find the referrer by their referral code
        const { data: referrerSub } = await serviceSupabase
          .from('subscriptions')
          .select('user_id')
          .eq('referral_code', referralCode)
          .maybeSingle()

        if (referrerSub?.user_id && referrerSub.user_id !== user.id) {
          // Self-referral prevention: skip if referrer is the same as the new user
          const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com']
          const referrerDomain = email.split('@')[1]?.toLowerCase()
          let flagForReview = false

          // Check if both are free email providers with matching domains (potential abuse)
          if (referrerDomain && FREE_EMAIL_DOMAINS.includes(referrerDomain)) {
            const { data: referrerProfile } = await serviceSupabase.auth.admin.getUserById(referrerSub.user_id)
            const referrerEmail = referrerProfile?.user?.email
            if (referrerEmail) {
              const referrerEmailDomain = referrerEmail.split('@')[1]?.toLowerCase()
              if (referrerEmailDomain === referrerDomain) {
                flagForReview = true
              }
            }
          }

          // Insert a new referral row (this is what was missing — rows were never created)
          await serviceSupabase.from('referrals').insert({
            referrer_id: referrerSub.user_id,
            referred_id: user.id,
            referral_code: referralCode,
            referred_email: email,
            status: flagForReview ? 'pending_review' : 'signed_up',
          }).catch(() => {})

          // Mark the new user's subscription as referred
          await serviceSupabase
            .from('subscriptions')
            .update({ referred_by: referralCode })
            .eq('user_id', user.id)
            .catch(() => {})
        }
      } catch (refErr) {
        console.error('referral tracking failed:', refErr)
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-welcome-email unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
