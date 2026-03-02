import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Sentry will capture downstream auth/data failures
}

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

if (supabaseUrl && typeof window !== 'undefined') {
  fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: supabaseAnonKey || '' },
  }).catch((err) => {
    if (err instanceof TypeError) {
      toast.error(
        'يبدو أن مانع الإعلانات يحجب الاتصال — يرجى تعطيله لاستخدام التطبيق',
        { duration: 15000, id: 'adblocker-warning' },
      );
    }
  });
}
