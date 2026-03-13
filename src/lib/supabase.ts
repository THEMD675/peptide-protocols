import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[pptides] FATAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

// Bypass Web Locks API — some browsers (Safari <16.4, SSR) don't support navigator.locks.
// Trade-off: concurrent tabs may race on token refresh. Acceptable for this app's usage pattern.
const noopLock: <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R> =
  async (_name, _acquireTimeout, fn) => fn();

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      lock: noopLock,
    },
  },
);

if (supabaseUrl && typeof window !== 'undefined') {
  fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: supabaseAnonKey || '' },
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    if (err instanceof TypeError) {
      toast.error(
        'يبدو أن مانع الإعلانات يحجب الاتصال — يرجى تعطيله لاستخدام التطبيق',
        { duration: 15000, id: 'adblocker-warning' },
      );
    }
  });
}
