import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { X, Gift, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { arPlural } from '@/lib/utils';
import { PEPTIDE_COUNT, TRIAL_DAYS } from '@/lib/constants';

const EXCLUDED_PATHS = ['/login', '/signup', '/pricing', '/account'];

const STORAGE_KEY = 'pptides_exit_popup_shown';

export default function ExitIntentPopup() {
  const { user, subscription } = useAuth();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  const canShow = useCallback(() => {
    try {
      if (localStorage.getItem('pptides_age_verified') !== 'true') return false;
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const ts = Number(lastShown);
      if (!isNaN(ts) && Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return false;
    } catch { return false; }
    if (user && subscription?.isProOrTrial) return false;
    if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return false;
    return true;
  }, [user, subscription, pathname]);

  const show = useCallback(() => {
    if (!canShow()) return;
    setVisible(true);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* expected */ }
  }, [canShow]);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY > 10) return;
    show();
  }, [show]);

  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave]);

  // Mobile: trigger on visibility change (tab switch / app switch) after 30s on page
  useEffect(() => {
    let listenerAdded = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') show();
    };
    const timer = setTimeout(() => {
      document.addEventListener('visibilitychange', onVisibilityChange);
      listenerAdded = true;
    }, 30_000);
    return () => {
      clearTimeout(timer);
      if (listenerAdded) document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="exit-popup-title" className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setVisible(false); }}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-stone-950 p-8 shadow-2xl text-center">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 end-4 flex items-center justify-center rounded-full min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-400 hover:text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Gift className="h-8 w-8 text-emerald-700" />
        </div>

        <h2 id="exit-popup-title" className="mb-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
          {subscription?.isTrial ? 'تجربتك تنتهي قريبًا' : 'لحظة — لا تفوّت الفرصة'}
        </h2>
        <p className="mb-1 text-stone-700 dark:text-stone-300">
          {subscription?.isTrial
            ? `تبقى ${subscription.trialDaysLeft} ${arPlural(subscription.trialDaysLeft, 'يوم واحد', 'يومان', 'أيام')} — اشترك الآن ولا تخسر وصولك`
            : `${PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة، حاسبة جرعات، ومدرب ذكي`
          }
        </p>
        <div className="mb-4 flex items-center justify-center gap-2">
          {subscription?.isTrial ? (
            <>
              <span className="text-3xl font-black text-amber-600">{subscription.trialDaysLeft}</span>
              <span className="text-stone-500 dark:text-stone-400">{arPlural(subscription.trialDaysLeft, 'يوم متبقي', 'يومان متبقيان', 'أيام متبقية')}</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-black text-emerald-700">{TRIAL_DAYS} أيام</span>
              <span className="text-stone-500 dark:text-stone-400">تجربة مجانية</span>
            </>
          )}
        </div>

        <Link
          to={user ? '/pricing' : '/signup?redirect=/pricing'}
          onClick={() => setVisible(false)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>{subscription?.isTrial ? 'اشترك الآن' : 'ابدأ تجربتك المجانية'}</span>
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          onClick={() => setVisible(false)}
          className="rounded-full border border-stone-200 dark:border-stone-700 px-5 py-2 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:border-stone-700 transition-colors"
        >
          لا شكرًا
        </button>
      </div>
      </FocusTrap>
    </div>
  );
}
