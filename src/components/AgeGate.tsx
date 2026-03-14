import { useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/constants";

const STORAGE_KEY = STORAGE_KEYS.AGE_VERIFIED;
const COOKIE_NAME = 'pptides_age_ok';

function isVerified(): boolean {
  try { if (localStorage.getItem(STORAGE_KEY) === 'true') return true; } catch { /* private mode */ }
  try { if (sessionStorage.getItem(STORAGE_KEY) === 'true') return true; } catch { /* fallback */ }
  if (document.cookie.includes(`${COOKIE_NAME}=1`)) return true;
  return false;
}

function persistVerified(): void {
  try { localStorage.setItem(STORAGE_KEY, 'true'); localStorage.setItem('pptides_visited', '1'); } catch { /* expected */ }
  try { sessionStorage.setItem(STORAGE_KEY, 'true'); } catch { /* fallback */ }
  document.cookie = `${COOKIE_NAME}=1;path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax;Secure`;
}

export default function AgeGate() {
  const [visible, setVisible] = useState(() => !isVerified());
  const [blocked, setBlocked] = useState(false);

  const handleVerified = () => {
    persistVerified();
    setVisible(false);
  };

  const handleUnder = () => {
    setBlocked(true);
  };

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [tabindex], a[href]');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
    >
      <div ref={dialogRef} tabIndex={-1} className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 text-center shadow-2xl animate-slide-up outline-none">
        {blocked ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Shield className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <h2 id="age-gate-title" className="mb-2 text-xl font-bold text-stone-900 dark:text-stone-100">
              غير مسموح
            </h2>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              هذا الموقع مخصص لمن هم فوق 18 عامًا
            </p>
            <a href="https://google.com" rel="noopener noreferrer" target="_blank" className="mt-4 inline-block text-sm text-stone-400 underline">مغادرة الموقع</a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            </div>

            <p className="mb-1 text-lg font-black tracking-tight text-emerald-700 dark:text-emerald-400">pptides</p>
            <h2 id="age-gate-title" className="mb-2 text-xl font-bold text-stone-900 dark:text-stone-100">
              دليل الببتيدات العلاجية
            </h2>

            <p className="mb-6 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              منصة تعليمية متخصصة في بروتوكولات الببتيدات — تشمل جرعات، تحاليل مخبرية، ومدرب ذكي. بالمتابعة، تؤكد أن عمرك 18 عامًا أو أكثر.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleVerified}
                className="w-full rounded-full bg-emerald-600 px-8 py-3.5 min-h-[44px] text-base font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                أؤكد — عمري 18 أو أكثر
              </button>

              <button
                onClick={handleUnder}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 px-6 py-3 min-h-[44px] text-sm font-medium text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                عمري أقل من 18
              </button>
            </div>

            <p className="mt-4 text-xs text-stone-500 dark:text-stone-300">
              هذا المحتوى لأغراض تعليمية فقط ولا يُعدّ نصيحة طبية
            </p>
          </>
        )}
      </div>
    </div>
  );
}
