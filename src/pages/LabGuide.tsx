import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { TestTube, AlertTriangle, Calendar, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { labTests } from '@/data/peptides';

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
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <Link
        to="/pricing"
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
      >
        اشترك — $9/شهريًا
      </Link>
    </div>
  );
}

export default function LabGuide() {
  const { subscription, isLoading } = useAuth();
  const isPro = isLoading || (subscription?.isProOrTrial ?? false);

  const blurStyle = !isPro
    ? { filter: 'blur(6px)', pointerEvents: 'none' as const, userSelect: 'none' as const }
    : undefined;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
      <Helmet>
        <title>دليل تحاليل الببتيدات — التحاليل المخبرية الأساسية | Peptide Lab Guide</title>
        <meta name="description" content="التحاليل المخبرية اللازمة قبل وأثناء وبعد استخدام الببتيدات مع العلامات التحذيرية. Essential bloodwork guide for peptide users." />
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: '#10b981' }}
        >
          <TestTube className="h-7 w-7"  />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-600">
          دليل التحاليل المخبرية
        </h1>
        <p className="mt-2 text-lg" >
          التحاليل الأساسية قبل وأثناء وبعد استخدام الببتيدات
        </p>
      </div>

      <div className="space-y-10">
        {/* ── Section 1: Baseline tests ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              التحاليل الأساسية
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: '#d6d3d1' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#10b981' }}>
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
            </table>
            <div className="relative">
              <table className="w-full text-sm" style={blurStyle}>
                <tbody>
                  {labTests.map((test, i) => (
                    <tr
                      key={test.id}
                      className="border-t transition-colors hover:bg-stone-50"
                      style={{
                        background: i % 2 === 0 ? 'var(--card)' : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold" >
                          {test.nameAr}
                        </span>
                        <br />
                        <span className="text-xs" >
                          {test.nameEn}
                        </span>
                      </td>
                      <td className="px-4 py-3 leading-relaxed" >
                        {test.descriptionAr}
                      </td>
                      <td className="px-4 py-3 text-sm" >
                        {test.whenAr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isPro && <BlurredOverlay />}
            </div>
          </div>
        </section>

        {/* ── Section 2: Monitoring schedule ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Calendar className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              جدول المتابعة
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: '#d6d3d1' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#10b981' }}>
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    التوقيت
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-white/90">
                    التحاليل المطلوبة
                  </th>
                </tr>
              </thead>
            </table>
            <div className="relative">
              <table className="w-full text-sm" style={blurStyle}>
                <tbody>
                  {monitoringSchedule.map((row, i) => (
                    <tr
                      key={row.when}
                      className="border-t transition-colors hover:bg-stone-50"
                      style={{
                        background: i % 2 === 0 ? 'var(--card)' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 font-bold" >
                        {row.when}
                      </td>
                      <td className="px-4 py-3" >
                        {row.tests}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isPro && <BlurredOverlay />}
            </div>
          </div>
        </section>

        {/* ── Section 3: Red flags ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" />
            <h2 className="text-2xl font-bold text-red-600 ">
              علامات تحذيرية تستوجب التوقف الفوري
            </h2>
          </div>

          <div className="relative">
            <div
              className="rounded-2xl border-2 p-6"
              style={{
                borderColor: '#dc2626',
                background: 'rgba(220, 38, 38, 0.04)',
                ...(blurStyle ?? {}),
              }}
            >
              <ul className="space-y-3">
                {redFlags.map((flag) => (
                  <li key={flag} className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <span className="text-base font-medium" >
                      {flag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {!isPro && <BlurredOverlay />}
          </div>
        </section>
      </div>
    </main>
  );
}
