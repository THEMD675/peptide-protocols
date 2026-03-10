import { useState, useEffect, useCallback } from 'react';
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
    } catch {
      return new Set();
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    let mounted = true;
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
            } catch {
              return [];
            }
          })();

          const toSync = localFavs.filter((s) => !slugs.has(s));
          if (toSync.length > 0) {
            // Sync local favorites to Supabase
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
                  try { localStorage.removeItem('pptides_favorites'); } catch { /* */ }
                }
              });
          } else {
            setBookmarks(slugs);
            try { localStorage.removeItem('pptides_favorites'); } catch { /* */ }
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [user]);

  const toggle = useCallback(
    (slug: string) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        const adding = !next.has(slug);

        if (adding) {
          next.add(slug);
        } else {
          next.delete(slug);
        }

        if (user) {
          // Supabase sync
          if (adding) {
            supabase
              .from('user_bookmarks')
              .upsert({ user_id: user.id, peptide_slug: slug }, { onConflict: 'user_id,peptide_slug' })
              .then(({ error }) => {
                if (error) console.error('Bookmark insert error:', error);
              });
          } else {
            supabase
              .from('user_bookmarks')
              .delete()
              .eq('user_id', user.id)
              .eq('peptide_slug', slug)
              .then(({ error }) => {
                if (error) console.error('Bookmark delete error:', error);
              });
          }
        } else {
          // localStorage fallback
          try {
            localStorage.setItem('pptides_favorites', JSON.stringify([...next]));
          } catch { /* */ }
        }

        return next;
      });
    },
    [user],
  );

  const isBookmarked = useCallback((slug: string) => bookmarks.has(slug), [bookmarks]);

  return { bookmarks, isLoading, toggle, isBookmarked };
}
