import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { events } from '@/lib/analytics';
import { TRIAL_DAYS, SITE_URL } from '@/lib/constants';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
const GOOGLE_CLIENT_ID = '803062121443-7497cu9tfra080sr835benjs5gl9295o.apps.googleusercontent.com';

type Tab = 'login' | 'signup';

/** Validate redirect path: must start with "/" but not "//" (open redirect) */
function safeRedirect(raw: string | null, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback;
}

const friendlyError = (msg: string) => {
  const hasArabic = /[\u0600-\u06FF]/.test(msg);
  if (hasArabic) return msg;
  if (msg.includes('Invalid login')) return 'البريد أو كلمة المرور غير صحيحة — إذا سجّلت بـ Google جرّب زر Google أعلاه';
  if (msg.includes('Email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولًا — تحقق من صندوق الوارد والبريد المزعج';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'محاولات كثيرة — انتظر قليلًا وحاول مرة أخرى';
  if (msg.includes('email_address_invalid') || msg.includes('Unable to validate')) return 'البريد الإلكتروني غير صحيح — تأكد من الكتابة';
  if (msg.includes('weak_password') || msg.includes('Password should')) return 'كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل';
  if (msg.includes('signup_disabled')) return 'التسجيل معطّل مؤقتًا — حاول لاحقًا';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) return 'خطأ في الاتصال — تحقق من الإنترنت وحاول مرة أخرى';
  return 'تعذّر إتمام العملية — تحقق من اتصالك وحاول مرة أخرى';
};

export default function Login() {
  const location = useLocation();
  const isSignupRoute = location.pathname === '/signup';

  const [tab, setTab] = useState<Tab>(isSignupRoute ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Separate loading state for Google sign-in so it doesn't share with email form submit
  const [googleLoading, setGoogleLoading] = useState(false);
  // Separate loading state for "forgot password" so it doesn't spin the main submit button
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try { return parseInt(sessionStorage.getItem('pptides_failed_attempts') ?? '0', 10) || 0; } catch { return 0; }
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    try { return parseInt(sessionStorage.getItem('pptides_lockout_until') ?? '0', 10) || 0; } catch { return 0; }
  });
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const { login, signup, user } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  /** Switch tab, sync URL, clear errors + password, refocus email */
  const switchTab = useCallback((newTab: Tab) => {
    setTab(newTab);
    setError('');
    setResetMessage('');
    setInfoMessage('');
    // Clear password so a short login password doesn't silently disable the signup button
    setPassword('');
    navigate(newTab === 'login' ? '/login' : '/signup', { replace: true });
    requestAnimationFrame(() => emailRef.current?.focus());
  }, [navigate]);

  const resetTurnstile = useCallback(() => {
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId.current);
      setTurnstileToken(null);
    }
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    const renderWidget = () => {
      if (!turnstileRef.current || turnstileWidgetId.current) return;
      turnstileWidgetId.current = window.turnstile?.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(null),
        'expired-callback': () => setTurnstileToken(null),
        theme: 'light',
        size: 'flexible',
        language: 'ar',
      }) ?? null;
    };
    if (window.turnstile) { renderWidget(); return () => { turnstileWidgetId.current = null; }; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
    return () => {
      turnstileWidgetId.current = null;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);
  const navigate = useNavigate();
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => {
    clearTimeout(recoveryTimerRef.current);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('pptides_failed_attempts', String(failedAttempts)); } catch { /* expected */ }
  }, [failedAttempts]);
  useEffect(() => {
    try { sessionStorage.setItem('pptides_lockout_until', String(lockoutUntil)); } catch { /* expected */ }
  }, [lockoutUntil]);

  useEffect(() => {
    if (user && !isRecovery) {
      const redirectTo = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
      navigate(redirectTo, { replace: true });
    }
  }, [user, isRecovery, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle URL-based info messages (e.g. after email verification redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg === 'verified') {
      setInfoMessage('✓ تم تأكيد بريدك الإلكتروني — سجّل دخولك الآن');
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    } else if (msg === 'expired') {
      setInfoMessage('انتهت صلاحية الرابط — أدخل بريدك وانقر "نسيت كلمة المرور" للحصول على رابط جديد');
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsRecovery(false);
      setResetMessage('تم تغيير كلمة المرور بنجاح');
      setNewPassword('');
      // Redirect to dashboard (not landing page) after successful password reset
      recoveryTimerRef.current = setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? friendlyError(err.message) : 'تعذّر إتمام العملية — تحقق من اتصالك وحاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setInfoMessage('');

    if (!email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول');
      requestAnimationFrame(() => {
        document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    // Bug 10 fix: client-side email format validation before hitting the API
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('البريد الإلكتروني غير صحيح — تأكد من الكتابة');
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('يرجى إكمال التحقق الأمني');
      return;
    }

    if (tab === 'signup') {
      if (password.length < 8) {
        setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }
      if (!/[a-zA-Z]/.test(password)) {
        setError('كلمة المرور يجب أن تحتوي على حرف واحد على الأقل');
        return;
      }
      if (!/\d/.test(password)) {
        setError('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
        return;
      }
    }

    if (Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast.error(`حاول مرة أخرى بعد ${remaining} ثانية`);
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        events.login('email');
      } else {
        await signup(email, password);
        events.signup('email');
      }
      setFailedAttempts(0);
      // Bug 1 fix: do NOT navigate here — the useEffect watching `user` handles redirect
      // to honour the ?redirect= param once AuthContext sets user via onAuthStateChange.
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const msg = friendlyError(raw);
      if (raw.includes('رابط التأكيد') || raw.includes('تحقق من بريدك') || raw.includes('Email not confirmed') || raw.includes('تأكيد بريدك')) {
        setPendingVerification(true);
        return;
      } else if (raw.includes('already') || raw.includes('registered') || raw.includes('مسجّل')) {
        // Show inline error only and switch to login tab
        setError(msg);
        switchTab('login');
      } else {
        setError(msg);
      }
      const isConfirmation = raw.includes('رابط التأكيد') || raw.includes('تحقق من بريدك');
      if (!isConfirmation) {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= 5) {
          setLockoutUntil(Date.now() + 30000);
          setFailedAttempts(0);
          toast.error('محاولات كثيرة — انتظر 30 ثانية');
        }
      }
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In via ID Token (popup flow, no redirect/callback needed)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const initGoogle = () => {
      window.google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setError('');
          setGoogleLoading(true);
          try {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
            });
            if (error) throw error;
            events.login('google');
            // useEffect watching `user` handles redirect
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '';
            setError(friendlyError(msg));
            toast.error('تعذّر الدخول بـ Google — جرّب البريد وكلمة المرور');
          } finally {
            setGoogleLoading(false);
          }
        },
        auto_select: false,
        itp_support: true,
      });
      if (googleBtnRef.current) {
        // Bug 2 fix: clear container before each render to prevent duplicate buttons on tab switch
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          shape: 'rectangular',
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth,
          text: tab === 'login' ? 'signin_with' : 'signup_with',
          locale: 'ar',
        });
      }
    };
    if (window.google?.accounts?.id) {
      initGoogle();
      // Bug 3 fix: always return cleanup (no-op here since we didn't add a script)
      return () => {};
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [tab]);

  const handleResetPassword = async () => {
    setError('');
    setResetMessage('');
    if (!email.trim()) {
      setError('أدخل بريدك الإلكتروني أولاً ثم اضغط "نسيت كلمة المرور"');
      requestAnimationFrame(() => {
        emailRef.current?.focus();
        emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    // Use separate resetLoading so the main submit button isn't affected
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetMessage('تم إرسال رابط إعادة تعيين كلمة المرور — تحقق من مجلد البريد غير المرغوب فيه');
    } catch (err: unknown) {
      setError(err instanceof Error ? friendlyError(err.message) : 'تعذّر إتمام العملية — تحقق من اتصالك وحاول مرة أخرى');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast.success('تم إعادة إرسال رابط التأكيد — تحقق من بريدك');
      setResendCooldown(60);
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { if (resendIntervalRef.current) { clearInterval(resendIntervalRef.current); resendIntervalRef.current = null; } return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error('تعذّر إعادة الإرسال — حاول مرة أخرى');
    } finally {
      setResendLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-stone-950 px-4">
        <Helmet><title>تأكيد البريد الإلكتروني | pptides</title></Helmet>
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-lg">
            <div className="bg-emerald-600 px-6 pb-6 pt-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-stone-900/20">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="mb-1 text-2xl font-bold text-white">تحقق من بريدك الإلكتروني</h1>
              <p className="text-sm text-white/80">أرسلنا رابط التأكيد إلى</p>
              <p className="mt-1 text-sm font-bold text-white" dir="ltr">{email}</p>
            </div>
            <div className="px-6 pb-8 pt-6 text-center">
              <p className="mb-2 text-sm text-stone-600 dark:text-stone-300">اضغط على الرابط في البريد لتفعيل حسابك وبدء التجربة المجانية.</p>
              <p className="mb-6 text-xs text-stone-500 dark:text-stone-300">لم يصلك البريد؟ تحقق من مجلد البريد المزعج (Spam).</p>
              <button
                onClick={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0}
                className="mb-4 w-full rounded-full border-2 border-emerald-600 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 dark:bg-emerald-900/20 disabled:opacity-50"
              >
                {resendLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 dark:border-emerald-700 border-t-emerald-600" />
                    جارٍ الإرسال...
                  </span>
                ) : resendCooldown > 0 ? (
                  `إعادة الإرسال بعد ${resendCooldown} ثانية`
                ) : (
                  'إعادة إرسال رابط التأكيد'
                )}
              </button>
              <button
                onClick={() => { setPendingVerification(false); switchTab('login'); }}
                className="text-sm font-medium text-stone-500 dark:text-stone-300 hover:text-stone-700 dark:text-stone-200 transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-stone-950 px-4">
        <Helmet><title>تغيير كلمة المرور | pptides</title></Helmet>
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-lg">
            <div className="bg-emerald-600 px-6 pb-6 pt-8 text-center">
              <h1 className="mb-1 text-2xl font-bold text-white">تغيير كلمة المرور</h1>
              <p className="text-sm text-white/70">أدخل كلمة مرور جديدة لحسابك</p>
            </div>
            <div className="px-6 pb-8 pt-6">
              {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
              {resetMessage && <div role="status" aria-live="polite" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{resetMessage}</div>}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label htmlFor="recovery-password" className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">كلمة المرور الجديدة</label>
                  {/* Bug 7 fix: add show/hide toggle for recovery password field */}
                  <div className="relative">
                    <input
                      id="recovery-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      dir="ltr"
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 ps-12 text-left text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 outline-none transition-shadow focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(v => !v)}
                      className="absolute start-3 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors"
                      aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full rounded-full bg-emerald-600 py-3.5 text-base font-bold text-white shadow transition-transform hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      جارٍ التغيير...
                    </span>
                  ) : 'تغيير كلمة المرور'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-stone-950 px-4">
      <Helmet>
        <title>{`${tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'} | pptides`}</title>
        <meta name="description" content="سجّل دخولك أو أنشئ حساب جديد للوصول إلى مكتبة الببتيدات وحاسبة الجرعات والمدرب الذكي." />
        <meta property="og:title" content={`${tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'} | pptides`} />
        <meta property="og:description" content="سجّل دخولك أو أنشئ حساب جديد للوصول إلى مكتبة الببتيدات وحاسبة الجرعات والمدرب الذكي." />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
      </Helmet>
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-lg">
          <div className="bg-emerald-600 px-6 pb-6 pt-8 text-center">
            <h1 className="mb-1 text-2xl font-bold text-white">
              {tab === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}
            </h1>
            <p className="text-sm text-white/70">
              {tab === 'login'
                ? 'سجّل دخولك للوصول إلى مكتبة الببتيدات'
                : 'ابدأ رحلتك مع دليل الببتيدات الشامل'}
            </p>
            {tab === 'signup' && (
              <p className="mt-2 text-xs font-semibold text-white/90 flex items-center justify-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                تجربة {TRIAL_DAYS} أيام مجانية — إلغاء في أي وقت
              </p>
            )}
          </div>

          {/* Bug 8 fix: add role="tablist" + role="tab" + aria-selected for screen reader support */}
          <div className="flex border-b border-stone-200 dark:border-stone-600" role="tablist" aria-label="نوع العملية">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => switchTab(t)}
                className={cn(
                  'relative flex-1 py-3.5 text-center text-sm font-semibold transition-colors',
                  tab === t ? 'text-emerald-700' : 'text-stone-600 dark:text-stone-300 transition-colors hover:text-stone-900 dark:text-stone-100'
                )}
              >
                {t === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                {tab === t && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div className="px-6 pb-8 pt-6">
            {/* Google Sign In — custom Arabic button wraps the hidden GIS button for full locale control */}
            {GOOGLE_CLIENT_ID && (
              <>
                {/* Hidden GIS container — still needed to initialise the Google ID token flow */}
                <div ref={googleBtnRef} className="hidden" aria-hidden="true" />

                {/* Visible custom Arabic button */}
                <button
                  type="button"
                  disabled={loading || googleLoading}
                  onClick={() => {
                    if (window.google?.accounts?.id) {
                      window.google.accounts.id.prompt();
                    } else {
                      toast.error('جارٍ تحميل Google — انتظر لحظة وحاول مرة أخرى');
                    }
                  }}
                  className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-700 dark:text-stone-200 shadow-sm transition-all hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-500 disabled:opacity-60"
                >
                  {googleLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
                  ) : (
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.2-10.5 7.2-17.2z"/>
                      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z"/>
                      <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.3v-6.2H2.7C1 17.3 0 20.5 0 24s1 6.7 2.7 9.5l8.1-4.7z"/>
                      <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.4 30.4 0 24 0 14.8 0 6.7 5.2 2.7 12.7l8.1 4.7C12.7 13.6 17.9 9.5 24 9.5z"/>
                    </svg>
                  )}
                  <span>{tab === 'login' ? 'تسجيل الدخول بـ Google' : 'إنشاء حساب بـ Google'}</span>
                </button>

                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                  <span className="text-xs text-stone-500 dark:text-stone-300">أو بالبريد الإلكتروني</span>
                  <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                </div>
              </>
            )}

            {error && (
              <div role="alert" className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Bug 9 fix: aria-live so screen readers announce dynamic success/info messages */}
            {resetMessage && (
              <div role="status" aria-live="polite" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {resetMessage}
              </div>
            )}

            {infoMessage && (
              <div role="status" aria-live="polite" className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                {infoMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                  البريد الإلكتروني <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
                </label>
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoFocus
                  autoComplete="email"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-left text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 outline-none transition-shadow focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-900 dark:text-stone-100">
                  كلمة المرور <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    dir="ltr"
                    {...(tab === 'signup' ? { minLength: 8 } : {})}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 ps-12 text-left text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 outline-none transition-shadow focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute start-3 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {tab === 'signup' && (() => {
                  const hasMinLength = password.length >= 8;
                  const hasLetter = /[a-zA-Z]/.test(password);
                  const hasNumber = /\d/.test(password);
                  const metCount = [hasMinLength, hasLetter, hasNumber].filter(Boolean).length;
                  const strengthLabel = metCount === 0 ? '' : metCount === 1 ? 'ضعيفة' : metCount === 2 ? 'متوسطة' : 'قوية';
                  const strengthColor = metCount === 1 ? 'bg-red-500' : metCount === 2 ? 'bg-yellow-500' : 'bg-emerald-500';
                  return (
                    <div className="mt-2 space-y-2">
                      {/* Visual password strength bar */}
                      {password.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex gap-1" role="progressbar" aria-valuenow={metCount} aria-valuemin={0} aria-valuemax={3} aria-label={`قوة كلمة المرور: ${strengthLabel}`}>
                            {[1, 2, 3].map(i => (
                              <div
                                key={i}
                                className={cn(
                                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                                  metCount >= i ? strengthColor : 'bg-stone-200 dark:bg-stone-700'
                                )}
                              />
                            ))}
                          </div>
                          {strengthLabel && (
                            <p className={cn('text-xs font-medium', metCount === 1 ? 'text-red-600' : metCount === 2 ? 'text-yellow-600' : 'text-emerald-700')}>
                              كلمة المرور {strengthLabel}
                            </p>
                          )}
                        </div>
                      )}
                      <ul className="space-y-1 text-xs" aria-label="متطلبات كلمة المرور">
                        <li className={cn('flex items-center gap-2', hasMinLength ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-300')}>
                          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', hasMinLength ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' : 'bg-stone-100 dark:bg-stone-800 text-stone-400')} aria-hidden>
                            {hasMinLength ? '✓' : '○'}
                          </span>
                          8 أحرف على الأقل
                        </li>
                        <li className={cn('flex items-center gap-2', hasLetter ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-300')}>
                          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', hasLetter ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' : 'bg-stone-100 dark:bg-stone-800 text-stone-400')} aria-hidden>
                            {hasLetter ? '✓' : '○'}
                          </span>
                          حرف واحد على الأقل
                        </li>
                        <li className={cn('flex items-center gap-2', hasNumber ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-300')}>
                          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', hasNumber ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' : 'bg-stone-100 dark:bg-stone-800 text-stone-400')} aria-hidden>
                            {hasNumber ? '✓' : '○'}
                          </span>
                          رقم واحد على الأقل
                        </li>
                      </ul>
                    </div>
                  );
                })()}
                {tab === 'login' && (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-emerald-700 hover:underline disabled:opacity-50"
                    >
                      {resetLoading ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                          جارٍ الإرسال...
                        </>
                      ) : (
                        'نسيت كلمة المرور؟'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {TURNSTILE_SITE_KEY && (
                <div ref={turnstileRef} className="flex justify-center" />
              )}

              <button
                type="submit"
                disabled={loading || !!(TURNSTILE_SITE_KEY && !turnstileToken) || (tab === 'signup' && !(password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)))}
                title={
                  tab === 'signup' && !(password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password))
                    ? 'أكمل متطلبات كلمة المرور أدناه أولًا'
                    : undefined
                }
                className="w-full rounded-full bg-emerald-600 py-3.5 text-base font-bold text-white shadow transition-transform hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {tab === 'login' ? 'جارٍ تسجيل الدخول...' : 'جارٍ إنشاء الحساب...'}
                  </span>
                ) : tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>

              {/* Terms & Privacy acceptance — shown on signup tab */}
              {tab === 'signup' && (
                <p className="text-center text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  بإنشاء حساب، أنت توافق على{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                    شروط الاستخدام
                  </a>
                  {' '}و{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                    سياسة الخصوصية
                  </a>
                </p>
              )}

              <p className="text-center text-sm text-stone-700 dark:text-stone-200">
                {tab === 'login' ? (
                  <>
                    ليس لديك حساب؟{' '}
                    {/* Bug 5 fix: also clear resetMessage on tab switch via bottom links */}
                    <button type="button" onClick={() => switchTab('signup')} className="font-semibold text-emerald-700 hover:underline min-h-[44px] inline-flex items-center">
                      أنشئ حسابًا
                    </button>
                  </>
                ) : (
                  <>
                    لديك حساب بالفعل؟{' '}
                    <button type="button" onClick={() => switchTab('login')} className="font-semibold text-emerald-700 hover:underline min-h-[44px] inline-flex items-center">
                      سجّل الدخول
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
