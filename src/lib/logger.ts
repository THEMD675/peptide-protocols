/**
 * Errors always log (dev + prod) so we have visibility into production issues.
 * Warnings log in dev + prod. Debug only in dev.
 *
 * In production, errors are also posted to Supabase `client_errors` table
 * via REST API (fire-and-forget, no import of supabase.ts to avoid circular deps).
 */

const recentHashes = new Set<string>();
const MAX_HASHES = 20;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function postToSupabase(msg: string, err?: unknown): void {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    const errorStr = err instanceof Error ? err.message : err ? String(err) : '';
    const hash = hashString(`${msg}:${errorStr}`);

    if (recentHashes.has(hash)) return;
    recentHashes.add(hash);
    if (recentHashes.size > MAX_HASHES) {
      const first = recentHashes.values().next().value;
      if (first !== undefined) recentHashes.delete(first);
    }

    const stack = err instanceof Error ? err.stack?.slice(0, 2000) : undefined;

    fetch(`${supabaseUrl}/rest/v1/client_errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        message: `${msg} ${errorStr}`.slice(0, 1000),
        stack: stack ?? null,
        url: globalThis.location?.href?.slice(0, 500) ?? null,
        user_agent: globalThis.navigator?.userAgent?.slice(0, 500) ?? null,
      }),
    }).catch(() => { /* fire-and-forget */ });
  } catch {
    /* never throw from logger */
  }
}

export function logError(msg: string, err?: unknown): void {
  console.error(msg, err);
  if (import.meta.env.PROD) {
    postToSupabase(msg, err);
  }
}

export function logWarn(msg: string, data?: unknown): void {
  console.warn(msg, data);
}

export function logDebug(msg: string, data?: unknown): void {
  if (import.meta.env.DEV) console.warn('[debug]', msg, data);
}
