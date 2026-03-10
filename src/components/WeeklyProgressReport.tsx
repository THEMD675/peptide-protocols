import { useState, useEffect } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Flame, Syringe, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface WeeklyData {
  injectionsThisWeek: number;
  injectionsLastWeek: number;
  streak: number;
  avgMood: number;
  avgEnergy: number;
  sideEffectsCount: number;
  topSideEffects: string[];
}

export default function WeeklyProgressReport() {
  const { user } = useAuth();
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    Promise.all([
      // Injections this week
      supabase
        .from('injection_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('logged_at', startOfWeek.toISOString()),
      // Injections last week
      supabase
        .from('injection_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('logged_at', startOfLastWeek.toISOString())
        .lt('logged_at', startOfWeek.toISOString()),
      // Streak calculation — get recent logs
      supabase
        .from('injection_logs')
        .select('logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .gte('logged_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .limit(500),
      // Wellness this week
      supabase
        .from('wellness_logs')
        .select('mood, energy')
        .eq('user_id', user.id)
        .gte('logged_at', startOfWeek.toISOString()),
      // Side effects this week
      supabase
        .from('side_effect_logs')
        .select('symptom')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString()),
    ]).then(([thisWeekInj, lastWeekInj, streakLogs, wellness, sideEffects]) => {
      if (!mounted) return;

      // Calculate streak
      let streak = 0;
      if (streakLogs.data && streakLogs.data.length > 0) {
        const daySet = new Set(streakLogs.data.map((l: { logged_at: string }) => new Date(l.logged_at).toDateString()));
        const d = new Date();
        if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
        while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
      }

      // Wellness averages
      const wellnessData = wellness.data ?? [];
      const avgMood = wellnessData.length > 0
        ? Math.round(wellnessData.reduce((s: number, w: { mood: number }) => s + w.mood, 0) / wellnessData.length * 10) / 10
        : 0;
      const avgEnergy = wellnessData.length > 0
        ? Math.round(wellnessData.reduce((s: number, w: { energy: number }) => s + w.energy, 0) / wellnessData.length * 10) / 10
        : 0;

      // Side effects summary
      const sideEffectsData = sideEffects.data ?? [];
      const symptomCounts: Record<string, number> = {};
      sideEffectsData.forEach((se: { symptom: string }) => {
        symptomCounts[se.symptom] = (symptomCounts[se.symptom] || 0) + 1;
      });
      const topSideEffects = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s);

      setData({
        injectionsThisWeek: thisWeekInj.count ?? 0,
        injectionsLastWeek: lastWeekInj.count ?? 0,
        streak,
        avgMood,
        avgEnergy,
        sideEffectsCount: sideEffectsData.length,
        topSideEffects,
      });
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [user?.id]);

  if (!user || loading || !data) return null;

  // Don't show if no activity at all
  if (data.injectionsThisWeek === 0 && data.injectionsLastWeek === 0 && data.streak === 0) return null;

  const injDiff = data.injectionsThisWeek - data.injectionsLastWeek;
  const isImproving = data.injectionsThisWeek >= data.injectionsLastWeek && data.streak > 0;

  return (
    <div className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 shadow-sm dark:shadow-stone-900/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 min-h-[56px] text-start"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">تقرير الأسبوع</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isImproving ? 'أداؤك ممتاز — استمر!' : 'لنعد إلى المسار الصحيح'}
            </p>
          </div>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-stone-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-emerald-100 px-5 pb-5 pt-4 space-y-4 animate-fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Injections This Week */}
            <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950 p-3 text-center">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{data.injectionsThisWeek}</p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">حقنة هذا الأسبوع</p>
              {injDiff !== 0 && (
                <p className={cn('mt-1 text-[10px] font-bold', injDiff > 0 ? 'text-emerald-700' : 'text-amber-600')}>
                  {injDiff > 0 ? `+${injDiff}` : injDiff} عن الأسبوع الماضي
                </p>
              )}
            </div>

            {/* Streak */}
            <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950 p-3 text-center">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{data.streak}</p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">يوم متتالي</p>
            </div>

            {/* Mood */}
            {data.avgMood > 0 && (
              <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950 p-3 text-center">
                <Sparkles className="mx-auto mb-1 h-5 w-5 text-purple-500" />
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{data.avgMood}</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">معدل المزاج</p>
              </div>
            )}

            {/* Energy */}
            {data.avgEnergy > 0 && (
              <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950 p-3 text-center">
                <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{data.avgEnergy}</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">معدل الطاقة</p>
              </div>
            )}
          </div>

          {/* Side Effects Summary */}
          {data.sideEffectsCount > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {data.sideEffectsCount} {data.sideEffectsCount === 1 ? 'عرض جانبي' : 'أعراض جانبية'} هذا الأسبوع
                </p>
              </div>
              {data.topSideEffects.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  الأكثر شيوعًا: {data.topSideEffects.join('، ')}
                </p>
              )}
            </div>
          )}

          {/* Motivational Message */}
          <div className={cn(
            'rounded-xl px-4 py-3 text-center',
            isImproving
              ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
          )}>
            {isImproving ? (
              <>
                {data.streak >= 7 ? (
                  <div className="flex items-center justify-center gap-2">
                    {injDiff > 0 ? <TrendingUp className="h-4 w-4 text-emerald-700" /> : <TrendingDown className="h-4 w-4 text-emerald-700" />}
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">ممتاز! سلسلة {data.streak} يوم — أداء استثنائي 🔥</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">أحسنت! استمر في الالتزام بالبروتوكول 💪</p>
                )}
              </>
            ) : (
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">لنعد إلى المسار — سجّل جرعتك اليوم وابدأ سلسلة جديدة 🎯</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
