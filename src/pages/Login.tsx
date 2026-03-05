import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { events } from '@/lib/analytics';

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
  const [resetMessage, setResetMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
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

  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(recoveryTimerRef.current); }, []);

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
      recoveryTimerRef.current = setTimeout(() => navigate('/'), 1500);
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
      navigate(safeRedirect(new URLSearchParams(window.location.search).get('redirect')));
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const msg = friendlyError(raw);
      if (raw.includes('رابط التأكيد') || raw.includes('تحقق من بريدك') || raw.includes('Email not confirmed') || raw.includes('تأكيد بريدك')) {
        setPendingVerification(true);
        return;
      } else if (raw.includes('already') || raw.includes('registered') || raw.includes('مسجّل')) {
        toast.error(msg);
        setError(msg);
        setTab('login');
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
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const redirect = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirect}`,
        },
      });
      if (error) {
        setError('تعذّر تسجيل الدخول عبر Google. حاول مرة أخرى.');
        toast.error('تعذّر الدخول بـ Google — جرّب البريد وكلمة المرور');
        setLoading(false);
      }
    } catch {
      setError('تعذّر تسجيل الدخول عبر Google. تحقق من اتصالك بالإنترنت.');
      toast.error('تعذّر الدخول بـ Google — جرّب البريد وكلمة المرور');
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setResetMessage('');
    if (!email.trim()) {
      setError('أدخل بريدك الإلكتروني أولاً');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetMessage('تم إرسال رابط إعادة تعيين كلمة المرور — تحقق من مجلد البريد غير المرغوب فيه');
    } catch (err: unknown) {
      setError(err instanceof Error ? friendlyError(err.message) : 'تعذّر إتمام العملية — تحقق من اتصالك وحاول مرة أخرى');
    } finally {
      setLoading(false);
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
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <Helmet><title>تأكيد البريد الإلكتروني | pptides</title></Helmet>
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
            <div className="bg-emerald-600 px-6 pb-6 pt-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="mb-1 text-2xl font-bold text-white">تحقق من بريدك الإلكتروني</h1>
              <p className="text-sm text-white/80">أرسلنا رابط التأكيد إلى</p>
              <p className="mt-1 text-sm font-bold text-white" dir="ltr">{email}</p>
            </div>
            <div className="px-6 pb-8 pt-6 text-center">
              <p className="mb-2 text-sm text-stone-600">اضغط على الرابط في البريد لتفعيل حسابك وبدء التجربة المجانية.</p>
              <p className="mb-6 text-xs text-stone-500">لم يصلك البريد؟ تحقق من مجلد البريد المزعج (Spam).</p>
              <button
                onClick={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0}
                className="mb-4 w-full rounded-full border-2 border-emerald-600 py-3 text-sm font-bold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
              >
                {resendLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                    جارٍ الإرسال...
                  </span>
                ) : resendCooldown > 0 ? (
                  `إعادة الإرسال بعد ${resendCooldown} ثانية`
                ) : (
                  'إعادة إرسال رابط التأكيد'
                )}
              </button>
              <button
                onClick={() => { setPendingVerification(false); setTab('login'); }}
                className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <Helmet><title>تغيير كلمة المرور | pptides</title></Helmet>
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
            <div className="bg-emerald-600 px-6 pb-6 pt-8 text-center">
              <h1 className="mb-1 text-2xl font-bold text-white">تغيير كلمة المرور</h1>
              <p className="text-sm text-white/70">أدخل كلمة مرور جديدة لحسابك</p>
            </div>
            <div className="px-6 pb-8 pt-6">
              {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {resetMessage && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{resetMessage}</div>}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label htmlFor="recovery-password" className="mb-1.5 block text-sm font-medium text-stone-900">كلمة المرور الجديدة</label>
                  <input
                    id="recovery-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    dir="ltr"
                    minLength={8}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-stone-900 placeholder:text-stone-500 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
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
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <Helmet>
        <title>{tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'} | pptides</title>
        <meta name="description" content="سجّل دخولك أو أنشئ حساب جديد للوصول إلى مكتبة الببتيدات وحاسبة الجرعات والمدرب الذكي." />
      </Helmet>
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
          <div className="bg-emerald-600 px-6 pb-6 pt-8 text-center">
            <h1 className="mb-1 text-2xl font-bold text-white">
              {tab === 'login' ? 'مرحبًا بعودتك' : 'أنشئ حسابك'}
            </h1>
            <p className="text-sm text-white/70">
              {tab === 'login'
                ? 'سجّل دخولك للوصول إلى مكتبة الببتيدات'
                : 'ابدأ رحلتك مع دليل الببتيدات الشامل'}
            </p>
          </div>

          <div className="flex border-b border-stone-200">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setResetMessage(''); }}
                className={cn(
                  'relative flex-1 py-3.5 text-center text-sm font-semibold transition-colors',
                  tab === t ? 'text-emerald-600' : 'text-stone-600 transition-colors hover:text-stone-900'
                )}
              >
                {t === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                {tab === t && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </div>

          <div className="px-6 pb-8 pt-6">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 transition-all hover:bg-stone-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {tab === 'login' ? 'تسجيل الدخول بـ Google' : 'إنشاء حساب بـ Google'}
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-500">أو</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {resetMessage && (
              <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {resetMessage}
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {infoMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-900">
                  البريد الإلكتروني <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  autoFocus
                  autoComplete="email"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-stone-900 placeholder:text-stone-500 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-900">
                  كلمة المرور <span className="text-red-500" aria-hidden="true">*</span>
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
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 ps-12 text-left text-stone-900 placeholder:text-stone-500 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600 transition-colors"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {tab === 'signup' && (() => {
                  const hasMinLength = password.length >= 8;
                  const hasLetter = /[a-zA-Z]/.test(password);
                  const hasNumber = /\d/.test(password);
                  return (
                    <ul className="mt-2 space-y-1 text-xs" aria-label="متطلبات كلمة المرور">
                      <li className={cn('flex items-center gap-2', hasMinLength ? 'text-emerald-600' : 'text-stone-500')}>
                        {hasMinLength ? <span aria-hidden>✓</span> : <span aria-hidden>○</span>}
                        8 أحرف على الأقل
                      </li>
                      <li className={cn('flex items-center gap-2', hasLetter ? 'text-emerald-600' : 'text-stone-500')}>
                        {hasLetter ? <span aria-hidden>✓</span> : <span aria-hidden>○</span>}
                        حرف واحد على الأقل
                      </li>
                      <li className={cn('flex items-center gap-2', hasNumber ? 'text-emerald-600' : 'text-stone-500')}>
                        {hasNumber ? <span aria-hidden>✓</span> : <span aria-hidden>○</span>}
                        رقم واحد على الأقل
                      </li>
                    </ul>
                  );
                })()}
                {tab === 'login' && (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={loading}
                      className="text-sm font-medium text-emerald-600 hover:underline disabled:opacity-50"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (tab === 'signup' && !(password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)))}
                className="w-full rounded-full bg-emerald-600 py-3.5 text-base font-bold text-white shadow transition-transform hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {tab === 'login' ? 'جارٍ تسجيل الدخول...' : 'جارٍ إنشاء الحساب...'}
                  </span>
                ) : tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>

              <p className="text-center text-sm text-stone-700">
                {tab === 'login' ? (
                  <>
                    ليس لديك حساب؟{' '}
                    <button type="button" onClick={() => { setTab('signup'); setError(''); }} className="font-semibold text-emerald-600 hover:underline">
                      أنشئ حسابًا
                    </button>
                  </>
                ) : (
                  <>
                    لديك حساب بالفعل؟{' '}
                    <button type="button" onClick={() => { setTab('login'); setError(''); }} className="font-semibold text-emerald-600 hover:underline">
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
