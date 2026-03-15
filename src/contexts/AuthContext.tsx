import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SUPPORT_EMAIL, REFERRAL_CODE_REGEX } from '@/lib/constants';
import { events } from '@/lib/analytics';
import { logError } from '@/lib/logger';
import { timeoutSignal } from '@/lib/utils';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

/** Fire-and-forget fetch with 1 retry after 5s delay */
function fireAndForgetFetch(url: string, opts: RequestInit, label: string) {
  const attempt = (n: number) => {
    fetch(url, opts).catch((e) => {
      logError(`${label} attempt ${n} failed:`, e);
      if (n < 2) setTimeout(() => attempt(n + 1), 5000);
    });
  };
  attempt(1);
}

type SubscriptionTier = 'free' | 'essentials' | 'elite';

export interface Subscription {
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'disputed' | 'none';
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
  cancelReason?: string;
}

interface User {
  id: string;
  email: string;
  provider: string;
}

export interface AuthContextType {
  user: User | null;
  subscription: Subscription;
  subscriptionError: boolean;
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

  if (dbStatus === 'trial' && !rawTrialEnd) {
    console.warn('[buildSubscription] trial status with null trial_ends_at — treating as expired. user row:', row);
  }

  let status: Subscription['status'];
  if (dbStatus === 'trial' && trialDaysLeft <= 0) {
    status = 'expired';
  } else if (dbStatus === 'trial' || dbStatus === 'active' || dbStatus === 'past_due' || dbStatus === 'expired' || dbStatus === 'cancelled' || dbStatus === 'disputed') {
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
    (status === 'trial' && trialDaysLeft > 0) || status === 'active' || status === 'disputed' || pastDueGrace || cancelledButActive;
  const isPaidSubscriber = status === 'active' || status === 'past_due' || status === 'disputed' || cancelledButActive;

  const isTrial = status === 'trial' && trialDaysLeft > 0;

  const currentPeriodEnd = row.current_period_end ? (row.current_period_end as string) : undefined;

  const hasStripeSubscription = !!(row.stripe_subscription_id);
  const needsPaymentSetup = isTrial && !hasStripeSubscription;
  const isAdminGrant = row.grant_source?.toString().startsWith('admin') || (!hasStripeSubscription && status === 'active' && tier !== 'free' && !isTrial);

  const cancelReason = row.cancel_reason as string | undefined;

  return { status, tier, trialDaysLeft, isProOrTrial, isPaidSubscriber, isTrial, currentPeriodEnd, hasStripeSubscription, needsPaymentSetup, isAdminGrant, cancelReason };
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
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        ),
      ]);
      return result;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error('unreachable');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [subscriptionError, setSubscriptionError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const subFetchFailCountRef = useRef(0);
  const upgradingRef = useRef(false);
  const subChannelRef = useRef<BroadcastChannel | null>(null);

  const trialEventFiredRef = useRef(false);

  const fetchSubscription = useCallback(async (userId: string, isInitialFetch = false) => {
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
            toast.error('تعذّر تحديث حالة الاشتراك', { id: 'sub-fetch-error' });
            if (subFetchFailCountRef.current >= 3) {
              setSubscriptionError(true);
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
        logError('subscription fetch error', error);
        subFetchFailCountRef.current += 1;
        toast.error('تعذّر تحديث حالة الاشتراك', { id: 'sub-fetch-error' });
        if (subFetchFailCountRef.current >= 3) {
          setSubscriptionError(true);
        }
        return;
      }

      subFetchFailCountRef.current = 0;
      setSubscriptionError(false);

      let resolvedData = data;
      if (!resolvedData && isInitialFetch) {
        for (let retry = 0; retry < 3; retry++) {
          await new Promise(r => setTimeout(r, 2000));
          const { data: retryData } = await supabase
            .from('subscriptions')
            .select('status, tier, trial_ends_at, stripe_subscription_id, current_period_end, referral_code, grant_source, billing_interval, referred_by')
            .eq('user_id', userId)
            .maybeSingle();
          if (retryData) { resolvedData = retryData; break; }
        }
        if (!resolvedData) {
          toast.error(`تعذّر تحميل اشتراكك. تواصل مع الدعم: ${SUPPORT_EMAIL}`, { id: 'sub-missing', duration: Infinity });
        }
      }

      const built = buildSubscription(resolvedData);
      setSubscription(built);

      // Broadcast subscription changes to other tabs
      try {
        subChannelRef.current?.postMessage({ type: 'subscription-updated', subscription: built });
      } catch { /* ignore */ }

      // Fire trial_started event once per session when a trial is first detected
      if (built.isTrial && !trialEventFiredRef.current) {
        trialEventFiredRef.current = true;
        events.trialStarted(built.tier);
      }
    } catch (err) {
      logError('subscription fetch failed', err);
      subFetchFailCountRef.current += 1;
      toast.error('تعذّر تحديث حالة الاشتراك', { id: 'sub-fetch-error' });
      if (subFetchFailCountRef.current >= 3) {
        setSubscriptionError(true);
      }
    }
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle OAuth callback errors (e.g. Google sign-in failure)
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('error_code');
      url.searchParams.delete('error_description');
      window.history.replaceState({}, '', url.toString());
      const msg = oauthError.includes('denied') || oauthError.includes('cancelled')
        ? 'تم إلغاء تسجيل الدخول — حاول مرة أخرى'
        : 'تعذّر تسجيل الدخول — حاول مرة أخرى أو استخدم البريد وكلمة المرور';
      toast.error(msg, { id: 'oauth-error', duration: 10000 });
      return;
    }

    if (params.get('payment') === 'cancelled' && window.location.pathname !== '/pricing') {
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
    // Let PaymentProcessing handle payment=success exclusively — avoid double polling
    if (params.get('payment') === 'success') return;
  }, [user, fetchSubscription, navigate]);

  const hadSessionRef = useRef(false);
  const initDoneRef = useRef(false);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const welcomeEmailSentRef = useRef(
    (() => { try { return sessionStorage.getItem('pptides_welcome_sent') === '1'; } catch { return false; } })()
  );

  useEffect(() => {
    // eslint-disable-next-line prefer-const -- reassigned on line below
    let timeout: ReturnType<typeof setTimeout>;

    const syncProfile = async (userId: string, su: SupabaseUser) => {
      try {
        const displayName = (su.user_metadata?.full_name ?? su.user_metadata?.name) as string | undefined;
        const dn = ((displayName && displayName.trim()) || su.email?.split('@')[0] || '').replace(/<[^>]+>/g, '').slice(0, 50);
        const { data: existing } = await supabase.from('user_profiles').select('user_id').eq('user_id', userId).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('user_profiles').update({ display_name: dn, updated_at: new Date().toISOString() }).eq('user_id', userId);
          if (error) logError('profile update failed:', error);
        } else {
          const { error } = await supabase.from('user_profiles').insert({ user_id: userId, display_name: dn, updated_at: new Date().toISOString() });
          if (error) logError('profile insert failed:', error);
        }
      } catch (e) {
        logError('profile sync failed:', e);
      }
    };

    const handleSession = async (session: Session | null, event?: string) => {
      if (session?.user) {
        hadSessionRef.current = true;
        const mapped = mapUser(session.user);
        if (event === 'SIGNED_IN') setIsLoading(true);
        setUser(mapped);
        if (mapped) {
          if (fetchPromiseRef.current && mapped.id === lastFetchedUserIdRef.current) {
            await fetchPromiseRef.current;
          } else {
            const p = fetchSubscription(mapped.id, true);
            fetchPromiseRef.current = p;
            lastFetchedUserIdRef.current = mapped.id;
            try { await p; } finally { fetchPromiseRef.current = null; }
          }
          if (event === 'SIGNED_IN') setIsLoading(false);
          syncProfile(mapped.id, session.user);
        } else {
          if (event === 'SIGNED_IN') setIsLoading(false);
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

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'INITIAL_SESSION') {
          clearTimeout(timeout);
          // 16.2: If initial session is null but localStorage has tokens, attempt refresh
          if (!session) {
            try {
              const hasTokens = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
              if (hasTokens) {
                const { data: refreshData } = await supabase.auth.refreshSession();
                if (refreshData?.session) {
                  await handleSession(refreshData.session, event);
                  initDoneRef.current = true;
                  setIsLoading(false);
                  return;
                }
              }
            } catch {
              // Refresh failed — proceed with null session
            }
          }
          await handleSession(session, event);
          initDoneRef.current = true;
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user && !welcomeEmailSentRef.current) {
          welcomeEmailSentRef.current = true;
          try { sessionStorage.setItem('pptides_welcome_sent', '1'); } catch { /* restricted env */ }
          const isOAuth = session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email';
          if (isOAuth) {
            const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
            fireAndForgetFetch(edgeFnUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ email: session.user.email, name: session.user.user_metadata?.full_name ?? '', referralCode: (() => { try { const r = localStorage.getItem('pptides_referral'); return r && /^PP-[A-Z0-9]{6}$/i.test(r) ? r : undefined; } catch { return undefined; } })() }),
            }, 'Welcome email (OAuth SIGNED_IN)');
          }
        }

        await handleSession(session, event);

        if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
          const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
          const isNewUser = Date.now() - createdAt < 60_000;
          if (isNewUser && window.location.pathname !== '/dashboard') {
            navigate('/dashboard', { replace: true });
          }
        }

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
        if (fetchPromiseRef.current) {
          // Subscription fetch still in flight — re-schedule to check again in 10s
          timeout = setTimeout(() => {
            initDoneRef.current = true;
            setIsLoading(false);
          }, 10000);
          return;
        }
        logError('Auth init timeout (30s) — resolving with current state');
        initDoneRef.current = true;
        setIsLoading(false);
      }
    }, 30000);

    return () => { authListener.unsubscribe(); clearTimeout(timeout); clearTimeout(slowWarning); };
  }, [fetchSubscription, navigate]);

  const fetchSubRef = useRef(fetchSubscription);
  fetchSubRef.current = fetchSubscription;

  // BroadcastChannel for cross-tab subscription sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const channel = new BroadcastChannel('pptides-subscription');
      subChannelRef.current = channel;
      channel.onmessage = (e: MessageEvent<{ type: string; subscription?: Subscription }>) => {
        if (e.data?.type === 'subscription-updated' && e.data.subscription) {
          setSubscription(e.data.subscription);
        }
      };
    } catch { /* ignore */ }
    return () => {
      subChannelRef.current?.close();
      subChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    const handler = (e: StorageEvent) => {
      if (!e.key?.startsWith('sb-')) return;
      // 16.5: Debounce storage events and check fetchingRef to prevent race conditions
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (fetchPromiseRef.current) return;
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          fetchSubRef.current(currentUser.id);
        } else {
          setUser(null);
          setSubscription(DEFAULT_SUBSCRIPTION);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }, 500);
    };
    window.addEventListener('storage', handler);
    return () => { window.removeEventListener('storage', handler); clearTimeout(debounceTimer); };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        if (subFetchFailCountRef.current >= 3) return;
        supabase.auth.refreshSession().then(({ data: { session } }) => {
          if (!user) return;
          if (!session) {
            setUser(null);
            setSubscription(DEFAULT_SUBSCRIPTION);
            toast.error('انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى');
          } else {
            fetchSubRef.current(session.user.id);
          }
        }).catch((err) => { logError('Visibility refresh failed:', err); });
      }
    };
    const handleOnline = () => {
      if (user && subFetchFailCountRef.current < 3) fetchSubRef.current(user.id);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
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
      const validRef = refCode && REFERRAL_CODE_REGEX.test(refCode) ? refCode.toUpperCase() : null;

      if (data.session?.access_token) {
        welcomeEmailSentRef.current = true;
        try { sessionStorage.setItem('pptides_welcome_sent', '1'); } catch { /* restricted env */ }
        const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
        fireAndForgetFetch(edgeFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, name: '', referralCode: validRef }),
        }, 'Welcome email (signup)');
      }

      if (validRef) {
        events.referralConversion(validRef);
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
      })).catch(e => logError('cache cleanup failed:', e));
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

  const pollTierRef = useRef<string>('none');
  useEffect(() => {
    if (!user) return;
    const isTrial = subscription.status === 'trial' && subscription.trialDaysLeft > 0;
    const isActive = subscription.status === 'active' || subscription.status === 'past_due';
    const isCancelledButActive = subscription.status === 'cancelled' && subscription.isPaidSubscriber;
    const tier = isTrial ? 'trial' : (isActive || isCancelledButActive) ? 'active' : 'none';
    if (tier === 'none') { pollTierRef.current = 'none'; return; }
    if (tier === pollTierRef.current) return;
    pollTierRef.current = tier;
    const intervalMs = tier === 'trial' ? 30_000 : 300_000;
    const jitter = Math.random() * intervalMs * 0.2;
    const interval = setInterval(() => {
      if (fetchPromiseRef.current) return;
      if (subFetchFailCountRef.current >= 3) return;
      fetchSubscription(user.id);
    }, intervalMs + jitter);
    return () => clearInterval(interval);
  }, [user, subscription.status, subscription.trialDaysLeft, subscription.isPaidSubscriber, fetchSubscription]);

  const upgradeTo = useCallback(async (tier: 'essentials' | 'elite', billing: 'monthly' | 'annual' = 'monthly', coupon?: string) => {
    if (upgradingRef.current) return;
    upgradingRef.current = true;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast.error('يرجى تسجيل الدخول أولًا');
        navigate('/login?redirect=/pricing');
        return;
      }
      let referralCode: string | undefined;
      try { const r = localStorage.getItem('pptides_referral'); if (r && REFERRAL_CODE_REGEX.test(r)) referralCode = r.toUpperCase(); } catch { /* expected */ }
      const body: Record<string, unknown> = { tier, billing };
      if (referralCode) body.referralCode = referralCode;
      if (coupon) body.coupon = coupon;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        signal: timeoutSignal(15000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Handle 401 — refresh JWT and retry once
        if (res.status === 401) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            const retryRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
              method: 'POST',
              signal: timeoutSignal(15000),
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${refreshData.session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify(body),
            });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              if (retryData.reactivated) { await refreshSubscription(); toast.success('تم إعادة تفعيل اشتراكك بنجاح!'); navigate('/dashboard'); return; }
              if (retryData.url) { window.location.href = retryData.url; return; }
            }
          }
          throw new Error('انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى');
        }
        const err = await res.json().catch(() => ({}));
        // Handle alreadySubscribed
        if (err.alreadySubscribed) {
          toast.info(err.error || 'لديك اشتراك فعّال بالفعل');
          await refreshSubscription();
          return;
        }
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
      const msg = e instanceof Error ? e.message : '';
      if (/coupon|promotion|discount/i.test(msg)) {
        toast.error('كود الخصم غير صالح أو منتهي الصلاحية. حاول بدون كود.');
      } else {
        toast.error(`تعذّر التحويل لصفحة الدفع. تواصل معنا: ${SUPPORT_EMAIL}`);
      }
      throw e;
    } finally {
      upgradingRef.current = false;
    }
  }, [navigate, refreshSubscription]);

  const handleSubErrorReload = useCallback(() => {
    subFetchFailCountRef.current = 0;
    setSubscriptionError(false);
    window.location.reload();
  }, []);

  const contextValue = useMemo(
    () => ({ user, subscription, subscriptionError, isLoading, login, signup, logout, upgradeTo, refreshSubscription }),
    [user, subscription, subscriptionError, isLoading, login, signup, logout, upgradeTo, refreshSubscription],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {subscriptionError && user && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 p-10 text-center shadow-2xl">
            <h2 className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">حدث خطأ في تحميل اشتراكك</h2>
            <p className="mb-6 text-stone-700 dark:text-stone-200">تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubErrorReload}
                className="inline-block rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98]"
              >
                إعادة تحميل
              </button>
              <button
                type="button"
                onClick={() => setSubscriptionError(false)}
                className="text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              >
                متابعة بدون تحديث
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
