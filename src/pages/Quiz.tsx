import { Helmet } from 'react-helmet-async';
import PeptideQuiz from '@/components/PeptideQuiz';
import { SITE_URL } from '@/lib/constants';

export default function Quiz() {
  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>اكتشف الببتيد المناسب لك | اختبار مجاني | pptides</title>
        <meta name="description" content="اختبار قصير يحدد لك الببتيد الأفضل لهدفك — فقدان دهون، تعافٍ، نوم، أو بناء عضل. مجاني وسريع." />
        <meta property="og:title" content="اكتشف الببتيد المناسب لك | pptides" />
        <meta property="og:description" content="اختبار قصير يحدد لك الببتيد الأفضل لهدفك — فقدان دهون، تعافٍ، نوم، أو بناء عضل. مجاني وسريع." />
        <meta property="og:url" content={`${SITE_URL}/quiz`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="mx-auto max-w-2xl px-6 py-8 md:py-12">
        <PeptideQuiz />
      </div>
    </div>
  );
}
