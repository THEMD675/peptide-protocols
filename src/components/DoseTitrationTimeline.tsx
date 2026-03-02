import { memo } from 'react';
import { cn } from '@/lib/utils';

interface TitrationStep {
  week: number;
  doseMcg: number;
}

interface DoseTitrationTimelineProps {
  schedule: TitrationStep[];
  currentWeek: number;
  unit?: string;
}

export default memo(function DoseTitrationTimeline({ schedule, currentWeek, unit = 'mcg' }: DoseTitrationTimelineProps) {
  if (schedule.length < 2) return null;

  const displayUnit = unit === 'mcg' && schedule[0].doseMcg >= 1000 ? 'mg' : unit;
  const formatDose = (mcg: number) => displayUnit === 'mg' ? `${mcg / 1000}` : `${mcg}`;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="mb-3 text-xs font-bold text-stone-700">جدول زيادة الجرعة</p>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {schedule.map((step, i) => {
          const isNext = i < schedule.length - 1 && schedule[i + 1];
          const nextWeek = isNext ? schedule[i + 1].week : Infinity;
          const isCurrent = currentWeek >= step.week && currentWeek < nextWeek;
          const isPast = currentWeek >= nextWeek;

          return (
            <div key={step.week} className="flex items-center gap-1">
              <div className={cn(
                'flex flex-col items-center rounded-lg px-3 py-2 text-center min-w-[60px] transition-all',
                isCurrent ? 'bg-emerald-100 border-2 border-emerald-400 ring-2 ring-emerald-100' :
                isPast ? 'bg-emerald-50 border border-emerald-200' :
                'bg-white border border-stone-200'
              )}>
                <span className={cn('text-[10px] font-bold', isCurrent ? 'text-emerald-700' : isPast ? 'text-emerald-600' : 'text-stone-500')}>
                  أ{step.week}
                </span>
                <span className={cn('text-sm font-black', isCurrent ? 'text-emerald-800' : isPast ? 'text-emerald-600' : 'text-stone-500')}>
                  {formatDose(step.doseMcg)}
                </span>
                <span className="text-[8px] text-stone-500">{displayUnit}</span>
              </div>
              {i < schedule.length - 1 && (
                <div className={cn('h-0.5 w-4 shrink-0', isPast ? 'bg-emerald-400' : 'bg-stone-300')} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-stone-500 text-center">أ = أسبوع</p>
    </div>
  );
});
