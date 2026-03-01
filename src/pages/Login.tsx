import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Tab = 'login' | 'signup';

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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(recoveryTimerRef.current); }, []);

  useEffect(() => {
    if (user && !isRecovery) {
      const raw = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
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
      setError(err instanceof Error ? err.message : 'حدث خطأ في تغيير كلمة المرور');
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
      return;
    }

    if (tab === 'signup' && password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
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
      } else {
        await signup(email, password);
      }
      setFailedAttempts(0);
      const raw = new URLSearchParams(window.location.search).get('redirect');
      const redirectTo = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في تسجيل الدخول. تحقق من بريدك وكلمة المرور.';
      if (msg.includes('رابط التأكيد') || msg.includes('تحقق من بريدك')) {
        setInfoMessage(msg);
      } else if (err instanceof Error && (err.message?.includes('already') || err.message?.includes('registered'))) {
        toast.error('هذا البريد مسجّل — جرّب تسجيل الدخول أو استخدم Google');
        setError(msg);
      } else {
        setError(msg);
      }
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      if (next >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setFailedAttempts(0);
        toast.error('محاولات كثيرة — انتظر 30 ثانية');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const raw = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      const safeRedirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${safeRedirect}`,
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
        redirectTo: `${window.location.origin}/account`,
      });
      if (error) throw error;
      setResetMessage('تم إرسال رابط إعادة تعيين كلمة المرور');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في إرسال رابط إعادة التعيين');
    } finally {
      setLoading(false);
    }
  };

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
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-stone-900">كلمة المرور الجديدة</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    dir="ltr"
                    minLength={8}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full rounded-full bg-emerald-600 py-3.5 text-base font-bold text-white shadow transition-transform hover:bg-emerald-700 disabled:opacity-60">
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
                  البريد الإلكتروني
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
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-900">
                  كلمة المرور
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
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 ps-12 text-left text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {tab === 'signup' && password.length > 0 && (() => {
                  const strength = password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak';
                  const color = strength === 'strong' ? 'bg-emerald-500' : strength === 'medium' ? 'bg-amber-500' : 'bg-red-500';
                  const label = strength === 'strong' ? 'قوية' : strength === 'medium' ? 'متوسطة' : 'ضعيفة';
                  const width = strength === 'strong' ? 'w-full' : strength === 'medium' ? 'w-2/3' : 'w-1/3';
                  return (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-stone-200" role="progressbar" aria-valuenow={strength === 'strong' ? 100 : strength === 'medium' ? 66 : 33} aria-valuemin={0} aria-valuemax={100} aria-label="قوة كلمة المرور">
                        <div className={cn('h-1.5 rounded-full transition-all duration-300', color, width)} />
                      </div>
                      <p className={cn('mt-1 text-xs font-medium', strength === 'strong' ? 'text-emerald-600' : strength === 'medium' ? 'text-amber-600' : 'text-red-600')}>
                        كلمة المرور: {label}
                      </p>
                    </div>
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
                disabled={loading}
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
