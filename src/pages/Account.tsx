import { useState, useEffect, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, Crown, LogOut, Trash2, AlertTriangle, Mail, ArrowUpCircle, KeyRound, XCircle, Download, CreditCard, Gift, Copy, Share2, Check, Send, MessageSquare, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, arPlural } from '@/lib/utils';
import { SUPPORT_EMAIL, STATUS_LABELS, TIER_LABELS, PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Account() {
  const { user, subscription, logout, refreshSubscription, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelStep, setCancelStep] = useState<'survey' | 'retention' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileWeight, setProfileWeight] = useState('');
  const [profileGoals, setProfileGoals] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const closeDialogs = useCallback(() => {
    setShowCancelDialog(false);
    setCancelStep(null);
    setShowDeleteDialog(false);
    setDeleteConfirmText('');
    setDeletePassword('');
  }, []);

  useEffect(() => {
    if (!showCancelDialog && !showDeleteDialog) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialogs(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCancelDialog, showDeleteDialog, closeDialogs]);

  useEffect(() => {
    if (showCancelDialog) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showCancelDialog]);

  const PROFILE_GOALS = [
    { id: 'recovery', label: 'تعافي' },
    { id: 'weight_loss', label: 'فقدان وزن' },
    { id: 'muscle', label: 'عضل' },
    { id: 'brain', label: 'دماغ' },
    { id: 'hormones', label: 'هرمونات' },
    { id: 'longevity', label: 'طول عمر' },
    { id: 'gut_skin', label: 'أمعاء/بشرة' },
  ] as const;

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    supabase.from('user_profiles').select('display_name, weight_kg, goals').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setProfileDisplayName(data.display_name ?? '');
          setProfileWeight(data.weight_kg != null ? String(data.weight_kg) : '');
          setProfileGoals(Array.isArray(data.goals) ? data.goals : []);
        }
      })
      .finally(() => setProfileLoading(false));
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const weightNum = profileWeight.trim() ? parseFloat(profileWeight) : null;
      if (profileWeight.trim() && (isNaN(weightNum!) || weightNum! <= 0 || weightNum! > 300)) {
        toast.error('أدخل وزنًا صالحًا (بالكيلوغرام)');
        setProfileSaving(false);
        return;
      }
      const { error } = await supabase.from('user_profiles').upsert({
        user_id: user.id,
        display_name: profileDisplayName.trim() || null,
        weight_kg: weightNum,
        goals: profileGoals.length > 0 ? profileGoals : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('تم حفظ الملف الشخصي');
    } catch {
      toast.error('تعذّر حفظ الملف الشخصي. حاول مرة أخرى.');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    if (showDeleteDialog) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showDeleteDialog]);

  if (!isLoading && !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!user) return null;

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) { toast.error('أدخل بريد إلكتروني صالح'); return; }
    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast.error('هذا هو بريدك الحالي');
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      await supabase.from('email_list').update({ email: newEmail.trim().toLowerCase() }).eq('email', user.email).catch(() => {});
      toast.success('تم إرسال رابط تأكيد للبريد الجديد. سيتم تحديث بريد Stripe تلقائيًا عند الدفعة القادمة.');
      setNewEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
        toast.error('هذا البريد الإلكتروني مسجّل بالفعل');
      } else {
        toast.error('تعذّر تغيير البريد الإلكتروني — تحقق من اتصالك وحاول مرة أخرى');
      }
    }
    finally { setEmailLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error('أدخل كلمة المرور الحالية'); return; }
    if (newPassword.length < 8) { toast.error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'); return; }
    if (currentPassword === newPassword) { toast.error('كلمة المرور الجديدة يجب أن تختلف عن الحالية'); return; }
    setPasswordLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) { toast.error('كلمة المرور الحالية غير صحيحة'); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('تم تغيير كلمة المرور بنجاح');
      setNewPassword('');
      setCurrentPassword('');
    } catch { toast.error('تعذّر تغيير كلمة المرور — تحقق من اتصالك وحاول مرة أخرى'); }
    finally { setPasswordLoading(false); }
  };

  const handleExportData = async (format: 'json' | 'csv' = 'json') => {
    if (!user) return;
    toast('جارٍ تجهيز بياناتك...');
    try {
      const [logsRes, protosRes, reviewsRes, communityRes, subsRes] = await Promise.all([
        supabase.from('injection_logs').select('*').eq('user_id', user.id),
        supabase.from('user_protocols').select('*').eq('user_id', user.id),
        supabase.from('reviews').select('*').eq('user_id', user.id),
        supabase.from('community_logs').select('*').eq('user_id', user.id),
        supabase.from('subscriptions').select('*').eq('user_id', user.id),
      ]);
      if (logsRes.error || protosRes.error || reviewsRes.error) {
        toast.error('تعذّر تحميل بعض البيانات. حاول مرة أخرى.');
        return;
      }

      const download = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      if (format === 'csv') {
        const logs = (logsRes.data ?? []) as Array<Record<string, unknown>>;
        const escapeCSV = (val: unknown): string => {
          const str = String(val ?? '');
          const escaped = str.replace(/"/g, '""');
          if (/^[=+\-@\t\r]/.test(escaped)) return `"\t${escaped}"`;
          return `"${escaped}"`;
        };
        const headers = 'Date,Time,Peptide,Dose,Unit,Site,Notes';
        const rows = logs.map(l => {
          const d = new Date(l.logged_at as string);
          return [
            escapeCSV(d.toLocaleDateString('en-CA')),
            escapeCSV(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
            escapeCSV(l.peptide_name),
            escapeCSV(l.dose),
            escapeCSV(l.dose_unit),
            escapeCSV(l.injection_site),
            escapeCSV(l.notes),
          ].join(',');
        });
        const csv = '\ufeff' + [headers, ...rows].join('\n');
        download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `pptides-injections-${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        const exportData = {
          exported_at: new Date().toISOString(),
          email: user.email,
          injection_logs: logsRes.data ?? [],
          protocols: protosRes.data ?? [],
          reviews: reviewsRes.data ?? [],
          community_posts: communityRes.data ?? [],
          subscriptions: subsRes.data ?? [],
        };
        download(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), `pptides-data-${new Date().toISOString().slice(0, 10)}.json`);
      }
      toast.success('تم تصدير بياناتك بنجاح');
    } catch {
      toast.error('تعذّر تصدير البيانات. حاول مرة أخرى.');
    }
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('انتهت جلستك. أعد تسجيل الدخول.');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setShowCancelDialog(false);
      setCancelStep(null);
      if (result.cancel_at) {
        toast.success(`تم إلغاء اشتراكك. ستحتفظ بالوصول حتى ${new Date(result.cancel_at).toLocaleDateString('ar-u-nu-latn')}`);
      } else {
        toast.success('تم إلغاء التجربة المجانية');
      }
      await refreshSubscription();
      navigate('/account', { replace: true });
    } catch {
      toast.error(`تعذّر إلغاء الاشتراك — تواصل معنا: ${SUPPORT_EMAIL}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isOAuthUser = (user?.app_metadata?.provider ?? 'email') !== 'email';

  const handleDeleteAccount = async () => {
    const confirmed = deleteConfirmText === 'حذف' || deleteConfirmText.toLowerCase() === 'delete';
    if (!confirmed) { toast.error('اكتب حذف أو DELETE للتأكيد'); return; }
    if (!isOAuthUser && !deletePassword) { toast.error('أدخل كلمة المرور للتأكيد'); return; }
    setIsProcessing(true);
    try {
      if (!isOAuthUser) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: user!.email!, password: deletePassword });
        if (signInError) { toast.error('كلمة المرور غير صحيحة'); setIsProcessing(false); return; }
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('انتهت جلستك. أعد تسجيل الدخول.');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) throw new Error();
      await logout();
    } catch {
      toast.error(`تعذّر حذف الحساب — تواصل معنا: ${SUPPORT_EMAIL}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>حسابي | إدارة الاشتراك والإعدادات | pptides</title>
        <meta name="description" content="إدارة حسابك واشتراكك" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <User className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">حسابي</h1>
        <p className="mt-2 text-lg text-stone-600">إدارة حسابك واشتراكك</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">الملف الشخصي</h2>
          </div>
          {profileLoading ? (
            <div className="h-20 flex items-center justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
              <div>
                <label htmlFor="profile-display-name" className="mb-1.5 block text-sm font-medium text-stone-700">الاسم المعروض</label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                  placeholder="اسمك أو لقبك"
                  maxLength={100}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="profile-weight" className="mb-1.5 block text-sm font-medium text-stone-700">الوزن (كجم)</label>
                <input
                  id="profile-weight"
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={300}
                  step={0.1}
                  value={profileWeight}
                  onChange={(e) => setProfileWeight(e.target.value)}
                  placeholder="مثال: 75"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">الأهداف</label>
                <div className="flex flex-wrap gap-2">
                  {PROFILE_GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setProfileGoals((prev) => (prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]))}
                      className={cn(
                        'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                        profileGoals.includes(g.id)
                          ? 'bg-emerald-600 text-white'
                          : 'border border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:bg-emerald-50',
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {profileSaving ? 'جارٍ الحفظ...' : 'حفظ الملف الشخصي'}
              </button>
            </form>
          )}
        </div>

        {/* Email Card */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">البريد الإلكتروني</h2>
          </div>
          <p className="text-sm text-stone-700 mb-4" dir="ltr">{user.email}</p>
          <form onSubmit={(e) => { e.preventDefault(); handleChangeEmail(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading || !newEmail.trim()}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              {emailLoading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ التغيير</span> : 'تغيير البريد'}
            </button>
          </form>
        </div>

        {/* Change Password — only for email users; OAuth users have no password */}
        {!isOAuthUser && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">تغيير كلمة المرور</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="flex flex-col gap-3">
            <div>
              <label htmlFor="account-current-password" className="mb-1.5 block text-sm font-medium text-stone-700">كلمة المرور الحالية</label>
              <input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="كلمة المرور الحالية"
                dir="ltr"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="account-new-password" className="mb-1.5 block text-sm font-medium text-stone-700">كلمة المرور الجديدة</label>
              <input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                dir="ltr"
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !currentPassword}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              {passwordLoading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ التغيير</span> : 'تغيير كلمة المرور'}
            </button>
          </form>
        </div>
        )}

        {/* Subscription Card */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
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
                subscription.isProOrTrial
                  ? 'bg-emerald-100 text-emerald-700'
                  : subscription.status === 'past_due'
                    ? 'bg-amber-100 text-amber-700'
                    : subscription.status === 'expired'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-stone-200 text-stone-600',
              )}>
                {subscription.isProOrTrial && subscription.status === 'cancelled'
                  ? 'نشط'
                  : STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </div>
            {subscription.status === 'active' && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">يتجدد في</span>
                <span className="text-sm font-bold text-stone-700">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </span>
              </div>
            )}
            {subscription.status === 'cancelled' && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">ينتهي الوصول في</span>
                <span className="text-sm font-bold text-amber-600">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </span>
              </div>
            )}
            {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">الأيام المتبقية</span>
                <span className="text-sm font-bold text-amber-600">{arPlural(subscription.trialDaysLeft, 'يوم واحد', 'يومان', 'أيام')}</span>
              </div>
            )}
          </div>
          {(subscription.isPaidSubscriber || subscription.isTrial || subscription.status === 'past_due') && (
            <>
              <button
                onClick={async () => {
                  try {
                    const session = await supabase.auth.getSession();
                    const token = session.data.session?.access_token;
                    if (!token) { toast.error('يرجى تسجيل الدخول'); return; }
                    toast('جارٍ فتح إدارة الدفع...');
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
                      method: 'POST',
                      signal: AbortSignal.timeout(15000),
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
                    });
                    if (!res.ok) { toast.error('تعذّر فتح إدارة الدفع'); return; }
                    const { url } = await res.json();
                    if (url) { window.location.href = url; } else { toast.error('تعذّر فتح صفحة الدفع — تواصل مع الدعم'); }
                  } catch { toast.error('تعذّر فتح إدارة الدفع. حاول مرة أخرى.'); }
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100"
              >
                <CreditCard className="h-4 w-4" />
                إدارة الدفع والفواتير
              </button>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.from('enquiries').insert({
                      user_id: user.id,
                      email: user.email,
                      subject: 'refund_request',
                      message: 'طلب استرداد أموال',
                      peptide_name: null,
                    });
                    if (error) throw error;
                    toast.success('تم إرسال طلب الاسترداد — سنتواصل معك قريبًا');
                  } catch { toast.error('تعذّر إرسال طلب الاسترداد. حاول مرة أخرى.'); }
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
              >
                طلب استرداد
              </button>
            </>
          )}
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
              {subscription.status === 'cancelled' ? 'أعد الاشتراك' : 'ترقية الاشتراك'}
            </Link>
          )}
        </div>

        {/* Referral Program */}
        <ReferralSection userId={user?.id} />

        {/* Peptide Enquiry */}
        <EnquiryForm userEmail={user?.email} userId={user?.id} />

        {/* Data Export */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <Download className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">تصدير البيانات</h2>
          </div>
          <p className="text-sm text-stone-600 mb-4">حمّل نسخة من جميع بياناتك (سجل الحقن، البروتوكولات، التقييمات)</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleExportData('json')} className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50">
              تصدير JSON (كامل)
            </button>
            <button onClick={() => handleExportData('csv')} className="rounded-full border border-stone-300 px-6 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50">
              تصدير CSV (سجل الحقن)
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {(subscription.isPaidSubscriber || subscription.isTrial) && subscription.status !== 'cancelled' && (
            <button
              onClick={() => { setShowCancelDialog(true); setCancelStep('survey'); setCancelReason(''); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
            >
              <LogOut className="h-4 w-4" />
              {subscription.isTrial ? 'إلغاء التجربة' : 'إلغاء الاشتراك'}
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

      {/* Cancel Subscription Dialog — survey step */}
      {showCancelDialog && cancelStep === 'survey' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in" onClick={() => { setShowCancelDialog(false); setCancelStep(null); }}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">لماذا تريد الإلغاء؟</h3>
            <p className="mt-1 text-sm text-stone-600">ساعدنا في تحسين الخدمة — اختر السبب الرئيسي</p>
            <div className="mt-4 space-y-2">
              {[
                { id: 'too_expensive', label: 'السعر مرتفع' },
                { id: 'not_useful', label: 'المحتوى غير مفيد بما يكفي' },
                { id: 'found_alternative', label: 'وجدت بديلًا آخر' },
                { id: 'technical_issues', label: 'مشاكل تقنية' },
                { id: 'other', label: 'سبب آخر' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setCancelReason(opt.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                    cancelReason === opt.id
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50',
                  )}
                >
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    cancelReason === opt.id ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300',
                  )}>
                    {cancelReason === opt.id && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={async () => {
                  if (!cancelReason) { toast.error('اختر سبب الإلغاء'); return; }
                  try {
                    await supabase.from('enquiries').insert({
                      user_id: user.id,
                      email: user.email,
                      subject: 'cancel_reason',
                      message: cancelReason,
                      peptide_name: null,
                    });
                  } catch { /* non-blocking */ }
                  setCancelStep('retention');
                }}
                disabled={!cancelReason}
                className="w-full rounded-xl bg-stone-700 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-stone-800 disabled:opacity-50"
              >
                متابعة
              </button>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelStep(null); }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                الاحتفاظ بالاشتراك
              </button>
            </div>
          </div>
          </FocusTrap>
        </div>
      )}

      {/* Cancel Subscription Dialog — retention step */}
      {showCancelDialog && cancelStep === 'retention' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in" onClick={() => { setShowCancelDialog(false); setCancelStep(null); }}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">هل أنت متأكد؟</h3>
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-800 mb-2">ستفقد:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-red-700">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  الوصول إلى {PEPTIDE_COUNT}+ بروتوكول كامل
                </li>
                {subscription.tier === 'elite' && (
                  <li className="flex items-center gap-2 text-sm text-red-700">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    المدرب الذكي بالذكاء الاصطناعي
                  </li>
                )}
                <li className="flex items-center gap-2 text-sm text-red-700">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  الوصول الكامل بعد انتهاء الفترة الحالية
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50 disabled:opacity-50"
              >
                {isProcessing ? 'جارٍ الإلغاء...' : 'متابعة الإلغاء'}
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.info('يمكنك إيقاف اشتراكك مؤقتًا لمدة شهر. تواصل معنا عبر contact@pptides.com لطلب الإيقاف.');
                  setShowCancelDialog(false);
                  setCancelStep(null);
                }}
                className="w-full rounded-full border border-stone-200 py-3 text-sm font-bold text-stone-600 hover:bg-stone-50"
              >
                إيقاف مؤقت
              </button>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelStep(null); }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                الاحتفاظ بالاشتراك
              </button>
            </div>
          </div>
          </FocusTrap>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in" onClick={closeDialogs}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">حذف الحساب</h3>
            <p className="mt-2 text-sm text-stone-600">
              سيتم حذف حسابك وجميع بياناتك نهائيًا. إذا كان لديك اشتراك نشط، سيتم إلغاؤه فورًا. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                اكتب <span className="font-bold text-red-600">حذف</span> أو <span className="font-bold text-red-600">delete</span> للتأكيد
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="حذف"
                dir="auto"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            {!isOAuthUser && (
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">كلمة المرور</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="أدخل كلمة المرور للتأكيد"
                  dir="ltr"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isProcessing || (deleteConfirmText !== 'حذف' && deleteConfirmText.toLowerCase() !== 'delete') || (!isOAuthUser && !deletePassword)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'جارٍ الحذف...' : 'تسجيل الخروج وحذف الحساب'}
              </button>
              <button
                onClick={closeDialogs}
                className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
              >
                تراجع
              </button>
            </div>
          </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}

function ReferralSection({ userId }: { userId?: string }) {
  const [code, setCode] = useState('');
  const [stats, setStats] = useState({ total: 0, signedUp: 0, subscribed: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'PP-';
    for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const { data: sub } = await supabase.from('subscriptions').select('referral_code').eq('user_id', userId).maybeSingle();
      if (!mounted) return;

      let refCode = sub?.referral_code;
      if (!refCode) {
        refCode = generateCode();
        if (sub) {
          await supabase.from('subscriptions').update({ referral_code: refCode }).eq('user_id', userId);
        } else {
          await supabase.from('subscriptions').upsert({ user_id: userId, status: 'none', tier: 'free', referral_code: refCode }, { onConflict: 'user_id' });
        }
      }
      setCode(refCode);

      const { data: refs } = await supabase.from('referrals').select('status').eq('referrer_id', userId);
      if (mounted && refs) {
        setStats({
          total: refs.length,
          signedUp: refs.filter(r => r.status === 'signed_up' || r.status === 'subscribed').length,
          subscribed: refs.filter(r => r.status === 'subscribed').length,
        });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId, generateCode]);

  const shareUrl = `${SITE_URL}/?ref=${code}`;
  const shareText = `جرّب pptides — أشمل دليل عربي للببتيدات العلاجية مع مدرب ذكي وحاسبة جرعات\n${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('تم نسخ رابط الإحالة');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('تعذّر النسخ'); }
  };

  if (loading) return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 animate-pulse">
      <div className="h-5 w-32 bg-stone-200 rounded mb-3" />
      <div className="h-3 w-48 bg-stone-100 rounded mb-4" />
      <div className="h-10 w-full bg-stone-100 rounded-xl mb-3" />
      <div className="grid grid-cols-3 gap-3"><div className="h-16 bg-stone-100 rounded-xl" /><div className="h-16 bg-stone-100 rounded-xl" /><div className="h-16 bg-stone-100 rounded-xl" /></div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6">
      <div className="flex items-center gap-3 mb-1">
        <Gift className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-stone-900">ادعُ أصدقاءك</h2>
      </div>
      <p className="text-sm text-stone-600 mb-4">شارك رابط الإحالة واحصل على مكافآت عند اشتراك أصدقائك</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-mono text-stone-700 truncate" dir="ltr">
          {shareUrl}
        </div>
        <button onClick={handleCopy} className="shrink-0 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-600 transition-colors hover:bg-emerald-100">
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#20bd5a]"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.917l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.764-6.353-2.06l-.444-.333-3.16 1.06 1.06-3.16-.333-.444A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          واتساب
        </a>
        <button
          onClick={async () => {
            if (navigator.share) {
              try { await navigator.share({ title: 'pptides — دليل الببتيدات', text: shareText, url: shareUrl }); } catch { /* cancelled */ }
            } else { handleCopy(); }
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50"
        >
          <Share2 className="h-4 w-4" />
          مشاركة
        </button>
      </div>

      <div className="rounded-xl bg-stone-50 p-4">
        <p className="text-xs font-bold text-stone-500 mb-2">إحصائيات الإحالة</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-stone-900">{stats.total}</p>
            <p className="text-xs text-stone-500">دعوات</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-600">{stats.signedUp}</p>
            <p className="text-xs text-stone-500">سجّلوا</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700">{stats.subscribed}</p>
            <p className="text-xs text-stone-500">اشتركوا</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 mt-3 text-center">كود الإحالة الخاص بك: <span className="font-mono font-bold" dir="ltr">{code}</span></p>
    </div>
  );
}

function EnquiryForm({ userEmail, userId }: { userEmail?: string; userId?: string }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [peptide, setPeptide] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; subject: string; status: string; created_at: string; peptide_name: string | null }>>([]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase.from('enquiries').select('id, subject, status, created_at, peptide_name').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => { if (mounted && data) setHistory(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [userId, sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !userId) return;
    if (sending) return;
    setSending(true);
    (document.activeElement as HTMLElement)?.blur();

    try {
      const subjectText = subject.trim() || 'استفسار عام';
      const { error } = await supabase.from('enquiries').insert({
        user_id: userId,
        email: userEmail,
        subject: subjectText,
        peptide_name: peptide.trim() || null,
        message: message.trim(),
      });

      if (error) {
        toast.error('تعذّر إرسال الاستفسار. حاول مرة أخرى.');
        return;
      }

      // Admin notification handled server-side via enquiries table polling

      toast.success('تم إرسال استفسارك بنجاح — سنرد عليك قريبًا');
      setSent(true);
      setSubject('');
      setMessage('');
      setPeptide('');
      setTimeout(() => setSent(false), 5000);
    } catch {
      toast.error('فشل الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-1">
        <MessageSquare className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-stone-900">استفسار خاص</h2>
      </div>
      <p className="text-sm text-stone-600 mb-4">هل لديك سؤال عن ببتيد معيّن أو بروتوكول؟ أرسل لنا وسنرد بأسرع وقت.</p>

      {sent ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <Check className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
          <p className="text-sm font-bold text-emerald-800">تم إرسال استفسارك</p>
          <p className="text-xs text-emerald-600 mt-1">سنرد عليك على {userEmail} في أقرب وقت</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="enquiry-peptide" className="mb-1 block text-xs font-medium text-stone-600">الببتيد (اختياري)</label>
            <input
              id="enquiry-peptide"
              type="text"
              value={peptide}
              onChange={e => setPeptide(e.target.value)}
              placeholder="مثال: BPC-157"
              dir="ltr"
              maxLength={100}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label htmlFor="enquiry-subject" className="mb-1 block text-xs font-medium text-stone-600">الموضوع</label>
            <input
              id="enquiry-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="جرعة، تعارض، بروتوكول..."
              maxLength={200}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label htmlFor="enquiry-message" className="mb-1 block text-xs font-medium text-stone-600">رسالتك <span className="text-red-500">*</span></label>
            <textarea
              id="enquiry-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              rows={4}
              maxLength={2000}
              required
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 outline-none resize-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="text-[10px] text-stone-500 mt-1 text-left" dir="ltr">{message.length}/2000</p>
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ الإرسال...
              </span>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال الاستفسار
              </>
            )}
          </button>
        </form>
      )}

      {history.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="text-xs font-bold text-stone-600 mb-2">استفساراتك السابقة</p>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-800 truncate">{h.subject}</p>
                  <p className="text-[10px] text-stone-500">{new Date(h.created_at).toLocaleDateString('ar-u-nu-latn')}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', h.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : h.status === 'closed' ? 'bg-stone-200 text-stone-600' : 'bg-amber-100 text-amber-700')}>{h.status === 'replied' ? 'تم الرد' : h.status === 'closed' ? 'مغلق' : 'قيد المراجعة'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
