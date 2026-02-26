import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, AlertTriangle, CheckCircle, Lock, Calculator, Bot, FlaskConical, Printer, MessageSquare, Star, Syringe, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { peptides } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PRICING } from '@/lib/constants';

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
  const navigate = useNavigate();
  const isPaid = !isLoading && (subscription?.isPaidSubscriber ?? false);
  const isTrial = !isLoading && (subscription?.isTrial ?? false);

  const peptide = useMemo(() => peptides.find((p) => p.id === id), [id]);

  if (!peptide) {
    return <Navigate to="/library" replace />;
  }

  const isFreeContent = peptide.isFree;
  const trialPeptideIds = ['semaglutide', 'bpc-157', 'cjc-1295', 'ipamorelin', 'semax', 'epithalon'];
  const hasAccess = isPaid || isFreeContent || (isTrial && trialPeptideIds.includes(peptide.id));
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
    <div className="min-h-screen" >
      <Helmet>
        <title>{peptide.nameAr} — {peptide.nameEn} | pptides</title>
        <meta name="description" content={peptide.summaryAr} />
        <meta property="og:title" content={`${peptide.nameAr} — ${peptide.nameEn} | Peptide Guide`} />
        <meta property="og:description" content={peptide.summaryAr} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://pptides.com/peptide/${peptide.id}`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${peptide.nameAr} — ${peptide.nameEn}`} />
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
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/library')}
            className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-stone-800 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </button>
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
                      text: peptide.summaryAr.slice(0, 200),
                      url: window.location.href,
                    };
                    if (navigator.share) {
                      try { await navigator.share(shareData); } catch { /* expected */ }
                    } else {
                      await navigator.clipboard.writeText(window.location.href);
                      toast.success('تم نسخ الرابط');
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  مشاركة
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  طباعة
                </button>
              </div>
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

          {/* Inline Quick Dose Calculator */}
          <InlineDoseCalc peptide={peptide} />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              to={`/calculator?peptide=${encodeURIComponent(peptide.nameEn)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md"
            >
              <Calculator className="h-4 w-4" />
              حاسبة متقدمة
            </Link>
            <Link
              to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-bold text-stone-800 transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <Bot className="h-4 w-4" />
              اسأل المدرب
            </Link>
            <Link
              to={`/tracker?peptide=${encodeURIComponent(peptide.nameEn)}`}
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
        </>) : (
          /* ── Locked peptide, non-subscriber: compelling CTA ── */
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
            <div className="flex flex-col items-center gap-6 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-stone-900">البروتوكول الكامل لـ {peptide.nameAr}</p>
                <p className="mt-2 text-sm text-stone-600">اشترك لفتح كل التفاصيل:</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right w-full max-w-sm">
                {['الجرعة الدقيقة بوحدات السيرنج', 'التوقيت المثالي للحقن', 'مدة الدورة والراحة', 'الأعراض الجانبية الحقيقية', 'أفضل التجميعات', 'التحاليل المطلوبة'].map(item => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-stone-200">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="text-xs text-stone-700">{item}</span>
                  </div>
                ))}
              </div>
              {peptide.costEstimate && (
                <p className="text-xs text-stone-500">التكلفة التقريبية: <strong className="text-stone-800">{peptide.costEstimate}</strong></p>
              )}
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <Link
                  to="/pricing"
                  className="rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 text-center"
                >
                  افتح البروتوكول — {PRICING.essentials.label}/شهريًا
                </Link>
                <Link
                  to={`/coach?peptide=${encodeURIComponent(peptide.nameAr)}`}
                  className="rounded-full border-2 border-emerald-300 px-8 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50 text-center"
                >
                  اسأل المدرب الذكي عن {peptide.nameAr} مجانًا
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const DOSE_PRESETS: Record<string, { dose: number; vialMg: number; waterMl: number; minDose: number; maxDose: number }> = {
  'BPC-157': { dose: 250, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 500 },
  'TB-500': { dose: 750, vialMg: 5, waterMl: 2, minDose: 250, maxDose: 1500 },
  'Semaglutide': { dose: 250, vialMg: 5, waterMl: 2, minDose: 250, maxDose: 2400 },
  'CJC-1295': { dose: 100, vialMg: 2, waterMl: 2, minDose: 50, maxDose: 300 },
  'Ipamorelin': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  'Tesamorelin': { dose: 2000, vialMg: 2, waterMl: 2, minDose: 1000, maxDose: 2000 },
  'PT-141': { dose: 1750, vialMg: 10, waterMl: 2, minDose: 500, maxDose: 2000 },
  'Semax': { dose: 400, vialMg: 3, waterMl: 1, minDose: 200, maxDose: 1000 },
  'Epithalon': { dose: 5000, vialMg: 10, waterMl: 2, minDose: 2500, maxDose: 10000 },
  'AOD-9604': { dose: 300, vialMg: 5, waterMl: 2, minDose: 200, maxDose: 600 },
  'GHK-Cu': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 500 },
  'Kisspeptin-10': { dose: 100, vialMg: 5, waterMl: 2, minDose: 50, maxDose: 200 },
  'Tirzepatide': { dose: 2500, vialMg: 5, waterMl: 2, minDose: 2500, maxDose: 15000 },
  'Retatrutide': { dose: 1000, vialMg: 5, waterMl: 2, minDose: 1000, maxDose: 12000 },
  'Sermorelin': { dose: 300, vialMg: 5, waterMl: 2, minDose: 200, maxDose: 300 },
  'GHRP-2': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  'GHRP-6': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  'Hexarelin': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 200 },
  'IGF-1 LR3': { dose: 50, vialMg: 1, waterMl: 1, minDose: 20, maxDose: 100 },
  'Follistatin 344': { dose: 100, vialMg: 1, waterMl: 1, minDose: 50, maxDose: 100 },
  'GnRH / Triptorelin': { dose: 100, vialMg: 2, waterMl: 1, minDose: 50, maxDose: 100 },
  'P21': { dose: 750, vialMg: 5, waterMl: 2, minDose: 500, maxDose: 1000 },
  'DSIP': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  'SS-31 / Elamipretide': { dose: 20000, vialMg: 10, waterMl: 2, minDose: 5000, maxDose: 40000 },
  'MOTS-c': { dose: 5000, vialMg: 10, waterMl: 2, minDose: 5000, maxDose: 10000 },
  'Thymalin': { dose: 10000, vialMg: 10, waterMl: 2, minDose: 5000, maxDose: 10000 },
  'Thymosin Alpha-1': { dose: 1600, vialMg: 5, waterMl: 1, minDose: 800, maxDose: 3200 },
  'KPV': { dose: 500, vialMg: 5, waterMl: 2, minDose: 200, maxDose: 500 },
  'LL-37': { dose: 200, vialMg: 5, waterMl: 2, minDose: 100, maxDose: 200 },
  'ARA-290': { dose: 2000, vialMg: 5, waterMl: 2, minDose: 2000, maxDose: 4000 },
  'Selank': { dose: 300, vialMg: 5, waterMl: 1, minDose: 100, maxDose: 500 },
};

function InlineDoseCalc({ peptide }: { peptide: { nameEn: string } }) {
  const preset = DOSE_PRESETS[peptide.nameEn];
  if (!preset) return null;

  const concentrationMcgPerMl = (preset.vialMg * 1000) / preset.waterMl;
  const volumeMl = preset.dose / concentrationMcgPerMl;
  const syringeUnits = volumeMl * 100;
  const dosesPerVial = Math.floor((preset.vialMg * 1000) / preset.dose);

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-stone-900">حاسبة سريعة — {peptide.nameEn}</h3>
        </div>
        <p className="mt-1 mr-7 text-xs text-stone-500">بناءً على الجرعة الموصى بها ({preset.dose} mcg)</p>
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
    setLoading(true);
    const safeName = peptideNameEn.replace(/[%_]/g, '');
    supabase
      .from('community_logs')
      .select('id, results, rating, duration_weeks, created_at')
      .ilike('peptide_name', `%${safeName}%`)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!mounted) return;
        if (data) setExperiences(data);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [peptideNameEn]);

  if (loading || experiences.length === 0) return null;

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
