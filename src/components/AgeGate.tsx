import { useState, useEffect } from "react";
import FocusTrap from 'focus-trap-react';
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

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
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* expected */ }
    setVisible(false);
  };

  const [confirmed, setConfirmed] = useState(false);

  const [rejected, setRejected] = useState(() => {
    try { return sessionStorage.getItem('pptides_age_rejected') === 'true'; } catch { return false; }
  });

  const handleUnder = () => {
    setRejected(true);
    try { sessionStorage.setItem('pptides_age_rejected', 'true'); } catch { /* expected */ }
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in",
            "bg-stone-900/95 p-4"
          )}
        >
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border-2 border-emerald-500",
              "bg-stone-900 p-8 text-center shadow-2xl shadow-emerald-500/10",
              "animate-gate-enter"
            )}
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
            >
              <Shield className="h-10 w-10 text-emerald-400" aria-hidden="true" />
            </div>

            <h2 id="age-gate-title" className="mb-4 text-2xl font-bold text-white">
              التحقق من العمر
            </h2>

            {rejected ? (
              <div className="space-y-4">
                <p className="leading-relaxed text-red-400 font-semibold">
                  عذرًا، هذا المحتوى مخصص لمن هم 18 عامًا أو أكثر
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href="https://www.google.com"
                    className="inline-block rounded-xl border border-stone-600 px-6 py-3 text-sm font-medium text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-300"
                  >
                    مغادرة الموقع
                  </a>
                  <button
                    onClick={() => setRejected(false)}
                    className="min-h-[44px] px-3 py-2 text-sm text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    أخطأت؟ عُد للاختيار
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mb-8 leading-relaxed text-gray-300">
                  هذا الموقع يحتوي على محتوى تعليمي وبحثي مخصص للبالغين. يجب أن
                  يكون عمرك 18 عامًا أو أكثر للمتابعة.
                </p>

                <label className="flex items-center gap-2 mt-4 text-sm text-stone-400 cursor-pointer">
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-emerald-600" />
                  أؤكد أن عمري 18 سنة أو أكثر
                </label>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    onClick={handleVerified}
                    disabled={!confirmed}
                    className={cn(
                      "gold-gradient w-full rounded-xl px-6 py-3 text-lg font-bold text-white",
                      "transition-all duration-200 hover:brightness-110 hover:shadow-lg",
                      "active:scale-[0.98]",
                      !confirmed && "opacity-50 pointer-events-none"
                    )}
                  >
                    عمري 18 أو أكثر — متابعة
                  </button>

                  <button
                    onClick={handleUnder}
                    className={cn(
                      "w-full rounded-xl border-2 border-emerald-500/40 px-6 py-3",
                      "text-lg font-bold text-amber-300",
                      "transition-all duration-200 hover:border-amber-300 active:scale-[0.98]"
                    )}
                  >
                    عمري أقل من 18 — خروج
                  </button>
                </div>
              </>
            )}
          </div>
          </FocusTrap>
        </div>
  );
}
