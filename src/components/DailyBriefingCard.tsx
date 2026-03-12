import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyBriefing } from '@/hooks/useProactiveCoach';

const moodConfig = {
  positive: {
    border: 'border-emerald-200 dark:border-emerald-800',
    bg: 'bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/20 dark:to-stone-900',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    badgeText: 'حالتك ممتازة',
  },
  neutral: {
    border: 'border-stone-200 dark:border-stone-700',
    bg: 'bg-gradient-to-b from-stone-50 to-white dark:from-stone-800/30 dark:to-stone-900',
    icon: Bot,
    iconColor: 'text-emerald-600',
    badge: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300',
    badgeText: 'تحديث يومي',
  },
  alert: {
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-stone-900',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    badgeText: 'يحتاج انتباهك',
  },
};

interface Props {
  briefing: DailyBriefing;
  onObservationClick: (text: string) => void;
}

export default function DailyBriefingCard({ briefing, onObservationClick }: Props) {
  const [expanded, setExpanded] = useState(true);
  const config = moodConfig[briefing.mood];
  const MoodIcon = config.icon;

  return (
    <div className={cn('rounded-2xl border p-5 transition-all', config.border, config.bg)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <MoodIcon className={cn('h-5 w-5', config.iconColor)} />
          </div>
          <div>
            <p className="text-base font-bold text-stone-900 dark:text-stone-100">{briefing.greeting}</p>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', config.badge)}>
              <Sparkles className="h-3 w-3" />
              {config.badgeText}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-1.5 min-h-[44px] min-w-[44px] text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
          aria-label={expanded ? 'طي' : 'توسيع'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Observations */}
      {expanded && (
        <div className="space-y-2 animate-fade-in">
          {briefing.observations.map((obs, i) => (
            <button
              key={i}
              onClick={() => onObservationClick(obs)}
              className="group flex w-full items-start gap-2.5 rounded-xl border border-stone-100 dark:border-stone-700 bg-white/80 dark:bg-stone-800/50 px-4 py-3 text-start transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {obs}
              </span>
            </button>
          ))}
          <p className="text-xs text-stone-400 dark:text-stone-300 text-center mt-2">
            اضغط على أي ملاحظة لمناقشتها مع المدرب
          </p>
        </div>
      )}
    </div>
  );
}
