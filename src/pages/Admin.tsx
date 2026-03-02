import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Users, CreditCard, MessageSquare, Star, Mail, Activity, TrendingUp,
  AlertTriangle, RefreshCw, Shield, Reply, Send, X, Clock, Zap,
  AlertCircle, Info, ArrowUpRight, ArrowDownRight, Download,
  Trash2, Ban, CalendarPlus, Heart, ShieldCheck,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICING } from '@/lib/constants';

// ========================================================
// TYPES
// ========================================================

interface Alert { type: string; severity: 'critical' | 'warning' | 'info'; message: string; data?: Record<string, unknown> }
interface ActivityItem { type: string; description: string; email?: string; created_at: string }
interface Funnel { totalSignups: number; trialStarts: number; paidConversions: number; signupToTrial: number; trialToPaid: number }
interface HealthCheck { status: string; checks: Record<string, { status: string; detail: string; ms: number }>; timestamp: string }
interface StripeVerify { status: string; prices: Record<string, unknown>; webhooks: unknown[]; eventsOk: boolean; missingEvents: string[]; timestamp: string }

interface AdminStats {
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
  emailLogs: Array<{ id: string; email: string; type: string; status: string; created_at: string }>;
  webhookEvents: Array<{ id: string; event_type: string; event_id: string; processed_at: string }>;
}

type Tab = 'overview' | 'users' | 'activity' | 'reviews' | 'enquiries' | 'emails' | 'email-logs' | 'payments' | 'health';
type UserFilter = 'all' | 'active' | 'trial' | 'expired' | 'none';
type ModalType = 'extend_trial' | 'grant_sub' | 'send_email' | 'confirm_delete' | 'confirm_suspend' | 'cancel_sub' | null;

const PER_PAGE = 20;

// ========================================================
// HELPERS
// ========================================================

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-GB');
}

function trialLeft(t: string | null): { text: string; urgent: boolean } | null {
  if (!t) return null;
  const ms = new Date(t).getTime() - Date.now();
  if (ms < 0) return { text: 'expired', urgent: true };
  const h = Math.floor(ms / 3600000);
  if (h < 48) return { text: `${h}h left`, urgent: true };
  return { text: `${Math.floor(h / 24)}d left`, urgent: false };
}

// ========================================================
// REUSABLE COMPONENTS
// ========================================================

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40">&laquo;</button>
      {Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
        .reduce<(number | 'e')[]>((a, p, i, arr) => { if (i > 0 && p - (arr[i - 1]) > 1) a.push('e'); a.push(p); return a; }, [])
        .map((p, i) => p === 'e' ? <span key={`e${i}`} className="px-1 text-xs text-stone-400">&hellip;</span> :
          <button key={p} onClick={() => onChange(p)} className={cn('rounded-lg px-2.5 py-1.5 text-xs font-medium', page === p ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600 hover:bg-stone-100')}>{p}</button>
        )}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40">&raquo;</button>
    </div>
  );
}

