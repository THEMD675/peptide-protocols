import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptidesLite as allPeptides } from '@/data/peptides-lite';

interface SideEffectEntry {
  id: string;
  symptom: string;
  severity: number;
  notes: string | null;
  peptide_id: string | null;
  created_at: string;
}

interface ActiveProtocol {
  id: string;
  peptide_id: string;
  status: string;
}

const SEVERITY_COLORS = [
  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
  'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 border-lime-300 dark:border-lime-700',
  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
];

const SEVERITY_LABELS = ['خفيف', 'بسيط', 'متوسط', 'شديد', 'حاد'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'اليوم';
  if (d.toDateString() === yesterday.toDateString()) return 'أمس';
  return d.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' });
}

export default function SideEffectLog() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<SideEffectEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProtocols, setActiveProtocols] = useState<ActiveProtocol[]>([]);

  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState(1);
  const [peptideId, setPeptideId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('side_effect_logs')
        .select('id, symptom, severity, notes, peptide_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) setEntries(data as SideEffectEntry[]);
    } catch (e) {
      console.warn('side effect fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchProtocols = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_protocols')
        .select('id, peptide_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (!error && data) setActiveProtocols(data);
    } catch (e) {
      console.warn('side effect fetch failed:', e);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchEntries();
      fetchProtocols();
    }
  }, [isOpen, fetchEntries, fetchProtocols]);

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    if (!symptom.trim()) {
      toast.error('أدخل اسم العرض');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('side_effect_logs').insert({
        user_id: user.id,
        symptom: symptom.trim(),
        severity,
        notes: notes.trim() || null,
        peptide_id: peptideId || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('تم تسجيل العرض الجانبي');
      setSymptom('');
      setSeverity(1);
      setPeptideId('');
      setNotes('');
      await fetchEntries();
    } catch (e) { console.warn("caught:", e);
      toast.error('تعذّر حفظ العرض — حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    setDeletingId(null);
    const prev = entries;
    setEntries(e => e.filter(x => x.id !== id));
    const { error } = await supabase
      .from('side_effect_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      setEntries(prev);
      toast.error('تعذّر حذف العرض');
    }
  };

  if (!user) return null;

  const activePeptideIds = new Set(activeProtocols.map(p => p.peptide_id));
  const activePeptideOptions = allPeptides.filter(p => activePeptideIds.has(p.id));

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-sm dark:shadow-stone-900/30">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between p-5 text-start"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">أعراض جانبية</h3>
            <p className="text-xs text-stone-500 dark:text-stone-300">سجّل وتابع الأعراض</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-stone-500 dark:text-stone-300" />
        ) : (
          <ChevronDown className="h-5 w-5 text-stone-500 dark:text-stone-300" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-stone-100 dark:border-stone-700 p-5 pt-4 space-y-5">
          {/* Quick-add form */}
          <div className="space-y-3">
            <div>
              <label htmlFor="se-symptom" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">العرض</label>
              <input
                id="se-symptom"
                type="text"
                value={symptom}
                onChange={e => setSymptom(e.target.value)}
                placeholder="مثال: صداع، غثيان، احمرار..."
                maxLength={100}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">الشدة</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={cn(
                      'flex-1 rounded-lg border py-2 min-h-[44px] text-xs font-bold transition-all btn-press',
                      severity === level
                        ? SEVERITY_COLORS[level - 1]
                        : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-300 hover:border-stone-300 dark:border-stone-600',
                    )}
                  >
                    {SEVERITY_LABELS[level - 1]}
                  </button>
                ))}
              </div>
            </div>

            {activePeptideOptions.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
                  الببتيد <span className="text-emerald-700 font-normal">اختياري</span>
                </label>
                <select
                  value={peptideId}
                  onChange={e => setPeptideId(e.target.value)}
                  aria-label="اختر الببتيد"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                >
                  <option value="">غير محدد</option>
                  {activePeptideOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} ({p.nameEn})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="se-notes" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">
                ملاحظات <span className="text-emerald-700 font-normal">اختياري</span>
              </label>
              <textarea
                id="se-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تفاصيل إضافية..."
                rows={2}
                maxLength={200}
                className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !symptom.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  إضافة
                </>
              )}
            </button>
          </div>

          {/* Recent entries */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300">آخر الأعراض</h4>
              {entries.slice(0, 10).map(entry => {
                const peptide = entry.peptide_id
                  ? allPeptides.find(p => p.id === entry.peptide_id)
                  : null;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{entry.symptom}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                            SEVERITY_COLORS[entry.severity - 1],
                          )}
                        >
                          {SEVERITY_LABELS[entry.severity - 1]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-300">
                        {peptide && <span>{peptide.nameAr}</span>}
                        <span>{formatDate(entry.created_at)}</span>
                      </div>
                      {entry.notes && (
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-300">{entry.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      onBlur={() => { if (deletingId === entry.id) setDeletingId(null); }}
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] transition-colors',
                        deletingId === entry.id
                          ? 'bg-red-100 text-red-600 dark:text-red-400'
                          : 'text-stone-300 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-500 dark:text-red-400',
                      )}
                      aria-label={deletingId === entry.id ? 'تأكيد الحذف' : 'حذف'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-stone-500 dark:text-stone-300 py-4">لا توجد أعراض مسجّلة</p>
          )}

          {/* Correlation summary — group by peptide, show for 2+ */}
          {!loading && entries.length > 0 && (() => {
            const byPeptide: Record<string, number> = {};
            entries.forEach((e) => {
              const id = e.peptide_id ?? '_unknown';
              byPeptide[id] = (byPeptide[id] ?? 0) + 1;
            });
            const correlated = Object.entries(byPeptide)
              .filter(([id, cnt]) => id !== '_unknown' && cnt >= 2)
              .map(([id, cnt]) => {
                const p = allPeptides.find((x) => x.id === id);
                return { name: p?.nameAr ?? id, count: cnt };
              });
            if (correlated.length === 0) return null;
            return (
              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-700">
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300 mb-2">ملخص الارتباط</h4>
                <div className="space-y-1.5">
                  {correlated.map(({ name, count }) => (
                    <p key={name} className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      {count} أعراض مرتبطة بـ {name}
                    </p>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
