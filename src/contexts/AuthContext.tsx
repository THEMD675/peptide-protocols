import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

type SubscriptionTier = 'free' | 'essentials' | 'elite';

interface Subscription {
  status: 'trial' | 'active' | 'expired' | 'none';
  tier: SubscriptionTier;
  trialDaysLeft: number;
  isProOrTrial: boolean;
  isPaidSubscriber: boolean;
}

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeTo: (tier: 'essentials' | 'elite') => void;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  status: 'none',
  tier: 'free',
  trialDaysLeft: 0,
  isProOrTrial: false,
  isPaidSubscriber: false,
};

const STRIPE_LINKS: Record<'essentials' | 'elite', string> = {
  essentials: import.meta.env.VITE_STRIPE_ESSENTIALS_LINK ?? '',
  elite: import.meta.env.VITE_STRIPE_ELITE_LINK ?? '',
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

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
  } else if (dbStatus === 'trial' || dbStatus === 'active' || dbStatus === 'expired' || dbStatus === 'cancelled') {
    status = dbStatus as Subscription['status'];
  } else {
    status = 'none';
  }

  const periodEnd = row.current_period_end ? new Date(row.current_period_end as string) : null;
  const cancelledButActive = status === 'expired' && periodEnd && periodEnd.getTime() > now.getTime();

  const isProOrTrial =
    (status === 'trial' && trialDaysLeft > 0) || status === 'active' || cancelledButActive;
  const isPaidSubscriber = status === 'active' || cancelledButActive;

  return { status, tier, trialDaysLeft, isProOrTrial, isPaidSubscriber };
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return;
      setSubscription(buildSubscription(data));
    } catch (e) {
      
      setSubscription(DEFAULT_SUBSCRIPTION);
    }
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success' || !user) return;

    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('tier');
    window.history.replaceState({}, '', url.toString());

    fetchSubscription(user.id);
    import('sonner').then(m => m.toast.success('شكرًا! جارٍ تفعيل اشتراكك...'));
  }, [user, fetchSubscription]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const mapped = mapUser(session.user);
        setUser(mapped);
        if (mapped) await fetchSubscription(mapped.id);
      }
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
      }
    );

    return () => authListener.unsubscribe();
  }, [fetchSubscription]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'البريد أو كلمة المرور غير صحيحة'
          : error.message,
      );
    }
  };

  const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { signed_up_at: new Date().toISOString() } },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered'))
        throw new Error('هذا البريد مسجّل مسبقًا');
      throw new Error(error.message);
    }
    if (data.user && !data.session) {
      throw new Error('تم إرسال رابط التأكيد لبريدك. تحقق من بريدك الإلكتروني.');
    }

    if (data.user) {
      try {
        const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
        fetch(edgeFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email, name: '' }),
        });
      } catch {}
    }
  };

  const logout = async () => {
    setUser(null);
    setSubscription(DEFAULT_SUBSCRIPTION);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // noop
    }
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    window.location.href = '/';
  };

  const upgradeTo = (tier: 'essentials' | 'elite') => {
    const link = STRIPE_LINKS[tier];
    if (!link) {
      import('sonner').then(m => m.toast.error('عذرًا — رابط الدفع غير متاح حاليًا. تواصل معنا: contact@pptides.com'));
      return;
    }

    const url = new URL(link);
    if (user?.id) url.searchParams.set('client_reference_id', user.id);
    if (user?.email) url.searchParams.set('prefilled_email', user.email);
    window.location.href = url.toString();
  };

  return (
    <AuthContext.Provider
      value={{ user, subscription, isLoading, login, signup, logout, upgradeTo }}
    >
      {children}
    </AuthContext.Provider>
  );
}
