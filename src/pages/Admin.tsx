import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Users, CreditCard, MessageSquare, Star, Mail, Activity, TrendingUp, AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_EMAILS = ['abdullahalameer@gmail.com', 'contact@pptides.com'];

interface AdminStats {
  overview: {
    totalUsers: number;
    signupsToday: number;
    signupsWeek: number;
    signupsMonth: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    expiredSubscriptions: number;
    pastDueSubscriptions: number;
    essentialsActive: number;
    eliteActive: number;
    trialEssentials: number;
    trialElite: number;
    mrr: number;
    totalInjectionLogs: number;
    totalCoachRequests: number;
    totalCommunityPosts: number;
    pendingReviews: number;
    approvedReviews: number;
    emailListCount: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    provider: string;
    confirmed: boolean;
    subscription: {
      status: string;
      tier: string;
      stripe_subscription_id: string | null;
      trial_ends_at: string | null;
      current_period_end: string | null;
      created_at: string;
    } | null;
  }>;
  pendingReviews: Array<{ id: string; name: string; rating: number; content: string; created_at: string }>;
  emailList: Array<{ id: string; email: string; created_at: string }>;
}

type Tab = 'overview' | 'users' | 'reviews' | 'emails' | 'enquiries';
type UserFilter = 'all' | 'active' | 'trial' | 'expired' | 'none';

