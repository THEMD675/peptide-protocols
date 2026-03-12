import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Auto-skipWaiting after 30s if user hasn't clicked update toast.
// Prevents stale code from persisting for days with broken queries.
// The 30s delay avoids mid-render white screens.

let skipWaitingTimer: ReturnType<typeof setTimeout> | null = null;

// ═══ Install: precache app shell + offline fallback ═══
self.addEventListener('install', (event) => {
  // Auto-activate after 30 seconds
  skipWaitingTimer = setTimeout(() => self.skipWaiting(), 30_000);

  // Cache the offline page on install
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_PAGE))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    if (skipWaitingTimer) clearTimeout(skipWaitingTimer);
    self.skipWaiting();
  }
  if (event.data?.type === 'QUEUE_INJECTION') {
    event.waitUntil(queueInjection(event.data.payload));
  }
  if (event.data?.type === 'ONLINE') {
    event.waitUntil(syncPendingInjections());
  }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ═══ Offline fallback page ═══
const OFFLINE_PAGE = '/offline.html';
const OFFLINE_CACHE = 'pptides-offline-v2';

// ═══ Runtime caching: Google Fonts ═══
// NOTE: These must live in sw.ts (not vite.config.ts workbox section)
// because injectManifest strategy only injects __WB_MANIFEST; workbox
// plugin-level runtimeCaching is silently ignored with injectManifest.

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// ═══ Navigation fallback: app shell for all non-API routes ═══
// Serve offline.html when a navigation request fails (no network, no precache match)
const navigationRoute = new NavigationRoute(
  async ({ request }) => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await cache.match(OFFLINE_PAGE);
      return (
        offlineResponse ??
        new Response('غير متصل', {
          status: 503,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        })
      );
    }
  },
  {
    // Never intercept API / server-side routes
    denylist: [
      /^\/api\//,
      /^\/rest\//,
      /^\/_vercel\//,
    ],
  }
);
registerRoute(navigationRoute);

// ═══ Background Sync for injection logs ═══
const SYNC_TAG = 'sync-injection-logs';
const PENDING_STORE = 'pptides-pending-injections';

async function queueInjection(payload: Record<string, unknown>) {
  const cache = await caches.open(PENDING_STORE);
  const existing = await cache.match('/pending-injections');
  let pending: Record<string, unknown>[] = [];
  if (existing) {
    try { pending = await existing.json(); } catch { /* ignore */ }
  }
  pending.push({ ...payload, _queued_at: Date.now() });
  await cache.put('/pending-injections', new Response(JSON.stringify(pending), {
    headers: { 'Content-Type': 'application/json' },
  }));

  // Register for background sync if available
  if ('sync' in self.registration) {
    try {
      await (self.registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(SYNC_TAG);
    } catch { /* sync registration failed, will retry on next online */ }
  }
}

// Background sync handler
self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  if (syncEvent.tag === SYNC_TAG) {
    syncEvent.waitUntil(syncPendingInjections());
  }
});

async function syncPendingInjections() {
  const cache = await caches.open(PENDING_STORE);
  const existing = await cache.match('/pending-injections');
  if (!existing) return;

  let pending: Record<string, unknown>[] = [];
  try { pending = await existing.json(); } catch { return; }
  if (pending.length === 0) return;

  const failed: Record<string, unknown>[] = [];

  for (const item of pending) {
    try {
      const { _queued_at, ...payload } = item;
      void _queued_at;
      const response = await fetch(`${(item as { _supabase_url?: string })._supabase_url ?? ''}/rest/v1/injection_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': (item as { _anon_key?: string })._anon_key ?? '',
          'Authorization': `Bearer ${(item as { _access_token?: string })._access_token ?? ''}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        failed.push(item);
      }
    } catch {
      failed.push(item);
    }
  }

  if (failed.length > 0) {
    await cache.put('/pending-injections', new Response(JSON.stringify(failed), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } else {
    await cache.delete('/pending-injections');
  }

  // Notify the client about sync results
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'INJECTION_SYNC_COMPLETE',
      synced: pending.length - failed.length,
      failed: failed.length,
    });
  }
}

// ═══ Push notifications ═══
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'pptides', body: 'وقت جرعتك!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';
  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) { client.focus(); return (client as WindowClient).navigate(url); }
      }
      return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(url);
    })
  );
});
