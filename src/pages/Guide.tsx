import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  BookOpen,
  Shield,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING } from '@/lib/constants';

const requiredTools = [
  { name: 'قارورة الببتيد (Vial)', desc: 'تحتوي على الببتيد المجفّد (lyophilized)' },
  { name: 'ماء بكتيريوستاتك (Bacteriostatic Water)', desc: 'ماء معقّم مع 0.9% كحول بنزيلي للحفظ' },
  { name: 'محاقن إنسولين (29-31 gauge)', desc: 'إبر رفيعة للحقن تحت الجلد — ألم أقل' },
  { name: 'مسحات كحولية (Alcohol Swabs)', desc: 'لتعقيم الأغطية المطاطية وموقع الحقن' },
  { name: 'حاوية الإبر الحادة (Sharps Container)', desc: 'للتخلص الآمن من الإبر المستعملة' },
];

const reconstitutionSteps = [
  { step: 'غسل اليدين', detail: 'بالماء والصابون لمدة 20 ثانية على الأقل' },
  { step: 'تعقيم الأغطية المطاطية', detail: 'امسح غطاء القارورة وغطاء الماء بمسحة كحولية واتركها تجف' },
  { step: 'سحب الماء البكتيريوستاتك', detail: 'اسحب الكمية المطلوبة من الماء باستخدام محقنة إنسولين' },
  { step: 'إضافة الماء على جدار القارورة', detail: 'أضف الماء ببطء على جدار القارورة الداخلي — لا تصبّه مباشرة على البودرة أبدًا' },
  { step: 'التذويب بحركة دائرية لطيفة', detail: 'دوّر القارورة بلطف حتى يذوب البودرة بالكامل — لا ترجّها أبدًا' },
];

const injectionSites = [
  { site: 'البطن', desc: 'المنطقة المحيطة بالسرّة (5 سم حول السرّة على الأقل). الأكثر شيوعًا لسهولة الوصول والامتصاص الجيد.' },
  { site: 'الفخذ', desc: 'الجزء الأمامي-الجانبي من الفخذ. منطقة واسعة تسمح بتدوير المواقع بسهولة.' },
  { site: 'أعلى الذراع', desc: 'الجزء الخلفي من أعلى الذراع. يحتاج مساعدة شخص آخر في بعض الأحيان.' },
];

const importantRules = [
  'دوّر مواقع الحقن يوميًا لتجنب التليّف أو الضمور الدهني',
  'أدخل الإبرة بزاوية 45 درجة للحقن تحت الجلد',
  'لا تُعد تغطية الإبرة بعد الاستخدام — ضعها مباشرة في حاوية الإبر الحادة',
  'اغسل يديك قبل وبعد كل حقن',
  'لا تحقن في مناطق ملتهبة أو متورمة أو بها كدمات',
  'تأكد من عدم وجود فقاعات هواء في المحقنة قبل الحقن',
];

const otherRoutes = [
  {
    title: 'بخاخ الأنف (Intranasal)',
    peptides: 'Semax، Selank، DSIP',
    desc: 'يتجاوز الحاجز الدموي الدماغي مباشرة — مثالي للببتيدات العصبية. بخّة أو بخّتان في كل فتحة أنف.',
  },
  {
    title: 'عن طريق الفم (Oral)',
    peptides: 'Larazotide، KPV، BPC-157',
    desc: 'كبسولات مقاومة للحمض المعدي. مثالية لببتيدات الأمعاء التي تعمل موضعيًا على بطانة الجهاز الهضمي.',
  },
  {
    title: 'الكريمات الموضعية (Topical)',
    peptides: 'GHK-Cu',
    desc: 'سيروم أو كريم بتركيز 1-2%. يُوضع مباشرة على البشرة لتحفيز الكولاجين وتجديد الخلايا.',
  },
];

function BlurredSection({ isPro, children }: { isPro: boolean; children: React.ReactNode }) {
  if (isPro) return <>{children}</>;

  return (
    <div className="relative">
      <div aria-hidden="true" style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <Link
          to="/pricing"
          className="rounded-lg px-4 py-2 text-sm font-bold gold-gradient text-white shadow-md transition-transform hover:scale-105"
        >
          اشترك للوصول الكامل
        </Link>
      </div>
    </div>
  );
}

