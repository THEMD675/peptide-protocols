import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightIfOptions, jsonResponse } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/admin-auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pptides.com'

// --- Web Push helpers (RFC 8291 / RFC 8188 via web-push-compatible VAPID) ---

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importVapidKeys() {
  const rawPrivate = base64UrlDecode(VAPID_PRIVATE_KEY)
  const rawPublic = base64UrlDecode(VAPID_PUBLIC_KEY)

  // Build JWK for the P-256 private key
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(rawPublic.slice(1, 33)),
    y: base64UrlEncode(rawPublic.slice(33, 65)),
    d: base64UrlEncode(rawPrivate),
  }

  const privateKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )

  return { privateKey, rawPublic }
}

async function createVapidAuthHeader(endpoint: string) {
  const { privateKey, rawPublic } = await importVapidKeys()
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`

  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:contact@pptides.com',
  }

  const enc = new TextEncoder()
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    enc.encode(unsignedToken)
  )

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature)
  let r: Uint8Array, s: Uint8Array
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32)
    s = sigBytes.slice(32, 64)
  } else {
    // DER format
    const rLen = sigBytes[3]
    const rStart = 4
    const rBytes = sigBytes.slice(rStart, rStart + rLen)
    const sLen = sigBytes[rStart + rLen + 1]
    const sStart = rStart + rLen + 2
    const sBytes = sigBytes.slice(sStart, sStart + sLen)
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes
    if (r.length < 32) { const p = new Uint8Array(32); p.set(r, 32 - r.length); r = p }
    if (s.length < 32) { const p = new Uint8Array(32); p.set(s, 32 - s.length); s = p }
  }
  const rawSig = new Uint8Array(64)
  rawSig.set(r, 0)
  rawSig.set(s, 32)

  const jwt = `${unsignedToken}.${base64UrlEncode(rawSig)}`

  return {
    authorization: `vapid t=${jwt}, k=${base64UrlEncode(rawPublic)}`,
  }
}

async function sendWebPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string): Promise<{ ok: boolean; status: number; statusText: string }> {
  // Generate encryption keys for aes128gcm (RFC 8188)
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const localPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey))

  const clientPublicKey = await crypto.subtle.importKey(
    'raw', base64UrlDecode(subscription.keys.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey }, localKeyPair.privateKey, 256
  ))

  const authSecret = base64UrlDecode(subscription.keys.auth)

  // HKDF helper
  async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm))
    const key2 = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const infoLen = new Uint8Array([...info, 1])
    const okm = new Uint8Array(await crypto.subtle.sign('HMAC', key2, infoLen))
    return okm.slice(0, length)
  }

  const enc = new TextEncoder()
  const clientPublicRaw = base64UrlDecode(subscription.keys.p256dh)

  // IKM for the PRK
  const ikmInfo = new Uint8Array([
    ...enc.encode('WebPush: info\0'),
    ...clientPublicRaw,
    ...localPublicRaw,
  ])
  const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32)

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Derive content encryption key and nonce
  const cekInfo = new Uint8Array([...enc.encode('Content-Encoding: aes128gcm\0')])
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0')])
  const cek = await hkdf(salt, ikm, cekInfo, 16)
  const nonce = await hkdf(salt, ikm, nonceInfo, 12)

  // Build aes128gcm header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = 4096
  const rsBytes = new Uint8Array(4)
  new DataView(rsBytes.buffer).setUint32(0, rs)
  const header = new Uint8Array([
    ...salt,
    ...rsBytes,
    localPublicRaw.length,
    ...localPublicRaw,
  ])

  // Pad + encrypt payload
  const payloadBytes = enc.encode(payload)
  const paddedPayload = new Uint8Array([...payloadBytes, 2]) // delimiter byte

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload
  ))

  const body = new Uint8Array([...header, ...encrypted])

  const vapidHeaders = await createVapidAuthHeader(subscription.endpoint)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      ...vapidHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'normal',
    },
    body,
  })

  return { ok: res.ok, status: res.status, statusText: res.statusText }
}

// --- Main handler ---

serve(async (req) => {
  const preflight = handleCorsPreflightIfOptions(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Server misconfigured' }, 500, corsHeaders)
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('send-push: VAPID keys not configured')
      return jsonResponse({ error: 'Push service not configured' }, 500, corsHeaders)
    }

    // Auth: either admin (with bearer token) or cron (with x-cron-secret)
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedCronSecret = Deno.env.get('CRON_SECRET')

    let isAuthorized = false

    if (cronSecret && expectedCronSecret) {
      // Constant-time compare for cron secret
      if (cronSecret.length === expectedCronSecret.length) {
        let result = 0
        for (let i = 0; i < cronSecret.length; i++) {
          result |= cronSecret.charCodeAt(i) ^ expectedCronSecret.charCodeAt(i)
        }
        isAuthorized = result === 0
      }
    }

    if (!isAuthorized) {
      const admin = await requireAdmin(req)
      if (admin.error) return admin.error
      isAuthorized = true
    }

    if (!isAuthorized) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // Rate limit: 10 per caller per hour
    {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const callerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('cf-connecting-ip')
        ?? 'cron'
      const allowed = await checkRateLimit(supabase, {
        endpoint: 'send-push',
        identifier: callerIp,
        windowSeconds: 3600,
        maxRequests: 10,
      })
      if (!allowed) {
        return jsonResponse({ error: 'Rate limited' }, 429, corsHeaders)
      }
    }

    let body: { user_ids?: string[]; user_id?: string; title: string; body: string; url?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders)
    }

    const { title, body: pushBody, url } = body
    if (!title || !pushBody) {
      return jsonResponse({ error: 'Missing title or body' }, 400, corsHeaders)
    }

    // Resolve user IDs
    const userIds: string[] = body.user_ids ?? (body.user_id ? [body.user_id] : [])
    if (userIds.length === 0) {
      return jsonResponse({ error: 'Missing user_id or user_ids' }, 400, corsHeaders)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch push subscriptions for all target users
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_id, push_subscription')
      .in('user_id', userIds)
      .not('push_subscription', 'is', null)

    if (fetchError) {
      console.error('send-push: failed to fetch subscriptions:', fetchError)
      return jsonResponse({ error: 'Database error' }, 500, corsHeaders)
    }

    if (!profiles || profiles.length === 0) {
      return jsonResponse({ sent: 0, failed: 0, no_subscription: userIds.length }, 200, corsHeaders)
    }

    const payload = JSON.stringify({ title, body: pushBody, url: url ?? `${APP_URL}/dashboard` })

    let sent = 0
    let failed = 0
    const expiredUsers: string[] = []

    for (const profile of profiles) {
      const sub = profile.push_subscription
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        failed++
        continue
      }

      try {
        const result = await sendWebPush(sub, payload)
        if (result.ok) {
          sent++
        } else if (result.status === 410 || result.status === 404) {
          // Subscription expired — clean up
          expiredUsers.push(profile.user_id)
          failed++
        } else {
          console.error(`send-push: failed for user ${profile.user_id}: ${result.status} ${result.statusText}`)
          failed++
        }
      } catch (e) {
        console.error(`send-push: error for user ${profile.user_id}:`, e)
        failed++
      }
    }

    // Clean up expired subscriptions
    if (expiredUsers.length > 0) {
      await supabase
        .from('user_profiles')
        .update({ push_subscription: null, updated_at: new Date().toISOString() })
        .in('user_id', expiredUsers)
        .then(() => console.log(`send-push: cleaned up ${expiredUsers.length} expired subscriptions`))
        .catch(e => console.error('send-push: cleanup error:', e))
    }

    return jsonResponse({
      sent,
      failed,
      no_subscription: userIds.length - profiles.length,
      expired_cleaned: expiredUsers.length,
    }, 200, corsHeaders)
  } catch (error) {
    console.error('send-push unhandled error:', error)
    return jsonResponse({ error: 'Internal error' }, 500, corsHeaders)
  }
})
