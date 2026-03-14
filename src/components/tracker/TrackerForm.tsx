import { useState, useEffect, useRef } from 'react';
import { Loader2, Camera, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, sanitizeInput } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { peptidesLite as allPeptides } from '@/data/peptides-lite';
import { DOSE_PRESETS_MAP } from '@/data/dose-presets';
import BodyMap from '@/components/BodyMap';
import { logError } from '@/lib/logger';

interface TrackerFormProps {
  userId: string;
  suggestedSite: string;
  getSuggestedSite?: (peptideName?: string) => string;
  onSubmitSuccess: (peptideName?: string) => Promise<void>;
  onCancel: () => void;
  initialPeptide?: string;
  initialDose?: string;
  initialUnit?: string;
  totalCount: number;
  logsLength: number;
  celebrate: (total: number, streak: number) => void;
  computeStreak: () => number;
  activeProtocols: { peptide_id: string; frequency: string }[];
  recentSites?: string[];
}

export default function TrackerForm({
  userId,
  suggestedSite,
  getSuggestedSite,
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
  recentSites = [],
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
  const [customSideEffect, setCustomSideEffect] = useState('');
  const [doseOutOfRangeConfirmed, setDoseOutOfRangeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const nextDoseTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nextDoseTimerRef.current) clearTimeout(nextDoseTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (peptideName && getSuggestedSite) {
      setSite(getSuggestedSite(peptideName));
    }
  }, [peptideName, getSuggestedSite]);

  useEffect(() => {
    setDoseOutOfRangeConfirmed(false);
  }, [peptideName, dose, unit]);

  useEffect(() => {
    if (peptideName || dose) {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem('pptides_tracker_form_draft', JSON.stringify({
            peptide: peptideName, dose, unit, site, notes,
          }));
        } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            try { sessionStorage.removeItem('pptides_tracker_form_draft'); } catch { /* ignore */ }
          }
          logError('tracker draft failed:', e);
        }
      }, 500);
    }
  }, [peptideName, dose, unit, site, notes]);

  // beforeunload guard when form has unsaved data
  useEffect(() => {
    const hasData = peptideName || dose || notes.trim();
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [peptideName, dose, notes]);

  // Restore draft
  useEffect(() => {
    let draft: string | null = null;
    try { draft = sessionStorage.getItem('pptides_tracker_form_draft'); } catch (e) { logError('tracker draft failed:', e); }
    if (draft && !peptideName) {
      try {
        const d = JSON.parse(draft);
        setPeptideName(d.peptide ?? '');
        setDose(d.dose ?? '');
        setUnit(d.unit ?? 'mcg');
        setSite(d.site ?? 'abdomen');
        setNotes(d.notes ?? '');
      } catch (e) { logError('tracker draft failed:', e); }
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
      if (error) { logError('Photo upload failed:', error.message); toast.error('تعذّر رفع الصورة — تم حفظ الحقنة بدون صورة'); return null; }
      const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
      return urlData?.publicUrl ?? null;
    } catch (e) { logError('Photo upload failed:', e); toast.error('تعذّر رفع الصورة — تم حفظ الحقنة بدون صورة'); return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!peptideName.trim()) { toast.error('اختر الببتيد أولاً'); return; }
    // 14.5: Validate peptide_name against known peptides list
    if (!allPeptides.some(p => p.nameEn === peptideName.trim())) { toast.error('ببتيد غير معروف'); return; }
    const doseNum = parseFloat(dose);
    if (!dose || isNaN(doseNum) || doseNum <= 0) { toast.error('أدخل جرعة صحيحة'); return; }
    if (doseNum > 100000) { toast.error('الجرعة كبيرة جداً'); return; }
    if (!injectedAt.trim()) { toast.error('أدخل التاريخ والوقت'); return; }
    const injectedDate = new Date(injectedAt);
    if (Number.isNaN(injectedDate.getTime())) { toast.error('التاريخ والوقت غير صالح'); return; }
    if (injectedDate.getTime() > Date.now() + 60000) { toast.error('لا يمكن تسجيل حقنة في المستقبل'); return; }
    (document.activeElement as HTMLElement)?.blur();
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const safeSideEffect = sideEffect === 'other' ? sanitizeInput(customSideEffect, 200) : '';
      const sideEffectLabel = sideEffect !== 'none'
        ? `أعراض جانبية: ${sideEffect === 'other' ? (safeSideEffect || 'أخرى') : sideEffect}`
        : '';
      const combinedNotes = [sanitizeInput(notes, 5000), sideEffectLabel].filter(Boolean).join('\n') || null;
      const photoUrl = await uploadPhoto();
      const insertData: Record<string, unknown> = {
        user_id: userId,
        peptide_name: sanitizeInput(peptideName, 200),
        dose: parseFloat(dose),
        dose_unit: unit,
        injection_site: site,
        logged_at: injectedDate.toISOString(),
        notes: combinedNotes,
      };
      if (photoUrl) insertData.photo_url = photoUrl;
      if (!navigator.onLine && navigator.serviceWorker?.controller) {
        const session = await supabase.auth.getSession();
        navigator.serviceWorker.controller.postMessage({
          type: 'QUEUE_INJECTION',
          payload: { ...insertData, _supabase_url: import.meta.env.VITE_SUPABASE_URL, _anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY, _access_token: session.data.session?.access_token },
        });
        sessionStorage.removeItem('pptides_tracker_form_draft');
        toast.success('محفوظ للمزامنة عند الاتصال بالإنترنت');
        onCancel();
        return;
      }
      const { error } = await supabase.from('injection_logs').insert(insertData);
      if (error) {
        if (!navigator.onLine && navigator.serviceWorker?.controller) {
          const session = await supabase.auth.getSession();
          navigator.serviceWorker.controller.postMessage({
            type: 'QUEUE_INJECTION',
            payload: { ...insertData, _supabase_url: import.meta.env.VITE_SUPABASE_URL, _anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY, _access_token: session.data.session?.access_token },
          });
          sessionStorage.removeItem('pptides_tracker_form_draft');
          toast.success('محفوظ للمزامنة عند الاتصال بالإنترنت');
          onCancel();
          return;
        }
        if (error?.message?.includes('JWT') || (error as { code?: string })?.code === '401' || error?.message?.includes('not authenticated')) {
          toast.error('انتهت الجلسة — أعد تسجيل الدخول');
        } else {
          toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى', {
            action: { label: 'أعد المحاولة', onClick: () => formRef.current?.requestSubmit() },
          });
        }
        return;
      }
      // Bridge side effects to side_effect_logs for unified tracking
      const selectedSideEffects = sideEffect !== 'none'
        ? [sideEffect === 'other' ? (safeSideEffect || 'أخرى') : sideEffect]
        : [];
      if (selectedSideEffects.length > 0) {
        const symptomLabels: Record<string, string> = {
          headache: 'صداع',
          nausea: 'غثيان',
          redness: 'احمرار',
          fatigue: 'إرهاق',
        };
        for (const symptom of selectedSideEffects) {
          const symptomLabel = symptomLabels[symptom] ?? symptom;
          const matchedPeptideForSE = allPeptides.find(p => p.nameEn === peptideName.trim());
          await supabase.from('side_effect_logs').insert({
            user_id: userId,
            symptom: symptomLabel,
            severity: 2,
            peptide_id: matchedPeptideForSE?.id ?? peptideName.trim(),
            peptide_name: matchedPeptideForSE?.nameEn ?? peptideName.trim(),
            notes: 'مسجّل تلقائيًا من سجل الحقن',
            logged_at: injectedDate.toISOString(),
          }).catch(() => {});
        }
      }
      sessionStorage.removeItem('pptides_tracker_form_draft');
      window.history.replaceState({}, '', window.location.pathname);
      await onSubmitSuccess(peptideName.trim());
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
          nextDoseTimerRef.current = setTimeout(() => toast(`الجرعة التالية: ${nextIn}`, { duration: 5000 }), 2000);
        }
      }
      // Offer injection reminder
      const matchedProto = activeProtocols.find(p => {
        const mp = allPeptides.find(x => x.nameEn === peptideName.trim());
        return mp && p.peptide_id === mp.id;
      });
      const freqHours = matchedProto?.frequency === 'bid' ? 12 : matchedProto?.frequency === 'tid' ? 8 : 24;
      const nextDate = new Date(Date.now() + freqHours * 60 * 60 * 1000).toISOString();
      try {
        localStorage.setItem('pptides_injection_reminder', JSON.stringify({
          peptide: peptideName.trim(),
          nextDate,
          freqHours,
        }));
      } catch { /* quota */ }

      const newTotal = (totalCount || logsLength) + 1;
      celebrate(newTotal, computeStreak());
      onCancel(); // close form
    } catch (err) {
      logError('injection submit failed', err);
      toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى', {
        action: { label: 'أعد المحاولة', onClick: () => formRef.current?.requestSubmit() },
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const preset = peptideName.trim() ? DOSE_PRESETS_MAP[peptideName.trim()] : null;
  const doseNum = parseFloat(dose);
  const doseMcg = dose && !isNaN(doseNum) ? (unit === 'mg' ? doseNum * 1000 : doseNum) : 0;
  const isOutOfRange = preset && (doseMcg > preset.maxDose || doseMcg < preset.minDose);
  const submitDisabled = isSubmitting || (!!isOutOfRange && !doseOutOfRangeConfirmed);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">تسجيل حقنة جديدة</h2>
      <div className="space-y-4">
        {/* Peptide Name */}
        <div>
          <label htmlFor="tracker-peptide" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">اسم الببتيد</label>
          <select
            id="tracker-peptide"
            value={peptideName}
            onChange={(e) => setPeptideName(e.target.value)}
            required
            className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          >
            <option value="">اختر الببتيد...</option>
            {allPeptides.filter(p => p.id !== 'melanotan-ii').map(p => (
              <option key={p.id} value={p.nameEn}>{p.nameAr} ({p.nameEn})</option>
            ))}
          </select>
        </div>

        {/* Dose Preset Hint */}
        {preset && !dose && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 space-y-1">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">الجرعة الموصى بها: <span dir="ltr">{preset.dose} {preset.unit}</span></p>
            <p className="text-xs text-stone-600 dark:text-stone-400">النطاق: <span dir="ltr">{preset.minDose}–{preset.maxDose} {preset.unit}</span></p>
            <p className="text-xs text-stone-500 dark:text-stone-400">250 مايكروغرام = 0.25 ملغ</p>
            <button
              type="button"
              onClick={() => { setDose(String(preset.dose)); setUnit(preset.unit === 'mg' ? 'mg' : 'mcg'); }}
              className="mt-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-700"
            >
              استخدم {preset.dose} {preset.unit === 'mcg' ? 'مايكروغرام' : preset.unit === 'mg' ? 'ملغ' : preset.unit}
            </button>
          </div>
        )}

        {/* Dose + Unit */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="tracker-dose" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">الجرعة</label>
            <input
              id="tracker-dose"
              type="number"
              inputMode="decimal"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
              placeholder="250"
              required
              min="0"
              max="100000"
              step="any"
              dir="ltr"
              aria-invalid={!!isOutOfRange && !doseOutOfRangeConfirmed}
              aria-describedby={isOutOfRange ? 'dose-range-warning' : undefined}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div className="w-28">
            <label htmlFor="tracker-unit" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">الوحدة</label>
            <select
              id="tracker-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              aria-label="وحدة الجرعة"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            >
              <option value="mcg">مايكروغرام</option>
              <option value="mg">ملغ</option>
              <option value="iu">وحدة دولية</option>
              <option value="ml">مل</option>
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
              <div id="dose-range-warning" role="alert" className="space-y-2">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">تحذير: الجرعة أعلى من الحد الأقصى الموصى به ({preset.maxDose} مايكروغرام)</p>
                <p className="text-xs text-red-500 dark:text-red-400">جرعة خارج النطاق قد تسبب أعراضًا جانبية خطيرة — استشر طبيبك</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={doseOutOfRangeConfirmed} onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)} className="rounded border-stone-300 dark:border-stone-600 text-emerald-700 focus:ring-emerald-500" />
                  <span className="text-xs text-stone-700 dark:text-stone-200">أقر بأن هذه الجرعة بإشراف طبي</span>
                </label>
              </div>
            );
          }
          if (isUnderMin) {
            return (
              <div id="dose-range-warning" role="alert" className="space-y-2">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">الجرعة أقل من الحد الأدنى الموصى به ({preset.minDose} مايكروغرام)</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={doseOutOfRangeConfirmed} onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)} className="rounded border-stone-300 dark:border-stone-600 text-emerald-700 focus:ring-emerald-500" />
                  <span className="text-xs text-stone-700 dark:text-stone-200">أقر بأن هذه الجرعة بإشراف طبي</span>
                </label>
              </div>
            );
          }
          return null;
        })()}

        {/* Injection Site — Body Map */}
        <div>
          <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">موقع الحقن</label>
          <BodyMap selected={site} suggested={suggestedSite} onSelect={(s) => setSite(s)} />
          {recentSites.length >= 3 && recentSites.every(s => s === site) && (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700 dark:text-amber-400">آخر 3 حقن في نفس الموقع — يُنصح بتدوير مواقع الحقن لتقليل التهيّج وتحسين الامتصاص</p>
            </div>
          )}
        </div>

        {/* Date/Time */}
        <div>
          <label htmlFor="tracker-datetime" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">التاريخ والوقت</label>
          <input
            id="tracker-datetime"
            type="datetime-local"
            value={injectedAt}
            onChange={(e) => setInjectedAt(e.target.value)}
            onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
            min="2020-01-01T00:00"
            max={new Date().toISOString().slice(0, 16)}
            required
            aria-label="التاريخ والوقت"
            dir="ltr"
            className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          />
        </div>

        {/* Side Effect Quick-Log */}
        <div role="group" aria-label="أعراض جانبية">
          <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">أعراض جانبية <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span></label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'none', label: 'لا يوجد', color: 'emerald' },
              { value: 'headache', label: 'صداع', color: 'amber' },
              { value: 'nausea', label: 'غثيان', color: 'amber' },
              { value: 'redness', label: 'احمرار', color: 'amber' },
              { value: 'fatigue', label: 'إرهاق', color: 'amber' },
              { value: 'other', label: 'أخرى', color: 'stone' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSideEffect(opt.value)}
                className={cn(
                  'rounded-full px-3 py-2.5 min-h-[44px] text-xs font-bold transition-all',
                  sideEffect === opt.value
                    ? opt.color === 'emerald' ? 'bg-emerald-600 text-white' : opt.color === 'stone' ? 'bg-stone-700 text-white' : 'bg-amber-500 text-white'
                    : 'border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-stone-300 dark:border-stone-600'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {sideEffect === 'other' && (
            <input
              type="text"
              value={customSideEffect}
              onChange={(e) => setCustomSideEffect(e.target.value)}
              placeholder="اكتب الأعراض الجانبية..."
              maxLength={60}
              aria-label="عرض جانبي مخصص"
              className="mt-2 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          )}
        </div>

        {/* Photo Upload */}
        <div>
          <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">صورة الحقنة <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span></label>
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
          {photoPreview ? (
            <div className="relative inline-block">
              <img src={photoPreview} alt="معاينة" width={80} height={80} className="h-20 w-20 rounded-xl object-cover border border-stone-200 dark:border-stone-700" loading="lazy" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                aria-label="إزالة الصورة"
                className="absolute -top-2 -start-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-500 dark:text-stone-300 transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              <Camera className="h-4 w-4" />
              التقط أو اختر صورة
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="tracker-notes" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">ملاحظات <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span></label>
          <textarea
            id="tracker-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
            placeholder="ملاحظات إضافية..."
            rows={3}
            maxLength={200}
            className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          />
          <p className={cn('mt-1 text-start text-xs', notes.length >= 180 ? 'text-amber-600' : 'text-stone-500 dark:text-stone-300')}>{notes.length}/200</p>
        </div>

        {!!isOutOfRange && !doseOutOfRangeConfirmed && (
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-center">
            الجرعة خارج النطاق المعتاد — أكّد للمتابعة
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitDisabled}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="rounded-xl border border-stone-200 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            إلغاء
          </button>
        </div>
      </div>
    </form>
  );
}
