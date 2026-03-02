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
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: undefined,
      });
      const subscriptionJson = sub.toJSON ? sub.toJSON() : JSON.parse(JSON.stringify(sub));
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            push_subscription: subscriptionJson,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (error) {
        toast.error('تعذّر تفعيل التنبيهات — حاول مرة أخرى');
        return;
      }
      setSubscribed(true);
      toast.success('تم تفعيل التنبيهات — لن تنسى جرعتك');
    } catch (e) {
      console.error('Push subscribe error:', e);
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
    <div className="mb-8 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <Bell className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900">تنبيهات الحقن</h3>
            <p className="text-sm text-stone-600">
              {subscribed ? 'التنبيهات مفعّلة — ستتلقى تذكيرات بوقت جرعتك' : 'لا تنسَ جرعتك'}
            </p>
          </div>
        </div>
        {subscribed ? (
          <button
            onClick={handleDisable}
            disabled={isDisabling}
            className="flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50 hover:text-red-600 disabled:opacity-50"
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
