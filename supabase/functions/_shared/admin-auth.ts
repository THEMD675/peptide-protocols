/**
 * Admin authentication for edge functions.
 * Verifies the requesting user is in the ADMIN_EMAILS list.
 */

import { getAuthUser } from './supabase.ts'
import { getCorsHeaders, jsonResponse } from './cors.ts'

function getAdminEmails(): string[] {
  const whitelist = Deno.env.get('ADMIN_EMAIL_WHITELIST')
  if (!whitelist?.trim()) {
    console.error('ADMIN_EMAIL_WHITELIST not set — no admin access possible')
    return []
  }
  return whitelist.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export const ADMIN_EMAILS = getAdminEmails()

/**
 * Verify the request is from an authenticated admin.
 * Returns the user if valid, or a Response to return immediately if not.
 */
export async function requireAdmin(req: Request): Promise<
  | { user: { id: string; email: string }; error: null }
  | { user: null; error: Response }
> {
  const cors = getCorsHeaders(req)

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { user: null, error: jsonResponse({ error: 'Unauthorized' }, 401, cors) }
  }

  const user = await getAuthUser(req)
  if (!user || !user.email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
    return { user: null, error: jsonResponse({ error: 'Forbidden' }, 403, cors) }
  }

  return { user: { id: user.id, email: user.email }, error: null }
}
