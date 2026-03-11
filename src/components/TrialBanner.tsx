import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, X } from 'lucide-react';
import { cn, arPlural } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT, FREE_PEPTIDE_IDS } from '@/lib/constants';
import { useNowMs } from '@/hooks/useNowMs';

const DISMISS_KEY = 'pptides_trial_banner_dismissed';

const FREE_PATHS = [
  '/calculator', '/pricing', '/login', '/signup', '/privacy', '/terms', '/',
  '/glossary', '/sources', '/reviews', '/account', '/interactions',
  '/library', '/table', '/stacks', '/lab-guide', '/guide',
  '/community', '/about', '/faq', '/quiz', '/blog', '/contact', '/transparency',
];
// Excluded: /dashboard, /tracker, /coach — premium routes; blocking modal must trigger for expired
// /peptide handled separately via isPeptideFree (FREE_PEPTIDE_IDS)

export default function TrialBanner() {
  const navigate = useNavigate();
  const { user, subscription, isLoading } = useAuth();
  const { pathname } = useLocation();
  const nowMs = useNowMs();
  const [dismissed, setDismissed] = useState(() => { try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } });

  const peptideId = pathname.startsWith('/peptide/') ? pathname.split('/')[2] : null;
  const isPeptideFree = peptideId ? FREE_PEPTIDE_IDS.has(peptideId) : false;
  const isFreePage = FREE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) || isPeptideFree;

  const needsSubscription = !isLoading && user && subscription &&
    !subscription.isPaidSubscriber && !subscription.isTrial;

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
    const PAYMENT_WALL_FREE_PATHS = [
      '/pricing', '/account', '/login', '/signup', '/privacy', '/terms', '/contact', '/',
    ];
    const isPaymentWallFreePage = PAYMENT_WALL_FREE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (isPaymentWallFreePage) {
      // Show a prominent banner on allowed pages
      return (
        <div className="sticky top-[var(--header-height)] z-40 bg-amber-500 text-center py-2.5 px-4">
          <p className="text-sm font-semibold text-white">
            أدخل بيانات الدفع لتفعيل تجربتك المجانية — لن يتم خصم أي مبلغ خلال 3 أيام
            <span className="mx-2">—</span>
            <Link to="/pricing" className="underline underline-offset-2 hover:opacity-80">أكمل الإعداد</Link>
          </p>
        </div>
      );
    }

    // Block access to all other pages — show a setup modal
    return (
      <div role="dialog" aria-modal="true" aria-describedby="payment-wall-desc" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-950 p-10 text-center shadow-2xl" aria-labelledby="payment-wall-title">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-700" />
          <h2 id="payment-wall-title" className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            أكمل إعداد حسابك
          </h2>
          <p id="payment-wall-desc" className="mb-2 text-stone-700 dark:text-stone-300">
            أكمل إعداد حسابك لبدء التجربة المجانية
          </p>
          <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
            لن يتم خصم أي مبلغ خلال 3 أيام — يمكنك الإلغاء في أي وقت
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="inline-block rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98]"
            >
              أدخل بيانات الدفع
            </Link>
          </div>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            className="mt-4 min-h-[44px] px-3 py-2 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-600 dark:text-stone-400 transition-colors"
          >
            رجوع
          </button>
        </div>
        </FocusTrap>
      </div>
    );
  }

  if (subscription.status === 'cancelled' && subscription.isPaidSubscriber) {
    return (
      <div className="sticky top-[var(--header-height)] z-40 bg-amber-500 text-center py-2 px-4">
        <p className="text-sm font-semibold text-white">
          اشتراكك ملغي — ستحتفظ بالوصول حتى نهاية الفترة الحالية.{' '}
          <Link to="/pricing" className="underline underline-offset-2 hover:opacity-80">أعد الاشتراك</Link>
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
        daysLeftText = ` متبقي ${daysLeft} ${daysLeft <= 2 ? (daysLeft === 1 ? 'يوم' : 'يومان') : 'أيام'} لتحديث وسيلة الدفع.`;
      }
    }
    return (
      <div className="sticky top-[var(--header-height)] z-40 bg-amber-600 text-center py-2 px-4">
        <p className="text-sm font-semibold text-white">
          تعذّر تحصيل الدفعة —{daysLeftText} يرجى تحديث وسيلة الدفع لتجنّب فقدان الوصول.{' '}
          <Link to="/account" className="underline underline-offset-2 hover:opacity-80">إعدادات الحساب</Link>
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
            تم إلغاء اشتراكك — <Link to="/pricing" className="underline underline-offset-2 hover:opacity-80">أعد الاشتراك</Link>
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
    const bannerText = isTrial ? 'انتهت تجربتك المجانية — اشترك للوصول لكل المحتوى' : 'انتهت صلاحية اشتراكك — جدّد للوصول لكل المحتوى';
    const modalTitle = isTrial ? 'انتهت تجربتك المجانية' : 'انتهت صلاحية اشتراكك';

    if (isFreePage) {
      return (
        <div className="sticky top-[var(--header-height)] z-40 bg-red-600 text-center py-2.5 px-4">
          <p className="text-sm font-semibold text-white">
            {bannerText}
            <span className="mx-2">—</span>
            <Link to="/pricing" className="underline underline-offset-2 hover:opacity-80">اشترك الآن</Link>
          </p>
        </div>
      );
    }

    return (
      <div role="dialog" aria-modal="true" aria-describedby="sub-modal-desc-expired" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-950 p-10 text-center shadow-2xl" aria-labelledby="trial-modal-title">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-700" />
          <h2 id="trial-modal-title" className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {modalTitle}
          </h2>
          <p id="sub-modal-desc-expired" className="mb-4 text-stone-700 dark:text-stone-300">
            لا تخسر تقدّمك — اشترك الآن للاحتفاظ ببياناتك والوصول لـ {PEPTIDE_COUNT}+ بروتوكول، المدرب الذكي، وجميع الأدوات
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="inline-block rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98]"
            >
              اشترك — {PRICING.essentials.label}/شهريًا
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-stone-500 dark:text-stone-400">أو تصفّح المجاني:</span>
            <Link to="/library" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المكتبة</Link>
            <Link to="/calculator" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">الحاسبة</Link>
            <Link to="/interactions" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">فحص التعارضات</Link>
            <Link to="/glossary" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المصطلحات</Link>
            <Link to="/sources" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المصادر</Link>
            <Link to="/community" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">التقييمات</Link>
          </div>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            className="mt-4 min-h-[44px] px-3 py-2 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-600 dark:text-stone-400 transition-colors"
          >
            رجوع
          </button>
        </div>
        </FocusTrap>
      </div>
    );
  }

  if (subscription.status === 'none') {
    if (isFreePage) return null;
    return (
      <div role="dialog" aria-modal="true" aria-describedby="sub-modal-desc-none" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-950 p-10 text-center shadow-2xl" aria-labelledby="sub-modal-title">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-700" />
          <h2 id="sub-modal-title" className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            محتوى للمشتركين فقط
          </h2>
          <p id="sub-modal-desc-none" className="mb-4 text-stone-700 dark:text-stone-300">
            اشترك للوصول إلى {PEPTIDE_COUNT}+ بروتوكول، المدرب الذكي، وجميع الأدوات
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="inline-block rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98]"
            >
              ابدأ تجربتك المجانية
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-stone-500 dark:text-stone-400">أو تصفّح المجاني:</span>
            <Link to="/calculator" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">الحاسبة</Link>
            <Link to="/library" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المكتبة</Link>
            <Link to="/glossary" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">المصطلحات</Link>
          </div>
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            className="mt-4 min-h-[44px] px-3 py-2 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-600 dark:text-stone-400 transition-colors"
          >
            رجوع
          </button>
        </div>
        </FocusTrap>
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
              ⏰ آخر يوم في تجربتك — لا تفقد الوصول
              <span className="mx-2">—</span>
              <Link
                to="/pricing"
                className="underline underline-offset-2 hover:opacity-80"
              >
                اشترك الآن
              </Link>
            </>
          ) : (
            <>
              🎁 هديتك: {daysText} تجربة كاملة — استمتع بكل المميزات
              <span className="mx-2">—</span>
              <Link
                to="/pricing"
                className="underline underline-offset-2 hover:opacity-80"
              >
                اشترك الآن
              </Link>
            </>
          )}
        </p>
        <button
          onClick={handleDismiss}
          aria-label="إغلاق"
          className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors text-white/70 hover:text-white hover:bg-white dark:bg-stone-950/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
