import { useState, useEffect } from "react";
import FocusTrap from 'focus-trap-react';
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pptides_age_verified";

export default function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleVerified = () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setVisible(false);
  };

  const [rejected, setRejected] = useState(false);

  const handleUnder = () => {
    setRejected(true);
  };

  if (!visible) return null;

  return (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in",
            "bg-stone-900/95 p-4"
          )}
        >
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border-2 border-emerald-500",
              "bg-stone-900 p-8 text-center shadow-2xl shadow-emerald-500/10"
            )}
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
            >
              <Shield className="h-10 w-10"  />
            </div>

            <h2 className="mb-4 text-2xl font-bold text-white">
              التحقق من العمر
            </h2>

            {rejected ? (
              <p className="mb-8 leading-relaxed text-red-400 font-semibold">
                عذرًا، هذا المحتوى مخصص لمن هم 18 عامًا أو أكثر
              </p>
            ) : (
              <>
                <p className="mb-8 leading-relaxed text-gray-300">
                  هذا الموقع يحتوي على محتوى تعليمي وبحثي مخصص للبالغين. يجب أن
                  يكون عمرك 18 عامًا أو أكثر للمتابعة.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleVerified}
                    className={cn(
                      "gold-gradient w-full rounded-xl px-6 py-3 text-lg font-bold text-white",
                      "transition-all duration-200 hover:brightness-110 hover:shadow-lg",
                      "active:scale-[0.98]"
                    )}
                  >
                    عمري 18 أو أكثر — متابعة
                  </button>

                  <button
                    onClick={handleUnder}
                    className={cn(
                      "w-full rounded-xl border-2 border-emerald-500/40 px-6 py-3",
                      "text-lg font-bold text-amber-400",
                      "transition-all duration-200 active:scale-[0.98]"
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
