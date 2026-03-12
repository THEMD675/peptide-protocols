import { useState, useEffect, useCallback, useRef } from 'react';

const TH_CLASS = 'px-3 py-2 text-start font-medium text-stone-600 dark:text-stone-300';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Users, CreditCard, MessageSquare, Star, Mail, Activity, TrendingUp,
  AlertTriangle, RefreshCw, Shield, Reply, Send, X, Clock, Zap,
  AlertCircle, Info, ArrowUpRight, ArrowDownRight, Download,
  Trash2, Ban, CalendarPlus, Heart, ShieldCheck,
  CheckCircle, XCircle, Loader2, RotateCcw, ClipboardList,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { PRICING } from '@/lib/constants';

const STATUS_AR: Record<string, string> = {
  active: 'نشط', trial: 'تجريبي', expired: 'منتهي', cancelled: 'ملغي',
  past_due: 'متأخر', none: 'بدون', pending: 'معلق', replied: 'تم الرد',
  sent: 'مرسل', failed: 'فشل', succeeded: 'ناجح',
  severe: 'شديد', moderate: 'متوسط', mild: 'خفيف', google: 'جوجل',
};

const ACTION_AR: Record<string, string> = {
  extend_trial: 'تمديد التجربة', grant_subscription: 'منح اشتراك',
  update_subscription: 'تحديث اشتراك', cancel_subscription: 'إلغاء اشتراك',
  suspend_user: 'تعليق مستخدم', unsuspend_user: 'إلغاء التعليق',
  delete_user: 'حذف مستخدم', send_email: 'إرسال بريد',
  approve_review: 'قبول مراجعة', delete_review: 'حذف مراجعة',
  reply_enquiry: 'الرد على استفسار', refund_payment: 'استرداد دفعة',
  health_check: 'فحص النظام', verify_stripe: 'فحص Stripe',
  export_csv: 'تصدير CSV', bulk_email_sent: 'بريد جماعي',
};

// ========================================================
// TYPES
// ========================================================

interface Alert { type: string; severity: 'critical' | 'warning' | 'info'; message: string; data?: Record<string, unknown> }
interface ActivityItem { type: string; description: string; email?: string; created_at: string }
interface Funnel { totalSignups: number; trialStarts: number; paidConversions: number; signupToTrial: number; trialToPaid: number }
interface HealthCheck { status: string; checks: Record<string, { status: string; detail: string; ms: number }>; timestamp: string }
interface StripeVerify { status: string; prices: Record<string, unknown>; webhooks: unknown[]; eventsOk: boolean; missingEvents: string[]; timestamp: string }

interface AdminStats {
  pagination: { page: number; perPage: number; totalFilteredUsers: number; totalPages: number; searchQuery: string | null } | null;
  overview: {
    totalUsers: number; signupsToday: number; signupsWeek: number; signupsMonth: number;
    totalSubscriptions: number; activeSubscriptions: number; trialSubscriptions: number;
    expiredSubscriptions: number; pastDueSubscriptions: number; essentialsActive: number;
    eliteActive: number; trialEssentials: number; trialElite: number; mrr: number;
    totalInjectionLogs: number; totalCoachRequests: number; totalCommunityPosts: number;
    pendingReviews: number; approvedReviews: number; emailListCount: number;
    pendingEnquiries: number; totalEnquiries: number; totalAuthUsers: number;
    unconfirmedUsers: number; manualSubscriptions: number;
  };
  alerts: Alert[];
  funnel: Funnel;
  activityFeed: ActivityItem[];
  recentUsers: Array<{
    id: string; email: string; created_at: string; last_sign_in_at: string | null;
    provider: string; confirmed: boolean;
    subscription: { status: string; tier: string; stripe_subscription_id: string | null; trial_ends_at: string | null; current_period_end: string | null; created_at: string } | null;
  }>;
  pendingReviews: Array<{ id: string; name: string; rating: number; content: string; created_at: string }>;
  emailList: Array<{ id: string; email: string; created_at: string }>;
  enquiries: Array<{ id: string; email: string; subject: string; peptide_name: string | null; message: string; status: string; admin_notes: string | null; created_at: string }>;
  revenueByMonth?: Array<{ month: string; revenue: number }>;
  signupsByDay?: Array<{ date: string; signups: number }>;
  signupsByWeek?: Array<{ date: string; signups: number }>;
  signupsByMonth?: Array<{ date: string; signups: number }>;
  emailLogs: Array<{ id: string; email: string; type: string; status: string; created_at: string }>;
  webhookEvents: Array<{ id: string; event_type: string; event_id: string; processed_at: string }>;
}

interface UserDetail {
  user: { id: string; email: string; provider: string; confirmed: boolean; created_at: string; last_sign_in_at: string | null; banned_until: string | null };
  subscription: { status: string; tier: string; stripe_subscription_id: string | null; stripe_customer_id: string | null; current_period_end: string | null; trial_ends_at: string | null; created_at: string } | null;
  injection_logs: Array<Record<string, unknown>>;
  wellness_logs: Array<Record<string, unknown>>;
  side_effect_logs: Array<Record<string, unknown>>;
  user_protocols: Array<Record<string, unknown>>;
  ai_coach_request_count: number;
  enquiries: Array<Record<string, unknown>>;
  email_logs: Array<Record<string, unknown>>;
}

type Tab = 'overview' | 'users' | 'activity' | 'reviews' | 'enquiries' | 'emails' | 'email-logs' | 'payments' | 'health' | 'audit';
type UserFilter = 'all' | 'active' | 'trial' | 'expired' | 'none';
type ModalType = 'extend_trial' | 'grant_sub' | 'send_email' | 'confirm_delete' | 'confirm_suspend' | 'cancel_sub' | 'bulk_email' | 'refund' | null;

const PER_PAGE = 20;

const EMAIL_TEMPLATES: { key: string; label: string; subject: string; body: string }[] = [
  { key: 'custom', label: 'مخصص', subject: '', body: '' },
  {
    key: 'trial_ending',
    label: 'تذكير انتهاء التجربة',
    subject: 'اشتراكك التجريبي ينتهي قريبًا',
    body: 'مرحبًا،\n\nنود تذكيرك بأن فترتك التجريبية المجانية على pptides.com ستنتهي قريبًا.\n\nلا تفوّت الوصول إلى بروتوكولات الببتيد المتقدمة والمدرب الذكي وجميع الميزات الحصرية.\n\nاشترك الآن للاستمرار بدون انقطاع:\nhttps://pptides.com/pricing\n\nفريق pptides',
  },
  {
    key: 'winback',
    label: 'عرض استعادة',
    subject: 'نشتاق لك! عرض خاص',
    body: 'مرحبًا،\n\nلاحظنا أنك لم تعد معنا في pptides.com ونشتاق لوجودك!\n\nلدينا عرض خاص لك: خصم 20% على أي باقة عند عودتك.\n\nاستخدم الكود: retention_20_pct عند الاشتراك\nhttps://pptides.com/pricing?coupon=retention_20_pct\n\nالعرض محدود — لا تفوّته!\n\nفريق pptides',
  },
  {
    key: 'upsell',
    label: 'ترقية للمتقدمة',
    subject: 'اكتشف ميزات الباقة المتقدّمة',
    body: 'مرحبًا،\n\nشكرًا لاشتراكك في باقة الأساسيات! هل تعلم أن باقة Elite تمنحك:\n\n- بروتوكولات متقدمة حصرية\n- محادثات غير محدودة مع المدرب الذكي\n- تتبع متقدم للأعراض الجانبية\n- أولوية الدعم\n\nقم بالترقية الآن واستفد من كل الإمكانيات:\nhttps://pptides.com/pricing\n\nفريق pptides',
  },
];

interface StripePayment {
  id: string;
  payment_intent: string | null;
  amount: number;
  currency: string;
  status: string;
  created: string;
}

// ========================================================
// HELPERS
// ========================================================

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const days = Math.floor(h / 24);
  if (days < 7) return `منذ ${days} ي`;
  return new Date(d).toLocaleDateString('ar-SA');
}

function trialLeft(t: string | null): { text: string; urgent: boolean } | null {
  if (!t) return null;
  const ms = new Date(t).getTime() - Date.now();
  if (ms < 0) return { text: 'منتهي', urgent: true };
  const h = Math.floor(ms / 3600000);
  if (h < 48) return { text: `${h} ساعة متبقية`, urgent: true };
  return { text: `${Math.floor(h / 24)} يوم متبقي`, urgent: false };
}

