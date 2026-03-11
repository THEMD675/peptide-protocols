import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Check, X, Shield, CreditCard, FileSearch, Scale, Eye, Trash2, ArrowLeft, BookOpen } from 'lucide-react';
import { SITE_URL, SUPPORT_EMAIL, TRIAL_DAYS, PUBMED_SOURCE_COUNT } from '@/lib/constants';

const whatWeDo = [
  'نقدم محتوى تعليمي مبني على الأبحاث العلمية المحكّمة',
  'نطوّر أدوات ذكية (حاسبة جرعات، مدرب ذكي، سجل حقن)',
  'نحدّث المكتبة باستمرار مع كل دراسة جديدة',
  'نقدم دعمًا مباشرًا عبر البريد الإلكتروني',
  'نستمع لملاحظات المستخدمين ونُحسّن أسبوعيًا',
];

const whatWeDontDo = [
  'لا نبيع ببتيدات أو مكملات أو أدوية',
  'لا نأخذ عمولات من أي مورّد أو بائع',
  'لا نعرض إعلانات على الموقع — أبدًا',
  'لا نبيع بياناتك أو نشاركها مع أطراف ثالثة',
  'لا ننشر محتوى مموّلاً أو مدفوعاً',
  'لا نقدم استشارات طبية أو وصفات علاجية',
];

const dataCollected = [
  { item: 'البريد الإلكتروني', reason: 'لإنشاء حسابك وإرسال تحديثات المحتوى' },
  { item: 'بيانات الدفع', reason: 'تُعالج عبر Stripe مباشرة — لا نخزّن بيانات بطاقتك أبدًا' },
  { item: 'سجل الحقن (اختياري)', reason: 'لتتبّع بروتوكولاتك الشخصية — مشفّر ومحمي' },
  { item: 'إحصائيات الاستخدام', reason: 'لتحسين تجربة الموقع — مجهولة الهوية بالكامل' },
];

const dataNeverDo = [
  'بيع بياناتك لأي طرف ثالث',
  'مشاركة معلوماتك مع معلنين',
  'تتبّع نشاطك خارج الموقع',
  'استخدام بياناتك لتدريب نماذج ذكاء اصطناعي',
];

