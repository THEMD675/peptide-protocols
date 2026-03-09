import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, FlaskConical, Plus, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const LAB_TESTS = [
  { id: 'testosterone', nameAr: 'تستوستيرون', nameEn: 'Testosterone', unit: 'ng/dL', normalMin: 300, normalMax: 1000 },
  { id: 'igf1', nameAr: 'IGF-1', nameEn: 'IGF-1', unit: 'ng/mL', normalMin: 100, normalMax: 400 },
  { id: 'gh', nameAr: 'هرمون النمو', nameEn: 'GH', unit: 'ng/mL', normalMin: 0.1, normalMax: 8 },
  { id: 'fasting_glucose', nameAr: 'سكر صائم', nameEn: 'Fasting Glucose', unit: 'mg/dL', normalMin: 70, normalMax: 100 },
  { id: 'hba1c', nameAr: 'السكر التراكمي', nameEn: 'HbA1c', unit: '%', normalMin: 4, normalMax: 5.7 },
  { id: 'alt', nameAr: 'إنزيم الكبد ALT', nameEn: 'ALT', unit: 'U/L', normalMin: 7, normalMax: 56 },
  { id: 'ast', nameAr: 'إنزيم الكبد AST', nameEn: 'AST', unit: 'U/L', normalMin: 10, normalMax: 40 },
  { id: 'creatinine', nameAr: 'كرياتينين', nameEn: 'Creatinine', unit: 'mg/dL', normalMin: 0.6, normalMax: 1.2 },
  { id: 'wbc', nameAr: 'كريات الدم البيضاء', nameEn: 'WBC', unit: '×10³/µL', normalMin: 4, normalMax: 11 },
  { id: 'rbc', nameAr: 'كريات الدم الحمراء', nameEn: 'RBC', unit: '×10⁶/µL', normalMin: 4.5, normalMax: 5.5 },
  { id: 'hemoglobin', nameAr: 'هيموغلوبين', nameEn: 'Hemoglobin', unit: 'g/dL', normalMin: 13.5, normalMax: 17.5 },
  { id: 'tsh', nameAr: 'هرمون الغدة الدرقية', nameEn: 'TSH', unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0 },
  { id: 'ldl', nameAr: 'كوليسترول ضار', nameEn: 'LDL', unit: 'mg/dL', normalMin: 0, normalMax: 100 },
  { id: 'hdl', nameAr: 'كوليسترول نافع', nameEn: 'HDL', unit: 'mg/dL', normalMin: 40, normalMax: 100 },
  { id: 'triglycerides', nameAr: 'دهون ثلاثية', nameEn: 'Triglycerides', unit: 'mg/dL', normalMin: 0, normalMax: 150 },
  { id: 'crp', nameAr: 'بروتين سي التفاعلي', nameEn: 'CRP', unit: 'mg/L', normalMin: 0, normalMax: 3 },
] as const;

type LabTestId = (typeof LAB_TESTS)[number]['id'];

interface LabResult {
  id: string;
  test_id: string;
  value: number;
  unit: string;
  tested_at: string;
  notes: string | null;
  created_at: string;
}

function getTestMeta(testId: string) {
  return LAB_TESTS.find(t => t.id === testId);
}

function getValueStatus(value: number, testId: string): 'low' | 'normal' | 'high' {
  const meta = getTestMeta(testId);
  if (!meta) return 'normal';
  if (value < meta.normalMin) return 'low';
  if (value > meta.normalMax) return 'high';
  return 'normal';
}

const STATUS_STYLES = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  high: 'bg-red-50 text-red-700 border-red-200',
} as const;

const STATUS_LABELS_AR = {
  low: 'منخفض',
  normal: 'طبيعي',
  high: 'مرتفع',
} as const;

