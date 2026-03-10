import { useState, useEffect, useCallback, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, Crown, LogOut, Trash2, AlertTriangle, Mail, ArrowUpCircle, KeyRound, XCircle, Download, CreditCard, Gift, Copy, Share2, Check, Send, MessageSquare, UserCircle, Camera, BarChart3, Syringe, Bot, Calendar, Heart, FlaskConical } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { peptides as allPeptides } from '@/data/peptides';
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
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [usageStats, setUsageStats] = useState<{ injections: number; protocols: number; coachMessages: number; memberSince: string } | null>(null);

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
    supabase.from('user_profiles').select('display_name, weight_kg, goals, avatar_url').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setProfileDisplayName(data.display_name ?? '');
          setProfileWeight(data.weight_kg != null ? String(data.weight_kg) : '');
          setProfileGoals(Array.isArray(data.goals) ? data.goals : []);
          if (data.avatar_url) setProfilePicUrl(data.avatar_url);
        }
      })
      .catch(() => { /* profile load failed — non-critical, defaults remain */ })
      .finally(() => setProfileLoading(false));
  }, [user]);

  // Load usage stats
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([
      supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_protocols').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      supabase.from('community_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([injRes, protoRes, coachRes]) => {
      if (!mounted) return;
      setUsageStats({
        injections: injRes.count ?? 0,
        protocols: protoRes.count ?? 0,
        coachMessages: coachRes.count ?? 0,
        memberSince: user.id ? new Date(parseInt(user.id.split('-')[0], 16) * 1000 || Date.now()).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long' }) : '',
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت'); return; }
    setUploadingPic(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('user-uploads').upload(path, file, { cacheControl: '31536000', upsert: true });
      if (uploadErr) { toast.error('تعذّر رفع الصورة'); return; }
      const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (publicUrl) {
        await supabase.from('user_profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        setProfilePicUrl(publicUrl + '?t=' + Date.now());
        toast.success('تم تحديث صورة الملف الشخصي');
      }
    } catch { toast.error('تعذّر رفع الصورة — حاول مرة أخرى'); }
    finally { setUploadingPic(false); }
  };

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
      const { error } = await supabase.from('user_profiles').update({
        display_name: profileDisplayName.trim() || null,
        weight_kg: weightNum,
        goals: profileGoals.length > 0 ? profileGoals : null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
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
      const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
      if (sub?.stripe_customer_id) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ action: 'sync_email', user_id: user.id, new_email: newEmail.trim().toLowerCase() }),
        }).catch(() => {});
      }
      toast.success('تم إرسال رابط تأكيد للبريد الجديد. سيتم تحديث بريدك في Stripe تلقائيًا');
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
      const [logsRes, protosRes, reviewsRes, communityRes, subsRes, wellnessRes, labRes, sideEffectRes, profileRes] = await Promise.all([
        supabase.from('injection_logs').select('*').eq('user_id', user.id),
        supabase.from('user_protocols').select('*').eq('user_id', user.id),
        supabase.from('reviews').select('*').eq('user_id', user.id),
        supabase.from('community_logs').select('*').eq('user_id', user.id),
        supabase.from('subscriptions').select('*').eq('user_id', user.id),
        supabase.from('wellness_logs').select('*').eq('user_id', user.id),
        supabase.from('lab_results').select('*').eq('user_id', user.id),
        supabase.from('side_effect_logs').select('*').eq('user_id', user.id),
        supabase.from('user_profiles').select('*').eq('user_id', user.id),
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
          profile: profileRes.data ?? [],
          injection_logs: logsRes.data ?? [],
          protocols: protosRes.data ?? [],
          reviews: reviewsRes.data ?? [],
          community_posts: communityRes.data ?? [],
          subscriptions: subsRes.data ?? [],
          wellness_logs: wellnessRes.data ?? [],
          lab_results: labRes.data ?? [],
          side_effect_logs: sideEffectRes.data ?? [],
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
        body: JSON.stringify({ reason: cancelReason }),
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

  const isOAuthUser = user.provider !== 'email';

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
        body: JSON.stringify({ confirm: true }),
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
        <meta property="og:description" content="إدارة حسابك واشتراكك في pptides — الباقة، طريقة الدفع، والإعدادات." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mb-10 text-center">
        {/* Profile Picture */}
        <div className="relative mx-auto mb-4">
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingPic}
            className="group relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 transition-all hover:border-emerald-400"
          >
            {profilePicUrl ? (
              <img src={profilePicUrl} alt="صورة الملف الشخصي" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-emerald-700" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPic ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
        </div>
        <h1 className="text-3xl font-bold text-emerald-700 md:text-4xl">حسابي</h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">{profileDisplayName || user?.email || 'إدارة حسابك واشتراكك'}</p>
      </div>

      <div className="space-y-6">
        {/* Usage Stats Dashboard */}
        {usageStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-emerald-700" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{usageStats.injections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">حقنة مسجلة</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm">
              <Calendar className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{usageStats.protocols}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">بروتوكول نشط</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm">
              <Bot className="mx-auto mb-1 h-5 w-5 text-purple-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{usageStats.coachMessages}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">رسالة مع المدرب</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm">
              <BarChart3 className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">{usageStats.memberSince || '—'}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">عضو منذ</p>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-stone-950 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">خطتك الحالية</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl',
              subscription.tier === 'elite' ? 'bg-emerald-600' : subscription.tier === 'essentials' ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700',
            )}>
              <Crown className={cn('h-8 w-8', subscription.tier !== 'free' ? 'text-white' : 'text-stone-400')} />
            </div>
            <div className="flex-1">
              <p className="text-xl font-black text-stone-900 dark:text-stone-100">
                {TIER_LABELS[subscription.tier] ?? subscription.tier}
              </p>
              <p className={cn(
                'text-sm font-medium',
                subscription.isProOrTrial ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-400',
              )}>
                {subscription.isProOrTrial && subscription.status === 'cancelled'
                  ? 'نشط'
                  : STATUS_LABELS[subscription.status] ?? subscription.status}
                {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
                  <span className="text-amber-600 ms-2">({arPlural(subscription.trialDaysLeft, 'يوم واحد', 'يومان', 'أيام')} متبقية)</span>
                )}
              </p>
              {subscription.status === 'active' && subscription.currentPeriodEnd && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  يتجدد في {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </p>
              )}
            </div>
          </div>
          {(subscription.status === 'expired' || subscription.status === 'none') && (
            <Link
              to="/pricing"
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
            >
              <ArrowUpCircle className="h-4 w-4" />
              اشترك الآن
            </Link>
          )}
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الملف الشخصي</h2>
          </div>
          {profileLoading ? (
            <div className="h-20 flex items-center justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 dark:border-emerald-700 border-t-transparent" />
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
              <div>
                <label htmlFor="profile-display-name" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">الاسم المعروض</label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                  placeholder="اسمك أو لقبك"
                  maxLength={100}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                />
              </div>
              <div>
                <label htmlFor="profile-weight" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">الوزن (كجم)</label>
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
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">الأهداف</label>
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
                          : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20',
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
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">البريد الإلكتروني</h2>
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 mb-4" dir="ltr">{user.email}</p>
          <form onSubmit={(e) => { e.preventDefault(); handleChangeEmail(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="new-email" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">بريد إلكتروني جديد</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                autoComplete="email"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-left text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
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
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">تغيير كلمة المرور</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="flex flex-col gap-3">
            <div>
              <label htmlFor="account-current-password" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">كلمة المرور الحالية</label>
              <input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="كلمة المرور الحالية"
                dir="ltr"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-left text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>
            <div>
              <label htmlFor="account-new-password" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">كلمة المرور الجديدة</label>
              <input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                dir="ltr"
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-left text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
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
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الاشتراك</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600 dark:text-stone-400">الباقة</span>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                subscription.tier === 'elite'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : subscription.tier === 'essentials'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400',
              )}>
                {TIER_LABELS[subscription.tier] ?? subscription.tier}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600 dark:text-stone-400">الحالة</span>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                subscription.isProOrTrial
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : subscription.status === 'past_due'
                    ? 'bg-amber-100 text-amber-700 dark:text-amber-400'
                    : subscription.status === 'expired'
                      ? 'bg-red-100 text-red-700 dark:text-red-400'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400',
              )}>
                {subscription.isProOrTrial && subscription.status === 'cancelled'
                  ? 'نشط'
                  : STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </div>
            {subscription.status === 'active' && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-400">يتجدد في</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </span>
              </div>
            )}
            {subscription.status === 'cancelled' && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-400">ينتهي الوصول في</span>
                <span className="text-sm font-bold text-amber-600">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </span>
              </div>
            )}
            {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-400">الأيام المتبقية</span>
                <span className="text-sm font-bold text-amber-600">{arPlural(subscription.trialDaysLeft, 'يوم واحد', 'يومان', 'أيام')}</span>
              </div>
            )}
          </div>
          {(subscription.isPaidSubscriber || (subscription.isTrial && subscription.hasStripeSubscription) || subscription.status === 'past_due') && (
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:bg-emerald-900/30"
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                طلب استرداد
              </button>
            </>
          )}
          {(subscription.status === 'expired' || subscription.status === 'none') && (
            <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {subscription.status === 'expired' ? 'انتهت صلاحية اشتراكك' : 'لا يوجد اشتراك نشط'}
                </p>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
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

        {/* Saved Peptides */}
        <SavedPeptides />

        {/* Peptide Enquiry */}
        <EnquiryForm userEmail={user?.email} userId={user?.id} />

        {/* Data Export — GDPR Compliance */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Download className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">تصدير بياناتي</h2>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">حمّل نسخة كاملة من جميع بياناتك — حقك في نقل البيانات مكفول</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => handleExportData('json')}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              تصدير بياناتي (JSON)
            </button>
            <button
              onClick={() => handleExportData('csv')}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <Download className="h-4 w-4" />
              تصدير CSV (سجل الحقن)
            </button>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-500 dark:text-stone-400 mt-3 text-center">يشمل: سجل الحقن، البروتوكولات، العافية، التحاليل، الأعراض الجانبية، والملف الشخصي</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {(subscription.isPaidSubscriber || subscription.isTrial) && subscription.status !== 'cancelled' && (
            subscription.isTrial && !subscription.hasStripeSubscription ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-6 py-3 text-sm text-stone-500 dark:text-stone-400">
                فترتك التجريبية ستنتهي تلقائياً
              </div>
            ) : (
              <button
                onClick={() => { setShowCancelDialog(true); setCancelStep('survey'); setCancelReason(''); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <LogOut className="h-4 w-4" />
                {subscription.isTrial ? 'إلغاء التجربة' : 'إلغاء الاشتراك'}
              </button>
            )
          )}
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-stone-950 px-6 py-3 text-sm font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-50 dark:bg-red-900/20"
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
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">لماذا تريد الإلغاء؟</h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">ساعدنا في تحسين الخدمة — اختر السبب الرئيسي</p>
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
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                      : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800',
                  )}
                >
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    cancelReason === opt.id ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300 dark:border-stone-700',
                  )}>
                    {cancelReason === opt.id && <span className="h-2 w-2 rounded-full bg-white dark:bg-stone-950" />}
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
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">هل أنت متأكد؟</h3>
            <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 mb-4">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">عرض خاص لك!</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">نقدّر وجودك — خصم <strong>20%</strong> على اشتراكك القادم إذا بقيت معنا</p>
              <button
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    const { data: sub } = await supabase.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).maybeSingle();
                    if (!sub?.stripe_subscription_id) { toast.error('لم نجد اشتراكك في Stripe'); return; }
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
                      body: JSON.stringify({ apply_coupon: true, reason: cancelReason }),
                    });
                    if (res.ok) {
                      toast.success('تم تطبيق الخصم — 20% خصم على اشتراكك القادم!');
                      setShowCancelDialog(false); setCancelStep(null);
                    } else {
                      toast.error('تعذّر تطبيق الخصم — جرّب لاحقًا');
                    }
                  } catch { toast.error('خطأ في الاتصال'); } finally { setIsProcessing(false); }
                }}
                disabled={isProcessing}
                className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                احصل على خصم 20%
              </button>
            </div>
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm font-bold text-red-800 mb-2">ستفقد:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  الوصول إلى {PEPTIDE_COUNT}+ بروتوكول كامل
                </li>
                {subscription.tier === 'elite' && (
                  <li className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    المدرب الذكي بالذكاء الاصطناعي
                  </li>
                )}
                <li className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  الوصول الكامل بعد انتهاء الفترة الحالية
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
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
                className="w-full rounded-full border border-stone-200 dark:border-stone-700 py-3 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
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
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">حذف الحساب</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              سيتم حذف حسابك وجميع بياناتك نهائيًا. إذا كان لديك اشتراك نشط، سيتم إلغاؤه فورًا. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                اكتب <span className="font-bold text-red-600 dark:text-red-400">حذف</span> أو <span className="font-bold text-red-600 dark:text-red-400">delete</span> للتأكيد
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="حذف"
                dir="auto"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            {!isOAuthUser && (
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">كلمة المرور</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="أدخل كلمة المرور للتأكيد"
                  dir="ltr"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
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
                className="flex-1 rounded-xl border border-stone-300 dark:border-stone-700 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
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
  const [stats, setStats] = useState({ total: 0, signedUp: 0, rewarded: 0 });
  const [rewardCodes, setRewardCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedReward, setCopiedReward] = useState<string | null>(null);
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

      const { data: refs } = await supabase.from('referrals').select('status, reward_code').eq('referrer_id', userId);
      if (mounted && refs) {
        setStats({
          total: refs.length,
          signedUp: refs.filter(r => r.status === 'signed_up' || r.status === 'subscribed' || r.status === 'rewarded').length,
          rewarded: refs.filter(r => r.status === 'rewarded').length,
        });
        setRewardCodes(refs.filter(r => r.reward_code).map(r => r.reward_code as string));
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

  const handleCopyReward = async (rewardCode: string) => {
    try {
      await navigator.clipboard.writeText(rewardCode);
      setCopiedReward(rewardCode);
      toast.success('تم نسخ كود المكافأة');
      setTimeout(() => setCopiedReward(null), 2000);
    } catch { toast.error('تعذّر النسخ'); }
  };

  if (loading) return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6 animate-pulse">
      <div className="h-5 w-32 bg-stone-200 dark:bg-stone-700 rounded mb-3" />
      <div className="h-3 w-48 bg-stone-100 dark:bg-stone-800 rounded mb-4" />
      <div className="h-10 w-full bg-stone-100 dark:bg-stone-800 rounded-xl mb-3" />
      <div className="grid grid-cols-3 gap-3"><div className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" /><div className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" /><div className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" /></div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-6">
      <div className="flex items-center gap-3 mb-1">
        <Gift className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">ادعُ صديقًا واحصل على شهر مجاني</h2>
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">شارك رابط الإحالة — عندما يشترك صديقك، تحصل على كود خصم ١٠٠٪ لشهر كامل!</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm font-mono text-stone-700 dark:text-stone-300 truncate" dir="ltr">
          {shareUrl}
        </div>
        <button onClick={handleCopy} className="shrink-0 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">
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
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.917l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.764-6.353-2.06l-.444-.333-3.16 1.06 1.06-3.16-.333-.444A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          واتساب
        </a>
        <button
          onClick={async () => {
            if (navigator.share) {
              try { await navigator.share({ title: 'pptides — دليل الببتيدات', text: shareText, url: shareUrl }); } catch { /* cancelled */ }
            } else { handleCopy(); }
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          <Share2 className="h-4 w-4" />
          مشاركة
        </button>
      </div>

      {/* Reward Codes */}
      {rewardCodes.length > 0 && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 mb-4">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">🎁 أكواد المكافآت الخاصة بك</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">استخدم هذه الأكواد عند الدفع للحصول على شهر مجاني</p>
          <div className="space-y-2">
            {rewardCodes.map((rc) => (
              <div key={rc} className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-950 px-3 py-2 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                  {rc}
                </div>
                <button
                  onClick={() => handleCopyReward(rc)}
                  className="shrink-0 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-950 p-2 text-emerald-700 transition-colors hover:bg-emerald-50 dark:bg-emerald-900/20"
                >
                  {copiedReward === rc ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-stone-50 dark:bg-stone-900 p-4">
        <p className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">إحصائيات الإحالة</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{stats.total}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">دعوات</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700">{stats.signedUp}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">سجّلوا</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.rewarded}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">مكافآت</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-3 text-center">كود الإحالة الخاص بك: <span className="font-mono font-bold" dir="ltr">{code}</span></p>
    </div>
  );
}

function SavedPeptides() {
  const { bookmarks, isLoading, toggle } = useBookmarks();

  const savedPeptides = allPeptides.filter((p) => bookmarks.has(p.id));

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الببتيدات المحفوظة</h2>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Heart className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الببتيدات المحفوظة</h2>
        {savedPeptides.length > 0 && (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {savedPeptides.length}
          </span>
        )}
      </div>

      {savedPeptides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 px-6 py-8 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">لم تحفظ أي ببتيدات بعد</p>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            تصفّح المكتبة
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {savedPeptides.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-3 transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <FlaskConical className="h-5 w-5 text-emerald-700" />
              </div>
              <Link to={`/peptide/${p.id}`} className="min-w-0 flex-1">
                <p className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors truncate">
                  {p.nameAr}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{p.nameEn}</p>
              </Link>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="shrink-0 rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="إزالة من المحفوظات"
              >
                <Heart className="h-4 w-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
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
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6">
      <div className="flex items-center gap-3 mb-1">
        <MessageSquare className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">استفسار خاص</h2>
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">هل لديك سؤال عن ببتيد معيّن أو بروتوكول؟ أرسل لنا وسنرد بأسرع وقت.</p>

      {sent ? (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <Check className="mx-auto h-8 w-8 text-emerald-700 mb-2" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">تم إرسال استفسارك</p>
          <p className="text-xs text-emerald-700 mt-1">سنرد عليك على {userEmail} في أقرب وقت</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="enquiry-peptide" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">الببتيد (اختياري)</label>
            <input
              id="enquiry-peptide"
              type="text"
              value={peptide}
              onChange={e => setPeptide(e.target.value)}
              placeholder="مثال: BPC-157"
              dir="ltr"
              maxLength={100}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div>
            <label htmlFor="enquiry-subject" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">الموضوع</label>
            <input
              id="enquiry-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="جرعة، تعارض، بروتوكول..."
              maxLength={200}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div>
            <label htmlFor="enquiry-message" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">رسالتك <span className="text-red-500 dark:text-red-400">*</span></label>
            <textarea
              id="enquiry-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              rows={4}
              maxLength={2000}
              required
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 outline-none resize-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 text-left" dir="ltr">{message.length}/2000</p>
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
        <div className="mt-4 border-t border-stone-100 dark:border-stone-800 pt-4">
          <p className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2">استفساراتك السابقة</p>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{h.subject}</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">{new Date(h.created_at).toLocaleDateString('ar-u-nu-latn')}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', h.status === 'replied' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : h.status === 'closed' ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400' : 'bg-amber-100 text-amber-700 dark:text-amber-400')}>{h.status === 'replied' ? 'تم الرد' : h.status === 'closed' ? 'مغلق' : 'قيد المراجعة'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
