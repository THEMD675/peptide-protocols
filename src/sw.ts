import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// ── Precache only the injected manifest (VitePWA controls what goes in) ──
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Prompt-based updates: don't force-activate, let the app control it ──
// skipWaiting + clients.claim removed to prevent mid-session navigation breaks

// ── Runtime caching strategies ──
// Google Fonts routes removed — fonts are self-hosted in /f/

// Font files: CacheFirst (fonts rarely change)
registerRoute(
  ({ url }) =>
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

// ═══ Navigation fallback: app shell for all non-API routes ═══
const OFFLINE_CACHE = 'offline-fallback';
const OFFLINE_PAGE = '/offline.html';

// Navigation: ALWAYS hit the network for HTML pages.
// Never serve cached HTML — stale HTML references chunk hashes that no longer
// exist on the server, causing white screens. Offline fallback is the only exception.
const navigationRoute = new NavigationRoute(
  async ({ request }) => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      return response;
    } catch {
      const cache = await caches.open(OFFLINE_CACHE);
      const fallback = await cache.match(OFFLINE_PAGE);
      return fallback || new Response('غير متصل', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    }
  },
  {
    denylist: [
      /^\/api\//,
      /^\/rest\//,
      /^\/_vercel\//,
    ],
  }
);

registerRoute(navigationRoute);

// ── Offline injection queue via IndexedDB ──
const IDB_NAME = 'pptides-offline';
const IDB_STORE = 'injection-queue';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueInjection(payload: Record<string, unknown>) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).add({ payload, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replayQueue() {
  const db = await openIDB();
  const items: { id: number; payload: Record<string, unknown> }[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!items.length) return;
  for (const item of items) {
    try {
      const supabaseUrl = (self as unknown as Record<string, string>).__SUPABASE_URL;
      const supabaseKey = (self as unknown as Record<string, string>).__SUPABASE_KEY;
      const userToken = (self as unknown as Record<string, string>).__USER_TOKEN;
      if (!supabaseUrl || !supabaseKey || !userToken) break;
      const res = await fetch(`${supabaseUrl}/rest/v1/injection_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${userToken}`, Prefer: 'return=minimal' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        const delDb = await openIDB();
        const delTx = delDb.transaction(IDB_STORE, 'readwrite');
        delTx.objectStore(IDB_STORE).delete(item.id);
      }
    } catch { break; }
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'QUEUE_INJECTION' && event.data.payload) {
    event.waitUntil(enqueueInjection(event.data.payload));
  }
  if (event.data?.type === 'ONLINE') {
    event.waitUntil(replayQueue());
  }
  if (event.data?.type === 'SET_SUPABASE_CONFIG') {
    (self as unknown as Record<string, string>).__SUPABASE_URL = event.data.url;
    (self as unknown as Record<string, string>).__SUPABASE_KEY = event.data.key;
  }
  if (event.data?.type === 'SET_USER_TOKEN') {
    (self as unknown as Record<string, string>).__USER_TOKEN = event.data.token;
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_PAGE))
  );
});

// Take control of all clients immediately — ensures new code runs without requiring page refresh
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old navigation cache to prevent serving stale HTML with wrong chunk hashes
      caches.delete('pages-cache'),
    ])
  );
});
