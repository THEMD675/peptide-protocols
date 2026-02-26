import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Bot,
  FlaskConical,
  Layers,
  Table2,
  Crown,
  CheckCircle2,
  Circle,
  Syringe,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PEPTIDE_COUNT } from '@/lib/constants';

const QUICK_LINKS = [
  { to: '/library', label: 'المكتبة', description: `تصفّح ${PEPTIDE_COUNT}+ ببتيد`, Icon: BookOpen },
  { to: '/calculator', label: 'الحاسبة', description: 'احسب جرعتك بدقة', Icon: Calculator },
  { to: '/coach', label: 'المدرب الذكي', description: 'اسأل خبير الببتيدات', Icon: Bot },
  { to: '/lab-guide', label: 'دليل التحاليل', description: '11 تحليل أساسي', Icon: FlaskConical },
  { to: '/stacks', label: 'البروتوكولات', description: 'خلطات مُجرَّبة', Icon: Layers },
  { to: '/table', label: 'الجدول المرجعي', description: 'جميع الببتيدات في جدول', Icon: Table2 },
];

const GETTING_STARTED = [
  { id: 'library', label: 'تصفّح مكتبة الببتيدات', to: '/library' },
  { id: 'calculator', label: 'جرّب حاسبة الجرعات', to: '/calculator' },
  { id: 'coach', label: 'اسأل المدرب الذكي', to: '/coach' },
];

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

function useVisitedPages() {
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pptides_visited');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem('pptides_visited', JSON.stringify([...visited])); } catch {}
  }, [visited]);

  const markVisited = (id: string) => setVisited(prev => new Set(prev).add(id));
  return { visited, markVisited };
}

interface RecentLog {
  id: string;
  peptide_name: string;
  dose: number;
  unit: string;
  injected_at: string;
}

interface TodayItem { peptide: string; dose: number; unit: string; done: boolean }

function useRecentActivity(userId: string | undefined) {
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase
      .from('injection_logs')
      .select('id, peptide_name, dose, unit, injected_at')
      .eq('user_id', userId)
      .order('injected_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (data && !error) setLogs(data);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  const activePeptides = [...new Set(logs.map(l => l.peptide_name))];
  const totalInjections = logs.length;

  let streak = 0;
  if (logs.length > 0) {
    const daySet = new Set(logs.map(l => new Date(l.injected_at).toDateString()));
    const d = new Date();
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  }

  const todayPlan: TodayItem[] = [];
  if (logs.length >= 3) {
    const today = new Date().toDateString();
    const peptideFreq: Record<string, { dose: number; unit: string; daysUsed: Set<string>; total: number }> = {};
    logs.forEach(l => {
      if (!peptideFreq[l.peptide_name]) peptideFreq[l.peptide_name] = { dose: l.dose, unit: l.unit, daysUsed: new Set(), total: 0 };
      peptideFreq[l.peptide_name].daysUsed.add(new Date(l.injected_at).toDateString());
      peptideFreq[l.peptide_name].total++;
    });
    const todayDone = new Set(logs.filter(l => new Date(l.injected_at).toDateString() === today).map(l => l.peptide_name));
    for (const [name, info] of Object.entries(peptideFreq)) {
      if (info.total >= 2) {
        todayPlan.push({ peptide: name, dose: info.dose, unit: info.unit, done: todayDone.has(name) });
      }
    }
  }

  return { logs: logs.slice(0, 5), loading, activePeptides, totalInjections, streak, todayPlan };
}

export default function Dashboard() {
  const { user, subscription } = useAuth();
  const { visited, markVisited } = useVisitedPages();
  const activity = useRecentActivity(user?.id);

  if (!user) return null;

  const displayName = user.email?.split('@')[0] ?? 'مستخدم';

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
      <Helmet>
        <title>لوحة التحكم — pptides | Dashboard</title>
        <meta name="description" content="لوحة التحكم الرئيسية لإدارة حسابك في pptides. Your pptides dashboard." />
      </Helmet>

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
        <div className="flex flex-wrap items-center gap-4">
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
            subscription.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : subscription.status === 'trial'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-200 text-stone-600',
          )}>
            {STATUS_LABELS[subscription.status] ?? subscription.status}
          </span>
          {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
            <span className="text-sm text-amber-600 font-bold">
              {arPlural(subscription.trialDaysLeft, 'يوم واحد متبقي', 'يومان متبقيان', 'أيام متبقية')}
            </span>
          )}
        </div>
        {subscription.tier !== 'elite' && (
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            ترقية الاشتراك
          </Link>
        )}
      </div>

      {/* Today's Protocol */}
      {!activity.loading && activity.todayPlan.length > 0 && (
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
                    <p className="text-xs text-stone-500">{item.dose} {item.unit}</p>
                  </div>
                </div>
                {!item.done && (
                  <Link
                    to={`/tracker?peptide=${encodeURIComponent(item.peptide)}`}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
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
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900">{activity.streak}</p>
              <p className="text-xs text-stone-500">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-black text-stone-900">{activity.activePeptides.length}</p>
              <p className="text-xs text-stone-500">ببتيدات نشطة</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
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
                    <span className="mr-2 text-xs text-stone-500">{log.dose} {log.unit}</span>
                  </div>
                  <span className="text-xs text-stone-400">
                    {new Date(log.injected_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}
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
          const count = activity.logs.filter(l => new Date(l.injected_at).toDateString() === ds).length;
          days.push({ date: d, count });
        }

        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900">آخر 30 يوم</h3>
              <span className="text-xs text-stone-500">{days.filter(d => d.count > 0).length} يوم نشط</span>
            </div>
            <div className="grid grid-cols-10 gap-1">
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
            <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-stone-400">
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
        <div className="mb-8 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
          <Syringe className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
          <p className="font-bold text-stone-900">ابدأ بتسجيل أول حقنة</p>
          <p className="mt-1 text-sm text-stone-600">تتبّع جرعاتك ومواقع الحقن وشاهد تقدّمك</p>
          <Link to="/tracker" className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            <Syringe className="h-4 w-4" /> سجل الحقن
          </Link>
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
                      : "border-emerald-100 bg-white hover:border-emerald-300"
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
    </main>
  );
}