export default function Guide() {
  const { subscription, isLoading } = useAuth();
  const isPro = !isLoading && (subscription?.isProOrTrial ?? false);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
      <Helmet>
        <title>دليل تحضير وحقن الببتيدات — خطوات عملية | Peptide Reconstitution Guide</title>
        <meta name="description" content="خطوات تحضير الببتيدات والحقن تحت الجلد ومواقع الحقن وقواعد التخزين. How to reconstitute and inject peptides safely." />
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: '#10b981' }}
        >
          <BookOpen className="h-7 w-7"  />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-600">
          الدليل العملي
        </h1>
        <p className="mt-2 text-lg" >
          من التحضير إلى التنفيذ
        </p>
      </div>

      <div className="space-y-10">
        {/* ── Section 1: Required tools ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <FlaskConical className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              الأدوات المطلوبة
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: '#d6d3d1' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#10b981' }}>
                    <th className="px-4 py-3 text-right font-bold text-white/90">الأداة</th>
                    <th className="px-4 py-3 text-right font-bold text-white/90">الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredTools.map((tool, i) => (
                    <tr
                      key={tool.name}
                      className="border-t transition-colors hover:bg-stone-50"
                      style={{
                        background: i % 2 === 0 ? 'var(--card)' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 font-bold" >
                        {tool.name}
                      </td>
                      <td className="px-4 py-3" >
                        {tool.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BlurredSection>
        </section>

        {/* ── Section 2: Reconstitution steps ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              خطوات التحضير
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <div className="grid gap-4">
              {reconstitutionSteps.map((item, i) => (
                <div
                  key={item.step}
                  className="glass-card gold-border flex items-start gap-4 p-5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{ background: '#10b981' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold" >
                      {item.step}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed" >
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </BlurredSection>
        </section>

        {/* ── Section 3: Injection sites ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <FlaskConical className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              مواقع الحقن
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            {/* Visual injection site diagram */}
            <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                <svg viewBox="0 0 200 400" className="h-64 w-auto shrink-0" role="img" aria-label="مواقع الحقن تحت الجلد">
                  {/* Body outline */}
                  <ellipse cx="100" cy="40" rx="25" ry="30" fill="none" stroke="#d6d3d1" strokeWidth="1.5" />
                  <line x1="100" y1="70" x2="100" y2="200" stroke="#d6d3d1" strokeWidth="1.5" />
                  <line x1="100" y1="90" x2="45" y2="160" stroke="#d6d3d1" strokeWidth="1.5" />
                  <line x1="100" y1="90" x2="155" y2="160" stroke="#d6d3d1" strokeWidth="1.5" />
                  <line x1="100" y1="200" x2="65" y2="370" stroke="#d6d3d1" strokeWidth="1.5" />
                  <line x1="100" y1="200" x2="135" y2="370" stroke="#d6d3d1" strokeWidth="1.5" />
                  {/* Abdomen highlight */}
                  <circle cx="100" cy="165" r="18" fill="#10b98120" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="100" y="170" textAnchor="middle" fontSize="8" fill="#10b981" fontWeight="bold">البطن</text>
                  {/* Thigh highlight */}
                  <ellipse cx="78" cy="280" rx="12" ry="25" fill="#10b98120" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="78" y="285" textAnchor="middle" fontSize="7" fill="#10b981" fontWeight="bold">الفخذ</text>
                  <ellipse cx="122" cy="280" rx="12" ry="25" fill="#10b98120" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
                  {/* Arm highlight */}
                  <circle cx="45" cy="135" r="10" fill="#10b98120" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="20" y="138" textAnchor="middle" fontSize="7" fill="#10b981" fontWeight="bold">الذراع</text>
                </svg>
                <div className="flex-1 space-y-3">
                  {injectionSites.map((row) => (
                    <div key={row.site} className="rounded-xl border border-stone-200 bg-white p-4">
                      <h4 className="text-sm font-bold text-stone-900">{row.site}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">{row.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BlurredSection>
        </section>

        {/* ── Section 4: Important rules ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Shield className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              قواعد مهمة
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: '#d6d3d1', background: '#ffffff' }}
            >
              <ul className="space-y-3">
                {importantRules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3">
                    <AlertCircle
                      className="mt-0.5 h-5 w-5 shrink-0"
                      
                    />
                    <span className="text-sm leading-relaxed" >
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </BlurredSection>
        </section>

        {/* ── Section 5: Other administration routes ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <BookOpen className="h-6 w-6 shrink-0"  />
            <h2 className="text-2xl font-bold" >
              طرق الاستخدام الأخرى
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <div className="grid gap-4 sm:grid-cols-3">
              {otherRoutes.map((route) => (
                <div key={route.title} className="glass-card gold-border flex flex-col p-5">
                  <h3
                    className="mb-1 text-base font-bold"
                    
                  >
                    {route.title}
                  </h3>
                  <span
                    className="mb-3 text-xs font-semibold"
                    
                  >
                    {route.peptides}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed" >
                    {route.desc}
                  </p>
                </div>
              ))}
            </div>
          </BlurredSection>
        </section>
      </div>

      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        {isPro ? (
          <>
            <p className="font-bold text-stone-900">الخطوة التالية</p>
            <p className="mt-1 text-sm text-stone-600">تعلّمت الحقن — الآن تأكد من تحاليلك واحسب جرعتك</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/lab-guide" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">دليل التحاليل</Link>
              <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">حاسبة الجرعات</Link>
              <Link to="/tracker" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">سجّل أول حقنة</Link>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold text-stone-900">جاهز تبدأ أول بروتوكول؟</p>
            <p className="mt-1 text-sm text-stone-600">اشترك للوصول إلى الدليل الكامل مع كل البروتوكولات</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">اشترك — {PRICING.essentials.label}/شهريًا</Link>
              <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">جرّب الحاسبة مجانًا</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
