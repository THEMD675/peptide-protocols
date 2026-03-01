import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SUPPORT_EMAIL } from '@/lib/constants';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

type SubscriptionTier = 'free' | 'essentials' | 'elite';

export interface Subscription {
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'none';
  tier: SubscriptionTier;
  trialDaysLeft: number;
  isProOrTrial: boolean;
  isPaidSubscriber: boolean;
  isTrial: boolean;
}

interface User {
  id: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  subscription: Subscription;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeTo: (tier: 'essentials' | 'elite') => void;
  refreshSubscription: () => Promise<void>;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  status: 'none',
  tier: 'free',
  trialDaysLeft: 0,
  isProOrTrial: false,
  isPaidSubscriber: false,
  isTrial: false,
};

const STRIPE_LINKS: Record<'essentials' | 'elite', string> = {
  essentials: import.meta.env.VITE_STRIPE_ESSENTIALS_LINK ?? '',
  elite: import.meta.env.VITE_STRIPE_ELITE_LINK ?? '',
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription(): Subscription {
  const { subscription } = useAuth();
  return subscription;
}

function mapUser(su: SupabaseUser | null): User | null {
  if (!su || !su.email) return null;
  return { id: su.id, email: su.email };
}

function buildSubscription(row: Record<string, unknown> | null): Subscription {
  if (!row) return DEFAULT_SUBSCRIPTION;

  const dbStatus = row.status as string;
  const rawTier = (row.tier as string) ?? 'free';

  const tierMap: Record<string, SubscriptionTier> = {
    free: 'free',
    pro: 'essentials',
    standard: 'essentials',
    essentials: 'essentials',
    premium: 'elite',
    vip: 'elite',
    elite: 'elite',
  };
  const tier = tierMap[rawTier] ?? 'free';

  const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at as string) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  let status: Subscription['status'];
  if (dbStatus === 'trial' && trialDaysLeft <= 0) {
    status = 'expired';
  } else if (dbStatus === 'trial' || dbStatus === 'active' || dbStatus === 'past_due' || dbStatus === 'expired' || dbStatus === 'cancelled') {
    status = dbStatus as Subscription['status'];
  } else {
    status = 'none';
  }

  const periodEnd = row.current_period_end ? new Date(row.current_period_end as string) : null;
  const hasRemainingPeriod = periodEnd != null && periodEnd.getTime() > now.getTime();
  const cancelledButActive = (status === 'cancelled' || status === 'expired') && hasRemainingPeriod;

  const pastDueGrace = status === 'past_due' && periodEnd != null &&
    (periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000) > now.getTime();

  const isProOrTrial =
    (status === 'trial' && trialDaysLeft > 0) || status === 'active' || pastDueGrace || cancelledButActive;
  const isPaidSubscriber = status === 'active' || status === 'past_due' || cancelledButActive;

  const isTrial = status === 'trial' && trialDaysLeft > 0;

  return { status, tier, trialDaysLeft, isProOrTrial, isPaidSubscriber, isTrial };
}


async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (e) { if (i === retries) throw e; await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); }
  }
  throw new Error('unreachable');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      );
      if (error) {
        if (error?.message?.includes('JWT') || (error as Record<string, unknown>)?.status === 401) {
          toast.error('انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى');
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          setSubscription(DEFAULT_SUBSCRIPTION);
          return;
        }
        setSubscription(DEFAULT_SUBSCRIPTION);
        return;
      }


      setSubscription(buildSubscription(data));
    } catch {
      toast.error('تعذّر تحميل بيانات الاشتراك. حاول تحديث الصفحة.');
      setSubscription(DEFAULT_SUBSCRIPTION);
    }
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success' || !user) return;

    toast.success('شكرًا! جارٍ تفعيل اشتراكك...');

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      url.searchParams.delete('tier');
      window.history.replaceState({}, '', url.toString());
    };

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      if (cancelled) return;
      attempts++;
      if (attempts % 4 === 0) toast('لا زلنا نتحقق... يرجى الانتظار');
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (data?.status === 'active' || data?.status === 'trial') {
          await fetchSubscription(user.id);
          cleanUrl();
          toast.success('تم تفعيل اشتراكك بنجاح!');
          if (window.location.pathname === '/pricing') {
            window.location.href = '/dashboard';
          }
          return;
        }
        if (attempts < 20) { timer = setTimeout(poll, Math.min(3000 * Math.pow(1.5, attempts - 1), 15000)); }
        else {
          await fetchSubscription(user.id);
          cleanUrl();
          toast.error(`تعذّر تفعيل الاشتراك تلقائيًا. تواصل معنا: ${SUPPORT_EMAIL}`);
        }
      } catch {
        if (cancelled) return;
        toast.error('تعذّر التحقق من حالة الاشتراك. حدّث الصفحة.');
        return;
      }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user, fetchSubscription]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        const mapped = mapUser(session.user);
        setUser(mapped);
        if (mapped) await fetchSubscription(mapped.id);
      }
      setIsLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setIsLoading(false);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user) {
          const mapped = mapUser(session.user);
          setUser(mapped);
          if (mapped) await fetchSubscription(mapped.id);
        } else {
          setUser(null);
          setSubscription(DEFAULT_SUBSCRIPTION);
        }
        setIsLoading(false);
      }
    );

    return () => { authListener.unsubscribe(); clearTimeout(timeout); };
  }, [fetchSubscription]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key?.startsWith('sb-') && user) {
        fetchSubscription(user.id);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [user, fetchSubscription]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'البريد أو كلمة المرور غير صحيحة'
          : 'حدث خطأ في تسجيل الدخول. حاول مرة أخرى.',
      );
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { signed_up_at: new Date().toISOString() } },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered'))
        throw new Error('هذا البريد مسجّل مسبقًا');
      throw new Error('حدث خطأ في إنشاء الحساب. حاول مرة أخرى.');
    }
    if (data.user && !data.session) {
      throw new Error('تم إرسال رابط التأكيد لبريدك. تحقق من بريدك الإلكتروني.');
    }

    if (data.user) {
      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
      fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, name: '' }),
      }).catch(() => {});
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setSubscription(DEFAULT_SUBSCRIPTION);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // noop
    }
    try {
      const appKeys = Object.keys(localStorage).filter(k =>
        k.startsWith('pptides_coach_') || k.startsWith('pptides_calc_') ||
        k === 'pptides_favorites' || k === 'pptides_visited' || k === 'pptides_quiz_answers'
      );
      appKeys.forEach(k => localStorage.removeItem(k));
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
    } catch { /* expected in restricted environments */ }
    window.location.href = '/';
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (user) await fetchSubscription(user.id);
  }, [user, fetchSubscription]);

  const upgradeTo = useCallback((tier: 'essentials' | 'elite') => {
    const link = STRIPE_LINKS[tier];
    if (!link) {
      toast.error(`عذرًا — رابط الدفع غير متاح حاليًا. تواصل معنا: ${SUPPORT_EMAIL}`);
      return;
    }

    const url = new URL(link);
    if (user?.id) url.searchParams.set('client_reference_id', user.id);
    if (user?.email) url.searchParams.set('prefilled_email', user.email);
    window.location.href = url.toString();
  }, [user]);

  const contextValue = useMemo(
    () => ({ user, subscription, isLoading, login, signup, logout, upgradeTo, refreshSubscription }),
    [user, subscription, isLoading, login, signup, logout, upgradeTo, refreshSubscription],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
