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
