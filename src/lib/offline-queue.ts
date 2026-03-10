/**
 * Queue an injection log for background sync when offline.
 * Falls back to localStorage if service worker isn't available.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function isOnline(): boolean {
  return navigator.onLine;
}

export async function queueInjectionForSync(
  payload: Record<string, unknown>,
  accessToken: string,
): Promise<boolean> {
  const enriched = {
    ...payload,
    _supabase_url: SUPABASE_URL,
    _anon_key: SUPABASE_ANON_KEY,
    _access_token: accessToken,
  };

  // Try service worker message first
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'QUEUE_INJECTION',
      payload: enriched,
    });
    return true;
  }

  // Fallback: localStorage
  try {
    const key = 'pptides_pending_injections';
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]');
    existing.push({ ...enriched, _queued_at: Date.now() });
    localStorage.setItem(key, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
}

/**
 * Notify the service worker that we're back online
 */
export function notifyOnline(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'ONLINE' });
  }
}

/**
 * Listen for sync completion messages from the service worker
 */
export function onSyncComplete(callback: (synced: number, failed: number) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'INJECTION_SYNC_COMPLETE') {
      callback(event.data.synced, event.data.failed);
    }
  };
  navigator.serviceWorker?.addEventListener('message', handler);
  return () => navigator.serviceWorker?.removeEventListener('message', handler);
}

// Auto-notify SW when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', notifyOnline);
}
