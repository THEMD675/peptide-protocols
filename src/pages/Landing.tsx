import { useState, useEffect, lazy, Suspense } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
// BPC-157 data inlined to avoid loading the full 131KB peptides dataset on landing
const BPC_157_PREVIEW = {
  nameAr: 'BPC-157',
  nameEn: 'BPC-157',
  dosageAr: '250-500 ميكروغرام مرة إلى مرتين يوميًا. للإصابات الحادة: 500 ميكروغرام مرتين يوميًا. للصيانة: 250 ميكروغرام مرة واحدة.',
  timingAr: 'يُفضل تقسيم الجرعة على مرتين (صباحًا ومساءً). يمكن حقنه بالقرب من مكان الإصابة (site injection) لتأثير موضعي أقوى.',
  cycleAr: '4-6 أسابيع استخدام ثم 2-4 أسابيع راحة. يمكن التكرار حسب الحاجة. للأمعاء: دورات أطول (8-12 أسبوع) قد تكون ضرورية.',
  administrationAr: 'حقن تحت الجلد (Sub-Q) بالقرب من الإصابة أو في البطن. يتوفر أيضًا بشكل فموي (كبسولات) لمشاكل الجهاز الهضمي — الشكل الفموي فعّال للأمعاء لأنه مقاوم للحمض المعدي بطبيعته.',
  stackAr: 'يُدمج مع TB-500 (المزيج الذهبي للتعافي). يمكن إضافة GHK-Cu لتعزيز شفاء البشرة والأنسجة الرخوة.',
  costEstimate: '225-375 ر.س/شهر',
} as const;
import {
  FlaskConical,
  Calculator,
  TestTube,
  Layers,
  BookOpen,
  RefreshCw,
  Check,
  X,
  ArrowLeft,
  Shield,
  Lock,
  CreditCard,
  Zap,
  Star,
  Crown,
  ChevronDown,
  Gift,
} from 'lucide-react';
const EmailCapture = lazy(() => import('@/components/EmailCapture'));
const FeatureComparisonTable = lazy(() => import('@/components/FeatureComparisonTable'));
import TrustBadges from '@/components/TrustBadges';
import AnimatedCounter from '@/components/AnimatedCounter';
import TrialCountdown from '@/components/TrialCountdown';
const PeptideQuiz = lazy(() => import('@/components/PeptideQuiz'));
import { cn } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT, PUBMED_SOURCE_LABEL, VALUE_TOTAL, VALUE_SAVINGS_ESSENTIALS, VALUE_STACK, SITE_URL, SUPPORT_EMAIL, STORAGE_KEYS, TRIAL_DAYS } from '@/lib/constants';


const PAIN_POINTS = [
  'تضيّع ساعات تبحث في Reddit و YouTube عن معلومات متناقضة',
  'لا تعرف أي ببتيد يناسب هدفك — فقدان دهون؟ بناء عضل؟ تعافٍ؟',
  'خائف تحقن نفسك بجرعة خاطئة وتدفع الثمن من صحتك',
  'لا يوجد مرجع عربي واحد يجمع كل شيء بمكان واحد',
];


const FEATURES = [
  {
    icon: FlaskConical,
    title: `${PEPTIDE_COUNT} ببتيد مع بروتوكول كامل`,
    description: 'الآلية، الجرعة، التوقيت، الأعراض الجانبية، ومستوى الأدلة — كل شيء في بطاقة واحدة.',
  },
  {
    icon: Calculator,
    title: 'حاسبة جرعات لا تخطئ',
    description: 'أدخل وزن القارورة والتركيز — تحصل على الجرعة بالوحدات فورًا.',
  },
  {
    icon: TestTube,
    title: 'دليل تحاليل يحميك',
    description: '11 تحليل أساسي قبل وأثناء وبعد. مع علامات التحذير التي لا يخبرك عنها أحد.',
  },
  {
    icon: Layers,
    title: 'بروتوكولات مُجمَّعة جاهزة',
    description: 'خلطات مُجرَّبة: تعافٍ، دماغ، طول عمر، فقدان دهون. جاهزة للتطبيق.',
  },
  {
    icon: BookOpen,
    title: 'دليل عملي للتحضير والحقن',
    description: 'من فتح القارورة إلى الحقن — كل خطوة موثّقة بمواقع الحقن وقواعد التخزين.',
  },
  {
    icon: RefreshCw,
    title: 'مبني على الأبحاث',
    description: 'كل معلومة مربوطة بدراسة. مستوى قوة الأدلة واضح أمامك.',
  },
];

const STATS_BAR = [
  { value: `${PEPTIDE_COUNT}+`, label: 'ببتيد علاجي', sub: 'بروتوكولات كاملة' },
  { value: '6', label: 'فئات متخصصة', sub: 'من الأيض للدماغ' },
  { value: '11', label: 'تحليل مخبري', sub: 'قبل وأثناء وبعد' },
  { value: PUBMED_SOURCE_LABEL, label: 'مصدر علمي', sub: 'دراسات سريرية' },
  { value: '24/7', label: 'مدرب ذكي', sub: 'إجابات فورية' },
];

const SOLUTION_CHECKS = [
  'كل المعلومات في مكان واحد — لا حاجة لـ Reddit',
  'اختبار يحدد لك الببتيد المناسب',
  'حاسبة جرعات دقيقة تحميك',
  'أول مرجع عربي شامل مبني على الأبحاث',
];

