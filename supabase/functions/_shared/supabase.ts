/**
 * Shared Supabase client factories for edge functions.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export { supabaseUrl, supabaseAnonKey, supabaseServiceKey }

/** Service-role client — full access, no RLS. Use for admin operations. */
export function getServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey)
}

/** User-scoped client — respects RLS. Pass the Authorization header from the request. */
export function getUserClient(authHeader: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

/** Extract the authenticated user from the request's Authorization header. Returns null if invalid. */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const client = getUserClient(authHeader)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null
  return user
}
