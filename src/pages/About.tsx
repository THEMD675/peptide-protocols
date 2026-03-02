import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Brain, Syringe, Calculator, FlaskConical, ArrowLeft, Stethoscope, Globe, BookOpen } from 'lucide-react';
import { SITE_URL, PEPTIDE_COUNT, SUPPORT_EMAIL, TRIAL_DAYS } from '@/lib/constants';

const differentiators = [
  { icon: Brain, title: 'مدرب ذكي بالذكاء الاصطناعي', desc: 'استشارات فورية ومخصّصة حول البروتوكولات والجرعات — متاح 24/7.' },
  { icon: Syringe, title: 'سجل الحقن', desc: 'تتبّع حقنك، مواقع الحقن، والأعراض الجانبية بسهولة تامة.' },
  { icon: Calculator, title: 'حاسبة الجرعات', desc: 'حساب دقيق للجرعات بالمايكروغرام مع تحويل لوحدات السيرنج.' },
  { icon: FlaskConical, title: 'متابعة التحاليل المخبرية', desc: 'دليل شامل للتحاليل المطلوبة قبل وأثناء وبعد الاستخدام.' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <Helmet>
        <title>عن pptides — أشمل دليل عربي للببتيدات | pptides</title>
        <meta name="description" content="pptides: أول منصة عربية متخصصة في علم الببتيدات. بواسطة طبيب عام مع خبرة شخصية في البيبتيدات." />
        <meta property="og:title" content="عن pptides — أشمل دليل عربي للببتيدات" />
        <meta property="og:description" content="أول منصة عربية متخصصة في علم الببتيدات. بواسطة طبيب عام مع خبرة شخصية." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/about`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'pptides',
            url: SITE_URL,
            description: 'أول منصة عربية متخصصة في علم الببتيدات — بروتوكولات كاملة، مدرب ذكي، وحاسبة جرعات.',
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
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <Globe className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-stone-900 md:text-4xl lg:text-5xl">
            عن <span className="text-emerald-600">pptides</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-stone-600">
            بواسطة طبيب عام مع خبرة شخصية في البيبتيدات
          </p>
        </div>

        {/* Mission */}
        <section className="mb-16">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <BookOpen className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="mb-3 text-xl font-bold text-stone-900 md:text-2xl">مهمّتنا</h2>
                <p className="text-base leading-relaxed text-stone-700">
                  نقدّم علم الببتيدات باللغة العربية أولًا — للعالم العربي. المحتوى العلمي عن الببتيدات
                  متوفر بالإنجليزية فقط، مبعثر بين منتديات ومقاطع فيديو بدون تنظيم. أنشأنا pptides
                  ليكون المرجع العربي الشامل: {PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة، أدوات ذكية،
                  ودعم مستمر.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 md:text-3xl">
            ما الذي يميّز <span className="text-emerald-600">pptides</span>؟
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {differentiators.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:border-emerald-200 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mb-1 font-bold text-stone-900">{title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Founder note */}
        <section className="mb-16">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <Stethoscope className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="mb-3 text-xl font-bold text-stone-900 md:text-2xl">من يقف وراء pptides؟</h2>
                <p className="text-base leading-relaxed text-stone-700">
                  pptides أسّسه طبيب عام عربي بدأ رحلته مع الببتيدات كمستخدم شخصي قبل أن يحوّل
                  تجربته ومعرفته الطبية إلى منصة تعليمية شاملة. الهدف ليس بيع ببتيدات أو تقديم
                  استشارات طبية — بل تمكين المستخدم العربي من فهم العلم واتخاذ قرارات مستنيرة
                  بالتعاون مع طبيبه.
                </p>
                <p className="mt-3 text-sm text-stone-500">
                  لأسباب مهنية وقانونية، نحافظ على خصوصية المؤسس مع التأكيد على الخلفية الطبية
                  والعلمية لكل المحتوى المنشور.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/pricing"
            className="btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            <span>ابدأ الآن</span>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-stone-500">{TRIAL_DAYS} أيام تجربة مجانية — إلغاء في أي وقت</p>
        </div>
      </div>
    </div>
  );
}
