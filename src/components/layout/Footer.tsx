import { Link } from 'react-router-dom';
import { Lock, Shield, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-stone-900">
              <span>pp</span><span className="text-emerald-600">tides</span>
            </p>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              أشمل دليل عربي للببتيدات العلاجية. 41+ ببتيد مع بروتوكولات كاملة.
            </p>
            <a href="mailto:contact@pptides.com" className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700">
              <Mail className="h-3.5 w-3.5" /> contact@pptides.com
            </a>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">المنتج</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/library" className="text-stone-600 hover:text-emerald-600">المكتبة</Link>
              <Link to="/calculator" className="text-stone-600 hover:text-emerald-600">حاسبة الجرعات</Link>
              <Link to="/table" className="text-stone-600 hover:text-emerald-600">جدول الببتيدات</Link>
              <Link to="/coach" className="text-stone-600 hover:text-emerald-600">المدرب الذكي</Link>
              <Link to="/pricing" className="text-stone-600 hover:text-emerald-600">الأسعار</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">الموارد</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/stacks" className="text-stone-600 hover:text-emerald-600">البروتوكولات المُجمَّعة</Link>
              <Link to="/lab-guide" className="text-stone-600 hover:text-emerald-600">دليل التحاليل</Link>
              <Link to="/guide" className="text-stone-600 hover:text-emerald-600">دليل الحقن</Link>
              <Link to="/glossary" className="text-stone-600 hover:text-emerald-600">المصطلحات</Link>
              <Link to="/interactions" className="text-stone-600 hover:text-emerald-600">فحص التعارضات</Link>
              <Link to="/sources" className="text-stone-600 hover:text-emerald-600">المصادر</Link>
              <Link to="/community" className="text-stone-600 hover:text-emerald-600">التجارب</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">قانوني</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/privacy" className="text-stone-600 hover:text-emerald-600">سياسة الخصوصية</Link>
              <Link to="/terms" className="text-stone-600 hover:text-emerald-600">شروط الاستخدام</Link>
            </nav>
            <div className="mt-4 flex flex-col gap-2 text-xs text-stone-500">
              <p className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> دفع آمن عبر Stripe</p>
              <p className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> ضمان استرداد 3 أيام</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-200 pt-6 text-center">
          <p className="text-xs text-stone-500">
            pp<span className="text-emerald-600">tides</span> — جميع الحقوق محفوظة © {new Date().getFullYear()}
          </p>
          <p className="mt-2 text-xs text-stone-400 leading-relaxed">
            هذا المحتوى تعليمي ولا يُعدّ بديلًا عن الاستشارة الطبية. استشر طبيبك قبل استخدام أي ببتيد.
          </p>
        </div>
      </div>
    </footer>
  );
}
