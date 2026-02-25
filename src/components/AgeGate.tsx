import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "age_verified";

export default function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "true") {
      setVisible(true);
    }
  }, []);

  const handleVerified = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const handleUnder = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <AnimatePresence>
      {visible && (
        <div
          dir="rtl"
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center",
            "bg-stone-900/95 p-4"
          )}
        >
          <div
            className={cn(
              "w-full max-w-md rounded-2xl border-2",
              "bg-stone-900 p-8 text-center shadow-2xl"
            )}
            style={{ borderColor: '#10b981', boxShadow: `0 25px 50px -12px rgba(16, 185, 129, 0.1)` }}
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'rgba(16, 185, 129, 0.1)' }}
            >
              <Shield className="h-10 w-10"  />
            </div>

            <h2 className="mb-4 text-2xl font-bold text-white">
              التحقق من العمر
            </h2>

            <p className="mb-8 leading-relaxed text-gray-300">
              هذا الموقع يحتوي على محتوى تعليمي وبحثي مخصص للبالغين. يجب أن
              يكون عمرك 21 عامًا أو أكثر للمتابعة.
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
                عمري 21 أو أكثر — متابعة
              </button>

              <button
                onClick={handleUnder}
                className={cn(
                  "w-full rounded-xl border-2 px-6 py-3",
                  "text-lg font-bold",
                  "transition-all duration-200 active:scale-[0.98]"
                )}
                style={{
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  color: 'var(--gold)',
                }}
              >
                عمري أقل من 21 — خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
