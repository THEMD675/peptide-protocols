import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const hasConsent = (() => { try { return localStorage.getItem('pptides_cookie_consent') === 'accepted'; } catch { return false; } })();

if (hasConsent && import.meta.env.PROD) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }).catch(() => {});

  const ga4Id = import.meta.env.VITE_GA4_ID;
  if (ga4Id) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
    script.async = true;
    document.head.appendChild(script);
    (window as unknown as Record<string, unknown[]>).dataLayer = (window as unknown as Record<string, unknown[]>).dataLayer || [];
    function gtag(...args: unknown[]) { (window as unknown as Record<string, unknown[]>).dataLayer.push(args); }
    gtag('js', new Date());
    gtag('config', ga4Id, { send_page_view: true });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA update toast – notify user when a new version is available
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.ready.then(reg => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
          const el = document.createElement('div');
          el.className = 'fixed bottom-4 start-4 end-4 z-50 mx-auto max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl animate-slide-up print:hidden';
          el.dir = 'rtl';
          el.setAttribute('role', 'status');
          el.setAttribute('aria-live', 'polite');
          el.innerHTML = `
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-bold text-stone-900">تم تحديث pptides</p>
              <button onclick="location.reload()" class="shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">تحديث</button>
            </div>
          `;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 15000);
        }
      });
    });
  });
}
