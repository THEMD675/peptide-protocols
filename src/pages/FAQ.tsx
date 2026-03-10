import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { SITE_URL, SUPPORT_EMAIL, TRIAL_DAYS } from '@/lib/constants';

const faqs = [
  {
    q: 'هل هذا استشارة طبية؟',
    a: 'لا. محتوى pptides تعليمي بالكامل ولا يُعدّ بديلًا عن الاستشارة الطبية المتخصصة. نقدّم معلومات علمية مبنية على الأبحاث لمساعدتك في فهم الببتيدات، لكن يجب دائمًا استشارة طبيبك قبل استخدام أي ببتيد أو تغيير أي بروتوكول علاجي.',
  },
  {
    q: 'هل الببتيدات قانونية؟',
    a: 'الببتيدات تُصنّف كمواد كيميائية بحثية (Research Chemicals) في معظم الدول وليست أدوية مُنظَّمة. القوانين تختلف من بلد لآخر — ننصحك بمراجعة الأنظمة المحلية في بلدك. pptides لا تقدّم استشارات قانونية.',
  },
  {
    q: 'هل تبيعون ببتيدات؟',
    a: 'لا. pptides منصة تعليمية ومعلوماتية فقط. لا نبيع أي ببتيدات أو مكمّلات أو أدوية. هدفنا تمكينك من فهم العلم واتخاذ قرارات مستنيرة بالتعاون مع طبيبك.',
  },
  {
    q: 'ما الفرق بين أساسي ومتقدم؟',
    a: 'خطة Essentials (أساسي) تتضمن مكتبة الببتيدات الكاملة، حاسبة الجرعات، دليل التحاليل، والبروتوكولات المُجمَّعة. خطة Elite (متقدم) تضيف المدرب الذكي بالذكاء الاصطناعي، بروتوكولات مخصّصة، استشارات بلا حدود، ودعم مخصّص عبر البريد.',
  },
  {
    q: 'كيف ألغي اشتراكي؟',
    a: 'يمكنك إلغاء اشتراكك من صفحة الحساب مباشرة. إذا واجهت أي مشكلة، تواصل معنا عبر ' + SUPPORT_EMAIL + ' وسنتولى الأمر فورًا.',
  },
  {
    q: 'هل هناك ضمان استرداد؟',
    a: `نعم. لديك ${TRIAL_DAYS} أيام لتجربة المحتوى. إذا لم يعجبك، تواصل معنا عبر ${SUPPORT_EMAIL} واسترد أموالك بالكامل. بدون أسئلة، بدون شروط.`,
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم. نستخدم Supabase مع تشفير البيانات وسياسات أمان Row Level Security (RLS) لضمان أن بياناتك لا يمكن الوصول إليها إلا من حسابك. الدفع يتم عبر Stripe ولا نخزّن بيانات بطاقتك أبدًا.',
  },
  {
    q: 'كيف أتواصل معكم؟',
    a: 'يمكنك التواصل معنا عبر البريد الإلكتروني: ' + SUPPORT_EMAIL + '. الدعم متاح 24/7 ونرد خلال ساعات.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <Helmet>
        <title>الأسئلة الشائعة | pptides</title>
        <meta name="description" content="إجابات على الأسئلة الأكثر شيوعًا حول pptides: هل هذا استشارة طبية؟ هل الببتيدات قانونية؟ هل تبيعون ببتيدات؟ وأكثر." />
        <meta property="og:title" content="الأسئلة الشائعة | pptides" />
        <meta property="og:description" content="إجابات على الأسئلة الأكثر شيوعًا حول pptides والببتيدات" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/faq`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <link rel="canonical" href={`${SITE_URL}/faq`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="الأسئلة الشائعة | pptides" />
        <meta name="twitter:description" content="إجابات على الأسئلة الأكثر شيوعًا حول pptides والببتيدات." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <HelpCircle className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 md:text-4xl">
            الأسئلة <span className="text-emerald-600">الشائعة</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600">
            إجابات سريعة على أكثر الأسئلة شيوعًا
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-stone-200 bg-white transition-all hover:border-emerald-200 hover:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-base font-semibold text-stone-900 md:p-6">
                <span>{faq.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-stone-700 md:px-6 md:pb-6">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="font-bold text-stone-900">لم تجد إجابة على سؤالك؟</p>
          <p className="mt-1 text-sm text-stone-600">
            تواصل معنا مباشرة عبر{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[44px] items-center font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/pricing"
              className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white transition-colors hover:bg-emerald-700"
            >
              عرض الأسعار
            </Link>
            <Link
              to="/library"
              className="rounded-full border-2 border-stone-300 px-8 py-3 font-bold text-stone-800 transition-colors hover:bg-stone-100"
            >
              تصفّح المكتبة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
