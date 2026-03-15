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
      console.error('abandoned-checkout-recovery: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (!expectedSecret) {
      console.error('abandoned-checkout-recovery: CRON_SECRET not configured')
      return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cronSecret = req.headers.get('x-cron-secret')
    if (!cronSecret || !constantTimeCompare(cronSecret, expectedSecret)) {
      console.error('abandoned-checkout-recovery: invalid cron secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find abandoned checkouts: not yet emailed, not recovered,
    // created between 1h and 48h ago (give them 1h before emailing, max 48h window)
    const { data: abandoned, error: fetchErr } = await supabase
      .from('abandoned_checkouts')
      .select('id, user_id, email, tier')
      .is('recovery_email_sent_at', null)
      .eq('recovered', false)
      .gt('created_at', new Date(Date.now() - 48 * 3600000).toISOString())
      .lt('created_at', new Date(Date.now() - 1 * 3600000).toISOString())

    if (fetchErr) {
      console.error('abandoned-checkout-recovery: query failed:', fetchErr)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!abandoned || abandoned.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No abandoned checkouts to recover' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Filter out users who opted out of email notifications
    const abandonedUserIds = abandoned.map(r => r.user_id).filter(Boolean) as string[]
    const optedOutSet = new Set<string>()
    if (abandonedUserIds.length > 0) {
      const { data: optedOut } = await supabase
        .from('user_profiles')
        .select('user_id')
        .in('user_id', abandonedUserIds)
        .eq('email_notifications_enabled', false)
      for (const p of optedOut ?? []) optedOutSet.add(p.user_id)
    }

    let sent = 0
    let skipped = 0

    for (const record of abandoned) {
      if (record.user_id && optedOutSet.has(record.user_id)) { skipped++; continue }

      // Skip if user already has an active subscription
      if (record.user_id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', record.user_id)
          .maybeSingle()

        if (sub && (sub.status === 'active' || sub.status === 'trial')) {
          // User already subscribed — mark as recovered, skip email
          await supabase.from('abandoned_checkouts')
            .update({ recovered: true })
            .eq('id', record.id)
          skipped++
          continue
        }
      }

      // Send recovery email
      const emailResult = await sendEmail({
        to: record.email,
        subject: 'ما زلنا ننتظرك',
        tags: [{ name: 'type', value: 'abandoned_checkout' }, { name: 'category', value: 'retention' }],
        html: emailWrapper(`
            <h1 style="color: #1c1917; font-size: 24px;">ما زلنا ننتظرك!</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">لاحظنا أنك بدأت رحلتك مع pptides لكن لم تكمل الاشتراك.</p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0; font-size: 15px; color: #44403c;"><strong style="color: #059669;">تجربة مجانية ٣ أيام</strong> — استكشف مكتبة الببتيدات الكاملة بدون أي التزام</p>
              <p style="margin: 8px 0; font-size: 15px; color: #44403c;"><strong style="color: #059669;">🤖 المدرب الذكي</strong> — احصل على بروتوكول مخصّص لأهدافك الصحية</p>
              <p style="margin: 8px 0; font-size: 15px; color: #44403c;"><strong style="color: #059669;">📚 محتوى علمي موثّق</strong> — أشمل دليل عربي للببتيدات العلاجية</p>
            </div>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">ابدأ تجربتك المجانية اليوم — إلغاء في أي وقت خلال ٣ أيام بدون أي رسوم.</p>
            <div style="text-align: center; margin: 24px 0;">
              ${emailButton('ابدأ التجربة المجانية', `${APP_URL}/pricing`)}
            </div>
            <p style="color: #78716c; font-size: 13px;">إذا كنت بحاجة للمساعدة: contact@pptides.com</p>
          `),
        replyTo: 'contact@pptides.com',
      }).catch(e => { console.error(`abandoned-checkout-recovery: email failed for ${record.email}:`, e); return null })

      if (emailResult?.ok) {
        await supabase.from('abandoned_checkouts')
          .update({ recovery_email_sent_at: new Date().toISOString() })
          .eq('id', record.id)
        sent++
      } else if (emailResult) {
        console.error(`abandoned-checkout-recovery: email error for ${record.email}:`, emailResult.error)
      }
    }

    console.log(`abandoned-checkout-recovery: sent=${sent}, skipped=${skipped}, total=${abandoned.length}`)

    return new Response(JSON.stringify({ sent, skipped, total: abandoned.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('abandoned-checkout-recovery: unhandled error:', (error as Error).message)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
