import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { X, Play, Calendar, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptidesPublic as peptides, type PeptidePublic as Peptide } from '@/data/peptides-public';
import { cn } from '@/lib/utils';
import { FREQUENCY_LABELS } from '@/lib/constants';
import BaselineChecklist from '@/components/BaselineChecklist';
import { logError } from '@/lib/logger';

function ShoppingList({ peptide, dose, unit, frequency, cycleWeeks }: { peptide: Peptide; dose: string; unit: string; frequency: string; cycleWeeks: string }) {
  if (!dose || !(peptide.route === 'subq' || peptide.route === 'im')) return null;
  const doseMcg = unit === 'mg' ? parseFloat(dose) * 1000 : parseFloat(dose);
  if (!doseMcg || doseMcg <= 0) return null;
  const freqPerDay = frequency === 'bid' ? 2 : frequency === 'tid' ? 3 : frequency === 'weekly' ? 1/7 : frequency === 'biweekly' ? 2/7 : frequency === 'daily-10' ? 10/14 : frequency === 'daily-20' ? 20/28 : frequency === 'prn' ? 0.5 : 1;
  const totalDoses = Math.ceil(freqPerDay * (parseInt(cycleWeeks) || 4) * 7);
  const vialMg = peptide.doseMcg && peptide.doseMcg <= 1000 ? 5 : 10;
  const dosesPerVial = Math.floor((vialMg * 1000) / doseMcg);
  const vialsNeeded = Math.ceil(totalDoses / Math.max(dosesPerVial, 1));
  const doseExceedsVial = doseMcg > vialMg * 1000;
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-3">
      <p className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">قائمة التسوّق المقدّرة:</p>
      {doseExceedsVial && (
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">⚠ الجرعة تتجاوز حجم القارورة — ستحتاج أكثر من قارورة لكل حقنة</p>
      )}
      <ul className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
        <li>• {vialsNeeded}x قارورة {peptide.nameEn} {vialMg}mg</li>
        <li>• 1x ماء بكتيريوستاتيك 30ml</li>
        <li>• {totalDoses}x سيرنج إنسولين 31g</li>
        <li>• مسحات كحول</li>
      </ul>
      {peptide.costEstimate && <p className="mt-2 text-xs font-bold text-emerald-700">التكلفة التقريبية: {peptide.costEstimate}</p>}
    </div>
  );
}

interface ProtocolWizardProps {
  peptideId: string;
  prefillDose?: number;
  prefillUnit?: string;
  onClose: () => void;
  onCreated?: () => void;
}

