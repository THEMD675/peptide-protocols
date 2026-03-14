import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { toast } from 'sonner';
import { migrateQuizStorage } from '@/lib/quiz-migration';
import { hasOptionalConsent } from '@/lib/cookie-utils';
import { logError } from '@/lib/logger';

// Migrate old quiz/onboarding localStorage keys to unified key
migrateQuizStorage();

const hasConsent = hasOptionalConsent();

// Web Vitals — gated behind consent
if (hasConsent && import.meta.env.PROD) {
  import('@/lib/web-vitals').then(({ initWebVitals }) => initWebVitals()).catch(e => logError('web-vitals init failed:', e));
}

if (import.meta.env.PROD) {
  const w = window as unknown as Record<string, unknown[]>;
  w.dataLayer = w.dataLayer || [];
  function gtag(...a: unknown[]) { w.dataLayer!.push(a); }
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: hasConsent ? 'granted' : 'denied',
  });
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

// Global error tracking — capture unhandled errors and rejections
window.addEventListener('error', (e) => {
  logError('Uncaught error:', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  logError('Unhandled rejection:', e.reason);
});

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
          toast('يتوفر إصدار جديد', {
            duration: 30000,
            action: {
              label: 'تحديث',
              onClick: () => {
                newSW.postMessage({ type: 'SKIP_WAITING' });
                navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
              },
            },
          });
        }
      });
    });
  }).catch(e => logError('SW registration failed:', e));
}
