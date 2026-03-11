import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

const INSTALL_KEY = 'pptides_install_dismissed';
const DISMISS_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
}

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(INSTALL_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_EXPIRY_MS;
  } catch { return false; }
}

function shouldDelayForNewVisitor(): boolean {
  try {
    return !localStorage.getItem('pptides_visited');
  } catch { return false; }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(isDismissed);

  useEffect(() => {
    if (isStandalone()) return; // Already installed
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS doesn't fire beforeinstallprompt — show manual instructions after 60s
    let iosTimer: ReturnType<typeof setTimeout>;
    if (isIOS() && !isStandalone()) {
      iosTimer = setTimeout(() => setShowIOS(true), 60_000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(iosTimer);
    };
  }, []);

  if (dismissed || isStandalone() || shouldDelayForNewVisitor()) return null;
  if (!deferredPrompt && !showIOS) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(INSTALL_KEY, String(Date.now())); } catch { /* expected */ }
  };

  return (
    <div className="fixed top-20 start-4 end-4 z-40 mx-auto max-w-md animate-slide-up md:start-auto md:end-6 print:hidden">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-950 p-4 shadow-xl shadow-emerald-600/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          {showIOS ? <Share className="h-5 w-5 text-emerald-700" /> : <Download className="h-5 w-5 text-emerald-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">ثبّت pptides على جهازك</p>
          <p className="text-xs text-stone-500 dark:text-stone-300">
            {showIOS ? 'اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"' : 'وصول سريع بدون متصفح'}
          </p>
        </div>
        {!showIOS && (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
          >
            تثبيت
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="shrink-0 flex items-center justify-center rounded-full min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:text-stone-300"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
