import { Link } from 'react-router-dom';
import { Lock, Shield, Mail } from 'lucide-react';
import { PEPTIDE_COUNT } from '@/lib/constants';

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
              أشمل دليل عربي للببتيدات العلاجية. {PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة.
            </p>
            <a href="mailto:contact@pptides.com" className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 transition-colors hover:text-emerald-700">
              <Mail className="h-3.5 w-3.5" /> contact@pptides.com
            </a>
            <div className="mt-3 flex gap-3">
              <a href="https://twitter.com/pptides" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-emerald-600 transition-colors" aria-label="X/Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://wa.me/message/pptides" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-emerald-600 transition-colors" aria-label="WhatsApp">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">المنتج</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/library" className="text-stone-600 transition-colors hover:text-emerald-600">المكتبة</Link>
              <Link to="/calculator" className="text-stone-600 transition-colors hover:text-emerald-600">حاسبة الجرعات</Link>
              <Link to="/table" className="text-stone-600 transition-colors hover:text-emerald-600">جدول الببتيدات</Link>
              <Link to="/coach" className="text-stone-600 transition-colors hover:text-emerald-600">المدرب الذكي</Link>
              <Link to="/pricing" className="text-stone-600 transition-colors hover:text-emerald-600">الأسعار</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">الموارد</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/stacks" className="text-stone-600 transition-colors hover:text-emerald-600">البروتوكولات المُجمَّعة</Link>
              <Link to="/lab-guide" className="text-stone-600 transition-colors hover:text-emerald-600">دليل التحاليل</Link>
              <Link to="/guide" className="text-stone-600 transition-colors hover:text-emerald-600">دليل الحقن</Link>
              <Link to="/glossary" className="text-stone-600 transition-colors hover:text-emerald-600">المصطلحات</Link>
              <Link to="/interactions" className="text-stone-600 transition-colors hover:text-emerald-600">فحص التعارضات</Link>
              <Link to="/sources" className="text-stone-600 transition-colors hover:text-emerald-600">المصادر</Link>
              <Link to="/community" className="text-stone-600 transition-colors hover:text-emerald-600">التجارب</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900">قانوني</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/privacy" className="text-stone-600 transition-colors hover:text-emerald-600">سياسة الخصوصية</Link>
              <Link to="/terms" className="text-stone-600 transition-colors hover:text-emerald-600">شروط الاستخدام</Link>
              <button onClick={() => { localStorage.removeItem('pptides_cookie_consent'); window.location.reload(); }} className="text-start text-sm text-stone-500 hover:text-emerald-600 transition-colors">
                إدارة ملفات تعريف الارتباط
              </button>
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
