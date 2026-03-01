import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Bot,
  FlaskConical,
  Table2,
  Crown,
  CheckCircle2,
  Circle,
  Syringe,
  Flame,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PEPTIDE_COUNT, STATUS_LABELS, TIER_LABELS } from '@/lib/constants';
import OnboardingModal from '@/components/OnboardingModal';
import ProgressRing from '@/components/charts/ProgressRing';
import AdherenceBar from '@/components/charts/AdherenceBar';
import DoseTitrationTimeline from '@/components/DoseTitrationTimeline';
import ShareableCard from '@/components/ShareableCard';
import { peptides as allPeptides } from '@/data/peptides';
import { labTests } from '@/data/peptides';

const QUICK_LINKS = [
  { to: '/coach', label: 'المدرب الذكي', description: 'اسأل خبير الببتيدات', Icon: Bot },
  { to: '/tracker', label: 'سجل الحقن', description: 'تتبّع جرعاتك', Icon: Syringe },
  { to: '/calculator', label: 'الحاسبة', description: 'احسب جرعتك بدقة', Icon: Calculator },
  { to: '/library', label: 'المكتبة', description: `تصفّح ${PEPTIDE_COUNT}+ ببتيد`, Icon: BookOpen },
  { to: '/lab-guide', label: 'دليل التحاليل', description: '11 تحليل أساسي', Icon: FlaskConical },
  { to: '/table', label: 'الجدول المرجعي', description: 'جميع الببتيدات في جدول', Icon: Table2 },
];

const GETTING_STARTED = [
  { id: 'library', label: 'تصفّح مكتبة الببتيدات', to: '/library' },
  { id: 'calculator', label: 'جرّب حاسبة الجرعات', to: '/calculator' },
  { id: 'coach', label: 'اسأل المدرب الذكي', to: '/coach' },
];


function useVisitedPages() {
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pptides_visited');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem('pptides_visited', JSON.stringify([...visited])); } catch { /* expected */ }
  }, [visited]);

  const markVisited = (id: string) => setVisited(prev => new Set(prev).add(id));
  return { visited, markVisited };
}

interface RecentLog {
  id: string;
  peptide_name: string;
  dose: number;
  dose_unit: string;
  logged_at: string;
}

interface TodayItem { peptide: string; dose: number; dose_unit: string; done: boolean }

function useRecentActivity(userId: string | undefined) {
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase
      .from('injection_logs')
      .select('id, peptide_name, dose, dose_unit, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .gte('logged_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data, error }) => {
        if (!mounted) return;
        if (data && !error) setLogs(data);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    supabase
      .from('injection_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => {
        if (mounted && count != null) setTotalCount(count);
      }).catch(() => { if (mounted) /* silently ignored — non-critical */; });
    return () => { mounted = false; };
  }, [userId]);

  const activePeptides = [...new Set(logs.map(l => l.peptide_name))];
  const totalInjections = totalCount || logs.length;

  let streak = 0;
  if (logs.length > 0) {
    const daySet = new Set(logs.map(l => new Date(l.logged_at).toDateString()));
    const d = new Date();
    if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  }

  const todayPlan: TodayItem[] = [];
  if (logs.length >= 3) {
    const today = new Date().toDateString();
    const peptideFreq: Record<string, { dose: number; unit: string; daysUsed: Set<string>; total: number }> = {};
    logs.forEach(l => {
      if (!peptideFreq[l.peptide_name]) peptideFreq[l.peptide_name] = { dose: l.dose, unit: l.dose_unit, daysUsed: new Set(), total: 0 };
      peptideFreq[l.peptide_name].daysUsed.add(new Date(l.logged_at).toDateString());
      peptideFreq[l.peptide_name].total++;
    });
    const todayDone = new Set(logs.filter(l => new Date(l.logged_at).toDateString() === today).map(l => l.peptide_name));
    for (const [name, info] of Object.entries(peptideFreq)) {
      if (info.total >= 2) {
        todayPlan.push({ peptide: name, dose: info.dose, dose_unit: info.dose_unit, done: todayDone.has(name) });
      }
    }
  }

  const [lastCheckedAt, setLastCheckedAt] = useState(Date.now);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync timestamp when data arrives
  useEffect(() => { if (!loading) setLastCheckedAt(Date.now()); }, [loading]);

  return { logs: logs.slice(0, 5), loading, activePeptides, totalInjections, streak, todayPlan, lastCheckedAt };
}

interface ActiveProtocol {
  id: string;
  peptide_id: string;
  dose: number;
  dose_unit: string;
  frequency: string;
  cycle_weeks: number;
  started_at: string;
  status: string;
}

