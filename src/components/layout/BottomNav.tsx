import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Syringe, BookOpen, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة المعلومات' },
  { to: '/tracker', icon: Syringe, label: 'المتابعة' },
  { to: '/library', icon: BookOpen, label: 'المكتبة' },
  { to: '/coach', icon: Bot, label: 'المدرب' },
] as const;

export default memo(function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;

  return (
    <nav
      aria-label="التنقل السريع"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex items-stretch">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
                active ? 'text-emerald-600' : 'text-stone-500 dark:text-stone-400 active:text-stone-600 dark:text-stone-400',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
