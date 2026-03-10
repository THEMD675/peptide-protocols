import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  TestTube, AlertTriangle, Calendar, ClipboardList, Heart, Brain,
  Droplets, Activity, FlaskConical, ArrowLeft, MapPin, ChevronDown,
  ChevronUp, Search, CheckCircle, Info, Package, Clock, Building2,
  Beaker, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL } from '@/lib/constants';
import { labTests, peptides } from '@/data/peptides';
import { GenericPageSkeleton } from '@/components/Skeletons';

// ═══════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════

interface BiomarkerInfo {
  id: string;
  name: string;
  nameAr: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  absMin: number;
  absMax: number;
  category: string;
  categoryAr: string;
  lowImplication: string;
  highImplication: string;
  relatedPeptides: string[];
  whenToTest: string;
}

const biomarkers: BiomarkerInfo[] = [
  {
    id: 'igf1', name: 'IGF-1', nameAr: 'عامل النمو الشبيه بالأنسولين',
    unit: 'ng/mL', normalMin: 200, normalMax: 300, absMin: 50, absMax: 500,
    category: 'hormones', categoryAr: 'هرمونات',
    lowImplication: 'قد يدل على نقص هرمون النمو أو سوء التغذية',
    highImplication: 'ارتفاع مفرط مرتبط بخطر الأورام — يجب تقليل الجرعة',
    relatedPeptides: ['CJC-1295', 'Ipamorelin', 'MK-677', 'GHRP-6', 'Sermorelin'],
    whenToTest: 'قبل البدء، بعد 8 أسابيع، ثم كل 12 أسبوع',
  },
  {
    id: 'testosterone', name: 'Total Testosterone', nameAr: 'التستوستيرون الكلي',
    unit: 'ng/dL', normalMin: 300, normalMax: 1000, absMin: 50, absMax: 1500,
    category: 'hormones', categoryAr: 'هرمونات',
    lowImplication: 'قد يسبب تعب، ضعف جنسي، فقدان عضلات',
    highImplication: 'قد يسبب عدوانية، حب شباب، تضخم البروستاتا',
    relatedPeptides: ['Kisspeptin-10', 'GnRH', 'Gonadorelin'],
    whenToTest: 'قبل البدء صباحاً (8-10 صباحاً)، بعد 4-6 أسابيع',
  },
  {
    id: 'prolactin', name: 'Prolactin', nameAr: 'البرولاكتين',
    unit: 'ng/mL', normalMin: 2, normalMax: 20, absMin: 0, absMax: 60,
    category: 'hormones', categoryAr: 'هرمونات',
    lowImplication: 'عادة لا يمثل مشكلة سريرية',
    highImplication: 'يثبّط التستوستيرون، قد يسبب تثدّي وضعف جنسي',
    relatedPeptides: ['GHRP-2', 'GHRP-6', 'Hexarelin'],
    whenToTest: 'عند استخدام GHRPs، كل 8 أسابيع',
  },
  {
    id: 'fasting-glucose', name: 'Fasting Glucose', nameAr: 'سكر صائم',
    unit: 'mg/dL', normalMin: 70, normalMax: 100, absMin: 40, absMax: 200,
    category: 'metabolic', categoryAr: 'أيض',
    lowImplication: 'هبوط السكر — دوخة، تعرق، رجفة',
    highImplication: 'مقاومة أنسولين أو بداية سكري — راجع طبيبك',
    relatedPeptides: ['Semaglutide', 'Tirzepatide', 'MK-677'],
    whenToTest: 'قبل البدء، كل 12 أسبوع أثناء الاستخدام',
  },
  {
    id: 'hba1c', name: 'HbA1c', nameAr: 'السكر التراكمي',
    unit: '%', normalMin: 4.0, normalMax: 5.6, absMin: 3.0, absMax: 10.0,
    category: 'metabolic', categoryAr: 'أيض',
    lowImplication: 'نادر — قد يدل على فقر دم أو نزيف مزمن',
    highImplication: 'فوق 5.7% = ما قبل السكري، فوق 6.5% = سكري',
    relatedPeptides: ['Semaglutide', 'Tirzepatide'],
    whenToTest: 'قبل البدء، كل 3 أشهر',
  },
  {
    id: 'alt', name: 'ALT', nameAr: 'إنزيم الكبد ALT',
    unit: 'U/L', normalMin: 7, normalMax: 56, absMin: 0, absMax: 200,
    category: 'liver', categoryAr: 'كبد',
    lowImplication: 'عادة طبيعي ولا يمثل قلقاً',
    highImplication: 'أعلى من ضعف الحد = توقف فوراً واستشر طبيب',
    relatedPeptides: ['BPC-157', 'أي ببتيد فموي'],
    whenToTest: 'قبل البدء، كل 12 أسبوع',
  },
  {
    id: 'ast', name: 'AST', nameAr: 'إنزيم الكبد AST',
    unit: 'U/L', normalMin: 10, normalMax: 40, absMin: 0, absMax: 200,
    category: 'liver', categoryAr: 'كبد',
    lowImplication: 'عادة طبيعي',
    highImplication: 'ارتفاع مع ALT = ضرر كبدي محتمل — توقف واستشر طبيب',
    relatedPeptides: ['BPC-157', 'أي ببتيد فموي'],
    whenToTest: 'قبل البدء، كل 12 أسبوع',
  },
  {
    id: 'creatinine', name: 'Creatinine', nameAr: 'الكرياتينين',
    unit: 'mg/dL', normalMin: 0.7, normalMax: 1.3, absMin: 0.2, absMax: 3.0,
    category: 'kidney', categoryAr: 'كلى',
    lowImplication: 'قد يدل على نقص كتلة عضلية',
    highImplication: 'قد يدل على ضعف وظائف الكلى',
    relatedPeptides: ['جميع الببتيدات (مراقبة عامة)'],
    whenToTest: 'قبل البدء، كل 12 أسبوع',
  },
  {
    id: 'egfr', name: 'eGFR', nameAr: 'معدل الترشيح الكبيبي',
    unit: 'mL/min', normalMin: 90, normalMax: 120, absMin: 15, absMax: 150,
    category: 'kidney', categoryAr: 'كلى',
    lowImplication: 'أقل من 60 = ضعف كلوي — استشر طبيب فوراً',
    highImplication: 'عادة لا يمثل مشكلة',
    relatedPeptides: ['جميع الببتيدات (مراقبة عامة)'],
    whenToTest: 'قبل البدء، كل 12 أسبوع',
  },
  {
    id: 'tsh', name: 'TSH', nameAr: 'هرمون الغدة الدرقية',
    unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0, absMin: 0.0, absMax: 12.0,
    category: 'thyroid', categoryAr: 'غدة درقية',
    lowImplication: 'فرط نشاط الغدة الدرقية — خفقان، فقدان وزن',
    highImplication: 'خمول الغدة الدرقية — تعب، زيادة وزن',
    relatedPeptides: ['CJC-1295', 'MK-677', 'Semaglutide'],
    whenToTest: 'قبل البدء، كل 6 أشهر',
  },
  {
    id: 'vitd', name: 'Vitamin D', nameAr: 'فيتامين د',
    unit: 'ng/mL', normalMin: 50, normalMax: 80, absMin: 5, absMax: 120,
    category: 'immunity', categoryAr: 'مناعة',
    lowImplication: 'نقص المناعة، ضعف العظام، إرهاق مزمن',
    highImplication: 'تسمم فيتامين D — نادر لكن خطير',
    relatedPeptides: ['LL-37', 'Thymosin Alpha-1'],
    whenToTest: 'قبل البدء، كل 6 أشهر',
  },
  {
    id: 'hscrp', name: 'hs-CRP', nameAr: 'بروتين سي التفاعلي',
    unit: 'mg/L', normalMin: 0, normalMax: 1.0, absMin: 0, absMax: 10,
    category: 'inflammation', categoryAr: 'التهاب',
    lowImplication: 'ممتاز — لا يوجد التهاب نظامي',
    highImplication: 'التهاب مزمن — خطر على القلب والأوعية',
    relatedPeptides: ['BPC-157', 'KPV', 'Thymosin Beta-4'],
    whenToTest: 'قبل البدء، كل 12 أسبوع',
  },
];

