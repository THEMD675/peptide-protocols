import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Shield, AlertTriangle, CheckCircle, Lock, Calculator, Bot, FlaskConical, Printer, MessageSquare, Star, Syringe, Play, ExternalLink, BookOpen, Heart, Newspaper } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import ProtocolWizard from '@/components/ProtocolWizard';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { peptides, categories } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PRICING, TRIAL_PEPTIDE_IDS, SITE_URL, PEPTIDE_COUNT } from '@/lib/constants';
import { DOSE_PRESETS_MAP as DOSE_PRESETS } from '@/data/dose-presets';
import { evidenceColors, evidenceLabels, categoryLabels, categoryIcons } from '@/lib/peptide-labels';
import ShareButtons from '@/components/ShareButtons';

interface ProtocolRow {
  label: string;
  value: string;
  highlight?: boolean;
}


export default function PeptideDetail() {
  const { id } = useParams<{ id: string }>();
  const { subscription, isLoading } = useAuth();
  const isPaid = !isLoading && (subscription?.isPaidSubscriber ?? false);
  const isTrial = !isLoading && (subscription?.isTrial ?? false);

  const peptide = useMemo(() => peptides.find((p) => p.id === id), [id]);
  const [showProtocolWizard, setShowProtocolWizard] = useState(false);
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!peptide) return;
    try {
      const recent = JSON.parse(localStorage.getItem('pptides_recent_peptides') ?? '[]');
      const updated = [peptide.id, ...recent.filter((rid: string) => rid !== peptide.id)].slice(0, 10);
      localStorage.setItem('pptides_recent_peptides', JSON.stringify(updated));
    } catch { /* expected */ }
  }, [peptide]);

  const similarPeptides = useMemo(() => {
    if (!peptide) return [];
    const sameCategory = peptides.filter((p) => p.id !== peptide.id && p.category === peptide.category);
    if (sameCategory.length >= 3) return sameCategory.slice(0, 4);
    const relatedCategoryMap: Record<string, string[]> = {
      metabolic: ['hormonal', 'recovery'],
      recovery: ['hormonal', 'metabolic'],
      hormonal: ['recovery', 'metabolic'],
      brain: ['longevity', 'recovery'],
      longevity: ['brain', 'skin-gut'],
      'skin-gut': ['longevity', 'recovery'],
    };
    const relatedCats = relatedCategoryMap[peptide.category] ?? [];
    const extras = peptides.filter((p) => p.id !== peptide.id && p.category !== peptide.category && relatedCats.includes(p.category));
    return [...sameCategory, ...extras].slice(0, 4);
  }, [peptide]);

  if (!peptide) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <Helmet>
          <title>الببتيد غير موجود | pptides</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">الببتيد غير موجود</h1>
        <p className="mb-6 text-stone-600 dark:text-stone-300">لم يتم العثور على ببتيد بهذا المعرّف.</p>
        <Link to="/library" className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors">
          تصفّح المكتبة
        </Link>
      </div>
    );
  }

  const isFreeContent = peptide.isFree;
  const hasAccess = isPaid || isFreeContent || (isTrial && TRIAL_PEPTIDE_IDS.has(peptide.id));
  const firstSentence = peptide.summaryAr.split('.')[0] + '.';

  const evidenceMeter: { label: string; cls: string } = ({
    excellent: { label: 'أدلة قوية (تجارب سريرية)', cls: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' },
    strong: { label: 'أدلة قوية (تجارب سريرية)', cls: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' },
    good: { label: 'أدلة قوية (تجارب سريرية)', cls: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' },
    moderate: { label: 'أدلة متوسطة (دراسات أولية)', cls: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' },
    weak: { label: 'أدلة محدودة (بحوث حيوانية)', cls: 'border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300' },
    'very-weak': { label: 'أدلة محدودة (بحوث حيوانية)', cls: 'border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300' },
  } as Record<string, { label: string; cls: string }>)[peptide.evidenceLevel] ?? { label: 'أدلة محدودة', cls: 'border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300' };

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
        <title>{`${peptide.nameAr === peptide.nameEn ? peptide.nameAr : `${peptide.nameAr} | ${peptide.nameEn}`} | pptides`}</title>
        <meta name="description" content={`بروتوكول ${peptide.nameAr} — الجرعة، التوقيت، الأعراض الجانبية، مستوى الأدلة. ${PEPTIDE_COUNT}+ ببتيد في مكتبة pptides.`} />
        <meta property="og:title" content={`${peptide.nameAr === peptide.nameEn ? peptide.nameAr : `${peptide.nameAr} | ${peptide.nameEn}`} | pptides`} />
        <meta property="og:description" content={peptide.summaryAr} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/peptide/${peptide.id}`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <link rel="canonical" href={`${SITE_URL}/peptide/${peptide.id}`} />
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
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": SITE_URL },
            { "@type": "ListItem", "position": 2, "name": "المكتبة", "item": `${SITE_URL}/library` },
            { "@type": "ListItem", "position": 3, "name": categoryLabels[peptide.category] ?? peptide.category, "item": `${SITE_URL}/library?category=${peptide.category}` },
            { "@type": "ListItem", "position": 4, "name": peptide.nameAr, "item": `${SITE_URL}/peptide/${peptide.id}` },
          ],
        })}</script>
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
        {/* Breadcrumbs */}
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-300" aria-label="breadcrumb">
          <Link to="/library" className="hover:text-emerald-700 transition-colors">المكتبة</Link>
          <span>/</span>
          <Link to={`/library?category=${peptide.category}`} className="hover:text-emerald-700 transition-colors">{categoryLabels[peptide.category] ?? peptide.category}</Link>
          <span>/</span>
          <span className="text-stone-800 dark:text-stone-200 font-medium">{peptide.nameAr}</span>
        </nav>

        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
          محتوى تعليمي — استشر طبيبك قبل استخدام أي ببتيد
        </div>

        {/* Warning Banner — subscribers only */}
        {peptide.warningAr && hasAccess && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm leading-relaxed text-red-700 dark:text-red-400">
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
              <p className="mt-1 text-lg text-stone-800 dark:text-stone-200">{peptide.nameEn}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { toggleBookmark(peptide.id); }}
                className={cn(
                  'flex items-center justify-center rounded-full p-2.5 min-h-[44px] min-w-[44px] transition-all',
                  isBookmarked(peptide.id)
                    ? 'text-red-500 hover:text-red-600 scale-110'
                    : 'text-stone-400 hover:text-red-400',
                )}
                aria-label={isBookmarked(peptide.id) ? 'إزالة من المحفوظات' : 'حفظ الببتيد'}
              >
                <Heart className={cn('h-6 w-6 transition-all', isBookmarked(peptide.id) && 'fill-current animate-pulse')} />
              </button>
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
                <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs text-stone-600 dark:text-stone-300">
                  تحديث: {peptide.lastUpdated}
                </span>
              )}
              {peptide.difficulty && (
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium border',
                  peptide.difficulty === 'beginner' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                  peptide.difficulty === 'intermediate' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                  'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                )}>
                  {peptide.difficulty === 'beginner' ? 'مبتدئ' : peptide.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
                </span>
              )}
            </div>
          </div>

          {/* WC28: Prominent evidence meter */}
          <div className={cn('mt-3 flex items-center gap-3 rounded-xl border px-4 py-2.5', evidenceMeter.cls)}>
            <FlaskConical className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">{evidenceMeter.label}</p>
              {peptide.lastUpdated && (
                <p className="text-xs opacity-75">آخر مراجعة: {peptide.lastUpdated}</p>
              )}
            </div>
          </div>

          {peptide.costEstimate && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-2">
              <span className="text-xs text-stone-500 dark:text-stone-300">التكلفة التقريبية:</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">{peptide.costEstimate}</span>
            </div>
          )}

          <p className="mt-4 text-base leading-relaxed text-stone-800 dark:text-stone-200">
            {hasAccess || isFreeContent ? peptide.summaryAr : firstSentence}
          </p>
        </div>

        {/* Protocol Content */}
        {hasAccess ? (<>
          {/* ── Subscriber: full protocol ── */}
          <div
            className="overflow-hidden rounded-2xl border border-stone-300 dark:border-stone-600"
          >
            <div className="border-b border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
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
                <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                  {peptide.evidenceAr}
                </p>
              </div>
              <details className="mt-2 text-xs text-stone-500 dark:text-stone-300">
                <summary className="cursor-pointer hover:text-emerald-700">ماذا تعني مستويات الدليل؟</summary>
                <ul className="mt-1 space-y-1 ps-4 list-disc">
                  <li>ممتاز: تجارب سريرية كبرى متعددة + اعتماد FDA</li>
                  <li>قوي: عدة دراسات بشرية أو بيانات ما قبل سريرية واسعة</li>
                  <li>متوسط / جيد: دراسات محدودة أو بيانات حيوانية قوية</li>
                  <li>ضعيف: تقارير حالة أو بيانات أولية فقط</li>
                </ul>
              </details>
            </div>

            <div
              className="flex items-center justify-between bg-stone-50/95 dark:bg-stone-800/95 px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4"  />
                <h2 className="text-base font-bold">
                  بطاقة البروتوكول
                </h2>
              </div>
              <div className="print:hidden flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2.5 min-h-[44px] text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
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
                      'border-b border-stone-200 dark:border-stone-600 last:border-b-0',
                      i % 2 === 0 ? 'bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600' : 'bg-transparent',
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        'w-[35%] px-5 py-4 align-top text-sm font-semibold text-start',
                        row.highlight ? 'text-emerald-700' : 'text-stone-800 dark:text-stone-200',
                      )}
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {/* Share This Peptide */}
          <div className="mt-6 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-5">
            <p className="mb-3 text-sm font-bold text-stone-700 dark:text-stone-200">شارك هذا البروتوكول:</p>
            <ShareButtons
              url={`${SITE_URL}/peptide/${peptide.id}`}
              title={`${peptide.nameAr} (${peptide.nameEn}) — بروتوكول كامل على pptides.com`}
              description={peptide.summaryAr.slice(0, 200)}
              showTelegram={true}
            />
          </div>

          {/* Inline Quick Dose Calculator */}
          <InlineDoseCalc peptide={peptide} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to={`/calculator?peptide=${encodeURIComponent(peptide.nameEn)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:bg-emerald-900/30 hover:shadow-md"
            >
              <Calculator className="h-4 w-4" />
              حاسبة متقدمة
            </Link>
            <Link
              to={`/interactions?p1=${peptide.id}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3.5 text-sm font-bold text-stone-800 dark:text-stone-200 transition-all hover:border-emerald-200 dark:border-emerald-800 hover:shadow-md"
            >
              <Shield className="h-4 w-4" />
              فحص التعارضات
            </Link>
            <Link
              to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3.5 text-sm font-bold text-stone-800 dark:text-stone-200 transition-all hover:border-emerald-200 dark:border-emerald-800 hover:shadow-md"
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
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3.5 text-sm font-bold text-stone-800 dark:text-stone-200 transition-all hover:border-emerald-200 dark:border-emerald-800 hover:shadow-md"
            >
              <ArrowRight className="h-4 w-4" />
              سجّل حقنة
            </Link>
          </div>

          {/* الخطوة التالية */}
          <div className="mt-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-l from-emerald-50 to-white dark:to-stone-950 p-6">
            <h3 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">الخطوة التالية</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                to={`/calculator?peptide=${encodeURIComponent(peptide.nameEn)}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                <Calculator className="h-4 w-4" />
                احسب جرعتك
              </Link>
              <button
                onClick={() => setShowProtocolWizard(true)}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 px-5 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-50 dark:bg-emerald-900/20"
              >
                <Play className="h-4 w-4" />
                ابدأ البروتوكول
              </button>
              <Link
                to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 px-5 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-50 dark:bg-emerald-900/20"
              >
                <Bot className="h-4 w-4" />
                اسأل المدرب
              </Link>
            </div>
          </div>

          {similarPeptides.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
                <FlaskConical className="h-5 w-5 text-emerald-700" />
                ببتيدات مشابهة
              </h3>
              {/* Horizontal scroll on mobile, grid on desktop */}
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:pb-0">
                {similarPeptides.map((rp) => {
                  const CatIcon = categoryIcons[rp.category];
                  return (
                    <Link
                      key={rp.id}
                      to={`/peptide/${rp.id}`}
                      className="group flex-shrink-0 w-[75vw] max-w-[280px] snap-start md:w-auto md:max-w-none rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-600/10 hover:-translate-y-0.5"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 rounded-full border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-200">
                          {CatIcon && <CatIcon className="h-3 w-3" />}
                          {categoryLabels[rp.category]}
                        </span>
                        {rp.fdaApproved && (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            FDA
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors truncate">{rp.nameAr}</h4>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-300">{rp.nameEn}</p>
                      <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300 line-clamp-2">{rp.descriptionAr ?? rp.summaryAr}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Blog Posts */}
          <RelatedBlogPosts peptideNameEn={peptide.nameEn} peptideNameAr={peptide.nameAr} />

          {/* Scientific References */}
          {peptide.pubmedIds && peptide.pubmedIds.length > 0 && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">
                <BookOpen className="h-5 w-5 text-emerald-700" />
                المراجع العلمية
              </h3>
              <div className="space-y-2">
                {peptide.pubmedIds.map((pmid) => (
                  <a
                    key={pmid}
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-3 text-sm text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:shadow-sm dark:shadow-stone-900/30"
                    dir="ltr"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>PubMed: {pmid}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Community experiences for this peptide */}
          <PeptideExperiences peptideNameEn={peptide.nameEn} />
        </>) : (<>
          {/* ── Locked peptide: tease first rows, blur rest with inline CTA ── */}
          <div className="overflow-hidden rounded-2xl border border-stone-300 dark:border-stone-600">
            <div
              className="flex items-center justify-between bg-stone-50/95 dark:bg-stone-800/95 px-5 py-3"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <h2 className="text-base font-bold">بطاقة البروتوكول</h2>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
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
                        'border-b border-stone-200 dark:border-stone-600 last:border-b-0',
                        i % 2 === 0 ? 'bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600' : 'bg-transparent',
                      )}
                    >
                      <th
                        scope="row"
                        className={cn(
                          'w-[35%] px-5 py-4 align-top text-sm font-semibold text-start',
                          row.highlight ? 'text-emerald-700' : 'text-stone-800 dark:text-stone-200',
                        )}
                      >
                        {row.label}
                      </th>
                      <td className="px-5 py-4 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
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
                          'border-b border-stone-200 dark:border-stone-600 last:border-b-0',
                          (i + 3) % 2 === 0 ? 'bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600' : 'bg-transparent',
                        )}
                      >
                        <th scope="row" className="w-[35%] px-5 py-4 align-top text-sm font-semibold text-start text-stone-800 dark:text-stone-200">
                          {row.label}
                        </th>
                        <td className="px-5 py-4 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white dark:from-stone-950/60 to-white dark:to-stone-950/90">
                <Lock className="h-6 w-6 text-emerald-700 mb-2" />
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">اشترك لعرض البروتوكول الكامل</p>
                <p className="text-xs text-stone-500 dark:text-stone-300 mb-3">الجرعة، التوقيت، الدورة، الأعراض الجانبية والمزيد</p>
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
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 px-5 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-50 dark:bg-emerald-900/20"
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
    <div className="mt-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-emerald-700" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">حاسبة سريعة — {peptide.nameEn}</h3>
        </div>
        <p className="mt-1 me-7 text-xs text-stone-500 dark:text-stone-300">بناءً على الجرعة الموصى بها ({preset.dose} mcg)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-3 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-300 mb-1">الجرعة</p>
          <p className="text-lg font-black text-stone-900 dark:text-stone-100">{preset.dose} <span className="text-xs font-bold">mcg</span></p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-3 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-300 mb-1">اسحب في السيرنج (1مل)</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{syringeUnits.toFixed(1)} <span className="text-xs font-bold">وحدة</span></p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-3 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-300 mb-1">عدد الجرعات/قارورة</p>
          <p className="text-lg font-black text-stone-900 dark:text-stone-100">{dosesPerVial}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-3 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-300 mb-1">القارورة</p>
          <p className="text-lg font-black text-stone-900 dark:text-stone-100">{preset.vialMg} <span className="text-xs font-bold">mg</span> + {preset.waterMl} <span className="text-xs font-bold">ml</span></p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-300">
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
      <div className="h-6 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
      <div className="h-20 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
    </div>
  );
  if (experiences.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
          <MessageSquare className="h-5 w-5 text-emerald-700" />
          تجارب المستخدمين
        </h3>
        <div className="flex items-center gap-3">
          <Link to={`/community?peptide=${encodeURIComponent(peptideNameEn)}`} className="text-xs font-semibold text-emerald-700 hover:underline">
            شارك تجربتك
          </Link>
          <Link to="/community" className="text-xs font-semibold text-stone-500 dark:text-stone-300 hover:text-emerald-700 hover:underline">عرض الكل</Link>
        </div>
      </div>
      <div className="space-y-3">
        {experiences.map(exp => (
          <div key={exp.id} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('h-3.5 w-3.5', s <= exp.rating ? 'fill-emerald-500 text-emerald-500' : 'text-stone-300')} />
                ))}
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-300">{exp.duration_weeks} أسابيع</span>
            </div>
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed line-clamp-3">{exp.results}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedBlogPosts({ peptideNameEn, peptideNameAr }: { peptideNameEn: string; peptideNameAr: string }) {
  const [posts, setPosts] = useState<{ id: string; slug: string; title_ar: string; excerpt_ar: string; published_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Search for blog posts whose tags overlap with the peptide name
    const searchTerms = [peptideNameEn.toLowerCase(), peptideNameAr];
    (async () => {
      try {
        // Fetch published blog posts and filter by tag overlap client-side
        const { data } = await supabase
          .from('blog_posts')
          .select('id, slug, title_ar, excerpt_ar, published_at, tags')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(50);

        if (!mounted) return;
        if (data) {
          const matched = data.filter((post: { tags?: string[] }) => {
            if (!post.tags || !Array.isArray(post.tags)) return false;
            return post.tags.some((tag: string) =>
              searchTerms.some((term) => tag.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(tag.toLowerCase()))
            );
          }).slice(0, 3);
          setPosts(matched);
        }
      } catch {
        // silently fail
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [peptideNameEn, peptideNameAr]);

  if (loading) return (
    <div className="mt-8 space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
      <div className="h-20 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
    </div>
  );
  if (posts.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
        <Newspaper className="h-5 w-5 text-emerald-700" />
        مقالات ذات صلة
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="group rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-600/10 hover:-translate-y-0.5"
          >
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors line-clamp-2">{post.title_ar}</h4>
            <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300 line-clamp-2">{post.excerpt_ar}</p>
            <p className="mt-3 text-xs text-stone-400 dark:text-stone-300">{new Date(post.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
