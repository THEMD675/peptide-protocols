import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>شروط الاستخدام — pptides</title>
        <meta name="description" content="شروط الاستخدام لموقع pptides.com — الاشتراكات، الاسترداد، وحدود المسؤولية." />
      </Helmet>
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-8 md:pt-12">
        <h1 className="mb-8 text-2xl font-bold text-stone-900 sm:text-3xl">شروط الاستخدام</h1>
        <p className="mb-4 text-sm text-stone-500">آخر تحديث: 25 فبراير 2026</p>

        <div className="space-y-8 text-stone-800 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">1. طبيعة المحتوى</h2>
            <p>جميع المعلومات المقدّمة في pptides.com لأغراض تعليمية وبحثية فقط ولا تُعدّ بديلًا عن الاستشارة الطبية المتخصصة. لا نقدّم نصائح طبية ولا نتحمّل مسؤولية أي قرارات تُتخذ بناءً على المحتوى.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">2. الاشتراكات والدفع</h2>
            <ul className="list-disc space-y-2 pr-6">
              <li>خطة Essentials: $9 شهريًا</li>
              <li>خطة Elite: $99 شهريًا</li>
              <li>تجربة مجانية: 3 أيام على جميع الخطط</li>
              <li>الاشتراكات تتجدد تلقائيًا ما لم يُلغَ قبل تاريخ التجديد</li>
              <li>يتم الدفع عبر Stripe بشكل آمن ومشفّر</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">3. سياسة الاسترداد</h2>
            <p>نقدّم ضمان استرداد كامل خلال 3 أيام من تاريخ الاشتراك. إذا لم تكن راضيًا، تواصل معنا عبر <a href="mailto:contact@pptides.com" className="text-emerald-600 underline">contact@pptides.com</a> واسترد أموالك بالكامل. بعد مرور 3 أيام، لا يمكن استرداد المبالغ المدفوعة.</p>
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
            <h2 className="mb-3 text-xl font-bold text-stone-900">6. التعديلات</h2>
            <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنُخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">7. التواصل</h2>
            <p>لأي استفسار: <a href="mailto:contact@pptides.com" className="text-emerald-600 underline">contact@pptides.com</a></p>
          </section>
        </div>
        <div className="mt-8 border-t border-stone-200 pt-6 text-center">
          <Link to="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">← العودة للصفحة الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
