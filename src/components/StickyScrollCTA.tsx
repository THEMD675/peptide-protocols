import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { peptides } from '@/data/peptides';

const EXCLUDED_PATHS = ['/account', '/tracker', '/dashboard', '/coach', '/login', '/signup', '/pricing'];

export default function StickyScrollCTA() {
  const { user, subscription } = useAuth();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  if (user && subscription?.isProOrTrial) return null;
  if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return null;

  const href = user ? '/pricing' : '/signup';
  const text = user ? 'اشترك الآن — $9/شهر' : 'ابدأ تجربتك المجانية';

  return (
    <div className="fixed bottom-[60px] inset-x-0 z-40 border-t border-emerald-200/50 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden animate-fade-up">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-900 truncate">{peptides.length}+ ببتيد مع بروتوكولات كاملة</p>
          <p className="text-xs text-stone-500">3 أيام مجانًا — إلغاء في أي وقت</p>
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
