import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Do NOT call skipWaiting() or clientsClaim() automatically.
// The new SW waits until the user clicks "Update" in the toast,
// which sends a SKIP_WAITING message. This prevents mid-session
// asset swap that causes white screens.

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ═══ Offline fallback page ═══
const OFFLINE_PAGE = '/offline.html';
const OFFLINE_CACHE = 'pptides-offline-v1';

// Cache the offline page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_PAGE))
  );
});

// Serve offline fallback for navigation requests that fail
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await cache.match(OFFLINE_PAGE);
      return offlineResponse ?? new Response('غير متصل', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    })
  );
});

// ═══ Background Sync for injection logs ═══
const SYNC_TAG = 'sync-injection-logs';
const PENDING_STORE = 'pptides-pending-injections';

// Queue injection logs when offline
self.addEventListener('message', (event) => {
  if (event.data?.type === 'QUEUE_INJECTION') {
    event.waitUntil(queueInjection(event.data.payload));
  }
});

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

// Also attempt sync when coming back online
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ONLINE') {
    event.waitUntil(syncPendingInjections());
  }
});

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
