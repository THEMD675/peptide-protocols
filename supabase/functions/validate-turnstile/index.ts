import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflightIfOptions, getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { getServiceClient } from '../_shared/supabase.ts'

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    const admin = getServiceClient()

    // Rate limit: 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const allowed = await checkRateLimit(admin, {
      endpoint: 'validate-turnstile',
      identifier: ip,
      windowSeconds: 60,
      maxRequests: 10,
    })
    if (!allowed) {
      return jsonResponse({ error: 'Rate limited — try again shortly' }, 429, corsHeaders)
    }

    const body = await req.json().catch(() => ({}))
    const token = body.token as string | undefined

    if (!token) {
      return jsonResponse({ success: false, error: 'Missing turnstile token' }, 400, corsHeaders)
    }

    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!secretKey) {
      // If no secret key configured, allow through (graceful degradation)
      console.warn('TURNSTILE_SECRET_KEY not set — skipping server-side validation')
      return jsonResponse({ success: true }, 200, corsHeaders)
    }

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const result = await verifyResponse.json()

    if (!result.success) {
      console.warn('Turnstile validation failed:', result['error-codes'])
      return jsonResponse({ success: false, error: 'فشل التحقق الأمني — حاول مرة أخرى' }, 403, corsHeaders)
    }

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (error) {
    console.error('Turnstile validation error:', error)
    return jsonResponse({ success: false, error: 'خطأ في التحقق' }, 500, corsHeaders)
  }
})
