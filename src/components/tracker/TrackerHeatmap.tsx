import { MapPin, ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

type HeatmapView = 'weekly' | 'monthly';

interface CalendarData {
  dayNames: string[];
  monthName: string;
  isCurrentMonth: boolean;
  injectionDays: Map<number, number>;
  cells: React.ReactNode[];
}

interface HeatmapWeekly {
  weeks: { date: Date; count: number; key: string }[][];
  maxCount: number;
  view: 'weekly';
}

interface HeatmapMonthly {
  months: { year: number; month: number; days: { day: number; count: number }[] }[];
  maxCount: number;
  view: 'monthly';
}

type HeatmapData = HeatmapWeekly | HeatmapMonthly;

interface SiteRotationData {
  siteLabels: Record<string, string>;
  allSites: string[];
  siteCounts: Record<string, number>;
  lastSite: string;
  suggestedSite: string;
}

interface TrackerHeatmapProps {
  calendarData: CalendarData | null;
  calendarMonth: { year: number; month: number };
  setCalendarMonth: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
  heatmapData: HeatmapData | null;
  heatmapView: HeatmapView;
  setHeatmapView: (v: HeatmapView) => void;
  siteRotationData: SiteRotationData | null;
}

export default function TrackerHeatmap({
  calendarData,
  calendarMonth,
  setCalendarMonth,
  heatmapData,
  heatmapView,
  setHeatmapView,
  siteRotationData,
}: TrackerHeatmapProps) {
  return (
    <>
      {/* Monthly Calendar */}
      {calendarData && (
        <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarMonth(prev => { const m = prev.month - 1; return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m }; })} aria-label="الشهر السابق" className="flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 p-1.5 min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-300">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{calendarData.monthName}</h3>
              <span className="text-xs text-stone-500 dark:text-stone-400">{calendarData.injectionDays.size} يوم نشط</span>
            </div>
            <button onClick={() => { if (calendarData.isCurrentMonth) return; setCalendarMonth(prev => { const m = prev.month + 1; return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m }; }); }} disabled={calendarData.isCurrentMonth} aria-label="الشهر التالي" className={cn('flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 p-1.5 min-h-[44px] min-w-[44px] transition-colors', calendarData.isCurrentMonth ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-300')}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarData.dayNames.map(d => (
              <div key={d} className="text-xs font-bold text-stone-500 dark:text-stone-400 pb-1">{d}</div>
            ))}
            {calendarData.cells}
          </div>
        </div>
      )}

      {/* Injection Heatmap — GitHub-style */}
      {heatmapData && (
        <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900">خريطة النشاط</h3>
            <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-0.5">
              <button
                onClick={() => setHeatmapView('weekly')}
                className={cn('flex items-center gap-1 rounded-lg px-3 py-2 min-h-[44px] text-xs font-medium transition-all', heatmapView === 'weekly' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:text-stone-900')}
              >
                <CalendarDays className="h-3 w-3" />
                أسبوعي
              </button>
              <button
                onClick={() => setHeatmapView('monthly')}
                className={cn('flex items-center gap-1 rounded-lg px-3 py-2 min-h-[44px] text-xs font-medium transition-all', heatmapView === 'monthly' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:text-stone-900')}
              >
                <CalendarRange className="h-3 w-3" />
                شهري
              </button>
            </div>
          </div>
          {heatmapData.view === 'weekly' && 'weeks' in heatmapData && (
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-[400px]">
                {heatmapData.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day) => {
                      const intensity = day.count === 0 ? 0 : Math.min(Math.ceil((day.count / heatmapData.maxCount) * 4), 4);
                      const isToday = day.key === new Date().toISOString().slice(0, 10);
                      return (
                        <div
                          key={day.key}
                          title={`${day.key}: ${day.count} حقنة`}
                          className={cn(
                            'h-3 w-3 rounded-sm transition-colors',
                            isToday && 'ring-1 ring-emerald-400',
                            intensity === 0 && 'bg-stone-100 dark:bg-stone-800',
                            intensity === 1 && 'bg-emerald-200',
                            intensity === 2 && 'bg-emerald-400',
                            intensity === 3 && 'bg-emerald-500',
                            intensity === 4 && 'bg-emerald-700',
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-stone-500">
                <span>أقل</span>
                <div className="h-3 w-3 rounded-sm bg-stone-100 dark:bg-stone-800" />
                <div className="h-3 w-3 rounded-sm bg-emerald-200" />
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                <div className="h-3 w-3 rounded-sm bg-emerald-700" />
                <span>أكثر</span>
              </div>
            </div>
          )}
          {heatmapData.view === 'monthly' && 'months' in heatmapData && (
            <div className="space-y-4">
              {heatmapData.months.map((month) => (
                <div key={`${month.year}-${month.month}`}>
                  <p className="text-xs font-medium text-stone-500 mb-1.5">
                    {new Date(month.year, month.month).toLocaleDateString('ar-u-nu-latn', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {month.days.map((day) => {
                      const intensity = day.count === 0 ? 0 : Math.min(Math.ceil((day.count / heatmapData.maxCount) * 4), 4);
                      return (
                        <div
                          key={day.day}
                          title={`${day.day}: ${day.count} حقنة`}
                          className={cn(
                            'h-3.5 w-3.5 rounded-sm transition-colors',
                            intensity === 0 && 'bg-stone-100 dark:bg-stone-800',
                            intensity === 1 && 'bg-emerald-200',
                            intensity === 2 && 'bg-emerald-400',
                            intensity === 3 && 'bg-emerald-500',
                            intensity === 4 && 'bg-emerald-700',
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-stone-500">
                <span>أقل</span>
                <div className="h-3 w-3 rounded-sm bg-stone-100 dark:bg-stone-800" />
                <div className="h-3 w-3 rounded-sm bg-emerald-200" />
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                <div className="h-3 w-3 rounded-sm bg-emerald-700" />
                <span>أكثر</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Site Rotation Indicator */}
      {siteRotationData && (
        <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">تدوير مواقع الحقن</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
            {siteRotationData.allSites.map(s => {
              const count = siteRotationData.siteCounts[s] || 0;
              const isLast = s === siteRotationData.lastSite;
              const isSuggested = s === siteRotationData.suggestedSite;
              return (
                <div key={s} className={cn(
                  'rounded-xl border p-3 text-center transition-all',
                  isSuggested ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-100' :
                  isLast ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' :
                  'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900'
                )}>
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200">{siteRotationData.siteLabels[s]}</p>
                  <p className="text-lg font-black text-stone-900 dark:text-stone-100">{count}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {isSuggested ? 'الموقع التالي' : isLast ? 'آخر حقنة' : 'آخر 5'}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 text-center">
            الحقنة القادمة في <span className="font-bold text-emerald-700 dark:text-emerald-400">{siteRotationData.siteLabels[siteRotationData.suggestedSite]}</span> لتجنّب تلف الأنسجة
          </p>
        </div>
      )}
    </>
  );
}
