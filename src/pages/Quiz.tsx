import { Helmet } from 'react-helmet-async';
import PeptideQuiz from '@/components/PeptideQuiz';
import { SITE_URL } from '@/lib/constants';

export default function Quiz() {
  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>اكتشف البروتوكول المثالي لك | اختبار مجاني | pptides</title>
        <meta name="description" content="اختبار مجاني ومخصّص في 3 دقائق يحدد لك البروتوكول الأفضل لهدفك الصحي — فقدان الوزن، بناء العضل، مقاومة الشيخوخة، أو صحة عامة. توصية فورية مبنية على علم." />
        <link rel="canonical" href={`${SITE_URL}/quiz`} />
        <meta property="og:title" content="اكتشف البروتوكول المثالي لك | pptides" />
        <meta property="og:description" content="اختبار مجاني ومخصّص في 3 دقائق — اكتشف الببتيدات الأنسب لك." />
        <meta property="og:url" content={`${SITE_URL}/quiz`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="اكتشف البروتوكول المثالي لك | pptides" />
        <meta name="twitter:description" content="اختبار مخصّص في 3 دقائق — توصية فورية لأهدافك الصحية." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Quiz',
          name: 'اكتشف البروتوكول المثالي لك',
          url: `${SITE_URL}/quiz`,
          description: 'اختبار مخصّص يحدد لك البروتوكول الأفضل لأهدافك الصحية.',
          educationalLevel: 'beginner',
          inLanguage: 'ar',
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-24 md:pt-12">
        <PeptideQuiz />
      </div>
    </div>
  );
}