function useActiveProtocols(userId: string | undefined) {
  const [protocols, setProtocols] = useState<ActiveProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchProtocols = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_protocols')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    if (!error && data) setProtocols(data);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    fetchProtocols().then(() => { if (!mounted) return; }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId, fetchProtocols]);
  return { protocols, loading, refetch: fetchProtocols };
}

export default function Dashboard() {
  const { user, subscription } = useAuth();
  const { visited, markVisited } = useVisitedPages();
  const activity = useRecentActivity(user?.id);
  const { protocols: activeProtocols, refetch: refetchProtocols } = useActiveProtocols(user?.id);
  const [shareProtocolId, setShareProtocolId] = useState<string | null>(null);

  useEffect(() => {
    if (shareProtocolId) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [shareProtocolId]);

  if (!user) return null;

  const rawName = user.email?.split('@')[0] ?? 'مستخدم';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>لوحة التحكم | pptides</title>
        <meta name="description" content="لوحة التحكم الرئيسية لإدارة حسابك في pptides. Your pptides dashboard." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {!activity.loading && activity.logs.length === 0 && <OnboardingModal />}

      {/* Welcome Header */}
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <LayoutDashboard className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
          مرحبًا، {displayName}
        </h1>
        <p className="mt-2 text-lg text-stone-600">ابدأ من هنا — كل أدواتك في مكان واحد</p>
      </div>

      {/* Subscription Status Card */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Crown className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-stone-900">اشتراكك</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4" role="status">
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
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            subscription.isProOrTrial
              ? 'bg-emerald-100 text-emerald-700'
              : subscription.status === 'past_due'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-200 text-stone-600',
          )}>
            {subscription.isProOrTrial && subscription.status === 'cancelled'
              ? 'نشط'
              : STATUS_LABELS[subscription.status] ?? subscription.status}
          </span>
          {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
            <span className="text-sm text-amber-600 font-bold">
              {arPlural(subscription.trialDaysLeft, 'يوم واحد متبقي', 'يومان متبقيان', 'أيام متبقية')}
            </span>
          )}
        </div>
        {!subscription.isProOrTrial && (
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            ابدأ تجربتك المجانية
          </Link>
        )}
      </div>

      {/* Active Protocols */}
      {activeProtocols.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-stone-900">بروتوكولاتك النشطة</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeProtocols.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const startDate = new Date(proto.started_at);
              const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = proto.cycle_weeks * 7;
              const daysLeft = Math.max(totalDays - daysSinceStart, 0);
              const relatedLabs = peptide ? labTests.filter(lt => lt.relatedCategories.includes(peptide.category)) : [];
              const showLabReminder = daysSinceStart >= 21 && relatedLabs.length > 0;

              return (
                <div key={proto.id} className="rounded-2xl border border-emerald-200 bg-white p-5 transition-all hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <ProgressRing current={daysSinceStart} total={totalDays} size={64} label={`يوم ${daysSinceStart}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 truncate">{peptide?.nameAr ?? proto.peptide_id}</p>
                      <p className="text-xs text-stone-500 mt-0.5" dir="ltr">{proto.dose} {proto.dose_unit} — {proto.frequency === 'od' ? 'يوميًا' : proto.frequency === 'bid' ? 'مرتين يوميًا' : proto.frequency === 'weekly' ? 'أسبوعيًا' : proto.frequency}</p>
                      <p className="text-xs text-stone-400 mt-1">{daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'انتهت الدورة'}</p>
                    </div>
                  </div>
                  {daysLeft <= 3 && daysLeft > 0 && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700">
                      دورتك تنتهي خلال {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} — خطّط لفترة الراحة
                    </div>
                  )}
                  {daysLeft === 0 && (
                    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">
                      أكملت الدورة! {peptide?.restPeriodWeeks ? `فترة راحة موصى بها: ${peptide.restPeriodWeeks} أسابيع` : ''}
                    </div>
                  )}
                  {showLabReminder && (
                    <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                      <strong>تحاليل موصى بها:</strong> {relatedLabs.slice(0, 2).map(l => l.nameAr).join('، ')}
                      <Link to="/lab-guide" className="ms-1 font-bold text-blue-600 hover:underline">عرض الدليل</Link>
                    </div>
                  )}
                  {peptide?.weeklySchedule && peptide.weeklySchedule.length >= 2 && (
                    <div className="mt-3">
                      <DoseTitrationTimeline schedule={peptide.weeklySchedule} currentWeek={Math.ceil(daysSinceStart / 7)} />
                    </div>
                  )}
                  <div className="mt-3">
                    {(() => {
                      const frequencyMultiplier = proto.frequency === 'bid' ? 2 : proto.frequency === 'tid' ? 3 : 1;
                      const scheduledDoses = daysSinceStart * frequencyMultiplier;
                      return (
                        <AdherenceBar scheduled={scheduledDoses} actual={activity.logs.filter(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id)).length} />
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/tracker?peptide=${encodeURIComponent(peptide?.nameEn ?? proto.peptide_id)}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <Syringe className="h-4 w-4" />
                      سجّل جرعة اليوم
                    </Link>
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('user_protocols')
                          .update({ status: 'completed', updated_at: new Date().toISOString() })
                          .eq('id', proto.id)
                          .eq('user_id', user.id);
                        if (!error) {
                          toast.success('تم إنهاء البروتوكول');
                          refetchProtocols();
                        } else {
                          toast.error('تعذّر إنهاء البروتوكول');
                        }
                      }}
                      className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                    >
                      أنهِ البروتوكول
                    </button>
                    <button
                      onClick={() => setShareProtocolId(proto.id)}
                      className="flex items-center justify-center rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-500 transition-colors hover:bg-stone-50 hover:text-emerald-600"
                      aria-label="مشاركة"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share Protocol Modal */}
      {shareProtocolId && (() => {
        const proto = activeProtocols.find(p => p.id === shareProtocolId);
        if (!proto) return null;
        const peptide = allPeptides.find(p => p.id === proto.peptide_id);
        const daysSinceStart = Math.floor((Date.now() - new Date(proto.started_at).getTime()) / (1000 * 60 * 60 * 24));
        const actualDoses = activity.logs.filter(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id)).length;
        const adherence = daysSinceStart > 0 ? Math.min(Math.round((actualDoses / daysSinceStart) * 100), 100) : 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShareProtocolId(null)}>
            <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <ShareableCard
                peptideName={peptide?.nameAr ?? proto.peptide_id}
                peptideNameEn={peptide?.nameEn ?? proto.peptide_id}
                dose={proto.dose}
                unit={proto.dose_unit}
                frequency={proto.frequency}
                cycleWeeks={proto.cycle_weeks}
                daysSinceStart={daysSinceStart}
                adherencePercent={adherence}
              />
              <button onClick={() => setShareProtocolId(null)} className="mt-3 w-full rounded-xl border border-stone-200 py-2.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50">
                إغلاق
              </button>
            </div>
          </div>
        );
      })()}

      {/* Today's Protocol — only show heuristic plan when no formal active protocols exist */}
      {!activity.loading && activity.todayPlan.length > 0 && activeProtocols.length === 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-stone-900">بروتوكول اليوم</h2>
          <div className="space-y-2">
            {activity.todayPlan.map(item => (
              <div key={item.peptide} className={cn(
                'flex items-center justify-between rounded-2xl border px-5 py-4 transition-all',
                item.done ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'
              )}>
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-stone-300" />
                  )}
                  <div>
                    <p className={cn('text-sm font-bold', item.done ? 'text-emerald-700' : 'text-stone-900')} dir="ltr">{item.peptide}</p>
                    <p className="text-xs text-stone-500">{item.dose} {item.dose_unit}</p>
                  </div>
                </div>
                {!item.done && (
                  <Link
                    to={`/tracker?peptide=${encodeURIComponent(item.peptide)}`}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                  >
                    سجّل الآن
                  </Link>
                )}
                {item.done && <span className="text-xs font-bold text-emerald-600">تم</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Section */}
      {!activity.loading && activity.logs.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-stone-900">نشاطك</h2>
          <div className="grid gap-4 sm:grid-cols-4 mb-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-black text-stone-900">
                {(() => {
                  const last = activity.logs[0];
                  if (!last) return '—';
                  const diff = activity.lastCheckedAt - new Date(last.logged_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins} دقيقة`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs} ساعة`;
                  const days = Math.floor(hrs / 24);
                  return `${days} يوم`;
                })()}
              </p>
              <p className="text-xs text-stone-500">آخر حقنة منذ</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900">{activity.streak}</p>
              <p className="text-xs text-stone-500">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-black text-stone-900">{activity.activePeptides.length}</p>
              <p className="text-xs text-stone-500">ببتيدات نشطة</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900">{activity.totalInjections}</p>
              <p className="text-xs text-stone-500">حقن مسجّلة</p>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900">آخر الحقن</h3>
              <Link to="/tracker" className="text-xs font-semibold text-emerald-600 hover:underline">عرض الكل</Link>
            </div>
            <div className="space-y-2">
              {activity.logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                  <div>
                    <span className="text-sm font-bold text-stone-900" dir="ltr">{log.peptide_name}</span>
                    <span className="me-2 text-xs text-stone-500">{log.dose} {log.dose_unit}</span>
                  </div>
                  <span className="text-xs text-stone-400">
                    {new Date(log.logged_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Streak Calendar */}
      {!activity.loading && activity.logs.length > 0 && (() => {
        const today = new Date();
        const days: { date: Date; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const ds = d.toDateString();
          const count = activity.logs.filter(l => new Date(l.logged_at).toDateString() === ds).length;
          days.push({ date: d, count });
        }

        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900">آخر 30 يوم</h3>
              <span className="text-xs text-stone-500">{days.filter(d => d.count > 0).length} يوم نشط</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1">
              {days.map((d, i) => (
                <div key={i} className={cn(
                  'aspect-square rounded-sm transition-colors',
                  d.count === 0 ? 'bg-stone-100' :
                  d.count === 1 ? 'bg-emerald-200' :
                  d.count === 2 ? 'bg-emerald-400' :
                  'bg-emerald-600',
                )} title={`${d.date.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}: ${d.count} حقن`} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-xs text-stone-400">
              <span>أقل</span>
              <span className="h-2.5 w-2.5 rounded-sm bg-stone-100" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
              <span>أكثر</span>
            </div>
          </div>
        );
      })()}

      {!activity.loading && activity.logs.length === 0 && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Syringe className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">رحلتك تبدأ الآن</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
            اختر ببتيد من المكتبة أو اسأل المدرب الذكي — وسنساعدك في بناء بروتوكولك الأول خطوة بخطوة.
          </p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/library" className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 sm:w-auto">
              <BookOpen className="h-4 w-4" /> تصفّح المكتبة
            </Link>
            <Link to="/coach" className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full border-2 border-emerald-300 px-6 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 sm:w-auto">
              <Bot className="h-4 w-4" /> اسأل المدرب الذكي
            </Link>
          </div>
          <p className="mt-4 text-xs text-stone-400">أو <Link to="/calculator" className="text-emerald-600 font-semibold hover:underline">جرّب حاسبة الجرعات المجانية</Link></p>
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-stone-900">الأدوات</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-all duration-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-600/10 hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                <link.Icon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-stone-900">{link.label}</p>
                <p className="text-xs text-stone-500">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Checklist — only show if not all done */}
      {visited.size < GETTING_STARTED.length ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">ابدأ هنا</h2>
          <p className="mb-4 text-sm text-stone-600">أكمل هذه الخطوات للاستفادة القصوى من pptides</p>
          <div className="space-y-3">
            {GETTING_STARTED.map((step, i) => {
              const done = visited.has(step.id);
              return (
                <Link
                  key={step.id}
                  to={step.to}
                  onClick={() => markVisited(step.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:shadow-sm",
                    done
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-emerald-100 bg-white transition-colors hover:border-emerald-300"
                  )}
                >
                  {done
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    : <Circle className="h-5 w-5 shrink-0 text-stone-300" />
                  }
                  <span className={cn("text-sm font-bold", done ? "text-emerald-700" : "text-stone-700")}>
                    {i + 1}. {step.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">خطوتك التالية</h2>
          <div className="space-y-3">
            {activity.activePeptides.length > 0 ? (
              <Link
                to="/tracker"
                className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-white px-4 py-3 transition-all hover:shadow-sm hover:border-emerald-400"
              >
                <Syringe className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-stone-900">سجّل حقنة اليوم</p>
                  <p className="text-xs text-stone-500">ببتيداتك النشطة: {activity.activePeptides.join(', ')}</p>
                </div>
              </Link>
            ) : (
              <Link
                to="/coach"
                className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-white px-4 py-3 transition-all hover:shadow-sm hover:border-emerald-400"
              >
                <Bot className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-stone-900">ابدأ استشارة مع المدرب الذكي</p>
                  <p className="text-xs text-stone-500">احصل على بروتوكول مخصّص لهدفك</p>
                </div>
              </Link>
            )}
            <Link
              to="/community"
              className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 transition-all hover:shadow-sm hover:border-emerald-300"
            >
              <TrendingUp className="h-5 w-5 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-bold text-stone-700">شارك تجربتك مع المجتمع</p>
                <p className="text-xs text-stone-500">ساعد غيرك بنتائجك الحقيقية</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