export default function Transparency() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>الشفافية — كيف نكسب المال ونحمي بياناتك | pptides</title>
        <meta name="description" content="pptides منصة تعليمية بحتة — لا نبيع ببتيدات ولا نأخذ عمولات من الموردين. اشتراكك الشهري هو مصدر دخلنا الوحيد. شفافية كاملة مع مستخدمينا." />
        <link rel="canonical" href={`${SITE_URL}/transparency`} />
        <meta property="og:title" content="الشفافية — كيف نكسب المال ونحمي بياناتك | pptides" />
        <meta property="og:description" content="pptides منصة تعليمية بحتة — لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد." />
        <meta property="og:url" content={`${SITE_URL}/transparency`} />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="الشفافية — كيف نكسب المال ونحمي بياناتك | pptides" />
        <meta name="twitter:description" content="pptides منصة تعليمية بحتة — لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'الشفافية — كيف نكسب المال',
          url: `${SITE_URL}/transparency`,
          description: 'pptides منصة تعليمية بحتة. لا نبيع ببتيدات. اشتراكك هو مصدر دخلنا الوحيد.',
          inLanguage: 'ar',
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Shield className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl lg:text-5xl">
            الشفافية <span className="text-emerald-700">الكاملة</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-300">
            ثقتك أهم من أرباحنا — إليك بالضبط كيف نعمل وكيف نكسب المال
          </p>
        </div>

        <div className="space-y-10">
          {/* Revenue Model */}
          <section>
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-stone-950 p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <CreditCard className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">كيف نكسب المال</h2>
                  <p className="text-base leading-relaxed text-stone-700 dark:text-stone-200">
                    مصدر دخلنا الوحيد هو <strong className="text-emerald-700">اشتراكك</strong>. لا إعلانات.
                    لا عمولات. لا محتوى مموّل. لا بيع بيانات. عندما يكون اشتراكك هو مصدر دخلنا الوحيد،
                    يصبح هدفنا الوحيد تقديم أفضل محتوى ممكن — مصلحتنا مرتبطة بمصلحتك مباشرة.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What we do / don't do */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6">
              <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">✅ ما نفعله</h2>
              <ul className="space-y-3">
                {whatWeDo.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <span className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6">
              <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">❌ ما لا نفعله — أبدًا</h2>
              <ul className="space-y-3">
                {whatWeDontDo.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <span className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Content Standards */}
          <section>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <FileSearch className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">معايير المحتوى</h2>
                  <div className="space-y-4 text-base leading-relaxed text-stone-700 dark:text-stone-200">
                    <div>
                      <h3 className="mb-1 font-bold text-stone-900 dark:text-stone-100">كيف نبحث البروتوكولات</h3>
                      <p>
                        كل بروتوكول يبدأ بمراجعة منهجية للدراسات المنشورة على PubMed وClinicalTrials.gov.
                        نعتمد على الأبحاث المحكّمة (peer-reviewed) فقط، ونوضّح درجة الأدلة لكل استخدام.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-1 font-bold text-stone-900 dark:text-stone-100">سياسة الاستشهاد</h3>
                      <p>
                        أكثر من {PUBMED_SOURCE_COUNT} مرجع علمي موثّق ومرتبط مباشرة بالدراسة الأصلية.
                        يمكنك التحقق من أي معلومة بالعودة للمصدر. لا معلومات بدون مرجع.
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-1 font-bold text-stone-900 dark:text-stone-100">تعارض المصالح</h3>
                      <p>
                        ليس لدينا أي تعارض مصالح. لا نبيع ببتيدات. لا نملك حصصًا في شركات تصنيع.
                        لا نقبل رعاية من الموردين. المحتوى مستقل 100%.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Philosophy */}
          <section>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Scale className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">فلسفة التسعير</h2>
                  <div className="space-y-4 text-base leading-relaxed text-stone-700 dark:text-stone-200">
                    <p>
                      <strong className="text-emerald-700">34 ر.س شهريًا</strong> — أقل من سعر كوب قهوة يوميًا.
                      اخترنا هذا السعر ليكون في متناول الجميع دون المساس بجودة المحتوى والأدوات.
                    </p>
                    <div>
                      <h3 className="mb-2 font-bold text-stone-900 dark:text-stone-100">اشتراكك يموّل:</h3>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                          البحث العلمي ومراجعة البروتوكولات
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                          تطوير وتحسين الأدوات الذكية
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                          إنتاج محتوى تعليمي جديد أسبوعيًا
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                          البنية التحتية والاستضافة الآمنة
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                          دعم العملاء المباشر
                        </li>
                      </ul>
                    </div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      ضمان استرداد كامل — {TRIAL_DAYS} أيام تجربة مجانية، وإلغاء في أي وقت بدون أسئلة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Privacy */}
          <section>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Eye className="h-6 w-6 text-emerald-700" />
                </div>
                <div className="w-full">
                  <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">بياناتك وخصوصيتك</h2>

                  <h3 className="mb-3 font-bold text-stone-900 dark:text-stone-100">ما نجمعه ولماذا</h3>
                  <div className="mb-6 space-y-3">
                    {dataCollected.map(({ item, reason }) => (
                      <div key={item} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 p-4">
                        <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{item}</div>
                        <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">{reason}</div>
                      </div>
                    ))}
                  </div>

                  <h3 className="mb-3 font-bold text-stone-900 dark:text-stone-100">ما لا نفعله ببياناتك — أبدًا</h3>
                  <ul className="mb-6 space-y-2">
                    {dataNeverDo.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                        <span className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                      <div>
                        <div className="text-sm font-bold text-stone-900 dark:text-stone-100">حذف بياناتك بالكامل</div>
                        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                          يمكنك حذف حسابك وجميع بياناتك في أي وقت من{' '}
                          <Link to="/account" className="font-semibold text-emerald-700 underline hover:text-emerald-700">
                            صفحة الحساب
                          </Link>
                          {' '}أو بمراسلتنا على{' '}
                          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-emerald-700 underline hover:text-emerald-700">
                            {SUPPORT_EMAIL}
                          </a>
                          . الحذف نهائي وفوري.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer CTA */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-8 text-center">
            <p className="mb-2 text-lg font-bold text-stone-900 dark:text-stone-100">أسئلة أخرى عن شفافيتنا؟</p>
            <p className="mb-6 text-sm text-stone-600 dark:text-stone-300">
              نرحب بأي استفسار — تواصل معنا مباشرة على{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 underline hover:text-emerald-700 dark:text-emerald-400">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/pricing"
                className="btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                <span>ابدأ الآن</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <BookOpen className="h-4 w-4" />
                <span>عن pptides</span>
              </Link>
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <Shield className="h-4 w-4" />
                <span>سياسة الخصوصية</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
