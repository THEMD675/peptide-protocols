import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Loader2, FlaskConical, Plus, ChevronDown, ChevronUp,
  TrendingUp, Download, FileText, AlertTriangle,
  CheckCircle, Info, Calendar, Building2, X,
  Syringe, Activity, Heart, Droplets, Flame, Droplet, Shield, Microscope
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, CartesianGrid, ComposedChart
} from 'recharts';
import { cn, escapeHtml } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ─── Biomarker Definitions ──────────────────────────────────────────────────

interface BiomarkerDef {
  id: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  borderLow?: number;
  borderHigh?: number;
  category: 'hormones' | 'thyroid' | 'liver' | 'kidney' | 'metabolic' | 'lipids' | 'inflammation' | 'cbc';
  categoryAr: string;
}

const BIOMARKERS: BiomarkerDef[] = [
  // Hormones
  { id: 'igf1', nameAr: 'IGF-1', nameEn: 'IGF-1', unit: 'ng/mL', normalMin: 100, normalMax: 400, borderLow: 80, borderHigh: 450, category: 'hormones', categoryAr: 'الهرمونات' },
  { id: 'testosterone', nameAr: 'تستوستيرون', nameEn: 'Testosterone', unit: 'ng/dL', normalMin: 300, normalMax: 1000, borderLow: 250, borderHigh: 1100, category: 'hormones', categoryAr: 'الهرمونات' },
  // Thyroid
  { id: 'tsh', nameAr: 'هرمون الغدة الدرقية', nameEn: 'TSH', unit: 'mIU/L', normalMin: 0.4, normalMax: 4.0, borderLow: 0.2, borderHigh: 5.0, category: 'thyroid', categoryAr: 'الغدة الدرقية' },
  { id: 'ft3', nameAr: 'T3 الحر', nameEn: 'Free T3', unit: 'pg/mL', normalMin: 2.0, normalMax: 4.4, borderLow: 1.8, borderHigh: 4.8, category: 'thyroid', categoryAr: 'الغدة الدرقية' },
  { id: 'ft4', nameAr: 'T4 الحر', nameEn: 'Free T4', unit: 'ng/dL', normalMin: 0.82, normalMax: 1.77, borderLow: 0.7, borderHigh: 2.0, category: 'thyroid', categoryAr: 'الغدة الدرقية' },
  // Liver
  { id: 'alt', nameAr: 'إنزيم الكبد ALT', nameEn: 'ALT', unit: 'U/L', normalMin: 7, normalMax: 56, borderLow: 5, borderHigh: 70, category: 'liver', categoryAr: 'وظائف الكبد' },
  { id: 'ast', nameAr: 'إنزيم الكبد AST', nameEn: 'AST', unit: 'U/L', normalMin: 10, normalMax: 40, borderLow: 8, borderHigh: 50, category: 'liver', categoryAr: 'وظائف الكبد' },
  // Kidney
  { id: 'creatinine', nameAr: 'كرياتينين', nameEn: 'Creatinine', unit: 'mg/dL', normalMin: 0.6, normalMax: 1.2, borderLow: 0.5, borderHigh: 1.4, category: 'kidney', categoryAr: 'وظائف الكلى' },
  { id: 'egfr', nameAr: 'معدل الترشيح الكبيبي', nameEn: 'eGFR', unit: 'mL/min', normalMin: 90, normalMax: 200, borderLow: 60, borderHigh: 200, category: 'kidney', categoryAr: 'وظائف الكلى' },
  // Metabolic
  { id: 'fasting_glucose', nameAr: 'سكر صائم', nameEn: 'Fasting Glucose', unit: 'mg/dL', normalMin: 70, normalMax: 100, borderLow: 60, borderHigh: 125, category: 'metabolic', categoryAr: 'الأيض' },
  { id: 'hba1c', nameAr: 'السكر التراكمي', nameEn: 'HbA1c', unit: '%', normalMin: 4.0, normalMax: 5.7, borderLow: 3.5, borderHigh: 6.4, category: 'metabolic', categoryAr: 'الأيض' },
  // Lipids
  { id: 'total_cholesterol', nameAr: 'الكوليسترول الكلي', nameEn: 'Total Cholesterol', unit: 'mg/dL', normalMin: 0, normalMax: 200, borderHigh: 240, category: 'lipids', categoryAr: 'الدهون' },
  { id: 'hdl', nameAr: 'كوليسترول نافع', nameEn: 'HDL', unit: 'mg/dL', normalMin: 40, normalMax: 100, borderLow: 35, category: 'lipids', categoryAr: 'الدهون' },
  { id: 'ldl', nameAr: 'كوليسترول ضار', nameEn: 'LDL', unit: 'mg/dL', normalMin: 0, normalMax: 100, borderHigh: 160, category: 'lipids', categoryAr: 'الدهون' },
  { id: 'triglycerides', nameAr: 'دهون ثلاثية', nameEn: 'Triglycerides', unit: 'mg/dL', normalMin: 0, normalMax: 150, borderHigh: 200, category: 'lipids', categoryAr: 'الدهون' },
  // Inflammation
  { id: 'crp', nameAr: 'بروتين سي التفاعلي', nameEn: 'CRP', unit: 'mg/L', normalMin: 0, normalMax: 3, borderHigh: 10, category: 'inflammation', categoryAr: 'الالتهاب' },
  // CBC
  { id: 'wbc', nameAr: 'كريات الدم البيضاء', nameEn: 'WBC', unit: '×10³/µL', normalMin: 4, normalMax: 11, borderLow: 3.5, borderHigh: 12, category: 'cbc', categoryAr: 'صورة الدم الكاملة' },
  { id: 'rbc', nameAr: 'كريات الدم الحمراء', nameEn: 'RBC', unit: '×10⁶/µL', normalMin: 4.5, normalMax: 5.5, borderLow: 4.0, borderHigh: 6.0, category: 'cbc', categoryAr: 'صورة الدم الكاملة' },
  { id: 'hemoglobin', nameAr: 'هيموغلوبين', nameEn: 'Hemoglobin', unit: 'g/dL', normalMin: 13.5, normalMax: 17.5, borderLow: 12, borderHigh: 18.5, category: 'cbc', categoryAr: 'صورة الدم الكاملة' },
  { id: 'hematocrit', nameAr: 'الهيماتوكريت', nameEn: 'Hematocrit', unit: '%', normalMin: 38.3, normalMax: 48.6, borderLow: 36, borderHigh: 52, category: 'cbc', categoryAr: 'صورة الدم الكاملة' },
  { id: 'platelets', nameAr: 'صفائح دموية', nameEn: 'Platelets', unit: '×10³/µL', normalMin: 150, normalMax: 400, borderLow: 130, borderHigh: 450, category: 'cbc', categoryAr: 'صورة الدم الكاملة' },
];

