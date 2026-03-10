import { Helmet } from 'react-helmet-async';
import PeptideQuiz from '@/components/PeptideQuiz';
import { SITE_URL } from '@/lib/constants';

export default function Quiz() {
  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>اكتشف الببتيد المناسب لك | اختبار مجاني | pptides</title>
        <meta name="description" content="اختبار مجاني وسريع يحدد لك الببتيد الأفضل لهدفك الصحي — فقدان دهون، تعافٍ وإصلاح، تحسين النوم، أو بناء العضل والأداء. نتيجة فورية مبنية على علم." />
        <link rel="canonical" href={`${SITE_URL}/quiz`} />
        <meta property="og:title" content="اكتشف الببتيد المناسب لك | pptides" />
        <meta property="og:description" content="اختبار مجاني وسريع يحدد لك الببتيد الأفضل لهدفك الصحي — نتيجة فورية." />
        <meta property="og:url" content={`${SITE_URL}/quiz`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="اكتشف الببتيد المناسب لك | pptides" />
        <meta name="twitter:description" content="اختبار مجاني وسريع يحدد لك الببتيد الأفضل لهدفك — فقدان دهون، تعافٍ، نوم، أو بناء عضل." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Quiz',
          name: 'اكتشف الببتيد المناسب لك',
          url: `${SITE_URL}/quiz`,
          description: 'اختبار قصير يحدد لك الببتيد الأفضل لهدفك.',
          educationalLevel: 'beginner',
          inLanguage: 'ar',
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl px-6 py-8 md:py-12">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">اكتشف الببتيد المناسب لك</h1>
        <PeptideQuiz />
      </div>
    </div>
  );
}
