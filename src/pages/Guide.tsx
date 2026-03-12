import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  Beaker,
  Syringe,
  Thermometer,
  Activity,
  Layers,
  GraduationCap,
  Sparkles,
  Heart,
  ShieldCheck,
  Zap,
  ArrowLeft,
  ArrowRight,
  Snowflake,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL } from '@/lib/constants';
import { GenericPageSkeleton } from '@/components/Skeletons';

/* ═══════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════ */

interface ModuleSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface Module {
  id: string;
  number: number;
  title: string;
  titleEn: string;
  icon: React.ReactNode;
  readingTime: number; // minutes
  sections: ModuleSection[];
  isFree?: boolean;
}

const STORAGE_KEY = 'pptides-guide-progress';

function getProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setProgress(moduleId: string, completed: boolean) {
  const p = getProgress();
  p[moduleId] = completed;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/* ═══════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════ */

function BlurredSection({ isPro, isFree, children }: { isPro: boolean; isFree?: boolean; children: React.ReactNode }) {
  if (isPro || isFree) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-hidden="true" className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <Link to="/pricing" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
          اشترك للوصول الكامل
        </Link>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card primary-border p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h4 className="font-bold text-stone-900 dark:text-stone-100">{title}</h4>
      </div>
      <div className="text-sm leading-relaxed text-stone-700 dark:text-stone-200 space-y-2">{children}</div>
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
      <div className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SVG BODY DIAGRAM (reused from original)
   ═══════════════════════════════════════════════════ */

const SVG_COLORS = {
  primary: '#10b981',
  primaryLight: '#10b98120',
  border: '#d6d3d1',
} as const;

function BodyDiagram() {
  return (
    <svg viewBox="0 0 200 400" className="h-64 w-auto shrink-0" role="img" aria-label="مواقع الحقن تحت الجلد">
      <ellipse cx="100" cy="40" rx="25" ry="30" fill="none" stroke={SVG_COLORS.border} strokeWidth="1.5" />
      <line x1="100" y1="70" x2="100" y2="200" stroke={SVG_COLORS.border} strokeWidth="1.5" />
      <line x1="100" y1="90" x2="45" y2="160" stroke={SVG_COLORS.border} strokeWidth="1.5" />
      <line x1="100" y1="90" x2="155" y2="160" stroke={SVG_COLORS.border} strokeWidth="1.5" />
      <line x1="100" y1="200" x2="65" y2="370" stroke={SVG_COLORS.border} strokeWidth="1.5" />
      <line x1="100" y1="200" x2="135" y2="370" stroke={SVG_COLORS.border} strokeWidth="1.5" />
      <circle cx="100" cy="165" r="18" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
      <text x="100" y="170" textAnchor="middle" fontSize="8" fill={SVG_COLORS.primary} fontWeight="bold">البطن</text>
      <ellipse cx="78" cy="280" rx="12" ry="25" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
      <text x="78" y="285" textAnchor="middle" fontSize="7" fill={SVG_COLORS.primary} fontWeight="bold">الفخذ</text>
      <ellipse cx="122" cy="280" rx="12" ry="25" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
      <circle cx="45" cy="135" r="10" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
      <text x="20" y="138" textAnchor="middle" fontSize="7" fill={SVG_COLORS.primary} fontWeight="bold">الذراع</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   MODULE CONTENT DATA
   ═══════════════════════════════════════════════════ */

function buildModules(): Module[] {
  return [
    /* ── Module 1: Introduction ── */
    {
      id: 'intro',
      number: 1,
      title: 'مقدمة في الببتيدات',
      titleEn: 'Introduction to Peptides',
      icon: <GraduationCap className="h-6 w-6 text-emerald-500" />,
      readingTime: 8,
      isFree: true,
      sections: [
        {
          id: 'what-are-peptides',
          title: 'ما هي الببتيدات؟',
          content: (
            <div className="space-y-4">
              <p>
                الببتيدات هي سلاسل قصيرة من الأحماض الأمينية (عادةً من 2 إلى 50 حمض أميني) مرتبطة بروابط ببتيدية.
                تختلف عن البروتينات في أنها أصغر حجمًا وأكثر تخصصًا في وظائفها.
              </p>
              <p>
                جسمك ينتج آلاف الببتيدات طبيعيًا — مثل الإنسولين، والأوكسيتوسين، وهرمون النمو.
                الببتيدات العلاجية هي نسخ مصنّعة أو معدّلة من هذه الجزيئات الطبيعية، مصمّمة لتحفيز استجابات محددة في الجسم.
              </p>
              <InfoCard icon={<Sparkles className="h-5 w-5 text-emerald-500" />} title="لماذا الببتيدات مميزة؟">
                <ul className="list-disc list-inside space-y-1">
                  <li>تعمل بدقة عالية — تستهدف مستقبلات محددة في الجسم</li>
                  <li>آثار جانبية أقل مقارنة بالأدوية التقليدية</li>
                  <li>الجسم يتعرف عليها لأنها مشابهة لجزيئاته الطبيعية</li>
                  <li>لا تتراكم في الجسم — نصف عمر قصير نسبيًا</li>
                </ul>
              </InfoCard>
            </div>
          ),
        },
        {
          id: 'how-peptides-work',
          title: 'كيف تعمل الببتيدات؟',
          content: (
            <div className="space-y-4">
              <p>
                تعمل الببتيدات كـ"رسائل كيميائية" — ترتبط بمستقبلات محددة على سطح الخلايا أو داخلها،
                مما يُطلق سلسلة من التفاعلات البيولوجية. كل ببتيد له "مفتاح" فريد يفتح "قفل" محدد في الجسم.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
                  <h5 className="font-bold text-emerald-700 mb-1">الارتباط بالمستقبل</h5>
                  <p className="text-xs">الببتيد يرتبط بمستقبل محدد على سطح الخلية</p>
                </div>
                <div className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
                  <h5 className="font-bold text-emerald-700 mb-1">تفعيل إشارة داخلية</h5>
                  <p className="text-xs">يُطلق سلسلة من الإشارات داخل الخلية</p>
                </div>
                <div className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
                  <h5 className="font-bold text-emerald-700 mb-1">الاستجابة البيولوجية</h5>
                  <p className="text-xs">الخلية تستجيب — إفراز هرمون، إصلاح نسيج، أو تنظيم مناعي</p>
                </div>
                <div className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
                  <h5 className="font-bold text-emerald-700 mb-1">التحلل الطبيعي</h5>
                  <p className="text-xs">الببتيد يتحلل بعد أداء مهمته — لا تراكم في الجسم</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: 'history',
          title: 'تاريخ العلاج بالببتيدات',
          content: (
            <div className="space-y-4">
              <p>
                بدأ استخدام الببتيدات طبيًا في عشرينيات القرن الماضي مع اكتشاف الإنسولين عام 1921.
                منذ ذلك الحين، تطور المجال بشكل هائل:
              </p>
              <div className="space-y-3">
                {[
                  { year: '1921', event: 'اكتشاف الإنسولين — أول ببتيد علاجي' },
                  { year: '1953', event: 'تحديد تسلسل الإنسولين البشري بالكامل' },
                  { year: '1980s', event: 'بداية أبحاث هرمون النمو والببتيدات المحفّزة' },
                  { year: '1990s', event: 'تطوير GHRP-6 و GHRP-2 كمحفّزات لهرمون النمو' },
                  { year: '2000s', event: 'اكتشاف BPC-157 وخصائصه العلاجية المذهلة' },
                  { year: '2017', event: 'اعتماد Semaglutide لعلاج السكري (Ozempic)' },
                  { year: '2021', event: 'انطلاق ثورة GLP-1 لإدارة الوزن عالميًا' },
                  { year: '2023+', event: 'Tirzepatide ومستقبل الببتيدات ثنائية المستقبل' },
                ].map((item) => (
                  <div key={item.year} className="flex items-start gap-3">
                    <span className="shrink-0 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold text-white">{item.year}</span>
                    <span className="text-sm">{item.event}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          id: 'terminology',
          title: 'المصطلحات الأساسية',
          content: (
            <div className="space-y-4">
              <p>قبل أن تبدأ رحلتك مع الببتيدات، تعرّف على هذه المصطلحات الأساسية:</p>
              <div className="grid gap-2">
                {[
                  { term: 'Reconstitution (الإذابة)', def: 'عملية خلط الببتيد المجفّد بالماء لتحويله إلى محلول قابل للحقن' },
                  { term: 'Subcutaneous (تحت الجلد)', def: 'نوع الحقن الأكثر شيوعًا للببتيدات — في طبقة الدهون تحت الجلد' },
                  { term: 'Lyophilized (مجفّد بالتجميد)', def: 'الشكل المسحوق للببتيد قبل الإذابة — أكثر استقرارًا للتخزين' },
                  { term: 'Half-life (نصف العمر)', def: 'الوقت اللازم لانخفاض تركيز الببتيد في الجسم إلى النصف' },
                  { term: 'Bacteriostatic Water (ماء بكتيريوستاتك)', def: 'ماء معقّم مع 0.9% كحول بنزيلي — يمنع نمو البكتيريا' },
                  { term: 'IU (وحدة دولية)', def: 'وحدة قياس تُستخدم لبعض الببتيدات مثل HGH وHCG' },
                  { term: 'mcg (ميكروغرام)', def: 'وحدة قياس الجرعة الأكثر شيوعًا للببتيدات — 1 ملغ = 1000 ميكروغرام' },
                ].map((item) => (
                  <div key={item.term} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-3">
                    <span className="font-bold text-emerald-700 text-sm">{item.term}</span>
                    <p className="text-xs mt-1 text-stone-600 dark:text-stone-300">{item.def}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                لمزيد من المصطلحات، تصفّح{' '}
                <Link to="/glossary" className="text-emerald-700 hover:underline font-bold">قاموس المصطلحات الكامل</Link>.
              </p>
            </div>
          ),
        },
      ],
    },

    /* ── Module 2: Types ── */
    {
      id: 'types',
      number: 2,
      title: 'أنواع الببتيدات',
      titleEn: 'Types of Peptides',
      icon: <Layers className="h-6 w-6 text-emerald-500" />,
      readingTime: 10,
      sections: [
        {
          id: 'gh-secretagogues',
          title: 'محفّزات هرمون النمو (GH Secretagogues)',
          content: (
            <div className="space-y-4">
              <p>
                تحفّز الغدة النخامية لإفراز هرمون النمو بشكل طبيعي، بدلًا من حقن HGH مباشرة.
                هذا يحافظ على آلية التغذية الراجعة الطبيعية للجسم.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard icon={<Zap className="h-5 w-5 text-blue-500" />} title="CJC-1295">
                  <p>يحفّز إفراز GHRH بشكل مستمر. النسخة مع DAC تدوم أسبوعًا كاملًا. مثالي لبناء العضلات وتحسين النوم.</p>
                  <Link to="/peptide/cjc-1295" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
                <InfoCard icon={<Zap className="h-5 w-5 text-purple-500" />} title="Ipamorelin">
                  <p>أنظف محفّز لهرمون النمو — لا يرفع الكورتيزول أو البرولاكتين. مثالي للمبتدئين.</p>
                  <Link to="/peptide/ipamorelin" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
                <InfoCard icon={<Zap className="h-5 w-5 text-orange-500" />} title="GHRP-2 / GHRP-6">
                  <p>محفّزات قوية لـ Ghrelin. GHRP-6 يزيد الشهية بشكل ملحوظ. GHRP-2 أقوى في رفع GH.</p>
                  <Link to="/peptide/ghrp-6" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
              </div>
            </div>
          ),
        },
        {
          id: 'glp1',
          title: 'ناهضات GLP-1 (إدارة الوزن)',
          content: (
            <div className="space-y-4">
              <p>
                تحاكي هرمون GLP-1 الطبيعي. تُبطئ إفراغ المعدة، تقلل الشهية، وتحسّن حساسية الإنسولين.
                أحدثت ثورة في علاج السمنة والسكري من النوع الثاني.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard icon={<Activity className="h-5 w-5 text-teal-500" />} title="Semaglutide (سيماغلوتايد)">
                  <p>الأشهر عالميًا (Ozempic / Wegovy). حقنة أسبوعية واحدة. فقدان وزن 15-20% في التجارب السريرية.</p>
                  <Link to="/peptide/semaglutide" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
                <InfoCard icon={<Activity className="h-5 w-5 text-cyan-500" />} title="Tirzepatide (تيرزيباتايد)">
                  <p>ثنائي المستقبل (GLP-1 + GIP). أقوى من Semaglutide بنسبة ~5%. فقدان وزن يصل إلى 22%.</p>
                  <Link to="/peptide/tirzepatide" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
              </div>
            </div>
          ),
        },
        {
          id: 'healing',
          title: 'ببتيدات الشفاء والتعافي',
          content: (
            <div className="space-y-4">
              <p>
                تسرّع شفاء الأنسجة، تقلل الالتهاب، وتحسّن التعافي من الإصابات.
                من أكثر الببتيدات شعبية بين الرياضيين.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard icon={<Heart className="h-5 w-5 text-red-500" />} title="BPC-157">
                  <p>ببتيد مشتق من عصارة المعدة. يسرّع شفاء الأوتار والعضلات والأمعاء. يمكن أخذه فمويًا أو بالحقن.</p>
                  <Link to="/peptide/bpc-157" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
                <InfoCard icon={<Heart className="h-5 w-5 text-pink-500" />} title="TB-500 (Thymosin Beta-4)">
                  <p>يعزز بناء أوعية دموية جديدة وتجديد الأنسجة. فعّال جدًا للإصابات المزمنة.</p>
                  <Link to="/peptide/tb-500" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
              </div>
            </div>
          ),
        },
        {
          id: 'anti-aging',
          title: 'ببتيدات مكافحة الشيخوخة',
          content: (
            <div className="space-y-4">
              <p>
                تستهدف آليات الشيخوخة على المستوى الخلوي — من إطالة التيلوميرات إلى تحفيز الكولاجين.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard icon={<Sparkles className="h-5 w-5 text-amber-500" />} title="Epithalon">
                  <p>يحفّز إنزيم التيلوميريز الذي يطيل التيلوميرات — حرفيًا يبطئ ساعة الشيخوخة الخلوية.</p>
                  <Link to="/peptide/epithalon" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
                <InfoCard icon={<Sparkles className="h-5 w-5 text-yellow-500" />} title="GHK-Cu">
                  <p>ببتيد نحاسي يحفّز إنتاج الكولاجين ويجدد البشرة. متوفر كسيروم موضعي أو حقن.</p>
                  <Link to="/peptide/ghk-cu" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
              </div>
            </div>
          ),
        },
        {
          id: 'immune',
          title: 'ببتيدات الجهاز المناعي',
          content: (
            <div className="space-y-4">
              <p>
                تنظّم وتقوّي الاستجابة المناعية. مفيدة للمناعة الضعيفة، الأمراض المزمنة، ومقاومة العدوى.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard icon={<ShieldCheck className="h-5 w-5 text-indigo-500" />} title="Thymosin Alpha-1 (TA-1)">
                  <p>يعزز الخلايا التائية والخلايا القاتلة الطبيعية. معتمد طبيًا في أكثر من 35 دولة لعلاج التهاب الكبد B والسرطان.</p>
                  <Link to="/peptide/thymosin-alpha-1" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
                <InfoCard icon={<ShieldCheck className="h-5 w-5 text-violet-500" />} title="LL-37">
                  <p>ببتيد مضاد للميكروبات طبيعي. يقتل البكتيريا والفيروسات مباشرة ويُنظّم الاستجابة الالتهابية.</p>
                  <Link to="/peptide/ll-37" className="text-emerald-700 hover:underline text-xs font-bold">← اقرأ المزيد</Link>
                </InfoCard>
              </div>
              <p className="text-sm">
                استعرض جميع الببتيدات في{' '}
                <Link to="/library" className="text-emerald-700 hover:underline font-bold">المكتبة الكاملة</Link>.
              </p>
            </div>
          ),
        },
      ],
    },

    /* ── Module 3: Safe Injection ── */
    {
      id: 'injection',
      number: 3,
      title: 'الحقن الآمن',
      titleEn: 'Safe Injection',
      icon: <Syringe className="h-6 w-6 text-emerald-500" />,
      readingTime: 12,
      sections: [
        {
          id: 'equipment',
          title: 'الأدوات المطلوبة',
          content: (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-500">
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">الأداة</th>
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">الوصف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'قارورة الببتيد (Vial)', desc: 'تحتوي على الببتيد المجفّد (lyophilized)' },
                      { name: 'ماء بكتيريوستاتك (BAC Water)', desc: 'ماء معقّم مع 0.9% كحول بنزيلي للحفظ' },
                      { name: 'محاقن إنسولين (29-31G)', desc: 'إبر رفيعة للحقن تحت الجلد — ألم أقل' },
                      { name: 'مسحات كحولية (Alcohol Swabs)', desc: 'لتعقيم الأغطية المطاطية وموقع الحقن' },
                      { name: 'حاوية الإبر الحادة (Sharps Container)', desc: 'للتخلص الآمن من الإبر المستعملة' },
                    ].map((tool, i) => (
                      <tr key={tool.name} className={cn('border-t transition-colors hover:bg-stone-50 dark:hover:bg-stone-800', i % 2 === 0 && 'bg-stone-50 dark:bg-stone-900')}>
                        <td className="px-4 py-3 font-bold">{tool.name}</td>
                        <td className="px-4 py-3">{tool.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        {
          id: 'step-by-step',
          title: 'خطوات الحقن تحت الجلد',
          content: (
            <div className="space-y-4">
              <ol className="grid gap-3 list-none p-0 m-0">
                {[
                  { step: 'غسل اليدين', detail: 'بالماء والصابون لمدة 20 ثانية على الأقل. جفّف بمنشفة نظيفة.' },
                  { step: 'تعقيم الغطاء المطاطي', detail: 'امسح غطاء قارورة الببتيد بمسحة كحولية واتركه يجف 10 ثوانٍ.' },
                  { step: 'سحب الجرعة', detail: 'أدخل الإبرة في القارورة واسحب الكمية المطلوبة. تأكد من عدم وجود فقاعات هواء.' },
                  { step: 'تعقيم موقع الحقن', detail: 'امسح المنطقة بمسحة كحولية بحركة دائرية من المركز للخارج.' },
                  { step: 'قرص الجلد', detail: 'اقرص طية من الجلد بين الإبهام والسبابة. هذا يرفع طبقة الدهون عن العضلة.' },
                  { step: 'إدخال الإبرة بزاوية 45°', detail: 'أدخل الإبرة بسرعة وثبات. لا تتردد — الحركة السريعة أقل ألمًا.' },
                  { step: 'حقن المحلول ببطء', detail: 'ادفع المكبس ببطء وثبات. انتظر 5 ثوانٍ بعد الانتهاء قبل سحب الإبرة.' },
                  { step: 'سحب الإبرة والضغط', detail: 'اسحب الإبرة واضغط بلطف على الموقع بمسحة نظيفة. لا تفرك.' },
                ].map((item, i) => (
                  <li key={item.step} className="glass-card primary-border flex items-start gap-4 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <h5 className="text-sm font-bold">{item.step}</h5>
                      <p className="mt-1 text-xs leading-relaxed">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ),
        },
        {
          id: 'injection-sites',
          title: 'مواقع الحقن',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                  <BodyDiagram />
                  <div className="flex-1 space-y-3">
                    {[
                      { site: 'البطن', desc: 'المنطقة المحيطة بالسرّة (5 سم حول السرّة على الأقل). الأكثر شيوعًا لسهولة الوصول والامتصاص الجيد.' },
                      { site: 'الفخذ', desc: 'الجزء الأمامي-الجانبي من الفخذ. منطقة واسعة تسمح بتدوير المواقع بسهولة.' },
                      { site: 'أعلى الذراع', desc: 'الجزء الخلفي من أعلى الذراع. يحتاج مساعدة شخص آخر في بعض الأحيان.' },
                    ].map((row) => (
                      <div key={row.site} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-stone-900/30">
                        <h5 className="text-sm font-bold text-stone-900 dark:text-stone-100">{row.site}</h5>
                        <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">{row.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: 'common-mistakes',
          title: 'أخطاء شائعة',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5">
                <ul className="space-y-3">
                  {[
                    'عدم تدوير مواقع الحقن — يسبب تليّف أو ضمور دهني',
                    'رجّ القارورة بدل التدوير اللطيف — يُتلف بنية الببتيد',
                    'استخدام ماء عادي بدل بكتيريوستاتك — يسبب تلوث بكتيري',
                    'ترك فقاعات هواء كبيرة في المحقنة — جرعة غير دقيقة',
                    'إعادة تغطية الإبرة بعد الاستخدام — خطر وخز الإبرة',
                    'الحقن في نفس المكان بالضبط كل مرة',
                    'عدم تعقيم الغطاء المطاطي قبل كل سحب',
                  ].map((rule) => (
                    <li key={rule} className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="text-sm leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ),
        },
        {
          id: 'when-to-seek-help',
          title: 'متى تراجع الطبيب؟',
          content: (
            <div className="space-y-4">
              <WarningBox>
                <p className="font-bold mb-2">راجع الطبيب فورًا إذا لاحظت أي مما يلي:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>احمرار ينتشر حول موقع الحقن أو خطوط حمراء</li>
                  <li>تورّم شديد لا يتحسن خلال 48 ساعة</li>
                  <li>حرارة مرتفعة (أعلى من 38.5°م) بعد الحقن</li>
                  <li>إفرازات أو صديد من موقع الحقن</li>
                  <li>ألم شديد لا يتحسن مع المسكنات</li>
                  <li>ردّ فعل تحسسي: تورم الوجه أو الشفتين، صعوبة التنفس، طفح جلدي منتشر</li>
                  <li>دوخة شديدة أو إغماء بعد الحقن</li>
                </ul>
              </WarningBox>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                هذا الدليل تعليمي فقط ولا يُغني عن الاستشارة الطبية المتخصصة.
                استشر طبيبك قبل بدء أي بروتوكول ببتيدات.
              </p>
            </div>
          ),
        },
      ],
    },

    /* ── Module 4: Storage & Preparation ── */
    {
      id: 'storage',
      number: 4,
      title: 'التخزين والتحضير',
      titleEn: 'Storage & Preparation',
      icon: <Thermometer className="h-6 w-6 text-emerald-500" />,
      readingTime: 7,
      sections: [
        {
          id: 'reconstitution-guide',
          title: 'دليل الإذابة (Reconstitution)',
          content: (
            <div className="space-y-4">
              <ol className="grid gap-3 list-none p-0 m-0">
                {[
                  { step: 'غسل اليدين', detail: 'بالماء والصابون لمدة 20 ثانية على الأقل' },
                  { step: 'تعقيم الأغطية المطاطية', detail: 'امسح غطاء القارورة وغطاء الماء بمسحة كحولية واتركها تجف' },
                  { step: 'سحب الماء البكتيريوستاتك', detail: 'اسحب الكمية المطلوبة — عادةً 1-2 مل لكل قارورة 5mg' },
                  { step: 'إضافة الماء على جدار القارورة', detail: 'أضف الماء ببطء على جدار القارورة الداخلي — لا تصبّه مباشرة على البودرة أبدًا' },
                  { step: 'التذويب بحركة دائرية لطيفة', detail: 'دوّر القارورة بلطف حتى يذوب البودرة بالكامل — لا ترجّها أبدًا' },
                ].map((item, i) => (
                  <li key={item.step} className="glass-card primary-border flex items-start gap-4 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <h5 className="text-sm font-bold">{item.step}</h5>
                      <p className="mt-1 text-xs leading-relaxed">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-sm">
                استخدم{' '}
                <Link to="/calculator" className="text-emerald-700 hover:underline font-bold">حاسبة الجرعات</Link>
                {' '}لحساب كمية الماء والجرعة بدقة.
              </p>
            </div>
          ),
        },
        {
          id: 'storage-temps',
          title: 'درجات حرارة التخزين',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <h5 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5"><Snowflake className="h-4 w-4" /> الببتيد المجفّد (غير محلول)</h5>
                  <p className="text-sm">درجة حرارة الغرفة (أقل من 25°م) أو الثلاجة. يمكن تخزينه لأشهر.</p>
                  <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">المجمّد (-20°م) = أطول فترة تخزين ممكنة</p>
                </div>
                <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                  <h5 className="font-bold text-emerald-700 dark:text-emerald-300 mb-2">الببتيد المحلول (بعد الإذابة)</h5>
                  <p className="text-sm">الثلاجة حصرًا (2-8°م). لا تجمّده بعد الإذابة.</p>
                  <p className="text-xs mt-2 text-emerald-700 dark:text-emerald-400">مع BAC water = 28-30 يومًا كحد أقصى</p>
                </div>
              </div>
              <WarningBox>
                <p>لا تترك الببتيد المحلول خارج الثلاجة لأكثر من ساعة. الحرارة والضوء المباشر يُتلفان الببتيد بسرعة.</p>
              </WarningBox>
            </div>
          ),
        },
        {
          id: 'shelf-life',
          title: 'مدة الصلاحية',
          content: (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-500">
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">الحالة</th>
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">مدة الصلاحية</th>
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { state: 'مسحوق مجفّد (درجة الغرفة)', life: '6-12 شهرًا', note: 'بعيدًا عن الضوء والرطوبة' },
                      { state: 'مسحوق مجفّد (الثلاجة)', life: '1-2 سنة', note: 'الخيار الأفضل للتخزين الطويل' },
                      { state: 'مسحوق مجفّد (المجمّد)', life: '2+ سنة', note: 'لا تجمّد وتذيب مرات متعددة' },
                      { state: 'محلول + BAC water (الثلاجة)', life: '28-30 يومًا', note: 'الخيار الأكثر شيوعًا' },
                      { state: 'محلول + ماء عادي (الثلاجة)', life: '3-5 أيام فقط', note: 'لا يُنصح به' },
                    ].map((row, i) => (
                      <tr key={row.state} className={cn('border-t', i % 2 === 0 && 'bg-stone-50 dark:bg-stone-900')}>
                        <td className="px-4 py-3 font-bold">{row.state}</td>
                        <td className="px-4 py-3">{row.life}</td>
                        <td className="px-4 py-3 text-xs">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        {
          id: 'degradation-signs',
          title: 'علامات التلف',
          content: (
            <div className="space-y-4">
              <p>تخلّص من الببتيد فورًا إذا لاحظت أي علامة من هذه العلامات:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { sign: 'تعكّر المحلول', desc: 'المحلول السليم شفاف تمامًا. أي عكارة = تلف محتمل.' },
                  { sign: 'تغيّر اللون', desc: 'اصفرار أو أي تغيّر في اللون يدل على تحلل كيميائي.' },
                  { sign: 'رائحة غريبة', desc: 'الببتيد السليم عديم الرائحة تقريبًا.' },
                  { sign: 'جسيمات عائمة', desc: 'أي جسيمات أو رواسب مرئية = تلوث محتمل.' },
                ].map((item) => (
                  <div key={item.sign} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                    <span className="font-bold text-red-700 dark:text-red-300 text-sm flex items-center gap-1"><Ban className="h-3.5 w-3.5" /> {item.sign}</span>
                    <p className="text-xs mt-1 text-red-600 dark:text-red-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
      ],
    },

    /* ── Module 5: Monitoring ── */
    {
      id: 'monitoring',
      number: 5,
      title: 'مراقبة النتائج',
      titleEn: 'Monitoring Results',
      icon: <Activity className="h-6 w-6 text-emerald-500" />,
      readingTime: 9,
      sections: [
        {
          id: 'required-tests',
          title: 'التحاليل المطلوبة',
          content: (
            <div className="space-y-4">
              <p>
                التحاليل الدورية ضرورية لمراقبة فعالية البروتوكول وسلامته.
                هذه التحاليل الأساسية التي يجب إجراؤها:
              </p>
              <div className="grid gap-2">
                {[
                  { test: 'CBC (تعداد الدم الكامل)', why: 'مراقبة خلايا الدم والمناعة' },
                  { test: 'CMP (لوحة الأيض الشاملة)', why: 'وظائف الكبد والكلى والسكر والأملاح' },
                  { test: 'IGF-1', why: 'مؤشر مستوى هرمون النمو الفعلي في الجسم' },
                  { test: 'HbA1c (السكر التراكمي)', why: 'ضروري مع GLP-1 ومحفّزات GH' },
                  { test: 'Fasting Insulin', why: 'مراقبة حساسية الإنسولين' },
                  { test: 'Lipid Panel', why: 'الكوليسترول والدهون الثلاثية' },
                  { test: 'Thyroid Panel (TSH, fT3, fT4)', why: 'بعض الببتيدات تؤثر على الغدة الدرقية' },
                  { test: 'Testosterone (Total + Free)', why: 'إذا كنت تستخدم محفّزات GH' },
                ].map((item) => (
                  <div key={item.test} className="flex items-start gap-3 rounded-xl border border-stone-200 dark:border-stone-600 p-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm">{item.test}</span>
                      <p className="text-xs text-stone-600 dark:text-stone-300">{item.why}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                لمزيد من التفاصيل، راجع{' '}
                <Link to="/lab-guide" className="text-emerald-700 hover:underline font-bold">دليل التحاليل الشامل</Link>.
              </p>
            </div>
          ),
        },
        {
          id: 'when-to-test',
          title: 'متى تفحص؟',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 p-4 text-center">
                  <h5 className="font-bold text-blue-700 dark:text-blue-300 mb-2">قبل البدء (Baseline)</h5>
                  <p className="text-xs">تحاليل شاملة قبل بدء أي بروتوكول. هذه نقطة المقارنة.</p>
                </div>
                <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 p-4 text-center">
                  <h5 className="font-bold text-emerald-700 dark:text-emerald-300 mb-2">بعد 4-6 أسابيع</h5>
                  <p className="text-xs">فحص متابعة لتقييم الاستجابة وتعديل الجرعات.</p>
                </div>
                <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800 p-4 text-center">
                  <h5 className="font-bold text-purple-700 dark:text-purple-300 mb-2">كل 3 أشهر</h5>
                  <p className="text-xs">فحوصات دورية للمراقبة المستمرة.</p>
                </div>
              </div>
              <WarningBox>
                <p>اسحب الدم صباحًا وأنت صائم (8-12 ساعة). لا تحقن الببتيد صباح يوم الفحص للحصول على نتائج دقيقة.</p>
              </WarningBox>
            </div>
          ),
        },
        {
          id: 'interpret-results',
          title: 'كيف تقرأ النتائج؟',
          content: (
            <div className="space-y-4">
              <p>لا تقارن نتائجك بالمعدل "الطبيعي" فقط — المعدل الطبيعي واسع جدًا. ابحث عن المعدل "الأمثل":</p>
              <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-500">
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">التحليل</th>
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">المعدل الأمثل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { test: 'IGF-1', optimal: '200-300 ng/mL (حسب العمر)' },
                      { test: 'Fasting Glucose', optimal: '70-90 mg/dL' },
                      { test: 'HbA1c', optimal: 'أقل من 5.4%' },
                      { test: 'Fasting Insulin', optimal: '3-8 µIU/mL' },
                      { test: 'TSH', optimal: '1.0-2.5 mIU/L' },
                    ].map((row, i) => (
                      <tr key={row.test} className={cn('border-t', i % 2 === 0 && 'bg-stone-50 dark:bg-stone-900')}>
                        <td className="px-4 py-3 font-bold">{row.test}</td>
                        <td className="px-4 py-3">{row.optimal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        {
          id: 'red-flags',
          title: 'علامات تحذيرية (Red Flags)',
          content: (
            <div className="space-y-4">
              <WarningBox>
                <p className="font-bold mb-2">أوقف البروتوكول وراجع طبيبك فورًا إذا:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>IGF-1 أعلى من 350 ng/mL (خطر فرط هرمون النمو)</li>
                  <li>سكر الدم الصائم أعلى من 126 mg/dL بشكل مستمر</li>
                  <li>ارتفاع مفاجئ في إنزيمات الكبد (ALT/AST) بأكثر من 3x</li>
                  <li>تنميل أو تورّم في اليدين والقدمين (متلازمة النفق الرسغي)</li>
                  <li>آلام مفاصل شديدة لم تكن موجودة قبل البروتوكول</li>
                  <li>تغيّرات في الرؤية</li>
                  <li>احتباس سوائل مفرط</li>
                </ul>
              </WarningBox>
            </div>
          ),
        },
      ],
    },

    /* ── Module 6: Building Your Protocol ── */
    {
      id: 'protocol',
      number: 6,
      title: 'بناء بروتوكولك',
      titleEn: 'Building Your Protocol',
      icon: <Beaker className="h-6 w-6 text-emerald-500" />,
      readingTime: 11,
      sections: [
        {
          id: 'first-peptide',
          title: 'اختيار أول ببتيد',
          content: (
            <div className="space-y-4">
              <p>
                إذا كنت مبتدئًا، لا تبدأ بعدة ببتيدات في نفس الوقت.
                ابدأ بببتيد واحد لمعرفة كيف يستجيب جسمك قبل إضافة المزيد.
              </p>
              <h5 className="font-bold">أفضل الخيارات للمبتدئين حسب الهدف:</h5>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { goal: 'إدارة الوزن', peptide: 'Semaglutide', why: 'أكثر ببتيد مدروس. نتائج واضحة خلال 4-8 أسابيع.' },
                  { goal: 'تحسين النوم والتعافي', peptide: 'Ipamorelin', why: 'أنظف محفّز GH. آثار جانبية قليلة جدًا.' },
                  { goal: 'شفاء إصابة', peptide: 'BPC-157', why: 'شامل الشفاء. يمكن أخذه فمويًا أو بالحقن.' },
                  { goal: 'مكافحة الشيخوخة', peptide: 'Epithalon', why: 'بروتوكول قصير (10-20 يومًا). آمن جدًا.' },
                ].map((item) => (
                  <div key={item.goal} className="glass-card primary-border p-4">
                    <span className="text-xs font-bold text-emerald-700">{item.goal}</span>
                    <h5 className="font-bold text-stone-900 dark:text-stone-100 mt-1">{item.peptide}</h5>
                    <p className="text-xs mt-1 text-stone-600 dark:text-stone-300">{item.why}</p>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          id: 'dosing-principles',
          title: 'مبادئ الجرعات',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  { principle: 'ابدأ منخفضًا وارفع تدريجيًا (Start Low, Go Slow)', desc: 'ابدأ بأقل جرعة فعّالة. ارفع كل أسبوع إذا لم تشعر بآثار جانبية. هذا يسمح لجسمك بالتأقلم.' },
                  { principle: 'الجرعة الأقل الفعّالة (MED)', desc: 'هدفك هو الوصول لأقل جرعة تعطيك النتيجة المطلوبة — وليس أعلى جرعة تتحملها.' },
                  { principle: 'التوقيت مهم', desc: 'معظم محفّزات GH تؤخذ على معدة فارغة (قبل النوم أو صباحًا). GLP-1 عادةً أسبوعية في نفس اليوم.' },
                  { principle: 'الثبات أهم من الكمال', desc: 'نسيت يومًا؟ لا تضاعف. استمر بجرعتك العادية. الانتظام على المدى الطويل هو المفتاح.' },
                ].map((item) => (
                  <InfoCard key={item.principle} icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} title={item.principle}>
                    <p>{item.desc}</p>
                  </InfoCard>
                ))}
              </div>
            </div>
          ),
        },
        {
          id: 'cycling',
          title: 'استراتيجيات الدورات (Cycling)',
          content: (
            <div className="space-y-4">
              <p>
                معظم الببتيدات لا تحتاج استخدامًا مستمرًا. الدورات (On/Off cycles) تحافظ على حساسية المستقبلات
                وتمنع التحمّل (tolerance).
              </p>
              <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-500">
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">الببتيد</th>
                      <th scope="col" className="px-4 py-3 text-start font-bold text-white/90">نمط الدورة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { peptide: 'CJC-1295 / Ipamorelin', cycle: '5 أيام on / 2 أيام off، أو 3 أشهر on / شهر off' },
                      { peptide: 'BPC-157 / TB-500', cycle: '4-8 أسابيع حتى الشفاء، ثم توقف' },
                      { peptide: 'Epithalon', cycle: '10-20 يومًا كل 4-6 أشهر' },
                      { peptide: 'Semaglutide', cycle: 'استخدام مستمر (لا يحتاج دورات)' },
                      { peptide: 'TA-1', cycle: '2-3 أشهر on / شهر off' },
                    ].map((row, i) => (
                      <tr key={row.peptide} className={cn('border-t', i % 2 === 0 && 'bg-stone-50 dark:bg-stone-900')}>
                        <td className="px-4 py-3 font-bold">{row.peptide}</td>
                        <td className="px-4 py-3">{row.cycle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        },
        {
          id: 'combining',
          title: 'دمج الببتيدات بأمان',
          content: (
            <div className="space-y-4">
              <p>بعض الببتيدات تعمل بشكل أفضل معًا (synergy). لكن هناك قواعد:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 p-4">
                  <h5 className="font-bold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5"><CheckCircle className="h-4 w-4" /> تركيبات ممتازة</h5>
                  <ul className="text-xs space-y-1">
                    <li>CJC-1295 + Ipamorelin (تآزر GH)</li>
                    <li>BPC-157 + TB-500 (شفاء شامل)</li>
                    <li>Epithalon + GHK-Cu (مكافحة شيخوخة)</li>
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-red-200 dark:border-red-800 p-4">
                  <h5 className="font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> تجنّب الدمج</h5>
                  <ul className="text-xs space-y-1">
                    <li>عدة محفّزات GH معًا (فرط تحفيز)</li>
                    <li>Semaglutide + Tirzepatide (نفس المسار)</li>
                    <li>أكثر من 3 ببتيدات للمبتدئين</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm">
                استكشف التركيبات الجاهزة في{' '}
                <Link to="/stacks" className="text-emerald-700 hover:underline font-bold">بانِي البروتوكولات</Link>.
              </p>
              <p className="text-sm">
                تحقق من التفاعلات في{' '}
                <Link to="/interactions" className="text-emerald-700 hover:underline font-bold">فاحص التفاعلات</Link>.
              </p>
            </div>
          ),
        },
      ],
    },
  ];
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Guide() {
  const { subscription, isLoading } = useAuth();
  const isPro = !isLoading && (subscription?.isProOrTrial ?? false);

  const modules = buildModules();
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [progress, setProgressState] = useState<Record<string, boolean>>(getProgress);
  // Auto-open the first section of the initially-active module
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const firstSection = buildModules()[0]?.sections?.[0];
    return firstSection ? { [firstSection.id]: true } : {};
  });

  const activeModule = modules[activeModuleIndex];
  const completedCount = modules.filter((m) => progress[m.id]).length;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const markComplete = useCallback((moduleId: string) => {
    setProgress(moduleId, true);
    setProgressState((prev) => ({ ...prev, [moduleId]: true }));
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const markIncomplete = useCallback((moduleId: string) => {
    setProgress(moduleId, false);
    setProgressState((prev) => ({ ...prev, [moduleId]: false }));
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const goNext = useCallback(() => {
    if (activeModuleIndex < modules.length - 1) {
      markComplete(activeModule.id);
      const nextIdx = activeModuleIndex + 1;
      setActiveModuleIndex(nextIdx);
      // Auto-open first section of next module
      const firstSection = modules[nextIdx]?.sections?.[0];
      setOpenSections(firstSection ? { [firstSection.id]: true } : {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeModuleIndex, modules, activeModule.id, markComplete]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const goPrev = useCallback(() => {
    if (activeModuleIndex > 0) {
      const prevIdx = activeModuleIndex - 1;
      setActiveModuleIndex(prevIdx);
      // Auto-open first section of previous module
      const firstSection = modules[prevIdx]?.sections?.[0];
      setOpenSections(firstSection ? { [firstSection.id]: true } : {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeModuleIndex, modules]);

  if (isLoading) return <GenericPageSkeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>مركز التعلّم — دليل الببتيدات الشامل | pptides</title>
        <meta name="description" content="تعلّم كل شيء عن الببتيدات خطوة بخطوة — من المقدمة إلى بناء بروتوكولك الخاص. دليل تعليمي شامل باللغة العربية." />
        <link rel="canonical" href={`${SITE_URL}/guide`} />
        <meta property="og:title" content="مركز التعلّم — دليل الببتيدات الشامل | pptides" />
        <meta property="og:description" content="تعلّم كل شيء عن الببتيدات خطوة بخطوة — من المقدمة إلى بناء بروتوكولك الخاص." />
        <meta property="og:url" content={`${SITE_URL}/guide`} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="مركز التعلّم — دليل الببتيدات الشامل | pptides" />
        <meta name="twitter:description" content="تعلّم كل شيء عن الببتيدات خطوة بخطوة." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          "name": "مركز تعلّم الببتيدات",
          "description": "دليل تعليمي شامل عن الببتيدات العلاجية باللغة العربية",
          "inLanguage": "ar",
          "provider": { "@type": "Organization", "name": "pptides" },
          "hasCourseInstance": modules.map((m) => ({
            "@type": "CourseInstance",
            "name": m.title,
            "courseWorkload": `PT${m.readingTime}M`,
          })),
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "خطوات الحقن تحت الجلد — دليل عملي",
          "description": "دليل خطوة بخطوة للحقن الذاتي تحت الجلد للببتيدات بطريقة آمنة وصحيحة",
          "inLanguage": "ar",
          "totalTime": "PT5M",
          "supply": [
            { "@type": "HowToSupply", "name": "محقنة إنسولين (29-31 غيج)" },
            { "@type": "HowToSupply", "name": "مسحات كحولية" },
            { "@type": "HowToSupply", "name": "قارورة الببتيد المحضّر" },
          ],
          "tool": [
            { "@type": "HowToTool", "name": "حاوية التخلص من الأدوات الحادة" },
          ],
          "step": [
            { "@type": "HowToStep", "position": 1, "name": "غسل اليدين", "text": "بالماء والصابون لمدة 20 ثانية على الأقل. جفّف بمنشفة نظيفة." },
            { "@type": "HowToStep", "position": 2, "name": "تعقيم الغطاء المطاطي", "text": "امسح غطاء قارورة الببتيد بمسحة كحولية واتركه يجف 10 ثوانٍ." },
            { "@type": "HowToStep", "position": 3, "name": "سحب الجرعة", "text": "أدخل الإبرة في القارورة واسحب الكمية المطلوبة. تأكد من عدم وجود فقاعات هواء." },
            { "@type": "HowToStep", "position": 4, "name": "تعقيم موقع الحقن", "text": "امسح المنطقة بمسحة كحولية بحركة دائرية من المركز للخارج." },
            { "@type": "HowToStep", "position": 5, "name": "قرص الجلد", "text": "اقرص طية من الجلد بين الإبهام والسبابة لرفع طبقة الدهون عن العضلة." },
            { "@type": "HowToStep", "position": 6, "name": "إدخال الإبرة بزاوية 45°", "text": "أدخل الإبرة بسرعة وثبات. الحركة السريعة أقل ألمًا." },
            { "@type": "HowToStep", "position": 7, "name": "حقن المحلول ببطء", "text": "ادفع المكبس ببطء وثبات. انتظر 5 ثوانٍ بعد الانتهاء قبل سحب الإبرة." },
            { "@type": "HowToStep", "position": 8, "name": "سحب الإبرة والضغط", "text": "اسحب الإبرة واضغط بلطف على الموقع بمسحة نظيفة. لا تفرك." },
          ],
        })}</script>
      </Helmet>

      {/* ═══ Header ═══ */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-700">مركز التعلّم</h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-300">تعلّم كل شيء عن الببتيدات خطوة بخطوة</p>
      </div>

      {/* ═══ Progress Bar ═══ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
            التقدم: {completedCount} من {modules.length} وحدات
          </span>
          <span className="text-sm text-emerald-700 font-bold">
            {Math.round((completedCount / modules.length) * 100)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${(completedCount / modules.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ═══ Module Navigation (horizontal scroll on mobile) ═══ */}
      <div className="mb-8 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {modules.map((m, i) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveModuleIndex(i);
                const firstSection = m.sections?.[0];
                setOpenSections(firstSection ? { [firstSection.id]: true } : {});
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all whitespace-nowrap',
                i === activeModuleIndex
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : progress[m.id]
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              )}
            >
              {progress[m.id] && i !== activeModuleIndex && (
                <CheckCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{m.number}. {m.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Active Module Content ═══ */}
      <div className="space-y-6">
        {/* Module header */}
        <div className="glass-card primary-border p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {activeModule.icon}
              <div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  الوحدة {activeModule.number}: {activeModule.title}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-300 mt-1">{activeModule.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-300">
                <Clock className="h-4 w-4" />
                {activeModule.readingTime} دقائق
              </span>
              {progress[activeModule.id] ? (
                <button
                  onClick={() => markIncomplete(activeModule.id)}
                  className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  مكتمل
                </button>
              ) : (
                <button
                  onClick={() => markComplete(activeModule.id)}
                  className="rounded-full border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  تعيين كمكتمل
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sections (accordion) */}
        <BlurredSection isPro={isPro} isFree={activeModule.isFree}>
          <div className="space-y-3">
            {activeModule.sections.map((section, i) => (
              <div
                key={section.id}
                className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-start font-bold text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    {section.title}
                  </span>
                  <ChevronDown className={cn('h-5 w-5 shrink-0 text-emerald-500 transition-transform duration-200', openSections[section.id] && 'rotate-180')} />
                </button>
                {openSections[section.id] && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </BlurredSection>

        {/* ═══ Navigation Buttons ═══ */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={goPrev}
            disabled={activeModuleIndex === 0}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors',
              activeModuleIndex === 0
                ? 'text-stone-400 dark:text-stone-300 cursor-not-allowed'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
            )}
          >
            <ArrowRight className="h-4 w-4" />
            السابق
          </button>

          {activeModuleIndex < modules.length - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
            >
              التالي
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => markComplete(activeModule.id)}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="h-4 w-4" />
                إنهاء الدورة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Troubleshooting FAQ ═══ */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">مشاكل شائعة وحلولها</h2>
        <div className="space-y-3">
          {[
            { q: 'حقنت فقاعة هواء — هل هذا خطير؟', a: 'لا. فقاعات الهواء الصغيرة في الحقن تحت الجلد (SubQ) غير ضارة. يمتصها الجسم بشكل طبيعي. فقط تأكد من طرد الفقاعات الكبيرة قبل الحقن عن طريق النقر على السيرنج برفق.' },
            { q: 'موقع الحقن متورّم أو أحمر', a: 'احمرار خفيف وتورم بسيط في أول 24-48 ساعة طبيعي جدًا. استخدم كمادة باردة. إذا انتشر الاحمرار أو استمر أكثر من 48 ساعة أو ظهرت حرارة — راجع الطبيب فورًا.' },
            { q: 'نسيت أضع القارورة في الثلاجة طوال الليل', a: 'معظم الببتيدات المحلولة تتحمل درجة حرارة الغرفة لأقل من 24 ساعة. تحقق من صفاء المحلول — إذا كان شفافًا فغالبًا لا مشكلة. إذا أصبح عكرًا أو تغير لونه، تخلص منه وحضّر قارورة جديدة.' },
            { q: 'المحلول أصبح عكرًا أو متغير اللون', a: 'محلول عكر أو متغير اللون يعني احتمال تلف الببتيد. لا تستخدمه. حضّر قارورة جديدة. تأكد من استخدام ماء بكتيريوستاتيك (BAC water) وليس ماء عادي.' },
            { q: 'نسيت الحقن 3 أيام — ماذا أفعل؟', a: 'لا تضاعف الجرعة. استأنف الجرعة العادية من حيث توقفت. معظم الببتيدات لا تحتاج "تعويض". الاستمرارية أهم من الكمال.' },
            { q: 'أشعر بغثيان بعد حقن Semaglutide', a: 'الغثيان شائع جدًا مع GLP-1 (44% من المستخدمين). جرّب: تقليل الجرعة، الحقن قبل النوم بدل الصباح، تناول وجبات صغيرة وخفيفة، وتجنب الأطعمة الدهنية. يتحسن عادة خلال 2-3 أسابيع.' },
          ].map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 transition-all hover:border-amber-200 dark:hover:border-amber-800 card-hover">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-bold text-stone-900 dark:text-stone-100 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">{faq.q}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-emerald-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="details-content">
                <p className="px-5 pb-4 text-sm leading-relaxed text-stone-700 dark:text-stone-200">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <div className="mt-12 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
        {isPro ? (
          <>
            <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center justify-center gap-2"><GraduationCap className="h-5 w-5 text-emerald-600" /> أكملت الدورة التعليمية!</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">الآن حان وقت التطبيق — حضّر أول جرعة واحسبها بدقة</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/calculator" className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700">حاسبة الجرعات</Link>
              <Link to="/stacks" className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">بانِي البروتوكولات</Link>
              <Link to="/lab-guide" className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">دليل التحاليل</Link>
              <Link to="/tracker" className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">سجّل أول حقنة</Link>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold text-stone-900 dark:text-stone-100">جاهز تبدأ أول بروتوكول؟</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">اشترك للوصول إلى الدليل الكامل مع كل البروتوكولات</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/pricing" className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700">اشترك — {PRICING.essentials.label}/شهريًا</Link>
              <Link to="/calculator" className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">جرّب الحاسبة مجانًا</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