const testPackages = [
  {
    id: 'basic',
    nameAr: 'الفحص الأساسي',
    price: '~200 ر.س',
    color: 'emerald',
    icon: '🩸',
    tests: ['CBC', 'ALT', 'AST', 'Creatinine', 'eGFR', 'Fasting Glucose'],
    testsAr: ['تعداد دم كامل', 'إنزيمات الكبد', 'وظائف الكلى', 'سكر صائم'],
    description: 'الحد الأدنى لأي شخص يبدأ بالببتيدات — يغطي السلامة الأساسية',
    recommended: 'لجميع المستخدمين',
  },
  {
    id: 'peptide',
    nameAr: 'فحص الببتيدات',
    price: '~400 ر.س',
    color: 'blue',
    icon: '🧬',
    tests: ['CBC', 'ALT', 'AST', 'Creatinine', 'eGFR', 'Fasting Glucose', 'HbA1c', 'IGF-1', 'TSH', 'Free T3', 'Free T4', 'Total Cholesterol', 'LDL', 'HDL'],
    testsAr: ['كل الأساسي', 'IGF-1', 'الغدة الدرقية', 'الدهون', 'السكر التراكمي'],
    description: 'الفحص المثالي لمستخدمي ببتيدات هرمون النمو والأيض',
    recommended: 'لمستخدمي GH/GHRP/Semaglutide',
  },
  {
    id: 'comprehensive',
    nameAr: 'الفحص الشامل',
    price: '~700 ر.س',
    color: 'purple',
    icon: '🔬',
    tests: ['CBC', 'ALT', 'AST', 'GGT', 'Creatinine', 'BUN', 'eGFR', 'Fasting Glucose', 'Fasting Insulin', 'HbA1c', 'HOMA-IR', 'IGF-1', 'Total Testosterone', 'Free Testosterone', 'LH', 'FSH', 'Prolactin', 'TSH', 'Free T3', 'Free T4', 'Total Cholesterol', 'LDL', 'HDL', 'Triglycerides', 'Vitamin D', 'hs-CRP', 'Ferritin'],
    testsAr: ['كل شيء', 'هرمونات كاملة', 'أنسولين صائم', 'HOMA-IR', 'فيتامين د', 'الالتهاب', 'الحديد'],
    description: 'تغطية شاملة لجميع الببتيدات — الأفضل للمحترفين والبروتوكولات المتقدمة',
    recommended: 'للبروتوكولات المتقدمة والمتابعة الدورية',
  },
];

