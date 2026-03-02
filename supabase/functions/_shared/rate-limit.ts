/**
 * Shared rate limiting for edge functions.
 * Uses the rate_limits table in Supabase.
 */

import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitOptions {
  /** Unique endpoint identifier (e.g. 'create-checkout', 'ai-coach') */
  endpoint: string
  /** User or IP identifier */
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
    const { count, error } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
      .eq('user_id', identifier)
      .gte('created_at', windowStart)

    if (error) {
      console.error(`rate-limit check failed for ${endpoint}:`, error.message)
      return true // fail open — don't block users on DB errors
    }

    if ((count ?? 0) >= maxRequests) return false

    // Record this request
    await supabase
      .from('rate_limits')
      .insert({ user_id: identifier, endpoint })
      .catch(e => console.error(`rate-limit insert failed for ${endpoint}:`, e))

    return true
  } catch (e) {
    console.error(`rate-limit error for ${endpoint}:`, e)
    return true // fail open
  }
}
