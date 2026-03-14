import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL, SITE_URL } from '@/lib/constants';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>سياسة الخصوصية | pptides</title>
        <meta name="description" content="سياسة الخصوصية لموقع pptides.com — كيف نحمي بياناتك الشخصية." />
        <meta property="og:title" content="سياسة الخصوصية | pptides" />
        <meta property="og:description" content="سياسة الخصوصية لموقع pptides.com — كيف نحمي بياناتك الشخصية." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/privacy`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="سياسة الخصوصية | pptides" />
        <meta name="twitter:description" content="سياسة الخصوصية لموقع pptides.com — كيف نحمي بياناتك الشخصية." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/privacy`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'سياسة الخصوصية — pptides',
          description: 'سياسة الخصوصية لموقع pptides.com — كيف نحمي بياناتك الشخصية.',
          url: `${SITE_URL}/privacy`,
          inLanguage: 'ar',
          isPartOf: { '@type': 'WebSite', name: 'pptides', url: SITE_URL },
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <h1 className="mb-8 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">سياسة الخصوصية</h1>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-300">آخر تحديث: {LEGAL_LAST_UPDATED}</p>

        <div className="space-y-8 text-stone-800 dark:text-stone-200 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">1. المعلومات التي نجمعها</h2>
            <ul className="list-disc space-y-2 ps-6">
              <li>البريد الإلكتروني وكلمة المرور عند إنشاء الحساب</li>
              <li>بيانات الاشتراك والدفع (تُعالج عبر Stripe — لا نخزّن بيانات البطاقة)</li>
              <li>البريد الإلكتروني عند الاشتراك في القائمة البريدية</li>
              <li>بيانات الاستخدام (الصفحات المزارة، الوقت في الموقع)</li>
              <li>محتوى المحادثات في المدرب الذكي — تُرسل إلى مزوّد ذكاء اصطناعي لمعالجتها وإرجاع الإجابات (لا نستخدمها لأغراض التدريب على النماذج)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">2. كيف نستخدم بياناتك</h2>
            <ul className="list-disc space-y-2 ps-6">
              <li>إدارة حسابك واشتراكك</li>
              <li>إرسال تحديثات المحتوى والعروض (يمكنك إلغاء الاشتراك في أي وقت)</li>
              <li>تحسين خدماتنا وتجربة المستخدم</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">3. مزودو الخدمات الخارجيون</h2>
            <p className="mb-3">نستخدم مزودي خدمات خارجيين لتشغيل أجزاء من الموقع. كل مزود يعالج فقط البيانات اللازمة لتقديم خدمته:</p>
            <ul className="list-disc space-y-2 ps-6">
              <li><strong>Supabase</strong> — قاعدة البيانات والمصادقة، مع سياسات أمان على مستوى الصفوف (RLS)</li>
              <li><strong>Stripe</strong> — معالجة المدفوعات. لا نخزّن بيانات بطاقتك أبدًا</li>
              <li><strong>Google Analytics</strong> — تحليل زيارات الصفحات والأحداث لتحسين تجربة المستخدم</li>
              <li><strong>Resend</strong> — إرسال الرسائل البريدية التشغيلية (تأكيد الحساب، إشعارات الاشتراك). يعالج عنوان بريدك الإلكتروني فقط</li>
              <li><strong>Vercel</strong> — استضافة الموقع وقياس الأداء (Web Vitals). يجمع بيانات أداء مجمّعة وغير شخصية</li>
              <li><strong>DeepSeek</strong> — مزود الذكاء الاصطناعي للمدرب الذكي. تُرسل محادثاتك وسجل الحقن لتوليد الإجابات المخصّصة. لا تُستخدم بياناتك لتدريب النماذج</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">4. أمان البيانات</h2>
            <p>نستخدم تشفير SSL/TLS لحماية اتصالاتك. بيانات الدفع تُعالج حصريًا عبر Stripe ولا تمر عبر خوادمنا.</p>
            <p className="mt-3">يتوافق موقعنا مع نظام حماية البيانات الشخصية السعودي (PDPL). نعالج بياناتك بناءً على: (1) موافقتك عند التسجيل، (2) تنفيذ عقد الاشتراك، (3) المصلحة المشروعة لتحسين الخدمة.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">4.1 المدرب الذكي ومعالجة البيانات</h2>
            <p>قد تتم معالجة محادثات المدرب الذكي عبر مزوّد ذكاء اصطناعي خارج المملكة العربية السعودية. لا تُخزَّن محادثاتك لدى مزوّد الذكاء الاصطناعي بعد المعالجة.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">4.2 الإخطار بالخروقات الأمنية</h2>
            <p>في حال حدوث خرق أمني يؤثر على بياناتك الشخصية، سنخطر الجهات المختصة خلال 72 ساعة ونبلغ المستخدمين المتضررين فورًا وفقًا للمادة 36 من نظام حماية البيانات الشخصية.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">5. حقوقك</h2>
            <ul className="list-disc space-y-2 ps-6">
              <li>حذف حسابك وجميع بياناتك في أي وقت</li>
              <li>إلغاء الاشتراك البريدي</li>
              <li>طلب نسخة من بياناتك</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">6. الاحتفاظ بالبيانات</h2>
            <ul className="list-disc space-y-2 ps-6 text-stone-700 dark:text-stone-200 leading-relaxed">
              <li>نحتفظ ببيانات حسابك طوال فترة اشتراكك النشط</li>
              <li>عند حذف حسابك، يتم حذف جميع بياناتك الشخصية نهائيًا</li>
              <li>سجلات الدفع تُحفظ لدى Stripe وفقًا لسياساتهم</li>
              <li>يمكنك تصدير بياناتك في أي وقت من صفحة الحساب</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">7. سياسة ملفات الارتباط (Cookies)</h2>
            <p className="mb-3">يستخدم موقعنا ملفات الارتباط (Cookies) لتحسين تجربتك. إليك أنواعها:</p>
            <ul className="list-disc space-y-2 ps-6">
              <li><strong>ملفات الارتباط الضرورية</strong> — لازمة لتشغيل الموقع (حالة الجلسة، المصادقة، اختيار الوضع الليلي). لا يمكن إيقافها.</li>
              <li><strong>ملفات الارتباط التحليلية</strong> — نستخدم Google Analytics لفهم كيفية استخدام الزوار للموقع (الصفحات المزارة، مدة الجلسة). البيانات مجمّعة وغير شخصية.</li>
              <li><strong>ملفات ارتباط الدفع</strong> — تُنشأ بواسطة Stripe عند إتمام عملية الدفع لضمان أمان المعاملة المالية.</li>
            </ul>
            <p className="mt-3">يمكنك إدارة ملفات الارتباط من إعدادات متصفحك. تعطيل ملفات الارتباط الضرورية قد يؤثر على عمل الموقع.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">8. التواصل</h2>
            <p>لأي استفسار حول الخصوصية أو ملفات الارتباط: <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[44px] items-center text-emerald-700 underline">{SUPPORT_EMAIL}</a></p>
          </section>
        </div>
        <div className="mt-8 border-t border-stone-200 dark:border-stone-600 pt-6 text-center">
          <Link to="/" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-700 dark:text-emerald-400">العودة للصفحة الرئيسية ←</Link>
        </div>
      </div>
    </div>
  );
}