const timelineSteps = [
  {
    id: 'baseline',
    label: 'قبل البدء',
    labelEn: 'Baseline',
    week: 0,
    description: 'خط الأساس — جميع التحاليل الأساسية قبل أول جرعة',
    package: 'الفحص الشامل (مرة واحدة)',
    icon: '🔬',
    color: 'emerald',
  },
  {
    id: '6weeks',
    label: 'بعد 6 أسابيع',
    labelEn: '6 Weeks',
    week: 6,
    description: 'أول متابعة — التحقق من الاستجابة والسلامة',
    package: 'فحص الببتيدات',
    icon: '📊',
    color: 'blue',
  },
  {
    id: '3months',
    label: 'بعد 3 أشهر',
    labelEn: '3 Months',
    week: 12,
    description: 'إعادة تقييم شاملة — تعديل الجرعات حسب النتائج',
    package: 'الفحص الشامل',
    icon: '🔄',
    color: 'amber',
  },
  {
    id: '6months',
    label: 'بعد 6 أشهر',
    labelEn: '6 Months',
    week: 24,
    description: 'مراجعة نصف سنوية — تقييم فعالية البروتوكول',
    package: 'الفحص الشامل',
    icon: '📅',
    color: 'purple',
  },
  {
    id: 'post',
    label: 'بعد التوقف',
    labelEn: 'Post-Protocol',
    week: 30,
    description: 'فحص ما بعد البروتوكول — التأكد من عودة القيم لطبيعتها',
    package: 'فحص الببتيدات',
    icon: '✅',
    color: 'rose',
  },
];