export default function ProtocolWizard({ peptideId, prefillDose, prefillUnit, onClose, onCreated }: ProtocolWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const peptide = peptides.find(p => p.id === peptideId);

  const wizardStorageKey = `pptides_wizard_${peptideId}`;

  // Restore saved wizard state from sessionStorage (keyed by peptide ID)
  const savedState = (() => {
    try {
      const raw = sessionStorage.getItem(wizardStorageKey);
      if (raw) return JSON.parse(raw) as { dose?: string; unit?: string; frequency?: string; cycleWeeks?: string };
    } catch { /* expected */ }
    return null;
  })();

  const [dose, setDose] = useState(savedState?.dose ?? String(prefillDose ?? peptide?.doseMcg ?? ''));
  const [unit, setUnit] = useState(savedState?.unit ?? prefillUnit ?? 'mcg');
  const [frequency, setFrequency] = useState(savedState?.frequency ?? peptide?.frequency ?? 'od');
  const [cycleWeeks, setCycleWeeks] = useState(savedState?.cycleWeeks ?? String(peptide?.cycleDurationWeeks ?? 4));

  // Persist wizard state to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(wizardStorageKey, JSON.stringify({ dose, unit, frequency, cycleWeeks }));
    } catch { /* quota exceeded — non-critical */ }
  }, [dose, unit, frequency, cycleWeeks, wizardStorageKey]);
  const [submitting, setSubmitting] = useState(false);
  const [existingProtocols, setExistingProtocols] = useState(0);
  const [hasDuplicatePeptide, setHasDuplicatePeptide] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const [countRes, dupeRes] = await Promise.all([
        supabase.from('user_protocols').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('user_protocols').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active').eq('peptide_id', peptideId),
      ]);
      if (!mounted) return;
      if (!countRes.error) setExistingProtocols(countRes.count ?? 0);
      if (!dupeRes.error) setHasDuplicatePeptide((dupeRes.count ?? 0) > 0);
    })().catch((e) => logError('protocol load failed:', e));
    return () => { mounted = false; };
  }, [user, peptideId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  if (!peptide) return (
    <div role="dialog" aria-modal="true" aria-label="معالج البروتوكول" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="rounded-2xl bg-white dark:bg-stone-900 p-6 text-center" onClick={e => e.stopPropagation()}>
        <p className="text-stone-600 dark:text-stone-300">الببتيد غير موجود</p>
        <button onClick={onClose} className="mt-4 rounded-full bg-emerald-600 px-6 py-2 text-sm font-bold text-white">إغلاق</button>
      </div>
    </div>
  );

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (parseInt(cycleWeeks) || 4) * 7);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (!user) { toast.error('سجّل دخولك أولاً'); submittingRef.current = false; return; }
    const doseNum = parseFloat(dose);
    if (!dose || isNaN(doseNum) || doseNum <= 0) { toast.error('أدخل جرعة صحيحة'); submittingRef.current = false; return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_protocols').insert({
        user_id: user.id,
        peptide_id: peptideId,
        dose: parseFloat(dose),
        dose_unit: unit,
        frequency,
        cycle_weeks: parseInt(cycleWeeks) || 4,
        status: 'active',
      });
      if (error) {
        logError('protocol creation failed:', error.message);
        toast.error('تعذّر إنشاء البروتوكول — تحقق من اتصالك وحاول مرة أخرى');
        setSubmitting(false);
        submittingRef.current = false;
        setDuplicateConfirmed(false);
        return;
      }
      // Clear saved wizard state on successful submission
      try { sessionStorage.removeItem(wizardStorageKey); } catch { /* expected */ }
      toast.success(`تم بدء بروتوكول ${peptide.nameAr}! — انتقل لسجل الحقن`);
      onCreated?.();
      onClose();
      navigate(`/tracker?peptide=${encodeURIComponent(peptide.nameEn)}`);
    } catch {
      toast.error('فشل الاتصال بالخادم — تحقق من اتصالك وحاول مرة أخرى');
      setDuplicateConfirmed(false);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="تفاصيل البروتوكول" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <Play className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">ابدأ بروتوكول</h2>
                <p className="text-sm text-stone-500 dark:text-stone-300">{peptide.nameAr} ({peptide.nameEn})</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:text-stone-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {hasDuplicatePeptide && (
              <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">لديك بروتوكول نشط لهذا الببتيد بالفعل</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={duplicateConfirmed}
                    onChange={e => setDuplicateConfirmed(e.target.checked)}
                    className="rounded border-red-300 text-red-600 dark:text-red-400 focus:ring-red-200"
                  />
                  <span className="text-xs text-red-700 dark:text-red-400">أريد إنشاء بروتوكول إضافي</span>
                </label>
              </div>
            )}
            {existingProtocols > 0 && !hasDuplicatePeptide && (
              <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
                لديك {existingProtocols} بروتوكول نشط — يمكنك تشغيل عدة بروتوكولات معًا
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="wizard-dose" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">الجرعة</label>
                <input
                  id="wizard-dose"
                  type="number"
                  inputMode="decimal"
                  value={dose}
                  onChange={e => setDose(e.target.value)}
                  placeholder={String(peptide.doseMcg ?? 250)}
                  min="0"
                  max={50000}
                  step="any"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500"
                />
              </div>
              <div className="w-24">
                <label htmlFor="wizard-unit" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">الوحدة</label>
                <select id="wizard-unit" value={unit} onChange={e => setUnit(e.target.value)} className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500">
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="wizard-frequency" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">التكرار</label>
              <select id="wizard-frequency" value={frequency} onChange={e => { const v = e.target.value; setFrequency(v as keyof typeof FREQUENCY_LABELS); }} className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500">
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wizard-cycle" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-200">مدة الدورة (أسابيع)</label>
              <input
                id="wizard-cycle"
                type="number"
                inputMode="numeric"
                value={cycleWeeks}
                onChange={e => setCycleWeeks(e.target.value)}
                min="1"
                max="52"
                dir="ltr"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-600 px-4 py-3">
              <Calendar className="h-4 w-4 text-stone-500 dark:text-stone-300 shrink-0" />
              <div className="text-xs text-stone-600 dark:text-stone-300">
                <span>ينتهي تقريبًا: </span>
                <strong className="text-stone-900 dark:text-stone-100">{endDate.toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </div>
            </div>

            {peptide.route && (
              <div className="flex items-center gap-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                <FlaskConical className="h-4 w-4 text-emerald-700 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  طريقة الإعطاء: <strong>{peptide.route === 'subq' ? 'حقن تحت الجلد' : peptide.route === 'im' ? 'حقن عضلي' : peptide.route === 'nasal' ? 'بخاخ أنف' : peptide.route === 'oral' ? 'فموي' : 'موضعي'}</strong>
                </p>
              </div>
            )}
            <ShoppingList peptide={peptide} dose={dose} unit={unit} frequency={frequency} cycleWeeks={cycleWeeks} />
            <BaselineChecklist peptide={peptide} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !dose || (hasDuplicatePeptide && !duplicateConfirmed)}
            className={cn(
              'mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-white transition-all',
              submitting ? 'bg-stone-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
            )}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ الإنشاء...</span>
            ) : (
              <>
                <Play className="h-4 w-4" />
                ابدأ البروتوكول
              </>
            )}
          </button>
          {!dose && !submitting && (
            <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">أدخل الجرعة أولاً لبدء البروتوكول</p>
          )}
        </div>
      </FocusTrap>
    </div>
  );
}
