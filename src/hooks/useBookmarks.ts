import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to manage peptide bookmarks.
 * - Logged-in users: syncs with Supabase user_bookmarks table
 * - Logged-out users: uses localStorage fallback
 */
export function useBookmarks(): {
  bookmarks: Set<string>;
  isLoading: boolean;
  toggle: (slug: string) => void;
  isBookmarked: (slug: string) => boolean;
} {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pptides_favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      console.warn('bookmark op failed:', e);
      return new Set();
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    supabase
      .from('user_bookmarks')
      .select('peptide_slug')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data) {
          const slugs = new Set(data.map((d) => d.peptide_slug));
          // Merge localStorage favorites into Supabase on first load
          const localFavs = (() => {
            try {
              const stored = localStorage.getItem('pptides_favorites');
              return stored ? (JSON.parse(stored) as string[]) : [];
            } catch (e) {
              console.warn('bookmark op failed:', e);
              return [];
            }
          })();

          const toSync = localFavs.filter((s) => !slugs.has(s));
          if (toSync.length > 0) {
            supabase
              .from('user_bookmarks')
              .upsert(
                toSync.map((slug) => ({ user_id: user.id, peptide_slug: slug })),
                { onConflict: 'user_id,peptide_slug' },
              )
              .then(() => {
                if (mounted) {
                  toSync.forEach((s) => slugs.add(s));
                  setBookmarks(slugs);
                  // Clear localStorage after sync
                  try { localStorage.removeItem('pptides_favorites'); } catch (e) { console.warn('bookmark op failed:', e); }
                }
              });
          } else {
            setBookmarks(slugs);
            try { localStorage.removeItem('pptides_favorites'); } catch (e) { console.warn('bookmark op failed:', e); }
          }
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.warn('bookmark op failed:', e);
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [user]);

  const togglingRef = useRef<Set<string>>(new Set());

  const toggle = useCallback(
    (slug: string) => {
      if (togglingRef.current.has(slug)) return;

      setBookmarks((prev) => {
        const next = new Set(prev);
        const adding = !next.has(slug);

        if (adding) {
          next.add(slug);
        } else {
          next.delete(slug);
        }

        if (user) {
          togglingRef.current.add(slug);
          const op = adding
            ? supabase.from('user_bookmarks').upsert({ user_id: user.id, peptide_slug: slug }, { onConflict: 'user_id,peptide_slug' })
            : supabase.from('user_bookmarks').delete().eq('user_id', user.id).eq('peptide_slug', slug);

          op.then(({ error }) => {
            togglingRef.current.delete(slug);
            if (error) {
              // Rollback optimistic update
              setBookmarks((cur) => {
                const rolled = new Set(cur);
                if (adding) rolled.delete(slug); else rolled.add(slug);
                return rolled;
              });
              toast.error('تعذّر حفظ المفضّلة');
            }
          });
        } else {
          try {
            localStorage.setItem('pptides_favorites', JSON.stringify([...next]));
          } catch (e) { console.warn('bookmark op failed:', e); }
        }

        return next;
      });
    },
    [user],
  );

  const isBookmarked = useCallback((slug: string) => bookmarks.has(slug), [bookmarks]);

  return { bookmarks, isLoading, toggle, isBookmarked };
}
