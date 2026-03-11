import { useState } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target, Microscope, Calendar, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProactiveInsight } from '@/hooks/useProactiveCoach';

const insightIcons: Record<ProactiveInsight['icon'], React.ElementType> = {
  'trending-up': TrendingUp,
  'alert-triangle': AlertTriangle,
  'lightbulb': Lightbulb,
  'target': Target,
  'microscope': Microscope,
  'calendar': Calendar,
  'heart': Heart,
  'zap': Zap,
};

const insightIconColors: Record<ProactiveInsight['icon'], string> = {
  'trending-up': 'text-emerald-600 dark:text-emerald-400',
  'alert-triangle': 'text-amber-600 dark:text-amber-400',
  'lightbulb': 'text-yellow-600 dark:text-yellow-400',
  'target': 'text-blue-600 dark:text-blue-400',
  'microscope': 'text-purple-600 dark:text-purple-400',
  'calendar': 'text-orange-600 dark:text-orange-400',
  'heart': 'text-pink-600 dark:text-pink-400',
  'zap': 'text-emerald-600 dark:text-emerald-400',
};

interface Props {
  insights: ProactiveInsight[];
  onInsightClick: (text: string) => void;
}

export default function CoachInsightsBanner({ insights, onInsightClick }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = insights.filter(i => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <span className="text-xs font-bold text-stone-600 dark:text-stone-300">رؤى استباقية من مدربك</span>
      </div>
      {visible.map(insight => (
        <button
          key={insight.id}
          onClick={() => onInsightClick(insight.text)}
          className={cn(
            'group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-start transition-all hover:shadow-sm',
            insight.icon === 'alert-triangle'
              ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : insight.icon === 'trending-up' || insight.icon === 'zap'
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
              : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-50 dark:hover:bg-stone-800/50',
          )}
        >
          {(() => { const Icon = insightIcons[insight.icon]; return <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', insightIconColors[insight.icon])} />; })()}
          <span className="flex-1 text-sm font-medium text-stone-700 dark:text-stone-200 leading-relaxed">
            {insight.text}
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="إخفاء"
            onClick={e => { e.stopPropagation(); setDismissed(prev => new Set(prev).add(insight.id)); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setDismissed(prev => new Set(prev).add(insight.id)); } }}
            className="mt-0.5 shrink-0 rounded-full p-1 text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-stone-700"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
    </div>
  );
}
