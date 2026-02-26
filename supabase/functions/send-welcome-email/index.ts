import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const ALLOWED_ORIGINS = ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    if (!RESEND_API_KEY) {
      console.error('send-welcome-email: RESEND_API_KEY is not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
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

    let body: { email?: string; name?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, name } = body

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

    // Fix trial duration: ensure 3 days, not 7
    const serviceSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: subRow } = await serviceSupabase
      .from('subscriptions')
      .select('id, created_at, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (subRow?.created_at && subRow?.trial_ends_at) {
      const created = new Date(subRow.created_at).getTime()
      const trialEnd = new Date(subRow.trial_ends_at).getTime()
      const days = (trialEnd - created) / (86400000)
      if (days > 4) {
        const correct = new Date(created + 3 * 86400000).toISOString()
        await serviceSupabase.from('subscriptions').update({ trial_ends_at: correct }).eq('id', subRow.id)
      }
    }

    const rawName = name || email.split('@')[0]
    const displayName = rawName.replace(/[<>"'&]/g, '')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'pptides <noreply@pptides.com>',
        to: email,
        subject: 'مرحبًا في pptides — رحلتك مع الببتيدات تبدأ الآن',
        html: `
          <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1c1917; font-size: 24px;">مرحبًا، ${displayName}</h1>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              شكرًا لانضمامك إلى pptides — أشمل دليل عربي للببتيدات العلاجية.
            </p>
            <p style="color: #44403c; font-size: 16px; line-height: 1.8;">
              حسابك جاهز. إليك كيف تبدأ:
            </p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>1.</strong> تصفّح <a href="https://pptides.com/library" style="color: #059669;">مكتبة 41+ ببتيد</a></p>
              <p style="margin: 8px 0;"><strong>2.</strong> جرّب <a href="https://pptides.com/calculator" style="color: #059669;">حاسبة الجرعات المجانية</a></p>
              <p style="margin: 8px 0;"><strong>3.</strong> اسأل <a href="https://pptides.com/coach" style="color: #059669;">المدرب الذكي</a> عن أي ببتيد</p>
            </div>
            <a href="https://pptides.com/library" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 16px;">
              ابدأ الاستكشاف
            </a>
            <p style="color: #a8a29e; font-size: 12px; margin-top: 30px;">
              pptides.com — محتوى تعليمي بحثي. استشر طبيبك قبل استخدام أي ببتيد.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('send-welcome-email Resend error:', res.status, errBody)
      return new Response(JSON.stringify({ error: 'Email service error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
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
