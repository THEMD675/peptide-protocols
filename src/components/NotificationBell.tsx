import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'blog' | 'streak' | 'trial' | 'achievement';
  title_ar: string;
  body_ar: string;
  read: boolean;
  created_at: string;
}

const TYPE_EMOJI: Record<string, string> = {
  blog: '📝',
  streak: '🔥',
  trial: '⏰',
  achievement: '🏆',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '٩+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h3 className="text-sm font-bold text-stone-900">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                <p className="text-sm text-stone-500">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => { markAsRead(n.id); }}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-stone-50',
                    !n.read && 'bg-emerald-50/50',
                  )}
                >
                  <span className="mt-0.5 text-lg shrink-0">{TYPE_EMOJI[n.type] ?? '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', !n.read ? 'font-bold text-stone-900' : 'font-medium text-stone-700')}>
                      {n.title_ar}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500 line-clamp-2">{n.body_ar}</p>
                    <p className="mt-1 text-[10px] text-stone-400">
                      {formatTimeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))
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
