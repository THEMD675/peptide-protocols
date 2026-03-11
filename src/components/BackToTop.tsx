import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const HIDDEN_PATHS = ['/pricing', '/login', '/signup', '/coach', '/dashboard', '/account', '/tracker'];

export default function BackToTop() {
  const { pathname } = useLocation();
  const { user, subscription } = useAuth();
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  // Offset bottom when StickyScrollCTA may be visible (non-subscriber, non-excluded path)
  // StickyScrollCTA is shown for non-subscribers; BottomNav is shown for all logged-in users
  const stickyCtaActive = !(user && subscription?.isProOrTrial);
  const hasBottomNav = !!user;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const scrollingUp = y < lastScrollY.current - 50;
      const farEnough = y > 600;

      if (scrollingUp && farEnough) {
        setVisible(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 3000);
      } else if (y < 100) {
        setVisible(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;
  if (pathname === '/') return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="العودة للأعلى"
      aria-label="العودة للأعلى"
      tabIndex={visible ? 0 : -1}
      className={cn(
        'print:hidden fixed end-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900/90 text-stone-500 dark:text-stone-300 shadow-sm dark:shadow-stone-900/30 backdrop-blur-sm transition-all duration-300 hover:border-stone-300 dark:border-stone-600 hover:text-stone-700 dark:text-stone-200 hover:shadow-md btn-press md:end-6',
        // Mobile: clear BottomNav (56px) when logged in; clear StickyScrollCTA when shown
        // Desktop (md+): BottomNav is hidden, use bottom-6 always
        stickyCtaActive
          ? 'bottom-16 md:bottom-6'            // non-subscriber: above StickyScrollCTA; BottomNav=56px so 64px clears it
          : hasBottomNav
            ? 'bottom-[4.5rem] md:bottom-6'    // pro/trial: clear BottomNav (56px) → 72px; desktop normal
            : 'bottom-6',                       // guest: no BottomNav, no StickyScrollCTA
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
