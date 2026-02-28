import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  BookOpen,
  Shield,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL } from '@/lib/constants';

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
      <div aria-hidden="true" className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <Link
          to="/pricing"
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
        >
          اشترك للوصول الكامل
        </Link>
      </div>
    </div>
  );
}

const SVG_COLORS = {
  primary: '#10b981' /* emerald-500 */,
  primaryLight: '#10b98120',
  border: '#d6d3d1' /* stone-300 */,
} as const;

export default function Guide() {
  const { subscription, isLoading } = useAuth();
  const isPro = !isLoading && (subscription?.isProOrTrial ?? false);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>دليل التحضير والحقن | pptides</title>
        <meta name="description" content="خطوات تحضير الببتيدات والحقن تحت الجلد ومواقع الحقن وقواعد التخزين. How to reconstitute and inject peptides safely." />
        <meta property="og:title" content="دليل تحضير وحقن الببتيدات | pptides" />
        <meta property="og:description" content="دليل عملي خطوة بخطوة لتحضير وحقن الببتيدات بأمان" />
        <meta property="og:url" content={`${SITE_URL}/guide`} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="ar_SA" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "دليل تحضير وحقن الببتيدات",
          "description": "دليل عملي خطوة بخطوة لتحضير وحقن الببتيدات بأمان",
          "inLanguage": "ar",
          "step": [
            {"@type": "HowToStep", "name": "غسل اليدين", "text": "اغسل يديك بالماء والصابون لمدة 20 ثانية"},
            {"@type": "HowToStep", "name": "تعقيم الأغطية", "text": "امسح أغطية القارورة بمسحة كحولية"},
            {"@type": "HowToStep", "name": "سحب الماء", "text": "اسحب الكمية المطلوبة من الماء البكتيريوستاتك"},
            {"@type": "HowToStep", "name": "إضافة الماء", "text": "أضف الماء ببطء على جدار القارورة"},
            {"@type": "HowToStep", "name": "سحب الجرعة", "text": "اسحب الجرعة المطلوبة بالسيرنج"},
            {"@type": "HowToStep", "name": "الحقن", "text": "احقن تحت الجلد في البطن أو الفخذ"}
          ]
        })}</script>
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"
        >
          <BookOpen className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-600">
          الدليل العملي
        </h1>
        <p className="mt-2 text-lg text-stone-600">
          من التحضير إلى التنفيذ
        </p>
      </div>

      <div className="space-y-10">
        {/* ── Section 1: Required tools ── */}
        <section id="required-tools">
          <div className="mb-4 flex items-center gap-3">
            <FlaskConical className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
              الأدوات المطلوبة
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-500">
                    <th className="px-4 py-3 text-right font-bold text-white/90">الأداة</th>
                    <th className="px-4 py-3 text-right font-bold text-white/90">الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredTools.map((tool, i) => (
                    <tr
                      key={tool.name}
                      className={cn("border-t transition-colors hover:bg-stone-50", i % 2 === 0 && "bg-stone-50")}
                    >
                      <td className="px-4 py-3 font-bold">
                        {tool.name}
                      </td>
                      <td className="px-4 py-3">
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
        <section id="reconstitution">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
              خطوات التحضير
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <ol className="grid gap-4 list-none p-0 m-0">
              {reconstitutionSteps.map((item, i) => (
                <li
                  key={item.step}
                  className="glass-card gold-border flex items-start gap-4 p-5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold">
                      {item.step}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </BlurredSection>
        </section>

        {/* ── Section 3: Injection sites ── */}
        <section id="injection-sites">
          <div className="mb-4 flex items-center gap-3">
            <FlaskConical className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
              مواقع الحقن
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            {/* Visual injection site diagram */}
            <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                <svg viewBox="0 0 200 400" className="h-64 w-auto shrink-0" role="img" aria-label="مواقع الحقن تحت الجلد">
                  {/* Body outline */}
                  <ellipse cx="100" cy="40" rx="25" ry="30" fill="none" stroke={SVG_COLORS.border} strokeWidth="1.5" />
                  <line x1="100" y1="70" x2="100" y2="200" stroke={SVG_COLORS.border} strokeWidth="1.5" />
                  <line x1="100" y1="90" x2="45" y2="160" stroke={SVG_COLORS.border} strokeWidth="1.5" />
                  <line x1="100" y1="90" x2="155" y2="160" stroke={SVG_COLORS.border} strokeWidth="1.5" />
                  <line x1="100" y1="200" x2="65" y2="370" stroke={SVG_COLORS.border} strokeWidth="1.5" />
                  <line x1="100" y1="200" x2="135" y2="370" stroke={SVG_COLORS.border} strokeWidth="1.5" />
                  {/* Abdomen highlight */}
                  <circle cx="100" cy="165" r="18" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
                  <text x="100" y="170" textAnchor="middle" fontSize="8" fill={SVG_COLORS.primary} fontWeight="bold">البطن</text>
                  {/* Thigh highlight */}
                  <ellipse cx="78" cy="280" rx="12" ry="25" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
                  <text x="78" y="285" textAnchor="middle" fontSize="7" fill={SVG_COLORS.primary} fontWeight="bold">الفخذ</text>
                  <ellipse cx="122" cy="280" rx="12" ry="25" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
                  {/* Arm highlight */}
                  <circle cx="45" cy="135" r="10" fill={SVG_COLORS.primaryLight} stroke={SVG_COLORS.primary} strokeWidth="2" strokeDasharray="4 2" />
                  <text x="20" y="138" textAnchor="middle" fontSize="7" fill={SVG_COLORS.primary} fontWeight="bold">الذراع</text>
                </svg>
                <div className="flex-1 space-y-3">
                  {injectionSites.map((row) => (
                    <div key={row.site} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
        <section id="important-rules">
          <div className="mb-4 flex items-center gap-3">
            <Shield className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
              قواعد مهمة
            </h2>
          </div>

          <BlurredSection isPro={isPro}>
            <div
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <ul className="space-y-3">
                {importantRules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3">
                    <AlertCircle
                      className="mt-0.5 h-5 w-5 shrink-0"
                      
                    />
                    <span className="text-sm leading-relaxed">
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </BlurredSection>
        </section>

        {/* ── Section 5: Other administration routes ── */}
        <section id="other-routes">
          <div className="mb-4 flex items-center gap-3">
            <BookOpen className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-2xl font-bold">
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
                  <p className="flex-1 text-sm leading-relaxed">
                    {route.desc}
                  </p>
                </div>
              ))}
            </div>
          </BlurredSection>
        </section>
      </div>

      {/* ═══════ TROUBLESHOOTING FAQ ═══════ */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-stone-900">مشاكل شائعة وحلولها</h2>
        <div className="space-y-3">
          {[
            { q: 'حقنت فقاعة هواء — هل هذا خطير؟', a: 'لا. فقاعات الهواء الصغيرة في الحقن تحت الجلد (SubQ) غير ضارة. يمتصها الجسم بشكل طبيعي. فقط تأكد من طرد الفقاعات الكبيرة قبل الحقن عن طريق النقر على السيرنج برفق.' },
            { q: 'موقع الحقن متورّم أو أحمر', a: 'احمرار خفيف وتورم بسيط في أول 24-48 ساعة طبيعي جدًا. استخدم كمادة باردة. إذا انتشر الاحمرار أو استمر أكثر من 48 ساعة أو ظهرت حرارة — راجع الطبيب فورًا.' },
            { q: 'نسيت أضع القارورة في الثلاجة طوال الليل', a: 'معظم الببتيدات المحلولة تتحمل درجة حرارة الغرفة لأقل من 24 ساعة. تحقق من صفاء المحلول — إذا كان شفافًا فغالبًا لا مشكلة. إذا أصبح عكرًا أو تغير لونه، تخلص منه وحضّر قارورة جديدة.' },
            { q: 'المحلول أصبح عكرًا أو متغير اللون', a: 'محلول عكر أو متغير اللون يعني احتمال تلف الببتيد. لا تستخدمه. حضّر قارورة جديدة. تأكد من استخدام ماء بكتيريوستاتيك (BAC water) وليس ماء عادي.' },
            { q: 'نسيت الحقن 3 أيام — ماذا أفعل؟', a: 'لا تضاعف الجرعة. استأنف الجرعة العادية من حيث توقفت. معظم الببتيدات لا تحتاج "تعويض". الاستمرارية أهم من الكمال.' },
            { q: 'أشعر بغثيان بعد حقن Semaglutide', a: 'الغثيان شائع جدًا مع GLP-1 (44% من المستخدمين). جرّب: تقليل الجرعة، الحقن قبل النوم بدل الصباح، تناول وجبات صغيرة وخفيفة، وتجنب الأطعمة الدهنية. يتحسن عادة خلال 2-3 أسابيع.' },
          ].map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-stone-200 bg-white transition-all hover:border-amber-200">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-bold text-stone-900 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">⚠️ {faq.q}</span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-stone-700">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        {isPro ? (
          <>
            <p className="font-bold text-stone-900">الخطوة التالية</p>
            <p className="mt-1 text-sm text-stone-600">تعلّمت الحقن — الآن تأكد من تحاليلك واحسب جرعتك</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/lab-guide" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">دليل التحاليل</Link>
              <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">حاسبة الجرعات</Link>
              <Link to="/tracker" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">سجّل أول حقنة</Link>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold text-stone-900">جاهز تبدأ أول بروتوكول؟</p>
            <p className="mt-1 text-sm text-stone-600">اشترك للوصول إلى الدليل الكامل مع كل البروتوكولات</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">اشترك — {PRICING.essentials.label}/شهريًا</Link>
              <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">جرّب الحاسبة مجانًا</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
