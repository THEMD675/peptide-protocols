import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// ── Precache only the injected manifest (VitePWA controls what goes in) ──
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Prompt-based updates: don't force-activate, let the app control it ──
// skipWaiting + clients.claim removed to prevent mid-session navigation breaks

// ── Runtime caching strategies ──

// Google Fonts stylesheets: StaleWhileRevalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// Font files: CacheFirst (fonts rarely change)
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.gstatic.com' ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff'),
  new CacheFirst({
    cacheName: 'font-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Images: CacheFirst with expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Offline fallback for navigation requests
const navigationHandler = new NetworkFirst({
  cacheName: 'pages-cache',
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});

const navigationRoute = new NavigationRoute(navigationHandler);

// Wrap to add offline fallback
const originalHandler = navigationRoute.handler;
navigationRoute.handler = async (params) => {
  try {
    return await originalHandler.handle(params);
  } catch {
    const cache = await caches.open('offline-fallback');
    const fallback = await cache.match('/offline.html');
    return fallback || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } });
  }
};

registerRoute(navigationRoute);

// Pre-cache offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-fallback').then((cache) => cache.add('/offline.html'))
  );
});
