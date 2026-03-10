import { lazy, Suspense } from 'react';
import {
  BarChart3,
  Flame,
  TrendingUp,
  Syringe,
  Clock,
} from 'lucide-react';

const ActivityChart = lazy(() => import('@/components/charts/ActivityChart'));
const DoseTrendChart = lazy(() => import('@/components/charts/DoseTrendChart'));

interface DashboardStats {
  totalInjections: number;
  uniquePeptides: number;
  streak: number;
  last7: number;
  timeSinceLabel: string;
}

interface MonthlySummary {
  totalInjections: number;
  mostUsedPeptide: string;
  mostUsedCount: number;
  avgDose: number;
  avgUnit: string;
  streak: number;
}

interface WeeklyActivity {
  days: string[];
  weekCounts: number[];
  max: number;
  todayIdx: number;
}

interface InjectionLog {
  id: string;
  peptide_name: string;
  dose: number;
  dose_unit: string;
  injection_site: string;
  logged_at: string;
  notes: string | null;
  photo_url?: string | null;
}

interface TrackerStatsProps {
  dashboardStats: DashboardStats | null;
  monthlySummary: MonthlySummary | null;
  weeklyActivity: WeeklyActivity | null;
  logs: InjectionLog[];
  allLogsForStats: InjectionLog[];
  useHijri: boolean;
}

const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function TrackerStats({
  dashboardStats,
  monthlySummary,
  weeklyActivity,
  logs,
  allLogsForStats,
  useHijri,
}: TrackerStatsProps) {
  return (
    <>
      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">📊 ملخص الشهر</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-700">{monthlySummary.totalInjections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">حقنة هذا الشهر</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-stone-900 dark:text-stone-100 truncate" dir="ltr">{monthlySummary.mostUsedPeptide}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">الأكثر استخدامًا ({monthlySummary.mostUsedCount}×)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-600">{monthlySummary.avgDose}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">متوسط الجرعة ({monthlySummary.avgUnit})</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-orange-500">🔥 {monthlySummary.streak}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">أيام متتالية</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      {dashboardStats && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <BarChart3 className="mx-auto mb-1 h-5 w-5 text-emerald-700" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.totalInjections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">إجمالي الحقن</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.streak}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.last7}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">آخر 7 أيام</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-purple-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.uniquePeptides}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">ببتيدات مختلفة</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center shadow-sm dark:shadow-stone-900/30 col-span-2 sm:col-span-1">
              <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-700" />
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{dashboardStats.timeSinceLabel}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">آخر حقنة</p>
            </div>
          </div>
          {/* Active days stat */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center">
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{new Set((allLogsForStats.length > 0 ? allLogsForStats : logs).map(l => new Date(l.logged_at).toDateString())).size}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">يوم نشط</p>
            </div>
          </div>
        </>
      )}

      {/* Weekly Activity Chart */}
      {weeklyActivity && (
        <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
          <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">نشاط الأسبوع</h3>
          <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />}>
            <ActivityChart data={weeklyActivity.days.map((day, i) => ({ day: day.slice(0, 3), count: weeklyActivity.weekCounts[i], isToday: i === weeklyActivity.todayIdx }))} />
          </Suspense>
        </div>
      )}

      {/* Dose Trend Chart */}
      {logs.length >= 3 && (() => {
        const trendPeptide = logs[0]?.peptide_name;
        const trendLogs = logs.filter(l => l.peptide_name === trendPeptide);
        const trendData = [...trendLogs].reverse().slice(-14).map(l => ({
          date: useHijri ? hijriFormatter.format(new Date(l.logged_at)) : new Date(l.logged_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' }),
          dose: l.dose,
        }));
        return (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
            <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">تاريخ جرعات {trendPeptide}</h3>
            <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />}>
              <DoseTrendChart data={trendData} unit={trendLogs[0]?.dose_unit ?? 'mcg'} />
            </Suspense>
          </div>
        );
      })()}
    </>
  );
}
