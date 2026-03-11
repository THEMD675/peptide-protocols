import { Link } from 'react-router-dom';
import { Bot, TrendingUp, AlertTriangle, Lightbulb, Target, Microscope, Calendar, Heart, Zap, ArrowLeft } from 'lucide-react';
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

const insightBg: Record<ProactiveInsight['icon'], string> = {
  'trending-up': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  'alert-triangle': 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  'lightbulb': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  'target': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  'microscope': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  'calendar': 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  'heart': 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  'zap': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
};

const iconColors: Record<ProactiveInsight['icon'], string> = {
  'trending-up': 'text-emerald-600 dark:text-emerald-400',
  'alert-triangle': 'text-amber-600 dark:text-amber-400',
  'lightbulb': 'text-yellow-600 dark:text-yellow-400',
  'target': 'text-blue-600 dark:text-blue-400',
  'microscope': 'text-purple-600 dark:text-purple-400',
  'calendar': 'text-orange-600 dark:text-orange-400',
  'heart': 'text-pink-600 dark:text-pink-400',
  'zap': 'text-emerald-600 dark:text-emerald-400',
};

const actionLinks: Record<string, string> = {
  'سجّل الآن': '/tracker',
  'اسأل المدرب': '/coach',
  'استشر المدرب': '/coach',
  'دليل التحاليل': '/lab-guide',
};

interface Props {
  cards: ProactiveInsight[];
}

export default function DashboardCoachCards({ cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">من مدربك الذكي</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(card => {
          const Icon = insightIcons[card.icon];
          const linkTo = card.actionText ? (actionLinks[card.actionText] ?? '/coach') : '/coach';

          return (
            <Link
              key={card.id}
              to={linkTo}
              className={cn(
                'group flex items-start gap-3 rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5',
                insightBg[card.icon],
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-stone-900/50">
                <Icon className={cn('h-5 w-5', iconColors[card.icon])} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200 leading-relaxed">
                  {card.text}
                </p>
                {card.actionText && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                    {card.actionText}
                    <ArrowLeft className="h-3 w-3" />
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
