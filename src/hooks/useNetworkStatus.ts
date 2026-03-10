import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

/* ─── Online / Offline reactive hook ─── */
function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
function getSnapshot() { return navigator.onLine; }

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

/* ─── localStorage cache helpers ─── */
const CACHE_PREFIX = 'pptides_cache_';

export function cacheData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded — ignore */ }
}

export function getCachedData<T>(key: string, maxAgeMs = 24 * 60 * 60 * 1000): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > maxAgeMs) return null;
    return data;
  } catch { return null; }
}

/* ─── Fetch with cache + offline awareness ─── */
interface UseFetchOptions<T> {
  cacheKey?: string;
  maxCacheAge?: number;
  fallback?: T;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  isCached: boolean;
  retry: () => void;
}

export function useNetworkAwareFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseFetchOptions<T> = {},
): FetchState<T> {
  const online = useOnline();
  const { cacheKey, maxCacheAge, fallback } = options;

  const [data, setData] = useState<T | null>(() => {
    if (cacheKey) return getCachedData<T>(cacheKey, maxCacheAge) ?? fallback ?? null;
    return fallback ?? null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount(c => c + 1), []);

  useEffect(() => {
    let cancelled = false;

    if (!online) {
      // Try cache
      if (cacheKey) {
        const cached = getCachedData<T>(cacheKey, maxCacheAge);
        if (cached) {
          setData(cached);
          setIsCached(true);
          setLoading(false);
          setError(null);
          return;
        }
      }
      setError('offline');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsCached(false);

    fetcher()
      .then(result => {
        if (cancelled) return;
        setData(result);
        if (cacheKey) cacheData(cacheKey, result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to cache
        if (cacheKey) {
          const cached = getCachedData<T>(cacheKey, maxCacheAge);
          if (cached) {
            setData(cached);
            setIsCached(true);
            setLoading(false);
            return;
          }
        }
        setError('fetch');
        setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, retryCount, ...deps]);

  return { data, loading, error, isOffline: !online, isCached, retry };
}
