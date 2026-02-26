import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { User, Crown, LogOut, Trash2, AlertTriangle, Mail, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  expired: 'منتهي',
  none: 'بدون اشتراك',
};

export default function Account() {
  const { user, subscription, logout } = useAuth();
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Helmet>
          <title>حسابي — إدارة الاشتراك والإعدادات | My Account</title>
          <meta name="description" content="إدارة حسابك واشتراكك في pptides. Manage your account and subscription." />
        </Helmet>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <User className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-stone-900">سجّل الدخول للوصول إلى حسابك</p>
          <p className="mt-2 text-sm text-stone-600">أدِر اشتراكك وبياناتك الشخصية</p>
          <Link
            to="/login"
            className="mt-4 rounded-full bg-emerald-600 px-10 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id);
      if (error) throw error;
      setShowCancelDialog(false);
      import('sonner').then(m => m.toast.success('تم طلب إلغاء الاشتراك. ستحتفظ بالوصول حتى نهاية الفترة الحالية. لإيقاف الدفعات المستقبلية، تواصل معنا عبر contact@pptides.com'));
      setTimeout(() => window.location.reload(), 2500);
    } catch {
      import('sonner').then(m => m.toast.error('حدث خطأ. تواصل معنا: contact@pptides.com'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsProcessing(true);
    try {
      await supabase.from('subscriptions').delete().eq('user_id', user.id);
      await supabase.from('injection_logs').delete().eq('user_id', user.id);
      await supabase.from('community_logs').delete().eq('user_id', user.id);
      await supabase.from('reviews').delete().eq('user_id', user.id);
      await supabase.from('referrals').delete().eq('user_id', user.id);
      await logout();
      navigate('/');
    } catch {
      import('sonner').then(m => m.toast.error('حدث خطأ أثناء حذف الحساب. تواصل معنا: contact@pptides.com'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
      <Helmet>
        <title>حسابي — إدارة الاشتراك والإعدادات | My Account</title>
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
        <div className="rounded-2xl border border-stone-300 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">البريد الإلكتروني</h2>
          </div>
          <p className="text-sm text-stone-700" dir="ltr">{user.email}</p>
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
                    : 'bg-stone-200 text-stone-600',
              )}>
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </div>
            {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">الأيام المتبقية</span>
                <span className="text-sm font-bold text-amber-600">{subscription.trialDaysLeft} يوم</span>
              </div>
            )}
          </div>
          {subscription.tier !== 'elite' && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">إلغاء الاشتراك</h3>
            <p className="mt-2 text-sm text-stone-600">
              هل أنت متأكد من إلغاء اشتراكك؟ ستحتفظ بالوصول حتى نهاية فترتك الحالية.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              لإيقاف الدفعات المستقبلية بشكل نهائي، تواصل معنا عبر <a href="mailto:contact@pptides.com" className="text-emerald-600 font-semibold">contact@pptides.com</a>
            </p>
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
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">حذف الحساب</h3>
            <p className="mt-2 text-sm text-stone-600">
              سيتم تسجيل خروجك. لحذف بياناتك نهائيًا، تواصل معنا عبر البريد:
            </p>
            <p className="mt-2 text-sm font-bold text-emerald-600" dir="ltr">contact@pptides.com</p>
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
        </div>
      )}
    </main>
  );
}
