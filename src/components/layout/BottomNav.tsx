import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Syringe, BookOpen, MoreHorizontal,
  Bot, Calculator, FlaskConical, Layers, GitCompare, BookText, X,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/prefetch';

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة المعلومات' },
  { to: '/tracker', icon: Syringe, label: 'المتابعة' },
  { to: '/library', icon: BookOpen, label: 'المكتبة' },
] as const;

const moreItems = [
  { to: '/coach', icon: Bot, label: 'المدرب الذكي' },
  { to: '/calculator', icon: Calculator, label: 'حاسبة الجرعات' },
  { to: '/interactions', icon: FlaskConical, label: 'التعارضات' },
  { to: '/stacks', icon: Layers, label: 'التجميعات' },
  { to: '/compare', icon: GitCompare, label: 'المقارنة' },
  { to: '/blog', icon: FileText, label: 'المدونة' },
  { to: '/glossary', icon: BookText, label: 'المصطلحات' },
] as const;

export default memo(function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreItems.some(item => pathname.startsWith(item.to));

  const toggleMore = useCallback(() => {
    setMoreOpen(prev => !prev);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  if (!user) return null;

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* More menu popover */}
      {moreOpen && (
        <div
          ref={menuRef}
          className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 mx-2 mb-1 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl shadow-stone-900/20 animate-slide-up md:hidden"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">المزيد</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 p-3">
            {moreItems.map(({ to, icon: Icon, label }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  onTouchStart={() => prefetchRoute(to)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-700',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
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
                aria-label={label}
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

          {/* More button */}
          <button
            onClick={toggleMore}
            aria-expanded={moreOpen}
            aria-label="المزيد"
            className={cn(
              'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
              isMoreActive || moreOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-300 active:text-stone-600',
            )}
          >
            {isMoreActive && !moreOpen && (
              <span className="absolute top-1.5 h-1 w-8 rounded-full bg-emerald-600 dark:bg-emerald-500" aria-hidden="true" />
            )}
            <MoreHorizontal className={cn('h-5 w-5', isMoreActive && !moreOpen && 'mt-1')} />
            <span>المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
});
