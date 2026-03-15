import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, Flame, Clock, Trophy, Bot, Loader2, Gift } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logError } from '@/lib/logger';
import { toast } from 'sonner';

const NOTIF_URLS: Record<string, string> = {
  blog: '/blog',
  streak: '/tracker',
  trial: '/pricing',
  achievement: '/dashboard',
  coach: '/coach',
  referral: '/account',
};

interface Notification {
  id: string;
  type: 'blog' | 'streak' | 'trial' | 'achievement' | 'coach' | 'referral';
  title_ar: string;
  body_ar: string;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  blog: FileText,
  streak: Flame,
  trial: Clock,
  achievement: Trophy,
  coach: Bot,
  referral: Gift,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadMore = useCallback(async () => {
    if (!user?.id || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title_ar, body_ar, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(notifications.length, notifications.length + PAGE_SIZE - 1);
      if (data) {
        setNotifications(prev => [...prev, ...(data as Notification[])]);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch { /* silent */ } finally {
      setLoadingMore(false);
    }
  }, [user?.id, notifications.length, loadingMore]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    supabase
      .from('notifications')
      .select('id, type, title_ar, body_ar, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data, error }) => {
        if (error) logError('notifications fetch failed:', error);
        if (mounted && data) {
          setNotifications(data as Notification[]);
          setHasMore(data.length === PAGE_SIZE);
        }
        if (mounted && !sessionStorage.getItem('notif_pruned')) {
          sessionStorage.setItem('notif_pruned', '1');
          supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)
            .eq('read', true)
            .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
            .then(({ error: pruneErr }) => {
              if (pruneErr) logError('notification pruning failed:', pruneErr);
            });
        }
      })
      .catch(e => logError('notifications fetch failed:', e));
    return () => { mounted = false; };
  }, [user?.id]);

  // Real-time subscription with reconnection handling
  useEffect(() => {
    if (!user?.id) return;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const userId = user.id;

    const refetch = () => {
      supabase
        .from('notifications')
        .select('id, type, title_ar, body_ar, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) {
            setNotifications(prev => {
              const map = new Map<string, Notification>();
              for (const n of prev) map.set(n.id, n);
              for (const n of data as Notification[]) map.set(n.id, n);
              return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            });
          }
        })
        .catch(e => logError('notification refetch failed:', e));
    };

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(prev => {
            const n = payload.new as Notification;
            if (prev.some(p => p.id === n.id)) return prev;
            return [n, ...prev];
          });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Start fallback polling on disconnect
          if (!pollTimer) {
            pollTimer = setInterval(refetch, 15_000);
          }
        } else if (status === 'SUBSCRIBED') {
          // Connected — stop polling and refetch to catch missed notifications
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          refetch();
        }
      });

    // Also refetch when network comes back online
    const onOnline = () => refetch();
    window.addEventListener('pptides:online', onOnline);

    return () => {
      supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('pptides:online', onOnline);
    };
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAsRead = async (id: string) => {
    const prev = notifications;
    setNotifications(curr => curr.map(n => n.id === id ? { ...n, read: true } : n));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user!.id);
    if (error) {
      logError('notification mark-read failed:', error);
      toast.error('تعذّر تحديث الإشعارات');
      setNotifications(prev);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    const prev = notifications;
    setNotifications(curr => curr.map(n => ({ ...n, read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) {
      logError('notification mark-all-read failed:', error);
      toast.error('تعذّر تحديث الإشعارات');
      setNotifications(prev);
    }
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-200"
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? '٩+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="الإشعارات" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} className="absolute end-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-xl dark:shadow-stone-900/40 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-700 px-4 py-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800">
                  <Bell className="h-7 w-7 text-stone-400" />
                </div>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-1">لا توجد إشعارات بعد</p>
                <p className="text-xs text-stone-500 dark:text-stone-300">سنعلمك بالتحديثات المهمة وتذكيرات الجرعات</p>
              </div>
            ) : (
              <>
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      const url = NOTIF_URLS[n.type];
                      if (url) {
                        setOpen(false);
                        navigate(url);
                      }
                    }}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-stone-50 dark:hover:bg-stone-800',
                      !n.read && 'bg-emerald-50/50',
                    )}
                  >
                    {(() => { const Icon = TYPE_ICON[n.type] ?? Bell; return <Icon className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />; })()}
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm', !n.read ? 'font-bold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-700 dark:text-stone-200')}>
                        {n.title_ar}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-300 line-clamp-2">{n.body_ar}</p>
                      <p className="mt-1 text-xs text-stone-400">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 border-t border-stone-100 dark:border-stone-700 px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'تحميل المزيد'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  return new Date(dateStr).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' });
}
