import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, PEPTIDE_COUNT } from '@/lib/constants';

const EXCLUDED_PATHS = ['/account', '/tracker', '/dashboard', '/coach', '/login', '/signup', '/pricing'];
const DISMISS_KEY = 'pptides_sticky_dismissed';

export default function StickyScrollCTA() {
  const { user, subscription } = useAuth();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const ts = sessionStorage.getItem(DISMISS_KEY);
      return ts ? Date.now() - Number(ts) < 30 * 60 * 1000 : false;
    } catch { return false; }
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      if (window.scrollY > 800) {
        clearTimeout(timer);
        timer = setTimeout(() => setVisible(true), 2000);
      } else {
        clearTimeout(timer);
        setVisible(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* expected */ }
  }, []);

  const cookieConsented = (() => { try { return !!localStorage.getItem('pptides_cookie_consent'); } catch { return false; } })();

  if (!visible || dismissed) return null;
  if (user && subscription?.isProOrTrial) return null;
  if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return null;
  if (!cookieConsented) return null;

  const href = user ? '/pricing' : '/signup?redirect=/pricing';
  const text = user ? `اشترك — ${PRICING.essentials.label}` : 'ابدأ مجانًا';

  return (
    <div role="complementary" aria-label="عرض الاشتراك" className="fixed bottom-0 inset-x-0 z-40 border-t border-emerald-200/50 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slide-up pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          onClick={handleDismiss}
          className="shrink-0 flex items-center justify-center rounded-full min-h-[44px] min-w-[44px] text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-900 line-clamp-1">{PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة</p>
          <p className="text-xs text-stone-600">3 أيام مجانًا — إلغاء في أي وقت</p>
        </div>
        <Link
          to={href}
          className="shrink-0 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
        >
          <span>{text}</span>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
