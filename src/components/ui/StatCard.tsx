import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  sub?: string;
  trend?: { value: number; positive?: boolean };
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, sub, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />}
      </div>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{sub}</p>}
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  );
}
