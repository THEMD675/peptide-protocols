import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

if (localStorage.getItem('pptides_cookie_consent') === 'accepted') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || 'https://379ce8bcb1d6e230dd99ab2a275339b8@o4510688220348416.ingest.us.sentry.io/4510688227950592',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
  });

  const ga4Id = import.meta.env.VITE_GA4_ID;
  if (ga4Id && import.meta.env.PROD) {
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
