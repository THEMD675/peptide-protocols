import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const PUSH_SUPPORTED = typeof window !== 'undefined' && 'PushManager' in window;

export default function PushNotificationPrompt() {
  const { user, subscription } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!user?.id || !PUSH_SUPPORTED) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('push_subscription')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error) {
        const sub = data?.push_subscription;
        setSubscribed(sub != null && typeof sub === 'object' && Boolean(sub.endpoint));
      }
    } catch {
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const handleEnable = async () => {
    if (!user?.id || !PUSH_SUPPORTED || isEnabling) return;
    setIsEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('لم تتم الموافقة على التنبيهات');
        setIsEnabling(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error('تعذّر تفعيل التنبيهات — مفتاح VAPID غير مُعدّ');
        setIsEnabling(false);
        return;
      }
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      const subscriptionJson = sub.toJSON ? sub.toJSON() : JSON.parse(JSON.stringify(sub));
      // select→update/insert to avoid 409 (PK is id, not user_id)
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const profilePayload = {
        push_subscription: subscriptionJson,
        updated_at: new Date().toISOString(),
      };
      const { error } = existing
        ? await supabase.from('user_profiles').update(profilePayload).eq('user_id', user.id)
        : await supabase.from('user_profiles').insert({ user_id: user.id, ...profilePayload });
      if (error) {
        toast.error('تعذّر تفعيل التنبيهات — حاول مرة أخرى');
        return;
      }
      setSubscribed(true);
      toast.success('تم تفعيل التنبيهات — لن تنسى جرعتك');
    } catch (e) {
      void e;
      toast.error('تعذّر تفعيل التنبيهات — تحقق من الإعدادات');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable = async () => {
    if (!user?.id || !subscribed || isDisabling) return;
    setIsDisabling(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          push_subscription: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) {
        toast.error('تعذّر إلغاء التنبيهات');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
      toast.success('تم إلغاء التنبيهات');
    } catch {
      toast.error('تعذّر إلغاء التنبيهات');
    } finally {
      setIsDisabling(false);
    }
  };

  if (!PUSH_SUPPORTED || !subscription.isProOrTrial) return null;
  if (loading) return null;

  return (
    <div className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Bell className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100">تنبيهات الحقن</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {subscribed ? 'التنبيهات مفعّلة — ستتلقى تذكيرات بوقت جرعتك' : 'لا تنسَ جرعتك'}
            </p>
          </div>
        </div>
        {subscribed ? (
          <button
            onClick={handleDisable}
            disabled={isDisabling}
            className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-red-600 dark:text-red-400 disabled:opacity-50"
          >
            {isDisabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
            إلغاء التنبيهات
          </button>
        ) : (
          <button
            onClick={handleEnable}
            disabled={isEnabling}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isEnabling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            تفعيل التنبيهات
          </button>
        )}
      </div>
    </div>
  );
}