function MiniTrendChart({ data, testId }: { data: LabResult[]; testId: string }) {
  const meta = getTestMeta(testId);
  if (!meta || data.length < 2) return null;

  const sorted = [...data].sort((a, b) => new Date(a.tested_at).getTime() - new Date(b.tested_at).getTime());
  const chartData = sorted.map(d => ({
    date: new Date(d.tested_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' }),
    value: d.value,
  }));

  return (
    <div className="mt-3 h-28">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#a8a29e" />
          <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" domain={['auto', 'auto']} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }}
            formatter={(v: number) => [`${v} ${meta.unit}`, meta.nameAr]}
          />
          <ReferenceLine y={meta.normalMin} stroke="#86efac" strokeDasharray="3 3" />
          <ReferenceLine y={meta.normalMax} stroke="#86efac" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#059669"
            strokeWidth={2}
            dot={{ fill: '#059669', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function LabResultsTracker() {
  const { user } = useAuth();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const [selectedTest, setSelectedTest] = useState<LabTestId>(LAB_TESTS[0].id);
  const [value, setValue] = useState('');
  const [testedAt, setTestedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const selectedMeta = useMemo(() => getTestMeta(selectedTest), [selectedTest]);

  const fetchResults = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_results')
        .select('id, test_id, value, unit, tested_at, notes, created_at')
        .eq('user_id', user.id)
        .order('tested_at', { ascending: false })
        .limit(200);

      if (!error && data) setResults(data);
    } catch {
      // silently ignored
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSubmit = async () => {
    if (!user || isSubmitting || !value) return;
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < 0) {
      toast.error('أدخل قيمة صحيحة');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('lab_results').insert({
        user_id: user.id,
        test_id: selectedTest,
        value: numVal,
        unit: selectedMeta?.unit ?? '',
        tested_at: new Date(testedAt).toISOString(),
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast.success('تم تسجيل النتيجة');
      setValue('');
      setNotes('');
      setTestedAt(new Date().toISOString().slice(0, 10));
      setShowForm(false);
      await fetchResults();
    } catch {
      toast.error('تعذّر حفظ النتيجة — حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resultsByTest = useMemo(() => {
    const map = new Map<string, LabResult[]>();
    for (const r of results) {
      const existing = map.get(r.test_id);
      if (existing) existing.push(r);
      else map.set(r.test_id, [r]);
    }
    return map;
  }, [results]);

  const testsWithResults = useMemo(
    () => LAB_TESTS.filter(t => resultsByTest.has(t.id)),
    [resultsByTest],
  );

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">نتائج التحاليل</h3>
            {results.length > 0 && (
              <p className="text-xs text-stone-500">{results.length} نتيجة مسجّلة</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
        >
          {showForm ? (
            <>
              <ChevronUp className="h-3 w-3" />
              إلغاء
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              إضافة نتيجة
            </>
          )}
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="mb-5 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-stone-700">التحليل</label>
            <select
              value={selectedTest}
              onChange={e => setSelectedTest(e.target.value as LabTestId)}
              aria-label="اختر التحليل"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {LAB_TESTS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nameAr} — {t.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lab-value" className="mb-1 block text-xs font-bold text-stone-700">القيمة</label>
              <div className="relative">
                <input
                  id="lab-value"
                  type="number"
                  inputMode="decimal"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="0"
                  step="any"
                  min="0"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                {selectedMeta && (
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">
                    {selectedMeta.unit}
                  </span>
                )}
              </div>
              {selectedMeta && (
                <p className="mt-1 text-[10px] text-stone-500">
                  الطبيعي: {selectedMeta.normalMin}–{selectedMeta.normalMax}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-700">تاريخ التحليل</label>
              <input
                type="date"
                value={testedAt}
                onChange={e => setTestedAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                dir="ltr"
                aria-label="تاريخ التحليل"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="lab-notes" className="mb-1 block text-xs font-bold text-stone-700">
              ملاحظات <span className="text-emerald-600 font-normal">اختياري</span>
            </label>
            <textarea
              id="lab-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={2}
              maxLength={300}
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !value}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ الحفظ...
              </>
            ) : (
              'حفظ النتيجة'
            )}
          </button>
        </div>
      )}

      {/* Results Display */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 py-8 text-center">
          <FlaskConical className="mx-auto mb-2 h-8 w-8 text-stone-300" />
          <p className="text-sm font-bold text-stone-500">لا توجد نتائج مسجّلة</p>
          <p className="mt-1 text-xs text-stone-500">سجّل أول تحليل لبدء تتبّع صحتك</p>
        </div>
      ) : (
        <div className="space-y-2">
          {testsWithResults.map(test => {
            const testResults = resultsByTest.get(test.id)!;
            const latest = testResults[0];
            const status = getValueStatus(latest.value, test.id);
            const isExpanded = expandedTest === test.id;
            const hasTrend = testResults.length >= 2;

            const prevValue = testResults.length >= 2 ? testResults[1].value : null;
            let TrendIcon = Minus;
            let trendColor = 'text-stone-500';
            if (prevValue !== null) {
              if (latest.value > prevValue) {
                TrendIcon = TrendingUp;
                trendColor = status === 'high' ? 'text-red-500' : 'text-emerald-500';
              } else if (latest.value < prevValue) {
                TrendIcon = TrendingDown;
                trendColor = status === 'low' ? 'text-blue-500' : 'text-emerald-500';
              }
            }

            return (
              <div key={test.id} className="rounded-xl border border-stone-100 bg-stone-50/50 transition-all">
                <button
                  onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-start"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-900 truncate">{test.nameAr}</p>
                      <p className="text-[11px] text-stone-500" dir="ltr">{test.nameEn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
                    <span className="text-sm font-bold text-stone-900 tabular-nums" dir="ltr">
                      {latest.value}
                    </span>
                    <span className="text-[10px] text-stone-500" dir="ltr">{test.unit}</span>
                    <span className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                      STATUS_STYLES[status],
                    )}>
                      {STATUS_LABELS_AR[status]}
                    </span>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-stone-500 transition-transform',
                      isExpanded && 'rotate-180',
                    )} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-100 px-4 pb-4">
                    {hasTrend && <MiniTrendChart data={testResults} testId={test.id} />}

                    <div className="mt-3 space-y-1.5">
                      {testResults.map(r => {
                        const s = getValueStatus(r.value, test.id);
                        return (
                          <div key={r.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'h-2 w-2 rounded-full',
                                s === 'normal' ? 'bg-emerald-400' : s === 'high' ? 'bg-red-400' : 'bg-blue-400',
                              )} />
                              <span className="font-bold text-stone-900 tabular-nums" dir="ltr">{r.value} {test.unit}</span>
                              {r.notes && <span className="text-stone-500 truncate max-w-[120px]">— {r.notes}</span>}
                            </div>
                            <span className="text-stone-500">
                              {new Date(r.tested_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {test && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-stone-500">
                        <span>المدى الطبيعي:</span>
                        <span dir="ltr" className="font-bold">{test.normalMin}–{test.normalMax} {test.unit}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
