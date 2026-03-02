/**
 * Shared rate limiting for edge functions.
 * Uses the rate_limits table in Supabase.
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
 * Check and record a rate limit entry.
 * Returns true if the request is allowed, false if rate-limited.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  options: RateLimitOptions,
): Promise<boolean> {
  const { endpoint, identifier, windowSeconds, maxRequests } = options

  try {
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

    // Use user_id (uuid) or ip_address (text) based on identifier format
    const record = isUuid(identifier)
      ? { user_id: identifier, ip_address: null }
      : { user_id: null, ip_address: identifier }

    const query = supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart)

    const { count, error } = isUuid(identifier)
      ? await query.eq('user_id', identifier)
      : await query.eq('ip_address', identifier)

    if (error) {
      console.error(`rate-limit check failed for ${endpoint}:`, error.message)
      return false // fail closed — deny on DB errors
    }

    if ((count ?? 0) >= maxRequests) return false

    // Record this request. Note: non-atomic with count check — concurrent requests
    // may both pass; acceptable for typical rate-limit use. For strict atomicity,
    // use an RPC that does check-and-insert in a single transaction.
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({ ...record, endpoint })

    if (insertError) {
      console.error(`rate-limit insert failed for ${endpoint}:`, insertError.message)
      return false // fail closed
    }

    return true
  } catch (e) {
    console.error(`rate-limit error for ${endpoint}:`, e)
    return false // fail closed
  }
}
