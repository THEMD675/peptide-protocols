import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Shield, Mail } from 'lucide-react';
import { PEPTIDE_COUNT, SUPPORT_EMAIL, TRIAL_DAYS } from '@/lib/constants';

export default memo(function Footer() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-stone-900 dark:text-stone-100" dir="ltr" aria-label="pptides">
              <span aria-hidden="true">pp</span><span className="text-emerald-600" aria-hidden="true">tides</span>
            </p>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              أشمل دليل عربي للببتيدات العلاجية. {PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400">
              <Mail className="h-3.5 w-3.5 shrink-0" /> {SUPPORT_EMAIL}
            </a>
            <div className="mt-3 flex gap-3">
              <a href="https://x.com/pptides" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-emerald-600" aria-label="X/Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-emerald-600" aria-label="البريد الإلكتروني">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">المنتج</h4>
            <nav aria-label="المنتج" className="flex flex-col gap-0.5 text-sm">
              <Link to="/library" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">المكتبة</Link>
              <Link to="/calculator" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">حاسبة الجرعات</Link>
              <Link to="/table" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">جدول الببتيدات</Link>
              <Link to="/compare" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">مقارنة الببتيدات</Link>
              <Link to="/coach" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">المدرب الذكي</Link>
              <Link to="/pricing" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">الأسعار</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">الموارد</h4>
            <nav aria-label="الموارد" className="flex flex-col gap-0.5 text-sm">
              <Link to="/stacks" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">البروتوكولات المُجمَّعة</Link>
              <Link to="/lab-guide" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">دليل التحاليل</Link>
              <Link to="/guide" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">دليل الحقن</Link>
              <Link to="/glossary" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">المصطلحات</Link>
              <Link to="/interactions" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">فحص التعارضات</Link>
              <Link to="/sources" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">المصادر</Link>
              <Link to="/community" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">التجارب والتقييمات</Link>
              <Link to="/blog" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">المدونة</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">قانوني</h4>
            <nav aria-label="قانوني" className="flex flex-col gap-0.5 text-sm">
              <Link to="/about" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">عن pptides</Link>
              <Link to="/faq" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">الأسئلة الشائعة</Link>
              <Link to="/contact" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">تواصل معنا</Link>
              <Link to="/privacy" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">سياسة الخصوصية</Link>
              <Link to="/terms" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">شروط الاستخدام</Link>
              <Link to="/transparency" className="min-h-[44px] flex items-center text-stone-600 dark:text-stone-400 transition-colors hover:text-emerald-600 active:text-emerald-700 dark:active:text-emerald-300">كيف نكسب المال</Link>
              <button onClick={() => { try { localStorage.removeItem('pptides_cookie_consent'); } catch { /* storage unavailable */ } window.location.reload(); }} className="min-h-[44px] flex items-center text-start text-sm text-stone-600 dark:text-stone-400 hover:text-emerald-600 transition-colors">
                إدارة ملفات تعريف الارتباط
              </button>
            </nav>
            <div className="mt-4 flex flex-col gap-2 text-sm text-stone-600 dark:text-stone-400">
              <p className="flex items-center gap-1.5"><Lock className="h-3 w-3 shrink-0" /> دفع آمن عبر Stripe</p>
              <p className="flex items-center gap-1.5"><Shield className="h-3 w-3 shrink-0" /> ضمان استرداد {TRIAL_DAYS} أيام</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-200 dark:border-stone-700 pt-6 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            <span dir="ltr" className="inline" aria-label="pptides"><span aria-hidden="true">pp</span><span className="text-emerald-600" aria-hidden="true">tides</span></span> — جميع الحقوق محفوظة © {new Date().getFullYear()}
          </p>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            هذا المحتوى تعليمي ولا يُعدّ بديلًا عن الاستشارة الطبية. استشر طبيبك قبل استخدام أي ببتيد.
          </p>
        </div>
      </div>
    </footer>
  );
});