const saudiLabs = [
  {
    name: 'معامل البرج',
    nameEn: 'Al Borg Laboratories',
    logo: '🏥',
    website: 'https://www.alborglaboratories.com',
    cities: ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'],
    basicPrice: '~180 ر.س',
    peptidePrice: '~380 ر.س',
    fullPrice: '~650 ر.س',
    notes: 'أكبر شبكة مختبرات في السعودية — عروض متكررة',
    homeVisit: true,
  },
  {
    name: 'مختبرات دلة',
    nameEn: 'Dallah Labs',
    logo: '🔬',
    website: 'https://www.dallahlabs.com',
    cities: ['الرياض', 'جدة', 'الخبر'],
    basicPrice: '~200 ر.س',
    peptidePrice: '~420 ر.س',
    fullPrice: '~720 ر.س',
    notes: 'جودة عالية — تقارير تفصيلية',
    homeVisit: true,
  },
  {
    name: 'مختبرات المختبر',
    nameEn: 'Al Mokhtar Labs',
    logo: '🧪',
    website: 'https://www.almokhtabar.com',
    cities: ['الرياض', 'جدة', 'الدمام', 'أبها'],
    basicPrice: '~190 ر.س',
    peptidePrice: '~390 ر.س',
    fullPrice: '~680 ر.س',
    notes: 'أسعار تنافسية — تطبيق سهل الاستخدام',
    homeVisit: true,
  },
];

const redFlags = [
  'ALT/AST أعلى من ضعف الحد الأعلى',
  'سكر صائم ≥ 126 باستمرار',
  'IGF-1 أعلى من 400',
  'TSH أعلى من 10 أو أقل من 0.1',
];

// ═══════════════════════════════════════════════════════════════
// Helper components
// ═══════════════════════════════════════════════════════════════

