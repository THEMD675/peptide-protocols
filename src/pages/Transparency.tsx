import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/lib/constants';

export default function Transparency() {
  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>كيف نكسب المال | pptides</title>
        <meta name="description" content="pptides منصة تعليمية بحتة. لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد." />
        <meta property="og:title" content="كيف نكسب المال | pptides" />
        <meta property="og:url" content={`${SITE_URL}/transparency`} />
        <meta property="og:locale" content="ar_SA" />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <h1 className="text-3xl font-bold md:text-4xl">كيف نكسب المال</h1>
        <p className="mt-6 text-lg leading-relaxed text-stone-700">
          pptides منصة تعليمية بحتة. لا نبيع ببتيدات. لا نأخذ عمولات من الموردين. اشتراكك هو مصدر دخلنا الوحيد.
        </p>
      </div>
    </div>
  );
}
