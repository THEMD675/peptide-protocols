import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { migrateQuizStorage } from '@/lib/quiz-migration';
import { hasOptionalConsent } from '@/lib/cookie-utils';

// Defer Sentry init to after first paint (reduces main thread blocking)
if (import.meta.env.PROD) {
  const initSentryDeferred = () => import('@/lib/sentry').then(({ initSentry }) => initSentry());
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initSentryDeferred);
  } else {
    setTimeout(initSentryDeferred, 2000);
  }
}

// Migrate old quiz/onboarding localStorage keys to unified key
migrateQuizStorage();

const hasConsent = hasOptionalConsent();

// Web Vitals — always track (no PII, pure performance metrics)
if (import.meta.env.PROD) {
  import('@/lib/web-vitals').then(({ initWebVitals }) => initWebVitals()).catch(() => {});
}

if (hasConsent && import.meta.env.PROD) {
  const ga4Id = import.meta.env.VITE_GA4_ID;
  if (ga4Id) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
    script.async = true;
    document.head.appendChild(script);
    const w = window as unknown as Record<string, unknown[]>;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(['js', new Date()]);
    w.dataLayer.push(['config', ga4Id, { send_page_view: true }]);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA update toast – notify user when a new version is available.
// The new SW waits in "installed" state until the user clicks "Update",
// which sends SKIP_WAITING to activate it, then reloads. This prevents
// mid-session asset swap that causes white screens.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.ready.then(reg => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          const el = document.createElement('div');
          el.className = 'fixed bottom-4 start-4 end-4 z-50 mx-auto max-w-sm rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 shadow-xl dark:shadow-stone-900/40 animate-slide-up print:hidden';
          el.dir = 'rtl';
          el.setAttribute('role', 'status');
          el.setAttribute('aria-live', 'polite');
          el.innerHTML = `
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-bold text-stone-900 dark:text-stone-100">تحديث جديد متاح</p>
              <button id="pwa-update-btn" class="shrink-0 rounded-full bg-emerald-600 px-4 py-2.5 min-h-[44px] text-sm font-bold text-white hover:bg-emerald-700">تحديث</button>
            </div>
          `;
          document.body.appendChild(el);
          document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
            newSW.postMessage({ type: 'SKIP_WAITING' });
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
          });
          setTimeout(() => el.remove(), 30000);
        }
      });
    });
  }).catch(() => {});
}