function StatCard({ label, value, icon: Icon, sub, alert }: { label: string; value: string | number; icon: React.ElementType; sub?: string; alert?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-4', alert ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <Icon className={cn('h-4 w-4', alert ? 'text-red-500' : 'text-emerald-500')} />
      </div>
      <p className={cn('text-2xl font-bold', alert ? 'text-red-700' : 'text-stone-900')}>{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    trial: 'bg-blue-100 text-blue-700',
    expired: 'bg-stone-100 text-stone-600',
    cancelled: 'bg-stone-100 text-stone-600',
    past_due: 'bg-red-100 text-red-700',
    none: 'bg-stone-100 text-stone-500',
  };
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', styles[status] ?? styles.none)}>{status}</span>;
}

export default function Admin() {
  const { user, subscription } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? '');

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const session = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No token');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to fetch stats');
      }
      setStats(await res.json());
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (isAdmin) fetchStats(); }, [isAdmin, fetchStats]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Helmet><title>Admin | pptides</title></Helmet>
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-stone-300 mb-4" />
          <h1 className="text-xl font-bold text-stone-900 mb-2">Access Denied</h1>
          <p className="text-stone-500">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Helmet><title>Admin | pptides</title></Helmet>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Helmet><title>Admin | pptides</title></Helmet>
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchStats} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Retry</button>
        </div>
      </div>
    );
  }

  const o = stats.overview;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users', count: o.totalUsers },
    { key: 'reviews', label: 'Reviews', count: o.pendingReviews },
    { key: 'enquiries', label: 'Enquiries', count: (o as Record<string, number>).pendingEnquiries ?? 0 },
    { key: 'emails', label: 'Email List', count: o.emailListCount },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Helmet><title>Admin Dashboard | pptides</title></Helmet>

      <div className="sticky top-[64px] md:top-[72px] z-30 bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">Admin Dashboard</h1>
            {lastFetched && <p className="text-[10px] text-stone-400">Updated {lastFetched.toLocaleTimeString('en-GB')}</p>}
          </div>
          <button onClick={fetchStats} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </button>
        </div>
        <div className="max-w-6xl mx-auto flex gap-1 mt-3 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600 hover:bg-stone-100'
            )}>
              {t.label}
              {t.count != null && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', tab === t.key ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600')}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Users" value={o.totalUsers} icon={Users} sub={`+${o.signupsToday} today · +${o.signupsWeek} this week`} />
              <StatCard label="MRR" value={`$${o.mrr}`} icon={TrendingUp} sub={`${o.essentialsActive} Essentials · ${o.eliteActive} Elite`} />
              <StatCard label="Active Subs" value={o.activeSubscriptions} icon={CreditCard} sub={`${o.trialSubscriptions} trials`} />
              <StatCard label="Past Due" value={o.pastDueSubscriptions} icon={AlertTriangle} alert={o.pastDueSubscriptions > 0} sub={`${o.expiredSubscriptions} expired`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Injection Logs" value={o.totalInjectionLogs} icon={Activity} />
              <StatCard label="Coach Chats" value={o.totalCoachRequests} icon={MessageSquare} />
              <StatCard label="Community Posts" value={o.totalCommunityPosts} icon={Users} />
              <StatCard label="Pending Reviews" value={o.pendingReviews} icon={Star} alert={o.pendingReviews > 0} sub={`${o.approvedReviews} approved`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Email List" value={o.emailListCount} icon={Mail} />
              <StatCard label="Conversion Rate" value={o.totalUsers > 0 ? `${Math.round((o.activeSubscriptions / o.totalUsers) * 100)}%` : '0%'} icon={TrendingUp} sub={`${o.activeSubscriptions} paid / ${o.totalUsers} total`} />
              <StatCard label="Trial → Paid" value={o.trialSubscriptions > 0 ? `${Math.round(((o.essentialsActive + o.eliteActive) / (o.essentialsActive + o.eliteActive + o.trialSubscriptions + o.expiredSubscriptions)) * 100)}%` : '—'} icon={CreditCard} />
              <StatCard label="Signups (30d)" value={o.signupsMonth} icon={Users} />
            </div>
          </div>
        )}

        {tab === 'users' && (() => {
          const filtered = stats.recentUsers.filter(u => {
            if (userSearch && !u.email?.toLowerCase().includes(userSearch.toLowerCase())) return false;
            if (userFilter === 'all') return true;
            const s = u.subscription?.status ?? 'none';
            if (userFilter === 'active') return s === 'active';
            if (userFilter === 'trial') return s === 'trial';
            if (userFilter === 'expired') return s === 'expired' || s === 'cancelled';
            if (userFilter === 'none') return s === 'none' || !u.subscription;
            return true;
          });
          return (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  dir="ltr"
                />
                <div className="flex gap-1 overflow-x-auto">
                  {(['all', 'active', 'trial', 'expired', 'none'] as UserFilter[]).map(f => (
                    <button key={f} onClick={() => setUserFilter(f)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap', userFilter === f ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200')}>
                      {f === 'all' ? 'All' : f === 'active' ? 'Paid' : f === 'trial' ? 'Trial' : f === 'expired' ? 'Expired' : 'Free'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-stone-500">{filtered.length} users{userSearch ? ` matching "${userSearch}"` : ''}</p>
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-3 py-2 text-left font-medium text-stone-600">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-stone-600">Provider</th>
                      <th className="px-3 py-2 text-left font-medium text-stone-600">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-stone-600">Tier</th>
                      <th className="px-3 py-2 text-left font-medium text-stone-600">Signed Up</th>
                      <th className="px-3 py-2 text-left font-medium text-stone-600">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="px-3 py-2 font-mono text-xs">{u.email}{!u.confirmed && <span className="ml-1 text-[10px] text-amber-600">(unconfirmed)</span>}</td>
                        <td className="px-3 py-2 text-xs">{u.provider}</td>
                        <td className="px-3 py-2"><StatusBadge status={u.subscription?.status ?? 'none'} /></td>
                        <td className="px-3 py-2 text-xs">{u.subscription?.tier ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-stone-500">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                        <td className="px-3 py-2 text-xs text-stone-500">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {tab === 'reviews' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700">Pending Reviews ({stats.pendingReviews.length})</h2>
            {stats.pendingReviews.length === 0 ? (
              <p className="text-sm text-stone-500">No pending reviews</p>
            ) : (
              stats.pendingReviews.map(r => (
                <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-900">{r.name}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={cn('text-sm', s <= r.rating ? 'text-amber-400' : 'text-stone-300')}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-stone-700">{r.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-stone-400">{new Date(r.created_at).toLocaleDateString('en-GB')}</p>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        const { supabase } = await import('@/lib/supabase');
                        const session = await supabase.auth.getSession();
                        const token = session.data.session?.access_token;
                        if (!token) return;
                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/reviews?id=eq.${r.id}`, {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
                          body: JSON.stringify({ is_approved: true }),
                        });
                        if (res.ok) { toast.success('Review approved'); fetchStats(); } else { toast.error('Failed to approve'); }
                      }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Approve</button>
                      <button onClick={async () => {
                        if (!window.confirm('Delete this review?')) return;
                        const { supabase } = await import('@/lib/supabase');
                        const session = await supabase.auth.getSession();
                        const token = session.data.session?.access_token;
                        if (!token) return;
                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/reviews?id=eq.${r.id}`, {
                          method: 'DELETE', headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
                        });
                        if (res.ok) { toast.success('Review deleted'); fetchStats(); } else { toast.error('Failed to delete'); }
                      }} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'enquiries' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-stone-700">User Enquiries ({((stats as Record<string, unknown[]>).enquiries ?? []).length})</h2>
            {((stats as Record<string, Array<{ id: string; email: string; subject: string; peptide_name: string | null; message: string; status: string; created_at: string }>>).enquiries ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">No enquiries yet</p>
            ) : (
              ((stats as Record<string, Array<{ id: string; email: string; subject: string; peptide_name: string | null; message: string; status: string; created_at: string }>>).enquiries ?? []).map(eq => (
                <div key={eq.id} className={cn('rounded-xl border bg-white p-4', eq.status === 'pending' ? 'border-amber-200' : 'border-stone-200')}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs text-stone-500">{eq.email}</span>
                      {eq.peptide_name && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{eq.peptide_name}</span>}
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', eq.status === 'pending' ? 'bg-amber-100 text-amber-700' : eq.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600')}>{eq.status}</span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mb-1">{eq.subject}</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{eq.message}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-stone-400">{new Date(eq.created_at).toLocaleDateString('en-GB')} {new Date(eq.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    <a href={`mailto:${eq.email}?subject=Re: ${eq.subject}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Reply</a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'emails' && (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-3 py-2 text-left font-medium text-stone-600">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.emailList.map(e => (
                  <tr key={e.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 font-mono text-xs">{e.email}</td>
                    <td className="px-3 py-2 text-xs text-stone-500">{new Date(e.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
