import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  trial: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  expired: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300',
  cancelled: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300',
  past_due: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  none: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300',
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  replied: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_AR: Record<string, string> = {
  active: 'نشط', trial: 'تجريبي', expired: 'منتهي', cancelled: 'ملغي',
  past_due: 'متأخر', none: 'بدون', pending: 'معلق', replied: 'تم الرد',
  sent: 'مرسل', failed: 'فشل', succeeded: 'ناجح',
  severe: 'شديد', moderate: 'متوسط', mild: 'خفيف', google: 'جوجل',
};

interface BadgeProps {
  status: string;
  className?: string;
}

export default function Badge({ status, className }: BadgeProps) {
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[status] ?? STATUS_COLORS.none, className)}>
      {STATUS_AR[status] ?? status}
    </span>
  );
}

export { STATUS_AR, STATUS_COLORS };
