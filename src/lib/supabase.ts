import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[pptides] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — Supabase client will use placeholder (non-functional).');
}

// Bypass Web Locks API — some browsers (Safari <16.4, SSR) don't support navigator.locks.
// Trade-off: concurrent tabs may race on token refresh. Acceptable for this app's usage pattern.
const noopLock: <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R> =
  async (_name, _acquireTimeout, fn) => fn();

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      lock: noopLock,
    },
  },
);

// Supabase health check with exponential backoff (max 3 retries)
export let supabaseHealthy = true;
let healthCheckDone = false;

async function checkSupabaseHealth(attempt = 0): Promise<void> {
  const MAX_RETRIES = 3;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: supabaseAnonKey || '' },
    });
    if (!res.ok && attempt < MAX_RETRIES) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise(r => setTimeout(r, delay));
      return checkSupabaseHealth(attempt + 1);
    }
    supabaseHealthy = res.ok;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise(r => setTimeout(r, delay));
      return checkSupabaseHealth(attempt + 1);
    }
    supabaseHealthy = false;
    if (err instanceof TypeError) {
      toast.error(
        'يبدو أن مانع الإعلانات يحجب الاتصال — يرجى تعطيله لاستخدام التطبيق',
        { duration: 15000, id: 'adblocker-warning' },
      );
    }
  }
}

/**
 * Global auth-error handler for Supabase query results.
 * Call after any `.from()` query to catch expired-session errors
 * and show a toast with a login button instead of a cryptic message.
 */
export function handleAuthError(error: { message?: string; code?: string; status?: number } | null): boolean {
  if (!error) return false;
  const isAuthError =
    error.message?.includes('JWT') ||
    error.message?.includes('token') ||
    error.code === 'PGRST301' ||
    error.status === 401;
  if (isAuthError) {
    toast.error('انتهت جلستك — أعد تسجيل الدخول', {
      id: 'session-expired',
      duration: 10000,
      action: {
        label: 'تسجيل الدخول',
        onClick: () => { window.location.href = '/login'; },
      },
    });
    return true;
  }
  return false;
}

if (supabaseUrl && typeof window !== 'undefined' && !healthCheckDone) {
  healthCheckDone = true;
  checkSupabaseHealth();
  // Re-check when user comes back online
  window.addEventListener('online', () => checkSupabaseHealth(), { once: false });
}
