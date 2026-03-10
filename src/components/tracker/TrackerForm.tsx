import { useState, useEffect, useRef } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import { DOSE_PRESETS_MAP } from '@/data/dose-presets';
import BodyMap from '@/components/BodyMap';

interface TrackerFormProps {
  userId: string;
  suggestedSite: string;
  onSubmitSuccess: () => Promise<void>;
  onCancel: () => void;
  initialPeptide?: string;
  initialDose?: string;
  initialUnit?: string;
  totalCount: number;
  logsLength: number;
  celebrate: (total: number, streak: number) => void;
  computeStreak: () => number;
  activeProtocols: { peptide_id: string; frequency: string }[];
}

export default function TrackerForm({
  userId,
  suggestedSite,
  onSubmitSuccess,
  onCancel,
  initialPeptide = '',
  initialDose = '',
  initialUnit = 'mcg',
  totalCount,
  logsLength,
  celebrate,
  computeStreak,
  activeProtocols,
}: TrackerFormProps) {
  const [peptideName, setPeptideName] = useState(initialPeptide);
  const [dose, setDose] = useState(initialDose);
  const [unit, setUnit] = useState(initialUnit);
  const [site, setSite] = useState(suggestedSite);
  const [injectedAt, setInjectedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [sideEffect, setSideEffect] = useState('none');
  const [doseOutOfRangeConfirmed, setDoseOutOfRangeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDoseOutOfRangeConfirmed(false);
  }, [peptideName, dose, unit]);

  useEffect(() => {
    if (peptideName || dose) {
      try {
        sessionStorage.setItem('pptides_tracker_form_draft', JSON.stringify({
          peptide: peptideName, dose, unit, site, notes,
        }));
      } catch { /* Safari private / quota */ }
    }
  }, [peptideName, dose, unit, site, notes]);

  // Restore draft
  useEffect(() => {
    let draft: string | null = null;
    try { draft = sessionStorage.getItem('pptides_tracker_form_draft'); } catch { /* Safari private */ }
    if (draft && !peptideName) {
      try {
        const d = JSON.parse(draft);
        setPeptideName(d.peptide ?? '');
        setDose(d.dose ?? '');
        setUnit(d.unit ?? 'mcg');
        setSite(d.site ?? 'abdomen');
        setNotes(d.notes ?? '');
      } catch { /* ignore invalid draft */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    try {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const path = `injection-photos/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('user-uploads').upload(path, photoFile, { cacheControl: '31536000', upsert: false });
      if (error) { console.warn('Photo upload failed:', error.message); return null; }
      const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
      return urlData?.publicUrl ?? null;
    } catch { return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peptideName.trim()) { toast.error('اختر الببتيد أولاً'); return; }
    const doseNum = parseFloat(dose);
    if (!dose || isNaN(doseNum) || doseNum <= 0) { toast.error('أدخل جرعة صحيحة'); return; }
    if (!injectedAt.trim()) { toast.error('أدخل التاريخ والوقت'); return; }
    const injectedDate = new Date(injectedAt);
    if (Number.isNaN(injectedDate.getTime())) { toast.error('التاريخ والوقت غير صالح'); return; }
    if (injectedDate.getTime() > Date.now() + 60000) { toast.error('لا يمكن تسجيل حقنة في المستقبل'); return; }
    (document.activeElement as HTMLElement)?.blur();
    setIsSubmitting(true);
    try {
      const sideEffectLabel = sideEffect !== 'none' ? `أعراض جانبية: ${sideEffect}` : '';
      const combinedNotes = [notes.trim(), sideEffectLabel].filter(Boolean).join('\n') || null;
      const photoUrl = await uploadPhoto();
      const insertData: Record<string, unknown> = {
        user_id: userId,
        peptide_name: peptideName.trim(),
        dose: parseFloat(dose),
        dose_unit: unit,
        injection_site: site,
        logged_at: injectedDate.toISOString(),
        notes: combinedNotes,
      };
      if (photoUrl) insertData.photo_url = photoUrl;
      const { error } = await supabase.from('injection_logs').insert(insertData);
      if (error) {
        if (error?.message?.includes('JWT') || (error as { code?: string })?.code === '401' || error?.message?.includes('not authenticated')) {
          toast.error('انتهت الجلسة — أعد تسجيل الدخول');
        } else {
          toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
        }
        return;
      }
      sessionStorage.removeItem('pptides_tracker_form_draft');
      window.history.replaceState({}, '', window.location.pathname);
      await onSubmitSuccess();
      toast.success(
        `تم تسجيل ${peptideName.trim()} — ${dose} ${unit}`,
        { duration: 6000, description: 'الجرعة التالية غدًا — استمر في الالتزام!' },
      );
      const matchedPeptide = allPeptides.find(p => p.nameEn === peptideName.trim());
      if (matchedPeptide) {
        const protocol = activeProtocols.find(p => p.peptide_id === matchedPeptide.id);
        if (protocol) {
          const freq = protocol.frequency;
          const nextIn = freq === 'bid' ? '12 ساعة' : freq === 'tid' ? '8 ساعات' : 'غدًا';
          setTimeout(() => toast(`الجرعة التالية: ${nextIn}`, { duration: 5000 }), 2000);
        }
      }
      const newTotal = (totalCount || logsLength) + 1;
      celebrate(newTotal, computeStreak());
      onCancel(); // close form
    } catch {
      toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const preset = peptideName.trim() ? DOSE_PRESETS_MAP[peptideName.trim()] : null;
  const doseNum = parseFloat(dose);
  const doseMcg = dose && !isNaN(doseNum) ? (unit === 'mg' ? doseNum * 1000 : doseNum) : 0;
  const isOutOfRange = preset && (doseMcg > preset.maxDose || doseMcg < preset.minDose);
  const submitDisabled = isSubmitting || (!!isOutOfRange && !doseOutOfRangeConfirmed);

  return (
    <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6">
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">تسجيل حقنة جديدة</h2>
      <div className="space-y-4">
        {/* Peptide Name */}
        <div>
          <label htmlFor="tracker-peptide" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">اسم الببتيد</label>
          <select
            id="tracker-peptide"
            value={peptideName}
            onChange={(e) => setPeptideName(e.target.value)}
            required
            className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          >
            <option value="">اختر الببتيد...</option>
            {allPeptides.filter(p => p.id !== 'melanotan-ii').map(p => (
              <option key={p.id} value={p.nameEn}>{p.nameAr} ({p.nameEn})</option>
            ))}
          </select>
        </div>

        {/* Dose + Unit */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="tracker-dose" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">الجرعة</label>
            <input
              id="tracker-dose"
              type="number"
              inputMode="decimal"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="250"
              required
              min="0"
              step="any"
              dir="ltr"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div className="w-28">
            <label htmlFor="tracker-unit" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">الوحدة</label>
            <select
              id="tracker-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              aria-label="وحدة الجرعة"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
            </select>
          </div>
        </div>

        {/* Dose range warning */}
        {(() => {
          if (!peptideName.trim() || !dose) return null;
          if (!preset) return null;
          const isOverMax = doseMcg > preset.maxDose;
          const isUnderMin = doseMcg < preset.minDose;
          if (isOverMax) {
            return (
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">الجرعة أعلى من الحد الأقصى الموصى به ({preset.maxDose} mcg)</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={doseOutOfRangeConfirmed} onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)} className="rounded border-stone-300 dark:border-stone-700 text-emerald-700 focus:ring-emerald-500" />
                  <span className="text-xs text-stone-700 dark:text-stone-300">أؤكد أن هذه الجرعة صحيحة</span>
                </label>
              </div>
            );
          }
          if (isUnderMin) {
            return (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-600 flex items-center gap-1">الجرعة أقل من الحد الأدنى الموصى به ({preset.minDose} mcg)</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={doseOutOfRangeConfirmed} onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)} className="rounded border-stone-300 dark:border-stone-700 text-emerald-700 focus:ring-emerald-500" />
                  <span className="text-xs text-stone-700 dark:text-stone-300">أؤكد أن هذه الجرعة صحيحة</span>
                </label>
              </div>
            );
          }
          return null;
        })()}

        {/* Injection Site — Body Map */}
        <div>
          <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">موقع الحقن</label>
          <BodyMap selected={site} suggested={suggestedSite} onSelect={(s) => setSite(s)} />
        </div>

        {/* Date/Time */}
        <div>
          <label htmlFor="tracker-datetime" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">التاريخ والوقت</label>
          <input
            id="tracker-datetime"
            type="datetime-local"
            value={injectedAt}
            onChange={(e) => setInjectedAt(e.target.value)}
            required
            aria-label="التاريخ والوقت"
            dir="ltr"
            className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          />
        </div>

        {/* Side Effect Quick-Log */}
        <div>
          <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">أعراض جانبية <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span></label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'none', label: 'لا يوجد', color: 'emerald' },
              { value: 'headache', label: 'صداع', color: 'amber' },
              { value: 'nausea', label: 'غثيان', color: 'amber' },
              { value: 'redness', label: 'احمرار', color: 'amber' },
              { value: 'fatigue', label: 'إرهاق', color: 'amber' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSideEffect(opt.value)}
                className={cn(
                  'rounded-full px-3 py-2.5 min-h-[44px] text-xs font-bold transition-all',
                  sideEffect === opt.value
                    ? opt.color === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:border-stone-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">صورة الحقنة <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span></label>
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
          {photoPreview ? (
            <div className="relative inline-block">
              <img src={photoPreview} alt="معاينة" width={80} height={80} className="h-20 w-20 rounded-xl object-cover border border-stone-200" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                className="absolute -top-2 -start-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-500 dark:text-stone-400 transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              <Camera className="h-4 w-4" />
              التقط أو اختر صورة
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="tracker-notes" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">ملاحظات <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span></label>
          <textarea
            id="tracker-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية..."
            rows={3}
            maxLength={200}
            className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          />
          <p className={cn('mt-1 text-start text-xs', notes.length >= 180 ? 'text-amber-600' : 'text-stone-500 dark:text-stone-400')}>{notes.length}/200</p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitDisabled}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ الحفظ...
              </>
            ) : (
              'حفظ'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            إلغاء
          </button>
        </div>
      </div>
    </form>
  );
}
