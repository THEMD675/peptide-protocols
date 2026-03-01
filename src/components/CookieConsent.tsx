import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'pptides_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    try {
      if (localStorage.getItem('pptides_age_verified') !== 'true') return false;
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch { /* expected */ }
    setVisible(false);
  };

  const reject = () => {
    try { localStorage.setItem(STORAGE_KEY, 'rejected'); } catch { /* expected */ }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { localStorage.setItem(STORAGE_KEY, 'rejected'); } catch { /* expected */ }
        setVisible(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <div role="alertdialog" aria-label="ملفات تعريف الارتباط" className="fixed bottom-0 inset-x-0 z-[45] border-t border-stone-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-2 sm:px-6 sm:py-3 md:p-5 animate-slide-up pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-5xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm text-stone-700 leading-relaxed">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك.{' '}
          <Link to="/privacy" className="text-emerald-600 underline underline-offset-2 transition-colors hover:text-emerald-700">سياسة الخصوصية</Link>
        </p>
        <p className="text-xs text-stone-500 mt-1">نستخدم Google Analytics لتحسين تجربتك فقط — لا نبيع بياناتك</p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={reject}
            className="px-3 py-2 min-h-[44px] text-sm text-stone-500 underline underline-offset-2 transition-colors hover:text-stone-700"
          >
            رفض
          </button>
          <button
            onClick={accept}
            className="shrink-0 rounded-full bg-emerald-600 px-6 py-2 min-h-[44px] text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
          >
            موافق
          </button>
        </div>
      </div>
    </div>
  );
}
