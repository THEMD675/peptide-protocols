/**
 * Admin authentication for edge functions.
 * Verifies the requesting user is in the ADMIN_EMAILS list.
 */

import { getAuthUser } from './supabase.ts'
import { getCorsHeaders, jsonResponse } from './cors.ts'

const DEFAULT_ADMIN_EMAILS = [
  'abdullah@amirisgroup.co',
  'abdullahalameer@gmail.com',
  'contact@pptides.com',
]

function getAdminEmails(): string[] {
  const whitelist = Deno.env.get('ADMIN_EMAIL_WHITELIST')
  if (!whitelist?.trim()) return DEFAULT_ADMIN_EMAILS
  return whitelist.split(',').map((e) => e.trim()).filter(Boolean)
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
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return { user: null, error: jsonResponse({ error: 'Forbidden' }, 403, cors) }
  }

  return { user: { id: user.id, email: user.email! }, error: null }
}
