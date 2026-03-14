import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const FocusTrap = lazy(() => import('focus-trap-react'));
import { useAuth } from '@/contexts/AuthContext';
import { useSalesFlow } from '@/hooks/useSalesFlow';
import { supabase } from '@/lib/supabase';
import { Shield, X, Clock, Loader2 } from 'lucide-react';
import { cn, arPlural } from '@/lib/utils';
import { PRICING, FREE_PEPTIDE_IDS, isFreeRoute, isPaymentWallFreeRoute } from '@/lib/constants';
import { useNowMs } from '@/hooks/useNowMs';
import { TRIAL, RETENTION, UPGRADE, COMMON } from '@/constants/sales-copy';

const DISMISS_KEY = 'pptides_trial_banner_dismissed';

// Excluded: /dashboard, /tracker, /coach — premium routes; blocking modal must trigger for expired
// /peptide handled separately via isPeptideFree (FREE_PEPTIDE_IDS). Free routes from constants.ts (single source of truth).

export default function TrialBanner() {
  const navigate = useNavigate();
  const { user, subscription, isLoading, upgradeTo } = useAuth();
  const { offer } = useSalesFlow();
  const { pathname } = useLocation();
  const nowMs = useNowMs();
  const [dismissed, setDismissed] = useState(() => { try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } });
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [userStats, setUserStats] = useState<{ injections: number; protocols: number } | null>(null);

  useEffect(() => {
    const showExpiredModal = subscription?.status === 'expired' || subscription?.status === 'cancelled' || (subscription?.status === 'trial' && (subscription?.trialDaysLeft ?? 0) <= 0);
    if (!user || !showExpiredModal) return;
    Promise.all([
      supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_protocols').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([logs, protocols]) => {
      const inj = (logs as { count?: number | null }).count ?? 0;
      const prot = (protocols as { count?: number | null }).count ?? 0;
      setUserStats({ injections: inj, protocols: prot });
    }).catch(() => {});
  }, [user, subscription?.status]);

  const handleUpgrade = async (coupon?: string) => {
    if (upgradeLoading) return;
    setUpgradeLoading(true);
    try {
      await upgradeTo('essentials', 'monthly', coupon);
    } catch {
      setUpgradeLoading(false);
    }
  };

  const peptideId = pathname.startsWith('/peptide/') ? pathname.split('/')[2] : null;
  const isPeptideFree = peptideId ? FREE_PEPTIDE_IDS.has(peptideId) : false;
  const isFreePage = isFreeRoute(pathname) || isPeptideFree;

  const needsSubscription = !isLoading && user && subscription &&
    !subscription.isProOrTrial;

  const showsBlockingModal = needsSubscription && !isFreePage;

  useEffect(() => {
    if (!showsBlockingModal) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [showsBlockingModal]);

  if (isLoading) return null;
  if (!user || !subscription) return null;
  if (subscription.status === 'active') return null;

  // Payment wall: trial user who hasn't entered a credit card yet
  if (subscription.needsPaymentSetup) {
    const isPaymentWallFreePage = isPaymentWallFreeRoute(pathname);

    if (isPaymentWallFreePage) {
      // Show a prominent banner on allowed pages
      return (
        <div className="sticky top-[var(--header-height)] z-40 bg-amber-500 text-center py-2.5 px-4">
          <p className="text-sm font-semibold text-white">
            {TRIAL.paymentWallBanner}
            <span className="mx-2">—</span>
            <button
              type="button"
              onClick={() => handleUpgrade()}
              disabled={upgradeLoading}
              className="font-bold underline underline-offset-2 bg-white/20 rounded px-2 py-0.5 hover:bg-white/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {COMMON.completeSetup}
            </button>
          </p>
        </div>
      );
    }

    // Block access to all other pages — show a setup modal
    return (
      <div role="dialog" aria-modal="true" aria-describedby="payment-wall-desc" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <Suspense fallback={null}><FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-10 text-center shadow-2xl" aria-labelledby="payment-wall-title">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-700" />
          <h2 id="payment-wall-title" className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {TRIAL.paymentWallTitle}
          </h2>
          <p id="payment-wall-desc" className="mb-2 text-stone-700 dark:text-stone-200">
            {TRIAL.paymentWallDesc}
          </p>
          <p className="mb-6 text-sm text-stone-500 dark:text-stone-300">
            {TRIAL.paymentWallFinePrint}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleUpgrade()}
              disabled={upgradeLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {upgradeLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {TRIAL.paymentWallCta}
            </button>
          </div>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            className="mt-4 min-h-[44px] px-3 py-2 text-sm text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors"
          >
            رجوع
          </button>
        </div>
        </FocusTrap></Suspense>
      </div>
    );
  }

  if (subscription.status === 'cancelled' && subscription.isPaidSubscriber) {
    return (
      <div className="sticky top-[var(--header-height)] z-40 bg-amber-500 text-center py-2 px-4">
        <p className="text-sm font-semibold text-white">
          {RETENTION.cancelledBanner}{' '}
          <button
            type="button"
            onClick={() => handleUpgrade(offer.coupon)}
            disabled={upgradeLoading}
            className="underline underline-offset-2 hover:opacity-80 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {RETENTION.resubscribeCta}
          </button>
        </p>
      </div>
    );
  }

  // past_due MUST be checked before the generic isPaidSubscriber guard below,
  // because buildSubscription sets isPaidSubscriber=true for past_due users.
  // Without this order, the payment-warning banner is never rendered.
  if (subscription.status === 'past_due') {
    let daysLeftText = '';
    if (subscription.currentPeriodEnd) {
      const graceEnd = new Date(subscription.currentPeriodEnd).getTime() + 7 * 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(0, Math.ceil((graceEnd - nowMs) / (1000 * 60 * 60 * 24)));
      if (daysLeft > 0) {
        daysLeftText = UPGRADE.pastDueDaysLeft(daysLeft);
      }
    }
    return (
      <div className="sticky top-[var(--header-height)] z-40 bg-amber-600 text-center py-2 px-4">
        <p className="text-sm font-semibold text-white">
          {UPGRADE.pastDueBanner}{daysLeftText} يرجى تحديث وسيلة الدفع لتجنّب فقدان الوصول.{' '}
          <Link to="/account" className="underline underline-offset-2 hover:opacity-80">{UPGRADE.pastDueUpdateCta}</Link>
        </p>
      </div>
    );
  }

  // Safety net: active subscribers with no special banner state (e.g. active status already
  // returned null above; cancelledButActive is caught by the cancelled+isPaidSubscriber block).
  if (subscription.isPaidSubscriber) return null;

  if (subscription.status === 'cancelled' && !subscription.isPaidSubscriber) {
    if (isFreePage) {
      return (
        <div className="sticky top-[var(--header-height)] z-40 bg-amber-600 text-center py-2.5 px-4">
          <p className="text-sm font-semibold text-white">
            {RETENTION.cancelledBannerNoAccess} —{' '}
            <button
              type="button"
              onClick={() => handleUpgrade(offer.coupon)}
              disabled={upgradeLoading}
              className="underline underline-offset-2 hover:opacity-80 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {RETENTION.resubscribeCta}
            </button>
            {offer.discountPercent != null ? (
              <span className="me-2 ms-1 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                خصم {offer.discountPercent}% — عرض خاص
              </span>
            ) : null}
          </p>
        </div>
      );
    }
  }

  if (
    subscription.status === 'expired' ||
    subscription.status === 'cancelled' ||
    (subscription.status === 'trial' && subscription.trialDaysLeft <= 0)
  ) {
    const isTrial = subscription.status === 'trial' || (subscription.status === 'expired' && subscription.tier === 'free');
    const bannerText = isTrial ? TRIAL.expiredBannerTrial : TRIAL.expiredBannerPaid;
    const modalTitle = isTrial ? TRIAL.expiredModalTitleTrial : TRIAL.expiredModalTitlePaid;

    if (isFreePage) {
      return (
        <div className="sticky top-[var(--header-height)] z-40 bg-red-600 text-center py-2.5 px-4">
          <p className="text-sm font-semibold text-white">
            {bannerText}
            <span className="mx-2">—</span>
            <button
              type="button"
              onClick={() => handleUpgrade(offer.coupon)}
              disabled={upgradeLoading}
              className="underline underline-offset-2 hover:opacity-80 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              اشترك الآن
            </button>
            {offer.discountPercent != null ? (
              <span className="me-2 ms-1 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                خصم {offer.discountPercent}% — عرض خاص
              </span>
            ) : null}
          </p>
        </div>
      );
    }

    return (
      <div role="dialog" aria-modal="true" aria-describedby="sub-modal-desc-expired" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <Suspense fallback={null}><FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-10 text-center shadow-2xl" aria-labelledby="trial-modal-title">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-700" />
          <h2 id="trial-modal-title" className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {modalTitle}
          </h2>
          {offer.discountPercent != null ? (
            <p className="mb-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-4 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
              خصم {offer.discountPercent}% — عرض خاص
            </p>
          ) : null}
          <p id="sub-modal-desc-expired" className="mb-4 text-stone-700 dark:text-stone-200">
            {TRIAL.expiredModalBody}
          </p>
          {userStats && (userStats.injections > 0 || userStats.protocols > 0) && (
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-2">
              لديك {userStats.injections > 0 ? `${userStats.injections} حقنة مسجّلة` : ''}
              {userStats.injections > 0 && userStats.protocols > 0 ? ' و' : ''}
              {userStats.protocols > 0 ? `${userStats.protocols} بروتوكول نشط` : ''}
              {' — اشترك للحفاظ على بياناتك'}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleUpgrade(offer.coupon)}
              disabled={upgradeLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {upgradeLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              اشترك — {PRICING.essentials.label}/شهريًا
            </button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-stone-500 dark:text-stone-300">أو تصفّح المجاني:</span>
            <Link to="/library" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المكتبة</Link>
            <Link to="/calculator" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">الحاسبة</Link>
            <Link to="/interactions" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">فحص التعارضات</Link>
            <Link to="/glossary" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المصطلحات</Link>
            <Link to="/sources" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المصادر</Link>
            <Link to="/community" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">التقييمات</Link>
          </div>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            className="mt-4 min-h-[44px] px-3 py-2 text-sm text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors"
          >
            رجوع
          </button>
        </div>
        </FocusTrap></Suspense>
      </div>
    );
  }

  if (subscription.status === 'none') {
    if (isFreePage) return null;
    return (
      <div role="dialog" aria-modal="true" aria-describedby="sub-modal-desc-none" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <Suspense fallback={null}><FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-10 text-center shadow-2xl" aria-labelledby="sub-modal-title">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-700" />
          <h2 id="sub-modal-title" className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {UPGRADE.subscribersOnlyTitle}
          </h2>
          <p id="sub-modal-desc-none" className="mb-4 text-stone-700 dark:text-stone-200">
            {UPGRADE.subscribersOnlyBody}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="inline-block rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98]"
            >
              {TRIAL.startTrialCta}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-stone-500 dark:text-stone-300">أو تصفّح المجاني:</span>
            <Link to="/calculator" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">الحاسبة</Link>
            <Link to="/library" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المكتبة</Link>
            <Link to="/glossary" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المصطلحات</Link>
          </div>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            className="mt-4 min-h-[44px] px-3 py-2 text-sm text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors"
          >
            رجوع
          </button>
        </div>
        </FocusTrap></Suspense>
      </div>
    );
  }

  if (subscription.status === 'trial' && subscription.trialDaysLeft > 0) {
    if (dismissed) return null;

    const daysLeft = subscription.trialDaysLeft;
    const isLastDay = daysLeft <= 1;

    const daysText = arPlural(daysLeft, 'يوم واحد', 'يومان', 'أيام');

    const handleDismiss = () => {
      setDismissed(true);
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* Safari private */ }
    };

    return (
      <div
        className={cn(
          'sticky top-[var(--header-height)] z-40 text-center py-2 px-4 relative',
          isLastDay ? 'bg-red-600' : ''
        )}
        style={isLastDay ? undefined : { background: 'linear-gradient(135deg, #059669, #0d9488)' }}
      >
        <p
          className="text-sm font-semibold text-white"
        >
          {isLastDay ? (
            <>
              <Clock className="inline h-4 w-4 me-1 align-text-bottom" /> {TRIAL.bannerLastDay}
              <span className="mx-2">—</span>
              <button
                type="button"
                onClick={() => handleUpgrade()}
                disabled={upgradeLoading}
                className="font-bold underline underline-offset-2 bg-white/20 rounded px-2 py-0.5 hover:bg-white/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {UPGRADE.subscribeCta}
              </button>
            </>
          ) : (
            <>
              {TRIAL.bannerDaysLeft(daysText)}
              <span className="mx-2">—</span>
              <button
                type="button"
                onClick={() => handleUpgrade()}
                disabled={upgradeLoading}
                className="font-bold underline underline-offset-2 bg-white/20 rounded px-2 py-0.5 hover:bg-white/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {UPGRADE.subscribeCta}
              </button>
            </>
          )}
        </p>
        {!isLastDay && (
          <button
            onClick={handleDismiss}
            aria-label="إغلاق"
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors text-white/70 hover:text-white hover:bg-white dark:bg-stone-900/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return null;
}
