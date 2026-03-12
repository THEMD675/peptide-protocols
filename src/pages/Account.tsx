import { useState, useEffect, useCallback, useRef } from 'react';
import SavedPeptides from '@/components/account/SavedPeptides';
import EnquiryForm from '@/components/account/EnquiryForm';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, Crown, LogOut, Trash2, AlertTriangle, Mail, ArrowUpCircle, KeyRound, XCircle, Download, CreditCard, Gift, Copy, Share2, Check, Send, MessageSquare, UserCircle, Camera, BarChart3, Syringe, Bot, Calendar, Heart, FlaskConical, Moon, Sun, Chrome, Bell, BellOff } from 'lucide-react';

import { toast } from 'sonner';
import { cn, arPlural, sanitizeInput } from '@/lib/utils';
import { SUPPORT_EMAIL, STATUS_LABELS, TIER_LABELS, PEPTIDE_COUNT, SITE_URL, PRICING } from '@/lib/constants';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { REFERRAL, RETENTION } from '@/constants/sales-copy';

export default function Account() {
  const { user, subscription, logout, refreshSubscription, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifProduct, setNotifProduct] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);

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
    supabase.from('user_profiles').select('display_name, weight_kg, goals, avatar_url, email_notifications_enabled, product_updates_enabled').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setProfileDisplayName(data.display_name ?? '');
          setProfileWeight(data.weight_kg != null ? String(data.weight_kg) : '');
          setProfileGoals(Array.isArray(data.goals) ? data.goals : []);
          if (data.avatar_url) setProfilePicUrl(data.avatar_url);
          setNotifEmail(data.email_notifications_enabled ?? true);
          setNotifProduct(data.product_updates_enabled ?? true);
        }
      })
      .catch(() => { /* profile load failed — non-critical, defaults remain */ })
      .finally(() => setProfileLoading(false));
  }, [user]);

  // Load usage stats
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const loadStats = async () => {
      const [injRes, protoRes, coachRes, authRes] = await Promise.all([
        supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_protocols').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('community_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        // Fix: UUID v4 first segment is random (not a timestamp) — get real created_at from auth
        supabase.auth.getUser(),
      ]);
      if (!mounted) return;
      if (injRes.error) console.error('injection_logs count failed:', injRes.error);
      if (protoRes.error) console.error('user_protocols count failed:', protoRes.error);
      if (coachRes.error) console.error('community_logs count failed:', coachRes.error);
      const fullUser = authRes.data?.user;
      const memberSinceDate = fullUser?.created_at
        ? new Date(fullUser.created_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long' })
        : new Date().toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long' });
      setUsageStats({
        injections: injRes.count ?? 0,
        protocols: protoRes.count ?? 0,
        coachMessages: coachRes.count ?? 0,
        memberSince: memberSinceDate,
      });
    };
    loadStats().catch((e: unknown) => console.warn("silent catch:", e));
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
        const { error: avatarErr } = await supabase.from('user_profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        if (avatarErr) { console.error('avatar url update failed:', avatarErr); toast.error('تعذّر تحديث صورة الملف الشخصي'); return; }
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
      // Sanitize display name: strip HTML tags, limit to 50 chars
      const sanitizedName = profileDisplayName.trim().replace(/<[^>]+>/g, '').slice(0, 50) || null;
      const { error } = await supabase.from('user_profiles').update({
        display_name: sanitizedName,
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

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-pulse">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-stone-200 dark:bg-stone-700" />
          <div className="mx-auto h-8 w-40 rounded-lg bg-stone-200 dark:bg-stone-700 mb-2" />
          <div className="mx-auto h-4 w-56 rounded bg-stone-100 dark:bg-stone-800" />
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800" />)}
          </div>
          {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-2xl bg-stone-100 dark:bg-stone-800" />)}
        </div>
      </div>
    );
  }

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
      await supabase.from('email_list').update({ email: newEmail.trim().toLowerCase() }).eq('email', user.email).catch((e) => { console.error('Account: email_list sync failed', e); });
      const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
      if (sub?.stripe_customer_id) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ action: 'sync_email', user_id: user.id, new_email: newEmail.trim().toLowerCase() }),
        }).catch((e: unknown) => console.warn("silent catch:", e));
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
        const headers = 'التاريخ,الوقت,الببتيد,الجرعة,الوحدة,موقع الحقن,ملاحظات';
        const rows = logs.map(l => {
          const d = new Date(l.logged_at as string);
          return [
            escapeCSV(d.toLocaleDateString('ar-u-nu-latn')),
            escapeCSV(d.toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' })),
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
              <img src={profilePicUrl} alt="صورة الملف الشخصي" width={80} height={80} className="h-full w-full object-cover" loading="lazy" />
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
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-300">{profileDisplayName || user?.email || 'إدارة حسابك واشتراكك'}</p>
      </div>

      <div className="space-y-6">
        {/* Usage Stats Dashboard */}
        {usageStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-emerald-700" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{usageStats.injections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">حقنة مسجلة</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm">
              <Calendar className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{usageStats.protocols}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">بروتوكول نشط</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm">
              <Bot className="mx-auto mb-1 h-5 w-5 text-purple-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{usageStats.coachMessages}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">رسالة مع المدرب</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm">
              <BarChart3 className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">{usageStats.memberSince || '—'}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">عضو منذ</p>
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
              {subscription.tier !== 'free' && (subscription.status === 'active' || subscription.status === 'trial') && (
                <p className="text-xs font-bold text-emerald-600 mt-0.5" dir="ltr">
                  {subscription.tier === 'elite'
                    ? `${PRICING.elite.monthly} ر.س / شهر`
                    : `${PRICING.essentials.monthly} ر.س / شهر`}
                </p>
              )}
              <p className={cn(
                'text-sm font-medium',
                subscription.isProOrTrial ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-300',
              )}>
                {subscription.isProOrTrial && subscription.status === 'cancelled'
                  ? 'نشط (ملغي — ينتهي الوصول قريبًا)'
                  : STATUS_LABELS[subscription.status] ?? subscription.status}
                {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
                  <span className="text-amber-600 ms-2">({arPlural(subscription.trialDaysLeft, 'يوم واحد', 'يومان', 'أيام')} متبقية)</span>
                )}
              </p>
              {subscription.status === 'active' && subscription.currentPeriodEnd && (
                <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">
                  يتجدد في {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </p>
              )}
              {subscription.status === 'cancelled' && subscription.currentPeriodEnd && (
                <p className="text-xs text-amber-600 mt-1">
                  وصولك ينتهي في {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </p>
              )}
            </div>
          </div>
          {(subscription.status === 'expired' || subscription.status === 'none') && (
            <Link
              to="/pricing"
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700"
            >
              <ArrowUpCircle className="h-4 w-4" />
              اشترك الآن
            </Link>
          )}
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
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
                <label htmlFor="profile-display-name" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">الاسم المعروض</label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                  placeholder="اسمك أو لقبك"
                  maxLength={100}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                />
              </div>
              <div>
                <label htmlFor="profile-weight" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">الوزن (كجم)</label>
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
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">الأهداف</label>
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
                          : 'border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20',
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
                className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {profileSaving ? 'جارٍ الحفظ...' : 'حفظ الملف الشخصي'}
              </button>
            </form>
          )}
        </div>

        {/* Email Card */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">البريد الإلكتروني</h2>
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-200 mb-4" dir="ltr">{user.email}</p>
          <form onSubmit={(e) => { e.preventDefault(); handleChangeEmail(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="new-email" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">بريد إلكتروني جديد</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                autoComplete="email"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-left text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading || !newEmail.trim()}
              className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              {emailLoading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ التغيير</span> : 'تغيير البريد'}
            </button>
          </form>
        </div>

        {/* Change Password — only for email users; OAuth users have no password */}
        {!isOAuthUser && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">تغيير كلمة المرور</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="flex flex-col gap-3">
            <div>
              <label htmlFor="account-current-password" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">كلمة المرور الحالية</label>
              <input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="كلمة المرور الحالية"
                dir="ltr"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-left text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>
            <div>
              <label htmlFor="account-new-password" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">كلمة المرور الجديدة</label>
              <input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                dir="ltr"
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-left text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !currentPassword}
              className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              {passwordLoading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ التغيير</span> : 'تغيير كلمة المرور'}
            </button>
          </form>
        </div>
        )}

        {/* Connected Accounts — for OAuth users (Google, etc.) */}
        {isOAuthUser && (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Chrome className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الحساب المرتبط</h2>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                <Chrome className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {user.provider === 'google' ? 'Google' : user.provider}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-300">{user.email}</p>
              </div>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">مرتبط</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-300 mt-3">تسجيل دخولك عبر {user.provider === 'google' ? 'Google' : user.provider} — لا توجد كلمة مرور محلية لهذا الحساب.</p>
          </div>
        )}

        {/* Preferences: Theme + Notifications */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sun className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">التفضيلات</h2>
          </div>
          <div className="space-y-4">
            {/* Theme toggle */}
            <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-3">
                {theme === 'dark'
                  ? <Moon className="h-5 w-5 text-stone-500 dark:text-stone-300" />
                  : <Sun className="h-5 w-5 text-amber-500" />}
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">المظهر</p>
                  <p className="text-xs text-stone-500 dark:text-stone-300">{theme === 'dark' ? 'الوضع الداكن مفعّل' : 'الوضع الفاتح مفعّل'}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2',
                  theme === 'dark' ? 'bg-emerald-600' : 'bg-stone-300',
                )}
                aria-label="تبديل المظهر"
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <span className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  theme === 'dark' ? 'translate-x-[-2px] rtl:translate-x-[2px]' : 'translate-x-[-22px] rtl:translate-x-[22px]',
                )} />
              </button>
            </div>

            {/* Email notifications */}
            <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-3">
                {notifEmail
                  ? <Bell className="h-5 w-5 text-emerald-700" />
                  : <BellOff className="h-5 w-5 text-stone-400" />}
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">إشعارات البريد الإلكتروني</p>
                  <p className="text-xs text-stone-500 dark:text-stone-300">تحديثات الاشتراك والتذكيرات</p>
                </div>
              </div>
              <button
                disabled={notifLoading}
                onClick={async () => {
                  if (!user) return;
                  const next = !notifEmail;
                  setNotifLoading(true);
                  try {
                    const { error } = await supabase.from('user_profiles').update({ email_notifications_enabled: next, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                    if (error) throw error;
                    setNotifEmail(next);
                    toast.success(next ? 'تم تفعيل إشعارات البريد' : 'تم إيقاف إشعارات البريد');
                  } catch { toast.error('تعذّر تحديث التفضيل — حاول مرة أخرى'); }
                  finally { setNotifLoading(false); }
                }}
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2',
                  notifEmail ? 'bg-emerald-600' : 'bg-stone-300',
                  notifLoading && 'opacity-50 cursor-wait',
                )}
                aria-label="تبديل إشعارات البريد"
                role="switch"
                aria-checked={notifEmail}
              >
                <span className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  notifEmail ? 'translate-x-[-2px] rtl:translate-x-[2px]' : 'translate-x-[-22px] rtl:translate-x-[22px]',
                )} />
              </button>
            </div>

            {/* Product updates */}
            <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-3">
                {notifProduct
                  ? <Bell className="h-5 w-5 text-blue-500" />
                  : <BellOff className="h-5 w-5 text-stone-400" />}
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">تحديثات المنتج</p>
                  <p className="text-xs text-stone-500 dark:text-stone-300">ببتيدات جديدة وميزات</p>
                </div>
              </div>
              <button
                disabled={notifLoading}
                onClick={async () => {
                  if (!user) return;
                  const next = !notifProduct;
                  setNotifLoading(true);
                  try {
                    const { error } = await supabase.from('user_profiles').update({ product_updates_enabled: next, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                    if (error) throw error;
                    setNotifProduct(next);
                    toast.success(next ? 'تم تفعيل تحديثات المنتج' : 'تم إيقاف تحديثات المنتج');
                  } catch { toast.error('تعذّر تحديث التفضيل — حاول مرة أخرى'); }
                  finally { setNotifLoading(false); }
                }}
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2',
                  notifProduct ? 'bg-emerald-600' : 'bg-stone-300',
                  notifLoading && 'opacity-50 cursor-wait',
                )}
                aria-label="تبديل تحديثات المنتج"
                role="switch"
                aria-checked={notifProduct}
              >
                <span className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  notifProduct ? 'translate-x-[-2px] rtl:translate-x-[2px]' : 'translate-x-[-22px] rtl:translate-x-[22px]',
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الاشتراك</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600 dark:text-stone-300">الباقة</span>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                subscription.tier === 'elite'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : subscription.tier === 'essentials'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
              )}>
                {TIER_LABELS[subscription.tier] ?? subscription.tier}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600 dark:text-stone-300">الحالة</span>
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                subscription.isProOrTrial
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : subscription.status === 'past_due'
                    ? 'bg-amber-100 text-amber-700 dark:text-amber-400'
                    : subscription.status === 'expired'
                      ? 'bg-red-100 text-red-700 dark:text-red-400'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
              )}>
                {subscription.isProOrTrial && subscription.status === 'cancelled'
                  ? 'نشط'
                  : STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </div>
            {subscription.status === 'active' && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-300">يتجدد في</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </span>
              </div>
            )}
            {subscription.status === 'cancelled' && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-300">ينتهي الوصول في</span>
                <span className="text-sm font-bold text-amber-600">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-u-nu-latn')}
                </span>
              </div>
            )}
            {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-300">الأيام المتبقية</span>
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
                      email: user.email?.slice(0, 320),
                      subject: 'refund_request',
                      message: sanitizeInput('طلب استرداد أموال', 5000),
                      peptide_name: null,
                    });
                    if (error) throw error;
                    toast.success('تم إرسال طلب الاسترداد — سنتواصل معك قريبًا');
                  } catch { toast.error('تعذّر إرسال طلب الاسترداد. حاول مرة أخرى.'); }
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
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
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700"
              >
                <ArrowUpCircle className="h-4 w-4" />
                {subscription.status === 'expired' ? 'جدّد اشتراكك الآن' : 'اشترك الآن'}
              </Link>
            </div>
          )}
          {subscription.status !== 'expired' && subscription.status !== 'none' && subscription.tier !== 'elite' && (
            <Link
              to="/pricing"
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700"
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
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Download className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">تصدير بياناتي</h2>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">حمّل نسخة كاملة من جميع بياناتك — حقك في نقل البيانات مكفول</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => handleExportData('json')}
              className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              تصدير بياناتي (JSON)
            </button>
            <button
              onClick={() => handleExportData('csv')}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <Download className="h-4 w-4" />
              تصدير CSV (سجل الحقن)
            </button>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-300 mt-3 text-center">يشمل: سجل الحقن، البروتوكولات، العافية، التحاليل، الأعراض الجانبية، والملف الشخصي</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Logout — always visible on account page */}
          <button
            onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>

          {(subscription.isPaidSubscriber || subscription.isTrial) && subscription.status !== 'cancelled' && !subscription.isAdminGrant && (
            subscription.isTrial && !subscription.hasStripeSubscription ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-6 py-3 text-sm text-stone-500 dark:text-stone-300">
                فترتك التجريبية ستنتهي تلقائياً
              </div>
            ) : (
              <button
                onClick={() => { setShowCancelDialog(true); setCancelStep('survey'); setCancelReason(''); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <XCircle className="h-4 w-4" />
                {subscription.isTrial ? 'إلغاء التجربة' : 'إلغاء الاشتراك'}
              </button>
            )
          )}
          {(subscription.isPaidSubscriber || subscription.isTrial) && (
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('طلب استرداد — pptides')}&body=${encodeURIComponent(`مرحبًا،\n\nأرغب في استرداد اشتراكي.\n\nالبريد: ${user?.email ?? ''}\n\nشكرًا`)}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-bold text-amber-700 dark:text-amber-400 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <CreditCard className="h-4 w-4" />
              طلب استرداد
            </a>
          )}
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-50 dark:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            حذف الحساب نهائيًا
          </button>
        </div>
      </div>

      {/* Cancel Subscription Dialog — survey step */}
      {showCancelDialog && cancelStep === 'survey' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in" onClick={() => { setShowCancelDialog(false); setCancelStep(null); }}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">لماذا تريد الإلغاء؟</h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">ساعدنا في تحسين الخدمة — اختر السبب الرئيسي</p>
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
                      : 'border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800',
                  )}
                >
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    cancelReason === opt.id ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300 dark:border-stone-600',
                  )}>
                    {cancelReason === opt.id && <span className="h-2 w-2 rounded-full bg-white dark:bg-stone-900" />}
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
                      email: user.email?.slice(0, 320),
                      subject: 'cancel_reason',
                      message: sanitizeInput(cancelReason, 5000),
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
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700"
              >
                {RETENTION.keepCta}
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
          <div role="dialog" aria-modal="true" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{RETENTION.heading}</h3>
            <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 mb-4">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">{RETENTION.offerBadge}</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{RETENTION.offerBody}</p>
              <button
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    const { data: sub } = await supabase.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).maybeSingle();
                    if (!sub?.stripe_subscription_id) { toast.error('لم نجد اشتراكك في Stripe'); return; }
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
                      method: 'POST',
                      signal: AbortSignal.timeout(15000),
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
                      body: JSON.stringify({ apply_coupon: true, reason: cancelReason }),
                    });
                    if (res.ok) {
                      toast.success(RETENTION.appliedToast);
                      setShowCancelDialog(false); setCancelStep(null);
                    } else {
                      toast.error(RETENTION.failedToast);
                    }
                  } catch { toast.error('خطأ في الاتصال'); } finally { setIsProcessing(false); }
                }}
                disabled={isProcessing}
                className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {RETENTION.acceptCta}
              </button>
            </div>
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm font-bold text-red-800 mb-2">{RETENTION.loseHeading}</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  {RETENTION.loseProtocols}
                </li>
                {subscription.tier === 'elite' && (
                  <li className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    {RETENTION.loseCoach}
                  </li>
                )}
                <li className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  {RETENTION.loseAccess}
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
              >
                {isProcessing ? RETENTION.cancellingText : RETENTION.proceedCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.info(RETENTION.pauseToast);
                  setShowCancelDialog(false);
                  setCancelStep(null);
                }}
                className="w-full rounded-full border border-stone-200 dark:border-stone-600 py-3 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                {RETENTION.pauseOption}
              </button>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelStep(null); }}
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700"
              >
                {RETENTION.keepCta}
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
          <div role="dialog" aria-modal="true" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">حذف الحساب</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              سيتم حذف حسابك وجميع بياناتك نهائيًا. إذا كان لديك اشتراك نشط، سيتم إلغاؤه فورًا. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">
                اكتب <span className="font-bold text-red-600 dark:text-red-400">حذف</span> أو <span className="font-bold text-red-600 dark:text-red-400">delete</span> للتأكيد
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="حذف"
                dir="auto"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            {!isOAuthUser && (
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">كلمة المرور</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="أدخل كلمة المرور للتأكيد"
                  dir="ltr"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isProcessing || (deleteConfirmText !== 'حذف' && deleteConfirmText.toLowerCase() !== 'delete') || (!isOAuthUser && !deletePassword)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'جارٍ الحذف...' : 'حذف حسابي نهائيًا'}
              </button>
              <button
                onClick={closeDialogs}
                className="flex-1 rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
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
      const { data: sub, error: subErr } = await supabase.from('subscriptions').select('referral_code').eq('user_id', userId).maybeSingle();
      if (subErr) console.error('referral subscription query failed:', subErr);
      if (!mounted) return;

      let refCode = sub?.referral_code;
      if (!refCode) {
        refCode = generateCode();
        const { error: rpcErr } = await supabase.rpc('set_referral_code', { p_code: refCode });
        if (rpcErr) console.error('set_referral_code RPC failed:', rpcErr);
      }
      setCode(refCode);

      const { data: refs, error: refsErr } = await supabase.from('referrals').select('status, reward_code').eq('referrer_id', userId);
      if (refsErr) console.error('referrals query failed:', refsErr);
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
  const shareText = REFERRAL.shareText(shareUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(REFERRAL.copySuccess);
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
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6 animate-pulse">
      <div className="h-5 w-32 bg-stone-200 dark:bg-stone-700 rounded mb-3" />
      <div className="h-3 w-48 bg-stone-100 dark:bg-stone-800 rounded mb-4" />
      <div className="h-10 w-full bg-stone-100 dark:bg-stone-800 rounded-xl mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" /><div className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" /><div className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" /></div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-6">
      <div className="flex items-center gap-3 mb-1">
        <Gift className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{REFERRAL.accountHeading}</h2>
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">{REFERRAL.accountDescription}</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-mono text-stone-700 dark:text-stone-200 truncate" dir="ltr">
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
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          <Share2 className="h-4 w-4" />
          مشاركة
        </button>
      </div>

      {/* Reward Codes */}
      {rewardCodes.length > 0 && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 mb-4">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">{REFERRAL.rewardCodesTitle}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">{REFERRAL.rewardCodesDesc}</p>
          <div className="space-y-2">
            {rewardCodes.map((rc) => (
              <div key={rc} className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                  {rc}
                </div>
                <button
                  onClick={() => handleCopyReward(rc)}
                  className="shrink-0 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 p-2 text-emerald-700 transition-colors hover:bg-emerald-50 dark:bg-emerald-900/20"
                >
                  {copiedReward === rc ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-stone-50 dark:bg-stone-900 p-4">
        <p className="text-xs font-bold text-stone-500 dark:text-stone-300 mb-2">{REFERRAL.statsLabel}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{stats.total}</p>
            <p className="text-xs text-stone-500 dark:text-stone-300">{REFERRAL.statsInvites}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700">{stats.signedUp}</p>
            <p className="text-xs text-stone-500 dark:text-stone-300">{REFERRAL.statsSignedUp}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.rewarded}</p>
            <p className="text-xs text-stone-500 dark:text-stone-300">{REFERRAL.statsRewarded}</p>
          </div>
        </div>
      </div>

      {/* Referral reward cap indicator */}
      <div className="mt-4 rounded-xl bg-stone-50 dark:bg-stone-900 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300">حد المكافآت: 5 إحالات</p>
          <p className="text-xs font-mono text-stone-500 dark:text-stone-300">{Math.min(stats.rewarded, 5)}/5</p>
        </div>
        <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min((stats.rewarded / 5) * 100, 100)}%` }}
          />
        </div>
        {stats.rewarded >= 5 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 text-center">وصلت للحد الأقصى من المكافآت!</p>
        )}
      </div>

      <p className="text-[11px] text-stone-500 dark:text-stone-300 mt-3 text-center">كود الإحالة الخاص بك: <span className="font-mono font-bold" dir="ltr">{code}</span></p>
    </div>
  );
}


/* SavedPeptides and EnquiryForm extracted to @/components/account/ */
