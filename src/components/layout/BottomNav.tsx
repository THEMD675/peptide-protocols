import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Syringe, BookOpen, Bot, FlaskConical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/prefetch';

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة المعلومات' },
  { to: '/tracker', icon: Syringe, label: 'المتابعة' },
  { to: '/library', icon: BookOpen, label: 'المكتبة' },
  { to: '/interactions', icon: FlaskConical, label: 'التعارضات' },
  { to: '/coach', icon: Bot, label: 'المدرب' },
] as const;

export default memo(function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;

  return (
    <nav
      aria-label="التنقل السريع"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex items-stretch">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              onTouchStart={() => prefetchRoute(to)}
              onMouseEnter={() => prefetchRoute(to)}
              className={cn(
                'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-300 active:text-stone-600',
              )}
            >
              {active && (
                <span className="absolute top-1.5 h-1 w-8 rounded-full bg-emerald-600 dark:bg-emerald-500" aria-hidden="true" />
              )}
              <Icon className={cn('h-5 w-5', active && 'mt-1')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
