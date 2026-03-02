import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, AlertTriangle, CheckCircle, Lock, Calculator, Bot, FlaskConical, Printer, MessageSquare, Star, Syringe, Share2, Play, ExternalLink, BookOpen } from 'lucide-react';
import ProtocolWizard from '@/components/ProtocolWizard';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { peptides } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PRICING, TRIAL_PEPTIDE_IDS, SITE_URL } from '@/lib/constants';
import { DOSE_PRESETS_MAP as DOSE_PRESETS } from '@/data/dose-presets';
import { evidenceColors, evidenceLabels } from '@/lib/peptide-labels';

interface ProtocolRow {
  label: string;
  value: string;
  highlight?: boolean;
}


export default function PeptideDetail() {
  const { id } = useParams<{ id: string }>();
  const { subscription, isLoading } = useAuth();
  const navigate = useNavigate();
  const isPaid = !isLoading && (subscription?.isPaidSubscriber ?? false);
  const isTrial = !isLoading && (subscription?.isTrial ?? false);

  const peptide = useMemo(() => peptides.find((p) => p.id === id), [id]);
  const [showProtocolWizard, setShowProtocolWizard] = useState(false);

  useEffect(() => {
    if (!peptide) return;
    try {
      const recent = JSON.parse(localStorage.getItem('pptides_recent_peptides') ?? '[]');
      const updated = [peptide.id, ...recent.filter((rid: string) => rid !== peptide.id)].slice(0, 10);
      localStorage.setItem('pptides_recent_peptides', JSON.stringify(updated));
    } catch { /* expected */ }
  }, [peptide]);

  if (!peptide) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <Helmet>
          <title>الببتيد غير موجود | pptides</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="mb-3 text-2xl font-bold text-stone-900">الببتيد غير موجود</h1>
        <p className="mb-6 text-stone-600">لم يتم العثور على ببتيد بهذا المعرّف.</p>
        <Link to="/library" className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors">
          تصفّح المكتبة
        </Link>
      </div>
    );
  }

  const isFreeContent = peptide.isFree;
  const hasAccess = isPaid || isFreeContent || (isTrial && TRIAL_PEPTIDE_IDS.has(peptide.id));
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

  return (
    <div className="min-h-screen animate-fade-in" >
      <Helmet>
        <title>{peptide.nameAr === peptide.nameEn ? peptide.nameAr : `${peptide.nameAr} | ${peptide.nameEn}`} | pptides</title>
        <meta name="description" content={peptide.summaryAr.length > 155 ? peptide.summaryAr.slice(0, 155) + '…' : peptide.summaryAr} />
        <meta property="og:title" content={`${peptide.nameAr === peptide.nameEn ? peptide.nameAr : `${peptide.nameAr} | ${peptide.nameEn}`} | pptides`} />
        <meta property="og:description" content={peptide.summaryAr} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/peptide/${peptide.id}`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MedicalWebPage',
          name: `${peptide.nameAr} — ${peptide.nameEn}`,
          description: peptide.summaryAr,
          url: `${SITE_URL}/peptide/${peptide.id}`,
          inLanguage: 'ar',
          medicalAudience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
          publisher: { '@type': 'Organization', name: 'pptides', url: SITE_URL },
          dateModified: (() => {
          const v = peptide.lastUpdated;
          if (!v) return '2026-02-01';
          const m: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
          const match = String(v).match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/);
          if (match) return `${match[2]}-${m[match[1]] ?? '01'}-01`;
          if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
          return '2026-02-01';
        })(),
        })}</script>
        <meta name="twitter:title" content={`${peptide.nameAr} | ${peptide.nameEn}`} />
        <meta name="twitter:description" content={peptide.summaryAr.slice(0, 160)} />
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
        <div>
          <button
            onClick={() => {
              try {
                if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
                  navigate(-1);
                  return;
                }
              } catch { /* empty referrer or invalid URL */ }
              navigate('/library');
            }}
            className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 min-h-[44px] text-sm text-stone-800 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          محتوى تعليمي — استشر طبيبك قبل استخدام أي ببتيد
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
              <h1 className="text-3xl font-bold md:text-4xl">
                {peptide.nameAr}
              </h1>
              <p className="mt-1 text-lg text-stone-800">{peptide.nameEn}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
              <span className="text-sm font-bold text-stone-900" dir="ltr">{peptide.costEstimate}</span>
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
              <details className="mt-2 text-xs text-stone-500">
                <summary className="cursor-pointer hover:text-emerald-600">ماذا تعني مستويات الدليل؟</summary>
                <ul className="mt-1 space-y-1 ps-4 list-disc">
                  <li>ممتاز: تجارب سريرية كبرى متعددة + اعتماد FDA</li>
                  <li>قوي: عدة دراسات بشرية أو بيانات ما قبل سريرية واسعة</li>
                  <li>متوسط / جيد: دراسات محدودة أو بيانات حيوانية قوية</li>
                  <li>ضعيف: تقارير حالة أو بيانات أولية فقط</li>
                </ul>
              </details>
            </div>

            <div
              className="flex items-center justify-between bg-stone-50/95 px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4"  />
                <h2 className="text-base font-bold">
                  بطاقة البروتوكول
                </h2>
              </div>
              <div className="print:hidden flex items-center gap-2">
                <button
                  onClick={async () => {
                    const shareData = {
                      title: `${peptide.nameAr} — ${peptide.nameEn}`,
                      text: peptide.summaryAr.slice(0, 200) + ' — اشترك في pptides.com للمزيد',
                      url: window.location.href,
                    };
                    if (navigator.share) {
                      try { await navigator.share(shareData); } catch { /* expected */ }
                    } else {
                      try {
                        await navigator.clipboard.writeText(window.location.href);
                        toast.success('تم نسخ الرابط');
                      } catch {
                        toast.error('تعذّر نسخ الرابط');
                      }
                    }
                  }}
                  aria-label="مشاركة البروتوكول"
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5 min-h-[44px] text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  مشاركة
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5 min-h-[44px] text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  طباعة
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><table className="w-full">
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b border-stone-200 last:border-b-0',
                      i % 2 === 0 ? 'bg-stone-50 border border-stone-300' : 'bg-transparent',
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        'w-[35%] px-5 py-4 align-top text-sm font-semibold text-right',
                        row.highlight ? 'text-emerald-600' : 'text-stone-800',
                      )}
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-sm leading-relaxed text-stone-800">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {/* Inline Quick Dose Calculator */}
          <InlineDoseCalc peptide={peptide} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to={`/calculator?peptide=${encodeURIComponent(peptide.nameEn)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md"
            >
              <Calculator className="h-4 w-4" />
              حاسبة متقدمة
            </Link>
            <Link
              to={`/interactions?p1=${peptide.id}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <Shield className="h-4 w-4" />
              فحص التعارضات
            </Link>
            <Link
              to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <Bot className="h-4 w-4" />
              اسأل المدرب
            </Link>
            <button
              onClick={() => setShowProtocolWizard(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
            >
              <Play className="h-4 w-4" />
              ابدأ بروتوكول
            </button>
            <Link
              to={`/tracker?peptide=${encodeURIComponent(peptide.nameEn)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <ArrowRight className="h-4 w-4" />
              سجّل حقنة
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

          {/* Scientific References */}
          {peptide.pubmedIds && peptide.pubmedIds.length > 0 && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-stone-900">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                المراجع العلمية
              </h3>
              <div className="space-y-2">
                {peptide.pubmedIds.map((pmid) => (
                  <a
                    key={pmid}
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700 transition-all hover:border-emerald-300 hover:shadow-sm"
                    dir="ltr"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>PubMed ID: {pmid}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Community experiences for this peptide */}
          <PeptideExperiences peptideNameEn={peptide.nameEn} />
        </>) : (<>
          {/* ── Locked peptide: tease first rows, blur rest with inline CTA ── */}
          <div className="overflow-hidden rounded-2xl border border-stone-300">
            <div
              className="flex items-center justify-between bg-stone-50/95 px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <h2 className="text-base font-bold">بطاقة البروتوكول</h2>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Lock className="h-3 w-3" />
                معاينة
              </span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full">
                <tbody>
                  {rows.slice(0, 3).map((row, i) => (
                    <tr
                      key={row.label}
                      className={cn(
                        'border-b border-stone-200 last:border-b-0',
                        i % 2 === 0 ? 'bg-stone-50 border border-stone-300' : 'bg-transparent',
                      )}
                    >
                      <th
                        scope="row"
                        className={cn(
                          'w-[35%] px-5 py-4 align-top text-sm font-semibold text-right',
                          row.highlight ? 'text-emerald-600' : 'text-stone-800',
                        )}
                      >
                        {row.label}
                      </th>
                      <td className="px-5 py-4 text-sm leading-relaxed text-stone-800">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="relative">
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 select-none blur-sm pointer-events-none" aria-hidden="true">
                <table className="w-full">
                  <tbody>
                    {rows.slice(3, 6).map((row, i) => (
                      <tr
                        key={row.label}
                        className={cn(
                          'border-b border-stone-200 last:border-b-0',
                          (i + 3) % 2 === 0 ? 'bg-stone-50 border border-stone-300' : 'bg-transparent',
                        )}
                      >
                        <th scope="row" className="w-[35%] px-5 py-4 align-top text-sm font-semibold text-right text-stone-800">
                          {row.label}
                        </th>
                        <td className="px-5 py-4 text-sm leading-relaxed text-stone-800">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/60 to-white/90">
                <Lock className="h-6 w-6 text-emerald-600 mb-2" />
                <p className="text-sm font-bold text-stone-900 mb-1">اشترك لعرض البروتوكول الكامل</p>
                <p className="text-xs text-stone-500 mb-3">الجرعة، التوقيت، الدورة، الأعراض الجانبية والمزيد</p>
                <Link
                  to="/pricing"
                  className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                >
                  افتح البروتوكول — {PRICING.essentials.label}/شهريًا
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link
              to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 px-5 py-3.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50"
            >
              <Bot className="h-4 w-4" />
              اسأل المدرب الذكي عن {peptide.nameAr} مجانًا
            </Link>
          </div>
        </>)}
      </div>
      {showProtocolWizard && peptide && (
        <ProtocolWizard peptideId={peptide.id} onClose={() => setShowProtocolWizard(false)} />
      )}
    </div>
  );
}

function InlineDoseCalc({ peptide }: { peptide: { nameEn: string } }) {
  const preset = DOSE_PRESETS[peptide.nameEn];

  const calc = useMemo(() => {
    if (!preset) return null;
    const concentrationMcgPerMl = (preset.vialMg * 1000) / preset.waterMl;
    const volumeMl = preset.dose / concentrationMcgPerMl;
    return {
      syringeUnits: volumeMl * 100,
      dosesPerVial: Math.floor((preset.vialMg * 1000) / preset.dose),
    };
  }, [preset]);

  if (!preset || !calc) return null;
  const { syringeUnits, dosesPerVial } = calc;

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-stone-900">حاسبة سريعة — {peptide.nameEn}</h3>
        </div>
        <p className="mt-1 me-7 text-xs text-stone-500">بناءً على الجرعة الموصى بها ({preset.dose} mcg)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center">
          <p className="text-xs text-stone-500 mb-1">الجرعة</p>
          <p className="text-lg font-black text-stone-900">{preset.dose} <span className="text-xs font-bold">mcg</span></p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center">
          <p className="text-xs text-stone-500 mb-1">اسحب في السيرنج (1مل)</p>
          <p className="text-lg font-black text-emerald-700">{syringeUnits.toFixed(1)} <span className="text-xs font-bold">وحدة</span></p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center">
          <p className="text-xs text-stone-500 mb-1">عدد الجرعات/قارورة</p>
          <p className="text-lg font-black text-stone-900">{dosesPerVial}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center">
          <p className="text-xs text-stone-500 mb-1">القارورة</p>
          <p className="text-lg font-black text-stone-900">{preset.vialMg} <span className="text-xs font-bold">mg</span> + {preset.waterMl} <span className="text-xs font-bold">ml</span></p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-stone-500">
        بقارورة {preset.vialMg}mg مع {preset.waterMl}ml ماء بكتيريوستاتي — {dosesPerVial} جرعة لكل قارورة
      </p>
    </div>
  );
}

function PeptideExperiences({ peptideNameEn }: { peptideNameEn: string }) {
  const [experiences, setExperiences] = useState<{ id: string; results: string; rating: number; duration_weeks: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('community_logs')
      .select('id, results, rating, duration_weeks, created_at')
      .eq('peptide_name', peptideNameEn)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!mounted) return;
        if (data) setExperiences(data);
        setLoading(false);
      }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [peptideNameEn]);

  if (loading) return (
    <div className="mt-8 space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
      <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
    </div>
  );
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
