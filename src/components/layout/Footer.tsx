import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Shield, Mail } from 'lucide-react';
import { PEPTIDE_COUNT, SUPPORT_EMAIL } from '@/lib/constants';

export default memo(function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-stone-900">
              <span>pp</span><span className="text-emerald-600">tides</span>
            </p>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              أشمل دليل عربي للببتيدات العلاجية. {PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 transition-colors hover:text-emerald-700">
              <Mail className="h-3.5 w-3.5 shrink-0" /> {SUPPORT_EMAIL}
            </a>
            <div className="mt-3 flex gap-3">
              <a href="https://x.com/pptides" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-emerald-600 transition-colors" aria-label="X/Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-stone-400 hover:text-emerald-600 transition-colors" aria-label="البريد الإلكتروني">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">المنتج</h4>
            <nav aria-label="المنتج" className="flex flex-col gap-2 text-sm">
              <Link to="/library" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">المكتبة</Link>
              <Link to="/calculator" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">حاسبة الجرعات</Link>
              <Link to="/table" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">جدول الببتيدات</Link>
              <Link to="/coach" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">المدرب الذكي</Link>
              <Link to="/pricing" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">الأسعار</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">الموارد</h4>
            <nav aria-label="الموارد" className="flex flex-col gap-2 text-sm">
              <Link to="/stacks" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">البروتوكولات المُجمَّعة</Link>
              <Link to="/lab-guide" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">دليل التحاليل</Link>
              <Link to="/guide" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">دليل الحقن</Link>
              <Link to="/glossary" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">المصطلحات</Link>
              <Link to="/interactions" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">فحص التعارضات</Link>
              <Link to="/sources" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">المصادر</Link>
              <Link to="/community" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">التجارب</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">قانوني</h4>
            <nav aria-label="قانوني" className="flex flex-col gap-2 text-sm">
              <Link to="/privacy" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">سياسة الخصوصية</Link>
              <Link to="/terms" className="text-stone-600 transition-colors hover:text-emerald-600 active:text-emerald-700">شروط الاستخدام</Link>
              <button onClick={() => { localStorage.removeItem('pptides_cookie_consent'); window.location.reload(); }} className="text-start text-sm text-stone-600 hover:text-emerald-600 transition-colors">
                إدارة ملفات تعريف الارتباط
              </button>
            </nav>
            <div className="mt-4 flex flex-col gap-2 text-sm text-stone-600">
              <p className="flex items-center gap-1.5"><Lock className="h-3 w-3 shrink-0" /> دفع آمن عبر Stripe</p>
              <p className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> ضمان استرداد 3 أيام</p>
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
});
