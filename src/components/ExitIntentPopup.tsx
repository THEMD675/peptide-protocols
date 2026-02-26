import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Gift, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PEPTIDE_COUNT } from '@/lib/constants';

const STORAGE_KEY = 'exit_popup_shown';

export default function ExitIntentPopup() {
  const { user, subscription } = useAuth();
  const [visible, setVisible] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY > 10) return;
    try {
      if (localStorage.getItem('age_verified') !== 'true') return;
      const lastShown = localStorage.getItem(STORAGE_KEY);
      if (lastShown && Date.now() - Number(lastShown) < 7 * 24 * 60 * 60 * 1000) return;
    } catch {}
    if (user && subscription?.isProOrTrial) return;
    setVisible(true);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
  }, [user, subscription]);

  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 left-4 rounded-full p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Gift className="h-8 w-8 text-emerald-600" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-stone-900">
          لحظة — لا تفوّت الفرصة
        </h2>
        <p className="mb-1 text-stone-700">
          {PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة، حاسبة جرعات، ومدرب ذكي
        </p>
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-3xl font-black text-emerald-600">3 أيام</span>
          <span className="text-stone-500">تجربة مجانية</span>
        </div>

        <Link
          to={user ? '/pricing' : '/signup'}
          onClick={() => setVisible(false)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>ابدأ تجربتك المجانية</span>
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          onClick={() => setVisible(false)}
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          لا شكرًا
        </button>
      </div>
    </div>
  );
}
