import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { TestTube, AlertTriangle, Calendar, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL } from '@/lib/constants';
import { labTests } from '@/data/peptides';
import { GenericPageSkeleton } from '@/components/Skeletons';

const monitoringSchedule = [
  { when: 'قبل البدء', tests: 'جميع التحاليل الأساسية' },
  { when: 'بعد 4-6 أسابيع', tests: 'IGF-1 + سكر صائم + إنسولين صائم + CMP' },
  { when: 'بعد 12 أسبوعًا', tests: 'إعادة جميع التحاليل' },
  { when: 'كل 3 أشهر', tests: 'CMP + CBC + IGF-1 كحد أدنى' },
];

const redFlags = [
  'ALT/AST أعلى من ضعف الحد الأعلى',
  'سكر صائم ≥ 126 باستمرار',
  'IGF-1 أعلى من 400',
  'TSH أعلى من 10 أو أقل من 0.1',
];

function BlurredOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center" role="region" aria-label="محتوى مقفل — يتطلب اشتراك">
      <Link
        to="/pricing"
        aria-label="اشترك لفتح هذا المحتوى"
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
      >
        اشترك — {PRICING.essentials.label}/شهريًا
      </Link>
    </div>
  );
}

export default function LabGuide() {
  const { subscription, isLoading } = useAuth();
  const isPro = !isLoading && (subscription?.isProOrTrial ?? false);

  const blurClass = !isPro ? 'blur-sm pointer-events-none select-none' : '';

  if (isLoading) {
    return <GenericPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>دليل التحاليل المخبرية | pptides</title>
        <meta name="description" content="دليل التحاليل المخبرية للببتيدات" />
        <meta property="og:title" content="دليل التحاليل المخبرية | pptides" />
        <meta property="og:description" content="التحاليل الأساسية قبل وأثناء وبعد استخدام الببتيدات" />
        <meta property="og:url" content={`${SITE_URL}/lab-guide`} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"
        >
          <TestTube className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-600">
          دليل التحاليل المخبرية
        </h1>
        <p className="mt-2 text-lg text-stone-600">
          التحاليل الأساسية قبل وأثناء وبعد استخدام الببتيدات
        </p>
      </div>

      {/* ── Red flags — always visible (safety-critical) ── */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" />
          <h2 className="text-2xl font-bold text-red-600">
            علامات تحذيرية تستوجب التوقف الفوري
          </h2>
        </div>

        <div className="rounded-2xl border-2 border-red-600 bg-red-600/[0.04] p-6">
          <ul className="space-y-3">
            {redFlags.map((flag) => (
              <li key={flag} className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <span className="text-base font-medium">
                  {flag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="space-y-10">
        {/* ── Section 1: Baseline tests ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
              التحاليل الأساسية
            </h2>
          </div>

          <div className="relative overflow-x-auto scroll-fade rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <caption className="sr-only">تحاليل خط الأساس الموصى بها قبل استخدام الببتيدات</caption>
              <thead>
                <tr className="bg-emerald-800">
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    التحليل
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    الوصف
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    متى يُطلب
                  </th>
                </tr>
              </thead>
              <tbody className={blurClass} aria-hidden={!isPro || undefined}>
                {labTests.map((test, i) => (
                  <tr
                    key={test.id}
                    className={cn("border-t transition-colors hover:bg-stone-50", i % 2 === 0 && "bg-stone-50")}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-bold">
                        {test.nameAr}
                      </span>
                      <br />
                      <span className="text-xs">
                        {test.nameEn}
                      </span>
                    </td>
                    <td className="px-4 py-3 leading-relaxed">
                      {test.descriptionAr}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {test.whenAr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isPro && <BlurredOverlay />}
          </div>
        </section>

        {/* ── Section 2: Monitoring schedule ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Calendar className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
              جدول المتابعة
            </h2>
          </div>

          <div className="relative overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <caption className="sr-only">جدول متابعة التحاليل أثناء استخدام الببتيدات</caption>
              <thead>
                <tr className="bg-emerald-800">
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    التوقيت
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    التحاليل المطلوبة
                  </th>
                </tr>
              </thead>
              <tbody className={blurClass} aria-hidden={!isPro || undefined}>
                {monitoringSchedule.map((row, i) => (
                  <tr
                    key={row.when}
                    className={cn("border-t transition-colors hover:bg-stone-50", i % 2 === 0 && "bg-stone-50")}
                  >
                    <td className="px-4 py-3 font-bold">
                      {row.when}
                    </td>
                    <td className="px-4 py-3">
                      {row.tests}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isPro && <BlurredOverlay />}
          </div>
        </section>

      </div>

      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-bold text-stone-900">الخطوة التالية</p>
        <p className="mt-1 text-sm text-stone-600">عرفت تحاليلك — الآن احسب جرعتك أو تعلّم طريقة الحقن</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/calculator" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">حاسبة الجرعات</Link>
          <Link to="/guide" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">دليل التحضير والحقن</Link>
          <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">اسأل المدرب الذكي</Link>
        </div>
      </div>
    </div>
  );
}