function getTestCategoryIcon(relatedCategories: string[]): { Icon: typeof Heart; color: string; bgColor: string } {
  if (relatedCategories.includes('hormonal')) return { Icon: Activity, color: 'text-purple-600', bgColor: 'bg-purple-100' };
  if (relatedCategories.includes('metabolic')) return { Icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-100' };
  if (relatedCategories.includes('brain')) return { Icon: Brain, color: 'text-amber-600', bgColor: 'bg-amber-100' };
  if (relatedCategories.includes('longevity')) return { Icon: Heart, color: 'text-rose-600', bgColor: 'bg-rose-100' };
  if (relatedCategories.includes('skin-gut')) return { Icon: FlaskConical, color: 'text-teal-600', bgColor: 'bg-teal-100' };
  return { Icon: TestTube, color: 'text-emerald-700', bgColor: 'bg-emerald-100' };
}

/** Visual bar showing where a value falls in the reference range */
function RangeBar({ biomarker, value }: { biomarker: BiomarkerInfo; value?: number }) {
  const { absMin, absMax, normalMin, normalMax } = biomarker;
  const range = absMax - absMin;
  const greenStart = ((normalMin - absMin) / range) * 100;
  const greenEnd = ((normalMax - absMin) / range) * 100;

  let markerPos: number | null = null;
  let markerColor = 'bg-emerald-400';
  if (value !== undefined && !isNaN(value)) {
    const clamped = Math.max(absMin, Math.min(absMax, value));
    markerPos = ((clamped - absMin) / range) * 100;
    if (value < normalMin) markerColor = 'bg-amber-400';
    else if (value > normalMax) markerColor = 'bg-red-400';
    else markerColor = 'bg-emerald-400';
  }

  return (
    <div className="relative h-4 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
      {/* Red low zone */}
      <div
        className="absolute inset-y-0 start-0 bg-red-300/40 dark:bg-red-900/30"
        style={{ width: `${greenStart}%` }}
      />
      {/* Green normal zone */}
      <div
        className="absolute inset-y-0 bg-emerald-400/40 dark:bg-emerald-600/30"
        style={{ left: `${greenStart}%`, width: `${greenEnd - greenStart}%` }}
      />
      {/* Red high zone */}
      <div
        className="absolute inset-y-0 end-0 bg-red-300/40 dark:bg-red-900/30"
        style={{ width: `${100 - greenEnd}%` }}
      />
      {/* Value marker */}
      {markerPos !== null && (
        <div
          className={cn('absolute top-0 h-full w-1.5 rounded-full shadow-md transition-all', markerColor)}
          style={{ left: `${markerPos}%`, transform: 'translateX(-50%)' }}
        />
      )}
    </div>
  );
}

function getValueStatus(value: number, biomarker: BiomarkerInfo): 'low' | 'normal' | 'high' {
  if (value < biomarker.normalMin) return 'low';
  if (value > biomarker.normalMax) return 'high';
  return 'normal';
}

function StatusBadge({ status }: { status: 'low' | 'normal' | 'high' }) {
  const config = {
    low: { label: 'منخفض', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    normal: { label: 'طبيعي', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    high: { label: 'مرتفع', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  };
  const c = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', c.className)}>
      {status === 'low' && <TrendingDown className="h-3 w-3" />}
      {status === 'normal' && <CheckCircle className="h-3 w-3" />}
      {status === 'high' && <TrendingUp className="h-3 w-3" />}
      {c.label}
    </span>
  );
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

// ═══════════════════════════════════════════════════════════════
// Section components
// ═══════════════════════════════════════════════════════════════

/** Section 1: Interactive Reference Ranges */
function InteractiveReferenceRanges({ isPro, blurClass }: { isPro: boolean; blurClass: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const categories = useMemo(() => {
    const cats = new Map<string, BiomarkerInfo[]>();
    for (const b of biomarkers) {
      const arr = cats.get(b.categoryAr) ?? [];
      arr.push(b);
      cats.set(b.categoryAr, arr);
    }
    return cats;
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return biomarkers;
    const q = filter.toLowerCase();
    return biomarkers.filter(b =>
      b.name.toLowerCase().includes(q) || b.nameAr.includes(q)
    );
  }, [filter]);

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Activity className="h-6 w-6 shrink-0 text-emerald-700" />
        <h2 className="text-2xl font-bold">النطاقات المرجعية التفاعلية</h2>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="ابحث عن تحليل..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pe-4 ps-10 text-sm dark:border-stone-700 dark:bg-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="relative space-y-3">
        {filtered.map((b) => {
          const isExpanded = expandedId === b.id;
          return (
            <div
              key={b.id}
              className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 overflow-hidden transition-all hover:border-emerald-200"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                className="flex w-full items-center gap-3 p-4 text-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900">{b.nameAr}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400" dir="ltr">{b.name}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                      {b.categoryAr}
                    </span>
                  </div>
                  <div className="mt-2">
                    <RangeBar biomarker={b} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-stone-400" dir="ltr">
                    <span>{b.normalMin} {b.unit}</span>
                    <span className="text-emerald-700 font-medium">النطاق الطبيعي</span>
                    <span>{b.normalMax} {b.unit}</span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 shrink-0 text-stone-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 text-stone-400" />
                )}
              </button>

              {isExpanded && (
                <div className={cn('border-t border-stone-100 dark:border-stone-800 p-4 space-y-3', blurClass)} aria-hidden={!isPro || undefined}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">إذا كان منخفضاً</span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400">{b.lowImplication}</p>
                    </div>
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-xs font-bold text-red-700 dark:text-red-400">إذا كان مرتفعاً</span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400">{b.highImplication}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">الببتيدات المؤثرة</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {b.relatedPeptides.map(p => (
                        <span key={p} className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400">متى تحلّل؟</span>
                      <p className="text-xs text-stone-600 dark:text-stone-400">{b.whenToTest}</p>
                    </div>
                  </div>

                  {!isPro && (
                    <div className="relative">
                      <BlurredOverlay />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Section 2: Test Package Recommendations */
function TestPackages({ isPro, blurClass }: { isPro: boolean; blurClass: string }) {
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const colorMap: Record<string, { border: string; bg: string; badge: string; text: string }> = {
    emerald: {
      border: 'border-emerald-200 dark:border-emerald-800',
      bg: 'bg-emerald-50/50 dark:bg-emerald-900/20',
      badge: 'bg-emerald-600',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50/50 dark:bg-blue-900/20',
      badge: 'bg-blue-600',
      text: 'text-blue-700 dark:text-blue-400',
    },
    purple: {
      border: 'border-purple-200 dark:border-purple-800',
      bg: 'bg-purple-50/50 dark:bg-purple-900/20',
      badge: 'bg-purple-600',
      text: 'text-purple-700 dark:text-purple-400',
    },
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Package className="h-6 w-6 shrink-0 text-emerald-700" />
        <h2 className="text-2xl font-bold">باقات التحاليل الموصى بها</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {testPackages.map((pkg) => {
          const c = colorMap[pkg.color] ?? colorMap.emerald;
          const isExpanded = expandedPkg === pkg.id;

          return (
            <div
              key={pkg.id}
              className={cn(
                'rounded-2xl border-2 p-5 transition-all hover:shadow-md',
                c.border, c.bg,
                pkg.id === 'peptide' && 'ring-2 ring-blue-400/30'
              )}
            >
              <div className="text-center">
                <span className="text-3xl">{pkg.icon}</span>
                <h3 className="mt-2 text-lg font-bold text-stone-900">{pkg.nameAr}</h3>
                <div className={cn('mt-1 text-2xl font-black', c.text)}>{pkg.price}</div>
                {pkg.id === 'peptide' && (
                  <span className="mt-1 inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    الأكثر طلباً
                  </span>
                )}
              </div>

              <p className="mt-3 text-center text-xs text-stone-600 dark:text-stone-400">
                {pkg.description}
              </p>

              <div className={cn('mt-3', blurClass)} aria-hidden={!isPro || undefined}>
                <div className="flex flex-wrap justify-center gap-1">
                  {pkg.testsAr.map(t => (
                    <span key={t} className="rounded-full bg-white/70 dark:bg-stone-800/70 px-2 py-0.5 text-[10px] font-medium text-stone-700 dark:text-stone-300">
                      {t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                  className={cn('mt-3 w-full text-center text-xs font-medium', c.text)}
                >
                  {isExpanded ? 'إخفاء التفاصيل ▲' : 'عرض كل التحاليل ▼'}
                </button>

                {isExpanded && (
                  <div className="mt-2 rounded-xl bg-white/60 dark:bg-stone-800/60 p-3">
                    <ul className="space-y-1">
                      {pkg.tests.map(t => (
                        <li key={t} className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                          <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500" />
                          <span dir="ltr">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-lg bg-stone-100/60 dark:bg-stone-800/40 px-3 py-1.5 text-center text-[10px] text-stone-500 dark:text-stone-400">
                {pkg.recommended}
              </div>

              {!isPro && (
                <Link to="/pricing" className="mt-2 block text-center text-xs font-bold text-emerald-700 hover:underline">
                  اشترك لمعرفة التفاصيل
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Section 3: Testing Timeline */
function TestingTimeline() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Clock className="h-6 w-6 shrink-0 text-emerald-700" />
        <h2 className="text-2xl font-bold">جدول التحاليل الزمني</h2>
      </div>

      <div className="relative">
        {/* Horizontal line (desktop) / Vertical line (mobile) */}
        <div className="absolute start-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-400 via-blue-400 via-amber-400 via-purple-400 to-rose-400 sm:hidden" />
        <div className="hidden sm:block absolute top-6 start-[10%] end-[10%] h-0.5 bg-gradient-to-r from-emerald-400 via-blue-400 via-amber-400 via-purple-400 to-rose-400" />

        {/* Mobile: vertical timeline */}
        <div className="space-y-4 sm:hidden">
          {timelineSteps.map((step, i) => {
            const colors: Record<string, string> = {
              emerald: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
              blue: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
              amber: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
              purple: 'border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
              rose: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20',
            };
            return (
              <div key={step.id} className="relative flex items-start gap-4">
                <div className={cn(
                  'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-lg',
                  colors[step.color]
                )}>
                  {step.icon}
                </div>
                <div className={cn('flex-1 rounded-2xl border p-4', colors[step.color])}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-stone-900">{step.label}</h3>
                    {i === 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">أساسي</span>}
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400">{step.description}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
                    <Package className="h-3 w-3" />
                    <span>{step.package}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-3">
          {timelineSteps.map((step, i) => {
            const dotColors: Record<string, string> = {
              emerald: 'bg-emerald-500',
              blue: 'bg-blue-500',
              amber: 'bg-amber-500',
              purple: 'bg-purple-500',
              rose: 'bg-rose-500',
            };
            const cardColors: Record<string, string> = {
              emerald: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20',
              blue: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20',
              amber: 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20',
              purple: 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/20',
              rose: 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-900/20',
            };
            return (
              <div key={step.id} className="flex flex-col items-center text-center">
                <div className={cn('relative z-10 h-12 w-12 flex items-center justify-center rounded-full border-4 border-white dark:border-stone-900 shadow-md text-lg', dotColors[step.color])}>
                  <span className="drop-shadow-md">{step.icon}</span>
                </div>
                <div className={cn('mt-3 w-full rounded-2xl border p-3', cardColors[step.color])}>
                  <h3 className="font-bold text-sm text-stone-900">{step.label}</h3>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400" dir="ltr">{step.labelEn}</span>
                  <p className="mt-1.5 text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">{step.description}</p>
                  <div className="mt-2 rounded-lg bg-white/60 dark:bg-stone-800/40 px-2 py-1 text-[10px] text-stone-500 dark:text-stone-400">
                    {step.package}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Section 4: Results Interpreter */
function ResultsInterpreter({ isPro, blurClass }: { isPro: boolean; blurClass: string }) {
  const [selectedBiomarker, setSelectedBiomarker] = useState(biomarkers[0].id);
  const [inputValue, setInputValue] = useState('');

  const biomarker = biomarkers.find(b => b.id === selectedBiomarker)!;
  const numericValue = parseFloat(inputValue);
  const hasValue = inputValue !== '' && !isNaN(numericValue);
  const status = hasValue ? getValueStatus(numericValue, biomarker) : null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Beaker className="h-6 w-6 shrink-0 text-emerald-700" />
        <h2 className="text-2xl font-bold">مفسّر النتائج</h2>
      </div>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">أدخل قيمة تحليلك واحصل على تفسير فوري</p>

      <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Biomarker selector */}
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold text-stone-600 dark:text-stone-400">اختر التحليل</label>
            <select
              value={selectedBiomarker}
              onChange={(e) => { setSelectedBiomarker(e.target.value); setInputValue(''); }}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 px-3 text-sm dark:border-stone-700 dark:bg-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {biomarkers.map(b => (
                <option key={b.id} value={b.id}>{b.nameAr} ({b.name})</option>
              ))}
            </select>
          </div>

          {/* Value input */}
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-xs font-bold text-stone-600 dark:text-stone-400">
              القيمة <span className="text-stone-400" dir="ltr">({biomarker.unit})</span>
            </label>
            <input
              type="number"
              step="any"
              placeholder={`${biomarker.normalMin} - ${biomarker.normalMax}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 px-3 text-sm dark:border-stone-700 dark:bg-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              dir="ltr"
            />
          </div>
        </div>

        {/* Visual range bar */}
        <div className="mt-4">
          <RangeBar biomarker={biomarker} value={hasValue ? numericValue : undefined} />
          <div className="mt-1 flex justify-between text-[10px] text-stone-400" dir="ltr">
            <span>{biomarker.absMin}</span>
            <span className="text-emerald-700">{biomarker.normalMin} — {biomarker.normalMax} {biomarker.unit}</span>
            <span>{biomarker.absMax}</span>
          </div>
        </div>

        {/* Result interpretation */}
        {hasValue && status && (
          <div className={cn('mt-4 space-y-3 animate-fade-in', blurClass)} aria-hidden={!isPro || undefined}>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-sm font-bold text-stone-900" dir="ltr">
                {numericValue} {biomarker.unit}
              </span>
            </div>

            {status === 'normal' ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-700" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">نتيجة طبيعية ✓</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  قيمتك ضمن النطاق الطبيعي ({biomarker.normalMin}-{biomarker.normalMax} {biomarker.unit}). استمر بالمتابعة الدورية.
                </p>
              </div>
            ) : (
              <div className={cn(
                'rounded-xl p-4',
                status === 'low' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={cn('h-4 w-4', status === 'low' ? 'text-amber-600' : 'text-red-600')} />
                  <span className={cn('text-sm font-bold', status === 'low' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400')}>
                    {status === 'low' ? 'قيمة منخفضة' : 'قيمة مرتفعة'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 mb-2">
                  {status === 'low' ? biomarker.lowImplication : biomarker.highImplication}
                </p>
                <div className="rounded-lg bg-white/60 dark:bg-stone-800/40 p-2.5 text-xs text-stone-700 dark:text-stone-300">
                  <strong>التوصية:</strong> استشر طبيبك المتخصص وأعد التحليل بعد 4-6 أسابيع. قد تحتاج لتعديل الجرعة أو إيقاف البروتوكول مؤقتاً.
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs">
              <FlaskConical className="h-3.5 w-3.5 text-emerald-700" />
              <span className="text-stone-500 dark:text-stone-400">الببتيدات المؤثرة:</span>
              <span className="font-medium text-stone-700 dark:text-stone-300">{biomarker.relatedPeptides.join('، ')}</span>
            </div>

            <Link
              to="/tracker"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
            >
              <TrendingUp className="h-3 w-3" />
              سجّل النتيجة في متتبع التحاليل
            </Link>

            {!isPro && (
              <div className="relative h-8">
                <BlurredOverlay />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Section 5: Lab Locator */
function LabLocator() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <MapPin className="h-6 w-6 shrink-0 text-emerald-700" />
        <h2 className="text-2xl font-bold">مختبرات في السعودية</h2>
      </div>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">أشهر المختبرات مع أسعار تقريبية للباقات</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {saudiLabs.map((lab) => (
          <div
            key={lab.nameEn}
            className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 p-5 transition-all hover:border-emerald-200 hover:shadow-md"
          >
            <div className="text-center mb-4">
              <span className="text-3xl">{lab.logo}</span>
              <h3 className="mt-2 text-lg font-bold text-stone-900">{lab.name}</h3>
              <span className="text-xs text-stone-500 dark:text-stone-400">{lab.nameEn}</span>
            </div>

            {/* Cities */}
            <div className="flex flex-wrap justify-center gap-1 mb-4">
              {lab.cities.map(city => (
                <span key={city} className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] text-stone-600 dark:text-stone-400">
                  {city}
                </span>
              ))}
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-600 dark:text-stone-400">الأساسي</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{lab.basicPrice}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-600 dark:text-stone-400">الببتيدات</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">{lab.peptidePrice}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-600 dark:text-stone-400">الشامل</span>
                <span className="font-bold text-purple-700 dark:text-purple-400">{lab.fullPrice}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center">{lab.notes}</p>
              {lab.homeVisit && (
                <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>زيارة منزلية متاحة</span>
                </div>
              )}
            </div>

            <a
              href={lab.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl bg-stone-100 dark:bg-stone-800 py-2 text-center text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              زيارة الموقع ↗
            </a>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-stone-100 dark:bg-stone-800 p-3 text-center text-xs text-stone-500 dark:text-stone-400">
        <Info className="inline h-3 w-3 ml-1" />
        الأسعار تقريبية وقد تختلف حسب الفرع والعروض المتاحة — آخر تحديث مارس 2026
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════

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
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-700">
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

      <div className="space-y-12">
        {/* 1. Interactive Reference Ranges */}
        <InteractiveReferenceRanges isPro={isPro} blurClass={blurClass} />

        {/* 2. Test Package Recommendations */}
        <TestPackages isPro={isPro} blurClass={blurClass} />

        {/* 3. Testing Timeline */}
        <TestingTimeline />

        {/* 4. Results Interpreter */}
        <ResultsInterpreter isPro={isPro} blurClass={blurClass} />

        {/* 5. Lab Locator */}
        <LabLocator />

        {/* ── Original: Baseline tests with icons ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList className="h-6 w-6 shrink-0 text-emerald-700" />
            <h2 className="text-2xl font-bold">التحاليل الأساسية — تفصيل</h2>
          </div>

          <div className="relative grid gap-4 sm:grid-cols-2">
            {labTests.map((test) => {
              const { Icon, color, bgColor } = getTestCategoryIcon(test.relatedCategories);
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
                      <span className="text-xs text-stone-500 dark:text-stone-400" dir="ltr">{test.nameEn}</span>
                    </div>
                  </div>

                  <div className={blurClass} aria-hidden={!isPro || undefined}>
                    <p className="mb-2 text-sm leading-relaxed text-stone-600">{test.descriptionAr}</p>
                    <div className="flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-800 p-2.5 text-xs text-stone-700 dark:text-stone-300">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{test.whenAr}</span>
                    </div>

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
                      <Link to="/pricing" className="text-xs font-bold text-emerald-700 hover:underline">
                        اشترك لمعرفة التفاصيل <ArrowLeft className="inline h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* CTA footer */}
      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-6 text-center">
        <p className="font-bold text-stone-900">الخطوة التالية</p>
        <p className="mt-1 text-sm text-stone-600">عرفت تحاليلك — الآن احسب جرعتك أو تعلّم طريقة الحقن</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/calculator" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center">حاسبة الجرعات</Link>
          <Link to="/guide" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">دليل التحضير والحقن</Link>
          <Link to="/tracker" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">متتبع التحاليل</Link>
          <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">اسأل المدرب الذكي</Link>
        </div>
      </div>
    </div>
  );
}
