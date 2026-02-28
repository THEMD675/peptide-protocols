import { useState, useMemo, useEffect, useId, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { Calculator, FlaskConical, Droplets, ChevronDown, ArrowLeft, BookOpen, Layers, Bot, Bookmark, Syringe, Shield, Play, Search } from 'lucide-react';
import ProtocolWizard from '@/components/ProtocolWizard';
import { peptides as allPeptides } from '@/data/peptides';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { DOSE_PRESETS as PEPTIDE_PRESETS_DATA, type DoseUnit } from '@/data/dose-presets';

interface SyringeOption {
  label: string;
  ml: number;
  units: number;
}

const SYRINGE_OPTIONS: SyringeOption[] = [
  { label: '0.3 مل (30 وحدة)', ml: 0.3, units: 30 },
  { label: '0.5 مل (50 وحدة)', ml: 0.5, units: 50 },
  { label: '1.0 مل (100 وحدة)', ml: 1.0, units: 100 },
];

function getRecommendedWater(vialMg: number): number {
  if (vialMg <= 2) return 1;
  if (vialMg <= 5) return 2;
  if (vialMg <= 10) return 3;
  if (vialMg <= 15) return 3;
  if (vialMg <= 30) return 6;
  return Math.ceil(vialMg / 5);
}

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


/* ─────────────── Visual Syringe SVG ─────────────── */

function SyringeVisual({
  drawUnits,
  syringeOption,
}: {  
  drawUnits: number;
  syringeOption: SyringeOption;
}) {
  const gradientId = useId();
  const totalUnits = syringeOption.units;
  const clampedUnits = Math.min(Math.max(drawUnits, 0), totalUnits);
  const displayUnits = isFinite(clampedUnits) ? clampedUnits : 0;

  const barrelTop = 40;
  const barrelHeight = 240;
  const barrelWidth = 36;
  const barrelX = 22;

  const tickCount = totalUnits / (totalUnits <= 30 ? 5 : 10);
  const tickInterval = barrelHeight / tickCount;

  const fillRatio = displayUnits / totalUnits;
  const fillHeight = fillRatio * barrelHeight;
  const fillY = barrelTop + barrelHeight - fillHeight;

  const ticks: { y: number; label: string }[] = [];
  for (let i = 0; i <= tickCount; i++) {
    const unitVal = totalUnits <= 30
      ? i * 5
      : i * 10;
    ticks.push({
      y: barrelTop + barrelHeight - i * tickInterval,
      label: String(unitVal),
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-bold text-stone-900">
        اسحب إلى: {displayUnits.toFixed(1)} وحدة
      </p>
      <svg
        viewBox="0 0 80 320"
        className="drop-shadow-lg w-[80px] h-[320px] md:w-[100px] md:h-[400px]"
        role="img"
        aria-label={`سيرنج يُظهر ${displayUnits.toFixed(1)} وحدة`}
      >
        {/* Plunger handle */}
        <rect x={barrelX + 8} y={4} width={20} height={8} rx={2} fill="#4a5568" />
        <rect x={barrelX + 14} y={12} width={8} height={barrelTop - 16} fill="#4a5568" />
        <rect x={barrelX + 6} y={barrelTop - 6} width={24} height={6} rx={1} fill="#718096" />

        {/* Barrel outline */}
        <rect
          x={barrelX}
          y={barrelTop}
          width={barrelWidth}
          height={barrelHeight}
          rx={4}
          fill="rgba(0,0,0,0.02)"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth={1.5}
        />

        {/* Fill */}
        {fillHeight > 0 && (
          <rect
            x={barrelX + 1.5}
            y={fillY}
            width={barrelWidth - 3}
            height={fillHeight}
            rx={fillY + fillHeight >= barrelTop + barrelHeight - 2 ? 3 : 0}
            fill={`url(#${gradientId})`}
            opacity={0.85}
          />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={barrelX + barrelWidth + 2}
              y1={t.y}
              x2={barrelX + barrelWidth + (i % 2 === 0 ? 10 : 6)}
              y2={t.y}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={i % 2 === 0 ? 1 : 0.5}
            />
            {i % 2 === 0 && (
              <text
                x={barrelX + barrelWidth + 13}
                y={t.y + 3}
                fill="rgba(0,0,0,0.5)"
                fontSize="8"
                fontFamily="Cairo, sans-serif"
              >
                {t.label}
              </text>
            )}
          </g>
        ))}

        {/* Draw line indicator */}
        {fillHeight > 0 && fillHeight < barrelHeight && (
          <>
            <line
              x1={barrelX - 4}
              y1={fillY}
              x2={barrelX + barrelWidth + 4}
              y2={fillY}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <circle cx={barrelX - 4} cy={fillY} r={2} fill="#10b981" />
          </>
        )}

        {/* Needle hub */}
        <rect x={barrelX + 12} y={barrelTop + barrelHeight} width={12} height={8} rx={1} fill="#718096" />
        {/* Needle */}
        <line
          x1={barrelX + 18}
          y1={barrelTop + barrelHeight + 8}
          x2={barrelX + 18}
          y2={barrelTop + barrelHeight + 30}
          stroke="#a0aec0"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─────────────── Main Component ─────────────── */

const PEPTIDE_PRESETS = PEPTIDE_PRESETS_DATA.map(p => ({
  name: p.name, dose: p.dose, unit: p.unit, vial: p.vialMg, water: p.waterMl, minDose: p.minDose, maxDose: p.maxDose,
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

export default function DoseCalculator() {
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
  const [searchParams] = useSearchParams();

  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from URL params */
  useEffect(() => {
    const peptideParam = searchParams.get('peptide');
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

  const syringe = SYRINGE_OPTIONS[syringeIdx];
  const recommendedWater = getRecommendedWater(vialMg);

  const [dosesPerDay, setDosesPerDay] = useState(1);
  const [vialPrice, setVialPrice] = useState(0);

  interface SavedCalc { peptide: string; dose: number; unit: string; vial: number; water: number; units: string; ts: number }
  const [savedCalcs, setSavedCalcs] = useState<SavedCalc[]>(() => {
    try { const s = localStorage.getItem('pptides_calc_history'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const loadSavedCalc = (calc: SavedCalc) => {
    setSelectedPreset(calc.peptide);
    setDoseValue(calc.dose);
    setDoseUnit(calc.unit as DoseUnit);
    setVialMg(calc.vial);
    setWaterMl(calc.water);
  };

  const results = useMemo(() => {
    const doseMcg = doseUnit === 'mg' ? doseValue * 1000 : doseValue;
    if (!vialMg || !waterMl || !doseMcg || vialMg <= 0 || waterMl <= 0 || doseMcg <= 0) {
      return { concentration: 0, volumeMl: 0, syringeUnits: 0, dosesPerVial: 0, doseMcg, monthlyVials: 0, monthlyCost: 0, daysPerVial: 0 };
    }
    const concentration = (vialMg * 1000) / waterMl;
    const volumeMl = doseMcg / concentration;
    const syringeUnits = volumeMl * syringe.units / syringe.ml;
    const dosesPerVial = (vialMg * 1000) / doseMcg;
    const daysPerVial = dosesPerVial / dosesPerDay;
    const monthlyVials = 30 / daysPerVial;
    const monthlyCost = vialPrice > 0 ? monthlyVials * vialPrice : 0;
    return { concentration, volumeMl, syringeUnits, dosesPerVial, doseMcg, monthlyVials, monthlyCost, daysPerVial };
  }, [doseUnit, doseValue, vialMg, waterMl, syringe, dosesPerDay, vialPrice]);

  const saveCurrentCalc = useCallback(() => {
    if (!selectedPreset || !isFinite(results.syringeUnits) || results.syringeUnits <= 0) {
      toast.error('اختر ببتيدًا أولًا لحفظ الحساب');
      return;
    }
    const entry: SavedCalc = { peptide: selectedPreset, dose: doseValue, unit: doseUnit, vial: vialMg, water: waterMl, units: results.syringeUnits.toFixed(1), ts: Date.now() };
    const updated = [entry, ...savedCalcs.filter(c => c.peptide !== selectedPreset)].slice(0, 5);
    setSavedCalcs(updated);
    try { localStorage.setItem('pptides_calc_history', JSON.stringify(updated)); } catch { /* expected */ }
    toast.success(`تم حفظ حساب ${selectedPreset}`);
  }, [selectedPreset, doseValue, doseUnit, vialMg, waterMl, results.syringeUnits, savedCalcs]);

  const fmt = (n: number, d = 2) => (isFinite(n) && n > 0 ? n.toFixed(d) : '—');

  return (
    <div className="min-h-screen animate-fade-in" >
      <Helmet>
        <title>حاسبة جرعات الببتيدات | احسب الجرعة بدقة | pptides</title>
        <meta
          name="description"
          content="حاسبة مجانية لجرعات الببتيدات — احسب التركيز، الكمية بالمل، ووحدات السيرنج بدقة. أداة مجانية 100%. Free peptide reconstitution & dosage calculator."
        />
        <meta
          name="keywords"
          content="حاسبة ببتيدات, peptide calculator, جرعات ببتيدات, BPC-157, reconstitution calculator, حاسبة جرعات"
        />
        <meta property="og:title" content="حاسبة جرعات الببتيدات | pptides" />
        <meta property="og:description" content="احسب جرعتك بدقة خلال ثوانٍ — أداة مجانية لحساب جرعات 30+ ببتيد" />
        <meta property="og:url" content={`${SITE_URL}/calculator`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div
          className="mb-10 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10"
          >
            <Calculator className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
            حاسبة جرعات الببتيدات
          </h1>
          <p className="mt-2 text-base text-stone-600">
            أداة مجانية — احسب جرعتك بدقة خلال ثوانٍ
          </p>
        </div>

        {/* Peptide Preset Selector */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-stone-900 text-center">اختر الببتيد لتعبئة القيم تلقائيًا</label>
          <div className="mb-3 relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              placeholder="ابحث عن ببتيد..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 ps-10 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none"
              aria-label="ابحث عن ببتيد"
            />
          </div>
          {(() => {
            const q = presetSearch.trim().toLowerCase();
            const filtered =
              q === ''
                ? PEPTIDE_PRESETS
                : PEPTIDE_PRESETS.filter(
                    (p) =>
                      p.name.toLowerCase().includes(q) ||
                      getPresetDisplayName(p.name).toLowerCase().includes(q),
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
                      onClick={() => {
                        setSelectedPreset(p.name);
                        setDoseUnit(p.unit);
                        setDoseValue(p.dose);
                        setVialMg(p.vial);
                        setWaterMl(p.water);
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs transition-all active:scale-[0.98] shrink-0',
                        selectedPreset === p.name
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400 font-bold shadow-sm'
                          : 'border-stone-200 bg-white text-stone-700 font-medium hover:border-emerald-300 transition-colors hover:text-emerald-600',
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
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      عرض الكل ({PEPTIDE_PRESETS.length}+)
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Calculator Card */}
        <div
          className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6 md:p-8"
        >
          {/* Dose Unit Toggle */}
          <div className="mb-6 flex items-center justify-center gap-1">
            <span className="ms-3 text-sm text-stone-800">وحدة الجرعة:</span>
            <div className="flex rounded-xl border border-stone-300 bg-stone-50 p-1">
              <button
                onClick={() => {
                  if (doseUnit === 'mg') {
                    setDoseValue(prev => +(prev * 1000).toPrecision(10));
                    setDoseUnit('mcg');
                  }
                }}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                  doseUnit === 'mcg'
                    ? 'bg-emerald-500 text-white'
                    : 'text-stone-800 transition-colors hover:text-stone-800',
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
                  'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                  doseUnit === 'mg'
                    ? 'bg-emerald-500 text-white'
                    : 'text-stone-800 transition-colors hover:text-stone-800',
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
              onChange={setDoseValue}
              unit={doseUnit === 'mcg' ? 'مكغ' : 'ملغ'}
              step={doseUnit === 'mcg' ? 50 : 0.05}
            />
            <InputField
              label="كمية الببتيد في القارورة (ملغ)"
              value={vialMg}
              onChange={setVialMg}
              unit="ملغ"
              step={1}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-800">
                كمية الماء البكتيريوستاتك (مل)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={waterMl}
                  onChange={(e) => setWaterMl(Number(e.target.value))}
                  aria-label="كمية الماء البكتيريوستاتك (مل)"
                  className={cn(
                    'w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 pe-16',
                    'text-base text-stone-900',
                    'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100',
                  )}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-stone-700">
                  مل
                </span>
              </div>
              {waterMl !== recommendedWater && vialMg > 0 && (
                !selectedPreset ? (
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <span className="text-xs text-emerald-700">
                      الكمية الموصى بها: <strong>{recommendedWater} ml</strong>
                    </span>
                    <button
                      onClick={() => setWaterMl(recommendedWater)}
                      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      تعبئة
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setWaterMl(recommendedWater)}
                    className="text-xs text-emerald-600/70 transition-colors hover:underline"
                  >
                    💡 الكمية المُوصى بها: {recommendedWater} مل
                  </button>
                )
              )}
            </div>
          </div>

          {/* Syringe Size Selector */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-stone-800">
              حجم السيرنج
            </label>
            <div className="relative">
              <select
                value={syringeIdx}
                onChange={(e) => setSyringeIdx(Number(e.target.value))}
                aria-label="حجم السيرنج"
                className={cn(
                  'w-full appearance-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 pe-10',
                  'text-base text-stone-900',
                  'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100',
                )}
              >
                {SYRINGE_OPTIONS.map((opt, i) => (
                  <option key={i} value={i} className="bg-white text-stone-900">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-700" />
            </div>
          </div>

          {/* Frequency + Cost */}
          <div className="mb-8 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-800">عدد الجرعات يوميًا</label>
              <div className="flex rounded-xl border border-stone-300 bg-stone-50 p-1">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setDosesPerDay(n)}
                    className={cn('flex-1 rounded-lg py-2 text-sm font-medium transition-all', dosesPerDay === n ? 'bg-emerald-600 text-white' : 'text-stone-700 hover:text-stone-900')}
                  >
                    {n}x / يوم
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-800">سعر القارورة ($) <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
              <input type="number" min={0} step={5} value={vialPrice || ''} onChange={e => setVialPrice(Number(e.target.value))} placeholder="مثال: 40"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100" />
            </div>
          </div>

          {/* Results + Syringe Visual */}
          <div className="flex flex-col items-stretch gap-6 md:flex-row">
            {/* Result Cards */}
            <div className="grid flex-1 grid-cols-2 gap-4">
              <ResultCard
                label="التركيز"
                value={fmt(results.concentration, 0)}
                unit="مكغ/مل"
              />
              <ResultCard
                label="الكمية المطلوبة"
                value={fmt(results.volumeMl, 3)}
                unit="مل"
              />
              <ResultCard
                label="وحدات السيرنج"
                value={fmt(results.syringeUnits, 1)}
                unit={`وحدة (${syringe.label.split('(')[0].trim()})`}
              />
              <ResultCard
                label="عدد الجرعات في القارورة"
                value={fmt(results.dosesPerVial, 0)}
                unit="جرعة"
              />
            </div>

            {/* SVG Syringe */}
            <div className="flex items-center justify-center rounded-xl border border-stone-300 bg-stone-50 px-4 py-6 min-h-[200px] md:w-[140px]">
              <SyringeVisual
                drawUnits={results.syringeUnits}
                syringeOption={syringe}
              />
            </div>
          </div>

          {/* Overflow warning */}
          {isFinite(results.syringeUnits) && results.syringeUnits > syringe.units && (
            <div
              className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center"
            >
              <p className="text-sm text-red-600">
                ⚠️ الجرعة تتجاوز سعة السيرنج ({syringe.units} وحدة). استخدم سيرنجًا أكبر أو أضف ماءً أقل.
              </p>
            </div>
          )}

          {/* Reconstitution Guide */}
          {selectedPreset && isFinite(results.syringeUnits) && results.syringeUnits > 0 && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <h3 className="mb-3 text-sm font-bold text-stone-900">دليل التحضير — {selectedPreset}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">1</span>
                  <p className="text-sm text-stone-700">اسحب <strong>{waterMl} ml</strong> ماء بكتيريوستاتي وأضفه على قارورة <strong>{vialMg} mg</strong> {selectedPreset}. أدخل الإبرة ببطء على جدار القارورة.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">2</span>
                  <p className="text-sm text-stone-700">حرّك القارورة بلطف بحركة دائرية. <strong>لا ترجّها أبدًا</strong>. انتظر حتى يذوب المسحوق بالكامل (1-2 دقيقة).</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">3</span>
                  <p className="text-sm text-stone-700">بسرنجة إنسولين ({syringe.label})، اسحب <strong>{fmt(results.syringeUnits, 1)} وحدة</strong>. هذه جرعتك ({doseUnit === 'mg' ? `${doseValue} mg` : `${doseValue} mcg`}).</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">4</span>
                  <p className="text-sm text-stone-700">احقن تحت الجلد في البطن أو الفخذ. خزّن القارورة في الثلاجة 2-8°C — تصلح لـ {vialMg >= 5 ? '28' : '14'} يوم بعد التحضير.</p>
                </div>
              </div>
            </div>
          )}

          {/* Dose safety warning */}
          {selectedPreset && (() => {
            const preset = PEPTIDE_PRESETS.find(p => p.name === selectedPreset);
            if (!preset) return null;
            const doseMcg = doseUnit === 'mg' ? doseValue * 1000 : doseValue;
            if (doseMcg > preset.maxDose) {
              return (
                <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
                  <p className="text-sm font-bold text-red-800">⚠️ جرعة مرتفعة</p>
                  <p className="text-xs text-red-600 mt-1">الجرعة المدخلة ({doseMcg} mcg) تتجاوز الحد الأعلى الموصى به لـ {preset.name} ({preset.maxDose} mcg). استشر طبيبك قبل استخدام هذه الجرعة.</p>
                </div>
              );
            }
            if (doseMcg < preset.minDose) {
              return (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-bold text-amber-800">💡 جرعة منخفضة</p>
                  <p className="text-xs text-amber-700 mt-1">الجرعة المدخلة ({doseMcg} mcg) أقل من الحد الأدنى الفعّال لـ {preset.name} ({preset.minDose} mcg). قد لا تحصل على النتيجة المطلوبة.</p>
                </div>
              );
            }
            return (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs text-emerald-700">✓ الجرعة ضمن النطاق الموصى به لـ {preset.name} ({preset.minDose}-{preset.maxDose} mcg)</p>
              </div>
            );
          })()}

          {/* Monthly Planning */}
          {isFinite(results.dosesPerVial) && results.dosesPerVial > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold text-stone-500 mb-1">عمر القارورة</p>
                <p className="text-lg font-bold text-stone-900">
                  {results.daysPerVial < 1 ? 'أقل من يوم' :
                   results.daysPerVial <= 7 ? `${Math.floor(results.daysPerVial)} أيام` :
                   `~${Math.floor(results.daysPerVial / 7)} أسابيع`}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {fmt(results.dosesPerVial, 0)} جرعة × {dosesPerDay}/يوم
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold text-stone-500 mb-1">قوارير في الشهر</p>
                <p className="text-lg font-bold text-stone-900">
                  {Math.ceil(results.monthlyVials)} قوارير
                </p>
                {results.monthlyCost > 0 ? (
                  <p className="text-xs font-bold text-emerald-600 mt-1">
                    ~${Math.round(results.monthlyCost)}/شهر
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 mt-1">
                    أدخل سعر القارورة لحساب التكلفة الشهرية
                  </p>
                )}
              </div>
              <button
                onClick={saveCurrentCalc}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md"
              >
                <Bookmark className="h-5 w-5" />
                <span className="text-sm">احفظ الحساب</span>
              </button>
              {selectedPreset && allPeptides.find(p => p.nameEn === selectedPreset) && (
                <button
                  onClick={() => setShowProtocolWizard(true)}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md"
                >
                  <Play className="h-5 w-5" />
                  <span className="text-sm">ابدأ بروتوكول</span>
                </button>
              )}
              <Link
                to={`/tracker?peptide=${encodeURIComponent(selectedPreset || 'Custom')}`}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-stone-200 bg-white p-4 font-bold text-stone-700 transition-all hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md"
              >
                <Syringe className="h-5 w-5" />
                <span className="text-sm">سجّل حقنة</span>
              </Link>
              <Link
                to="/guide"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-stone-200 bg-white p-4 font-bold text-stone-700 transition-all hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md"
              >
                <BookOpen className="h-5 w-5" />
                <span className="text-sm">كيف أحقن؟</span>
              </Link>
            </div>
          )}

          {/* Saved Calculations */}
          {savedCalcs.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-stone-700">حساباتك المحفوظة</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {savedCalcs.map((calc, idx) => (
                  <button
                    key={`${calc.peptide}-${idx}`}
                    onClick={() => loadSavedCalc(calc)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-right transition-all hover:shadow-sm',
                      selectedPreset === calc.peptide ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-white transition-colors hover:border-emerald-300'
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold text-stone-900" dir="ltr">{calc.peptide}</p>
                      <p className="text-xs text-stone-500">{calc.dose} {calc.unit} — {calc.units} وحدة</p>
                    </div>
                    <span className="text-xs text-stone-400">{new Date(calc.ts).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expandable Formulas Section */}
        <div
          className="mb-8 rounded-2xl border border-stone-200 bg-stone-50"
        >
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            aria-expanded={showFormulas}
            className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-stone-100/80"
          >
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 shrink-0 text-emerald-600" />
              <h2 className="text-base font-bold text-stone-900">
                كيف تستخدم هذه الحاسبة
              </h2>
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-stone-500 transition-transform duration-300',
                showFormulas && 'rotate-180',
              )}
            />
          </button>

            {showFormulas && (
              <div
                className="overflow-hidden"
              >
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
                  <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
                    <p className="text-sm leading-relaxed text-stone-800">
                      <strong className="text-stone-800">ملاحظة:</strong> هذه الحاسبة أداة تعليمية فقط. استشر طبيبك المختص قبل استخدام أي ببتيد. تأكد من جودة المنتج ونظافة بيئة التحضير.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Reference Table */}
        <div
          className="mb-8 overflow-hidden rounded-2xl border border-stone-200"
        >
          <div
            className="flex items-center gap-2 bg-stone-50/95 px-5 py-3"
          >
            <FlaskConical className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">
              جدول مرجعي سريع
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-300 bg-white">
                  {['القارورة', 'الماء', 'التركيز', '100 مكغ', '250 مكغ', '500 مكغ'].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={cn(
                          'px-4 py-3 text-xs font-semibold text-stone-800',
                          i < 3 ? 'text-right' : 'text-center',
                        )}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {referenceData.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-stone-200 last:border-b-0',
                      i % 2 === 0 ? 'bg-stone-50 border border-stone-300' : 'bg-transparent',
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-stone-800">{row.vialMg} ملغ</td>
                    <td className="px-4 py-3 text-sm text-stone-800">{row.waterMl} مل</td>
                    <td className="px-4 py-3 text-sm text-stone-800">
                      {row.concentration.toLocaleString('en')} مكغ/مل
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-stone-800">
                      {row.dose100} مل
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm font-semibold"
                      
                    >
                      {row.dose250} مل
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-stone-800">
                      {row.dose500} مل
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Coach CTA */}
        <div className="mb-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center md:p-8">
          <Bot className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
          <h3 className="text-lg font-bold text-stone-900">مش متأكد من الجرعة أو التوقيت أو التجميع؟</h3>
          <p className="mt-2 text-sm text-stone-800">المدرب الذكي يعرف {PEPTIDE_COUNT}+ ببتيد — اسأله وجاوبك بالتفصيل.</p>
          <Link
            to="/coach"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            <Bot className="h-4 w-4" />
            اسأل المدرب الذكي
          </Link>
        </div>

        {/* Cross-links */}
        <div
          className="grid gap-3 md:grid-cols-3"
        >
          <CrossLink
            to="/table"
            icon={<FlaskConical className="h-5 w-5 text-emerald-600" />}
            title="جدول الببتيدات الشامل"
            desc="تصفّح جميع الببتيدات والجرعات"
          />
          <CrossLink
            to="/stacks"
            icon={<Layers className="h-5 w-5 text-emerald-600" />}
            title="البروتوكولات المُجمَّعة"
            desc="اكتشف أفضل التوليفات"
          />
          <CrossLink
            to="/lab-guide"
            icon={<BookOpen className="h-5 w-5 text-emerald-600" />}
            title="دليل التحاليل المخبرية"
            desc="تحاليل ما قبل وبعد البروتوكول"
          />
          <CrossLink
            to="/interactions"
            icon={<Shield className="h-5 w-5 text-emerald-600" />}
            title="فحص التعارضات"
            desc="تأكد من أمان تجميعتك"
          />
        </div>
      </div>
      {showProtocolWizard && selectedPreset && (() => {
        const peptide = allPeptides.find(p => p.nameEn === selectedPreset);
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-800">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className={cn(
            'w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 pe-16',
            'text-base text-stone-900',
            'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100',
          )}
        />
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-stone-700">
          {unit}
        </span>
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
    <div
      className="rounded-xl border border-stone-300 bg-stone-100 p-4 text-center"
    >
      <p className="mb-1 text-xs font-medium text-stone-800">{label}</p>
      <p className="text-2xl font-bold text-emerald-600">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-stone-800">{unit}</p>
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
    <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
        >
          {step}
        </span>
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      </div>
      <p className="mb-1 text-sm text-stone-800" dir="ltr">{formula}</p>
      <p className="text-xs text-emerald-600/80" dir="ltr">
        {example}
      </p>
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
      className="group flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 p-4 transition-all hover:border-emerald-300 hover:bg-stone-100"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10"
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-stone-800 group-transition-colors hover:text-stone-900">
          {title}
        </p>
        <p className="text-xs text-stone-800">{desc}</p>
      </div>
      <ArrowLeft className="h-4 w-4 text-stone-500 transition-transform group-hover:-translate-x-1 group-hover:text-stone-800" />
    </Link>
  );
}
