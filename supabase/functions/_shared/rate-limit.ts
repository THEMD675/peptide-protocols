/**
 * Shared rate limiting for edge functions.
 *
 * Uses check_and_record_rate_limit() — an atomic PostgreSQL RPC that wraps
 * the count-check and insert in a single transaction-scoped advisory lock,
 * eliminating the race condition that allowed concurrent requests to bypass
 * the limit via the old non-atomic count-then-insert approach.
 */

import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

interface RateLimitOptions {
  /** Unique endpoint identifier (e.g. 'create-checkout', 'ai-coach') */
  endpoint: string
  /** User ID (UUID) or IP address */
  identifier: string
  /** Time window in seconds */
  windowSeconds: number
  /** Max requests allowed in the window */
  maxRequests: number
}

/**
 * Atomically check and record a rate-limit entry.
 * Returns true if the request is allowed, false if rate-limited.
 *
 * Uses check_and_record_rate_limit() RPC which acquires a transaction-scoped
 * advisory lock, making the check+insert atomic and race-condition-free.
 * Falls back to deny (fail-closed) on any DB error.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  options: RateLimitOptions,
): Promise<boolean> {
  const { endpoint, identifier, windowSeconds, maxRequests } = options

  try {
    const isUser = isUuid(identifier)

    const { data, error } = await supabase.rpc('check_and_record_rate_limit', {
      p_endpoint:   endpoint,
      p_user_id:    isUser ? identifier : null,
      p_ip_address: isUser ? null : identifier,
      p_window_sec: windowSeconds,
      p_max_req:    maxRequests,
    })

    if (error) {
      console.error(`rate-limit RPC failed for ${endpoint}:`, error.message)
      return false // fail closed — deny on DB errors
    }

    return data === true
  } catch (e) {
    console.error(`rate-limit error for ${endpoint}:`, e)
    return false // fail closed
  }
}