const CATEGORIES: { id: string; nameAr: string; icon: LucideIcon }[] = [
  { id: 'hormones', nameAr: 'الهرمونات', icon: Syringe },
  { id: 'thyroid', nameAr: 'الغدة الدرقية', icon: Activity },
  { id: 'liver', nameAr: 'وظائف الكبد', icon: Heart },
  { id: 'kidney', nameAr: 'وظائف الكلى', icon: Droplets },
  { id: 'metabolic', nameAr: 'الأيض', icon: Flame },
  { id: 'lipids', nameAr: 'الدهون', icon: Droplet },
  { id: 'inflammation', nameAr: 'الالتهاب', icon: Shield },
  { id: 'cbc', nameAr: 'صورة الدم الكاملة', icon: Microscope },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface LabEntry {
  id: string;
  user_id: string;
  test_date: string;
  lab_name: string | null;
  results: Record<string, number>;
  notes: string | null;
  created_at: string;
}

type ValueStatus = 'low' | 'borderLow' | 'normal' | 'borderHigh' | 'high';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBiomarker(id: string) {
  return BIOMARKERS.find(b => b.id === id);
}

function getValueStatus(value: number, biomarker: BiomarkerDef): ValueStatus {
  if (value < (biomarker.borderLow ?? biomarker.normalMin)) return 'low';
  if (value < biomarker.normalMin) return 'borderLow';
  if (value > (biomarker.borderHigh ?? biomarker.normalMax)) return 'high';
  if (value > biomarker.normalMax) return 'borderHigh';
  return 'normal';
}

const STATUS_BG: Record<ValueStatus, string> = {
  low: 'bg-red-500/10 border-red-500/30 text-red-400',
  borderLow: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  normal: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  borderHigh: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  high: 'bg-red-500/10 border-red-500/30 text-red-400',
};

const STATUS_DOT: Record<ValueStatus, string> = {
  low: 'bg-red-400',
  borderLow: 'bg-amber-400',
  normal: 'bg-emerald-400',
  borderHigh: 'bg-amber-400',
  high: 'bg-red-400',
};

const STATUS_LABELS_AR: Record<ValueStatus, string> = {
  low: 'منخفض',
  borderLow: 'قريب من المنخفض',
  normal: 'طبيعي',
  borderHigh: 'قريب من المرتفع',
  high: 'مرتفع',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-u-nu-latn', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('ar-u-nu-latn', {
    month: 'short', day: 'numeric'
  });
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Smart Insights Engine ──────────────────────────────────────────────────

