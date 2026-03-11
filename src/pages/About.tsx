import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Globe, BookOpen, Stethoscope, ArrowLeft, Shield, FlaskConical,
  Brain, Syringe, Calculator, Users, FileCheck, RefreshCw, MessageSquare,
  AlertTriangle, Sparkles, GraduationCap, Heart, Lock,
} from 'lucide-react';
import { SITE_URL, PEPTIDE_COUNT, SUPPORT_EMAIL, TRIAL_DAYS, PUBMED_SOURCE_COUNT } from '@/lib/constants';

const stats = [
  { value: `${PEPTIDE_COUNT}+`, label: 'ببتيد مع بروتوكول كامل' },
  { value: `${PUBMED_SOURCE_COUNT}+`, label: 'مرجع من PubMed' },
  { value: '24/7', label: 'مدرب ذكي متاح' },
  { value: '2026', label: 'تأسست في السعودية' },
];

const differentiators = [
  {
    icon: FlaskConical,
    title: 'بروتوكولات عربية شاملة',
    desc: `أكثر من ${PEPTIDE_COUNT} ببتيد مع بروتوكولات مفصّلة بالعربية — الجرعات، التوقيت، الأعراض الجانبية، وطرق الحقن.`,
  },
  {
    icon: Brain,
    title: 'مدرب ذكي بالذكاء الاصطناعي',
    desc: 'استشارات فورية ومخصّصة حول البروتوكولات والجرعات — يفهم سياقك ويجيب بالعربية 24/7.',
  },
  {
    icon: GraduationCap,
    title: 'مبني على الأدلة العلمية',
    desc: `كل بروتوكول مدعوم بأبحاث محكّمة — أكثر من ${PUBMED_SOURCE_COUNT} مرجع من PubMed موثّق ومرتبط.`,
  },
  {
    icon: Lock,
    title: 'خصوصية أولاً',
    desc: 'لا نبيع بياناتك. لا نشاركها. لا إعلانات. اشتراكك هو مصدر دخلنا الوحيد.',
  },
  {
    icon: Calculator,
    title: 'أدوات ذكية متكاملة',
    desc: 'حاسبة جرعات دقيقة، سجل حقن شخصي، دليل تحاليل مخبرية، ومقارنة بين الببتيدات.',
  },
  {
    icon: Sparkles,
    title: 'تحديثات مستمرة',
    desc: 'محتوى يُحدَّث أسبوعيًا بناءً على أحدث الدراسات وملاحظات المستخدمين.',
  },
];

