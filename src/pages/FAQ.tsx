import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, Search, Dna, CreditCard, Microscope, Bot, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { SITE_URL, SUPPORT_EMAIL, TRIAL_DAYS, PRICING, PEPTIDE_COUNT } from '@/lib/constants';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
}

const sections: FAQSection[] = [
  {
    title: 'عن pptides',
    icon: Dna,
    items: [
      {
        q: 'ما هو pptides؟',
        a: `pptides هي أول منصة عربية متخصصة في تعليم الببتيدات العلاجية. نقدّم مكتبة شاملة تضم ${PEPTIDE_COUNT} ببتيد مع بروتوكولات استخدام مفصّلة، حاسبة جرعات دقيقة، ودليل تحاليل مخبرية — كل ذلك باللغة العربية ومبني على أبحاث علمية موثّقة.`,
      },
      {
        q: 'هل المحتوى موثوق علمياً؟',
        a: 'نعم. جميع المعلومات في pptides مستندة إلى أبحاث علمية منشورة في مجلات محكّمة (PubMed). كل ببتيد مرفق بمصادره العلمية التي يمكنك مراجعتها. نحرص على تحديث المحتوى باستمرار مع كل بحث جديد.',
      },
      {
        q: 'من يقف وراء pptides؟',
        a: 'pptides مشروع سعودي أسّسه متخصصون في مجال الصحة والأداء البدني. هدفنا سد الفجوة المعرفية في المحتوى العربي عن الببتيدات العلاجية وتقديم معلومات موثوقة تساعدك على اتخاذ قرارات صحية مستنيرة بالتعاون مع طبيبك.',
      },
      {
        q: 'هل هذا استشارة طبية؟',
        a: 'لا. محتوى pptides تعليمي بالكامل ولا يُعدّ بديلًا عن الاستشارة الطبية المتخصصة. نقدّم معلومات علمية مبنية على الأبحاث لمساعدتك في فهم الببتيدات، لكن يجب دائمًا استشارة طبيبك قبل استخدام أي ببتيد أو تغيير أي بروتوكول علاجي.',
      },
      {
        q: 'هل تبيعون ببتيدات؟',
        a: 'لا. pptides منصة تعليمية ومعلوماتية فقط. لا نبيع أي ببتيدات أو مكمّلات أو أدوية. هدفنا تمكينك من فهم العلم واتخاذ قرارات مستنيرة بالتعاون مع طبيبك.',
      },
    ],
  },
  {
    title: 'الاشتراك والأسعار',
    icon: CreditCard,
    items: [
      {
        q: 'كم تكلفة الاشتراك؟',
        a: `لدينا خطتان: الأساسية (Essentials) بسعر ${PRICING.essentials.monthly} ر.س شهرياً، والمتقدمة (Elite) بسعر ${PRICING.elite.monthly} ر.س شهرياً. كما نوفّر خصم كبير على الاشتراك السنوي لكلتا الخطتين.`,
      },
      {
        q: 'هل يوجد تجربة مجانية؟',
        a: `نعم! نقدّم تجربة مجانية لمدة ${TRIAL_DAYS} أيام تمنحك وصولاً كاملاً لجميع ميزات الخطة التي تختارها. يمكنك الإلغاء في أي وقت خلال فترة التجربة دون أي رسوم.`,
      },
      {
        q: 'هل أحتاج بطاقة ائتمان للتجربة المجانية؟',
        a: 'نعم، نطلب بيانات بطاقتك عند بدء التجربة المجانية لضمان تجربة سلسة. لكن لن يتم خصم أي مبلغ خلال فترة التجربة، ويمكنك الإلغاء بسهولة قبل انتهائها.',
      },
      {
        q: 'ماذا يحدث بعد انتهاء التجربة المجانية؟',
        a: `بعد انتهاء الـ ${TRIAL_DAYS} أيام، يتم تفعيل اشتراكك تلقائياً بالخطة التي اخترتها. إذا لم تُلغِ قبل انتهاء التجربة، سيتم خصم مبلغ الاشتراك من بطاقتك. يمكنك الإلغاء أو تغيير خطتك في أي وقت من صفحة حسابك.`,
      },
      {
        q: 'كيف ألغي اشتراكي؟',
        a: `يمكنك إلغاء اشتراكك بسهولة من صفحة الحساب مباشرة بنقرة واحدة. الإلغاء فوري ولن يتم تجديد اشتراكك. إذا واجهت أي مشكلة، تواصل معنا عبر ${SUPPORT_EMAIL} وسنتولى الأمر فوراً.`,
      },
      {
        q: 'هل يمكنني استرداد أموالي؟',
        a: `نعم. لديك ضمان استرداد كامل خلال ${TRIAL_DAYS} أيام من بدء اشتراكك. إذا لم يعجبك المحتوى، تواصل معنا عبر ${SUPPORT_EMAIL} واسترد أموالك بالكامل — بدون أسئلة وبدون شروط.`,
      },
      {
        q: 'ما الفرق بين الباقة الأساسية والمتقدمة؟',
        a: `الخطة الأساسية (Essentials) تتضمن مكتبة الببتيدات الكاملة، حاسبة الجرعات، دليل التحاليل، والبروتوكولات المُجمَّعة. الخطة المتقدمة (Elite) تضيف المدرب الذكي بالذكاء الاصطناعي، بروتوكولات مخصّصة، استشارات بلا حدود، ودعم مخصّص عبر البريد.`,
      },
      {
        q: 'هل الدفع آمن؟',
        a: 'نعم، نستخدم Stripe — أكبر وأشهر نظام دفع إلكتروني في العالم تستخدمه شركات مثل Google و Amazon. بياناتك المالية مشفّرة بالكامل ولا نخزّن بيانات بطاقتك على خوادمنا أبداً.',
      },
    ],
  },
  {
    title: 'الببتيدات',
    icon: Microscope,
    items: [
      {
        q: 'ما هي الببتيدات العلاجية؟',
        a: 'الببتيدات العلاجية هي سلاسل قصيرة من الأحماض الأمينية تعمل كإشارات بيولوجية في الجسم. تُستخدم في مجالات متعددة مثل التعافي العضلي، حرق الدهون، تحسين النوم، ومكافحة الشيخوخة. كثير منها موجود طبيعياً في الجسم أو مشتق من مواد طبيعية.',
      },
      {
        q: 'هل الببتيدات آمنة؟',
        a: 'الببتيدات المدروسة علمياً لها ملفات أمان موثّقة في الأبحاث. لكن مثل أي مادة فعّالة، الجرعة والنقاء والاستخدام الصحيح عوامل حاسمة. لذلك نوفّر في pptides معلومات مفصّلة عن الآثار الجانبية والتحذيرات لكل ببتيد، وننصح دائماً باستشارة طبيبك.',
      },
      {
        q: 'هل أحتاج وصفة طبية لاستخدام الببتيدات؟',
        a: 'يختلف ذلك من بلد لآخر. بعض الببتيدات تُصنّف كأدوية تحتاج وصفة طبية في بعض الدول، بينما تُصنّف كمواد بحثية في دول أخرى. ننصحك دائماً بمراجعة الأنظمة المحلية في بلدك والتعاون مع طبيب مختص.',
      },
      {
        q: 'ما الفرق بين الببتيدات والستيرويدات؟',
        a: 'الفرق جوهري. الستيرويدات هي هرمونات صناعية تؤثر مباشرة على مستويات الهرمونات وتحمل مخاطر كبيرة. الببتيدات تعمل كإشارات تحفّز الجسم على إنتاج مواده الطبيعية، مما يجعلها أكثر أماناً بشكل عام وأقل تأثيراً على التوازن الهرموني الطبيعي.',
      },
      {
        q: 'كم يستغرق ظهور النتائج؟',
        a: 'يختلف ذلك حسب نوع الببتيد والهدف. بعض الببتيدات تظهر نتائجها خلال أيام (مثل ببتيدات النوم)، بينما تحتاج أخرى 4-8 أسابيع لنتائج ملموسة (مثل ببتيدات حرق الدهون أو بناء العضلات). نوضّح الجدول الزمني المتوقع لكل ببتيد في بروتوكوله.',
      },
      {
        q: 'هل يمكن استخدام أكثر من ببتيد في نفس الوقت؟',
        a: 'نعم، كثير من البروتوكولات تجمع بين ببتيدات متكاملة لنتائج أفضل. لكن يجب الحذر من التعارضات. نوفّر في pptides أداة فحص التعارضات وبروتوكولات مُجمَّعة مدروسة تساعدك على الجمع بأمان.',
      },
      {
        q: 'هل الببتيدات قانونية؟',
        a: 'الببتيدات تُصنّف كمواد كيميائية بحثية (Research Chemicals) في معظم الدول وليست أدوية مُنظَّمة. القوانين تختلف من بلد لآخر — ننصحك بمراجعة الأنظمة المحلية في بلدك. pptides لا تقدّم استشارات قانونية.',
      },
    ],
  },
  {
    title: 'المدرب الذكي',
    icon: Bot,
    items: [
      {
        q: 'كيف يعمل المدرب الذكي؟',
        a: 'المدرب الذكي يستخدم الذكاء الاصطناعي المتقدم مع قاعدة بيانات pptides العلمية لتقديم إجابات مخصّصة لأسئلتك عن الببتيدات. يمكنه مساعدتك في اختيار البروتوكول المناسب، فهم الجرعات، وتفسير نتائج تحاليلك.',
      },
      {
        q: 'هل يمكنني الوثوق بنصائح المدرب الذكي؟',
        a: 'المدرب الذكي مبني على قاعدة بيانات علمية موثّقة ويقدّم معلومات دقيقة. لكنه أداة تعليمية وليس بديلاً عن الاستشارة الطبية. استخدمه لفهم المعلومات واطرح الأسئلة على طبيبك قبل اتخاذ قرارات علاجية.',
      },
      {
        q: 'كم سؤال يمكنني طرحه على المدرب الذكي؟',
        a: 'مشتركو الخطة المتقدمة (Elite) يحصلون على استشارات بلا حدود مع المدرب الذكي. يمكنك طرح أي عدد من الأسئلة في أي وقت والحصول على إجابات فورية ومفصّلة.',
      },
    ],
  },
  {
    title: 'الخصوصية والأمان',
    icon: Lock,
    items: [
      {
        q: 'هل بياناتي محمية؟',
        a: 'نعم، نأخذ حماية بياناتك بجدية تامة. نستخدم تشفير البيانات وسياسات أمان متقدمة (Row Level Security) لضمان أن بياناتك لا يمكن الوصول إليها إلا من حسابك. الدفع يتم عبر Stripe ولا نخزّن بيانات بطاقتك أبداً.',
      },
      {
        q: 'هل يمكنني حذف حسابي؟',
        a: `نعم، يمكنك حذف حسابك بالكامل في أي وقت من إعدادات الحساب. عند الحذف، نزيل جميع بياناتك الشخصية نهائياً من خوادمنا. يمكنك أيضاً طلب الحذف عبر ${SUPPORT_EMAIL}.`,
      },
      {
        q: 'هل تشاركون بياناتي مع أطراف ثالثة؟',
        a: 'لا نبيع أو نشارك بياناتك الشخصية مع أي طرف ثالث لأغراض تسويقية. نشارك فقط ما هو ضروري لتشغيل الخدمة (مثل معالجة الدفع عبر Stripe). يمكنك الاطلاع على سياسة الخصوصية الكاملة لمزيد من التفاصيل.',
      },
    ],
  },
];

