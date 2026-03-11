import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { COOKIE_CONSENT_STORAGE_KEY, type CookiePreferences } from '@/lib/cookie-utils';
import { STORAGE_KEYS } from '@/lib/constants';

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.AGE_VERIFIED) !== 'true') return false;
      return !localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const [optionalChecked, setOptionalChecked] = useState(true);

  const save = (prefs: CookiePreferences) => {
    try { localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(prefs)); } catch { /* expected */ }
    setVisible(false);
    if (prefs.optional) {
      window.location.reload();
    }
  };

  const acceptAll = () => save({ essential: true, optional: true });
  const savePreferences = () => save({ essential: true, optional: optionalChecked });
  const rejectOptional = useCallback(() => save({ essential: true, optional: false }), []);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') rejectOptional();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, rejectOptional]);

  if (!visible) return null;

  return (
    <div role="alertdialog" aria-label="ملفات تعريف الارتباط" className="fixed bottom-14 md:bottom-0 inset-x-0 z-[45] border-t border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-6 sm:py-4 md:p-5 animate-slide-up pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">ملفات تعريف الارتباط</p>

        <div className="space-y-2 mb-3">
          <label className="flex items-center gap-3 rounded-lg bg-stone-50 dark:bg-stone-900 px-3 py-2">
            <input type="checkbox" checked disabled className="h-4 w-4 accent-emerald-600 rounded" />
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">أساسية</span>
              <span className="text-xs text-stone-500 dark:text-stone-300 block">تسجيل الدخول والجلسة — مطلوبة لعمل الموقع</span>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-stone-50 dark:bg-stone-900 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={optionalChecked}
              onChange={e => setOptionalChecked(e.target.checked)}
              className="h-4 w-4 accent-emerald-600 rounded"
            />
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">اختيارية</span>
              <span className="text-xs text-stone-500 dark:text-stone-300 block">Google Analytics — لتحسين الأداء</span>
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500 dark:text-stone-300">
            <Link to="/privacy" className="text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-700 dark:text-emerald-400">سياسة الخصوصية</Link>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={rejectOptional}
              className="px-3 py-2 min-h-[44px] text-sm text-stone-500 dark:text-stone-300 underline underline-offset-2 transition-colors hover:text-stone-700 dark:text-stone-200"
            >
              رفض الاختيارية
            </button>
            <button
              onClick={savePreferences}
              className="shrink-0 rounded-full border border-emerald-600 px-5 py-2 min-h-[44px] text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50 dark:bg-emerald-900/20 btn-press"
            >
              حفظ التفضيلات
            </button>
            <button
              onClick={acceptAll}
              className="shrink-0 rounded-full bg-emerald-600 px-6 py-2 min-h-[44px] text-sm font-bold text-white transition-all hover:bg-emerald-700 btn-press"
            >
              قبول الكل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
