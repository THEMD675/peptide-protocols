import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const INSTALL_KEY = 'pptides_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(INSTALL_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(INSTALL_KEY, 'true'); } catch { /* expected */ }
  };

  return (
    <div className="fixed top-20 start-4 end-4 z-40 mx-auto max-w-md animate-slide-up md:start-auto md:end-6 print:hidden">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl shadow-emerald-600/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <Download className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-900">ثبّت pptides على جهازك</p>
          <p className="text-xs text-stone-500">وصول سريع بدون متصفح</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
        >
          تثبيت
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 flex items-center justify-center rounded-full min-h-[36px] min-w-[36px] text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
