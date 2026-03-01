import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIDDEN_PATHS = ['/pricing', '/login', '/signup', '/coach', '/dashboard', '/account', '/tracker'];

export default function BackToTop() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

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
      className={cn(
        'print:hidden fixed bottom-6 end-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-500 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-stone-300 hover:text-stone-700 hover:shadow-md active:scale-95 md:end-6',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