function Stat({ label, value, icon: I, sub, alert: a, trend }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; alert?: boolean;
  trend?: { dir: 'up' | 'down'; label: string };
}) {
  return (
    <div className={cn('rounded-xl border p-4', a ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <I className={cn('h-4 w-4', a ? 'text-red-500' : 'text-emerald-500')} />
      </div>
      <p className={cn('text-2xl font-bold', a ? 'text-red-700' : 'text-stone-900')}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-stone-500">{sub}</p>}
        {trend && <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', trend.dir === 'up' ? 'text-emerald-600' : 'text-red-600')}>
          {trend.dir === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{trend.label}
        </span>}
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const s: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', trial: 'bg-blue-100 text-blue-700', expired: 'bg-stone-100 text-stone-600', cancelled: 'bg-stone-100 text-stone-600', past_due: 'bg-red-100 text-red-700', none: 'bg-stone-100 text-stone-500' };
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', s[status] ?? s.none)}>{status}</span>;
}

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  const titleId = 'modal-title';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="text-lg font-bold text-stone-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-stone-100"><X className="h-5 w-5 text-stone-500" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, React.ElementType> = { signup: Users, coach: MessageSquare, injection: Activity, community: Users, review: Star, enquiry: Mail };
const ACTIVITY_COLOR: Record<string, string> = { signup: 'bg-emerald-100 text-emerald-600', coach: 'bg-violet-100 text-violet-600', injection: 'bg-blue-100 text-blue-600', community: 'bg-amber-100 text-amber-600', review: 'bg-yellow-100 text-yellow-600', enquiry: 'bg-rose-100 text-rose-600' };

// ========================================================
// MAIN
// ========================================================

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Users tab
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [usersPage, setUsersPage] = useState(1);

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

  // Health
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [stripeVerify, setStripeVerify] = useState<StripeVerify | null>(null);
  const [stripeVerifyLoading, setStripeVerifyLoading] = useState(false);
  const [approvingReviewId, setApprovingReviewId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const s = await supabase.auth.getSession();
    return s.data.session?.access_token ?? '';
  }, []);

  // --- Fetch stats ---
  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`, {
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      });
      if (res.status === 403) { setForbidden(true); return; }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      const d = await res.json();
      setStats({ ...d, alerts: d.alerts ?? [], funnel: d.funnel ?? { totalSignups: 0, trialStarts: 0, paidConversions: 0, signupToTrial: 0, trialToPaid: 0 }, activityFeed: d.activityFeed ?? [], enquiries: d.enquiries ?? [], emailLogs: d.emailLogs ?? [], webhookEvents: d.webhookEvents ?? [], recentUsers: d.recentUsers ?? [], pendingReviews: d.pendingReviews ?? [], emailList: d.emailList ?? [] });
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [user, getToken]);

  useEffect(() => { if (user) fetchStats(); }, [user, fetchStats]);

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
      toast.success(`Trial extended to ${new Date(r.trial_ends_at).toLocaleDateString('en-GB')}`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleGrantSub = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'grant_subscription', user_id: modalTarget.id, tier: grantTier, duration_days: grantDuration });
      toast.success(`${grantTier} subscription granted for ${grantDuration} days`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleCancelSub = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'cancel_subscription', user_id: modalTarget.id });
      toast.success('Subscription cancelled');
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleSuspend = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'suspend_user', user_id: modalTarget.id });
      toast.success(`${modalTarget.email} suspended`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!modalTarget) return;
    setActionLoading(true);
    try {
      await adminAction({ action: 'delete_user', user_id: modalTarget.id });
      toast.success(`${modalTarget.email} deleted`);
      setModal(null);
      fetchStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleSendEmail = async () => {
    setActionLoading(true);
    try {
      await adminAction({ action: 'send_email', to: emailTo, subject: emailSubject, text: emailBody });
      toast.success(`Email sent to ${emailTo}`);
      setModal(null);
      setEmailTo(''); setEmailSubject(''); setEmailBody('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(false); }
  };

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const r = await adminAction({ action: 'health_check' });
      setHealth(r);
      toast.success(`Health: ${r.status}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Health check failed'); }
    finally { setHealthLoading(false); }
  };

  const runStripeVerify = async () => {
    setStripeVerifyLoading(true);
    try {
      const r = await adminAction({ action: 'verify_stripe' });
      setStripeVerify(r);
      toast.success(`Stripe: ${r.status}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Stripe verify failed'); }
    finally { setStripeVerifyLoading(false); }
  };

  const exportCSV = async (table: string) => {
    try {
      const r = await adminAction({ action: 'export_csv', table });
      if (!r.data?.length) { toast.error('No data'); return; }
      const headers = Object.keys(r.data[0]);
      const csv = [headers.join(','), ...r.data.map((row: Record<string, unknown>) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${table}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`${r.count} rows exported`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Export failed'); }
  };

  // --- Open modal helpers ---
  const openUserAction = (type: ModalType, u: { id: string; email: string }) => { setModalTarget(u); setModal(type); };

  // --- Render gates ---
  if (forbidden) return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50" lang="en">
      <Helmet><title>Admin | pptides</title></Helmet>
      <div className="text-center px-4">
        <Shield className="mx-auto h-12 w-12 text-stone-300 mb-4" />
        <h1 className="text-xl font-bold text-stone-900 mb-2">Access Denied</h1>
        <p className="text-sm text-stone-600 mb-6">You don&apos;t have permission to access the admin area.</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Helmet><title>Admin | pptides</title></Helmet><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div>;
  if (error || !stats) return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <Helmet><title>Admin | pptides</title></Helmet>
      <div className="text-center px-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={fetchStats} className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700">Retry</button>
          <Link to="/dashboard" className="rounded-full border-2 border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 hover:bg-stone-50">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );

  const o = stats.overview;
  const critAlerts = stats.alerts.filter(a => a.severity === 'critical').length;

  const tabs: { key: Tab; label: string; count?: number; dot?: boolean }[] = [
    { key: 'overview', label: 'Overview', dot: critAlerts > 0 },
    { key: 'users', label: 'Users', count: o.totalUsers },
    { key: 'activity', label: 'Activity', count: stats.activityFeed.length },
    { key: 'reviews', label: 'Reviews', count: o.pendingReviews },
    { key: 'enquiries', label: 'Enquiries', count: o.pendingEnquiries },
    { key: 'emails', label: 'Email List', count: o.emailListCount },
    { key: 'email-logs', label: 'Emails Sent', count: stats.emailLogs.length },
    { key: 'payments', label: 'Payments', count: stats.webhookEvents.length },
    { key: 'health', label: 'Health' },
  ];

  return (
    <div className="min-h-screen bg-stone-50" lang="en">
      <Helmet><title>Admin Dashboard | pptides</title></Helmet>

      {/* ===================== HEADER ===================== */}
      <div className="sticky top-[64px] md:top-[72px] z-30 bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-xs font-medium text-stone-500 hover:text-emerald-600 transition-colors shrink-0">← Dashboard</Link>
            <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Control Center
              {critAlerts > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{critAlerts}</span>}
            </h1>
            {lastFetched && <p className="text-[10px] text-stone-500">Updated {lastFetched.toLocaleTimeString('en-GB')}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEmailTo(''); setEmailSubject(''); setEmailBody(''); setModal('send_email'); setModalTarget(null); }}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
              <Send className="h-3.5 w-3.5" /> Email
            </button>
            <button onClick={fetchStats} disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex gap-1 mt-3 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600 hover:bg-stone-100'
            )}>
              {t.dot && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {t.label}
              {t.count != null && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', tab === t.key ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600')}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ===================== CONTENT ===================== */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ===================== OVERVIEW ===================== */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Alerts */}
            {stats.alerts.length > 0 && (
              <div className="space-y-2">
                {stats.alerts.map((a, i) => {
                  const Ic = a.severity === 'critical' ? AlertCircle : a.severity === 'warning' ? AlertTriangle : Info;
                  const c = a.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-800' : a.severity === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800';
                  return (
                    <div key={i} className={cn('flex items-start gap-3 rounded-xl border p-3', c)}>
                      <Ic className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.message}</p>
                        {a.data?.emails && <p className="text-xs mt-1 opacity-80">{(a.data.emails as string[]).join(', ')}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="MRR" value={`${o.mrr} SAR`} icon={CreditCard} sub={`${o.essentialsActive}E + ${o.eliteActive}L`} alert={o.mrr === 0 && o.trialSubscriptions > 0} />
              <Stat label="Users" value={o.totalUsers} icon={Users} sub={`${o.unconfirmedUsers} unconfirmed`} trend={o.signupsToday > 0 ? { dir: 'up', label: `+${o.signupsToday} today` } : undefined} />
              <Stat label="Active Subs" value={o.activeSubscriptions} icon={Zap} sub={`${o.trialSubscriptions} trial · ${o.manualSubscriptions} manual`} />
              <Stat label="Past Due" value={o.pastDueSubscriptions} icon={AlertTriangle} alert={o.pastDueSubscriptions > 0} sub={`${o.expiredSubscriptions} expired`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Coach Chats" value={o.totalCoachRequests} icon={MessageSquare} />
              <Stat label="Injections" value={o.totalInjectionLogs} icon={Activity} />
              <Stat label="Pending Reviews" value={o.pendingReviews} icon={Star} alert={o.pendingReviews > 0} sub={`${o.approvedReviews} approved`} />
              <Stat label="Signups (30d)" value={o.signupsMonth} icon={Users} sub={`${o.signupsWeek} this week`} />
            </div>

            {/* Funnel + Trials + Health */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Funnel */}
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Funnel</h3>
                {[{ l: 'Signups', v: stats.funnel.totalSignups, c: 'bg-stone-200' }, { l: 'Trial', v: stats.funnel.trialStarts, c: 'bg-blue-200' }, { l: 'Paid', v: stats.funnel.paidConversions, c: 'bg-emerald-200' }].map(s => (
                  <div key={s.l} className="mb-2">
                    <div className="flex justify-between text-xs mb-1"><span className="text-stone-600">{s.l}</span><span className="font-bold">{s.v}</span></div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden"><div className={cn('h-full rounded-full', s.c)} style={{ width: `${Math.max((s.v / Math.max(stats.funnel.totalSignups, 1)) * 100, 2)}%` }} /></div>
                  </div>
                ))}
                <div className="flex gap-4 mt-3 pt-3 border-t border-stone-100">
                  <div className="text-center flex-1"><p className="text-lg font-bold">{stats.funnel.signupToTrial}%</p><p className="text-[10px] text-stone-500">Sign &rarr; Trial</p></div>
                  <div className="text-center flex-1"><p className="text-lg font-bold">{stats.funnel.trialToPaid}%</p><p className="text-[10px] text-stone-500">Trial &rarr; Paid</p></div>
                </div>
              </div>

              {/* Active Trials */}
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-500" /> Active Trials</h3>
                {stats.recentUsers.filter(u => u.subscription?.status === 'trial').length === 0 ? <p className="text-sm text-stone-500">No active trials</p> :
                  stats.recentUsers.filter(u => u.subscription?.status === 'trial').map(u => {
                    const tl = trialLeft(u.subscription?.trial_ends_at ?? null);
                    return (
                      <div key={u.id} className="flex items-center justify-between text-sm mb-2">
                        <span className="font-mono text-xs text-stone-700 truncate max-w-[140px]">{u.email}</span>
                        <div className="flex items-center gap-1">
                          {tl && <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tl.urgent ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{tl.text}</span>}
                          <button onClick={() => openUserAction('extend_trial', u)} className="rounded p-1 hover:bg-stone-100" title="Extend"><CalendarPlus className="h-3.5 w-3.5 text-emerald-600" /></button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={runHealthCheck} disabled={healthLoading} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">
                    {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5 text-red-500" />} Run Health Check
                  </button>
                  <button onClick={() => { setEmailTo(''); setEmailSubject(''); setEmailBody(''); setModal('send_email'); setModalTarget(null); }} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
                    <Send className="h-3.5 w-3.5 text-blue-500" /> Send Email
                  </button>
                  <button onClick={() => exportCSV('users')} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
                    <Download className="h-3.5 w-3.5 text-emerald-500" /> Export Users CSV
                  </button>
                  <button onClick={() => exportCSV('subscriptions')} className="w-full flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
                    <Download className="h-3.5 w-3.5 text-emerald-500" /> Export Subscriptions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== USERS ===================== */}
        {tab === 'users' && (() => {
          const filtered = stats.recentUsers.filter(u => {
            if (userSearch && !u.email?.toLowerCase().includes(userSearch.toLowerCase())) return false;
            if (userFilter === 'all') return true;
            const s = u.subscription?.status ?? 'none';
            return userFilter === 'active' ? s === 'active' : userFilter === 'trial' ? s === 'trial' : userFilter === 'expired' ? (s === 'expired' || s === 'cancelled') : (s === 'none' || !u.subscription);
          });
          const paged = filtered.slice((usersPage - 1) * PER_PAGE, usersPage * PER_PAGE);
          return (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Search email..." value={userSearch} onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300" dir="ltr" />
                <div className="flex gap-1 overflow-x-auto">
                  {(['all', 'active', 'trial', 'expired', 'none'] as UserFilter[]).map(f => (
                    <button key={f} onClick={() => { setUserFilter(f); setUsersPage(1); }} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap', userFilter === f ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200')}>
                      {f === 'all' ? 'All' : f === 'active' ? 'Paid' : f === 'trial' ? 'Trial' : f === 'expired' ? 'Churned' : 'Free'}
                    </button>
                  ))}
                </div>
                <button onClick={() => exportCSV('users')} className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
              <p className="text-xs text-stone-500">{filtered.length} users</p>
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Email</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Provider</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Status</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Tier</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Trial</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Joined</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Last Seen</th>
                      <th className="px-3 py-2 text-start font-medium text-stone-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(u => {
                      const tl = u.subscription?.status === 'trial' ? trialLeft(u.subscription?.trial_ends_at ?? null) : null;
                      return (
                        <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="px-3 py-2 font-mono text-xs">{u.email}{!u.confirmed && <span className="ms-1 text-[10px] text-amber-600">(unconf)</span>}</td>
                          <td className="px-3 py-2 text-xs"><span className={cn('rounded-full px-2 py-0.5 text-xs', u.provider === 'google' ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-600')}>{u.provider}</span></td>
                          <td className="px-3 py-2"><Badge status={u.subscription?.status ?? 'none'} /></td>
                          <td className="px-3 py-2 text-xs">{u.subscription?.tier ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{tl ? <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tl.urgent ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{tl.text}</span> : '—'}</td>
                          <td className="px-3 py-2 text-xs text-stone-500">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2 text-xs text-stone-500">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => openUserAction('extend_trial', u)} title="Extend trial" className="rounded p-1 hover:bg-emerald-50"><CalendarPlus className="h-3.5 w-3.5 text-emerald-600" /></button>
                              <button onClick={() => openUserAction('grant_sub', u)} title="Grant subscription" className="rounded p-1 hover:bg-blue-50"><CreditCard className="h-3.5 w-3.5 text-blue-600" /></button>
                              <button onClick={() => { setEmailTo(u.email); setEmailSubject(''); setEmailBody(''); setModal('send_email'); setModalTarget(u); }} title="Send email" className="rounded p-1 hover:bg-violet-50"><Mail className="h-3.5 w-3.5 text-violet-600" /></button>
                              {(u.subscription?.status === 'active' || u.subscription?.status === 'trial') && (
                                <button onClick={() => openUserAction('cancel_sub', u)} title="Cancel subscription" className="rounded p-1 hover:bg-amber-50"><XCircle className="h-3.5 w-3.5 text-amber-600" /></button>
                              )}
                              <button onClick={() => openUserAction('confirm_suspend', u)} title="Suspend" className="rounded p-1 hover:bg-red-50"><Ban className="h-3.5 w-3.5 text-red-400" /></button>
                              <button onClick={async () => { try { await adminAction({ action: 'unsuspend_user', user_id: u.id }); toast.success(`${u.email} unsuspended`); fetchStats(); } catch { toast.error('Unsuspend failed'); } }} title="Unsuspend" className="rounded p-1 hover:bg-green-50"><ShieldCheck className="h-3.5 w-3.5 text-green-600" /></button>
                              <button onClick={() => openUserAction('confirm_delete', u)} title="Delete" className="rounded p-1 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
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
            <h2 className="text-sm font-bold text-stone-700">Activity Feed</h2>
            {stats.activityFeed.length === 0 ? <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><Activity className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500">No recent activity</p></div> : (
              <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
                {stats.activityFeed.map((item, i) => {
                  const Ic = ACTIVITY_ICON[item.type] ?? Activity;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn('rounded-full p-1.5', ACTIVITY_COLOR[item.type] ?? 'bg-stone-100 text-stone-600')}><Ic className="h-3.5 w-3.5" /></div>
                      <div className="flex-1 min-w-0"><p className="text-sm text-stone-800">{item.description}</p>{item.email && <p className="text-xs text-stone-500 font-mono truncate">{item.email}</p>}</div>
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
            <h2 className="text-sm font-bold text-stone-700">Pending Reviews ({stats.pendingReviews.length})</h2>
            {stats.pendingReviews.length === 0 ? <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><Star className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500">No pending reviews</p></div> :
              stats.pendingReviews.map(r => (
                <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-900">{r.name}</span>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={cn('h-4 w-4', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300')} />)}</div>
                  </div>
                  <p className="text-sm text-stone-700">{r.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-stone-500">{timeAgo(r.created_at)}</p>
                    <div className="flex gap-2">
                      <button onClick={async () => { setApprovingReviewId(r.id); try { await adminAction({ action: 'approve_review', review_id: r.id }); toast.success('Approved'); fetchStats(); } catch { toast.error('Failed'); } finally { setApprovingReviewId(null); } }}
                        disabled={approvingReviewId === r.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">{(approvingReviewId === r.id) ? <><Loader2 className="h-3 w-3 animate-spin" /> Approving...</> : 'Approve'}</button>
                      <button onClick={async () => { if (!confirm('Delete?')) return; try { await adminAction({ action: 'delete_review', review_id: r.id }); toast.success('Deleted'); fetchStats(); } catch { toast.error('Failed'); } }}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ===================== ENQUIRIES ===================== */}
        {tab === 'enquiries' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700">Enquiries ({stats.enquiries.length})</h2>
            {stats.enquiries.length === 0 ? <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><Mail className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500">No enquiries</p></div> :
              stats.enquiries.map(eq => (
                <div key={eq.id} className={cn('rounded-xl border bg-white p-4', eq.status === 'pending' ? 'border-amber-200' : 'border-stone-200')}>
                  <div className="flex items-center justify-between mb-2">
                    <div><span className="font-mono text-xs text-stone-500">{eq.email}</span>{eq.peptide_name && <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{eq.peptide_name}</span>}</div>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', eq.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{eq.status}</span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mb-1">{eq.subject}</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{eq.message}</p>
                  {eq.admin_notes && <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3"><p className="text-xs font-medium text-emerald-700 mb-1">Reply:</p><p className="text-sm text-emerald-800 whitespace-pre-wrap">{eq.admin_notes}</p></div>}
                  {replyingTo === eq.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type reply..." rows={3} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300 resize-y" dir="ltr" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"><X className="h-3 w-3" /> Cancel</button>
                        <button disabled={replySending || !replyText.trim()} onClick={async () => {
                          setReplySending(true);
                          try {
                            const { supabase } = await import('@/lib/supabase');
                            await supabase.from('enquiries').update({ status: 'replied', admin_notes: replyText.trim(), replied_at: new Date().toISOString() }).eq('id', eq.id);
                            const token = await getToken();
                            const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-enquiry-reply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ to: eq.email, subject: `رد: ${eq.subject}`, reply: replyText.trim() }) });
                            toast.success(r.ok ? 'Reply sent' : 'Reply saved (email failed)');
                            setReplyingTo(null); setReplyText(''); fetchStats();
                          } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
                          finally { setReplySending(false); }
                        }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <Send className="h-3 w-3" /> {replySending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-stone-500">{timeAgo(eq.created_at)}</p>
                      <button onClick={() => { setReplyingTo(eq.id); setReplyText(eq.admin_notes ?? ''); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Reply className="h-3 w-3" /> {eq.admin_notes ? 'Edit' : 'Reply'}</button>
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
              <h2 className="text-sm font-bold text-stone-700">Email List ({stats.emailList.length})</h2>
              <button onClick={() => exportCSV('email_list')} className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"><Download className="h-3.5 w-3.5" /> Export</button>
            </div>
            {stats.emailList.length === 0 ? <div className="rounded-xl border border-stone-200 bg-white p-8 text-center"><Mail className="mx-auto h-8 w-8 text-stone-300 mb-2" /><p className="text-sm text-stone-500">No subscribers</p></div> :
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><table className="w-full text-sm"><thead><tr className="border-b border-stone-200 bg-stone-50"><th className="px-3 py-2 text-start font-medium text-stone-600">Email</th><th className="px-3 py-2 text-start font-medium text-stone-600">Date</th></tr></thead><tbody>{stats.emailList.map(e => <tr key={e.id} className="border-b border-stone-100 hover:bg-stone-50"><td className="px-3 py-2 font-mono text-xs">{e.email}</td><td className="px-3 py-2 text-xs text-stone-500">{timeAgo(e.created_at)}</td></tr>)}</tbody></table></div>}
          </div>
        )}

        {/* ===================== EMAIL LOGS ===================== */}
        {tab === 'email-logs' && (() => {
          const logs = stats.emailLogs;
          const paged = logs.slice((emailLogsPage - 1) * PER_PAGE, emailLogsPage * PER_PAGE);
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-700">Emails Sent ({logs.length})</h2>
                {logs.length > 0 && <span className="text-xs text-emerald-600 font-medium">{logs.filter(l => l.status === 'sent').length} delivered</span>}
              </div>
              {logs.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-2" /><p className="text-sm font-medium text-amber-800">No email logs</p><p className="text-xs text-amber-600 mt-1">Resend may not be configured</p></div> : (
                <><div className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><table className="w-full text-sm"><thead><tr className="border-b border-stone-200 bg-stone-50"><th className="px-3 py-2 text-start font-medium text-stone-600">To</th><th className="px-3 py-2 text-start font-medium text-stone-600">Type</th><th className="px-3 py-2 text-start font-medium text-stone-600">Status</th><th className="px-3 py-2 text-start font-medium text-stone-600">When</th></tr></thead>
                <tbody>{paged.map(l => <tr key={l.id} className="border-b border-stone-100 hover:bg-stone-50"><td className="px-3 py-2 font-mono text-xs">{l.email}</td><td className="px-3 py-2 text-xs"><span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{l.type}</span></td><td className="px-3 py-2"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', l.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{l.status}</span></td><td className="px-3 py-2 text-xs text-stone-500">{timeAgo(l.created_at)}</td></tr>)}</tbody></table></div>
                <Pagination page={emailLogsPage} total={logs.length} onChange={setEmailLogsPage} /></>)}
            </div>
          );
        })()}

        {/* ===================== PAYMENTS ===================== */}
        {tab === 'payments' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700">Webhook Events ({stats.webhookEvents.length})</h2>
            {stats.webhookEvents.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-2" /><p className="text-sm font-medium text-amber-800">No events recorded</p><p className="text-xs text-amber-600 mt-1">Stripe webhooks may not be configured</p></div> :
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><table className="w-full text-sm"><thead><tr className="border-b border-stone-200 bg-stone-50"><th className="px-3 py-2 text-start font-medium text-stone-600">Event</th><th className="px-3 py-2 text-start font-medium text-stone-600">ID</th><th className="px-3 py-2 text-start font-medium text-stone-600">When</th></tr></thead>
              <tbody>{stats.webhookEvents.map(ev => <tr key={ev.event_id} className="border-b border-stone-100 hover:bg-stone-50"><td className="px-3 py-2 text-xs"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ev.event_type.includes('succeeded') || ev.event_type.includes('paid') ? 'bg-emerald-100 text-emerald-700' : ev.event_type.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-700')}>{ev.event_type}</span></td><td className="px-3 py-2 font-mono text-xs text-stone-500">{ev.event_id?.slice(0, 24)}</td><td className="px-3 py-2 text-xs text-stone-500">{timeAgo(ev.processed_at)}</td></tr>)}</tbody></table></div>}
          </div>
        )}

        {/* ===================== HEALTH ===================== */}
        {tab === 'health' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-stone-700">System Health</h2>
              <div className="flex gap-2">
                <button onClick={runHealthCheck} disabled={healthLoading} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />} Health
                </button>
                <button onClick={runStripeVerify} disabled={stripeVerifyLoading} className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50">
                  {stripeVerifyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Stripe
                </button>
              </div>
            </div>
            {!health ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                <Heart className="mx-auto h-8 w-8 text-stone-300 mb-2" />
                <p className="text-sm text-stone-500">Click "Run Check" to test all services</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={cn('rounded-xl border p-4 text-center', health.status === 'healthy' ? 'border-emerald-200 bg-emerald-50' : health.status === 'degraded' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50')}>
                  <p className={cn('text-xl font-bold', health.status === 'healthy' ? 'text-emerald-700' : health.status === 'degraded' ? 'text-amber-700' : 'text-red-700')}>
                    {health.status === 'healthy' ? 'All Systems Healthy' : health.status === 'degraded' ? 'Degraded' : 'Unhealthy'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">{new Date(health.timestamp).toLocaleString('en-GB')}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(health.checks).map(([name, c]) => (
                    <div key={name} className={cn('rounded-xl border p-4', c.status === 'ok' ? 'border-stone-200 bg-white' : c.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-stone-800 capitalize">{name.replace(/_/g, ' ')}</span>
                        {c.status === 'ok' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : c.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <p className="text-xs text-stone-600">{c.detail}</p>
                      {c.ms > 0 && <p className="text-[10px] text-stone-400 mt-1">{c.ms}ms</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stripeVerify && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Stripe Verification</h3>
                <div className={cn('rounded-xl border p-4', stripeVerify.status === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                  <p className={cn('font-bold', stripeVerify.status === 'ok' ? 'text-emerald-700' : 'text-amber-700')}>{stripeVerify.status === 'ok' ? 'Prices + webhooks OK' : 'Issues found'}</p>
                  <pre className="mt-2 text-xs overflow-x-auto bg-white/60 p-3 rounded-lg">{JSON.stringify(stripeVerify.prices, null, 2)}</pre>
                  {stripeVerify.missingEvents?.length > 0 && <p className="text-xs text-amber-700 mt-2">Missing events: {stripeVerify.missingEvents.join(', ')}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Extend Trial */}
      <Modal open={modal === 'extend_trial'} title="Extend Trial" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 mb-3">Extend trial for <span className="font-mono font-bold">{modalTarget?.email}</span></p>
        <label className="block text-xs font-medium text-stone-600 mb-1">Days to add</label>
        <input type="number" min={1} max={90} value={extendDays} onChange={e => setExtendDays(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600">Cancel</button>
          <button onClick={handleExtendTrial} disabled={actionLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'Extending...' : `Extend ${extendDays} days`}
          </button>
        </div>
      </Modal>

      {/* Grant Subscription */}
      <Modal open={modal === 'grant_sub'} title="Grant Subscription" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 mb-3">Grant to <span className="font-mono font-bold">{modalTarget?.email}</span></p>
        <label className="block text-xs font-medium text-stone-600 mb-1">Tier</label>
        <select value={grantTier} onChange={e => setGrantTier(e.target.value as 'essentials' | 'elite')} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm mb-3">
          <option value="essentials">Essentials ({PRICING.essentials.label})</option>
          <option value="elite">Elite ({PRICING.elite.label})</option>
        </select>
        <label className="block text-xs font-medium text-stone-600 mb-1">Duration (days)</label>
        <input type="number" min={1} max={365} value={grantDuration} onChange={e => setGrantDuration(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600">Cancel</button>
          <button onClick={handleGrantSub} disabled={actionLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'Granting...' : 'Grant'}
          </button>
        </div>
      </Modal>

      {/* Cancel Subscription */}
      <Modal open={modal === 'cancel_sub'} title="Cancel Subscription" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 mb-3">Cancel subscription for <span className="font-mono font-bold">{modalTarget?.email}</span>?</p>
        <p className="text-xs text-amber-600 mb-4">This will set cancel_at_period_end on Stripe and mark as cancelled in DB.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600">No</button>
          <button onClick={handleCancelSub} disabled={actionLoading} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        </div>
      </Modal>

      {/* Send Email */}
      <Modal open={modal === 'send_email'} title="Send Email" onClose={() => setModal(null)}>
        <label className="block text-xs font-medium text-stone-600 mb-1">To</label>
        <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="user@example.com" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm mb-3" dir="ltr" />
        <label className="block text-xs font-medium text-stone-600 mb-1">Subject</label>
        <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm mb-3" dir="ltr" />
        <label className="block text-xs font-medium text-stone-600 mb-1">Body</label>
        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Email content..." rows={4} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm mb-4 resize-y" dir="ltr" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600">Cancel</button>
          <button onClick={handleSendEmail} disabled={actionLoading || !emailTo || !emailSubject || !emailBody} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </Modal>

      {/* Suspend User */}
      <Modal open={modal === 'confirm_suspend'} title="Suspend User" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 mb-3">Suspend <span className="font-mono font-bold text-red-600">{modalTarget?.email}</span>?</p>
        <p className="text-xs text-red-600 mb-4">This bans the user from logging in and expires their subscription.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600">Cancel</button>
          <button onClick={handleSuspend} disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'Suspending...' : 'Suspend'}
          </button>
        </div>
      </Modal>

      {/* Delete User */}
      <Modal open={modal === 'confirm_delete'} title="Delete User" onClose={() => setModal(null)}>
        <p className="text-sm text-stone-600 mb-3">Permanently delete <span className="font-mono font-bold text-red-600">{modalTarget?.email}</span>?</p>
        <p className="text-xs text-red-600 mb-4">This cancels their Stripe subscription, deletes all their data from every table, and removes their auth account. This CANNOT be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setModal(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600">Cancel</button>
          <button onClick={handleDelete} disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {actionLoading ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
