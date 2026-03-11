import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN || !import.meta.env.PROD) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Only send errors, not transactions (free tier friendly)
    tracesSampleRate: 0,
    // Sample 100% of errors
    sampleRate: 1.0,
    // Don't send PII
    sendDefaultPii: false,
    // Ignore common non-actionable errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Safari
      /safari-web-extension/i,
      // Network errors (user's connection, not our fault)
      'Failed to fetch',
      'NetworkError',
      'Network request failed',
      'Load failed',
      // Chunk loading (already handled by ErrorBoundary with auto-reload)
      'Loading chunk',
      'Failed to fetch dynamically imported',
      // ResizeObserver (benign)
      'ResizeObserver loop',
      // Service worker
      'The service worker navigation preload request failed',
    ],
    beforeSend(event) {
      // Strip any potential PII from URLs
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          // Remove query params that might contain tokens
          url.searchParams.delete('session_id');
          url.searchParams.delete('token');
          event.request.url = url.toString();
        } catch { /* invalid URL, leave as-is */ }
      }
      return event;
    },
  });
}

export { Sentry };
