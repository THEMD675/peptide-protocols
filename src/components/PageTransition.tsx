import { useLocation } from 'react-router-dom';
import { useRef, useEffect, type ReactNode } from 'react';

export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('animate-page-enter');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('animate-page-enter');
  }, [pathname]);

  return (
    <div ref={ref} className="animate-page-enter">
      {children}
    </div>
  );
}
