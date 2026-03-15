import { useState, useMemo, useEffect, useCallback, useId } from 'react';
import SyringeVisual from '@/components/dose-calculator/SyringeVisual';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Calculator, FlaskConical, Droplets, ChevronDown, ArrowLeft, BookOpen,
  Layers, Bot, Bookmark, Syringe, Shield, Play, Search, Share2, Zap,
  Scale, DollarSign, ArrowLeftRight, Info, Trash2, Clock, Target,
  Activity, Dumbbell, Heart, Timer, Moon, Lightbulb, Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import ProtocolWizard from '@/components/ProtocolWizard';
import { peptidesPublic as allPeptides } from '@/data/peptides-public';
import { toast } from 'sonner';
import { cn, copyToClipboard } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { DOSE_PRESETS as PEPTIDE_PRESETS_DATA, type DoseUnit } from '@/data/dose-presets';

/* ─────────────── Types ─────────────── */

interface SyringeOption {
  label: string;
  ml: number;
  units: number;
}

type TabId = 'dose' | 'reconstitution' | 'cost' | 'converter';

type GoalLevel = 'therapeutic' | 'moderate' | 'aggressive';

interface SavedCalc {
  peptide: string;
  dose: number;
  unit: string;
  vial: number;
  water: number;
  units: string;
  ts: number;
}

interface CostEntry {
  peptide: string;
  pricePerVial: number;
  vialMg: number;
  doseMcg: number;
  dosesPerDay: number;
}

/* ─────────────── Constants ─────────────── */

const SYRINGE_OPTIONS: SyringeOption[] = [
  { label: '0.3 مل (30 وحدة)', ml: 0.3, units: 30 },
  { label: '0.5 مل (50 وحدة)', ml: 0.5, units: 50 },
  { label: '1.0 مل (100 وحدة)', ml: 1.0, units: 100 },
];

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dose', label: 'حساب الجرعة', icon: <Calculator className="h-4 w-4" /> },
  { id: 'reconstitution', label: 'حساب التخفيف', icon: <FlaskConical className="h-4 w-4" /> },
  { id: 'cost', label: 'حساب التكلفة', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'converter', label: 'محوّل الوحدات', icon: <ArrowLeftRight className="h-4 w-4" /> },
];

const GOAL_LABELS: Record<GoalLevel, string> = {
  therapeutic: 'علاجي',
  moderate: 'متوسط',
  aggressive: 'مكثّف',
};

const GOAL_SUBTITLES: Record<GoalLevel, string> = {
  therapeutic: 'جرعة آمنة للمبتدئين (60% من المعيار)',
  moderate: 'الجرعة القياسية الموصى بها (100%)',
  aggressive: 'للمتقدمين — خطر أعلى (150%)',
};

const GOAL_MULTIPLIERS: Record<GoalLevel, number> = {
  therapeutic: 0.6,
  moderate: 1.0,
  aggressive: 1.5,
};

const FREQUENCY_LABELS: Record<string, string> = {
  od: 'مرة يوميًا',
  bid: 'مرتين يوميًا',
  weekly: 'مرة أسبوعيًا',
  biweekly: 'مرتين أسبوعيًا',
  prn: 'عند الحاجة',
  'daily-10': '10 أيام متتالية',
  'daily-20': '20 يوم متتالي',
};

const ROUTE_LABELS: Record<string, string> = {
  subq: 'تحت الجلد',
  im: 'عضلي',
  nasal: 'أنفي (بخاخ)',
  oral: 'فموي',
  topical: 'موضعي',
};

/* ─────────────── Helpers ─────────────── */

function getRecommendedWater(vialMg: number): number {
  if (vialMg <= 2) return 1;
  if (vialMg <= 5) return 2;
  if (vialMg <= 10) return 3;
  if (vialMg <= 15) return 3;
  if (vialMg <= 30) return 6;
  return Math.ceil(vialMg / 5);
}

const fmt = (n: number, d = 2) => (isFinite(n) && n > 0 ? n.toFixed(d) : '—');

/* ─────────────── Preset Data ─────────────── */

const EXCLUDED_PEPTIDE_IDS = new Set(['melanotan-ii']);

const PEPTIDE_PRESETS = PEPTIDE_PRESETS_DATA
  .filter(p => {
    const match = allPeptides.find(
      pep => pep.nameEn === p.name || pep.nameEn.startsWith(p.name + ' ') || pep.nameEn.startsWith(p.name + '/'),
    );
    return !match || !EXCLUDED_PEPTIDE_IDS.has(match.id);
  })
  .map(p => ({
    name: p.name, dose: p.dose, unit: p.unit, vial: p.vialMg, water: p.waterMl,
    minDose: p.minDose, maxDose: p.maxDose,
  }));

const POPULAR_PRESET_COUNT = 8;

function getPresetDisplayName(presetName: string): string {
  const pep = allPeptides.find(
    p =>
      p.nameEn === presetName ||
      p.nameEn.startsWith(presetName + ' ') ||
      p.nameEn.startsWith(presetName + '/'),
  );
  return pep?.nameAr ?? presetName;
}

function findPeptideByPreset(presetName: string) {
  return allPeptides.find(
    p =>
      p.nameEn === presetName ||
      p.nameEn.startsWith(presetName + ' ') ||
      p.nameEn.startsWith(presetName + '/'),
  );
}

/* ─────────────── Reference Data ─────────────── */

interface ReferenceRow {
  vialMg: number;
  waterMl: number;
  concentration: number;
  dose100: string;
  dose250: string;
  dose500: string;
}

const referenceData: ReferenceRow[] = [
  { vialMg: 5, waterMl: 1, concentration: 5000, dose100: '0.02', dose250: '0.05', dose500: '0.10' },
  { vialMg: 5, waterMl: 2, concentration: 2500, dose100: '0.04', dose250: '0.10', dose500: '0.20' },
  { vialMg: 10, waterMl: 2, concentration: 5000, dose100: '0.02', dose250: '0.05', dose500: '0.10' },
  { vialMg: 10, waterMl: 3, concentration: 3333, dose100: '0.03', dose250: '0.075', dose500: '0.15' },
  { vialMg: 15, waterMl: 3, concentration: 5000, dose100: '0.02', dose250: '0.05', dose500: '0.10' },
];

/* IU conversion factors for common peptides */
const IU_FACTORS: Record<string, { factor: number; note: string }> = {
  'HGH': { factor: 3, note: '1 mg = 3 IU' },
  'Sermorelin': { factor: 3, note: '1 mg ≈ 3 IU' },
  'IGF-1 LR3': { factor: 1, note: 'يُقاس بالمايكروغرام عادةً' },
  'HCG': { factor: 0, note: 'يختلف حسب المُصنّع' },
  'BPC-157': { factor: 0, note: 'يُقاس بالمايكروغرام عادةً' },
};

/* SyringeVisual extracted to @/components/dose-calculator/SyringeVisual.tsx */

/* ─────────────── Peptide Reference Card ─────────────── */

