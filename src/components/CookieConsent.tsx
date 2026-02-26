import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'pptides_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch {}
    setVisible(false);
  };

  const reject = () => {
    try { localStorage.setItem(STORAGE_KEY, 'rejected'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-4 md:p-5">
      <div className="mx-auto max-w-5xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-700 leading-relaxed">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك.{' '}
          <Link to="/privacy" className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700">سياسة الخصوصية</Link>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={reject}
            className="text-sm text-stone-500 underline underline-offset-2 transition-colors hover:text-stone-700"
          >
            رفض
          </button>
          <button
            onClick={accept}
            className="shrink-0 rounded-full bg-emerald-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
          >
            موافق
          </button>
        </div>
      </div>
    </div>
  );
}
