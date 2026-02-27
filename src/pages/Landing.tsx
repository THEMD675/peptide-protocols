import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptides } from '@/data/peptides';
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
} from 'lucide-react';
import EmailCapture from '@/components/EmailCapture';
import PeptideQuiz from '@/components/PeptideQuiz';
import { cn } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT, VALUE_TOTAL, VALUE_SAVINGS_ESSENTIALS, VALUE_STACK } from '@/lib/constants';


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
    title: 'دليل عملي بالصور',
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
  { value: '85+', label: 'مصدر علمي', sub: 'دراسات سريرية' },
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
  { num: '02', title: 'جرّب 3 أيام مجانًا', desc: 'تصفّح المكتبة واكتشف ما يناسبك.' },
  { num: '03', title: 'اشترك واستفد', desc: 'اختر خطتك وابدأ رحلتك بثقة.' },
];

interface Testimonial {
  text: string;
  name: string;
  role: string;
  rating: number;
}

export default function Landing() {
  const { user, subscription, isLoading } = useAuth();
  const [userCount, setUserCount] = useState(() => {
    try { const c = sessionStorage.getItem('pptides_user_count'); return c ? Number(c) : 0; } catch { return 0; }
  });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const shouldRedirect = !isLoading && user && subscription.isProOrTrial;

  useEffect(() => {
    let mounted = true;
    const cached = sessionStorage.getItem('pptides_user_count_ts');
    if (cached && Date.now() - Number(cached) < 5 * 60 * 1000) return;
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', ['active', 'trial']).then(({ count, error }) => {
      if (error) return;
      if (mounted && count && count > 0) {
        setUserCount(count);
        try { sessionStorage.setItem('pptides_user_count', String(count)); sessionStorage.setItem('pptides_user_count_ts', String(Date.now())); } catch { /* expected */ }
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('reviews')
      .select('content, rating, name, created_at')
      .eq('is_approved', true)
      .gte('rating', 3)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (mounted && data && data.length > 0) {
          setTestimonials(data.map((r) => ({
            text: r.content,
            name: r.name ?? 'مستخدم',
            role: `تقييم ${r.rating}/5`,
            rating: r.rating,
          })));
        }
      }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  if (shouldRedirect) return <Navigate to="/dashboard" replace />;

  const ctaLink = user ? '/pricing' : '/signup?redirect=/pricing';
  const ctaText = user ? 'اشترك الآن' : 'ابدأ تجربتك المجانية';
  const ctaTextShort = user ? 'اختر خطتك' : 'ابدأ التجربة المجانية';

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>pptides | أشمل دليل عربي للببتيدات العلاجية</title>
        <meta name="description" content={`${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة، حاسبة جرعات، ودليل تحاليل. أشمل دليل عربي مبني على الأبحاث.`} />
        <meta property="og:locale" content="ar_SA" />
      </Helmet>

      {/* ═══════ HERO ═══════ */}
      <section className="relative bg-gradient-to-b from-white via-stone-50 to-stone-50">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.07)_0%,transparent_60%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-10 text-center md:pt-16 md:pb-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700 animate-fade-up">
            <Zap className="h-4 w-4" />
            <span>أول مرجع عربي شامل — {PEPTIDE_COUNT} ببتيد علاجي</span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-[1.3] text-stone-900 sm:text-5xl md:text-6xl lg:text-7xl animate-fade-up stagger-1">
            توقّف عن التخمين.
            <br />
            <span className="text-emerald-600">ابدأ بالعلم.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-stone-800 md:text-xl animate-fade-up stagger-2">
            كل ببتيد. كل جرعة. كل بروتوكول. في مكان واحد.
            <br className="hidden sm:block" />
            مبني على الأبحاث — مصمّم للنتائج.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 animate-fade-up stagger-3">
            <Link
              to={ctaLink}
              className="btn-primary-glow inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-full bg-emerald-600 px-8 py-4 text-lg font-bold text-white transition-all duration-300 hover:bg-emerald-700 sm:w-auto"
            >
              <span>{ctaText}</span>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link
              to="/library"
              className="inline-flex w-full max-w-xs items-center justify-center rounded-full border-2 border-stone-200 bg-white px-8 py-4 text-lg font-semibold text-stone-800 transition-all duration-300 hover:border-emerald-300 hover:text-emerald-700 active:scale-[0.98] sm:w-auto"
            >
              تصفّح المكتبة
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 animate-fade-up stagger-4">
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              تجربة 3 أيام مجانية
            </span>
            <span className="h-5 w-px bg-stone-300/80" />
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Shield className="h-4 w-4 text-emerald-600" />
              ضمان استرداد كامل
            </span>
          </div>
          {userCount >= 10 && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-500">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              <span>انضم إلى <strong className="text-stone-700">{userCount}+</strong> مستخدم يثقون بـ pptides</span>
            </p>
          )}
        </div>
      </section>

      {/* ═══════ PEPTIDE QUIZ — First interaction ═══════ */}
      <section className="relative z-10 -mt-6 mx-auto max-w-2xl px-6 pb-10">
        <PeptideQuiz />
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="relative z-10 mt-4 mx-auto max-w-5xl px-6 md:-mt-8">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-stone-300/60 bg-white p-4 sm:p-8 shadow-xl md:grid-cols-5 md:gap-0 md:divide-x md:divide-x-reverse md:divide-stone-100">
          {STATS_BAR.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-3">
              <span className="text-3xl font-black text-emerald-600 md:text-4xl">{s.value}</span>
              <span className="mt-1 text-sm font-semibold text-stone-900">{s.label}</span>
              <span className="text-xs text-stone-500">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PROBLEM (Hormozi Agitation) ═══════ */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-600">المشكلة</span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl lg:text-5xl">
          هل هذا أنت؟
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-stone-800">
          إذا أجبت &quot;نعم&quot; على أي من هذه — فأنت في المكان الصحيح.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {PAIN_POINTS.map((point) => (
            <div
              key={point}
              className="flex items-start gap-4 rounded-2xl border border-stone-300 bg-stone-100 p-6 transition-all hover:border-red-200 hover:bg-red-50/30"
            >
              <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-base font-medium text-stone-800">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SOLUTION_CHECKS.map((point) => (
            <div
              key={point}
              className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 transition-all hover:border-emerald-300 hover:bg-emerald-50"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-base font-medium text-stone-800">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xl font-bold text-stone-900">
            <span className="text-emerald-600">الخبر الجيد:</span> صنعنا الحل.
          </p>
        </div>
      </section>

      {/* ═══════ SOLUTION / FEATURES ═══════ */}
      <section className="bg-gradient-to-b from-stone-50 to-white py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">الحل</span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl lg:text-5xl">
            كل ما تحتاجه في <span className="text-emerald-600">مكان واحد</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-stone-800">
            بدل ما تدفع آلاف الدولارات على استشارات ومصادر متفرقة — كل شيء هنا.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const links: Record<string, string> = {
                [`${PEPTIDE_COUNT} ببتيد مع بروتوكول كامل`]: '/library',
                'حاسبة جرعات لا تخطئ': '/calculator',
                'دليل تحاليل يحميك': '/lab-guide',
                'بروتوكولات مُجمَّعة جاهزة': '/stacks',
                'دليل عملي بالصور': '/guide',
                'مبني على الأبحاث': '/sources',
              };
              const href = links[f.title];
              const Card = (
                <div
                  className="group rounded-2xl border border-stone-300/60 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg cursor-pointer"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-800">{f.description}</p>
                  <p className="mt-3 text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">اكتشف المزيد ←</p>
                </div>
              );
              return href ? <Link key={f.title} to={href}>{Card}</Link> : <div key={f.title}>{Card}</div>;
            })}
          </div>
        </div>
      </section>

      {/* ═══════ PRODUCT PREVIEW — SHOW DON'T TELL ═══════ */}
      {(() => {
        const bpc = peptides.find(p => p.id === 'bpc-157');
        if (!bpc) return null;
        return (
          <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="mb-4 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">شاهد بنفسك</span>
            </div>
            <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl">
              هكذا تبدو <span className="text-emerald-600">بطاقة البروتوكول</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-center text-stone-800">
              هذا ما تحصل عليه لكل ببتيد — جرّب BPC-157 مجانًا
            </p>

            <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-white shadow-xl shadow-emerald-600/5">
              <div className="flex items-center justify-between border-b border-stone-200 bg-emerald-50 px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">مجاني</span>
                  <h3 className="text-lg font-bold text-stone-900">{bpc.nameAr}</h3>
                  <span className="text-sm text-stone-500">{bpc.nameEn}</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">الدليل: قوي</span>
              </div>

              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-stone-200">
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-1">الجرعة الموصى بها</p>
                    <p className="text-sm text-stone-800">{bpc.dosageAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-1">توقيت الاستخدام</p>
                    <p className="text-sm text-stone-800">{bpc.timingAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-1">مدة الدورة</p>
                    <p className="text-sm text-stone-800">{bpc.cycleAr}</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-1">طريقة الإعطاء</p>
                    <p className="text-sm text-stone-800">{bpc.administrationAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-1">التجميع الموصى به</p>
                    <p className="text-sm text-stone-800">{bpc.stackAr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-1">التكلفة التقريبية</p>
                    <p className="text-sm font-bold text-stone-900">{bpc.costEstimate}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-200 bg-stone-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-stone-600">هذا ببتيد واحد من {PEPTIDE_COUNT}. اشترك لفتح الكل.</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/calculator?peptide=BPC-157" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1">
                    احسب جرعتك بالحاسبة ←
                  </Link>
                  <Link to="/peptide/bpc-157" className="rounded-full border border-emerald-300 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
                    شاهد البطاقة كاملة
                  </Link>
                  <Link to={ctaLink} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                    {user ? 'اشترك الآن' : 'ابدأ تجربتك المجانية'}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══════ EVIDENCE / CREDIBILITY ═══════ */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">مبني على الأبحاث</span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl lg:text-5xl">
          ليس كلام — <span className="text-emerald-600">أدلة علمية</span>
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-stone-800">
          كل ببتيد في مكتبتنا مربوط بدراسات سريرية منشورة. لا نذكر معلومة بدون مرجع.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-300 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">FDA</span>
              <h3 className="font-bold text-stone-900">ببتيدات معتمدة من FDA</h3>
            </div>
            <ul className="space-y-2 text-sm text-stone-800">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>Semaglutide</strong> — Wegovy/Ozempic (2017/2021)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>Tirzepatide</strong> — Mounjaro/Zepbound (2022/2023)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>Tesamorelin</strong> — Egrifta (2010)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>PT-141</strong> — Vyleesi (2019)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>SS-31</strong> — Stegazah/Elamipretide (2025)</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong>Triptorelin</strong> — Trelstar/Decapeptyl (1986)</span></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-stone-300 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">RCT</span>
              <h3 className="font-bold text-stone-900">تجارب سريرية مرجعية</h3>
            </div>
            <ul className="space-y-2 text-sm text-stone-800">
              <li><strong>STEP 1-5</strong> — Semaglutide فقدان وزن 15-20%</li>
              <li><strong>SURMOUNT 1-4</strong> — Tirzepatide فقدان 22.5%</li>
              <li><strong>SELECT</strong> — خفض أحداث القلب 20%</li>
              <li><strong>Phase 2 Retatrutide</strong> — فقدان 24%</li>
              <li><strong>BDNF Studies</strong> — Semax يرفع BDNF 300-800%</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-stone-300 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">EL</span>
              <h3 className="font-bold text-stone-900">مستوى الدليل واضح</h3>
            </div>
            <p className="mb-3 text-sm text-stone-800">كل ببتيد مصنّف حسب قوة الدليل العلمي:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">ممتاز</span><span className="text-sm text-stone-800">تجارب سريرية كبرى + اعتماد FDA</span></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">قوي</span><span className="text-sm text-stone-800">تجارب بشرية متعددة</span></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">جيد</span><span className="text-sm text-stone-800">دراسات بشرية محدودة</span></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">متوسط</span><span className="text-sm text-stone-800">دراسات حيوانية + تقارير بشرية</span></div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-700">
          كل معلومة في المكتبة مربوطة بمرجعها العلمي. <Link to="/sources" className="text-emerald-600 font-semibold underline">اطّلع على المصادر</Link>
        </p>
      </section>

      {/* ═══════ VALUE STACK (Hormozi) ═══════ */}
      <section className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">القيمة الحقيقية</span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl lg:text-5xl">
          ماذا تحصل <span className="text-emerald-600">فعلًا؟</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-lg text-stone-800">
          لو اشتريت كل أداة لوحدها — ستدفع أكثر من {VALUE_TOTAL}.
        </p>

        <div className="space-y-3">
          {VALUE_STACK.map((item) => (
            <div
              key={item.item}
              className="flex items-center justify-between rounded-xl border border-stone-300/60 bg-white px-6 py-4 transition-all hover:border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="font-medium text-stone-800">{item.item}</span>
              </div>
              <span className="text-sm font-bold text-stone-800 line-through">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="mb-1 text-lg text-stone-800">القيمة الإجمالية:</p>
          <p className="mb-2 text-3xl font-extrabold text-stone-800 line-through">{VALUE_TOTAL}</p>
          <p className="mb-1 text-lg text-stone-800">أنت تدفع فقط:</p>
          <p className="text-3xl font-black text-emerald-600 sm:text-5xl md:text-6xl">{PRICING.essentials.label}<span className="text-xl font-bold text-stone-800">/شهريًا</span></p>
          <span className="mt-3 inline-block rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-bold text-white shadow-md">توفير 97% — وفّر {VALUE_SAVINGS_ESSENTIALS} شهريًا</span>
          <p className="mt-4 text-sm text-stone-800">أو {PRICING.elite.label}/شهريًا للباقة المتقدمة مع المدرب الذكي + استشارات</p>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="bg-gradient-to-b from-white via-stone-50 to-stone-50 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold text-stone-900 md:text-4xl">
            ابدأ في <span className="text-emerald-600">3 خطوات</span>
          </h2>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {HOW_IT_WORKS_STEPS.map((step, i, arr) => (
              <div
                key={step.num}
                className="relative text-center"
              >
                <span className="mb-4 block text-6xl font-black text-emerald-200/80 md:text-7xl">{step.num}</span>
                <div className="mb-2 h-px w-full bg-stone-200/60" />
                <h3 className="mb-2 pt-4 text-lg font-bold text-stone-900">{step.title}</h3>
                <p className="text-sm text-stone-800">{step.desc}</p>
                {i < arr.length - 1 && (
                  <div className="pointer-events-none absolute left-0 top-12 hidden -translate-x-1/2 md:block">
                    <ArrowLeft className="h-6 w-6 text-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      {testimonials.length > 0 && <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl">
          ماذا يقول <span className="text-emerald-600">المستخدمون</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-stone-800">
          تقييمات حقيقية من مشتركين
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-stone-300/60 bg-white p-7 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mb-4 flex gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={cn('h-4 w-4', s <= t.rating ? 'fill-emerald-500 text-emerald-500' : 'fill-transparent text-stone-300')} />
                ))}
              </div>
              <p className="mb-5 text-base leading-relaxed text-stone-800 line-clamp-4">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{t.name}</p>
                  <p className="text-sm text-stone-600">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>}

      {/* ═══════ PRICING PREVIEW ═══════ */}
      <section className="bg-gradient-to-b from-stone-50 to-white py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
              ابدأ بتجربة 3 أيام مجانية
            </span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 md:text-4xl lg:text-5xl">
            اختر <span className="text-emerald-600">خطتك</span>
          </h2>
          <p className="mx-auto mb-14 max-w-lg text-center text-lg text-stone-800">
            ابدأ بتجربة 3 أيام مجانية مع كل اشتراك.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Essentials */}
            <div
              className="relative flex flex-col rounded-2xl border border-stone-300/60 bg-white p-8 transition-all duration-300 hover:shadow-lg hover:border-stone-400 hover:-translate-y-1"
            >
              <h3 className="mb-1 text-xl font-bold text-stone-900">Essentials</h3>
              <p className="mb-6 text-sm text-stone-800">كل الأدوات الأساسية</p>
              <div className="mb-6">
                <span className="text-3xl font-black text-stone-900 sm:text-5xl">{PRICING.essentials.label}</span>
                <span className="text-base text-stone-800"> /شهريًا</span>
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
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={user ? "/pricing" : "/signup?redirect=/pricing"}
                className="inline-flex items-center justify-center rounded-full border-2 border-stone-300 px-6 py-3 text-base font-bold text-stone-800 transition-all hover:border-emerald-200 hover:text-emerald-700"
              >
                {ctaTextShort}
              </Link>
            </div>

            {/* Elite */}
            <div
              className="relative flex flex-col rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-lg shadow-emerald-600/5"
            >
              <span className="absolute -top-3 right-6 rounded-full bg-emerald-600 px-4 py-1 text-xs font-bold text-white">الأفضل قيمة</span>
              <div className="mb-1 flex items-center gap-2">
                <Crown className="h-5 w-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-stone-900">Elite</h3>
              </div>
              <p className="mb-6 text-sm text-stone-800">كل شيء + مدرب ذكي + استشارات</p>
              <div className="mb-6">
                <span className="text-3xl font-black text-stone-900 sm:text-5xl">{PRICING.elite.label}</span>
                <span className="text-base text-stone-800"> /شهريًا</span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {[
                  'كل مزايا Essentials',
                  'مدرب ذكي بالذكاء الاصطناعي',
                  'بروتوكولات مخصّصة لأهدافك',
                  'استشارة خاصة شهرية',
                  'مراجعة تحاليل شخصية',
                  'تواصل مباشر مع المختص',
                  'دعم أولوية — رد خلال ساعات',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={user ? "/pricing" : "/signup?redirect=/pricing"}
                className="btn-primary-glow inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-base font-bold text-white transition-all hover:bg-emerald-700"
              >
                {ctaTextShort}
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-stone-800">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> دفع آمن ومشفّر</span>
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> ضمان استرداد 3 أيام</span>
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Visa, Mastercard, Apple Pay</span>
          </div>
        </div>
      </section>

      {/* Referral section removed — backend not ready */}

      {/* ═══════ RISK REVERSAL (Hormozi) ═══════ */}
      <section className="bg-gradient-to-b from-white to-stone-50 py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div
          >
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-stone-900 md:text-4xl">
              ضمان <span className="text-emerald-600">بدون مخاطرة</span>
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-lg leading-relaxed text-stone-800">
              جرّب لمدة 3 أيام كاملة. إذا لم تجد قيمة حقيقية — تواصل معنا واسترد أموالك بالكامل.
              <strong className="text-stone-900"> بدون أسئلة. بدون شروط.</strong>
            </p>
            <p className="text-sm text-stone-800">
              نحن واثقون من المحتوى لأننا نعرف أنه يعمل. المخاطرة علينا — وليس عليك.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ EMAIL CAPTURE ═══════ */}
      <section className="relative bg-stone-900 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
            ابقَ على <span className="text-emerald-400">اطلاع</span>
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/50">
            اشترك ليصلك كل جديد عن الببتيدات والتحديثات العلمية
          </p>
          <EmailCapture />
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-right">
            <p className="text-sm font-bold text-amber-900 mb-2">تنويه طبي مهم</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              المحتوى المقدّم في pptides.com لأغراض تعليمية وبحثية فقط ولا يُعدّ بديلًا عن الاستشارة الطبية المتخصصة.
              جميع المعلومات مستقاة من دراسات سريرية منشورة ومراجعات علمية مُحكَّمة.
              <strong> استشر طبيبك المختص قبل استخدام أي ببتيد أو تغيير أي بروتوكول علاجي.</strong>
            </p>
          </div>
          <Link
            to={ctaLink}
            className="btn-primary-glow inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700"
          >
            <span>{user ? "اشترك الآن" : "ابدأ تجربتك المجانية"}</span>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-stone-800">3 أيام مجانًا — إلغاء في أي وقت — ضمان استرداد كامل</p>
        </div>
      </section>
    </div>
  );
}
