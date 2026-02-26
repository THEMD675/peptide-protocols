import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, Shield, AlertTriangle, CheckCircle, Lock, Calculator, Bot, FlaskConical, Printer, MessageSquare, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { peptides } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const evidenceColors: Record<string, string> = {
  excellent: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  strong: 'bg-blue-100 text-blue-800 border-blue-300',
  good: 'bg-sky-100 text-sky-800 border-sky-300',
  moderate: 'bg-amber-100 text-amber-800 border-amber-300',
  weak: 'bg-orange-100 text-orange-800 border-orange-300',
  'very-weak': 'bg-red-100 text-red-800 border-red-300',
};

const evidenceLabels: Record<string, string> = {
  excellent: 'ممتاز',
  strong: 'قوي',
  good: 'جيد',
  moderate: 'متوسط',
  weak: 'ضعيف',
  'very-weak': 'ضعيف جدًا',
};

interface ProtocolRow {
  label: string;
  value: string;
  highlight?: boolean;
}


export default function PeptideDetail() {
  const { id } = useParams<{ id: string }>();
  const { subscription, isLoading } = useAuth();
  const hasAccess = !isLoading && (subscription?.isProOrTrial ?? false);

  const peptide = useMemo(() => peptides.find((p) => p.id === id), [id]);

  if (!peptide) return <Navigate to="/library" replace />;

  const isFreeContent = peptide.isFree;
  const firstSentence = peptide.summaryAr.split('.')[0] + '.';

  const rows: ProtocolRow[] = [
    { label: 'الاسم العلمي', value: peptide.nameEn },
    { label: 'عدد الأحماض الأمينية', value: peptide.aminoAcids },
    { label: 'آلية العمل', value: peptide.mechanismAr },
    { label: 'الجرعة الموصى بها', value: peptide.dosageAr, highlight: true },
    { label: 'توقيت الاستخدام', value: peptide.timingAr },
    { label: 'مدة الدورة والراحة', value: peptide.cycleAr },
    { label: 'طريقة الإعطاء', value: peptide.administrationAr, highlight: true },
    { label: 'الأعراض الجانبية المحتملة', value: peptide.sideEffectsAr },
    { label: 'موانع الاستخدام', value: peptide.contraindicationsAr },
    { label: 'التجميع الموصى به', value: peptide.stackAr },
    { label: 'التخزين', value: peptide.storageAr },
  ];

  const previewRows: ProtocolRow[] = [
    { label: 'الاسم العلمي', value: peptide.nameEn },
    { label: 'عدد الأحماض الأمينية', value: peptide.aminoAcids },
    { label: 'مستوى الدليل العلمي', value: evidenceLabels[peptide.evidenceLevel] },
  ];

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>{peptide.nameAr} — {peptide.nameEn} | دليل البيبتايدات</title>
        <meta name="description" content={peptide.summaryAr} />
        <meta property="og:title" content={`${peptide.nameAr} — ${peptide.nameEn} | Peptide Guide`} />
        <meta property="og:description" content={peptide.summaryAr} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": `ما هو ${peptide.nameEn}؟`, "acceptedAnswer": { "@type": "Answer", "text": peptide.summaryAr } },
            { "@type": "Question", "name": `ما هي جرعة ${peptide.nameEn}؟`, "acceptedAnswer": { "@type": "Answer", "text": peptide.dosageAr } },
            { "@type": "Question", "name": `ما هي الأعراض الجانبية لـ ${peptide.nameEn}؟`, "acceptedAnswer": { "@type": "Answer", "text": peptide.sideEffectsAr } },
            { "@type": "Question", "name": `هل ${peptide.nameEn} معتمد من FDA؟`, "acceptedAnswer": { "@type": "Answer", "text": peptide.fdaApproved ? 'نعم، معتمد من FDA.' : 'لا، غير معتمد من FDA حاليًا. يُستخدم للأغراض البحثية.' } },
          ]
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        {/* Back Button */}
        <div
        >
          <Link
            to="/library"
            className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-stone-800 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمكتبة
          </Link>
        </div>

        {/* Warning Banner — subscribers only */}
        {peptide.warningAr && hasAccess && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm leading-relaxed text-red-700">
              {peptide.warningAr}
            </p>
          </div>
        )}

        {/* Header */}
        <div
          className="mb-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold md:text-4xl"
                
              >
                {peptide.nameAr}
              </h1>
              <p className="mt-1 text-lg text-stone-800">{peptide.nameEn}</p>
            </div>

            <div className="flex items-center gap-2">
              {peptide.fdaApproved && (hasAccess || isFreeContent) && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  معتمد من FDA
                </span>
              )}
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  evidenceColors[peptide.evidenceLevel],
                )}
              >
                الدليل: {evidenceLabels[peptide.evidenceLevel]}
              </span>
              {peptide.lastUpdated && (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600">
                  تحديث: {peptide.lastUpdated}
                </span>
              )}
              {peptide.difficulty && (
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium border',
                  peptide.difficulty === 'beginner' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                  peptide.difficulty === 'intermediate' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                  'border-red-200 bg-red-50 text-red-700'
                )}>
                  {peptide.difficulty === 'beginner' ? 'مبتدئ' : peptide.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
                </span>
              )}
            </div>
          </div>

          {peptide.costEstimate && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2">
              <span className="text-xs text-stone-500">التكلفة التقريبية:</span>
              <span className="text-sm font-bold text-stone-900">{peptide.costEstimate}</span>
            </div>
          )}

          <p className="mt-4 text-base leading-relaxed text-stone-800">
            {hasAccess || isFreeContent ? peptide.summaryAr : firstSentence}
          </p>
        </div>

        {/* Protocol Content */}
        {hasAccess ? (<>
          {/* ── Subscriber: full protocol ── */}
          <div
            className="overflow-hidden rounded-2xl border border-stone-300"
          >
            <div className="border-b border-stone-300 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-stone-800">
                مستوى الدليل العلمي
              </h3>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold',
                    evidenceColors[peptide.evidenceLevel],
                  )}
                >
                  {evidenceLabels[peptide.evidenceLevel]}
                </span>
                <p className="text-sm leading-relaxed text-stone-800">
                  {peptide.evidenceAr}
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: 'rgba(250, 250, 249, 0.95)' }}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4"  />
                <h2 className="text-base font-bold">
                  بطاقة البروتوكول
                </h2>
              </div>
              <button
                onClick={() => window.print()}
                className="print:hidden flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
              >
                <Printer className="h-3.5 w-3.5" />
                طباعة البروتوكول
              </button>
            </div>

            <table className="w-full">
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b border-stone-200 last:border-b-0',
                      i % 2 === 0 ? 'bg-stone-50 border border-stone-300' : 'bg-transparent',
                    )}
                  >
                    <td
                      className={cn(
                        'w-[35%] px-5 py-4 align-top text-sm font-semibold',
                        row.highlight ? 'text-emerald-600' : 'text-stone-800',
                      )}
                    >
                      {row.label}
                    </td>
                    <td className="px-5 py-4 text-sm leading-relaxed text-stone-800">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              to={`/calculator?peptide=${encodeURIComponent(peptide.nameEn)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md"
            >
              <Calculator className="h-4 w-4" />
              احسب الجرعة
            </Link>
            <Link
              to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <Bot className="h-4 w-4" />
              اسأل المدرب
            </Link>
            <Link
              to={`/tracker`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <ArrowRight className="h-4 w-4" />
              سجّل أول حقنة
            </Link>
          </div>

          {peptides.filter(
            (p) => p.id !== peptide.id && (p.category === peptide.category || peptide.stackAr.toLowerCase().includes(p.nameEn.toLowerCase()))
          ).slice(0, 4).length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-bold text-stone-900">ببتيدات ذات صلة</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {peptides.filter(
                  (p) => p.id !== peptide.id && (p.category === peptide.category || peptide.stackAr.toLowerCase().includes(p.nameEn.toLowerCase()))
                ).slice(0, 4).map((rp) => (
                  <Link
                    key={rp.id}
                    to={`/peptide/${rp.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <FlaskConical className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{rp.nameAr}</p>
                      <p className="text-xs text-stone-500 truncate">{rp.nameEn}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Community experiences for this peptide */}
          <PeptideExperiences peptideNameEn={peptide.nameEn} />
        </>) : isFreeContent ? (
          /* ── Free peptide, non-subscriber: 3 preview rows + gradient CTA ── */
          <div
            className="relative overflow-hidden rounded-2xl border border-stone-300"
            style={{ paddingBottom: '10rem' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ background: 'rgba(250, 250, 249, 0.95)' }}
            >
              <Shield className="h-4 w-4"  />
              <h2
                className="text-base font-bold"
                
              >
                بطاقة البروتوكول
              </h2>
            </div>

            <table className="w-full">
              <tbody>
                {previewRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b border-stone-200',
                      i % 2 === 0 ? 'bg-stone-50 border border-stone-300' : 'bg-transparent',
                    )}
                  >
                    <td className="w-[35%] px-5 py-4 align-top text-sm font-semibold text-stone-800">
                      {row.label}
                    </td>
                    <td className="px-5 py-4 text-sm leading-relaxed text-stone-800">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Gradient overlay + CTA */}
            <div
              className="absolute bottom-0 left-0 right-0 flex h-48 flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(to top, white 40%, transparent)',
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/pricing"
                  className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                >
                  اشترك — $9/شهريًا
                </Link>
                <Link
                  to="/coach"
                  className="rounded-full border-2 border-emerald-300 px-8 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50"
                >
                  اسأل المدرب الذكي
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── Locked peptide, non-subscriber: CTA only ── */
          <div
            className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-50"
          >
            <div className="flex flex-col items-center justify-center gap-5 px-6 py-14 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: '#10b981' }}
              >
                <Lock className="h-7 w-7" style={{ color: 'white' }} />
              </div>
              <div>
                <p className="text-xl font-bold text-stone-900">
                  البروتوكول الكامل متاح للمشتركين
                </p>
                <p className="mt-2 text-sm text-stone-800">
                  الجرعات، التوقيت، الأعراض الجانبية، والتجميعات — كل شيء داخل.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/pricing"
                  className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                >
                  اشترك الآن — $9/شهريًا
                </Link>
                <Link
                  to="/coach"
                  className="rounded-full border-2 border-emerald-300 px-8 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50"
                >
                  اسأل المدرب الذكي
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PeptideExperiences({ peptideNameEn }: { peptideNameEn: string }) {
  const [experiences, setExperiences] = useState<{ id: string; results: string; rating: number; duration_weeks: number; created_at: string }[]>([]);

  useEffect(() => {
    supabase
      .from('community_logs')
      .select('id, results, rating, duration_weeks, created_at')
      .ilike('peptide_name', `%${peptideNameEn}%`)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setExperiences(data); });
  }, [peptideNameEn]);

  if (experiences.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-stone-900">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          تجارب المستخدمين
        </h3>
        <Link to="/community" className="text-xs font-semibold text-emerald-600 hover:underline">عرض الكل</Link>
      </div>
      <div className="space-y-3">
        {experiences.map(exp => (
          <div key={exp.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('h-3.5 w-3.5', s <= exp.rating ? 'fill-emerald-500 text-emerald-500' : 'text-stone-300')} />
                ))}
              </div>
              <span className="text-xs text-stone-500">{exp.duration_weeks} أسابيع</span>
            </div>
            <p className="text-sm text-stone-800 leading-relaxed line-clamp-3">{exp.results}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