// ========================================================
// REUSABLE COMPONENTS
// ========================================================

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40">&laquo;</button>
      {Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
        .reduce<(number | 'e')[]>((a, p, i, arr) => { if (i > 0 && p - (arr[i - 1]) > 1) a.push('e'); a.push(p); return a; }, [])
        .map((p, i) => p === 'e' ? <span key={`e${i}`} className="px-1 text-xs text-stone-400">&hellip;</span> :
          <button key={p} onClick={() => onChange(p)} className={cn('rounded-lg px-2.5 py-1.5 text-xs font-medium', page === p ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800')}>{p}</button>
        )}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40">&raquo;</button>
    </div>
  );
}

function Stat({ label, value, icon: I, sub, alert: a, trend }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; alert?: boolean;
  trend?: { dir: 'up' | 'down'; label: string };
}) {
  return (
    <div className={cn('rounded-xl border p-4', a ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-300">{label}</span>
        <I className={cn('h-4 w-4', a ? 'text-red-500 dark:text-red-400' : 'text-emerald-500')} />
      </div>
      <p className={cn('text-2xl font-bold', a ? 'text-red-700 dark:text-red-400' : 'text-stone-900 dark:text-stone-100')}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-stone-500 dark:text-stone-300">{sub}</p>}
        {trend && <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', trend.dir === 'up' ? 'text-emerald-700' : 'text-red-600 dark:text-red-400')}>
          {trend.dir === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{trend.label}
        </span>}
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const s: Record<string, string> = { active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', trial: 'bg-blue-100 text-blue-700 dark:text-blue-400', expired: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300', cancelled: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300', past_due: 'bg-red-100 text-red-700 dark:text-red-400', none: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300' };
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', s[status] ?? s.none)}>{STATUS_AR[status] ?? status}</span>;
}

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  const titleId = 'modal-title';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} tabIndex={-1}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          <button onClick={onClose} aria-label="إغلاق" className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"><X className="h-5 w-5 text-stone-500 dark:text-stone-300" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, React.ElementType> = { signup: Users, coach: MessageSquare, injection: Activity, community: Users, review: Star, enquiry: Mail };
const ACTIVITY_COLOR: Record<string, string> = { signup: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700', coach: 'bg-violet-100 text-violet-600', injection: 'bg-blue-100 text-blue-600', community: 'bg-amber-100 text-amber-600', review: 'bg-yellow-100 text-yellow-600', enquiry: 'bg-rose-100 text-rose-600' };

// ========================================================
// MAIN
// ========================================================

// UX guard only — real authorization is enforced server-side in admin-stats and admin-actions edge functions.
// Keep in sync with supabase/functions/_shared/admin-auth.ts DEFAULT_ADMIN_EMAILS.
const ADMIN_EMAILS = [
  'abdullah@amirisgroup.co',
  'abdullahalameer@gmail.com',
  'abdullahameeer32@gmail.com',
  'contact@pptides.com',
];

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(() => {
    // Client-side guard: immediately block non-admin users
    return false;
  });
  const [tab, setTab] = useState<Tab>('overview');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Users tab
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [usersPage, setUsersPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Enquiries
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [emailLogsPage, setEmailLogsPage] = useState(1);

  // Modals & actions
  const [modal, setModal] = useState<ModalType>(null);
  const [modalTarget, setModalTarget] = useState<{ id: string; email: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal form state
  const [extendDays, setExtendDays] = useState(3);
  const [grantTier, setGrantTier] = useState<'essentials' | 'elite'>('essentials');
  const [grantDuration, setGrantDuration] = useState(30);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [bulkAudience, setBulkAudience] = useState<'all' | 'trial' | 'active' | 'expired'>('all');

  // Health
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [stripeVerify, setStripeVerify] = useState<StripeVerify | null>(null);
  const [stripeVerifyLoading, setStripeVerifyLoading] = useState(false);
  const [approvingReviewId, setApprovingReviewId] = useState<string | null>(null);

  // Audit log
  const [auditLog, setAuditLog] = useState<Array<{ id: string; admin_email: string; action: string; target_user_id: string | null; details: Record<string, unknown> | null; created_at: string }>>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [signupsPeriod, setSignupsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // User detail
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailOpen, setUserDetailOpen] = useState(false);

  // Email template
  const [emailTemplate, setEmailTemplate] = useState('custom');

  // Refund
  const [refundId, setRefundId] = useState('');
  const [userPayments, setUserPayments] = useState<StripePayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // User notes
  const [userNotes, setUserNotes] = useState<Array<{ id: string; note: string; admin_email: string; created_at: string }>>([]);
  const [userNotesLoading, setUserNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const getToken = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const s = await supabase.auth.getSession();
    return s.data.session?.access_token ?? '';
  }, []);

  // --- Fetch stats ---
  const fetchStats = useCallback(async (search?: string, page?: number, filter?: UserFilter) => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`);
      if (search) url.searchParams.set('search', search);
      if (page) url.searchParams.set('page', String(page));
      if (filter && filter !== 'all') url.searchParams.set('filter', filter);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      });
      if (res.status === 403) { setForbidden(true); return; }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشلت العملية');
      const d = await res.json();
      setStats({ ...d, pagination: d.pagination ?? null, alerts: d.alerts ?? [], funnel: d.funnel ?? { totalSignups: 0, trialStarts: 0, paidConversions: 0, signupToTrial: 0, trialToPaid: 0 }, activityFeed: d.activityFeed ?? [], enquiries: d.enquiries ?? [], emailLogs: d.emailLogs ?? [], webhookEvents: d.webhookEvents ?? [], recentUsers: d.recentUsers ?? [], pendingReviews: d.pendingReviews ?? [], emailList: d.emailList ?? [], revenueByMonth: d.revenueByMonth ?? [], signupsByDay: d.signupsByDay ?? [], signupsByWeek: d.signupsByWeek ?? [], signupsByMonth: d.signupsByMonth ?? [] });
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل البيانات');
    } finally { setLoading(false); }
  }, [user, getToken]);

  useEffect(() => { if (user) fetchStats(); }, [user, fetchStats]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (userSearch.length >= 3) {
      searchTimerRef.current = setTimeout(() => fetchStats(userSearch, undefined, userFilter), 500);
    } else if (userSearch.length === 0) {
      fetchStats(undefined, undefined, userFilter);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  // --- Admin action caller ---
  const adminAction = useCallback(async (body: Record<string, unknown>) => {
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Action failed');
    return data;
  }, [getToken]);

  // --- Action handlers ---
  const handleExtendTrial = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      const r = await adminAction({ action: 'extend_trial', user_id: modalTarget.id, days: extendDays });
      toast.success(`تم تمديد التجربة حتى ${new Date(r.trial_ends_at).toLocaleDateString('ar-SA')}`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const handleGrantSub = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'grant_subscription', user_id: modalTarget.id, tier: grantTier, duration_days: grantDuration });
      toast.success(`تم منح اشتراك ${grantTier === 'essentials' ? 'أساسي' : 'نخبة'} لمدة ${grantDuration} يوم`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const handleCancelSub = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'cancel_subscription', user_id: modalTarget.id });
      toast.success('تم إلغاء الاشتراك');
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const handleSuspend = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'suspend_user', user_id: modalTarget.id });
      toast.success(`تم إيقاف ${modalTarget.email}`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'delete_user', user_id: modalTarget.id });
      toast.success(`تم حذف ${modalTarget.email}`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const handleSendEmail = async () => {
    setActionLoading(true);
    try {
      await adminAction({ action: 'send_email', to: emailTo, subject: emailSubject, text: emailBody });
      toast.success(`تم إرسال البريد إلى ${emailTo}`);
      setModal(null);
      setEmailTo(''); setEmailSubject(''); setEmailBody('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const handleBulkEmail = async () => {
    setActionLoading(true);
    try {
      const r = await adminAction({ action: 'send_email', to: 'bulk', audience: bulkAudience, subject: emailSubject, text: emailBody });
      toast.success(`تم إرسال ${r.sent} بريد (${r.failed} فشل)`);
      setModal(null);
      setEmailSubject(''); setEmailBody('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
    finally { setActionLoading(false); }
  };

  const applyTemplate = (key: string) => {
    setEmailTemplate(key);
    const tpl = EMAIL_TEMPLATES.find(t => t.key === key);
    if (tpl) {
      setEmailSubject(tpl.subject);
      setEmailBody(tpl.body);
    }
  };

  const fetchUserPayments = useCallback(async (userId: string) => {
    setPaymentsLoading(true);
    setUserPayments([]);
    try {
      const r = await adminAction({ action: 'get_payments', user_id: userId });
      setUserPayments(r.payments ?? []);
    } catch {
      setUserPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [adminAction]);

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const r = await adminAction({ action: 'health_check' });
      setHealth(r);
      toast.success(`الحالة: ${r.status === 'healthy' ? 'سليم' : r.status === 'degraded' ? 'منخفض' : 'غير سليم'}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل فحص النظام'); }
    finally { setHealthLoading(false); }
  };

  const runStripeVerify = async () => {
    setStripeVerifyLoading(true);
    try {
      const r = await adminAction({ action: 'verify_stripe' });
      setStripeVerify(r);
      toast.success(`Stripe: ${r.status === 'ok' ? 'سليم' : 'مشاكل'}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل التحقق من Stripe'); }
    finally { setStripeVerifyLoading(false); }
  };

  const exportCSV = async (table: string) => {
    try {
      const r = await adminAction({ action: 'export_csv', table });
      if (!r.data?.length) { toast.error('لا توجد بيانات'); return; }
      const headers = Object.keys(r.data[0]);
      const csv = [headers.join(','), ...r.data.map((row: Record<string, unknown>) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${table}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${r.count} صف`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل التصدير'); }
  };

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const r = await adminAction({ action: 'get_audit_log' });
      setAuditLog(r.data ?? []);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل تحميل سجل المراجعة'); }
    finally { setAuditLoading(false); }
  }, [adminAction]);

  useEffect(() => { if (tab === 'audit' && auditLog.length === 0) fetchAuditLog(); }, [tab, auditLog.length, fetchAuditLog]);

  const fetchUserNotes = useCallback(async (userId: string) => {
    setUserNotesLoading(true);
    try {
      const r = await adminAction({ action: 'get_user_notes', user_id: userId });
      setUserNotes(r.data ?? []);
    } catch { setUserNotes([]); }
    finally { setUserNotesLoading(false); }
  }, [adminAction]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setUserDetailLoading(true);
    setUserDetailOpen(true);
    setUserDetail(null);
    setUserNotes([]);
    setNewNote('');
    try {
      const r = await adminAction({ action: 'get_user_detail', user_id: userId });
      setUserDetail(r as UserDetail);
      fetchUserNotes(userId);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل تحميل تفاصيل المستخدم'); setUserDetailOpen(false); }
    finally { setUserDetailLoading(false); }
  }, [adminAction, fetchUserNotes]);

  // --- Open modal helpers ---
  const openUserAction = (type: ModalType, u: { id: string; email: string }) => { setModalTarget(u); setModal(type); };

  // --- Render gates ---
  // Client-side admin email whitelist guard
  if (user && !ADMIN_EMAILS.includes(user.email ?? '')) return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <Helmet><title>404 | pptides</title></Helmet>
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-stone-200 mb-4 sm:text-6xl">404</h1>
        <p className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">الصفحة غير موجودة</p>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-6">الصفحة التي تبحث عنها غير موجودة.</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors">
          الرئيسية
        </Link>
      </div>
    </div>
  );
  if (forbidden) return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950" lang="ar" dir="rtl">
      <Helmet><title>لوحة التحكم | pptides</title></Helmet>
      <div className="text-center px-4">
        <Shield className="mx-auto h-12 w-12 text-stone-300 mb-4" />
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">الوصول مرفوض</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-6">ليس لديك صلاحية للوصول إلى لوحة التحكم.</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors">
          العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Helmet><title>Admin | pptides</title></Helmet><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600" /></div>;
  if (error || !stats) return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <Helmet><title>Admin | pptides</title></Helmet>
      <div className="text-center px-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={fetchStats} className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700">إعادة المحاولة</button>
          <Link to="/dashboard" className="rounded-full border-2 border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">العودة للوحة التحكم</Link>
        </div>
      </div>
    </div>
  );

  const o = stats.overview;
  const critAlerts = stats.alerts.filter(a => a.severity === 'critical').length;

  const tabs: { key: Tab; label: string; count?: number; dot?: boolean }[] = [
    { key: 'overview', label: 'نظرة عامة', dot: critAlerts > 0 },
    { key: 'users', label: 'المستخدمون', count: o.totalUsers },
    { key: 'activity', label: 'النشاط', count: stats.activityFeed.length },
    { key: 'reviews', label: 'المراجعات', count: o.pendingReviews },
    { key: 'enquiries', label: 'الاستفسارات', count: o.pendingEnquiries },
    { key: 'emails', label: 'قائمة البريد', count: o.emailListCount },
    { key: 'email-logs', label: 'البريد المرسل', count: stats.emailLogs.length },
    { key: 'payments', label: 'المدفوعات', count: stats.webhookEvents.length },
    { key: 'health', label: 'صحة النظام' },
    { key: 'audit', label: 'سجل المراجعة' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950" lang="ar" dir="rtl">
      <Helmet><title>لوحة التحكم | pptides</title></Helmet>

      {/* ===================== HEADER ===================== */}
      <div className="sticky top-[64px] md:top-[72px] z-30 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-600 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-xs font-medium text-stone-500 dark:text-stone-300 hover:text-emerald-700 transition-colors shrink-0">← لوحة التحكم</Link>
            <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              مركز التحكم
              {critAlerts > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">{critAlerts}</span>}
            </h1>
            {lastFetched && <p className="text-[10px] text-stone-500 dark:text-stone-300">آخر تحديث {lastFetched.toLocaleTimeString('ar-SA')}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailTemplate('custom'); setModal('send_email'); setModalTarget(null); }}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800">
              <Send className="h-3.5 w-3.5" /> بريد
            </button>
            <button onClick={() => fetchStats()} disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> تحديث
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex gap-1 mt-3 overflow-x-auto" role="tablist" aria-label="أقسام لوحة التحكم">
          {tabs.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} onClick={() => setTab(t.key)} className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}>
              {t.dot && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {t.label}
              {t.count != null && <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', tab === t.key ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300')}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ===================== CONTENT ===================== */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-24">

        {/* ===================== OVERVIEW ===================== */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Alerts */}
            {stats.alerts.length > 0 && (
              <div className="space-y-2">
                {stats.alerts.map((a, i) => {
                  const Ic = a.severity === 'critical' ? AlertCircle : a.severity === 'warning' ? AlertTriangle : Info;
                  const c = a.severity === 'critical' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800' : a.severity === 'warning' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-800';
                  return (
                    <div key={i} className={cn('flex items-start gap-3 rounded-xl border p-3', c)}>
                      <Ic className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.message}</p>
                        {a.data?.emails && <p className="text-xs mt-1 opacity-80">{(a.data.emails as string[]).join(', ')}</p>}
                      </div>
                      {a.type === 'trial_expiring' && a.data?.emails && (
                        <button
                          onClick={() => {
                            const emails = a.data!.emails as string[];
                            setBulkAudience('trial');
                            const tpl = EMAIL_TEMPLATES.find(t => t.key === 'trial_ending')!;
                            setEmailSubject(tpl.subject);
                            setEmailBody(tpl.body);
                            setEmailTemplate('trial_ending');
                            // Pre-fill with specific emails by using send_email to 'bulk' with trial audience
                            // But since bulk sends to all trial users, we use individual approach for targeted segment
                            if (emails.length === 1) {
                              setEmailTo(emails[0]);
                              setModal('send_email');
                            } else {
                              setModal('bulk_email');
                            }
                          }}
                          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 whitespace-nowrap"
                        >
                          أرسل بريد لهم
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Revenue Dashboard ── */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-stone-950 p-5">
              <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2" dir="rtl">
                <CreditCard className="h-4 w-4 text-emerald-500" /> لوحة الإيرادات
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label="الإيرادات الشهرية" value={`${o.mrr.toLocaleString()} ر.س`} icon={CreditCard} sub={`${o.essentialsActive} أساسي + ${o.eliteActive} نخبة`} alert={o.mrr === 0 && o.trialSubscriptions > 0} />
                <Stat label="الإيرادات السنوية" value={`${(o as unknown as Record<string, number>).arr?.toLocaleString() ?? Math.round(o.mrr * 12).toLocaleString()} ر.س`} icon={TrendingUp} />
                <Stat label="المشتركون الفعّالون" value={o.activeSubscriptions} icon={Zap} sub={`${o.manualSubscriptions} يدوي`} />
                <Stat label="فترة تجريبية" value={o.trialSubscriptions} icon={Clock} sub={`${(o as unknown as Record<string, number>).trialEssentials ?? 0} أساسي · ${(o as unknown as Record<string, number>).trialElite ?? 0} نخبة`} />
                <Stat label="معدل التراجع" value={`${(o as unknown as Record<string, number>).churnRate ?? 0}%`} icon={AlertTriangle} alert={((o as unknown as Record<string, number>).churnRate ?? 0) > 10} sub="آخر 30 يوم" />
                <Stat label="متوسط الإيراد/مشترك" value={`${(o as unknown as Record<string, number>).arpu ?? (o.activeSubscriptions > 0 ? Math.round(o.mrr / o.activeSubscriptions) : 0)} ر.س`} icon={Users} />
              </div>
            </div>

            {/* ── Revenue & Signups Chart (Recharts) ── */}
            {(() => {
              const chartData = signupsPeriod === 'weekly' ? (stats.signupsByWeek ?? []) : signupsPeriod === 'monthly' ? (stats.signupsByMonth ?? []) : (stats.signupsByDay ?? []);
              const periodLabel = signupsPeriod === 'weekly' ? 'آخر 12 أسبوع' : signupsPeriod === 'monthly' ? 'آخر 12 شهر' : 'آخر 30 يوم';
              const totalInPeriod = chartData.reduce((s, d) => s + d.signups, 0);
              return (
                <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5" dir="rtl">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> التسجيلات — {periodLabel}
                      <span className="text-[10px] font-normal text-stone-400 ms-1">({totalInPeriod} إجمالي)</span>
                    </h3>
                    <div className="flex gap-1">
                      {(['daily', 'weekly', 'monthly'] as const).map(p => (
                        <button key={p} onClick={() => setSignupsPeriod(p)} className={cn('rounded-lg px-2 py-1 text-[10px] font-medium', signupsPeriod === p ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800')}>
                          {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={signupsPeriod === 'daily' ? 4 : signupsPeriod === 'weekly' ? 1 : 1} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                        <RTooltip
                          contentStyle={{ background: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                          formatter={(value: number) => [`${value} تسجيل`, 'التسجيلات']}
                        />
                        <Area type="monotone" dataKey="signups" stroke="#10b981" strokeWidth={2} fill="url(#signupGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* ── Revenue Over Time ── */}
            {stats.revenueByMonth && stats.revenueByMonth.length > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-1.5" dir="rtl">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-500" /> الإيرادات الشهرية — آخر 12 شهر
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.revenueByMonth} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={1} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                      <RTooltip
                        contentStyle={{ background: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                        formatter={(value: number) => [`${value.toLocaleString()} ر.س`, 'الإيرادات']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#revenueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="إجمالي المستخدمين" value={o.totalUsers} icon={Users} sub={`${o.unconfirmedUsers} غير مؤكد`} trend={o.signupsToday > 0 ? { dir: 'up', label: `+${o.signupsToday} اليوم` } : undefined} />
              <Stat label="متأخر الدفع" value={o.pastDueSubscriptions} icon={AlertTriangle} alert={o.pastDueSubscriptions > 0} sub={`${o.expiredSubscriptions} منتهي`} />
              <Stat label="المراجعات المعلقة" value={o.pendingReviews} icon={Star} alert={o.pendingReviews > 0} sub={`${o.approvedReviews} معتمد`} />
              <Stat label="التسجيلات (30 يوم)" value={o.signupsMonth} icon={Users} sub={`${o.signupsWeek} هذا الأسبوع`} />
            </div>

            {/* ── User Funnel (color-coded) ── */}
            {(() => {
              const funnelData = [
                { name: 'التسجيلات', nameEn: 'Signups', value: stats.funnel.totalSignups, color: '#6b7280' },
                { name: 'فترة تجريبية', nameEn: 'Trial', value: stats.funnel.trialStarts, color: '#3b82f6' },
                { name: 'مدفوع', nameEn: 'Paid', value: stats.funnel.paidConversions, color: '#10b981' },
                { name: 'متراجع', nameEn: 'Churned', value: o.expiredSubscriptions, color: '#ef4444' },
              ];
              return (
                <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                  <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-1.5" dir="rtl">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> قمع التحويل
                  </h3>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                        <RTooltip
                          contentStyle={{ background: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                          formatter={(value: number, _name: string, props: { payload: { name: string } }) => [`${value}`, props.payload.name]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                    <div className="text-center flex-1">
                      <p className={cn('text-lg font-bold', stats.funnel.signupToTrial >= 20 ? 'text-emerald-700' : stats.funnel.signupToTrial >= 10 ? 'text-amber-600' : 'text-red-600')}>{stats.funnel.signupToTrial}%</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-300">تسجيل ← تجريبي</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className={cn('text-lg font-bold', stats.funnel.trialToPaid >= 30 ? 'text-emerald-700' : stats.funnel.trialToPaid >= 15 ? 'text-amber-600' : 'text-red-600')}>{stats.funnel.trialToPaid}%</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-300">تجريبي ← مدفوع</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Content Stats ── */}
            <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-1.5" dir="rtl">
                <Activity className="h-3.5 w-3.5 text-violet-500" /> إحصائيات المحتوى
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="محادثات المدرب الذكي" value={o.totalCoachRequests} icon={MessageSquare} />
                <Stat label="سجلات الحقن" value={o.totalInjectionLogs} icon={Activity} />
                <Stat label="منشورات المجتمع" value={o.totalCommunityPosts} icon={Users} />
                <Stat label="قائمة البريد" value={o.emailListCount} icon={Mail} />
              </div>
            </div>

            {/* Trials + Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Active Trials */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-3 flex items-center gap-1.5" dir="rtl"><Clock className="h-3.5 w-3.5 text-blue-500" /> الفترات التجريبية النشطة</h3>
                {stats.recentUsers.filter(u => u.subscription?.status === 'trial').length === 0 ? <p className="text-sm text-stone-500 dark:text-stone-300">لا توجد فترات تجريبية نشطة</p> :
                  stats.recentUsers.filter(u => u.subscription?.status === 'trial').map(u => {
                    const tl = trialLeft(u.subscription?.trial_ends_at ?? null);
                    return (
                      <div key={u.id} className="flex items-center justify-between text-sm mb-2">
                        <span className="font-mono text-xs text-stone-700 dark:text-stone-200 truncate max-w-[200px]">{u.email}</span>
                        <div className="flex items-center gap-1">
                          {tl && <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tl.urgent ? 'bg-red-100 text-red-700 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:text-blue-400')}>{tl.text}</span>}
                          <button onClick={() => openUserAction('extend_trial', u)} className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800" title="تمديد" aria-label="تمديد التجربة"><CalendarPlus className="h-3.5 w-3.5 text-emerald-700" /></button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                <h3 className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-3 flex items-center gap-1.5" dir="rtl"><Zap className="h-3.5 w-3.5 text-amber-500" /> إجراءات سريعة</h3>
                <div className="space-y-2">
                  <button onClick={() => { setEmailSubject(''); setEmailBody(''); setBulkAudience('all'); setEmailTemplate('custom'); setModal('bulk_email'); }} className="w-full flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                    <Mail className="h-3.5 w-3.5" /> إرسال بريد جماعي
                  </button>
                  <button onClick={() => { setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailTemplate('custom'); setModal('send_email'); setModalTarget(null); }} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                    <Send className="h-3.5 w-3.5 text-blue-500" /> إرسال بريد إلكتروني
                  </button>
                  <button onClick={runHealthCheck} disabled={healthLoading} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50">
                    {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />} فحص صحة النظام
                  </button>
                  <button onClick={() => exportCSV('users')} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                    <Download className="h-3.5 w-3.5 text-emerald-500" /> تصدير المستخدمين CSV
                  </button>
                  <button onClick={() => exportCSV('subscriptions')} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                    <Download className="h-3.5 w-3.5 text-emerald-500" /> تصدير الاشتراكات
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== USERS ===================== */}
        {tab === 'users' && (() => {
          const filtered = stats.recentUsers.filter(u => {
            if (!dateFrom && !dateTo) return true;
            const joined = new Date(u.created_at).getTime();
            if (dateFrom) {
              const from = new Date(dateFrom).setHours(0, 0, 0, 0);
              if (joined < from) return false;
            }
            if (dateTo) {
              const to = new Date(dateTo).setHours(23, 59, 59, 999);
              if (joined > to) return false;
            }
            return true;
          });
          const paged = filtered.slice((usersPage - 1) * PER_PAGE, usersPage * PER_PAGE);
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <span>من</span>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setUsersPage(1); }}
                    className="rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-emerald-300 dark:border-emerald-700" aria-label="تاريخ الانضمام من" />
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <span>إلى</span>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setUsersPage(1); }}
                    className="rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-emerald-300 dark:border-emerald-700" aria-label="تاريخ الانضمام إلى" />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="بحث بالبريد الإلكتروني..." value={userSearch} onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }} aria-label="بحث بالبريد الإلكتروني"
                  className="flex-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" dir="ltr" />
                <div className="flex gap-1 overflow-x-auto">
                  {(['all', 'active', 'trial', 'expired', 'none'] as UserFilter[]).map(f => (
                    <button key={f} onClick={() => { setUserFilter(f); setUsersPage(1); fetchStats(userSearch || undefined, 1, f); }} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap', userFilter === f ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:bg-stone-700')}>
                      {f === 'all' ? 'الكل' : f === 'active' ? 'مدفوع' : f === 'trial' ? 'تجريبي' : f === 'expired' ? 'منتهي' : 'مجاني'}
                    </button>
                  ))}
                </div>
                <button onClick={() => exportCSV('users')} className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800">
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button onClick={() => { setEmailSubject(''); setEmailBody(''); setBulkAudience('all'); setEmailTemplate('custom'); setModal('bulk_email'); }} className="flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:bg-emerald-900/30">
                  <Mail className="h-3.5 w-3.5" /> بريد جماعي
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-300">{filtered.length} مستخدم{stats.pagination ? ` (${stats.pagination.totalFilteredUsers} إجمالي${stats.pagination.searchQuery ? `، بحث "${stats.pagination.searchQuery}"` : ''})` : ''}</p>
              <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                      <th className={TH_CLASS}>البريد</th>
                      <th className={TH_CLASS}>المزوّد</th>
                      <th className={TH_CLASS}>الحالة</th>
                      <th className={TH_CLASS}>الباقة</th>
                      <th className={TH_CLASS}>التجربة</th>
                      <th className={TH_CLASS}>الانضمام</th>
                      <th className={TH_CLASS}>آخر نشاط</th>
                      <th className={TH_CLASS}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(u => {
                      const tl = u.subscription?.status === 'trial' ? trialLeft(u.subscription?.trial_ends_at ?? null) : null;
                      return (
                        <tr key={u.id} className="border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800">
                          <td className="px-3 py-2 font-mono text-xs"><button onClick={() => fetchUserDetail(u.id)} className="text-emerald-700 dark:text-emerald-400 hover:underline">{u.email}</button>{!u.confirmed && <span className="ms-1 text-[10px] text-amber-600">(غير مؤكد)</span>}</td>
                          <td className="px-3 py-2 text-xs"><span className={cn('rounded-full px-2 py-0.5 text-xs', u.provider === 'google' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300')}>{u.provider}</span></td>
                          <td className="px-3 py-2"><Badge status={u.subscription?.status ?? 'none'} /></td>
                          <td className="px-3 py-2 text-xs">{u.subscription?.tier ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{tl ? <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tl.urgent ? 'bg-red-100 text-red-700 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:text-blue-400')}>{tl.text}</span> : '—'}</td>
                          <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300">{new Date(u.created_at).toLocaleDateString('ar-u-nu-latn')}</td>
                          <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => openUserAction('extend_trial', u)} title="تمديد التجربة" aria-label="تمديد التجربة" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><CalendarPlus className="h-3.5 w-3.5 text-emerald-700" /></button>
                              <button onClick={() => openUserAction('grant_sub', u)} title="منح اشتراك" aria-label="منح اشتراك" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20"><CreditCard className="h-3.5 w-3.5 text-blue-600" /></button>
                              <button onClick={() => { setEmailTo(u.email); setEmailSubject(''); setEmailBody(''); setModal('send_email'); setModalTarget(u); }} title="إرسال بريد" aria-label="إرسال بريد" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-violet-50 dark:hover:bg-violet-900/20"><Mail className="h-3.5 w-3.5 text-violet-600" /></button>
                              {(u.subscription?.status === 'active' || u.subscription?.status === 'trial') && (
                                <button onClick={() => openUserAction('cancel_sub', u)} title="إلغاء الاشتراك" aria-label="إلغاء الاشتراك" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-amber-50 dark:hover:bg-amber-900/20"><XCircle className="h-3.5 w-3.5 text-amber-600" /></button>
                              )}
                              <button onClick={() => openUserAction('confirm_suspend', u)} title="إيقاف" aria-label="إيقاف المستخدم" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20"><Ban className="h-3.5 w-3.5 text-red-400" /></button>
                              <button onClick={async () => { try { await adminAction({ action: 'unsuspend_user', user_id: u.id }); toast.success(`تم إلغاء إيقاف ${u.email}`); fetchStats(); } catch { toast.error('فشل إلغاء الإيقاف'); } }} title="إلغاء الإيقاف" aria-label="إلغاء إيقاف المستخدم" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-900/20"><ShieldCheck className="h-3.5 w-3.5 text-green-600" /></button>
                              <button onClick={() => { setRefundId(''); openUserAction('refund', u); fetchUserPayments(u.id); }} title="استرداد" aria-label="استرداد دفعة" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-amber-50 dark:hover:bg-amber-900/20"><RotateCcw className="h-3.5 w-3.5 text-amber-600" /></button>
                              <button onClick={() => openUserAction('confirm_delete', u)} title="حذف" aria-label="حذف المستخدم" className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={usersPage} total={filtered.length} onChange={setUsersPage} />
            </div>
          );
        })()}

        {/* ===================== ACTIVITY ===================== */}
        {tab === 'activity' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">سجل النشاط</h2>
            {stats.activityFeed.length === 0 ? <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-8 text-center"><Activity className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500 dark:text-stone-300">لا يوجد نشاط حديث</p></div> : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
                {stats.activityFeed.map((item, i) => {
                  const Ic = ACTIVITY_ICON[item.type] ?? Activity;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn('rounded-full p-1.5', ACTIVITY_COLOR[item.type] ?? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300')}><Ic className="h-3.5 w-3.5" /></div>
                      <div className="flex-1 min-w-0"><p className="text-sm text-stone-800 dark:text-stone-200">{item.description}</p>{item.email && <p className="text-xs text-stone-500 dark:text-stone-300 font-mono truncate">{item.email}</p>}</div>
                      <span className="text-xs text-stone-400 whitespace-nowrap">{timeAgo(item.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== REVIEWS ===================== */}
        {tab === 'reviews' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">المراجعات المعلّقة ({stats.pendingReviews.length})</h2>
            {stats.pendingReviews.length === 0 ? <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-8 text-center"><Star className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500 dark:text-stone-300">لا توجد مراجعات معلقة</p></div> :
              stats.pendingReviews.map(r => (
                <div key={r.id} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-900 dark:text-stone-100">{r.name}</span>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={cn('h-4 w-4', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300')} />)}</div>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-200">{r.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-stone-500 dark:text-stone-300">{timeAgo(r.created_at)}</p>
                    <div className="flex gap-2">
                      <button onClick={async () => { setApprovingReviewId(r.id); try { await adminAction({ action: 'approve_review', review_id: r.id }); toast.success('تمت الموافقة'); fetchStats(); } catch { toast.error('فشل'); } finally { setApprovingReviewId(null); } }}
                        disabled={approvingReviewId === r.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">{(approvingReviewId === r.id) ? <><Loader2 className="h-3 w-3 animate-spin" /> جارٍ الموافقة...</> : 'موافقة'}</button>
                      <button onClick={async () => { if (!confirm('حذف هذه المراجعة؟')) return; try { await adminAction({ action: 'delete_review', review_id: r.id }); toast.success('تم الحذف'); fetchStats(); } catch { toast.error('فشل'); } }}
                        className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20">حذف</button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ===================== ENQUIRIES ===================== */}
        {tab === 'enquiries' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">الاستفسارات ({stats.enquiries.length})</h2>
            {stats.enquiries.length === 0 ? <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-8 text-center"><Mail className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500 dark:text-stone-300">لا توجد استفسارات</p></div> :
              stats.enquiries.map(eq => (
                <div key={eq.id} className={cn('rounded-xl border bg-white dark:bg-stone-900 p-4', eq.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : 'border-stone-200 dark:border-stone-600')}>
                  <div className="flex items-center justify-between mb-2">
                    <div><span className="font-mono text-xs text-stone-500 dark:text-stone-300">{eq.email}</span>{eq.peptide_name && <span className="ms-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">{eq.peptide_name}</span>}</div>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', eq.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400')}>{eq.status}</span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">{eq.subject}</p>
                  <p className="text-sm text-stone-700 dark:text-stone-200 whitespace-pre-wrap">{eq.message}</p>
                  {eq.admin_notes && <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 p-3"><p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">الرد:</p><p className="text-sm text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">{eq.admin_notes}</p></div>}
                  {replyingTo === eq.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب الرد..." rows={3} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-emerald-300 dark:border-emerald-700 resize-y" dir="auto" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"><X className="h-3 w-3" /> إلغاء</button>
                        <button disabled={replySending || !replyText.trim()} onClick={async () => {
                          setReplySending(true);
                          try {
                            // Use admin-actions edge function (service role) to update enquiry + send reply email.
                            // Previously used user-scoped Supabase client which silently failed under RLS (no UPDATE policy for admins on enquiries).
                            const token = await getToken();
                            const updateRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
                              body: JSON.stringify({ action: 'reply_enquiry', enquiry_id: eq.id, reply: replyText.trim(), to: eq.email, subject: `رد: ${eq.subject}` }),
                            });
                            const updateData = await updateRes.json();
                            if (!updateRes.ok) throw new Error(updateData.error ?? 'فشلت العملية');
                            toast.success(updateData.email_sent ? 'تم إرسال الرد' : 'تم حفظ الرد (فشل إرسال البريد)');
                            setReplyingTo(null); setReplyText(''); fetchStats();
                          } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
                          finally { setReplySending(false); }
                        }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <Send className="h-3 w-3" /> {replySending ? 'جارٍ الإرسال...' : 'إرسال'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-stone-500 dark:text-stone-300">{timeAgo(eq.created_at)}</p>
                      <button onClick={() => { setReplyingTo(eq.id); setReplyText(eq.admin_notes ?? ''); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Reply className="h-3 w-3" /> {eq.admin_notes ? 'تعديل' : 'رد'}</button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ===================== EMAIL LIST ===================== */}
        {tab === 'emails' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">قائمة البريد ({stats.emailList.length})</h2>
              <button onClick={() => exportCSV('email_list')} className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"><Download className="h-3.5 w-3.5" /> تصدير</button>
            </div>
            {stats.emailList.length === 0 ? <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-8 text-center"><Mail className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500 dark:text-stone-300">لا يوجد مشتركين</p></div> :
              <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900"><table className="w-full text-sm"><thead><tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900"><th className={TH_CLASS}>البريد</th><th className={TH_CLASS}>التاريخ</th></tr></thead><tbody>{stats.emailList.map(e => <tr key={e.id} className="border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"><td className="px-3 py-2 font-mono text-xs">{e.email}</td><td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300">{timeAgo(e.created_at)}</td></tr>)}</tbody></table></div>}
          </div>
        )}

        {/* ===================== EMAIL LOGS ===================== */}
        {tab === 'email-logs' && (() => {
          const logs = stats.emailLogs;
          const paged = logs.slice((emailLogsPage - 1) * PER_PAGE, emailLogsPage * PER_PAGE);
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">البريد المرسل ({logs.length})</h2>
                {logs.length > 0 && <span className="text-xs text-emerald-700 font-medium">{logs.filter(l => l.status === 'sent').length} تم التسليم</span>}
              </div>
              {logs.length === 0 ? <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-2" /><p className="text-sm font-medium text-amber-800 dark:text-amber-300">لا توجد سجلات بريد</p><p className="text-xs text-amber-600 mt-1">قد لا يكون Resend مُعدّاً</p></div> : (
                <><div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900"><table className="w-full text-sm"><thead><tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900"><th className={TH_CLASS}>إلى</th><th className={TH_CLASS}>النوع</th><th className={TH_CLASS}>الحالة</th><th className={TH_CLASS}>متى</th></tr></thead>
                <tbody>{paged.map(l => <tr key={l.id} className="border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"><td className="px-3 py-2 font-mono text-xs">{l.email}</td><td className="px-3 py-2 text-xs"><span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs">{l.type}</span></td><td className="px-3 py-2"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', l.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:text-red-400')}>{l.status}</span></td><td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300">{timeAgo(l.created_at)}</td></tr>)}</tbody></table></div>
                <Pagination page={emailLogsPage} total={logs.length} onChange={setEmailLogsPage} /></>)}
            </div>
          );
        })()}

        {/* ===================== PAYMENTS ===================== */}
        {tab === 'payments' && (() => {
          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          const count24h = stats.webhookEvents.filter(e => now - new Date(e.processed_at).getTime() < dayMs).length;
          const count7d = stats.webhookEvents.filter(e => now - new Date(e.processed_at).getTime() < 7 * dayMs).length;
          const lastEvent = stats.webhookEvents.length ? stats.webhookEvents.reduce((a, b) => new Date(b.processed_at).getTime() > new Date(a.processed_at).getTime() ? b : a) : null;
          return (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">أحداث الدفع ({stats.webhookEvents.length})</h2>
            {stats.webhookEvents.length > 0 && (
              <p className="text-xs text-stone-600 dark:text-stone-300" dir="rtl">آخر 24 ساعة: {count24h} أحداث | آخر 7 أيام: {count7d} أحداث | آخر حدث: {lastEvent ? timeAgo(lastEvent.processed_at) : '—'}</p>
            )}
            {stats.webhookEvents.length === 0 ? <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-2" /><p className="text-sm font-medium text-amber-800 dark:text-amber-300">لم يتم تسجيل أحداث</p><p className="text-xs text-amber-600 mt-1">قد لا تكون Stripe webhooks مُعدّة</p></div> :
              <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900"><table className="w-full text-sm"><thead><tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900"><th className={TH_CLASS}>الحدث</th><th className={TH_CLASS}>المعرّف</th><th className={TH_CLASS}>متى</th></tr></thead>
              <tbody>{stats.webhookEvents.map(ev => <tr key={ev.event_id} className="border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"><td className="px-3 py-2 text-xs"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ev.event_type.includes('succeeded') || ev.event_type.includes('paid') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : ev.event_type.includes('failed') ? 'bg-red-100 text-red-700 dark:text-red-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200')}>{ev.event_type}</span></td><td className="px-3 py-2 font-mono text-xs text-stone-500 dark:text-stone-300">{ev.event_id?.slice(0, 24)}</td><td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300">{timeAgo(ev.processed_at)}</td></tr>)}</tbody></table></div>}
          </div>
          );
        })()}

        {/* ===================== HEALTH ===================== */}
        {tab === 'health' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200">صحة النظام</h2>
              <div className="flex gap-2">
                <button onClick={runHealthCheck} disabled={healthLoading} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />} فحص
                </button>
                <button onClick={runStripeVerify} disabled={stripeVerifyLoading} className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50">
                  {stripeVerifyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Stripe
                </button>
              </div>
            </div>
            {!health ? (
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-8 text-center">
                <Heart className="mx-auto h-8 w-8 text-stone-300 mb-2" />
                <p className="text-sm text-stone-500 dark:text-stone-300">اضغط &quot;فحص&quot; لاختبار جميع الخدمات</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={cn('rounded-xl border p-4 text-center', health.status === 'healthy' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : health.status === 'degraded' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20')}>
                  <p className={cn('text-xl font-bold', health.status === 'healthy' ? 'text-emerald-700 dark:text-emerald-400' : health.status === 'degraded' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400')}>
                    {health.status === 'healthy' ? 'جميع الأنظمة تعمل بشكل سليم' : health.status === 'degraded' ? 'أداء منخفض' : 'غير سليم'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">{new Date(health.timestamp).toLocaleString('ar-u-nu-latn')}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(health.checks).map(([name, c]) => (
                    <div key={name} className={cn('rounded-xl border p-4', c.status === 'ok' ? 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900' : c.status === 'warning' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-stone-800 dark:text-stone-200 capitalize">{name.replace(/_/g, ' ')}</span>
                        {c.status === 'ok' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : c.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300">{c.detail}</p>
                      {c.ms > 0 && <p className="text-[10px] text-stone-400 mt-1">{c.ms}ms</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stripeVerify && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200 flex items-center gap-2"><CreditCard className="h-4 w-4" /> التحقق من Stripe</h3>
                <div className={cn('rounded-xl border p-4', stripeVerify.status === 'ok' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20')}>
                  <p className={cn('font-bold', stripeVerify.status === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>{stripeVerify.status === 'ok' ? 'الأسعار + webhooks سليمة' : 'تم العثور على مشاكل'}</p>
                  <pre className="mt-2 text-xs overflow-x-auto bg-white dark:bg-stone-900/60 p-3 rounded-lg">{JSON.stringify(stripeVerify.prices, null, 2)}</pre>
                  {stripeVerify.missingEvents?.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">أحداث مفقودة: {stripeVerify.missingEvents.join(', ')}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== AUDIT LOG ===================== */}
        {tab === 'audit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-stone-500 dark:text-stone-300" /> سجل المراجعة</h2>
              <button onClick={fetchAuditLog} disabled={auditLoading} className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50">
                {auditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} تحديث
              </button>
            </div>
            {auditLoading && auditLog.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
            ) : auditLog.length === 0 ? (
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-8 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-stone-300 mb-2" />
                <p className="text-sm text-stone-500 dark:text-stone-300">لا توجد سجلات مراجعة بعد</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                        <th className={TH_CLASS}>التاريخ</th>
                        <th className={TH_CLASS}>المشرف</th>
                        <th className={TH_CLASS}>الإجراء</th>
                        <th className={TH_CLASS}>المستهدف</th>
                        <th className={TH_CLASS}>التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.slice((auditPage - 1) * PER_PAGE, auditPage * PER_PAGE).map(entry => (
                        <tr key={entry.id} className="border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800">
                          <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300 whitespace-nowrap">{new Date(entry.created_at).toLocaleString('ar-u-nu-latn')}</td>
                          <td className="px-3 py-2 font-mono text-xs">{entry.admin_email}</td>
                          <td className="px-3 py-2 text-xs"><span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-700 dark:text-stone-200">{entry.action}</span></td>
                          <td className="px-3 py-2 font-mono text-xs text-stone-500 dark:text-stone-300">{entry.target_user_id ? entry.target_user_id.slice(0, 8) + '...' : '—'}</td>
                          <td className="px-3 py-2 text-xs text-stone-500 dark:text-stone-300 max-w-[300px] truncate">{entry.details ? JSON.stringify(entry.details) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={auditPage} total={auditLog.length} onChange={setAuditPage} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Extend Trial */}
      <Modal open={modal === 'extend_trial'} title="تمديد الفترة التجريبية" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">تمديد الفترة التجريبية لـ <span className="font-mono font-bold">{modalTarget?.email}</span></p>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">عدد الأيام المضافة</label>
        <input type="number" min={1} max={90} value={extendDays} onChange={e => setExtendDays(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button onClick={handleExtendTrial} disabled={actionLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ التمديد...' : `تمديد ${extendDays} يوم`}
          </button>
        </div>
      </Modal>

      {/* Grant Subscription */}
      <Modal open={modal === 'grant_sub'} title="منح اشتراك" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">منح اشتراك لـ <span className="font-mono font-bold">{modalTarget?.email}</span></p>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">الباقة</label>
        <select value={grantTier} onChange={e => setGrantTier(e.target.value as 'essentials' | 'elite')} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3">
          <option value="essentials">أساسي ({PRICING.essentials.label})</option>
          <option value="elite">نخبة ({PRICING.elite.label})</option>
        </select>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">المدة (أيام)</label>
        <input type="number" min={1} max={365} value={grantDuration} onChange={e => setGrantDuration(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button onClick={handleGrantSub} disabled={actionLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ المنح...' : 'منح'}
          </button>
        </div>
      </Modal>

      {/* Cancel Subscription */}
      <Modal open={modal === 'cancel_sub'} title="إلغاء الاشتراك" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">إلغاء الاشتراك لـ <span className="font-mono font-bold">{modalTarget?.email}</span>؟</p>
        <p className="text-xs text-amber-600 mb-4">سيتم تعيين الإلغاء في نهاية الفترة على Stripe وتحديث الحالة في قاعدة البيانات.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">لا</button>
          <button onClick={handleCancelSub} disabled={actionLoading} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ الإلغاء...' : 'إلغاء الاشتراك'}
          </button>
        </div>
      </Modal>

      {/* Send Email */}
      <Modal open={modal === 'send_email'} title="إرسال بريد" onClose={() => setModal(null)}>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">إلى</label>
        <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="user@example.com" className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3" dir="ltr" />
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">قالب</label>
        <select value={emailTemplate} onChange={e => applyTemplate(e.target.value)} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3">
          {EMAIL_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">الموضوع</label>
        <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="الموضوع" className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3" dir="auto" />
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">المحتوى</label>
        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="محتوى البريد..." rows={4} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-4 resize-y" dir="auto" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button onClick={handleSendEmail} disabled={actionLoading || !emailTo || !emailSubject || !emailBody} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ الإرسال...' : 'إرسال'}
          </button>
        </div>
      </Modal>

      {/* Bulk Email */}
      <Modal open={modal === 'bulk_email'} title="بريد جماعي" onClose={() => setModal(null)}>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">الجمهور</label>
        <select value={bulkAudience} onChange={e => setBulkAudience(e.target.value as 'all' | 'trial' | 'active' | 'expired')} aria-label="الجمهور" className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3">
          <option value="all">جميع المستخدمين</option>
          <option value="trial">مستخدمو الفترة التجريبية</option>
          <option value="active">المشتركون الفعّالون</option>
          <option value="expired">المنتهي اشتراكهم</option>
        </select>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">قالب</label>
        <select value={emailTemplate} onChange={e => applyTemplate(e.target.value)} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3">
          {EMAIL_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">الموضوع</label>
        <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="الموضوع" className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-3" dir="auto" />
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">المحتوى</label>
        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="محتوى البريد..." rows={4} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-2 text-sm mb-4 resize-y" dir="auto" />
        {(() => {
          const audienceCount = bulkAudience === 'all' ? o.totalUsers : bulkAudience === 'trial' ? o.trialSubscriptions : bulkAudience === 'active' ? o.activeSubscriptions : o.expiredSubscriptions;
          const MAX_BATCH = 50;
          return (
            <div className="space-y-2 mb-4">
              <div className="rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-3">
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  <strong>{audienceCount}</strong> مستخدم مؤهل — سيتم إرسال <strong>{Math.min(audienceCount, MAX_BATCH)}</strong> بريد (الحد الأقصى {MAX_BATCH} لكل عملية)
                </p>
              </div>
              {audienceCount > MAX_BATCH && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">⚠️ يوجد {audienceCount} مستخدم لكن سيتم إرسال {MAX_BATCH} فقط لكل عملية لضمان الجودة. كرر العملية عند الحاجة.</p>
                </div>
              )}
            </div>
          );
        })()}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button onClick={() => {
            if (!confirm(`سيتم إرسال بريد جماعي لجمهور "${bulkAudience === 'all' ? 'الكل' : bulkAudience === 'trial' ? 'تجريبي' : bulkAudience === 'active' ? 'مدفوع' : 'منتهي'}". هل أنت متأكد؟`)) return;
            handleBulkEmail();
          }} disabled={actionLoading || !emailSubject || !emailBody} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ الإرسال...' : 'إرسال للكل'}
          </button>
        </div>
      </Modal>

      {/* Suspend User */}
      <Modal open={modal === 'confirm_suspend'} title="إيقاف المستخدم" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">إيقاف <span className="font-mono font-bold text-red-600 dark:text-red-400">{modalTarget?.email}</span>؟</p>
        <p className="text-xs text-red-600 dark:text-red-400 mb-4">سيتم منع المستخدم من تسجيل الدخول وإنهاء اشتراكه.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button onClick={handleSuspend} disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ الإيقاف...' : 'إيقاف'}
          </button>
        </div>
      </Modal>

      {/* Refund Payment */}
      <Modal open={modal === 'refund'} title="استرداد دفعة" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">استرداد للمستخدم <span className="font-mono font-bold">{modalTarget?.email}</span></p>

        {/* Auto-lookup payments */}
        {paymentsLoading ? (
          <div className="flex items-center gap-2 mb-3 text-xs text-stone-500 dark:text-stone-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ تحميل المدفوعات...
          </div>
        ) : userPayments.length > 0 ? (
          <>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">اختر الدفعة</label>
            <select
              value={refundId}
              onChange={e => setRefundId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm mb-3 font-mono"
              dir="ltr"
            >
              <option value="">— اختر دفعة —</option>
              {userPayments.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id.slice(0, 20)}... — {(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()} — {new Date(p.created).toLocaleDateString('ar-u-nu-latn')} ({p.status})
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-3 mb-3">
            <p className="text-xs text-stone-500 dark:text-stone-300">لم يتم العثور على مدفوعات سابقة في Stripe</p>
          </div>
        )}

        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">أو أدخل رقم الدفعة يدوياً (pi_... أو ch_...)</label>
        <input
          type="text"
          value={refundId}
          onChange={e => setRefundId(e.target.value)}
          placeholder="pi_... أو ch_..."
          className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm mb-4 font-mono"
          dir="ltr"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button
            onClick={async () => {
              const id = refundId.trim();
              if (!id) return;
              setActionLoading(true);
              try {
                const payload = id.startsWith('ch_') ? { action: 'refund_payment' as const, charge_id: id } : { action: 'refund_payment' as const, payment_intent_id: id };
                await adminAction(payload);
                toast.success('تم إطلاق طلب الاسترداد');
                setModal(null);
              } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل الاسترداد'); }
              finally { setActionLoading(false); }
            }}
            disabled={actionLoading || !refundId.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {actionLoading ? 'جارٍ الاسترداد...' : 'استرداد'}
          </button>
        </div>
      </Modal>

      {/* Delete User */}
      <Modal open={modal === 'confirm_delete'} title="حذف المستخدم" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">حذف نهائي لـ <span className="font-mono font-bold text-red-600 dark:text-red-400">{modalTarget?.email}</span>؟</p>
        <p className="text-xs text-red-600 dark:text-red-400 mb-4">سيتم إلغاء اشتراك Stripe وحذف جميع البيانات من كل الجداول وإزالة حساب المصادقة. لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300">إلغاء</button>
          <button onClick={handleDelete} disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'جارٍ الحذف...' : 'حذف نهائياً'}
          </button>
        </div>
      </Modal>

      {/* User Detail */}
      {userDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setUserDetailOpen(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">تفاصيل المستخدم</h3>
              <button onClick={() => setUserDetailOpen(false)} title="إغلاق" aria-label="إغلاق" className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"><X className="h-5 w-5 text-stone-500 dark:text-stone-300" /></button>
            </div>
            {userDetailLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
            ) : userDetail ? (() => {
              const ud = userDetail;
              return (
                <div className="space-y-5">
                  {/* User Info */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">معلومات المستخدم</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-stone-500 dark:text-stone-300">البريد</span><span className="font-mono">{ud.user.email}</span>
                      <span className="text-stone-500 dark:text-stone-300">المزوّد</span><span>{ud.user.provider}</span>
                      <span className="text-stone-500 dark:text-stone-300">مؤكد</span><span>{ud.user.confirmed ? 'نعم' : 'لا'}</span>
                      <span className="text-stone-500 dark:text-stone-300">الانضمام</span><span>{new Date(ud.user.created_at).toLocaleDateString('ar-SA')}</span>
                      <span className="text-stone-500 dark:text-stone-300">آخر دخول</span><span>{ud.user.last_sign_in_at ? timeAgo(ud.user.last_sign_in_at) : '—'}</span>
                      {ud.user.banned_until && <><span className="text-stone-500 dark:text-stone-300">محظور حتى</span><span className="text-red-600 dark:text-red-400">{ud.user.banned_until}</span></>}
                      <span className="text-stone-500 dark:text-stone-300">طلبات المدرب</span><span>{ud.ai_coach_request_count}</span>
                    </div>
                  </section>

                  {/* Subscription */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">الاشتراك</h4>
                    {ud.subscription ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-stone-500 dark:text-stone-300">الحالة</span><span><Badge status={ud.subscription.status} /></span>
                        <span className="text-stone-500 dark:text-stone-300">الباقة</span><span>{ud.subscription.tier || '—'}</span>
                        <span className="text-stone-500 dark:text-stone-300">نهاية الفترة</span><span>{ud.subscription.current_period_end ? new Date(ud.subscription.current_period_end).toLocaleDateString('ar-SA') : '—'}</span>
                        <span className="text-stone-500 dark:text-stone-300">انتهاء التجربة</span><span>{ud.subscription.trial_ends_at ? new Date(ud.subscription.trial_ends_at).toLocaleDateString('ar-SA') : '—'}</span>
                        <span className="text-stone-500 dark:text-stone-300">اشتراك Stripe</span><span className="font-mono text-xs truncate">{ud.subscription.stripe_subscription_id || '—'}</span>
                        <span className="text-stone-500 dark:text-stone-300">عميل Stripe</span><span className="font-mono text-xs truncate">{ud.subscription.stripe_customer_id || '—'}</span>
                      </div>
                    ) : <p className="text-sm text-stone-500 dark:text-stone-300">لا يوجد اشتراك</p>}
                  </section>

                  {/* Recent Injections */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">آخر الحقن ({ud.injection_logs.length})</h4>
                    {ud.injection_logs.length === 0 ? <p className="text-sm text-stone-400">لا يوجد</p> : (
                      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-600">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">الببتيد</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">الجرعة</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">الموقع</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">التاريخ</th>
                          </tr></thead>
                          <tbody>{ud.injection_logs.map((l, i) => (
                            <tr key={i} className="border-b border-stone-100 dark:border-stone-700">
                              <td className="px-2 py-1.5">{String(l.peptide_name ?? l.protocol_name ?? '—')}</td>
                              <td className="px-2 py-1.5">{String(l.dose ?? l.dosage ?? '—')}{l.unit ? ` ${l.unit}` : ''}</td>
                              <td className="px-2 py-1.5">{String(l.injection_site ?? l.site ?? '—')}</td>
                              <td className="px-2 py-1.5 text-stone-500 dark:text-stone-300">{l.created_at ? timeAgo(String(l.created_at)) : '—'}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* Wellness Logs */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">سجلات العافية ({ud.wellness_logs.length})</h4>
                    {ud.wellness_logs.length === 0 ? <p className="text-sm text-stone-400">لا يوجد</p> : (
                      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-600">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">الطاقة</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">النوم</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">المزاج</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">ملاحظات</th>
                            <th className="px-2 py-1.5 text-start font-medium text-stone-600 dark:text-stone-300">التاريخ</th>
                          </tr></thead>
                          <tbody>{ud.wellness_logs.map((l, i) => (
                            <tr key={i} className="border-b border-stone-100 dark:border-stone-700">
                              <td className="px-2 py-1.5">{String(l.energy ?? l.energy_level ?? '—')}</td>
                              <td className="px-2 py-1.5">{String(l.sleep ?? l.sleep_quality ?? '—')}</td>
                              <td className="px-2 py-1.5">{String(l.mood ?? '—')}</td>
                              <td className="px-2 py-1.5 max-w-[120px] truncate">{String(l.notes ?? '—')}</td>
                              <td className="px-2 py-1.5 text-stone-500 dark:text-stone-300">{l.created_at ? timeAgo(String(l.created_at)) : '—'}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* Side Effects */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">الآثار الجانبية ({ud.side_effect_logs.length})</h4>
                    {ud.side_effect_logs.length === 0 ? <p className="text-sm text-stone-400">لا يوجد</p> : (
                      <ul className="space-y-1">
                        {ud.side_effect_logs.map((s, i) => (
                          <li key={i} className="rounded-lg border border-stone-100 dark:border-stone-700 px-3 py-2 text-xs">
                            <span className="font-medium">{String(s.side_effect ?? s.effect ?? s.type ?? '—')}</span>
                            {s.severity && <span className={cn('ms-2 rounded-full px-2 py-0.5 text-[10px] font-medium', String(s.severity) === 'severe' ? 'bg-red-100 text-red-700 dark:text-red-400' : String(s.severity) === 'moderate' ? 'bg-amber-100 text-amber-700 dark:text-amber-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300')}>{String(s.severity)}</span>}
                            {s.notes && <span className="ms-2 text-stone-500 dark:text-stone-300">{String(s.notes)}</span>}
                            <span className="ms-2 text-stone-400">{s.created_at ? timeAgo(String(s.created_at)) : ''}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Active Protocols */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">البروتوكولات ({ud.user_protocols.length})</h4>
                    {ud.user_protocols.length === 0 ? <p className="text-sm text-stone-400">لا يوجد</p> : (
                      <ul className="space-y-1">
                        {ud.user_protocols.map((p, i) => (
                          <li key={i} className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-stone-700 px-3 py-2 text-xs">
                            <span className="font-medium">{String(p.protocol_name ?? p.name ?? p.peptide_name ?? '—')}</span>
                            {p.status && <Badge status={String(p.status)} />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Enquiries */}
                  {ud.enquiries.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">الاستفسارات ({ud.enquiries.length})</h4>
                      <ul className="space-y-1">
                        {ud.enquiries.map((eq, i) => (
                          <li key={i} className="rounded-lg border border-stone-100 dark:border-stone-700 px-3 py-2 text-xs">
                            <span className="font-medium">{String(eq.subject ?? '—')}</span>
                            <span className={cn('ms-2 rounded-full px-2 py-0.5 text-[10px] font-medium', eq.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400')}>{String(eq.status)}</span>
                            <span className="ms-2 text-stone-400">{eq.created_at ? timeAgo(String(eq.created_at)) : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Email Logs */}
                  {ud.email_logs.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">سجلات البريد ({ud.email_logs.length})</h4>
                      <ul className="space-y-1">
                        {ud.email_logs.map((el, i) => (
                          <li key={i} className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-stone-700 px-3 py-2 text-xs">
                            <span>{String(el.type ?? '—')}</span>
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', el.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:text-red-400')}>{String(el.status)}</span>
                            <span className="text-stone-400">{el.created_at ? timeAgo(String(el.created_at)) : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Notes */}
                  <section>
                    <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-2">ملاحظات</h4>
                    {userNotesLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-stone-400" /></div>
                    ) : userNotes.length > 0 ? (
                      <ul className="space-y-2 mb-3">
                        {userNotes.map(n => (
                          <li key={n.id} className="rounded-lg border border-stone-100 dark:border-stone-700 px-3 py-2">
                            <p className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap">{n.note}</p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                              <span className="font-mono">{n.admin_email}</span>
                              <span>{timeAgo(n.created_at)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-400 mb-3">لا توجد ملاحظات بعد</p>
                    )}
                    <textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="أضف ملاحظة..."
                      rows={2}
                      className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-emerald-300 dark:border-emerald-700 resize-y"
                      dir="auto"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        disabled={noteSaving || !newNote.trim()}
                        onClick={async () => {
                          setNoteSaving(true);
                          try {
                            await adminAction({ action: 'add_user_note', user_id: ud.user.id, note: newNote.trim() });
                            toast.success('تم حفظ الملاحظة');
                            setNewNote('');
                            fetchUserNotes(ud.user.id);
                          } catch (e) { toast.error(e instanceof Error ? e.message : 'فشلت العملية'); }
                          finally { setNoteSaving(false); }
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {noteSaving ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
                      </button>
                    </div>
                  </section>
                </div>
              );
            })() : null}
          </div>
        </div>
      )}
    </div>
  );
}
