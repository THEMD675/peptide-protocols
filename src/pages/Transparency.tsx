import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Check, X, Shield } from 'lucide-react';
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';

export default function Transparency() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>كيف نكسب المال | شفافية كاملة | pptides</title>
        <meta name="description" content="pptides منصة تعليمية بحتة — لا نبيع ببتيدات ولا نأخذ عمولات من الموردين. اشتراكك الشهري هو مصدر دخلنا الوحيد. شفافية كاملة مع مستخدمينا." />
        <link rel="canonical" href={`${SITE_URL}/transparency`} />
        <meta property="og:title" content="كيف نكسب المال | شفافية كاملة | pptides" />
        <meta property="og:description" content="pptides منصة تعليمية بحتة — لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد." />
        <meta property="og:url" content={`${SITE_URL}/transparency`} />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="كيف نكسب المال | شفافية كاملة | pptides" />
        <meta name="twitter:description" content="pptides منصة تعليمية بحتة — لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'كيف نكسب المال',
          url: `${SITE_URL}/transparency`,
          description: 'pptides منصة تعليمية بحتة. لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد.',
          inLanguage: 'ar',
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Shield className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            كيف نكسب <span className="text-emerald-600">المال</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-400">
            شفافية كاملة — لأن ثقتك أهم من أرباحنا
          </p>
        </div>

        <div className="space-y-8 text-stone-800 dark:text-stone-200 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">مصدر الدخل الوحيد: اشتراكك</h2>
            <p>
              pptides منصة تعليمية بحتة. اشتراكك الشهري أو السنوي هو مصدر دخلنا الوحيد.
              لا نبيع ببتيدات. لا نأخذ عمولات من الموردين. لا إعلانات. لا بيانات مستخدمين.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">ما نفعله</h2>
            <ul className="space-y-2">
              {[
                'نقدم محتوى تعليمي مبني على الأبحاث العلمية',
                'نطوّر أدوات ذكية (حاسبة جرعات، مدرب ذكي، سجل حقن)',
                'نحدّث المكتبة باستمرار مع كل دراسة جديدة',
                'نقدم دعمًا مباشرًا عبر البريد الإلكتروني',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">ما لا نفعله</h2>
            <ul className="space-y-2">
              {[
                'لا نبيع ببتيدات أو مكملات أو أدوية',
                'لا نأخذ عمولات من أي مورّد',
                'لا نعرض إعلانات على الموقع',
                'لا نبيع بياناتك أو نشاركها مع أطراف ثالثة',
                'لا نقدم استشارات طبية أو وصفات علاجية',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">لماذا هذا النموذج؟</h2>
            <p>
              عندما يكون مصدر دخلنا هو اشتراكك فقط، فإن هدفنا الوحيد يصبح تقديم أفضل محتوى ممكن
              لتبقيك مشتركًا. لا توجد حوافز لبيع منتجات أو ترويج موردين — مصلحتنا مرتبطة بمصلحتك مباشرة.
            </p>
          </section>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6 text-center">
            <p className="font-bold text-stone-900 dark:text-stone-100">أسئلة أخرى؟</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              تواصل معنا عبر{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[44px] items-center font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link to="/about" className="rounded-full border border-stone-300 dark:border-stone-700 px-6 py-2.5 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800">
                عن pptides
              </Link>
              <Link to="/privacy" className="rounded-full border border-stone-300 dark:border-stone-700 px-6 py-2.5 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800">
                سياسة الخصوصية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
