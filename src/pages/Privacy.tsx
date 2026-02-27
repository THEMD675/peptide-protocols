import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from '@/lib/constants';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>سياسة الخصوصية | pptides</title>
        <meta name="description" content="سياسة الخصوصية لموقع pptides.com — كيف نحمي بياناتك الشخصية." />
      </Helmet>
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-8 md:pt-12">
        <h1 className="mb-8 text-3xl font-bold text-stone-900 md:text-4xl">سياسة الخصوصية</h1>
        <p className="mb-4 text-sm text-stone-500">آخر تحديث: {LEGAL_LAST_UPDATED}</p>

        <div className="space-y-8 text-stone-800 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">1. المعلومات التي نجمعها</h2>
            <ul className="list-disc space-y-2 pr-6">
              <li>البريد الإلكتروني وكلمة المرور عند إنشاء الحساب</li>
              <li>بيانات الاشتراك والدفع (تُعالج عبر Stripe — لا نخزّن بيانات البطاقة)</li>
              <li>البريد الإلكتروني عند الاشتراك في القائمة البريدية</li>
              <li>بيانات الاستخدام (الصفحات المزارة، الوقت في الموقع)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">2. كيف نستخدم بياناتك</h2>
            <ul className="list-disc space-y-2 pr-6">
              <li>إدارة حسابك واشتراكك</li>
              <li>إرسال تحديثات المحتوى والعروض (يمكنك إلغاء الاشتراك في أي وقت)</li>
              <li>تحسين خدماتنا وتجربة المستخدم</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">3. أمان البيانات</h2>
            <p>نستخدم تشفير SSL/TLS لحماية اتصالاتك. بيانات الدفع تُعالج حصريًا عبر Stripe ولا تمر عبر خوادمنا. نستخدم Supabase كقاعدة بيانات مع سياسات أمان على مستوى الصفوف (RLS).</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">4. حقوقك</h2>
            <ul className="list-disc space-y-2 pr-6">
              <li>حذف حسابك وجميع بياناتك في أي وقت</li>
              <li>إلغاء الاشتراك البريدي</li>
              <li>طلب نسخة من بياناتك</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">5. التواصل</h2>
            <p>لأي استفسار حول الخصوصية: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 underline">{SUPPORT_EMAIL}</a></p>
          </section>
        </div>
        <div className="mt-8 border-t border-stone-200 pt-6 text-center">
          <Link to="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">← العودة للصفحة الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
