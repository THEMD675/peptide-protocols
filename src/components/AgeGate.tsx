import { useState, useEffect } from "react";
import { Shield } from "lucide-react";

const STORAGE_KEY = "pptides_age_verified";

export default function AgeGate() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const handleVerified = () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); localStorage.setItem('pptides_visited', '1'); } catch { /* expected */ }
    setVisible(false);
  };

  const handleUnder = () => {
    window.location.href = "https://www.google.com";
  };

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 sm:p-8 text-center shadow-2xl animate-slide-up">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Shield className="h-6 w-6 text-emerald-600" aria-hidden="true" />
        </div>

        <h2 id="age-gate-title" className="mb-2 text-xl font-bold text-stone-900">
          محتوى تعليمي للبالغين
        </h2>

        <p className="mb-6 text-sm leading-relaxed text-stone-600">
          pptides يحتوي على معلومات بحثية عن الببتيدات العلاجية. بالمتابعة، تؤكد أن عمرك 18 عامًا أو أكثر.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleVerified}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            أؤكد — عمري 18 أو أكثر
          </button>

          <button
            onClick={handleUnder}
            className="w-full rounded-xl border border-stone-200 px-6 py-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50"
          >
            عمري أقل من 18
          </button>
        </div>

        <p className="mt-4 text-xs text-stone-500">
          هذا المحتوى لأغراض تعليمية فقط ولا يُعدّ نصيحة طبية
        </p>
      </div>
    </div>
  );
}
