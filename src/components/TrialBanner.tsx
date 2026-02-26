import { Link, useLocation } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
import { cn, arPlural } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT } from '@/lib/constants';
import { peptides } from '@/data/peptides';

const FREE_PATHS = [
  '/calculator', '/pricing', '/login', '/signup', '/privacy', '/terms', '/',
  '/glossary', '/sources', '/reviews', '/account',
  '/dashboard', '/tracker', '/coach', '/community', '/interactions',
  '/library', '/stacks', '/table', '/guide', '/lab-guide', '/peptide',
];

export default function TrialBanner() {
  const { user, subscription } = useAuth();
  const { pathname } = useLocation();

  if (!user || !subscription) return null;
  if (subscription.status === 'active') return null;
  if (subscription.isPaidSubscriber) return null;

  const peptideId = pathname.startsWith('/peptide/') ? pathname.split('/')[2] : null;
  const isPeptideFree = peptideId ? peptides.find(p => p.id === peptideId)?.isFree === true : false;

  const isFreePage = FREE_PATHS.some(p => pathname === p) || isPeptideFree;

  if (subscription.status === 'cancelled' && subscription.isPaidSubscriber) {
    return (
      <div className="sticky top-[64px] md:top-[72px] z-40 bg-amber-500 text-center py-2 px-4">
        <p className="text-sm font-semibold text-white">
          اشتراكك ملغي — ستحتفظ بالوصول حتى نهاية الفترة الحالية
        </p>
      </div>
    );
  }

  if (subscription.status === 'cancelled' && !subscription.isPaidSubscriber) {
    if (isFreePage) {
      return (
        <div className="sticky top-[64px] md:top-[72px] z-40 bg-amber-600 text-center py-2.5 px-4">
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
        <div className="sticky top-[64px] md:top-[72px] z-40 bg-red-600 text-center py-2.5 px-4">
          <p className="text-sm font-semibold text-white">
            {bannerText}
            <span className="mx-2">—</span>
            <Link to="/pricing" className="underline underline-offset-2 hover:opacity-80">اشترك الآن</Link>
          </p>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
        <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl">
          <Shield className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
          <h2 className="mb-3 text-2xl font-bold text-stone-900">
            {modalTitle}
          </h2>
          <p className="mb-4 text-stone-700">
            اشترك الآن للوصول إلى {PEPTIDE_COUNT}+ بروتوكول، المدرب الذكي، وجميع الأدوات
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="inline-block rounded-full bg-emerald-600 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-[0.98]"
            >
              اشترك — {PRICING.essentials.label}/شهريًا
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
            <span className="text-stone-400">أو تصفّح المجاني:</span>
            <Link to="/calculator" className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700">الحاسبة</Link>
            <Link to="/glossary" className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700">المصطلحات</Link>
            <Link to="/sources" className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700">المصادر</Link>
            <Link to="/reviews" className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700">التقييمات</Link>
          </div>
        </div>
        </FocusTrap>
      </div>
    );
  }

  if (subscription.status === 'trial' && subscription.trialDaysLeft > 0) {
    const daysLeft = subscription.trialDaysLeft;
    const isLastDay = daysLeft <= 1;

    const daysText = arPlural(daysLeft, 'يوم واحد', 'يومان', 'أيام');

    return (
      <div
        className={cn(
          'sticky top-[64px] md:top-[72px] z-40 text-center py-2 px-4',
          isLastDay ? 'bg-red-600' : 'gold-gradient'
        )}
      >
        <p
          className={cn(
            'text-sm font-semibold',
            isLastDay ? 'text-white' : 'text-stone-900'
          )}
        >
          {isLastDay ? (
            <>
              آخر فرصة — تنتهي تجربتك المجانية اليوم
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
              تجربتك المجانية — متبقي {daysText}
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
      </div>
    );
  }

  return null;
}
