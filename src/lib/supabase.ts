import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

const noopLock: <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R> =
  async (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    lock: noopLock,
  },
});
