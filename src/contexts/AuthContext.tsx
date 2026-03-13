import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { Sentry } from '@/lib/sentry';
import { events } from '@/lib/analytics';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

type SubscriptionTier = 'free' | 'essentials' | 'elite';

export interface Subscription {
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'none';
  tier: SubscriptionTier;
  trialDaysLeft: number;
  isProOrTrial: boolean;
  isPaidSubscriber: boolean;
  isTrial: boolean;
  currentPeriodEnd?: string;
  /** true when user has gone through Stripe checkout (card on file) */
  hasStripeSubscription: boolean;
  /** true when user is in trial but hasn't entered a credit card yet */
  needsPaymentSetup: boolean;
  /** true when subscription was granted manually (admin), not via Stripe */
  isAdminGrant: boolean;
}

interface User {
  id: string;
  email: string;
  provider: string;
}

export interface AuthContextType {
  user: User | null;
  subscription: Subscription;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeTo: (tier: 'essentials' | 'elite', billing?: 'monthly' | 'annual', coupon?: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  status: 'none',
  tier: 'free',
  trialDaysLeft: 0,
  isProOrTrial: false,
  isPaidSubscriber: false,
  isTrial: false,
  hasStripeSubscription: false,
  needsPaymentSetup: false,
  isAdminGrant: false,
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
  return { id: su.id, email: su.email, provider: su.app_metadata?.provider ?? 'email' };
}

/** @internal exported for testing */
// eslint-disable-next-line react-refresh/only-export-components
export function buildSubscription(row: Record<string, unknown> | null): Subscription {
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

  const rawTrialEnd = row.trial_ends_at as string | undefined;
  const hasTimezone = rawTrialEnd ? (rawTrialEnd.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(rawTrialEnd)) : false;
  const trialEndsAtUtc = rawTrialEnd ? new Date(hasTimezone ? rawTrialEnd : rawTrialEnd + 'Z') : null;
  const nowUtcMs = Date.now();
  const trialDaysLeft = trialEndsAtUtc
    ? Math.max(0, Math.ceil((trialEndsAtUtc.getTime() - nowUtcMs) / (1000 * 60 * 60 * 24)))
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
  const hasRemainingPeriod = periodEnd != null && periodEnd.getTime() > nowUtcMs;
  const cancelledButActive = (status === 'cancelled' || status === 'expired') && hasRemainingPeriod;

  const pastDueGrace = status === 'past_due' && periodEnd != null &&
    (periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000) > nowUtcMs;

  const isProOrTrial =
    (status === 'trial' && trialDaysLeft > 0) || status === 'active' || pastDueGrace || cancelledButActive;
  const isPaidSubscriber = status === 'active' || status === 'past_due' || cancelledButActive;

  const isTrial = status === 'trial' && trialDaysLeft > 0;

  const currentPeriodEnd = row.current_period_end ? (row.current_period_end as string) : undefined;

  const hasStripeSubscription = !!(row.stripe_subscription_id);
  const needsPaymentSetup = isTrial && !hasStripeSubscription;
  const isAdminGrant = row.grant_source === 'admin' || (!hasStripeSubscription && status === 'active' && tier !== 'free' && !isTrial);

  return { status, tier, trialDaysLeft, isProOrTrial, isPaidSubscriber, isTrial, currentPeriodEnd, hasStripeSubscription, needsPaymentSetup, isAdminGrant };
}


function clearPptidesStorage() {
  const PRESERVE = ['pptides_age_verified', 'pptides_cookie_consent', 'pptides_theme'];
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('pptides_') && !PRESERVE.includes(k))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* restricted env */ }
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (e) { if (i === retries) throw e; await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); }
  }
  throw new Error('unreachable');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);
  const subFetchFailCountRef = useRef(0);

  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      // Guard: only query subscriptions when there's a valid session (prevents 401 for logged-out users)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscription(DEFAULT_SUBSCRIPTION);
        subFetchFailCountRef.current = 0;
        return;
      }

      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from('subscriptions')
          .select('status, tier, trial_ends_at, stripe_subscription_id, current_period_end, referral_code, grant_source, billing_interval, referred_by')
          .eq('user_id', userId)
          .maybeSingle()
      );
      if (error) {
        if (error?.message?.includes('JWT') || (error as Record<string, unknown>)?.status === 401) {
          // Attempt session refresh before giving up
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            toast.success('تم تجديد جلستك');
            // Retry the subscription fetch with the refreshed session
            try {
              const { data: retryData, error: retryError } = await supabase
                .from('subscriptions')
                .select('status, tier, trial_ends_at, stripe_subscription_id, current_period_end, referral_code, grant_source, billing_interval, referred_by')
                .eq('user_id', userId)
                .maybeSingle();
              if (!retryError) {
                setSubscription(buildSubscription(retryData));
                subFetchFailCountRef.current = 0;
                return;
              }
            } catch {
              // Fall through to error handling below
            }
            // JWT refresh succeeded but retry still failed — keep previous state
            subFetchFailCountRef.current += 1;
            toast.error('تعذّر تحديث حالة الاشتراك');
            if (subFetchFailCountRef.current >= 3) {
              setSubscription(DEFAULT_SUBSCRIPTION);
              subFetchFailCountRef.current = 0;
            }
            return;
          }
          // Refresh also failed — sign out
          toast.error('انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى');
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          setSubscription(DEFAULT_SUBSCRIPTION);
          subFetchFailCountRef.current = 0;
          return;
        }
        // Non-JWT error — keep previous state, increment failure counter
        Sentry.captureException(error);
        subFetchFailCountRef.current += 1;
        toast.error('تعذّر تحديث حالة الاشتراك');
        if (subFetchFailCountRef.current >= 3) {
          setSubscription(DEFAULT_SUBSCRIPTION);
          subFetchFailCountRef.current = 0;
        }
        return;
      }

      subFetchFailCountRef.current = 0;
      setSubscription(buildSubscription(data));
    } catch (err) {
      Sentry.captureException(err);
      subFetchFailCountRef.current += 1;
      toast.error('تعذّر تحديث حالة الاشتراك');
      if (subFetchFailCountRef.current >= 3) {
        toast.error('تعذّر تحميل بيانات الاشتراك. حاول تحديث الصفحة.');
        setSubscription(DEFAULT_SUBSCRIPTION);
        subFetchFailCountRef.current = 0;
      }
    }
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'cancelled') {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
      toast('تم إلغاء عملية الدفع. يمكنك المحاولة مرة أخرى.');
      return;
    }
    if (params.get('payment') === 'error') {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
      toast.error('تعذّر إتمام الدفع. تحقق من بطاقتك أو جرّب وسيلة دفع أخرى.');
      return;
    }
    if (params.get('payment') !== 'success' || !user) return;

    toast('شكرًا! جارٍ تفعيل اشتراكك...');

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
        const { data, error: pollError } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (pollError) { timer = setTimeout(poll, 5000); return; }
        if (data?.status === 'active' || data?.status === 'trial') {
          await fetchSubscription(user.id);
          cleanUrl();
          toast.success('تم تفعيل اشتراكك بنجاح!');
          if (window.location.pathname !== '/dashboard') {
            navigate('/dashboard');
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
  }, [user, fetchSubscription, navigate]);

  const hadSessionRef = useRef(false);
  const initDoneRef = useRef(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line prefer-const -- reassigned on line below
    let timeout: ReturnType<typeof setTimeout>;

    const syncProfile = (userId: string, su: SupabaseUser) => {
      const displayName = (su.user_metadata?.full_name ?? su.user_metadata?.name) as string | undefined;
      const dn = ((displayName && displayName.trim()) || su.email?.split('@')[0] || '').replace(/<[^>]+>/g, '').slice(0, 50);
      supabase.from('user_profiles').select('user_id').eq('user_id', userId).maybeSingle().then(({ data: existing }) => {
        if (existing) {
          supabase.from('user_profiles').update({ display_name: dn, updated_at: new Date().toISOString() }).eq('user_id', userId).catch((e) => console.warn('profile update failed:', e));
        } else {
          supabase.from('user_profiles').insert({ user_id: userId, display_name: dn, updated_at: new Date().toISOString() }).catch((e) => console.warn('profile insert failed:', e));
        }
      }).catch((e) => console.warn('profile check failed:', e));
    };

    const handleSession = async (session: Session | null, event?: string) => {
      if (session?.user) {
        hadSessionRef.current = true;
        const mapped = mapUser(session.user);
        setUser(mapped);
        if (mapped && !fetchingRef.current) {
          fetchingRef.current = true;
          try {
            await fetchSubscription(mapped.id);
          } finally {
            fetchingRef.current = false;
          }
          syncProfile(mapped.id, session.user);
        }
      } else {
        if (event === 'SIGNED_OUT' && hadSessionRef.current) {
          const currentPath = window.location.pathname + window.location.search;
          navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
        }
        hadSessionRef.current = false;
        setUser(null);
        setSubscription(DEFAULT_SUBSCRIPTION);
        if (event === 'SIGNED_OUT') clearPptidesStorage();
      }
    };

    const welcomeEmailSentRef = { current: false };

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'INITIAL_SESSION') {
          clearTimeout(timeout);
          await handleSession(session, event);
          initDoneRef.current = true;
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user && !welcomeEmailSentRef.current) {
          welcomeEmailSentRef.current = true;
          const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
          fetch(edgeFnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ email: session.user.email, name: session.user.user_metadata?.full_name ?? '' }),
          }).catch((e) => console.warn('Welcome email failed:', e));
        }

        await handleSession(session, event);
        if (!initDoneRef.current) {
          initDoneRef.current = true;
          setIsLoading(false);
        }
      }
    );

    const slowWarning = setTimeout(() => {
      if (!initDoneRef.current) {
        toast('جارٍ التحميل... يرجى الانتظار', { duration: 8000 });
      }
    }, 5000);

    timeout = setTimeout(() => {
      if (!initDoneRef.current) {
        console.warn('Auth init timeout (30s) — resolving with current state');
        initDoneRef.current = true;
        setIsLoading(false);
      }
    }, 30000);

    return () => { authListener.unsubscribe(); clearTimeout(timeout); clearTimeout(slowWarning); };
  }, [fetchSubscription, navigate]);

  const fetchSubRef = useRef(fetchSubscription);
  fetchSubRef.current = fetchSubscription;

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key?.startsWith('sb-') && user) {
        fetchSubRef.current(user.id);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [user]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setUser(null);
            setSubscription(DEFAULT_SUBSCRIPTION);
            toast.error('انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى');
          } else {
            fetchSubRef.current(user.id);
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('البريد أو كلمة المرور غير صحيحة — إذا سجّلت بـ Google جرّب زر Google أعلاه');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('يرجى تأكيد بريدك الإلكتروني أولًا — تحقق من صندوق الوارد');
      }
      if (error.message.includes('too many') || error.message.includes('rate limit')) {
        throw new Error('محاولات كثيرة — انتظر دقيقة وحاول مرة أخرى');
      }
      throw new Error(error.message);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { signed_up_at: new Date().toISOString() } },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered') || error.message.includes('already exists'))
        throw new Error('هذا البريد مسجّل مسبقًا — جرّب تسجيل الدخول');
      if (error.message.includes('weak') || error.message.includes('pwned') || error.message.includes('easy to guess'))
        throw new Error('كلمة المرور ضعيفة أو مسرّبة — اختر كلمة مرور أقوى وفريدة');
      if (error.message.includes('rate limit') || error.message.includes('too many'))
        throw new Error('محاولات كثيرة — انتظر دقيقة وحاول مرة أخرى');
      if (error.message.includes('invalid') || error.message.includes('Unable to validate'))
        throw new Error('البريد الإلكتروني غير صحيح — تحقق من الكتابة');
      if (error.message.includes('signup_disabled'))
        throw new Error('التسجيل معطّل مؤقتًا — حاول لاحقًا');
      throw new Error('حدث خطأ في إنشاء الحساب. حاول مرة أخرى.');
    }
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      throw new Error('هذا البريد مسجّل مسبقًا — جرّب تسجيل الدخول أو استخدم Google');
    }
    if (data.user && !data.session) {
      throw new Error('تم إرسال رابط التأكيد لبريدك. تحقق من بريدك الإلكتروني.');
    }

    if (data.user) {
      let refCode: string | null = null;
      try { refCode = localStorage.getItem('pptides_referral'); } catch { /* expected */ }
      const validRef = refCode && /^PP-[A-Z0-9]{6}$/.test(refCode) ? refCode : null;

      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
      fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, name: '', referralCode: validRef }),
      }).catch(() => {});

      if (validRef) {
        events.referralConversion(validRef);
        try { localStorage.removeItem('pptides_referral'); } catch { /* expected */ }
      }
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
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => {
        if (name.includes('supabase-api')) caches.delete(name);
      })).catch(() => {});
    }
    try {
      clearPptidesStorage();
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
    } catch { /* expected in restricted environments */ }
    navigate('/');
  }, [navigate]);

  const refreshSubscription = useCallback(async () => {
    if (user) await fetchSubscription(user.id);
  }, [user, fetchSubscription]);

  useEffect(() => {
    if (!user || subscription.status !== 'trial' || subscription.trialDaysLeft <= 0) return;
    const interval = setInterval(() => { fetchSubscription(user.id); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, subscription.status, subscription.trialDaysLeft, fetchSubscription]);

  const upgradeTo = useCallback(async (tier: 'essentials' | 'elite', billing: 'monthly' | 'annual' = 'monthly', coupon?: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast.error('يرجى تسجيل الدخول أولًا');
        navigate('/login?redirect=/pricing');
        return;
      }
      let referralCode: string | undefined;
      try { const r = localStorage.getItem('pptides_referral'); if (r && /^PP-[A-Z0-9]{6}$/.test(r)) referralCode = r; } catch { /* expected */ }
      const body: Record<string, unknown> = { tier, billing };
      if (referralCode) body.referralCode = referralCode;
      if (coupon) body.coupon = coupon;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Checkout failed');
      }

      const data = await res.json();

      // Handle reactivation of cancelled-but-still-active subscription
      if (data.reactivated) {
        await refreshSubscription();
        toast.success('تم إعادة تفعيل اشتراكك بنجاح!');
        navigate('/dashboard');
        return;
      }

      if (!data.url) throw new Error('No checkout URL returned');

      window.location.href = data.url;
    } catch (e) {
      toast.error(`تعذّر التحويل لصفحة الدفع. تواصل معنا: ${SUPPORT_EMAIL}`);
      throw e;
    }
  }, [navigate, refreshSubscription]);

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