const allFaqs = sections.flatMap((s) => s.items);

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function FAQ() {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.trim().toLowerCase();
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [search]);

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>الأسئلة الشائعة | pptides</title>
        <meta
          name="description"
          content="إجابات شاملة على جميع أسئلتك حول pptides: الاشتراك، الببتيدات، المدرب الذكي، الأسعار، الخصوصية وأكثر."
        />
        <meta property="og:title" content="الأسئلة الشائعة | pptides" />
        <meta
          property="og:description"
          content="إجابات على الأسئلة الأكثر شيوعًا حول pptides والببتيدات"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/faq`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <link rel="canonical" href={`${SITE_URL}/faq`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="الأسئلة الشائعة | pptides" />
        <meta
          name="twitter:description"
          content="إجابات على الأسئلة الأكثر شيوعًا حول pptides والببتيدات."
        />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <HelpCircle className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            الأسئلة <span className="text-emerald-700">الشائعة</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-300">
            إجابات شاملة على كل ما تحتاج معرفته عن pptides
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400 dark:text-stone-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الأسئلة الشائعة..."
            className="w-full rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 py-3.5 pe-4 ps-12 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-colors min-h-[44px]"
          />
        </div>

        {/* Sections */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-10 text-center">
            <p className="text-lg font-semibold text-stone-700 dark:text-stone-200">
              لم نجد نتائج لـ &quot;{search}&quot;
            </p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-300">
              جرّب كلمات بحث مختلفة أو{' '}
              <Link to="/contact" className="font-medium text-emerald-700 hover:underline">
                تواصل معنا
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((section) => (
              <div key={section.title}>
                {/* Section header */}
                <div
                  className="mb-4 flex w-full items-center gap-3 text-start min-h-[44px]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <section.icon className="h-5 w-5 text-emerald-700" />
                  </span>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    {section.title}
                  </h2>
                  <span className="ms-auto rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:text-stone-300">
                    {section.items.length}
                  </span>
                </div>

                {/* FAQ items */}
                <div className="space-y-2.5">
                  {section.items.map((faq) => (
                    <details
                      key={faq.q}
                      className="group rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900/50 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 card-hover"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-base font-semibold text-stone-900 dark:text-stone-100 md:p-6 min-h-[44px] select-none">
                        <span>{faq.q}</span>
                        <ChevronDown className="h-5 w-5 shrink-0 text-stone-400 dark:text-stone-300 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="details-content">
                        <p className="px-5 pb-5 text-sm leading-relaxed text-stone-700 dark:text-stone-200 md:px-6 md:pb-6">
                          {faq.a}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-14 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-8 text-center">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
            لم تجد إجابة على سؤالك؟
          </p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            تواصل معنا مباشرة وسنرد خلال 24 ساعة
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex min-h-[44px] items-center rounded-full bg-emerald-600 px-8 py-3 font-bold text-white transition-colors hover:bg-emerald-700"
            >
              تواصل معنا
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex min-h-[44px] items-center rounded-full border-2 border-stone-300 dark:border-stone-600 px-8 py-3 font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
