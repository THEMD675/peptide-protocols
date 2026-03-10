import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { TestTube, AlertTriangle, Calendar, ClipboardList, Heart, Brain, Droplets, Activity, FlaskConical, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL } from '@/lib/constants';
import { labTests, peptides } from '@/data/peptides';
import { GenericPageSkeleton } from '@/components/Skeletons';

const monitoringSchedule = [
  { when: 'قبل البدء', tests: 'جميع التحاليل الأساسية', icon: '🔬', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { when: 'بعد 4-6 أسابيع', tests: 'IGF-1 + سكر صائم + إنسولين صائم + CMP', icon: '📊', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { when: 'بعد 12 أسبوعًا', tests: 'إعادة جميع التحاليل', icon: '🔄', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { when: 'كل 3 أشهر', tests: 'CMP + CBC + IGF-1 كحد أدنى', icon: '📅', color: 'bg-purple-100 text-purple-700 border-purple-300' },
];

const redFlags = [
  'ALT/AST أعلى من ضعف الحد الأعلى',
  'سكر صائم ≥ 126 باستمرار',
  'IGF-1 أعلى من 400',
  'TSH أعلى من 10 أو أقل من 0.1',
];

const referenceRanges = [
  { name: 'IGF-1', range: '200-300 ng/mL', unit: 'المعدل الصحي الأعلى', category: 'هرمونات' },
  { name: 'التستوستيرون الكلي', range: '300-1000 ng/dL', unit: 'للذكور', category: 'هرمونات' },
  { name: 'البرولاكتين', range: '< 20 ng/mL', unit: 'طبيعي', category: 'هرمونات' },
  { name: 'سكر صائم', range: '70-100 mg/dL', unit: 'طبيعي', category: 'أيض' },
  { name: 'HbA1c', range: '< 5.7%', unit: 'طبيعي', category: 'أيض' },
  { name: 'HOMA-IR', range: '< 1.5', unit: 'مثالي', category: 'أيض' },
  { name: 'ALT', range: '7-56 U/L', unit: 'طبيعي', category: 'كبد' },
  { name: 'AST', range: '10-40 U/L', unit: 'طبيعي', category: 'كبد' },
  { name: 'Creatinine', range: '0.7-1.3 mg/dL', unit: 'للذكور', category: 'كلى' },
  { name: 'eGFR', range: '> 90 mL/min', unit: 'طبيعي', category: 'كلى' },
  { name: 'TSH', range: '0.4-4.0 mIU/L', unit: 'طبيعي', category: 'غدة درقية' },
  { name: 'فيتامين D', range: '50-80 ng/mL', unit: 'مثالي', category: 'مناعة' },
  { name: 'hs-CRP', range: '< 1 mg/L', unit: 'منخفض الخطر', category: 'التهاب' },
];

/** Map test category to icon and color */
function getTestCategoryIcon(relatedCategories: string[]): { Icon: typeof Heart; color: string; bgColor: string } {
  if (relatedCategories.includes('hormonal')) return { Icon: Activity, color: 'text-purple-600', bgColor: 'bg-purple-100' };
  if (relatedCategories.includes('metabolic')) return { Icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-100' };
  if (relatedCategories.includes('brain')) return { Icon: Brain, color: 'text-amber-600', bgColor: 'bg-amber-100' };
  if (relatedCategories.includes('longevity')) return { Icon: Heart, color: 'text-rose-600', bgColor: 'bg-rose-100' };
  if (relatedCategories.includes('skin-gut')) return { Icon: FlaskConical, color: 'text-teal-600', bgColor: 'bg-teal-100' };
  return { Icon: TestTube, color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
}

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
        <title>دليل التحاليل المخبرية قبل وأثناء الببتيدات | pptides</title>
        <meta name="description" content="دليل شامل للتحاليل المخبرية الأساسية قبل وأثناء وبعد استخدام الببتيدات — هرمونات النمو، الغدة الدرقية، الكبد، الكلى، وتحاليل التقدم العلاجي." />
        <link rel="canonical" href={`${SITE_URL}/lab-guide`} />
        <meta property="og:title" content="دليل التحاليل المخبرية للببتيدات | pptides" />
        <meta property="og:description" content="التحاليل الأساسية قبل وأثناء وبعد استخدام الببتيدات — دليل شامل ومبني على الأدلة." />
        <meta property="og:url" content={`${SITE_URL}/lab-guide`} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="دليل التحاليل المخبرية للببتيدات | pptides" />
        <meta name="twitter:description" content="التحاليل الأساسية قبل وأثناء وبعد استخدام الببتيدات — دليل شامل ومبني على الأدلة." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MedicalWebPage',
          name: 'دليل التحاليل المخبرية',
          url: `${SITE_URL}/lab-guide`,
          description: 'التحاليل الأساسية قبل وأثناء وبعد استخدام الببتيدات.',
          inLanguage: 'ar',
        })}</script>
      </Helmet>

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500">
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
                <span className="text-base font-medium">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="space-y-10">
        {/* ── Section 1: When to test — Timeline visual ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Calendar className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">متى تحلّل؟</h2>
          </div>

          {/* Timeline visual */}
          <div className="relative">
            {/* Vertical line connector */}
            <div className="absolute start-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-300 via-blue-300 via-amber-300 to-purple-300 hidden sm:block" />

            <div className="space-y-4">
              {monitoringSchedule.map((row, i) => (
                <div key={row.when} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={cn(
                    'hidden sm:flex relative z-10 h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-lg',
                    row.color
                  )}>
                    {row.icon}
                  </div>
                  {/* Card */}
                  <div className={cn(
                    'flex-1 rounded-2xl border p-5 transition-all hover:shadow-md',
                    i === 0 ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="sm:hidden text-lg">{row.icon}</span>
                      <h3 className="font-bold text-stone-900">{row.when}</h3>
                      {i === 0 && (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">أساسي</span>
                      )}
                    </div>
                    <p className={cn('text-sm', blurClass)} aria-hidden={!isPro || undefined}>{row.tests}</p>
                    {!isPro && i > 0 && (
                      <Link to="/pricing" className="mt-2 inline-block text-xs font-bold text-emerald-600 hover:underline">
                        اشترك لمعرفة التفاصيل
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 2: Baseline tests with icons ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">التحاليل الأساسية</h2>
          </div>

          {/* Card-based layout instead of table for better mobile experience */}
          <div className="relative grid gap-4 sm:grid-cols-2">
            {labTests.map((test) => {
              const { Icon, color, bgColor } = getTestCategoryIcon(test.relatedCategories);
              // Find related peptides from categories
              const relatedPeptidesList = peptides
                .filter(p => test.relatedCategories.includes(p.category))
                .slice(0, 3);

              return (
                <div
                  key={test.id}
                  className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bgColor)}>
                      <Icon className={cn('h-5 w-5', color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-stone-900 leading-snug">{test.nameAr}</h3>
                      <span className="text-xs text-stone-500" dir="ltr">{test.nameEn}</span>
                    </div>
                  </div>

                  <div className={blurClass} aria-hidden={!isPro || undefined}>
                    <p className="mb-2 text-sm leading-relaxed text-stone-600">{test.descriptionAr}</p>
                    <div className="flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-800 p-2.5 text-xs text-stone-700 dark:text-stone-300">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{test.whenAr}</span>
                    </div>

                    {/* Related peptides */}
                    {relatedPeptidesList.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {relatedPeptidesList.map(p => (
                          <Link
                            key={p.id}
                            to={`/peptide/${p.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <FlaskConical className="h-2.5 w-2.5" />
                            {p.nameAr}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isPro && (
                    <div className="mt-3">
                      <Link to="/pricing" className="text-xs font-bold text-emerald-600 hover:underline">
                        اشترك لمعرفة التفاصيل <ArrowLeft className="inline h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 3: Reference ranges table ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Activity className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">النطاقات المرجعية</h2>
          </div>

          <div className="relative overflow-x-auto scroll-fade rounded-2xl border border-stone-200 dark:border-stone-700">
            <table className="w-full text-sm">
              <caption className="sr-only">النطاقات المرجعية للتحاليل المخبرية</caption>
              <thead>
                <tr className="bg-emerald-800">
                  <th className="px-4 py-3 text-start font-bold text-white/90">التحليل</th>
                  <th className="px-4 py-3 text-start font-bold text-white/90">النطاق المرجعي</th>
                  <th className="px-4 py-3 text-start font-bold text-white/90">ملاحظة</th>
                  <th className="px-4 py-3 text-start font-bold text-white/90">التصنيف</th>
                </tr>
              </thead>
              <tbody className={blurClass} aria-hidden={!isPro || undefined}>
                {referenceRanges.map((row, i) => (
                  <tr key={row.name} className={cn('border-t dark:border-stone-700 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800', i % 2 === 0 && 'bg-stone-50 dark:bg-stone-800/50')}>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-stone-900" dir="ltr">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-emerald-700" dir="ltr">{row.range}</td>
                    <td className="px-4 py-3 text-stone-600">{row.unit}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:text-stone-300">{row.category}</span>
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
          <Link to="/calculator" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center">حاسبة الجرعات</Link>
          <Link to="/guide" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">دليل التحضير والحقن</Link>
          <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">اسأل المدرب الذكي</Link>
        </div>
      </div>
    </div>
  );
}