const standards = [
  {
    icon: FileCheck,
    title: 'مراجعة علمية صارمة',
    desc: 'كل بروتوكول يُراجَع مقابل الأبحاث المنشورة في المجلات الطبية المحكّمة قبل نشره.',
  },
  {
    icon: RefreshCw,
    title: 'تحديثات منتظمة',
    desc: 'نراجع المحتوى دوريًا ونحدّثه مع كل دراسة جديدة أو تغيير في الإرشادات العلمية.',
  },
  {
    icon: MessageSquare,
    title: 'ملاحظات المستخدمين',
    desc: 'نستمع لمستخدمينا ونُدمج ملاحظاتهم أسبوعيًا لتحسين المحتوى والأدوات.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>عن pptides — أول منصة عربية للببتيدات العلاجية | pptides</title>
        <meta name="description" content="تعرّف على pptides: أول منصة عربية متخصصة في علم الببتيدات العلاجية. أكثر من 63 ببتيد مع بروتوكولات كاملة، مدرب ذكي، وأدوات متقدمة." />
        <link rel="canonical" href={`${SITE_URL}/about`} />
        <meta property="og:title" content="عن pptides — أول منصة عربية للببتيدات العلاجية" />
        <meta property="og:description" content="أول منصة عربية متخصصة في علم الببتيدات — بروتوكولات كاملة، مدرب ذكي، مبنية على الأدلة العلمية." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/about`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="عن pptides — أول منصة عربية للببتيدات العلاجية" />
        <meta name="twitter:description" content="أول منصة عربية متخصصة في علم الببتيدات — بروتوكولات كاملة، مدرب ذكي، مبنية على الأدلة العلمية." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'pptides',
            url: SITE_URL,
            foundingDate: '2026',
            foundingLocation: { '@type': 'Place', name: 'Saudi Arabia' },
            description: 'أول منصة عربية متخصصة في علم الببتيدات العلاجية — بروتوكولات كاملة، مدرب ذكي، وأدوات متقدمة.',
            contactPoint: {
              '@type': 'ContactPoint',
              email: SUPPORT_EMAIL,
              contactType: 'customer service',
            },
          })}
        </script>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Globe className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl">
            عن <span className="text-emerald-700">pptides</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-stone-600 dark:text-stone-400 md:text-xl">
            نؤمن أن كل شخص يستحق وصولاً سهلاً لمعلومات طبية موثوقة عن الببتيدات العلاجية
          </p>
        </div>

        {/* Stats */}
        <div className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 text-center"
            >
              <div className="mb-1 text-2xl font-bold text-emerald-700 md:text-3xl">{value}</div>
              <div className="text-sm text-stone-600 dark:text-stone-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Our Story */}
        <section className="mb-16">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-stone-950 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <BookOpen className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">قصّتنا</h2>
                <div className="space-y-4 text-base leading-relaxed text-stone-700 dark:text-stone-200">
                  <p>
                    في 2026، لاحظنا فجوة واضحة: المحتوى العلمي عن الببتيدات العلاجية متوفر بالإنجليزية فقط،
                    مبعثر بين منتديات ومقاطع فيديو بدون تنظيم أو مراجعة علمية. المستخدم العربي المهتم
                    بالصحة والبيوهاكينغ لم يكن لديه مصدر موثوق واحد يرجع إليه.
                  </p>
                  <p>
                    أسّسنا pptides في المملكة العربية السعودية لسد هذه الفجوة — منصة بناها فريق طبي وتقني
                    يجمع بين الخبرة الطبية والشغف الشخصي بالببتيدات. بدأنا كمشروع بسيط، وتطوّر ليصبح
                    المرجع العربي الأشمل مع أكثر من {PEPTIDE_COUNT} ببتيد وبروتوكولات مفصّلة.
                  </p>
                  <p>
                    هدفنا ليس بيع ببتيدات أو تقديم وصفات علاجية — بل تمكين المستخدم العربي من فهم العلم
                    واتخاذ قرارات مستنيرة بالتعاون مع طبيبه المعالج.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-stone-100 md:text-3xl">
            ما الذي يميّز <span className="text-emerald-700">pptides</span>؟
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {differentiators.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 transition-all hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Icon className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="mb-2 font-bold text-stone-900 dark:text-stone-100">{title}</h3>
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Team */}
        <section className="mb-16">
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">فريقنا</h2>
                <div className="space-y-4 text-base leading-relaxed text-stone-700 dark:text-stone-200">
                  <p>
                    فريق من الباحثين والمطورين يجمع بين الخلفية الطبية والخبرة التقنية. كل عضو في الفريق
                    يشارك نفس الشغف: تقديم معلومات دقيقة وموثوقة عن الببتيدات العلاجية للعالم العربي.
                  </p>
                  <p>
                    يقود الفريق الطبي طبيب عام عربي بدأ رحلته مع الببتيدات كمستخدم شخصي، ثم حوّل
                    تجربته ومعرفته إلى محتوى تعليمي منظّم. الفريق التقني يعمل على تطوير أدوات ذكية
                    تجعل المعلومات المعقدة سهلة الوصول والاستخدام.
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    لأسباب مهنية وقانونية، نحافظ على خصوصية أعضاء الفريق مع التأكيد على الخلفية
                    الطبية والعلمية لكل المحتوى المنشور.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Standards */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-stone-100 md:text-3xl">
            معاييرنا
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {standards.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Icon className="h-6 w-6 text-emerald-700" />
                </div>
                <h3 className="mb-2 font-bold text-stone-900 dark:text-stone-100">{title}</h3>
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Medical Disclaimer */}
        <section className="mb-16">
          <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">تنبيه طبي مهم</h2>
                <p className="text-base font-semibold leading-relaxed text-stone-800 dark:text-stone-200">
                  pptides.com منصة تعليمية وليست بديلاً عن الاستشارة الطبية.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                  المحتوى المنشور على المنصة مخصّص للأغراض التعليمية فقط ولا يُعتبر نصيحة طبية أو
                  وصفة علاجية. استشر طبيبك المعالج دائمًا قبل البدء بأي بروتوكول. لا نتحمل مسؤولية
                  أي قرار يُتخذ بناءً على المعلومات المنشورة دون إشراف طبي مختص.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Links */}
        <div className="mb-12 flex flex-wrap justify-center gap-3">
          <Link
            to="/transparency"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 px-6 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <Shield className="h-4 w-4" />
            <span>الشفافية</span>
          </Link>
          <Link
            to="/sources"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 px-6 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <BookOpen className="h-4 w-4" />
            <span>المصادر العلمية</span>
          </Link>
          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 px-6 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <Heart className="h-4 w-4" />
            <span>سياسة الخصوصية</span>
          </Link>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/pricing"
            className="btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            <span>ابدأ الآن</span>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">{TRIAL_DAYS} أيام تجربة مجانية — إلغاء في أي وقت</p>
        </div>
      </div>
    </div>
  );
}
