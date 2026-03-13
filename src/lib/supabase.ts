import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[pptides] FATAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

// Use Web Locks API when available (modern browsers), fall back to in-memory lock for Safari <16.4/SSR.
// In-memory lock prevents concurrent refresh within same tab; cross-tab races still possible on older browsers.
let inMemoryLockPromise: Promise<unknown> = Promise.resolve();
const safeLock: <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R> =
  typeof globalThis.navigator?.locks?.request === 'function'
    ? (name, acquireTimeout, fn) => navigator.locks.request(name, { signal: AbortSignal.timeout(acquireTimeout) }, () => fn())
    : async (_name, _acquireTimeout, fn) => {
        const prev = inMemoryLockPromise;
        let resolve: () => void;
        inMemoryLockPromise = new Promise<void>(r => { resolve = r; });
        await prev;
        try { return await fn(); } finally { resolve!(); }
      };

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      lock: safeLock,
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
