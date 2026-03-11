import { memo } from 'react';

interface AdherenceBarProps {
  scheduled: number;
  actual: number;
}

export default memo(function AdherenceBar({ scheduled, actual }: AdherenceBarProps) {
  const percent = scheduled > 0 ? Math.min(Math.round((actual / scheduled) * 100), 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-stone-700 dark:text-stone-200">الالتزام</span>
        <span className="font-black text-emerald-700">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`الالتزام ${percent}%`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: percent >= 80 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <p className="text-[10px] text-stone-500 dark:text-stone-300">{scheduled === 0 ? 'بروتوكول جديد — سجّل جرعتك الأولى' : `${actual} من ${scheduled} جرعة`}</p>
    </div>
  );
});
