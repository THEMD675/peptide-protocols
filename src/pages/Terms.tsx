import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { PRICING, LEGAL_LAST_UPDATED, SUPPORT_EMAIL, TRIAL_DAYS } from '@/lib/constants';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <Helmet>
        <title>شروط الاستخدام | pptides</title>
        <meta name="description" content="شروط الاستخدام لموقع pptides.com — الاشتراكات، الاسترداد، وحدود المسؤولية." />
        <meta property="og:description" content="شروط الاستخدام لموقع pptides.com — الاشتراكات، الاسترداد، وحدود المسؤولية." />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <h1 className="mb-8 text-3xl font-bold text-stone-900 md:text-4xl">شروط الاستخدام</h1>
        <p className="mb-4 text-sm text-stone-500">آخر تحديث: {LEGAL_LAST_UPDATED}</p>

        <div className="space-y-8 text-stone-800 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">1. طبيعة المحتوى</h2>
            <p>جميع المعلومات المقدّمة في pptides.com لأغراض تعليمية وبحثية فقط ولا تُعدّ بديلًا عن الاستشارة الطبية المتخصصة. لا نقدّم نصائح طبية ولا نتحمّل مسؤولية أي قرارات تُتخذ بناءً على المحتوى. المدرب الذكي يقدّم معلومات تعليمية عن الجرعات والبروتوكولات — وليس نصائح طبية. استشر طبيبك قبل استخدام أي ببتيد.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">2. الاشتراكات والدفع</h2>
            <ul className="list-disc space-y-2 pe-6">
              <li>خطة Essentials: {PRICING.essentials.label} شهريًا</li>
              <li>خطة Elite: {PRICING.elite.label} شهريًا</li>
              <li>تجربة مجانية: {TRIAL_DAYS} أيام على جميع الخطط</li>
              <li>الاشتراكات تتجدد تلقائيًا ما لم يُلغَ قبل تاريخ التجديد</li>
              <li>يتم الدفع عبر Stripe بشكل آمن ومشفّر</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">3. سياسة الاسترداد</h2>
            <p>نقدّم ضمان استرداد كامل خلال {TRIAL_DAYS} أيام من تاريخ الاشتراك. إذا لم تكن راضيًا، تواصل معنا عبر <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 underline">{SUPPORT_EMAIL}</a> واسترد أموالك بالكامل. بعد مرور {TRIAL_DAYS} أيام، لا يمكن استرداد المبالغ المدفوعة.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">4. الإلغاء</h2>
            <p>يمكنك إلغاء اشتراكك في أي وقت. ستستمر في الوصول إلى المحتوى حتى نهاية فترة الاشتراك الحالية. لن يتم تحصيل أي رسوم إضافية بعد الإلغاء.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">5. الملكية الفكرية</h2>
            <p>جميع المحتوى والأدوات والبيانات في pptides.com محمية بحقوق الملكية الفكرية. يُمنع نسخ أو إعادة نشر المحتوى بدون إذن كتابي.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">6. حدود المسؤولية</h2>
            <p>يُقدَّم الموقع والمحتوى "كما هو" بدون أي ضمانات صريحة أو ضمنية. لا نتحمّل أي مسؤولية عن أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الموقع أو المحتوى، بما في ذلك على سبيل المثال لا الحصر: القرارات الصحية، نتائج البروتوكولات، أو انقطاع الخدمة. مسؤوليتنا القصوى لا تتجاوز المبلغ الذي دفعته خلال آخر 3 أشهر.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">7. شرط العمر</h2>
            <p>يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام هذا الموقع وإنشاء حساب. باستخدامك للموقع، فإنك تُقرّ بأنك تستوفي هذا الشرط.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">8. الاحتفاظ بالبيانات</h2>
            <ul className="list-disc space-y-2 pe-6">
              <li>نحتفظ ببيانات حسابك طوال فترة اشتراكك النشط</li>
              <li>عند حذف حسابك، تُحذف بياناتك الشخصية خلال 30 يومًا</li>
              <li>سجلات الدفع تُحفظ لدى Stripe وفقًا لمتطلبات الامتثال المالي</li>
              <li>محادثات المدرب الذكي تُحذف خلال 90 يومًا من إغلاق الحساب</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">9. التعويض وإخلاء المسؤولية</h2>
            <p>أنت توافق على تعويض pptides.com ومالكيه ومسؤوليه وموظفيه وحمايتهم وإبراء ذمّتهم من أي مطالبات أو أضرار أو خسائر أو تكاليف (بما في ذلك أتعاب المحاماة المعقولة) الناتجة عن أو المتعلقة بـ: (أ) استخدامك للموقع أو المحتوى، (ب) انتهاكك لهذه الشروط، (ج) أي قرارات صحية أو طبية تتخذها بناءً على المحتوى المقدّم، أو (د) انتهاكك لحقوق أي طرف ثالث.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">10. القانون الحاكم والاختصاص القضائي</h2>
            <p>تخضع هذه الشروط وتُفسَّر وفقًا لقوانين المملكة العربية السعودية. أي نزاع ينشأ عن أو يتعلق بهذه الشروط أو استخدام الموقع يخضع حصريًا للاختصاص القضائي للمحاكم المختصة في المملكة العربية السعودية. في حال بطلان أي بند من هذه الشروط، تظل البنود الأخرى سارية المفعول بالكامل.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">11. الضرائب والرسوم</h2>
            <p>المستخدم مسؤول عن أي ضرائب أو رسوم مترتبة حسب قوانين بلده. الأسعار المعروضة لا تشمل ضريبة القيمة المضافة.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">12. التعديلات</h2>
            <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنُخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">13. التواصل</h2>
            <p>لأي استفسار: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 underline">{SUPPORT_EMAIL}</a></p>
          </section>
        </div>
        <div className="mt-8 border-t border-stone-200 pt-6 text-center">
          <Link to="/" className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700">→ العودة للصفحة الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