interface Insight {
  type: 'improvement' | 'concern' | 'suggestion';
  icon: typeof TrendingUp;
  text: string;
}

function generateInsights(entries: LabEntry[]): Insight[] {
  if (entries.length < 2) return [];

  const sorted = [...entries].sort((a, b) =>
    new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const insights: Insight[] = [];

  for (const biomarker of BIOMARKERS) {
    const currentVal = latest.results[biomarker.id];
    const prevVal = previous.results[biomarker.id];
    if (currentVal == null || prevVal == null) continue;

    const change = percentChange(currentVal, prevVal);
    const currentStatus = getValueStatus(currentVal, biomarker);
    const prevStatus = getValueStatus(prevVal, biomarker);

    // Improvement: moved from out-of-range to normal
    if (currentStatus === 'normal' && prevStatus !== 'normal') {
      insights.push({
        type: 'improvement',
        icon: CheckCircle,
        text: `${biomarker.nameAr} عاد للمعدل الطبيعي ✓`,
      });
    }
    // Significant improvement
    else if (Math.abs(change) >= 20 && currentStatus === 'normal') {
      if (biomarker.id === 'igf1' && change > 0) {
        insights.push({
          type: 'improvement',
          icon: TrendingUp,
          text: `IGF-1 ارتفع بنسبة ${change}% — تحسن ملحوظ`,
        });
      } else if (change > 0 && ['testosterone', 'hdl', 'egfr'].includes(biomarker.id)) {
        insights.push({
          type: 'improvement',
          icon: TrendingUp,
          text: `${biomarker.nameAr} تحسّن بنسبة ${change}%`,
        });
      }
    }

    // Concerning trends
    if (currentStatus === 'high' || currentStatus === 'low') {
      if (prevStatus === 'high' || prevStatus === 'low') {
        insights.push({
          type: 'concern',
          icon: AlertTriangle,
          text: `${biomarker.nameAr} خارج النطاق الطبيعي في آخر تحليلين — يُنصح بمراجعة الطبيب`,
        });
      }
    }

    // Worsening trend
    if (currentStatus !== 'normal' && prevStatus === 'normal') {
      insights.push({
        type: 'concern',
        icon: AlertTriangle,
        text: `${biomarker.nameAr} خرج من النطاق الطبيعي — تابع مع طبيبك`,
      });
    }
  }

  // Suggest follow-ups
  const latestResults = latest.results;
  if (latestResults.alt && latestResults.alt > 56 && !latestResults.ast) {
    insights.push({ type: 'suggestion', icon: Info, text: 'ALT مرتفع — يُنصح بفحص AST و GGT أيضاً' });
  }
  if (latestResults.tsh && (latestResults.tsh < 0.4 || latestResults.tsh > 4.0) && !latestResults.ft3) {
    insights.push({ type: 'suggestion', icon: Info, text: 'TSH غير طبيعي — يُنصح بفحص fT3 و fT4' });
  }
  if (latestResults.fasting_glucose && latestResults.fasting_glucose > 100 && !latestResults.hba1c) {
    insights.push({ type: 'suggestion', icon: Info, text: 'السكر الصائم مرتفع — يُنصح بفحص HbA1c' });
  }
  if (latestResults.creatinine && latestResults.creatinine > 1.2 && !latestResults.egfr) {
    insights.push({ type: 'suggestion', icon: Info, text: 'الكرياتينين مرتفع — يُنصح بفحص eGFR' });
  }

  return insights.slice(0, 6);
}

// ─── Trend Chart Component ──────────────────────────────────────────────────

function BiomarkerTrendChart({
  entries,
  biomarkerId,
}: {
  entries: LabEntry[];
  biomarkerId: string;
}) {
  const biomarker = getBiomarker(biomarkerId);
  if (!biomarker) return null;

  const sorted = [...entries]
    .filter(e => e.results[biomarkerId] != null)
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  if (sorted.length < 2) return null;

  const chartData = sorted.map(e => ({
    date: formatShortDate(e.test_date),
    value: e.results[biomarkerId],
    normalMin: biomarker.normalMin,
    normalMax: biomarker.normalMax,
  }));

  return (
    <div className="h-44 w-full mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            stroke="#4B5563"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            stroke="#4B5563"
            width={45}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: 12,
              fontSize: 12,
              color: '#F9FAFB',
              direction: 'rtl',
            }}
            formatter={(v: number) => [`${v} ${biomarker.unit}`, biomarker.nameAr]}
          />
          <ReferenceArea
            y1={biomarker.normalMin}
            y2={biomarker.normalMax}
            fill="#10B981"
            fillOpacity={0.08}
            stroke="#10B981"
            strokeOpacity={0.2}
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ fill: '#10B981', r: 4, strokeWidth: 2, stroke: '#064E3B' }}
            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Entry Form ─────────────────────────────────────────────────────────────

