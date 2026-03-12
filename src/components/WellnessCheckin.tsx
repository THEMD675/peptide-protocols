import { useState, useEffect, useCallback } from 'react';
import { Loader2, Pencil, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface WellnessEntry {
  id: string;
  energy: number;
  sleep: number;
  pain: number;
  mood: number;
  appetite: number;
  weight_kg: number | null;
  notes: string | null;
  logged_at: string;
}

const METRICS = [
  { key: 'energy', label: 'طاقة' },
  { key: 'sleep', label: 'نوم' },
  { key: 'pain', label: 'ألم' },
  { key: 'mood', label: 'مزاج' },
  { key: 'appetite', label: 'شهية' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

const LEVEL_COLORS = [
  'bg-red-100 text-red-700 dark:text-red-400 border-red-300',
  'bg-orange-100 text-orange-700 border-orange-300',
  'bg-yellow-100 text-yellow-700 border-yellow-300',
  'bg-lime-100 text-lime-700 border-lime-300',
  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
];

const PAIN_COLORS = [
  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
  'bg-lime-100 text-lime-700 border-lime-300',
  'bg-yellow-100 text-yellow-700 border-yellow-300',
  'bg-orange-100 text-orange-700 border-orange-300',
  'bg-red-100 text-red-700 dark:text-red-400 border-red-300',
];

function getLastLogLabel(loggedAt: string): string {
  const logDate = new Date(loggedAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (logDate.toDateString() === today.toDateString()) return 'آخر تسجيل: اليوم';
  if (logDate.toDateString() === yesterday.toDateString()) return 'آخر تسجيل: أمس';
  return `آخر تسجيل: ${logDate.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}`;
}

export default function WellnessCheckin() {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<MetricKey, number>>({
    energy: 3, sleep: 3, pain: 1, mood: 3, appetite: 3,
  });
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayEntry, setTodayEntry] = useState<WellnessEntry | null>(null);
  const [lastEntry, setLastEntry] = useState<WellnessEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchLatest = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wellness_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const entry = data[0] as WellnessEntry;
      setLastEntry(entry);

      if (new Date(entry.logged_at).toDateString() === new Date().toDateString()) {
        setTodayEntry(entry);
        setValues({
          energy: entry.energy,
          sleep: entry.sleep,
          pain: entry.pain,
          mood: entry.mood,
          appetite: entry.appetite,
        });
        setWeight(entry.weight_kg != null ? String(entry.weight_kg) : '');
        setNotes(entry.notes ?? '');
      }
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    if (weight) {
      const w = parseFloat(weight);
      if (isNaN(w) || w < 20 || w > 300) {
        toast.error('أدخل وزنًا صحيحًا (20–300 كغ)');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const basePayload = {
        user_id: user.id,
        energy: values.energy,
        sleep: values.sleep,
        pain: values.pain,
        mood: values.mood,
        appetite: values.appetite,
        weight_kg: weight ? parseFloat(weight) : null,
        notes: notes.trim() || null,
      };

      if (todayEntry) {
        const { error } = await supabase
          .from('wellness_logs')
          .update(basePayload)
          .eq('id', todayEntry.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('تم تحديث الحالة اليومية');
      } else {
        const { error } = await supabase
          .from('wellness_logs')
          .insert({ ...basePayload, logged_at: new Date().toISOString() });
        if (error) throw error;
        toast.success('تم تسجيل حالتك اليومية');
      }

      setEditing(false);
      await fetchLatest();
    } catch {
      toast.error('تعذّر حفظ الحالة — حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const isReadonly = !!todayEntry && !editing;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <HeartPulse className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">الحالة اليومية</h3>
            {lastEntry && (
              <p className="text-xs text-stone-500 dark:text-stone-300">{getLastLogLabel(lastEntry.logged_at)}</p>
            )}
          </div>
        </div>
        {isReadonly && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors hover:border-emerald-300 dark:border-emerald-700 hover:text-emerald-700 dark:text-emerald-400 min-h-[44px]"
          >
            <Pencil className="h-3 w-3" />
            تعديل
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        </div>
      ) : (
        <div className="space-y-4">
          {METRICS.map(metric => {
            const val = values[metric.key];
            const colors = metric.key === 'pain' ? PAIN_COLORS : LEVEL_COLORS;
            return (
              <div key={metric.key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{metric.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(metric.key === 'pain' ? PAIN_COLORS : LEVEL_COLORS)[val - 1]}`}>{val}/5</span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      type="button"
                      disabled={isReadonly}
                      onClick={() =>
                        setValues(prev => ({ ...prev, [metric.key]: level }))
                      }
                      className={cn(
                        'flex-1 rounded-lg border py-2 min-h-[44px] text-sm font-bold transition-all',
                        val === level
                          ? colors[level - 1]
                          : isReadonly
                            ? 'border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-300'
                            : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-300 hover:border-stone-300 dark:border-stone-600',
                        !isReadonly && 'cursor-pointer btn-press',
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div>
            <label htmlFor="wc-weight" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
              الوزن (كغ) <span className="text-emerald-700 font-normal">اختياري</span>
            </label>
            <input
              id="wc-weight"
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              disabled={isReadonly}
              placeholder="75.5"
              step="0.1"
              min="20"
              max="300"
              dir="ltr"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 disabled:bg-stone-50 dark:bg-stone-900 disabled:text-stone-500 dark:text-stone-300"
            />
          </div>

          <div>
            <label htmlFor="wc-notes" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
              ملاحظات <span className="text-emerald-700 font-normal">اختياري</span>
            </label>
            <textarea
              id="wc-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isReadonly}
              placeholder="كيف تشعر اليوم؟"
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 disabled:bg-stone-50 dark:bg-stone-900 disabled:text-stone-500 dark:text-stone-300"
            />
          </div>

          {!isReadonly && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحفظ...
                </>
              ) : todayEntry ? (
                'تحديث'
              ) : (
                'حفظ'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
