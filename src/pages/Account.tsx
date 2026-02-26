import { useState, useEffect, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { User, Crown, LogOut, Trash2, AlertTriangle, Mail, ArrowUpCircle, KeyRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const TIER_LABELS: Record<string, string> = {
  free: 'مجاني',
  essentials: 'Essentials',
  elite: 'Elite',
};

const STATUS_LABELS: Record<string, string> = {
  trial: 'فترة تجريبية',
  active: 'مفعّل',
  cancelled: 'ملغي',
  expired: 'منتهي',
  none: 'بدون اشتراك',
};

export default function Account() {
  const { user, subscription, logout } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const closeDialogs = useCallback(() => {
    setShowCancelDialog(false);
    setShowDeleteDialog(false);
  }, []);

  useEffect(() => {
    if (!showCancelDialog && !showDeleteDialog) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialogs(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCancelDialog, showDeleteDialog, closeDialogs]);

  if (!user) return null;

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast.error('أدخل بريد إلكتروني صالح'); return; }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('تم إرسال رابط التأكيد إلى بريدك الجديد. تحقق من صندوق البريد.');
      setNewEmail('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'حدث خطأ في تغيير البريد الإلكتروني'); }
    finally { setEmailLoading(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('تم تغيير كلمة المرور بنجاح');
      setNewPassword('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'حدث خطأ في تغيير كلمة المرور'); }
    finally { setPasswordLoading(false); }
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCancelDialog(false);
      toast.success('تم إلغاء اشتراكك. ستحتفظ بالوصول حتى نهاية فترتك الحالية.');
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      toast.error('حدث خطأ أثناء الإلغاء. تواصل معنا: contact@pptides.com');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) throw new Error();
      await logout();
    } catch {
      toast.error('حدث خطأ أثناء حذف الحساب. تواصل معنا: contact@pptides.com');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
      <Helmet>
        <title>حسابي — إدارة الاشتراك والإعدادات | pptides</title>
        <meta name="description" content="إدارة حسابك واشتراكك في pptides. Manage your account and subscription." />
      </Helmet>

      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <User className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">حسابي</h1>
        <p className="mt-2 text-lg text-stone-600">إدارة حسابك واشتراكك</p>
      </div>

      <div className="space-y-6">
        {/* Email Card */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">البريد الإلكتروني</h2>
          </div>
          <p className="text-sm text-stone-700 mb-4" dir="ltr">{user.email}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="new-email" className="mb-1.5 block text-sm font-medium text-stone-700">بريد إلكتروني جديد</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="example@mail.com"
                dir="ltr"
                autoComplete="email"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              onClick={handleChangeEmail}
              disabled={emailLoading || !newEmail.trim()}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {emailLoading ? '...' : 'تغيير البريد'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">تغيير كلمة المرور</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-stone-700">كلمة المرور الجديدة</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                dir="ltr"
                minLength={6}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {passwordLoading ? '...' : 'تغيير'}
            </button>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="rounded-2xl border border-stone-300 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">الاشتراك</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">الباقة</span>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                subscription.tier === 'elite'
                  ? 'bg-emerald-100 text-emerald-700'
                  : subscription.tier === 'essentials'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-stone-200 text-stone-600',
              )}>
                {TIER_LABELS[subscription.tier] ?? subscription.tier}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">الحالة</span>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                subscription.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : subscription.status === 'trial'
                    ? 'bg-amber-100 text-amber-700'
                    : subscription.status === 'expired'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-stone-200 text-stone-600',
              )}>
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </div>
            {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">الأيام المتبقية</span>
                <span className="text-sm font-bold text-amber-600">{arPlural(subscription.trialDaysLeft, 'يوم واحد', 'يومان', 'أيام')}</span>
              </div>
            )}
          </div>
          {(subscription.status === 'expired' || subscription.status === 'none') && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm font-bold text-amber-800">
                  {subscription.status === 'expired' ? 'انتهت صلاحية اشتراكك' : 'لا يوجد اشتراك نشط'}
                </p>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                {subscription.status === 'expired'
                  ? 'جدّد اشتراكك للعودة إلى البروتوكولات والأدوات الكاملة.'
                  : 'اشترك للوصول إلى كل البروتوكولات والأدوات.'}
              </p>
              <Link
                to="/pricing"
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                <ArrowUpCircle className="h-4 w-4" />
                {subscription.status === 'expired' ? 'جدّد اشتراكك الآن' : 'اشترك الآن'}
              </Link>
            </div>
          )}
          {subscription.status !== 'expired' && subscription.status !== 'none' && subscription.tier !== 'elite' && (
            <Link
              to="/pricing"
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
            >
              <ArrowUpCircle className="h-4 w-4" />
              ترقية الاشتراك
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {subscription.isPaidSubscriber && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
            >
              <LogOut className="h-4 w-4" />
              إلغاء الاشتراك
            </button>
          )}
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            حذف الحساب
          </button>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in" onClick={() => setShowCancelDialog(false)}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">إلغاء الاشتراك</h3>
            <p className="mt-2 text-sm text-stone-600">
              هل أنت متأكد من إلغاء اشتراكك؟ ستحتفظ بالوصول حتى نهاية فترتك الحالية، ولن يتم تجديد الاشتراك بعدها.
            </p>
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-800 mb-2">ستفقد الوصول إلى:</p>
              <ul className="space-y-1.5">
                {[
                  '41 بروتوكول كامل',
                  'المدرب الذكي',
                  'دليل التحاليل',
                  'البروتوكولات المجمّعة',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-red-700">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'جارٍ الإلغاء...' : 'نعم، ألغِ الاشتراك'}
              </button>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
              >
                تراجع
              </button>
            </div>
          </div>
          </FocusTrap>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in" onClick={() => setShowDeleteDialog(false)}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">حذف الحساب</h3>
            <p className="mt-2 text-sm text-stone-600">
              سيتم حذف حسابك وجميع بياناتك نهائيًا. إذا كان لديك اشتراك نشط، سيتم إلغاؤه فورًا. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isProcessing}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'جارٍ الحذف...' : 'تسجيل الخروج وحذف الحساب'}
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
              >
                تراجع
              </button>
            </div>
          </div>
          </FocusTrap>
        </div>
      )}
    </main>
  );
}