const HOW_IT_WORKS_STEPS = [
  { num: '01', title: 'سجّل حسابك', desc: 'بريد إلكتروني وكلمة مرور. 10 ثوانٍ.' },
  { num: '02', title: `جرّب ${TRIAL_DAYS} أيام مجانًا`, desc: 'تصفّح المكتبة واكتشف ما يناسبك.' },
  { num: '03', title: 'اشترك واستفد', desc: 'اختر خطتك وابدأ رحلتك بثقة.' },
];

interface Testimonial {
  text: string;
  name: string;
  role: string;
  rating: number;
}

export default function Landing() {
  useScrollReveal();
  const { user, subscription, isLoading } = useAuth();
  const [userCount, setUserCount] = useState(() => {
    try {
      const c = localStorage.getItem(STORAGE_KEYS.USER_COUNT) ?? sessionStorage.getItem('pptides_user_count');
      return c ? Number(c) : 0;
    } catch { return 0; }
  });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const shouldRedirect = !isLoading && user && subscription.isProOrTrial;

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && /^PP-[A-Z0-9]{6}$/.test(ref)) {
        localStorage.setItem('pptides_referral', ref);
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.toString());
      }
    } catch { /* expected */ }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Hydrate reviews from sessionStorage cache immediately (before fetch)
    try {
      const cachedReviews = sessionStorage.getItem(STORAGE_KEYS.REVIEWS);
      const cachedReviewsTs = sessionStorage.getItem(STORAGE_KEYS.REVIEWS_TS);
      if (cachedReviews && cachedReviewsTs && Date.now() - Number(cachedReviewsTs) < 30 * 60 * 1000) {
        const parsed = JSON.parse(cachedReviews) as Testimonial[];
        if (parsed.length > 0) setTestimonials(parsed);
      }
    } catch { /* expected */ }

    const fetchData = () => {
      if (!mounted) return;
      let cached: string | null = null;
      try { cached = sessionStorage.getItem(STORAGE_KEYS.USER_COUNT_TS) ?? sessionStorage.getItem('pptides_user_count_ts'); } catch { /* Safari private */ }
      const cacheValid = cached && Date.now() - Number(cached) < 5 * 60 * 1000;

      // Check if reviews are still cache-valid (fetched above) to skip re-fetching
      let reviewsCacheValid = false;
      try {
        const rts = sessionStorage.getItem(STORAGE_KEYS.REVIEWS_TS);
        reviewsCacheValid = !!rts && Date.now() - Number(rts) < 30 * 60 * 1000;
      } catch { /* expected */ }

      Promise.all([
        cacheValid ? Promise.resolve({ count: null, error: null }) : supabase.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', ['active', 'trial']).not('stripe_subscription_id', 'is', null),
        reviewsCacheValid ? Promise.resolve({ data: null, error: null }) : supabase.from('reviews').select('body, rating, name, created_at').eq('is_approved', true).gte('rating', 4).order('created_at', { ascending: false }).limit(3),
      ]).then(([subsResult, reviewsResult]) => {
        if (!mounted) return;
        if (!subsResult.error && subsResult.count != null && subsResult.count > 0) {
          setUserCount(subsResult.count);
          try {
            localStorage.setItem(STORAGE_KEYS.USER_COUNT, String(subsResult.count));
            localStorage.setItem(STORAGE_KEYS.USER_COUNT_TS, String(Date.now()));
            sessionStorage.setItem('pptides_user_count', String(subsResult.count));
            sessionStorage.setItem('pptides_user_count_ts', String(Date.now()));
          } catch { /* expected */ }
        } else if (subsResult.error) {
          try {
            const cachedCount = localStorage.getItem(STORAGE_KEYS.USER_COUNT);
            setUserCount(Number(cachedCount) || 0);
          } catch {
            setUserCount(0);
          }
        }
        if (!reviewsResult.error && reviewsResult.data && reviewsResult.data.length > 0) {
          const mapped = reviewsResult.data.map((r) => ({
            text: r.body,
            name: r.name ?? 'مستخدم',
            role: `تقييم ${r.rating}/5`,
            rating: r.rating,
          }));
          setTestimonials(mapped);
          try {
            sessionStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(mapped));
            sessionStorage.setItem(STORAGE_KEYS.REVIEWS_TS, String(Date.now()));
          } catch { /* expected */ }
        }
      }).catch(() => { /* network error — data not critical for landing */ });
    };

    // Defer Supabase calls until after first paint so hero renders immediately
    let handle: number | ReturnType<typeof setTimeout>;
    if (typeof requestIdleCallback !== 'undefined') {
      handle = requestIdleCallback(fetchData, { timeout: 2000 }) as unknown as number;
      return () => { mounted = false; cancelIdleCallback(handle as number); };
    } else {
      handle = setTimeout(fetchData, 0);
      return () => { mounted = false; clearTimeout(handle as ReturnType<typeof setTimeout>); };
    }
  }, []);
  if (shouldRedirect) return <Navigate to="/dashboard" replace />;

  const ctaLink = user ? '/pricing' : '/signup?redirect=/pricing';
  const ctaText = user ? 'اشترك الآن' : 'ابدأ تجربتك المجانية';
  const ctaTextShort = user ? 'اختر خطتك' : 'ابدأ التجربة المجانية';

  return (
    <div id="main-content" className="min-h-screen bg-white dark:bg-stone-950" role="main">
      <Helmet>
        <title>pptides | أشمل دليل عربي للببتيدات العلاجية</title>
        <meta name="description" content={`${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة، حاسبة جرعات، ودليل تحاليل. أشمل دليل عربي مبني على الأبحاث.`} />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:title" content={`pptides | أشمل دليل عربي للببتيدات العلاجية | ${PEPTIDE_COUNT}+ ببتيد`} />
        <meta property="og:description" content={`${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة، حاسبة جرعات، ومدرب ذكي. مبني على الأبحاث.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={SITE_URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="pptides | أشمل دليل عربي للببتيدات العلاجية" />
        <meta name="twitter:description" content={`${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة ومدرب ذكي.`} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'pptides',
            url: SITE_URL,
            logo: `${SITE_URL}/og-image.jpg`,
            description: 'أول منصة عربية متخصصة في علم الببتيدات — بروتوكولات كاملة، مدرب ذكي، وحاسبة جرعات.',
            contactPoint: { '@type': 'ContactPoint', email: SUPPORT_EMAIL, contactType: 'customer service' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'pptides',
            url: SITE_URL,
            inLanguage: 'ar',
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/library?q={search_term_string}` },
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'pptides Essentials — الأساسية',
            description: `اشتراك شهري يتضمن بطاقات بروتوكول كاملة لـ ${PEPTIDE_COUNT} ببتيد، حاسبة جرعات، دليل تحاليل مخبرية، وبروتوكولات مُجمَّعة.`,
            url: `${SITE_URL}/pricing`,
            brand: { '@type': 'Brand', name: 'pptides' },
            offers: {
              '@type': 'Offer',
              price: String(PRICING.essentials.monthly),
              priceCurrency: 'SAR',
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}/pricing`,
              priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'pptides Elite — المتقدّمة',
            description: 'اشتراك شهري يتضمن كل مزايا Essentials بالإضافة إلى مدرب ذكي بالذكاء الاصطناعي 24/7، بروتوكولات مخصّصة، واستشارات بلا حدود.',
            url: `${SITE_URL}/pricing`,
            brand: { '@type': 'Brand', name: 'pptides' },
            offers: {
              '@type': 'Offer',
              price: String(PRICING.elite.monthly),
              priceCurrency: 'SAR',
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}/pricing`,
              priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
            },
          },
        ])}</script>
      </Helmet>

      {/* ═══════ HERO ═══════ */}
      <section className="relative bg-gradient-to-b from-white dark:from-stone-950 via-stone-50 dark:via-stone-900 to-stone-50 dark:to-stone-900">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute start-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.07)_0%,transparent_60%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pb-6 pt-10 text-center md:pt-16 md:pb-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Zap className="h-4 w-4" />
            <span>أول مرجع عربي شامل — {PEPTIDE_COUNT} ببتيد علاجي</span>
          </div>

          <h1 className="mb-6 text-[clamp(1.875rem,8vw,4.5rem)] font-extrabold leading-[1.2] text-stone-900 dark:text-stone-100 sm:text-5xl md:text-6xl lg:text-7xl">
            توقّف عن التخمين.
            <br />
            <span className="text-emerald-700">ابدأ بالعلم.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-stone-800 dark:text-stone-200 md:text-xl">
            كل ببتيد. كل جرعة. كل بروتوكول. في مكان واحد.{' '}
            <br className="hidden sm:block" />
            مبني على الأبحاث — مصمّم للنتائج.
          </p>

          {/* Urgency nudge */}
          {!user && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-bold text-amber-800 dark:text-amber-300 urgency-badge">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" /></span>
              التجربة المجانية متاحة الآن — {TRIAL_DAYS} أيام بلا رسوم
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to={ctaLink}
              aria-label={user ? 'اشترك الآن في pptides' : `ابدأ تجربتك المجانية ${TRIAL_DAYS} أيام في pptides`}
              className="animate-cta-pulse btn-primary-glow btn-hero inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-full bg-emerald-600 font-extrabold text-white transition-all duration-300 hover:bg-emerald-700 active:scale-[0.98] sm:w-auto"
            >
              <span>{ctaText}</span>
              <ArrowLeft className="h-6 w-6" aria-hidden="true" />
            </Link>
            <Link
              to="/library"
              aria-label="تصفّح مكتبة الببتيدات"
              className="inline-flex w-full max-w-xs items-center justify-center rounded-full border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-8 py-4 text-lg font-semibold text-stone-800 dark:text-stone-200 transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 active:scale-[0.98] sm:w-auto"
            >
              تصفّح المكتبة
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
              <CreditCard className="h-4 w-4 text-emerald-700" />
              تجربة {TRIAL_DAYS} أيام مجانية
            </span>
            <span className="hidden sm:block h-5 w-px bg-stone-300 dark:bg-stone-600/80" />
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
              <Shield className="h-4 w-4 text-emerald-700" />
              ضمان استرداد كامل
            </span>
            <span className="hidden sm:block h-5 w-px bg-stone-300 dark:bg-stone-600/80" />
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
              <Lock className="h-4 w-4 text-emerald-700" />
              إلغاء في أي وقت
            </span>
          </div>
          {userCount >= 10 && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-300">
              <span className="relative flex h-2 w-2" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              <span>انضم إلى <strong className="text-stone-700 dark:text-stone-200"><AnimatedCounter end={userCount} />+</strong> مستخدم يثقون بـ pptides</span>
            </p>
          )}
        </div>
      </section>

      {/* ═══════ CALCULATOR CTA + FREE CALLOUT ═══════ */}
      <div className="mx-auto max-w-lg px-6 pb-4 text-center">
        <Link
          to="/calculator"
          aria-label="جرّب حاسبة الجرعات المجانية"
          className="group inline-flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:shadow-md"
        >
          <Calculator className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">جرّب حاسبة الجرعات المجانية — شاهد جرعتك بالضبط على السيرنج</span>
          <ArrowLeft className="h-4 w-4 text-emerald-500 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-300">
          <Link to="/library" className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 hover:underline">6 ببتيدات مجانية بالكامل</Link>
          {' — بدون تسجيل. تصفّحها الآن.'}
        </p>
      </div>

      {/* ═══════ PEPTIDE QUIZ — First interaction ═══════ */}
      <section id="quiz" className="relative z-10 mx-auto max-w-2xl px-6 pb-10">
        <Suspense fallback={<div className="h-40" />}><PeptideQuiz /></Suspense>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="relative z-10 mt-6 mx-auto max-w-5xl px-6" data-reveal>
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-stone-300 dark:border-stone-600/60 bg-white dark:bg-stone-950 p-4 sm:grid-cols-3 sm:p-8 shadow-xl dark:shadow-stone-900/40 md:grid-cols-5 md:gap-0 md:divide-x md:divide-x-reverse md:divide-stone-100 dark:divide-stone-800">
          {STATS_BAR.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-3 last:col-span-2 sm:last:col-span-1">
              <span className="text-3xl font-black text-emerald-700 md:text-4xl">{s.value}</span>
              <span className="mt-1 text-sm font-semibold text-stone-900 dark:text-stone-100">{s.label}</span>
              <span className="text-xs text-stone-500 dark:text-stone-300">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PROBLEM (Hormozi Agitation) ═══════ */}
      <section className="cv-auto mx-auto max-w-5xl px-6 py-24 md:py-32" aria-label="المشكلة التي نحلّها">
        <div className="mb-4 text-center" data-reveal>
          <span className="inline-block rounded-full bg-red-50 dark:bg-red-900/20 px-4 py-1.5 text-sm font-semibold text-red-600 dark:text-red-400">المشكلة</span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl" data-reveal>
          هل هذا أنت؟
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-stone-800 dark:text-stone-200" data-reveal>
          إذا أجبت &quot;نعم&quot; على أي من هذه — فأنت في المكان الصحيح.
        </p>

        <div className="grid gap-4 sm:grid-cols-2" data-stagger>
          {PAIN_POINTS.map((point, idx) => (
            <div
              data-reveal
              style={{ transitionDelay: `${idx * 0.08}s` }}
              key={point}
              className="flex items-start gap-4 rounded-2xl border border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 p-6 transition-all hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-base font-medium text-stone-800 dark:text-stone-200">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SOLUTION_CHECKS.map((point) => (
            <div
              key={point}
              className="flex items-start gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 p-6 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-base font-medium text-stone-800 dark:text-stone-200">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
            <span className="text-emerald-700">الخبر الجيد:</span> صنعنا الحل.
          </p>
        </div>
      </section>

      {/* ═══════ SOLUTION / FEATURES ═══════ */}
      <section className="cv-auto bg-gradient-to-b from-stone-50 dark:from-stone-900 to-white dark:to-stone-950 py-24 md:py-32" aria-label="مميزات pptides">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">الحل</span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl">
            كل ما تحتاجه في <span className="text-emerald-700">مكان واحد</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-stone-800 dark:text-stone-200">
            بدل ما تدفع آلاف الدولارات على استشارات ومصادر متفرقة — كل شيء هنا.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-stagger>
            {FEATURES.map((f, idx) => {
              const links: Record<string, string> = {
                [`${PEPTIDE_COUNT} ببتيد مع بروتوكول كامل`]: '/library',
                'حاسبة جرعات لا تخطئ': '/calculator',
                'دليل تحاليل يحميك': '/lab-guide',
                'بروتوكولات مُجمَّعة جاهزة': '/stacks',
                'دليل عملي للتحضير والحقن': '/guide',
                'مبني على الأبحاث': '/sources',
              };
              const href = links[f.title];
              const Card = (
                <div
                  data-reveal
                  style={{ transitionDelay: `${idx * 0.07}s` }}
                  className="group rounded-2xl border border-stone-300 dark:border-stone-600/60 bg-white dark:bg-stone-950 p-7 card-hover hover:border-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">{f.description}</p>
                  <p className="mt-3 text-xs font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">اكتشف المزيد ←</p>
                </div>
              );
              return href ? <Link key={f.title} to={href}>{Card}</Link> : <div key={f.title}>{Card}</div>;
            })}
          </div>

          {/* Secondary CTA after features */}
          <div className="mt-14 text-center">
            <Link
              to={ctaLink}
              className="btn-primary-glow inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              <span>{ctaText}</span>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-300">{TRIAL_DAYS} أيام مجانية — إلغاء في أي وقت</p>
          </div>
        </div>
      </section>

      {/* ═══════ PRODUCT PREVIEW — SHOW DON'T TELL ═══════ */}
      {(() => {
        const bpc = BPC_157_PREVIEW;
        return (
          <section className="cv-auto mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="mb-4 text-center">
              <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">شاهد بنفسك</span>
            </div>
            <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
              هكذا تبدو <span className="text-emerald-700">بطاقة البروتوكول</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-center text-stone-800 dark:text-stone-200">
              هذا ما تحصل عليه لكل ببتيد — جرّب BPC-157 مجانًا
            </p>

            <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-950 shadow-xl shadow-emerald-600/5">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-600 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">مجاني</span>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{bpc.nameAr}</h3>
                  <span className="text-sm text-stone-500 dark:text-stone-300">{bpc.nameEn}</span>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">الدليل: قوي</span>
              </div>

              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-stone-200 dark:divide-stone-700">
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1">الجرعة الموصى بها</p>
                    <p className="text-sm text-stone-800 dark:text-stone-200">{bpc.dosageAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1">توقيت الاستخدام</p>
                    <p className="text-sm text-stone-800 dark:text-stone-200">{bpc.timingAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1">مدة الدورة</p>
                    <p className="text-sm text-stone-800 dark:text-stone-200">{bpc.cycleAr}</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1">طريقة الإعطاء</p>
                    <p className="text-sm text-stone-800 dark:text-stone-200">{bpc.administrationAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1">التجميع الموصى به</p>
                    <p className="text-sm text-stone-800 dark:text-stone-200">{bpc.stackAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1">التكلفة التقريبية</p>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{bpc.costEstimate}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-stone-600 dark:text-stone-300">هذا ببتيد واحد من {PEPTIDE_COUNT}. اشترك لفتح الكل.</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/calculator?peptide=BPC-157" className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 min-h-[44px]">
                    احسب جرعتك بالحاسبة ←
                  </Link>
                  <Link to="/peptide/bpc-157" className="rounded-full border border-emerald-300 dark:border-emerald-700 px-5 py-2.5 min-h-[44px] inline-flex items-center text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:bg-emerald-900/20">
                    شاهد البطاقة كاملة
                  </Link>
                  <Link to={ctaLink} className="rounded-full bg-emerald-600 px-5 py-2.5 min-h-[44px] inline-flex items-center text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98]">
                    {user ? 'اشترك الآن' : 'ابدأ تجربتك المجانية'}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══════ EVIDENCE / CREDIBILITY ═══════ */}
      <section className="cv-auto mx-auto max-w-5xl px-6 py-24 md:py-32" aria-label="الأدلة العلمية">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400">مبني على الأبحاث</span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl">
          ليس كلام — <span className="text-emerald-700">أدلة علمية</span>
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-stone-800 dark:text-stone-200">
          كل ببتيد في مكتبتنا مربوط بدراسات سريرية منشورة. لا نذكر معلومة بدون مرجع.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-bold text-emerald-700 dark:text-emerald-400">FDA</span>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">ببتيدات معتمدة من FDA</h3>
            </div>
            <ul className="space-y-2 text-sm text-stone-800 dark:text-stone-200">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong>Semaglutide</strong> — Wegovy/Ozempic (2017/2021)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong>Tirzepatide</strong> — Mounjaro/Zepbound (2022/2023)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong>Tesamorelin</strong> — Egrifta (2010)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong>PT-141</strong> — Vyleesi (2019)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong>SS-31</strong> — Stegazah/Elamipretide (2025)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong>Triptorelin</strong> — Trelstar/Decapeptyl (1986)</span></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:text-blue-400">RCT</span>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">تجارب سريرية مرجعية</h3>
            </div>
            <ul className="space-y-2 text-sm text-stone-800 dark:text-stone-200">
              <li><strong>STEP 1-5</strong> — Semaglutide فقدان وزن 15-20%</li>
              <li><strong>SURMOUNT 1-4</strong> — Tirzepatide فقدان 22.5%</li>
              <li><strong>SELECT</strong> — خفض أحداث القلب 20%</li>
              <li><strong>Phase 2 Retatrutide</strong> — فقدان 24%</li>
              <li><strong>BDNF Studies</strong> — Semax يرفع BDNF 300-800%</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:text-amber-400">EL</span>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">مستوى الدليل واضح</h3>
            </div>
            <p className="mb-3 text-sm text-stone-800 dark:text-stone-200">كل ببتيد مصنّف حسب قوة الدليل العلمي:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">ممتاز</span><span className="text-sm text-stone-800 dark:text-stone-200">تجارب سريرية كبرى + اعتماد FDA</span></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300">قوي</span><span className="text-sm text-stone-800 dark:text-stone-200">تجارب بشرية متعددة</span></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-sky-100 dark:bg-sky-900/30 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:text-sky-300">جيد</span><span className="text-sm text-stone-800 dark:text-stone-200">دراسات بشرية محدودة</span></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">متوسط</span><span className="text-sm text-stone-800 dark:text-stone-200">دراسات حيوانية + تقارير بشرية</span></div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-700 dark:text-stone-200">
          كل معلومة في المكتبة مربوطة بمرجعها العلمي. <Link to="/sources" className="text-emerald-700 font-semibold underline hover:text-emerald-700 dark:text-emerald-400 transition-colors inline-flex items-center min-h-[44px]">اطّلع على المصادر</Link>
        </p>
      </section>

      {/* ═══════ VALUE STACK (Hormozi) ═══════ */}
      <section className="cv-auto mx-auto max-w-4xl px-6 py-24 md:py-32">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">القيمة الحقيقية</span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl">
          ماذا تحصل <span className="text-emerald-700">فعلًا؟</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-lg text-stone-800 dark:text-stone-200">
          لو اشتريت كل أداة لوحدها — ستدفع أكثر من {VALUE_TOTAL}.
        </p>

        <div className="space-y-3">
          {VALUE_STACK.map((item) => (
            <div
              key={item.item}
              className="flex items-center justify-between rounded-xl border border-stone-300 dark:border-stone-600/60 bg-white dark:bg-stone-950 px-6 py-4 transition-all hover:border-emerald-200 dark:border-emerald-800"
            >
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-emerald-700" />
                <span className="font-medium text-stone-800 dark:text-stone-200">{item.item}</span>
              </div>
              <span className="text-sm font-bold text-stone-800 dark:text-stone-200 line-through">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-8 text-center">
          <p className="mb-1 text-lg text-stone-800 dark:text-stone-200">القيمة الإجمالية:</p>
          <p className="mb-2 text-4xl font-extrabold text-stone-400 line-through decoration-red-400 decoration-[3px]">{VALUE_TOTAL}</p>
          <p className="mb-1 text-lg text-stone-800 dark:text-stone-200">أنت تدفع فقط:</p>
          <p className="text-3xl font-black text-emerald-700 sm:text-5xl md:text-6xl">{PRICING.essentials.label}<span className="text-xl font-bold text-stone-800 dark:text-stone-200">/شهريًا</span></p>
          <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">أقل من ريال واحد يوميًا</p>
          <span className="mt-3 inline-block rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-bold text-white shadow-md">توفير 97% — وفّر {VALUE_SAVINGS_ESSENTIALS} شهريًا</span>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-600 dark:text-stone-300">
            <span className="flex items-center gap-1.5 rounded-full bg-white dark:bg-stone-950 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 font-medium">📚 أكثر من ١٠,٠٠٠ ساعة بحث</span>
            {userCount >= 10 && <span className="flex items-center gap-1.5 rounded-full bg-white dark:bg-stone-950 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 font-medium">👥 يستخدمه <AnimatedCounter end={userCount} /> شخص في السعودية</span>}
          </div>
          <p className="mt-4 text-sm text-stone-800 dark:text-stone-200">أو {PRICING.elite.label}/شهريًا للباقة المتقدمة مع المدرب الذكي + استشارات</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 font-bold text-red-700 dark:text-red-400">
              <Zap className="h-4 w-4" /> السعر الحالي لفترة محدودة
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2 font-bold text-amber-700 dark:text-amber-400">
              <Shield className="h-4 w-4" /> ضمان استرداد كامل — بدون مخاطرة
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="cv-auto bg-gradient-to-b from-white dark:from-stone-950 via-stone-50 dark:via-stone-900 to-stone-50 dark:to-stone-900 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            ابدأ في <span className="text-emerald-700">3 خطوات</span>
          </h2>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {HOW_IT_WORKS_STEPS.map((step, i, arr) => (
              <div
                key={step.num}
                className="relative text-center"
              >
                <span className="mb-4 block text-6xl font-black text-emerald-200/80 md:text-7xl">{step.num}</span>
                <div className="mb-2 h-px w-full bg-stone-200 dark:bg-stone-700/60" />
                <h3 className="mb-2 pt-4 text-lg font-bold text-stone-900 dark:text-stone-100">{step.title}</h3>
                <p className="text-sm text-stone-800 dark:text-stone-200">{step.desc}</p>
                {i < arr.length - 1 && (
                  <div className="pointer-events-none absolute start-0 top-12 hidden -translate-x-1/2 md:block">
                    <ArrowLeft className="h-6 w-6 text-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      {(() => {
        const fallback: Testimonial[] = [
          { text: 'أخيرًا مرجع عربي شامل! كنت أضيع ساعات أبحث بالإنجليزي. الآن كل شيء واضح ومنظّم.', name: 'خالد', role: 'مشترك متقدّم', rating: 5 },
          { text: 'حاسبة الجرعات وحدها تستاهل الاشتراك. دقيقة وسهلة الاستخدام.', name: 'أحمد', role: 'مستخدم Essentials (الأساسية)', rating: 5 },
          { text: 'المدرب الذكي غيّر طريقة تعاملي مع البروتوكولات. أسأله أي سؤال ويجاوبني فورًا.', name: 'سلطان', role: 'مشترك متقدّم', rating: 5 },
        ];
        const items = testimonials.length > 0 ? testimonials : fallback;
        return (
        <section className="cv-auto mx-auto max-w-5xl px-6 py-24 md:py-32">
          <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            ماذا يقول <span className="text-emerald-700">المستخدمون</span>
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-stone-800 dark:text-stone-200">
            {userCount >= 10 ? <>انضم لـ <AnimatedCounter end={userCount} />+ مستخدم يثقون بـ pptides</> : 'آراء حقيقية من مجتمعنا'}
          </p>

          <div className="grid gap-6 md:grid-cols-3" data-stagger>
            {items.map((t, idx) => (
              <div key={t.name} data-reveal style={{ transitionDelay: `${idx * 0.1}s` }} className="rounded-2xl border border-stone-300 dark:border-stone-600/60 bg-white dark:bg-stone-950 p-7 transition-shadow duration-300 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4 flex gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('h-4 w-4', s <= t.rating ? 'fill-emerald-500 text-emerald-500' : 'fill-transparent text-stone-300')} />
                  ))}
                </div>
                <p className="mb-5 text-base leading-relaxed text-stone-800 dark:text-stone-200 line-clamp-4">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-sm font-bold text-emerald-700 dark:text-emerald-400">{t.name.charAt(0)}</div>
                  <div><p className="font-bold text-stone-900 dark:text-stone-100">{t.name}</p><p className="text-sm text-stone-600 dark:text-stone-300">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        );
      })()}

      {/* ═══════ TRIAL BANNER ═══════ */}
      <section className="cv-auto mx-auto max-w-4xl px-6 py-8">
        <TrialCountdown />
      </section>

      {/* ═══════ FEATURE COMPARISON TABLE ═══════ */}
      <Suspense fallback={<div className="h-64 mx-6 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" aria-hidden="true" />}>
        <FeatureComparisonTable />
      </Suspense>

      {/* ═══════ PRICING PREVIEW ═══════ */}
      <section className="cv-auto bg-gradient-to-b from-stone-50 dark:from-stone-900 to-white dark:to-stone-950 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-4 py-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              ابدأ بتجربة {TRIAL_DAYS} أيام مجانية
            </span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl">
            اختر <span className="text-emerald-700">خطتك</span>
          </h2>
          <p className="mx-auto mb-14 max-w-lg text-center text-lg text-stone-800 dark:text-stone-200">
            ابدأ بتجربة {TRIAL_DAYS} أيام مجانية مع كل اشتراك.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Essentials */}
            <div
              className="relative flex flex-col rounded-2xl border border-stone-300 dark:border-stone-600/60 bg-white dark:bg-stone-950 p-8 transition-all duration-300 hover:shadow-lg hover:border-stone-400 dark:hover:border-stone-600 hover:-translate-y-1"
            >
              <h3 className="mb-0.5 text-xl font-bold text-stone-900 dark:text-stone-100">Essentials</h3>
              <p className="mb-1 text-xs font-medium text-emerald-700">الأساسية</p>
              <p className="mb-6 text-sm text-stone-800 dark:text-stone-200">كل الأدوات الأساسية</p>
              <div className="mb-6">
                <span className="text-3xl font-black text-stone-900 dark:text-stone-100 sm:text-5xl">{PRICING.essentials.label}</span>
                <span className="text-base text-stone-800 dark:text-stone-200"> /شهريًا</span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {[
                  `بطاقات البروتوكول الكاملة لـ ${PEPTIDE_COUNT} ببتيد`,
                  'حاسبة الجرعات الدقيقة',
                  'دليل التحاليل المخبرية',
                  'البروتوكولات المُجمَّعة',
                  'الدليل العملي للتحضير والحقن',
                  'تحديثات مستمرة',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-800 dark:text-stone-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={user ? "/pricing" : "/signup?redirect=/pricing"}
                className="inline-flex items-center justify-center rounded-full border-2 border-stone-300 dark:border-stone-600 px-6 py-3 text-base font-bold text-stone-800 dark:text-stone-200 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                {ctaTextShort}
              </Link>
            </div>

            {/* Elite */}
            <div
              className="relative flex flex-col rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-950 p-8 shadow-lg shadow-emerald-600/5"
            >
              <span className="absolute -top-3 end-6 rounded-full bg-emerald-600 px-4 py-1 text-xs font-bold text-white">الأفضل قيمة</span>
              <div className="mb-0.5 flex items-center gap-2">
                <Crown className="h-5 w-5 text-emerald-700" />
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Elite</h3>
              </div>
              <p className="mb-1 text-xs font-medium text-emerald-700">المتقدّمة</p>
              <p className="mb-6 text-sm text-stone-800 dark:text-stone-200">كل شيء + مدرب ذكي + استشارات</p>
              <div className="mb-6">
                <span className="text-3xl font-black text-stone-900 dark:text-stone-100 sm:text-5xl">{PRICING.elite.label}</span>
                <span className="text-base text-stone-800 dark:text-stone-200"> /شهريًا</span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {[
                  'كل مزايا Essentials (الأساسية)',
                  'مدرب ذكي بالذكاء الاصطناعي 24/7',
                  'بروتوكولات مخصّصة لأهدافك',
                  'استشارات بلا حدود',
                  'دعم مخصّص عبر البريد',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-800 dark:text-stone-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={user ? "/pricing" : "/signup?redirect=/pricing"}
                className="btn-primary-glow inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-base font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                {ctaTextShort}
              </Link>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-8">
            <TrustBadges />
          </div>
        </div>
      </section>

      {/* ═══════ REFERRAL ═══════ */}
      <section className="cv-auto py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Gift className="h-7 w-7 text-emerald-700" />
          </div>
          <h2 className="text-2xl font-bold md:text-3xl">ادعُ صديقًا واحصل على مكافأة</h2>
          <p className="mt-3 text-stone-600 dark:text-stone-300">شارك رابطك الخاص مع أصدقائك — عند اشتراكهم، تحصل أنت وصديقك على خصم 30% لمدة شهر.</p>
          {user ? (
            <Link to="/account" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700">
              احصل على رابط إحالتك
            </Link>
          ) : (
            <Link to="/signup?redirect=/account" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700">
              سجّل الآن لتحصل على رابطك
            </Link>
          )}
        </div>
      </section>

      {/* ═══════ RISK REVERSAL (Hormozi) ═══════ */}
      <section className="cv-auto bg-gradient-to-b from-white dark:from-stone-950 to-stone-50 dark:to-stone-900 py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div
          >
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="h-8 w-8 text-emerald-700" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
              ضمان <span className="text-emerald-700">بدون مخاطرة</span>
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-lg leading-relaxed text-stone-800 dark:text-stone-200">
              جرّب لمدة {TRIAL_DAYS} أيام كاملة. إذا لم تجد قيمة حقيقية — تواصل معنا واسترد أموالك بالكامل.
              <strong className="text-stone-900 dark:text-stone-100"> بدون أسئلة. بدون شروط.</strong>
            </p>
            <p className="text-sm text-stone-800 dark:text-stone-200">
              نحن واثقون من المحتوى لأننا نعرف أنه يعمل. المخاطرة علينا — وليس عليك.
            </p>
            <div className="mt-6">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="cv-auto mx-auto max-w-3xl px-6 py-16 md:py-24" aria-label="الأسئلة الشائعة">
        <h2 className="mb-10 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
          أسئلة <span className="text-emerald-700">شائعة</span>
        </h2>
        <div className="space-y-3">
          {[
            { q: 'هل الببتيدات قانونية في السعودية والإمارات؟', a: 'معظم الببتيدات البحثية متاحة للشراء عبر الإنترنت في دول الخليج. بعض الببتيدات المعتمدة من FDA (مثل Semaglutide) تتطلب وصفة طبية. pptides منصة تعليمية — لا نبيع ببتيدات.' },
            { q: 'هل أحتاج وصفة طبية؟', a: 'للببتيدات المعتمدة من FDA (Semaglutide, Tirzepatide) نعم. للببتيدات البحثية (BPC-157, TB-500) عادة لا. ننصح دائمًا باستشارة طبيبك قبل البدء.' },
            { q: 'من أين أشتري الببتيدات؟', a: 'ابحث عن مورّد يوفّر شهادة تحليل (COA) من طرف ثالث، نقاء 98%+ ، وشحن مبرّد. اطّلع على صفحة المصادر لمعايير الاختيار.' },
            { q: 'هل الببتيدات حلال؟', a: 'معظم الببتيدات العلاجية مصنّعة كيميائيًا ولا تحتوي مكونات حيوانية. ببتيدات الكولاجين قد تكون مشتقة من مصادر بحرية أو حيوانية — تحقق من المصدر.' },
            { q: 'كيف ألغي اشتراكي؟', a: `يمكنك إلغاء اشتراكك في أي وقت من صفحة الحساب. تحتفظ بالوصول حتى نهاية فترة الدفع الحالية. ضمان استرداد كامل خلال ${TRIAL_DAYS} أيام.` },
            { q: 'هل الدفع آمن؟', a: 'نستخدم Stripe — أكبر منصة دفع في العالم. بياناتك مشفّرة ولا نحفظ بيانات بطاقتك. ندعم Visa و Mastercard و Apple Pay.' },
            { q: '6 ببتيدات مجانية — بدون تسجيل؟', a: 'نعم! 6 ببتيد مع بروتوكول كامل متاح مجانًا بدون إنشاء حساب. جرّبها الآن من المكتبة.' },
            { q: 'ماذا أحصل بعد الاشتراك؟', a: `بروتوكولات كاملة لـ ${PEPTIDE_COUNT} ببتيد، حاسبة جرعات دقيقة، دليل تحاليل مخبرية، بروتوكولات مُجمَّعة، دليل حقن عملي، فحص تعارضات، ومدرب ذكي (في باقة Elite المتقدّمة).` },
          ].map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 transition-all hover:border-emerald-200 dark:border-emerald-800">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-base font-bold text-stone-900 dark:text-stone-100 [&::-webkit-details-marker]:hidden" aria-label={faq.q}>
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-300 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-stone-700 dark:text-stone-200">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════ EMAIL CAPTURE ═══════ */}
      <section className="cv-auto relative bg-stone-900 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
            ابقَ على <span className="text-emerald-400">اطلاع</span>
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/50">
            اشترك ليصلك كل جديد عن الببتيدات والتحديثات العلمية
          </p>
          <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-stone-800" aria-hidden="true" />}>
            <EmailCapture />
          </Suspense>
          {/* Coming soon section removed — signals incompleteness to cold visitors */}
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="cv-auto bg-white dark:bg-stone-950 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-8 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 text-start">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">تنويه طبي مهم</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              المحتوى المقدّم في pptides.com لأغراض تعليمية وبحثية فقط ولا يُعدّ بديلًا عن الاستشارة الطبية المتخصصة.
              جميع المعلومات مستقاة من دراسات سريرية منشورة ومراجعات علمية مُحكَّمة.
              <strong> استشر طبيبك المختص قبل استخدام أي ببتيد أو تغيير أي بروتوكول علاجي.</strong>
            </p>
          </div>
          <Link
            to={ctaLink}
            className="btn-primary-glow btn-hero inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 font-extrabold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            <span>{user ? "اشترك الآن" : "ابدأ تجربتك المجانية"}</span>
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400"><CreditCard className="h-4 w-4 text-emerald-600" /> {TRIAL_DAYS} أيام مجانًا</span>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400"><Shield className="h-4 w-4 text-emerald-600" /> ضمان استرداد كامل</span>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400"><Lock className="h-4 w-4 text-emerald-600" /> إلغاء في أي وقت</span>
          </div>
          <p className="mt-3 text-xs font-bold text-red-600 dark:text-red-400">السعر الحالي لن يستمر — ابدأ الآن قبل الزيادة</p>
        </div>
      </section>

      {/* Floating WhatsApp / Help Button */}
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="fixed bottom-24 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 hover:scale-110 md:bottom-6 md:end-6"
        aria-label="تواصل معنا"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
      </a>

      {/* EXIT INTENT + STICKY CTA handled globally by App.tsx OverlayGate — no duplicates here */}
    </div>
  );
}