function PeptideReferenceCard({ presetName }: { presetName: string }) {
  const peptide = findPeptideByPreset(presetName);
  const preset = PEPTIDE_PRESETS.find(p => p.name === presetName);
  if (!peptide || !preset) return null;

  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: 'نطاق الجرعة',
      value: `${preset.minDose} – ${preset.maxDose} مكغ`,
      icon: <Target className="h-4 w-4 text-emerald-500" />,
    },
    ...(peptide.frequency ? [{
      label: 'تكرار الجرعة',
      value: FREQUENCY_LABELS[peptide.frequency] ?? peptide.frequency,
      icon: <Clock className="h-4 w-4 text-blue-500" />,
    }] : []),
    ...(peptide.cycleDurationWeeks ? [{
      label: 'مدة الدورة',
      value: `${peptide.cycleDurationWeeks} أسابيع${peptide.restPeriodWeeks ? ` ← راحة ${peptide.restPeriodWeeks} أسابيع` : ''}`,
      icon: <Activity className="h-4 w-4 text-purple-500" />,
    }] : []),
    ...(peptide.route ? [{
      label: 'طريقة الإعطاء',
      value: ROUTE_LABELS[peptide.route] ?? peptide.route,
      icon: <Syringe className="h-4 w-4 text-orange-500" />,
    }] : []),
  ];

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-4 w-4 text-emerald-700" />
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          معلومات {peptide.nameAr} ({presetName})
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 rounded-xl bg-stone-50 dark:bg-stone-900 p-3">
            {row.icon}
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-300">{row.label}</p>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{row.value}</p>
            </div>
          </div>
        ))}
      </div>
      {peptide.warningAr && (
        <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
          <strong>تحذير:</strong> {peptide.warningAr}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Main Component ─────────────── */

export default function DoseCalculator() {
  const { subscription, isLoading: authLoading } = useAuth();
  const isProOrTrial = !authLoading && (subscription?.isProOrTrial ?? false);
  const [activeTab, setActiveTab] = useState<TabId>('dose');
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mcg');
  const [doseValue, setDoseValue] = useState(250);
  const [vialMg, setVialMg] = useState(5);
  const [waterMl, setWaterMl] = useState(2);
  const [syringeIdx, setSyringeIdx] = useState(2);
  const [showFormulas, setShowFormulas] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [showProtocolWizard, setShowProtocolWizard] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [reconSearch, setReconSearch] = useState('');
  const [searchParams] = useSearchParams();

  // Dose tab extras
  const [bodyWeight, setBodyWeight] = useState(80);
  const [goalLevel, setGoalLevel] = useState<GoalLevel>('moderate');

  // Reconstitution tab
  const [reconVialMg, setReconVialMg] = useState(5);
  const [reconWaterMl, setReconWaterMl] = useState(2);
  const [reconTargetDose, setReconTargetDose] = useState(250);
  const [reconDoseUnit, setReconDoseUnit] = useState<DoseUnit>('mcg');
  const [reconSyringeIdx, setReconSyringeIdx] = useState(2);

  // Cost tab
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [costPeptide, setCostPeptide] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [costVialMg, setCostVialMg] = useState(5);
  const [costDoseMcg, setCostDoseMcg] = useState(250);
  const [costDosesPerDay, setCostDosesPerDay] = useState(1);

  // Unit converter
  const [converterFrom, setConverterFrom] = useState<'mcg' | 'mg' | 'iu'>('mcg');
  const [converterTo, setConverterTo] = useState<'mcg' | 'mg' | 'iu'>('mg');
  const [converterValue, setConverterValue] = useState(250);
  const [converterPeptide, setConverterPeptide] = useState('HGH');

  const [dosesPerDay, setDosesPerDay] = useState(1);
  const [vialPrice, setVialPrice] = useState(0);

  const [savedCalcs, setSavedCalcs] = useState<SavedCalc[]>(() => {
    try {
      const s = localStorage.getItem('pptides_calc_history');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const loadSavedCalc = (calc: SavedCalc) => {
    setSelectedPreset(calc.peptide);
    setDoseValue(calc.dose);
    setDoseUnit(calc.unit as DoseUnit);
    setVialMg(calc.vial);
    setWaterMl(calc.water);
    setActiveTab('dose');
  };

  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from URL params */
  useEffect(() => {
    const peptideParam = searchParams.get('preset') ?? searchParams.get('peptide') ?? '';
    if (peptideParam && !selectedPreset) {
      const preset = PEPTIDE_PRESETS.find(p => p.name.toLowerCase() === peptideParam.toLowerCase());
      if (preset) {
        setSelectedPreset(preset.name);
        setDoseUnit(preset.unit);
        setDoseValue(preset.dose);
        setVialMg(preset.vial);
        setWaterMl(preset.water);
      }
    }
  }, [searchParams, selectedPreset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- auto-load last saved calc */
  useEffect(() => {
    if (selectedPreset) return;
    if (savedCalcs.length > 0) {
      loadSavedCalc(savedCalcs[0]);
    }
  }, [selectedPreset, savedCalcs]);

  const syringe = SYRINGE_OPTIONS[syringeIdx];
  const recommendedWater = getRecommendedWater(vialMg);

  // ── Main dose results ──
  const results = useMemo(() => {
    const doseMcg = doseUnit === 'mg' ? doseValue * 1000 : doseValue;
    if (!vialMg || !waterMl || !doseMcg || vialMg <= 0 || waterMl <= 0 || doseMcg <= 0) {
      return { concentration: 0, volumeMl: 0, syringeUnits: 0, dosesPerVial: 0, doseMcg, monthlyVials: 0, monthlyCost: 0, daysPerVial: 0 };
    }
    const concentration = (vialMg * 1000) / waterMl;
    const volumeMl2 = doseMcg / concentration;
    const syringeUnits = volumeMl2 * syringe.units / syringe.ml;
    const dosesPerVial = (vialMg * 1000) / doseMcg;
    const daysPerVial = dosesPerDay > 0 ? dosesPerVial / dosesPerDay : 0;
    const monthlyVials = daysPerVial > 0 ? 30 / daysPerVial : 0;
    const monthlyCost = vialPrice > 0 ? monthlyVials * vialPrice : 0;
    return { concentration, volumeMl: volumeMl2, syringeUnits, dosesPerVial, doseMcg, monthlyVials, monthlyCost, daysPerVial };
  }, [doseUnit, doseValue, vialMg, waterMl, syringe, dosesPerDay, vialPrice]);

  // ── Body-weight based dose suggestion ──
  const weightBasedDose = useMemo(() => {
    const preset = PEPTIDE_PRESETS.find(p => p.name === selectedPreset);
    if (!preset || !bodyWeight) return null;
    const fullPreset = PEPTIDE_PRESETS_DATA.find(p => p.name === selectedPreset);
    const isWeightBased = fullPreset?.weightBased && fullPreset.mcgPerKgMin && fullPreset.mcgPerKgMax;
    if (isWeightBased) {
      const mult = GOAL_MULTIPLIERS[goalLevel];
      const rangeMid = (fullPreset.mcgPerKgMin! + fullPreset.mcgPerKgMax!) / 2;
      const suggested = Math.round(rangeMid * bodyWeight * mult);
      const clamped = Math.min(Math.max(suggested, preset.minDose), preset.maxDose);
      const weightMin = Math.round(fullPreset.mcgPerKgMin! * bodyWeight);
      const weightMax = Math.round(fullPreset.mcgPerKgMax! * bodyWeight);
      return { suggested: clamped, min: preset.minDose, max: preset.maxDose, isWeightBased: true, mcgPerKgMin: fullPreset.mcgPerKgMin!, mcgPerKgMax: fullPreset.mcgPerKgMax!, weightMin, weightMax };
    }
    // Fixed-dose peptides — use preset dose × goal multiplier
    const baseDose = preset.dose;
    const mult = GOAL_MULTIPLIERS[goalLevel];
    const suggested = Math.round(baseDose * mult);
    const clamped = Math.min(Math.max(suggested, preset.minDose), preset.maxDose);
    return { suggested: clamped, min: preset.minDose, max: preset.maxDose, isWeightBased: false };
  }, [selectedPreset, bodyWeight, goalLevel]);

  // ── Reconstitution results ──
  const reconResults = useMemo(() => {
    const doseMcg = reconDoseUnit === 'mg' ? reconTargetDose * 1000 : reconTargetDose;
    if (!reconVialMg || !reconWaterMl || !doseMcg || reconVialMg <= 0 || reconWaterMl <= 0 || doseMcg <= 0) {
      return { concentration: 0, volumeMl: 0, syringeUnits: 0, dosesPerVial: 0, doseMcg };
    }
    const reconSyringe = SYRINGE_OPTIONS[reconSyringeIdx];
    const concentration = (reconVialMg * 1000) / reconWaterMl;
    const volumeMl2 = doseMcg / concentration;
    const syringeUnits = volumeMl2 * reconSyringe.units / reconSyringe.ml;
    const dosesPerVial = (reconVialMg * 1000) / doseMcg;
    return { concentration, volumeMl: volumeMl2, syringeUnits, dosesPerVial, doseMcg };
  }, [reconVialMg, reconWaterMl, reconTargetDose, reconDoseUnit, reconSyringeIdx]);

  // ── Converter result ──
  const converterResult = useMemo(() => {
    const iuFactor = IU_FACTORS[converterPeptide]?.factor ?? 3;
    // If factor is 0 and IU is involved, conversion is not possible
    if (iuFactor === 0 && (converterFrom === 'iu' || converterTo === 'iu')) return NaN;
    let valueMcg = converterValue;
    if (converterFrom === 'mg') valueMcg = converterValue * 1000;
    else if (converterFrom === 'iu') valueMcg = (converterValue / iuFactor) * 1000;

    if (converterTo === 'mcg') return valueMcg;
    if (converterTo === 'mg') return valueMcg / 1000;
    return (valueMcg / 1000) * iuFactor; // IU
  }, [converterValue, converterFrom, converterTo, converterPeptide]);

  // ── Cost comparison results ──
  const costResults = useMemo(() => {
    return costEntries.map(entry => {
      const dosesPerVial = entry.doseMcg > 0 ? (entry.vialMg * 1000) / entry.doseMcg : 0;
      const costPerDose = dosesPerVial > 0 ? entry.pricePerVial / dosesPerVial : 0;
      const costPerWeek = costPerDose * entry.dosesPerDay * 7;
      const costPerMonth = costPerWeek * (30 / 7);
      const costPerCycle12w = costPerWeek * 12;
      return {
        ...entry,
        dosesPerVial,
        costPerDose,
        costPerWeek,
        costPerMonth,
        costPerCycle12w,
      };
    });
  }, [costEntries]);

  const saveCurrentCalc = useCallback(() => {
    if (!selectedPreset || !isFinite(results.syringeUnits) || results.syringeUnits <= 0) {
      toast.error('اختر ببتيدًا أولًا لحفظ الحساب');
      return;
    }
    const entry: SavedCalc = { peptide: selectedPreset, dose: doseValue, unit: doseUnit, vial: vialMg, water: waterMl, units: results.syringeUnits.toFixed(1), ts: Date.now() };
    const updated = [entry, ...savedCalcs.filter(c => c.peptide !== selectedPreset)].slice(0, 10);
    setSavedCalcs(updated);
    try { localStorage.setItem('pptides_calc_history', JSON.stringify(updated)); } catch { /* quota */ }
    toast.success(`تم حفظ حساب ${selectedPreset}`);
  }, [selectedPreset, doseValue, doseUnit, vialMg, waterMl, results.syringeUnits, savedCalcs]);

  const shareCalculation = useCallback(async () => {
    if (!selectedPreset || !isFinite(results.syringeUnits) || results.syringeUnits <= 0) {
      toast.error('اختر ببتيدًا أولًا');
      return;
    }
    const text = `حساب جرعة ${selectedPreset} على pptides:\n` +
      `الجرعة: ${doseValue} ${doseUnit}\n` +
      `القارورة: ${vialMg} mg | الماء: ${waterMl} ml\n` +
      `وحدات السيرنج: ${results.syringeUnits.toFixed(1)}\n` +
      `الكمية: ${results.volumeMl.toFixed(3)} ml\n` +
      `جرعات في القارورة: ${Math.floor(results.dosesPerVial)}\n\n` +
      `${SITE_URL}/calculator?preset=${encodeURIComponent(selectedPreset)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `حساب جرعة ${selectedPreset}`, text }); } catch { /* cancelled */ }
    } else {
      const ok = await copyToClipboard(text);
      if (ok) { toast.success('تم نسخ الحساب'); }
      else { toast.error('تعذّر النسخ'); }
    }
  }, [selectedPreset, doseValue, doseUnit, vialMg, waterMl, results]);

  const COMMON_PROTOCOLS = useMemo<{ name: string; peptides: string[]; icon: LucideIcon }[]>(() => [
    { name: 'فقدان الوزن', peptides: ['Semaglutide', 'Tirzepatide'], icon: Activity },
    { name: 'بناء العضلات', peptides: ['CJC-1295/Ipamorelin', 'BPC-157'], icon: Dumbbell },
    { name: 'التعافي', peptides: ['BPC-157', 'TB-500'], icon: Heart },
    { name: 'مكافحة الشيخوخة', peptides: ['Epithalon', 'GHK-Cu'], icon: Timer },
    { name: 'النوم والاسترخاء', peptides: ['DSIP', 'Selank'], icon: Moon },
  ], []);

  const selectPreset = useCallback((presetName: string) => {
    const preset = PEPTIDE_PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    setSelectedPreset(preset.name);
    setDoseUnit(preset.unit);
    setDoseValue(preset.dose);
    setVialMg(preset.vial);
    setWaterMl(preset.water);
    // Also sync reconstitution tab
    setReconVialMg(preset.vial);
    setReconWaterMl(preset.water);
    setReconTargetDose(preset.dose);
    setReconDoseUnit(preset.unit);
  }, []);

  const addCostEntry = useCallback(() => {
    if (!costPeptide || costPrice <= 0) {
      toast.error('أدخل الببتيد والسعر');
      return;
    }
    setCostEntries(prev => [...prev, {
      peptide: costPeptide,
      pricePerVial: costPrice,
      vialMg: costVialMg,
      doseMcg: costDoseMcg,
      dosesPerDay: costDosesPerDay,
    }]);
    toast.success(`تمت إضافة ${costPeptide}`);
  }, [costPeptide, costPrice, costVialMg, costDoseMcg, costDosesPerDay]);

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>حاسبة جرعات الببتيدات | احسب الجرعة بدقة | pptides</title>
        <meta
          name="description"
          content="أشمل حاسبة عربية لجرعات الببتيدات — حساب الجرعة، التخفيف، التكلفة، ومحوّل الوحدات. أداة مجانية 100%. Free peptide calculator."
        />
        <meta name="keywords" content="حاسبة ببتيدات, peptide calculator, جرعات ببتيدات, BPC-157, reconstitution calculator, حاسبة جرعات" />
        <meta property="og:title" content="حاسبة جرعات الببتيدات | pptides" />
        <meta property="og:description" content="احسب جرعتك بدقة خلال ثوانٍ — أداة مجانية لحساب جرعات 30+ ببتيد" />
        <meta property="og:url" content={`${SITE_URL}/calculator`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="حاسبة جرعات الببتيدات | pptides" />
        <meta name="twitter:description" content="احسب جرعتك بدقة خلال ثوانٍ — أداة مجانية لحساب جرعات 30+ ببتيد" />
        <link rel="canonical" href={`${SITE_URL}/calculator`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'حاسبة جرعات الببتيدات',
          url: `${SITE_URL}/calculator`,
          description: 'أشمل حاسبة عربية لجرعات الببتيدات — حساب الجرعة، التخفيف، التكلفة، ومحوّل الوحدات.',
          applicationCategory: 'HealthApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
          inLanguage: 'ar',
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        <div role="alert" className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <Shield className="h-5 w-5 mt-0.5 shrink-0" />
          <p>هذه الحاسبة للأغراض التعليمية فقط — لا تُعتبر وصفة طبية. استشر طبيبك قبل تعديل أي جرعة.</p>
        </div>
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Calculator className="h-7 w-7 text-emerald-700" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
              حاسبة جرعات الببتيدات
            </h1>
            <Tooltip
              content="أشمل حاسبة عربية — حساب الجرعة، التخفيف، التكلفة الشهرية، ومحوّل الوحدات. اختر بروتوكولًا شائعًا للبدء السريع."
              firstTimeId="calculator-main"
              position="bottom"
            />
          </div>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
            أداة مجانية — احسب جرعتك بدقة خلال ثوانٍ
          </p>
        </div>

        {/* Medical disclaimer */}
        <div role="alert" className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center text-sm text-amber-800 dark:text-amber-300">
          <Shield className="mx-auto mb-1 h-5 w-5" />
          هذه الحاسبة للأغراض التعليمية فقط — استشر طبيبك قبل تعديل أي جرعة
        </div>

        {/* ═══════════════ SUBSCRIPTION GATE ═══════════════ */}
        {!authLoading && !isProOrTrial && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-8 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">اشترك للوصول الكامل</h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4 max-w-md mx-auto">
              حاسبة الجرعات الكاملة متاحة للمشتركين — حساب الجرعة، التخفيف، التكلفة الشهرية، ومحوّل الوحدات
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              اشترك الآن
            </Link>
          </div>
        )}

        {/* ═══════════════ TABS ═══════════════ */}
        {isProOrTrial && <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 min-h-[44px] text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-300 hover:text-emerald-700',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>}

        {/* ═══════════════ TAB 1: DOSE CALCULATOR ═══════════════ */}
        {isProOrTrial && activeTab === 'dose' && (
          <div role="tabpanel" id="panel-dose" aria-labelledby="tab-dose">
            {/* Common Protocols Quick-Select */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">بروتوكولات شائعة</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                {COMMON_PROTOCOLS.map((proto) => (
                  <button
                    key={proto.name}
                    onClick={() => {
                      const firstPeptide = proto.peptides[0];
                      const preset = PEPTIDE_PRESETS.find(p => p.name === firstPeptide);
                      if (preset) {
                        selectPreset(preset.name);
                        toast.success(`بروتوكول ${proto.name}: ${proto.peptides.join(' + ')}`);
                      }
                    }}
                    className="flex shrink-0 items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:shadow-sm"
                  >
                    <proto.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-start">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{proto.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300" dir="ltr">{proto.peptides.join(' + ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Peptide Preset Selector */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-stone-900 dark:text-stone-100 text-center">اختر الببتيد لتعبئة القيم تلقائيًا</label>
              <div className="mb-3 relative">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 dark:text-stone-300" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="ابحث عن ببتيد..."
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 ps-10 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-500 dark:text-stone-300 dark:placeholder:text-stone-500 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none"
                  aria-label="ابحث عن ببتيد"
                />
              </div>
              {(() => {
                const normalize = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase();
                const q = normalize(presetSearch.trim());
                const filtered =
                  q === ''
                    ? PEPTIDE_PRESETS
                    : PEPTIDE_PRESETS.filter(
                        (p) =>
                          p.name.toLowerCase().includes(q) ||
                          normalize(getPresetDisplayName(p.name)).includes(q),
                      );
                const isCollapsed = !showAllPresets && q === '';
                const visible = isCollapsed ? filtered.slice(0, POPULAR_PRESET_COUNT) : filtered;
                const hasMore = isCollapsed && filtered.length > POPULAR_PRESET_COUNT;
                return (
                  <>
                    <div
                      className={cn(
                        'flex gap-2',
                        isCollapsed ? 'overflow-x-auto flex-nowrap scrollbar-hide scroll-fade -mx-1 px-1' : 'flex-wrap justify-center',
                      )}
                    >
                      {visible.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => selectPreset(p.name)}
                          className={cn(
                            'rounded-full border px-3 py-2 min-h-[44px] text-xs transition-all active:scale-[0.98] shrink-0',
                            selectedPreset === p.name
                              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-400 font-bold shadow-sm'
                              : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-medium hover:border-emerald-300 hover:text-emerald-700',
                          )}
                        >
                          {getPresetDisplayName(p.name)}
                        </button>
                      ))}
                    </div>
                    {hasMore && (
                      <div className="mt-2 text-center">
                        <button
                          onClick={() => setShowAllPresets(true)}
                          className="min-h-[44px] text-xs font-medium text-emerald-700 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          عرض الكل ({PEPTIDE_PRESETS.length}+)
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Body Weight + Goal Level */}
            <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">حساب حسب الوزن والهدف</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="calc-body-weight" className="block text-sm font-medium text-stone-800 dark:text-stone-200">وزن الجسم (كجم)</label>
                  <input
                    id="calc-body-weight"
                    type="number"
                    inputMode="decimal"
                    min={30}
                    max={200}
                    step={1}
                    value={bodyWeight}
                    onChange={(e) => setBodyWeight(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
                <div className="space-y-2" role="group" aria-labelledby="calc-goal-label">
                  <label id="calc-goal-label" className="block text-sm font-medium text-stone-800 dark:text-stone-200">مستوى الهدف</label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-1">
                    {(Object.keys(GOAL_LABELS) as GoalLevel[]).map(g => (
                      <button
                        key={g}
                        onClick={() => setGoalLevel(g)}
                        title={GOAL_SUBTITLES[g]}
                        className={cn(
                          'flex-1 rounded-lg py-2 min-h-[44px] text-xs font-medium transition-all flex flex-col items-center gap-0.5',
                          goalLevel === g
                            ? g === 'aggressive' ? 'bg-red-500 text-white' : g === 'therapeutic' ? 'bg-blue-500 text-white' : 'bg-emerald-600 text-white'
                            : 'text-stone-700 dark:text-stone-200 hover:text-stone-900',
                        )}
                      >
                        <span>{GOAL_LABELS[g]}</span>
                        <span className={cn('text-[9px] leading-tight opacity-80', goalLevel === g ? 'opacity-90' : 'opacity-60')}>
                          {g === 'therapeutic' ? 'مبتدئ' : g === 'moderate' ? 'معيار' : 'متقدم'}
                        </span>
                      </button>
                    ))}
                  </div>
                  {goalLevel !== 'moderate' && (
                    <p className="text-xs text-stone-500 dark:text-stone-300">{GOAL_SUBTITLES[goalLevel]}</p>
                  )}
                </div>
              </div>
              {weightBasedDose && selectedPreset && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 px-4 py-3">
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-300">الجرعة المقترحة لـ {selectedPreset}</p>
                    <p className="text-lg font-bold text-emerald-700">{weightBasedDose.suggested} مكغ</p>
                    {weightBasedDose.isWeightBased ? (
                      <>
                        <p className="text-xs text-stone-500 dark:text-stone-300">
                          حسب الوزن: {weightBasedDose.mcgPerKgMin}–{weightBasedDose.mcgPerKgMax} مكغ/كجم × {bodyWeight} كجم = {weightBasedDose.weightMin}–{weightBasedDose.weightMax} مكغ
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-300">النطاق: {weightBasedDose.min} – {weightBasedDose.max} مكغ</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-amber-600 dark:text-amber-400">جرعة ثابتة — لا تعتمد على الوزن</p>
                        <p className="text-xs text-stone-500 dark:text-stone-300">النطاق: {weightBasedDose.min} – {weightBasedDose.max} مكغ</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setDoseUnit('mcg');
                      setDoseValue(weightBasedDose.suggested);
                    }}
                    className="rounded-full bg-emerald-600 px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    استخدم
                  </button>
                </div>
              )}
            </div>

            {/* Empty-state guidance — shown when no peptide selected and no saved calcs */}
            {!selectedPreset && savedCalcs.length === 0 && (
              <div className="mb-6 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10 p-6 text-center">
                <Calculator className="mx-auto mb-3 h-8 w-8 text-emerald-500 opacity-70" />
                <p className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">ابدأ باختيار ببتيد 👆</p>
                <p className="text-sm text-stone-600 dark:text-stone-300">اختر ببتيدًا من القائمة أعلاه لتعبئة جميع القيم تلقائيًا، أو أدخل القيم يدويًا أدناه.</p>
                <div className="mt-3 flex justify-center gap-3 text-xs text-stone-500 dark:text-stone-300">
                  <span>① اختر ببتيد</span>
                  <span>←</span>
                  <span>② عدّل الجرعة</span>
                  <span>←</span>
                  <span>③ اقرأ النتيجة</span>
                </div>
              </div>
            )}

            {/* Calculator Card */}
            <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6 md:p-8">
              {/* Dose Unit Toggle */}
              <div className="mb-6 flex items-center justify-center gap-1">
                <span className="ms-3 text-sm text-stone-800 dark:text-stone-200">وحدة الجرعة:</span>
                <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-1">
                  <button
                    onClick={() => {
                      if (doseUnit === 'mg') {
                        setDoseValue(prev => +(prev * 1000).toPrecision(10));
                        setDoseUnit('mcg');
                      }
                    }}
                    className={cn(
                      'rounded-lg px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                      doseUnit === 'mcg' ? 'bg-emerald-500 text-white' : 'text-stone-800 dark:text-stone-200',
                    )}
                  >
                    مايكروغرام (mcg)
                  </button>
                  <button
                    onClick={() => {
                      if (doseUnit === 'mcg') {
                        setDoseValue(prev => +(prev / 1000).toPrecision(10));
                        setDoseUnit('mg');
                      }
                    }}
                    className={cn(
                      'rounded-lg px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                      doseUnit === 'mg' ? 'bg-emerald-500 text-white' : 'text-stone-800 dark:text-stone-200',
                    )}
                  >
                    ملليغرام (mg)
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="mb-6 grid gap-5 md:grid-cols-3">
                <InputField
                  label={`الجرعة المطلوبة (${doseUnit === 'mcg' ? 'مايكروغرام' : 'ملليغرام'})`}
                  value={doseValue}
                  onChange={(v) => setDoseValue(Math.min(doseUnit === 'mcg' ? 100000 : 100, Math.max(0, v)))}
                  unit={doseUnit === 'mcg' ? 'مكغ' : 'ملغ'}
                  step={doseUnit === 'mcg' ? 50 : 0.05}
                  min={0}
                  max={doseUnit === 'mcg' ? 100000 : 100}
                />
                <InputField
                  label="كمية الببتيد في القارورة (ملغ)"
                  value={vialMg}
                  onChange={(v) => setVialMg(Math.min(1000, Math.max(0.1, v)))}
                  unit="ملغ"
                  step={1}
                  min={0.1}
                  max={1000}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="calc-water" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
                      كمية الماء البكتيريوستاتك (مل)
                    </label>
                    <Tooltip content="الماء البكتيريوستاتك هو ماء معقم يُضاف لإذابة الببتيد. كمية أكبر = تركيز أقل = سحب أسهل." position="bottom" />
                  </div>
                  <div className="relative">
                    <input
                      id="calc-water"
                      type="number"
                      inputMode="decimal"
                      min={0.1}
                      step={0.5}
                      value={waterMl}
                      onChange={(e) => setWaterMl(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      aria-label="كمية الماء البكتيريوستاتك (مل)"
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 pe-16 text-base text-stone-900 dark:text-stone-100 transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-stone-700 dark:text-stone-200">مل</span>
                  </div>
                  {waterMl === 0 && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">أدخل كمية ماء أكبر من صفر</p>
                  )}
                  {waterMl !== recommendedWater && vialMg > 0 && waterMl > 0 && (
                    !selectedPreset ? (
                      <div className="mt-1 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">
                          الكمية الموصى بها: <strong>{recommendedWater} مل</strong>
                        </span>
                        <button
                          onClick={() => setWaterMl(recommendedWater)}
                          className="rounded-md bg-emerald-600 px-3 py-2 min-h-[44px] text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                        >
                          تعبئة
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWaterMl(recommendedWater)}
                        className="text-xs text-emerald-700/70 transition-colors hover:underline"
                      >
                        الكمية المُوصى بها: {recommendedWater} مل
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Syringe Size Selector */}
              <div className="mb-8">
                <label htmlFor="calc-syringe" className="mb-2 block text-sm font-medium text-stone-800 dark:text-stone-200">حجم السيرنج</label>
                <div className="relative">
                  <select
                    id="calc-syringe"
                    value={syringeIdx}
                    onChange={(e) => setSyringeIdx(Number(e.target.value))}
                    aria-label="حجم السيرنج"
                    className="w-full appearance-none rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 pe-10 text-base text-stone-900 dark:text-stone-100 transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
                  >
                    {SYRINGE_OPTIONS.map((opt, i) => (
                      <option key={opt.label} value={i} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-700 dark:text-stone-200" />
                </div>
              </div>

              {/* Frequency + Cost */}
              <div className="mb-8 grid gap-5 md:grid-cols-2">
                <div className="space-y-2" role="group" aria-labelledby="calc-freq-label">
                  <label id="calc-freq-label" className="block text-sm font-medium text-stone-800 dark:text-stone-200">تكرار الجرعة</label>
                  <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                    {([
                      { label: '3×/أسبوع', value: 3 / 7, hint: '3 مرات أسبوعيًا' },
                      { label: 'يوم/يوم', value: 0.5, hint: 'يوم بعد يوم (كل يومين)' },
                      { label: 'يوميًا', value: 1, hint: 'مرة كل يوم' },
                      { label: '2×/يوم', value: 2, hint: 'مرتين يوميًا' },
                      { label: '3×/يوم', value: 3, hint: '3 مرات يوميًا' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setDosesPerDay(opt.value)}
                        title={opt.hint}
                        className={cn(
                          'shrink-0 rounded-xl px-3 py-2 min-h-[44px] text-xs font-medium transition-all border',
                          Math.abs(dosesPerDay - opt.value) < 0.01
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-emerald-300',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="calc-vial-price" className="block text-sm font-medium text-stone-800 dark:text-stone-200">
                    سعر القارورة (ر.س) <span className="text-xs text-emerald-700 font-normal me-1">اختياري</span>
                  </label>
                  <input
                    id="calc-vial-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={5}
                    value={vialPrice || ''}
                    onChange={e => setVialPrice(Number(e.target.value))}
                    placeholder="مثال: 40"
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Results + Syringe Visual */}
              <div className="flex flex-col items-stretch gap-6 md:flex-row">
                <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ResultCard label="التركيز" value={fmt(results.concentration, 0)} unit="مكغ/مل" />
                  <ResultCard label="الكمية المطلوبة" value={fmt(results.volumeMl, 3)} unit="مل" />
                  <ResultCard label="وحدات السيرنج" value={fmt(results.syringeUnits, 1)} unit={`وحدة (${syringe.label.split('(')[0].trim()})`} />
                  <ResultCard label="عدد الجرعات في القارورة" value={fmt(results.dosesPerVial, 0)} unit="جرعة" />
                </div>
                <div className="flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-6 min-h-[200px] md:w-[140px]">
                  <SyringeVisual drawUnits={results.syringeUnits} syringeOption={syringe} />
                </div>
              </div>

              {/* Overflow warning */}
              {isFinite(results.syringeUnits) && results.syringeUnits > syringe.units && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    الجرعة تتجاوز سعة السيرنج ({syringe.units} وحدة). استخدم سيرنجًا أكبر أو أضف ماءً أقل.
                  </p>
                </div>
              )}

              {/* Reconstitution Guide */}
              {selectedPreset && isFinite(results.syringeUnits) && results.syringeUnits > 0 && (
                <div className="mt-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-5">
                  <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">دليل التحضير — {selectedPreset}</h3>
                  <div className="space-y-3">
                    <GuideStep step="1" text={`اسحب ${waterMl} مل ماء بكتيريوستاتي وأضفه على قارورة ${vialMg} ملغ ${selectedPreset}. أدخل الإبرة ببطء على جدار القارورة.`} />
                    <GuideStep step="2" text="حرّك القارورة بلطف بحركة دائرية. لا ترجّها أبدًا. انتظر حتى يذوب المسحوق بالكامل (1-2 دقيقة)." />
                    <GuideStep step="3" text={`بسرنجة إنسولين (${syringe.label})، اسحب ${fmt(results.syringeUnits, 1)} وحدة. هذه جرعتك (${doseUnit === 'mg' ? `${doseValue} ملغ` : `${doseValue} مايكروغرام`}).`} />
                    <GuideStep step="4" text={`احقن تحت الجلد في البطن أو الفخذ. خزّن القارورة في الثلاجة 2-8°C — تصلح لـ ${vialMg >= 5 ? '28' : '14'} يوم بعد التحضير.`} />
                  </div>
                </div>
              )}

              {/* Dose safety warning */}
              {selectedPreset && (() => {
                const preset = PEPTIDE_PRESETS.find(p => p.name === selectedPreset);
                const fullPreset = PEPTIDE_PRESETS_DATA.find(p => p.name === selectedPreset);
                if (!preset || !fullPreset) return null;
                // Normalize everything to mcg for comparison (preset min/max are in the preset's native unit)
                const doseMcg = doseUnit === 'mg' ? doseValue * 1000 : doseValue;
                const minMcg = fullPreset.unit === 'mg' ? preset.minDose * 1000 : preset.minDose;
                const maxMcg = fullPreset.unit === 'mg' ? preset.maxDose * 1000 : preset.maxDose;
                const rangeDisplay = fullPreset.unit === 'mg'
                  ? `${preset.minDose}–${preset.maxDose} mg`
                  : `${preset.minDose}–${preset.maxDose} mcg`;
                const doseDisplay = fullPreset.unit === 'mg'
                  ? `${doseValue} ${doseUnit}`
                  : `${doseMcg} mcg`;
                if (doseMcg > maxMcg) {
                  return (
                    <div className="mt-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                      <p className="text-sm font-bold text-red-800 dark:text-red-300">جرعة مرتفعة — استشر طبيبك</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">الجرعة المدخلة ({doseDisplay}) تتجاوز الحد الأعلى الموصى به لـ {preset.name} ({rangeDisplay}).</p>
                    </div>
                  );
                }
                if (doseMcg < minMcg) {
                  return (
                    <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">جرعة منخفضة</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">الجرعة ({doseDisplay}) أقل من الحد الأدنى الفعّال لـ {preset.name} ({rangeDisplay}).</p>
                    </div>
                  );
                }
                return (
                  <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">✓ الجرعة ضمن النطاق الموصى به لـ {preset.name} ({rangeDisplay})</p>
                  </div>
                );
              })()}

              {/* Monthly Planning */}
              {isFinite(results.dosesPerVial) && results.dosesPerVial > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-300 mb-1">عمر القارورة</p>
                    <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      {results.daysPerVial < 1 ? 'أقل من يوم' :
                       results.daysPerVial <= 7 ? `${Math.floor(results.daysPerVial)} أيام` :
                       `~${Math.floor(results.daysPerVial / 7)} أسابيع`}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">
                      {fmt(results.dosesPerVial, 0)} جرعة ×{' '}
                      {Math.abs(dosesPerDay - 3 / 7) < 0.01 ? '3×/أسبوع' : Math.abs(dosesPerDay - 0.5) < 0.01 ? 'يوم/يوم' : `${dosesPerDay}/يوم`}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">خزّن في الثلاجة (2-8°C)</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-300 mb-1">قوارير في الشهر</p>
                    <p className="text-lg font-bold text-stone-900 dark:text-stone-100">{Math.ceil(results.monthlyVials)} قوارير</p>
                    {results.monthlyCost > 0 ? (
                      <p className="text-xs font-bold text-emerald-700 mt-1">~{Math.round(results.monthlyCost)} ر.س/شهر</p>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">أدخل سعر القارورة لحساب التكلفة</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={saveCurrentCalc}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 hover:shadow-md min-h-[44px]"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span className="text-xs">احفظ</span>
                    </button>
                    <button
                      onClick={shareCalculation}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 font-bold text-blue-700 dark:text-blue-400 transition-all hover:bg-blue-100 hover:shadow-md min-h-[44px]"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="text-xs">شارك</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CTAs */}
              {selectedPreset && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Link
                    to={`/tracker?peptide=${encodeURIComponent(selectedPreset || 'Custom')}&dose=${doseValue}&unit=${doseUnit}`}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 font-bold text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md min-w-[140px] min-h-[44px]"
                  >
                    <Syringe className="h-5 w-5" />
                    <span className="text-sm">سجّل حقنة</span>
                  </Link>
                  <Link
                    to="/guide"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 font-bold text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md min-w-[140px] min-h-[44px]"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="text-sm">كيف أحقن؟</span>
                  </Link>
                  {findPeptideByPreset(selectedPreset) && (
                    <button
                      onClick={() => setShowProtocolWizard(true)}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md min-w-[140px] min-h-[44px]"
                    >
                      <Play className="h-5 w-5" />
                      <span className="text-sm">ابدأ بروتوكول</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Peptide Reference Card */}
            {selectedPreset && (
              <div className="mb-6">
                <PeptideReferenceCard presetName={selectedPreset} />
              </div>
            )}

            {/* Saved Calculations */}
            {savedCalcs.length > 0 && (
              <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-5">
                <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">
                  <Bookmark className="inline h-4 w-4 me-1 text-emerald-700" />
                  حساباتك المحفوظة ({savedCalcs.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedCalcs.map((calc, idx) => (
                    <button
                      key={`${calc.peptide}-${idx}`}
                      onClick={() => loadSavedCalc(calc)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-4 py-3 min-h-[44px] text-start transition-all hover:shadow-sm',
                        selectedPreset === calc.peptide ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 hover:border-emerald-300'
                      )}
                    >
                      <div>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">{calc.peptide}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-300">{calc.dose} {calc.unit} — {calc.units} وحدة</p>
                      </div>
                      <span className="text-xs text-stone-500 dark:text-stone-300">{new Date(calc.ts).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ TAB 2: RECONSTITUTION CALCULATOR ═══════════════ */}
        {isProOrTrial && activeTab === 'reconstitution' && (
          <div role="tabpanel" id="panel-reconstitution" aria-labelledby="tab-reconstitution" className="space-y-6">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <FlaskConical className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">حاسبة التخفيف (Reconstitution)</h2>
              </div>

              {/* Quick Peptide Select for Recon — searchable, full list */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-800 dark:text-stone-200 mb-2">اختر ببتيد لتعبئة القيم تلقائيًا</label>
                <div className="mb-2 relative">
                  <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 dark:text-stone-300" />
                  <input
                    type="text"
                    value={reconSearch}
                    onChange={e => setReconSearch(e.target.value)}
                    placeholder="ابحث عن ببتيد..."
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 ps-10 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-500 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none"
                    aria-label="بحث ببتيد للتخفيف"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const normalize = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase();
                    const q = normalize(reconSearch.trim());
                    const filtered = q === ''
                      ? PEPTIDE_PRESETS
                      : PEPTIDE_PRESETS.filter(p =>
                          p.name.toLowerCase().includes(q) ||
                          normalize(getPresetDisplayName(p.name)).includes(q),
                        );
                    return filtered.map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setReconVialMg(p.vial);
                          setReconWaterMl(p.water);
                          setReconTargetDose(p.dose);
                          setReconDoseUnit(p.unit);
                        }}
                        className="shrink-0 rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 min-h-[44px] text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                      >
                        {getPresetDisplayName(p.name)}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Vial Size */}
                <div className="space-y-2">
                  <label htmlFor="recon-vial-mg" className="block text-sm font-medium text-stone-800 dark:text-stone-200">حجم القارورة (ملغ)</label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-1">
                    {[5, 10, 15, 20, 30].map(mg => (
                      <button key={mg} onClick={() => setReconVialMg(mg)}
                        className={cn('flex-1 rounded-lg py-2.5 min-h-[44px] text-sm font-medium transition-all', reconVialMg === mg ? 'bg-emerald-600 text-white' : 'text-stone-700 dark:text-stone-200')}
                      >
                        {mg}
                      </button>
                    ))}
                  </div>
                  <input
                    id="recon-vial-mg"
                    type="number" inputMode="decimal" min={0.5} step={0.5} value={reconVialMg}
                    onChange={e => setReconVialMg(Math.min(1000, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                    placeholder="أو أدخل قيمة مخصصة"
                  />
                </div>

                {/* Water Volume */}
                <div className="space-y-2">
                  <label htmlFor="recon-water-ml" className="block text-sm font-medium text-stone-800 dark:text-stone-200">كمية الماء (مل)</label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-1">
                    {[1, 2, 3, 5].map(ml => (
                      <button key={ml} onClick={() => setReconWaterMl(ml)}
                        className={cn('flex-1 rounded-lg py-2.5 min-h-[44px] text-sm font-medium transition-all', reconWaterMl === ml ? 'bg-emerald-600 text-white' : 'text-stone-700 dark:text-stone-200')}
                      >
                        {ml}
                      </button>
                    ))}
                  </div>
                  <input
                    id="recon-water-ml"
                    type="number" inputMode="decimal" min={0.1} step={0.5} value={reconWaterMl}
                    onChange={e => setReconWaterMl(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                    placeholder="أو أدخل قيمة مخصصة"
                  />
                </div>

                {/* Target Dose */}
                <div className="space-y-2">
                  <label htmlFor="recon-target-dose" className="block text-sm font-medium text-stone-800 dark:text-stone-200">الجرعة المطلوبة</label>
                  <div className="flex gap-2">
                    <input
                      id="recon-target-dose"
                      type="number" inputMode="decimal" min={0} step={reconDoseUnit === 'mcg' ? 50 : 0.05}
                      value={reconTargetDose}
                      onChange={e => setReconTargetDose(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))}
                      className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                    />
                    <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 p-1">
                      <button onClick={() => setReconDoseUnit('mcg')}
                        className={cn('rounded-lg px-3 py-2 min-h-[44px] text-sm font-medium', reconDoseUnit === 'mcg' ? 'bg-emerald-500 text-white' : 'text-stone-700 dark:text-stone-200')}>
                        mcg
                      </button>
                      <button onClick={() => setReconDoseUnit('mg')}
                        className={cn('rounded-lg px-3 py-2 min-h-[44px] text-sm font-medium', reconDoseUnit === 'mg' ? 'bg-emerald-500 text-white' : 'text-stone-700 dark:text-stone-200')}>
                        mg
                      </button>
                    </div>
                  </div>
                </div>

                {/* Syringe */}
                <div className="space-y-2">
                  <label htmlFor="recon-syringe" className="block text-sm font-medium text-stone-800 dark:text-stone-200">حجم السيرنج</label>
                  <div className="relative">
                    <select
                      id="recon-syringe"
                      value={reconSyringeIdx}
                      onChange={e => setReconSyringeIdx(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 pe-10 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                    >
                      {SYRINGE_OPTIONS.map((opt, i) => (
                        <option key={opt.label} value={i}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 dark:text-stone-300" />
                  </div>
                </div>
              </div>

              {/* Reconstitution Results */}
              <div className="mt-8 flex flex-col items-stretch gap-6 md:flex-row">
                <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ResultCard label="التركيز" value={fmt(reconResults.concentration, 0)} unit="مكغ/مل" />
                  <ResultCard label="الكمية المطلوبة" value={fmt(reconResults.volumeMl, 3)} unit="مل" />
                  <ResultCard label="وحدات السيرنج" value={fmt(reconResults.syringeUnits, 1)} unit="وحدة" />
                  <ResultCard label="جرعات في القارورة" value={fmt(reconResults.dosesPerVial, 0)} unit="جرعة" />
                </div>
                <div className="flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-6 min-h-[200px] md:w-[140px]">
                  <SyringeVisual drawUnits={reconResults.syringeUnits} syringeOption={SYRINGE_OPTIONS[reconSyringeIdx]} />
                </div>
              </div>

              {/* Copy / Share reconstitution result */}
              {isFinite(reconResults.syringeUnits) && reconResults.syringeUnits > 0 && (
                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    onClick={async () => {
                      const reconSyringe = SYRINGE_OPTIONS[reconSyringeIdx];
                      const text =
                        `نتيجة حاسبة التخفيف (pptides):\n` +
                        `القارورة: ${reconVialMg} mg | الماء: ${reconWaterMl} ml\n` +
                        `التركيز: ${fmt(reconResults.concentration, 0)} مكغ/مل\n` +
                        `الجرعة المطلوبة: ${reconTargetDose} ${reconDoseUnit}\n` +
                        `اسحب إلى: ${fmt(reconResults.syringeUnits, 1)} وحدة (${fmt(reconResults.volumeMl, 3)} ml)\n` +
                        `جرعات في القارورة: ${fmt(reconResults.dosesPerVial, 0)}\n` +
                        `السيرنج: ${reconSyringe.label}\n\n` +
                        `${SITE_URL}/calculator`;
                      if (navigator.share) {
                        try { await navigator.share({ title: 'نتيجة حاسبة التخفيف', text }); } catch { /* cancelled */ }
                      } else {
                        const ok = await copyToClipboard(text);
                        if (ok) { toast.success('تم نسخ النتيجة'); }
                        else { toast.error('تعذّر النسخ'); }
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 min-h-[44px] text-sm font-bold text-blue-700 dark:text-blue-400 transition-all hover:bg-blue-100"
                  >
                    <Share2 className="h-4 w-4" />
                    شارك / انسخ النتيجة
                  </button>
                </div>
              )}

              {/* Overflow warning */}
              {isFinite(reconResults.syringeUnits) && reconResults.syringeUnits > SYRINGE_OPTIONS[reconSyringeIdx].units && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">الجرعة تتجاوز سعة السيرنج! استخدم سيرنجًا أكبر أو أضف ماءً أقل.</p>
                </div>
              )}

              {/* Insulin Syringe Explainer */}
              <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-5">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
                  <Syringe className="inline h-4 w-4 me-1 text-blue-500" />
                  فهم وحدات سيرنج الإنسولين
                </h3>
                <div className="space-y-2 text-xs text-stone-700 dark:text-stone-200">
                  <p>• سيرنج 100 وحدة = 1 مل. كل علامة = 1 وحدة = 0.01 مل</p>
                  <p>• سيرنج 50 وحدة = 0.5 مل. كل علامة = 1 وحدة = 0.01 مل</p>
                  <p>• سيرنج 30 وحدة = 0.3 مل. كل علامة = 0.5 وحدة = 0.005 مل</p>
                  <p className="font-bold text-emerald-700 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 shrink-0" /> سيرنج أصغر = دقة أعلى. استخدم أصغر سيرنج يتسع لجرعتك.</p>
                </div>
              </div>
            </div>

            {/* Reference Table */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-600">
              <div className="flex items-center gap-2 bg-stone-50/95 dark:bg-stone-800/95 px-5 py-3">
                <FlaskConical className="h-4 w-4 text-emerald-700" />
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">جدول مرجعي سريع</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                      {['القارورة', 'الماء', 'التركيز', '100 مكغ', '250 مكغ', '500 مكغ'].map((h, i) => (
                        <th key={h} scope="col" className={cn('px-4 py-3 text-xs font-semibold text-stone-800 dark:text-stone-200', i < 3 ? 'text-start' : 'text-center')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referenceData.map((row, i) => (
                      <tr key={`${row.vialMg}-${row.waterMl}`} className={cn('border-b border-stone-200 dark:border-stone-600 last:border-b-0', i % 2 === 0 ? 'bg-stone-50 dark:bg-stone-900' : 'bg-transparent')}>
                        <td className="px-4 py-3 text-sm text-stone-800 dark:text-stone-200">{row.vialMg} ملغ</td>
                        <td className="px-4 py-3 text-sm text-stone-800 dark:text-stone-200">{row.waterMl} مل</td>
                        <td className="px-4 py-3 text-sm text-stone-800 dark:text-stone-200">{row.concentration.toLocaleString('ar-u-nu-latn')} مكغ/مل</td>
                        <td className="px-4 py-3 text-center text-sm text-stone-800 dark:text-stone-200">{row.dose100} مل</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">{row.dose250} مل</td>
                        <td className="px-4 py-3 text-center text-sm text-stone-800 dark:text-stone-200">{row.dose500} مل</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB 3: COST CALCULATOR ═══════════════ */}
        {isProOrTrial && activeTab === 'cost' && (
          <div role="tabpanel" id="panel-cost" aria-labelledby="tab-cost" className="space-y-6">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">حاسبة التكلفة</h2>
                <span className="text-xs text-stone-500 dark:text-stone-300">قارن تكلفة الببتيدات</span>
              </div>

              {/* Add Entry Form */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <div className="space-y-2">
                  <label htmlFor="cost-peptide" className="block text-xs font-medium text-stone-800 dark:text-stone-200">الببتيد</label>
                  <div className="relative">
                    <select
                      id="cost-peptide"
                      value={costPeptide}
                      onChange={e => {
                        setCostPeptide(e.target.value);
                        const p = PEPTIDE_PRESETS.find(pr => pr.name === e.target.value);
                        if (p) {
                          setCostVialMg(p.vial);
                          setCostDoseMcg(p.unit === 'mg' ? p.dose * 1000 : p.dose);
                        }
                      }}
                      className="w-full appearance-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 pe-10 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                    >
                      <option value="">اختر ببتيد...</option>
                      {PEPTIDE_PRESETS.map(p => (
                        <option key={p.name} value={p.name}>{getPresetDisplayName(p.name)} ({p.name})</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 dark:text-stone-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="cost-price" className="block text-xs font-medium text-stone-800 dark:text-stone-200">سعر القارورة (ر.س)</label>
                  <input id="cost-price" type="number" inputMode="decimal" min={0} step={5} value={costPrice || ''} onChange={e => setCostPrice(Number(e.target.value))}
                    placeholder="مثال: 40" className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cost-vial-mg" className="block text-xs font-medium text-stone-800 dark:text-stone-200">حجم القارورة (ملغ)</label>
                  <input id="cost-vial-mg" type="number" inputMode="decimal" min={0.5} step={1} value={costVialMg} onChange={e => setCostVialMg(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cost-dose-mcg" className="block text-xs font-medium text-stone-800 dark:text-stone-200">الجرعة (مكغ)</label>
                  <input id="cost-dose-mcg" type="number" inputMode="decimal" min={0} step={50} value={costDoseMcg} onChange={e => setCostDoseMcg(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-stone-800 dark:text-stone-200">الجرعات/يوم</label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 p-1">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setCostDosesPerDay(n)}
                        className={cn('flex-1 rounded-lg py-2 min-h-[44px] text-sm font-medium', costDosesPerDay === n ? 'bg-emerald-600 text-white' : 'text-stone-700 dark:text-stone-200')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <button onClick={addCostEntry}
                    className="w-full rounded-full bg-emerald-600 px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                    + أضف للمقارنة
                  </button>
                </div>
              </div>

              {/* Cost Comparison Table */}
              {costResults.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-600">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                        {['الببتيد', 'السعر/قارورة', 'التكلفة/جرعة', 'التكلفة/أسبوع', 'التكلفة/شهر', 'دورة 12 أسبوع', ''].map((h, i) => (
                          <th key={h || `col-${i}`} className="px-3 py-3 text-xs font-semibold text-stone-800 dark:text-stone-200 text-start">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {costResults.map((r, i) => (
                        <tr key={r.peptide} className="border-b border-stone-200 dark:border-stone-600 last:border-b-0">
                          <td className="px-3 py-3 text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">{r.peptide}</td>
                          <td className="px-3 py-3 text-sm text-stone-700 dark:text-stone-200">{r.pricePerVial} ر.س</td>
                          <td className="px-3 py-3 text-sm text-emerald-700 font-bold">{fmt(r.costPerDose, 1)} ر.س</td>
                          <td className="px-3 py-3 text-sm text-stone-700 dark:text-stone-200">{fmt(r.costPerWeek, 0)} ر.س</td>
                          <td className="px-3 py-3 text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(r.costPerMonth, 0)} ر.س</td>
                          <td className="px-3 py-3 text-sm text-stone-700 dark:text-stone-200">{fmt(r.costPerCycle12w, 0)} ر.س</td>
                          <td className="px-3 py-3">
                            <button onClick={() => setCostEntries(prev => prev.filter((_, j) => j !== i))}
                              className="rounded-lg p-2 min-h-[44px] min-w-[44px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" aria-label="حذف">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {costResults.length === 0 && (
                <div className="text-center py-12 text-stone-500 dark:text-stone-300">
                  <DollarSign className="mx-auto h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">أضف ببتيدات للمقارنة بينها</p>
                </div>
              )}

              {/* Cost Summary */}
              {costResults.length > 1 && (() => {
                const cheapest = costResults.reduce((a, b) => a.costPerMonth < b.costPerMonth ? a : b);
                const mostExpensive = costResults.reduce((a, b) => a.costPerMonth > b.costPerMonth ? a : b);
                return (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">الأقل تكلفة شهريًا</p>
                      <p className="text-lg font-bold text-emerald-700" dir="ltr">{cheapest.peptide}</p>
                      <p className="text-sm text-stone-700 dark:text-stone-200">{fmt(cheapest.costPerMonth, 0)} ر.س/شهر</p>
                    </div>
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                      <p className="text-xs text-red-700 dark:text-red-400 mb-1">الأعلى تكلفة شهريًا</p>
                      <p className="text-lg font-bold text-red-600" dir="ltr">{mostExpensive.peptide}</p>
                      <p className="text-sm text-stone-700 dark:text-stone-200">{fmt(mostExpensive.costPerMonth, 0)} ر.س/شهر</p>
                    </div>
                  </div>
                );
              })()}

              {/* Injection Supplies Estimate */}
              {costResults.length > 0 && (() => {
                const totalDailyDoses = costEntries.reduce((sum, e) => sum + e.dosesPerDay, 0);
                const monthlyInjections = totalDailyDoses * 30;
                const syringeCost = monthlyInjections * 0.5;
                const bacWaterCost = Math.ceil(monthlyInjections / 60) * 15; // 30ml bottle ~60 doses
                const swabsCost = Math.ceil(monthlyInjections / 100) * 10;
                const totalSupplies = syringeCost + bacWaterCost + swabsCost;
                return (
                  <div className="mt-6 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Syringe className="h-5 w-5 text-emerald-700" />
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">مستلزمات الحقن (تقدير شهري)</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400">سرنجات إنسولين</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{monthlyInjections} حقنة × 0.5 ر.س</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">{fmt(syringeCost, 0)} ر.س</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400">ماء بكتيريوستاتيك 30ml</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{Math.ceil(monthlyInjections / 60)} عبوة × 15 ر.س</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">{fmt(bacWaterCost, 0)} ر.س</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400">مسحات كحول</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{Math.ceil(monthlyInjections / 100)} عبوة × 10 ر.س</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">{fmt(swabsCost, 0)} ر.س</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">إجمالي المستلزمات الشهرية</span>
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalSupplies, 0)} ر.س</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB 4: UNIT CONVERTER ═══════════════ */}
        {isProOrTrial && activeTab === 'converter' && (
          <div role="tabpanel" id="panel-converter" aria-labelledby="tab-converter" className="space-y-6">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <ArrowLeftRight className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">محوّل الوحدات</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-3 mb-6">
                {/* Value */}
                <div className="space-y-2">
                  <label htmlFor="converter-value" className="block text-sm font-medium text-stone-800 dark:text-stone-200">القيمة</label>
                  <input
                    id="converter-value"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={converterFrom === 'mg' ? 0.1 : converterFrom === 'iu' ? 0.5 : 50}
                    value={converterValue}
                    onChange={e => setConverterValue(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                  />
                </div>

                {/* From */}
                <div className="space-y-2" role="group" aria-labelledby="converter-from-label">
                  <label id="converter-from-label" className="block text-sm font-medium text-stone-800 dark:text-stone-200">من</label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 p-1">
                    {(['mcg', 'mg', 'iu'] as const).map(u => (
                      <button key={u} onClick={() => setConverterFrom(u)}
                        className={cn('flex-1 rounded-lg py-2.5 min-h-[44px] text-sm font-medium transition-all', converterFrom === u ? 'bg-emerald-600 text-white' : 'text-stone-700 dark:text-stone-200')}>
                        {u === 'mcg' ? 'مكغ' : u === 'mg' ? 'ملغ' : 'IU'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* To */}
                <div className="space-y-2" role="group" aria-labelledby="converter-to-label">
                  <label id="converter-to-label" className="block text-sm font-medium text-stone-800 dark:text-stone-200">إلى</label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 p-1">
                    {(['mcg', 'mg', 'iu'] as const).map(u => (
                      <button key={u} onClick={() => setConverterTo(u)}
                        className={cn('flex-1 rounded-lg py-2.5 min-h-[44px] text-sm font-medium transition-all', converterTo === u ? 'bg-emerald-600 text-white' : 'text-stone-700 dark:text-stone-200')}>
                        {u === 'mcg' ? 'مكغ' : u === 'mg' ? 'ملغ' : 'IU'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* IU Peptide Context */}
              {(converterFrom === 'iu' || converterTo === 'iu') && (
                <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                  <label className="block text-sm font-medium text-stone-800 dark:text-stone-200 mb-2">
                    الببتيد (لتحويل IU)
                  </label>
                  <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-1">
                    {Object.entries(IU_FACTORS).map(([name, data]) => (
                      <button key={name} onClick={() => setConverterPeptide(name)}
                        className={cn('flex-1 rounded-lg py-2.5 min-h-[44px] text-xs font-medium transition-all', converterPeptide === name ? 'bg-emerald-600 text-white' : 'text-stone-700 dark:text-stone-200')}>
                        <span className="block">{name}</span>
                        <span className="block text-xs opacity-70">{data.note}</span>
                      </button>
                    ))}
                  </div>
                  {IU_FACTORS[converterPeptide]?.factor === 0 && (
                    <div className="mt-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-3">
                      <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                        لا يمكن تحويل الوحدات الدولية لهذا الببتيد — استخدم مايكروغرام
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Result */}
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700 p-8 text-center">
                <p className="text-sm text-stone-600 dark:text-stone-300 mb-2">النتيجة</p>
                <p className="text-4xl font-bold text-emerald-700" dir="ltr">
                  {isFinite(converterResult) && converterResult > 0
                    ? converterTo === 'mcg'
                      ? converterResult.toFixed(0)
                      : converterTo === 'mg'
                      ? converterResult.toFixed(3)
                      : converterResult.toFixed(1)
                    : '—'}
                </p>
                <p className="text-lg text-stone-700 dark:text-stone-200 mt-1">
                  {converterTo === 'mcg' ? 'مايكروغرام (mcg)' : converterTo === 'mg' ? 'ملليغرام (mg)' : 'وحدة دولية (IU)'}
                </p>
              </div>

              {/* Quick Reference */}
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">مرجع سريع</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <QuickRef title="mcg ↔ mg" items={['1 mg = 1,000 mcg', '1 mcg = 0.001 mg', '250 mcg = 0.25 mg', '2,500 mcg = 2.5 mg']} />
                  <QuickRef title="IU (هرمون النمو)" items={['1 mg HGH = 3 IU', '1 IU HGH = 0.33 mg', '4 IU = 1.33 mg', '10 IU = 3.33 mg']} />
                </div>
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-4">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>ملاحظة:</strong> تحويل IU يختلف حسب الببتيد. القيم أعلاه خاصة بهرمون النمو (HGH). الإنسولين: 1 IU = وحدة بيولوجية مختلفة تمامًا.
                    وحدات سيرنج الإنسولين ≠ وحدات IU — السيرنج يقيس الحجم (مل) وليس النشاط البيولوجي.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ FORMULAS (visible on dose tab) ═══════════════ */}
        {isProOrTrial && activeTab === 'dose' && (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              aria-expanded={showFormulas}
              className="flex w-full items-center justify-between px-6 py-4 min-h-[44px] transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/80"
            >
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 shrink-0 text-emerald-700" />
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">كيف تستخدم هذه الحاسبة</h2>
              </div>
              <ChevronDown className={cn('h-5 w-5 text-stone-500 dark:text-stone-300 transition-transform duration-300', showFormulas && 'rotate-180')} />
            </button>
            {showFormulas && (
              <div className="space-y-4 px-6 pb-6">
                <FormulaStep
                  step="1"
                  title="حساب التركيز"
                  formula="التركيز (مكغ/مل) = كمية الببتيد (ملغ) × 1000 ÷ كمية الماء (مل)"
                  example={`(${vialMg} × 1000) ÷ ${waterMl} = ${fmt(results.concentration, 0)} مكغ/مل`}
                />
                <FormulaStep
                  step="2"
                  title="حساب الكمية المطلوبة"
                  formula="الكمية (مل) = الجرعة المطلوبة (مكغ) ÷ التركيز (مكغ/مل)"
                  example={`${results.doseMcg} ÷ ${fmt(results.concentration, 0)} = ${fmt(results.volumeMl, 3)} مل`}
                />
                <FormulaStep
                  step="3"
                  title="تحويل إلى وحدات السيرنج"
                  formula={`وحدات السيرنج = الكمية (مل) ÷ سعة السيرنج (${syringe.ml} مل) × ${syringe.units}`}
                  example={`${fmt(results.volumeMl, 3)} ÷ ${syringe.ml} × ${syringe.units} = ${fmt(results.syringeUnits, 1)} وحدة`}
                />
                <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-4">
                  <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                    <strong>ملاحظة:</strong> هذه الحاسبة أداة تعليمية فقط. استشر طبيبك المختص قبل استخدام أي ببتيد.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Coach CTA */}
        <div className="mb-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center md:p-8">
          <Bot className="mx-auto mb-3 h-8 w-8 text-emerald-700" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">مش متأكد من الجرعة أو التوقيت أو التجميع؟</h3>
          <p className="mt-2 text-sm text-stone-800 dark:text-stone-200">المدرب الذكي يعرف {PEPTIDE_COUNT}+ ببتيد — اسأله وجاوبك بالتفصيل.</p>
          <Link
            to="/coach"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 min-h-[44px] text-base font-semibold text-white transition-all hover:bg-emerald-700"
          >
            <Bot className="h-4 w-4" />
            اسأل المدرب الذكي
          </Link>
        </div>

        {/* Cross-links */}
        <div className="grid gap-3 md:grid-cols-3">
          <CrossLink to="/table" icon={<FlaskConical className="h-5 w-5 text-emerald-700" />} title="جدول الببتيدات الشامل" desc="تصفّح جميع الببتيدات والجرعات" />
          <CrossLink to="/stacks" icon={<Layers className="h-5 w-5 text-emerald-700" />} title="البروتوكولات المُجمَّعة" desc="اكتشف أفضل التوليفات" />
          <CrossLink to="/lab-guide" icon={<BookOpen className="h-5 w-5 text-emerald-700" />} title="دليل التحاليل المخبرية" desc="تحاليل ما قبل وبعد البروتوكول" />
          <CrossLink to="/interactions" icon={<Shield className="h-5 w-5 text-emerald-700" />} title="فحص التعارضات" desc="تأكد من أمان تجميعتك" />
        </div>
      </div>

      {showProtocolWizard && selectedPreset && (() => {
        const peptide = findPeptideByPreset(selectedPreset);
        if (!peptide) return null;
        const doseMcg = doseUnit === 'mg' ? doseValue * 1000 : doseValue;
        return (
          <ProtocolWizard
            peptideId={peptide.id}
            prefillDose={doseMcg}
            prefillUnit="mcg"
            onClose={() => setShowProtocolWizard(false)}
          />
        );
      })()}
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function InputField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800 dark:text-stone-200">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
          aria-label={label}
          className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 pe-16 text-base text-stone-900 dark:text-stone-100 transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
        />
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-stone-700 dark:text-stone-200">{unit}</span>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-4 text-center">
      <p className="mb-1 text-xs font-medium text-stone-800 dark:text-stone-200">{label}</p>
      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{value}</p>
      <p className="mt-0.5 text-xs text-stone-800 dark:text-stone-200">{unit}</p>
    </div>
  );
}

function GuideStep({ step, text }: { step: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{step}</span>
      <p className="text-sm text-stone-700 dark:text-stone-200">{text}</p>
    </div>
  );
}

function FormulaStep({
  step,
  title,
  formula,
  example,
}: {
  step: string;
  title: string;
  formula: string;
  example: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">{step}</span>
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">{title}</h3>
      </div>
      <p className="mb-1 text-sm text-stone-800 dark:text-stone-200" dir="ltr">{formula}</p>
      <p className="text-xs text-emerald-700/80" dir="ltr">{example}</p>
    </div>
  );
}

function CrossLink({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-4 transition-all hover:border-emerald-300 hover:bg-stone-100 dark:hover:bg-stone-800"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-stone-800 dark:text-stone-200">{title}</p>
        <p className="text-xs text-stone-800 dark:text-stone-200">{desc}</p>
      </div>
      <ArrowLeft className="h-4 w-4 text-stone-500 dark:text-stone-300 transition-transform group-hover:-translate-x-1" />
    </Link>
  );
}

function QuickRef({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-2" dir="ltr">{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <p key={`item-${i}`} className="text-xs text-stone-600 dark:text-stone-300" dir="ltr">{item}</p>
        ))}
      </div>
    </div>
  );
}