function LabEntryForm({
  onSave,
  onCancel,
  userId,
}: {
  onSave: () => void;
  onCancel: () => void;
  userId: string;
}) {
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('hormones');

  const updateValue = (id: string, val: string) => {
    setValues(prev => ({ ...prev, [id]: val }));
  };

  const filteredBiomarkers = BIOMARKERS.filter(b => b.category === activeCategory);
  const filledCount = Object.values(values).filter(v => v.trim() !== '').length;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const numericResults: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) {
        numericResults[key] = num;
      }
    }
    if (Object.keys(numericResults).length === 0) {
      toast.error('أدخل قيمة واحدة على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('lab_results').insert({
        user_id: userId,
        test_date: testDate,
        lab_name: labName.trim() || null,
        results: numericResults,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success(`تم حفظ ${Object.keys(numericResults).length} نتيجة بنجاح`);
      onSave();
    } catch {
      toast.error('تعذّر حفظ النتائج — حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-700 bg-stone-900 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-stone-100">إضافة نتائج تحليل جديدة</h4>
        <button onClick={onCancel} aria-label="إغلاق" className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-stone-800 transition-colors">
          <X className="h-4 w-4 text-stone-400" />
        </button>
      </div>

      {/* Date & Lab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="lab-test-date" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-stone-300">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            تاريخ التحليل
          </label>
          <input
            id="lab-test-date"
            type="date"
            value={testDate}
            onChange={e => setTestDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            dir="ltr"
            className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-base text-stone-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label htmlFor="lab-name" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-stone-300">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            اسم المختبر <span className="text-stone-400 font-normal">اختياري</span>
          </label>
          <input
            id="lab-name"
            type="text"
            value={labName}
            onChange={e => setLabName(e.target.value)}
            placeholder="مثال: مختبرات البرج"
            className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-base text-stone-100 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all shrink-0',
              activeCategory === cat.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
            )}
          >
            <cat.icon className="h-3 w-3" />
            {cat.nameAr}
          </button>
        ))}
      </div>

      {/* Biomarker Inputs */}
      <div className="space-y-2">
        {filteredBiomarkers.map(bio => {
          const val = values[bio.id] || '';
          const numVal = parseFloat(val);
          const status = !isNaN(numVal) && numVal >= 0 ? getValueStatus(numVal, bio) : null;

          return (
            <div key={bio.id} className="flex items-center gap-3 rounded-xl bg-stone-800/50 border border-stone-700/50 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-200 truncate">{bio.nameAr}</span>
                  <span className="text-[10px] text-stone-400" dir="ltr">{bio.nameEn}</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5" dir="ltr">
                  {bio.normalMin}–{bio.normalMax} {bio.unit}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={val}
                    onChange={e => updateValue(bio.id, e.target.value)}
                    placeholder="—"
                    step="any"
                    min="0"
                    dir="ltr"
                    className={cn(
                      'w-24 rounded-lg border bg-stone-900 px-2.5 py-1.5 text-base text-stone-100 text-center placeholder:text-stone-600 focus:outline-none focus:ring-2 transition-colors',
                      status === 'normal' ? 'border-emerald-500/50 focus:ring-emerald-500/20' :
                      status === 'borderLow' || status === 'borderHigh' ? 'border-amber-500/50 focus:ring-amber-500/20' :
                      status === 'low' || status === 'high' ? 'border-red-500/50 focus:ring-red-500/20' :
                      'border-stone-700 focus:ring-emerald-500/20'
                    )}
                  />
                </div>
                <span className="text-[10px] text-stone-400 w-14 text-start" dir="ltr">{bio.unit}</span>
                {status && (
                  <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[status])} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="lab-notes" className="mb-1.5 block text-xs font-bold text-stone-300">
          ملاحظات <span className="text-stone-400 font-normal">اختياري</span>
        </label>
        <textarea
          id="lab-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="أي ملاحظات إضافية عن هذا التحليل..."
          rows={2}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-base text-stone-100 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400">
          {filledCount > 0 ? `${filledCount} قيمة مُدخلة` : 'لم يتم إدخال أي قيمة'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || filledCount === 0}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ الحفظ...
            </>
          ) : (
            <>
              <FlaskConical className="h-4 w-4" />
              حفظ النتائج
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Export Functions ────────────────────────────────────────────────────────

async function exportCSV(entries: LabEntry[]) {
  const biomarkerIds = BIOMARKERS.map(b => b.id);
  const headers = ['التاريخ', 'المختبر', ...BIOMARKERS.map(b => `${b.nameAr} (${b.unit})`), 'ملاحظات'];
  const rows = entries.map(e => [
    e.test_date,
    e.lab_name || '',
    ...biomarkerIds.map(id => e.results[id]?.toString() || ''),
    e.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lab-results-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('تم تصدير النتائج بصيغة CSV');
}

async function exportAsImage(entries: LabEntry[]) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const biomarkerIds = BIOMARKERS.map(b => b.id);
    const headers = ['التاريخ', 'المختبر', ...BIOMARKERS.map(b => `${b.nameAr} (${b.unit})`)];
    const rows = entries.map(e => [
      e.test_date,
      e.lab_name || '-',
      ...biomarkerIds.map(id => e.results[id]?.toString() || '-'),
    ]);

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;right:0;width:1400px;padding:40px;background:#fff;direction:rtl;font-family:Cairo,sans-serif;';
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;color:#059669;margin:0;">نتائج التحاليل — pptides.com</h1>
        <p style="color:#78716c;font-size:14px;margin-top:8px;">${new Date().toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p style="color:#78716c;font-size:12px;">إجمالي: ${entries.length} تحليل</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#f5f5f4;border-bottom:2px solid #d6d3d1;">
            ${headers.map(h => `<th style="padding:6px 4px;text-align:center;white-space:nowrap;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr style="border-bottom:1px solid #e7e5e4;${i % 2 === 0 ? 'background:#fafaf9;' : ''}">
              ${row.map(cell => `<td style="padding:4px;text-align:center;">${escapeHtml(cell)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="text-align:center;color:#a8a29e;font-size:10px;margin-top:24px;">pptides.com — تم التصدير تلقائيًا</p>
    `;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
    document.body.removeChild(container);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) { toast.error('تعذّر إنشاء الصورة'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-results-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير النتائج كصورة');
  } catch {
    toast.error('تعذّر تصدير النتائج');
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LabResultsTracker() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState<'results' | 'trends' | 'insights'>('results');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
        .limit(100);

      if (!error && data) setEntries(data as LabEntry[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('lab_results').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف النتيجة');
      await fetchEntries();
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const insights = useMemo(() => generateInsights(entries), [entries]);

  // Biomarkers that have data
  const biomarkersWithData = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      for (const key of Object.keys(e.results)) {
        ids.add(key);
      }
    }
    return BIOMARKERS.filter(b => ids.has(b.id));
  }, [entries]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-stone-700 bg-stone-950 p-4 sm:p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <FlaskConical className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-100">نتائج التحاليل</h3>
            {entries.length > 0 && (
              <p className="text-xs text-stone-400">{entries.length} تحليل مسجّل</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => exportCSV(entries)}
                className="p-2 rounded-lg border border-stone-700 text-stone-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                title="تصدير CSV"
                aria-label="تصدير CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => exportAsImage(entries)}
                className="p-2 rounded-lg border border-stone-700 text-stone-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                title="حفظ كصورة"
                aria-label="حفظ كصورة"
              >
                <FileText className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowForm(prev => !prev)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all min-h-[44px]',
              showForm
                ? 'bg-stone-800 text-stone-400 border border-stone-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            {showForm ? (
              <>
                <ChevronUp className="h-3 w-3" />
                إلغاء
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                تحليل جديد
              </>
            )}
          </button>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="mb-5">
          <LabEntryForm
            userId={user.id}
            onSave={() => { setShowForm(false); fetchEntries(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* View Tabs */}
      {entries.length > 0 && (
        <div className="flex gap-1 mb-4 p-1 rounded-xl bg-stone-900 border border-stone-800">
          {([
            { id: 'results' as const, label: 'النتائج' },
            { id: 'trends' as const, label: 'الاتجاهات' },
            { id: 'insights' as const, label: 'التحليل الذكي' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                activeView === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-stone-400 hover:text-stone-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-700 py-12 text-center">
          <FlaskConical className="mx-auto mb-3 h-10 w-10 text-stone-600" />
          <p className="text-sm font-bold text-stone-400">لا توجد نتائج مسجّلة</p>
          <p className="mt-1 text-xs text-stone-400">سجّل أول تحليل لبدء تتبّع صحتك</p>
        </div>
      ) : activeView === 'results' ? (
        /* ─── Results View ──────────────────────────────────────────── */
        <div className="space-y-3">
          {entries.map(entry => {
            const isExpanded = expandedEntry === entry.id;
            const resultKeys = Object.keys(entry.results);
            const abnormalCount = resultKeys.filter(key => {
              const bio = getBiomarker(key);
              if (!bio) return false;
              const s = getValueStatus(entry.results[key], bio);
              return s !== 'normal';
            }).length;

            return (
              <div key={entry.id} className="rounded-xl border border-stone-800 bg-stone-900/50 overflow-hidden transition-all">
                <button
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-start hover:bg-stone-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800">
                      <FlaskConical className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-200">
                        {formatDate(entry.test_date)}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {entry.lab_name || 'تحليل'} — {resultKeys.length} فحص
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {abnormalCount > 0 && (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        {abnormalCount} غير طبيعي
                      </span>
                    )}
                    <ChevronDown className={cn(
                      'h-4 w-4 text-stone-400 transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-800 px-4 py-3 space-y-2">
                    {/* Group by category */}
                    {CATEGORIES.map(cat => {
                      const catBiomarkers = BIOMARKERS.filter(
                        b => b.category === cat.id && entry.results[b.id] != null
                      );
                      if (catBiomarkers.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <p className="text-[10px] font-bold text-stone-400 mb-1.5 flex items-center gap-1">
                            <cat.icon className="h-3 w-3" /> {cat.nameAr}
                          </p>
                          <div className="space-y-1">
                            {catBiomarkers.map(bio => {
                              const val = entry.results[bio.id];
                              const status = getValueStatus(val, bio);
                              return (
                                <div key={bio.id} className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[status])} />
                                    <span className="text-xs font-bold text-stone-300">{bio.nameAr}</span>
                                    <span className="text-[10px] text-stone-600" dir="ltr">{bio.nameEn}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-200 tabular-nums" dir="ltr">
                                      {val} {bio.unit}
                                    </span>
                                    <span className={cn(
                                      'rounded-full border px-1.5 py-0.5 text-[9px] font-bold',
                                      STATUS_BG[status]
                                    )}>
                                      {STATUS_LABELS_AR[status]}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {entry.notes && (
                      <p className="text-xs text-stone-400 pt-2 border-t border-stone-800 flex items-center gap-1">
                        <FileText className="h-3 w-3 shrink-0" /> {entry.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="min-h-[44px] px-3 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        حذف هذا التحليل
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : activeView === 'trends' ? (
        /* ─── Trends View ───────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Biomarker selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {biomarkersWithData.map(bio => (
              <button
                key={bio.id}
                onClick={() => setSelectedBiomarker(selectedBiomarker === bio.id ? null : bio.id)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all shrink-0 border',
                  selectedBiomarker === bio.id
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-600'
                )}
              >
                {bio.nameAr}
              </button>
            ))}
          </div>

          {/* Charts */}
          {selectedBiomarker ? (
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-bold text-stone-200">
                  {getBiomarker(selectedBiomarker)?.nameAr}
                </h4>
                <span className="text-[10px] text-stone-400" dir="ltr">
                  {getBiomarker(selectedBiomarker)?.nameEn} ({getBiomarker(selectedBiomarker)?.unit})
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mb-1" dir="ltr">
                النطاق الطبيعي: {getBiomarker(selectedBiomarker)?.normalMin}–{getBiomarker(selectedBiomarker)?.normalMax} {getBiomarker(selectedBiomarker)?.unit}
              </p>
              <BiomarkerTrendChart entries={entries} biomarkerId={selectedBiomarker} />
              {/* Summary stats */}
              {(() => {
                const vals = entries
                  .filter(e => e.results[selectedBiomarker] != null)
                  .map(e => e.results[selectedBiomarker]);
                if (vals.length < 2) return null;
                const latest = vals[0];
                const oldest = vals[vals.length - 1];
                const change = percentChange(latest, oldest);
                return (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-800">
                    <div className="text-center">
                      <p className="text-[10px] text-stone-400">أحدث</p>
                      <p className="text-sm font-bold text-stone-200" dir="ltr">{latest}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-stone-400">أقدم</p>
                      <p className="text-sm font-bold text-stone-200" dir="ltr">{oldest}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-stone-400">التغيير</p>
                      <p className={cn(
                        'text-sm font-bold',
                        change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-stone-400'
                      )} dir="ltr">
                        {change > 0 ? '+' : ''}{change}%
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {biomarkersWithData.slice(0, 6).map(bio => (
                <div
                  key={bio.id}
                  className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 cursor-pointer hover:border-stone-600 transition-colors"
                  onClick={() => setSelectedBiomarker(bio.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-300">{bio.nameAr}</span>
                    <span className="text-[10px] text-stone-400" dir="ltr">{bio.unit}</span>
                  </div>
                  <BiomarkerTrendChart entries={entries} biomarkerId={bio.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Insights View ──────────────────────────────────────────── */
        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 py-8 text-center">
              <Info className="mx-auto mb-2 h-8 w-8 text-stone-600" />
              <p className="text-sm font-bold text-stone-400">أضف تحليلين على الأقل لبدء التحليل الذكي</p>
              <p className="mt-1 text-xs text-stone-400">نحتاج مقارنة النتائج لتقديم رؤى مفيدة</p>
            </div>
          ) : (
            insights.map((insight, i) => {
              const Icon = insight.icon;
              const colors = {
                improvement: 'border-emerald-500/30 bg-emerald-500/5',
                concern: 'border-red-500/30 bg-red-500/5',
                suggestion: 'border-blue-500/30 bg-blue-500/5',
              };
              const iconColors = {
                improvement: 'text-emerald-400',
                concern: 'text-red-400',
                suggestion: 'text-blue-400',
              };

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3.5 transition-all',
                    colors[insight.type]
                  )}
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColors[insight.type])} />
                  <p className="text-sm text-stone-300 leading-relaxed">{insight.text}</p>
                </div>
              );
            })
          )}

          {/* Legend */}
          {insights.length > 0 && (
            <div className="flex items-center gap-4 pt-3 border-t border-stone-800">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                <CheckCircle className="h-3 w-3 text-emerald-400" /> تحسّن
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                <AlertTriangle className="h-3 w-3 text-red-400" /> تنبيه
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                <Info className="h-3 w-3 text-blue-400" /> اقتراح
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
