import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Beaker, Shield, ShieldAlert, ShieldCheck, ShieldX,
  Clock, DollarSign, BarChart3, Syringe, X, ChevronDown,
  Save, Share2, Trash2, Bookmark, Target, Search,
  Sparkles, Calendar, Dumbbell, Moon, Scale, Dna, Activity,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { peptidesPublic as allPeptides } from '@/data/peptides-public';
import {
  DANGEROUS_COMBOS, SYNERGISTIC_COMBOS, DRUG_INTERACTIONS, InteractionResult,
} from '@/data/interactions';

/* ── Helpers ─────────────────────────────────────────────── */

// Only real peptides (exclude stacks, lab tests)
const STACK_IDS = new Set(['golden-recovery', 'gh-optimization', 'brain-performance', 'longevity-protocol', 'gut-repair']);
const LAB_CATEGORIES = ['igf-1', 'total-testosterone', 'lh-fsh', 'prolactin', 'fasting-insulin-glucose', 'cbc-crp', 'liver-kidney', 'thyroid-panel', 'vitamin-d', 'zonulin', 'telomere-length'];
const realPeptides = allPeptides.filter(
  (p) => !STACK_IDS.has(p.id) && !LAB_CATEGORIES.includes(p.id) && p.category,
);

const MAX_STACK_SIZE = 5;
const STORAGE_KEY = 'pptides-saved-stacks';

interface SavedStack {
  id: string;
  name: string;
  peptideIds: string[];
  createdAt: number;
}

function makePairKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function checkInteractions(ids: string[]): InteractionResult[] {
  const results: InteractionResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = makePairKey(ids[i], ids[j]);
      if (seen.has(key)) continue;
      seen.add(key);
      // Check BOTH orderings for dangerous combos (keys in data may not be sorted)
      const key1 = `${ids[i]}+${ids[j]}`;
      const key2 = `${ids[j]}+${ids[i]}`;
      let foundDangerous = false;
      if (DANGEROUS_COMBOS[key1]) {
        results.push(DANGEROUS_COMBOS[key1]);
        foundDangerous = true;
      } else if (DANGEROUS_COMBOS[key2]) {
        results.push(DANGEROUS_COMBOS[key2]);
        foundDangerous = true;
      }
      if (!foundDangerous) {
        // Check wildcard patterns like 'igf-1-lr3+*'
        for (const id of [ids[i], ids[j]]) {
          const wildcard = `${id}+*`;
          if (DANGEROUS_COMBOS[wildcard]) {
            results.push(DANGEROUS_COMBOS[wildcard]);
          }
        }
      }
      // Check BOTH orderings for drug interactions
      const drugMatch = DRUG_INTERACTIONS[key1] ?? DRUG_INTERACTIONS[key2];
      if (drugMatch) {
        results.push(drugMatch);
      }
      // Check BOTH orderings for synergistic combos
      if (SYNERGISTIC_COMBOS[key1]) {
        results.push(SYNERGISTIC_COMBOS[key1]);
      } else if (SYNERGISTIC_COMBOS[key2]) {
        results.push(SYNERGISTIC_COMBOS[key2]);
      }
    }
  }
  return results;
}

function getOverallSafety(interactions: InteractionResult[]): 'safe' | 'warning' | 'dangerous' {
  if (interactions.some((i) => i.severity === 'dangerous')) return 'dangerous';
  if (interactions.some((i) => i.severity === 'warning')) return 'warning';
  return 'safe';
}

function parseCostRange(costStr?: string): { min: number; max: number } | null {
  if (!costStr) return null;
  const nums = costStr.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => parseInt(n.replace(/,/g, ''), 10));
  return { min: Math.min(...values), max: Math.max(...values) };
}

function getFrequencyLabel(freq?: string): string {
  switch (freq) {
    case 'od': return 'مرة يوميًا';
    case 'bid': return 'مرتين يوميًا';
    case 'weekly': return 'مرة أسبوعيًا';
    case 'biweekly': return 'كل أسبوعين';
    case 'prn': return 'عند الحاجة';
    case 'daily-10': return 'يوميًا لمدة 10 أيام';
    case 'daily-20': return 'يوميًا لمدة 20 يوم';
    default: return 'حسب البروتوكول';
  }
}

function getInjectionsPerWeek(freq?: string): number {
  switch (freq) {
    case 'od': case 'daily-10': case 'daily-20': return 7;
    case 'bid': return 14;
    case 'weekly': return 1;
    case 'biweekly': return 0.5;
    case 'prn': return 3; // estimate
    default: return 7;
  }
}

/** Extract key benefits from peptide summaries */
function extractBenefits(peps: typeof allPeptides): string[] {
  const benefits: string[] = [];
  for (const p of peps) {
    // Use summaryAr - take the first sentence/phrase before the long dash
    const summary = p.summaryAr ?? '';
    const parts = summary.split('—');
    if (parts.length > 1) {
      // Second part typically has the key benefit
      const benefit = parts[1].trim().split('.')[0].trim();
      if (benefit && benefit.length > 5) benefits.push(`${p.nameAr}: ${benefit}`);
    } else if (summary.length > 10) {
      benefits.push(`${p.nameAr}: ${summary.slice(0, 80)}`);
    }
  }
  return benefits;
}

/** Build a suggested daily schedule from selected peptides */
interface ScheduleSlot {
  timeAr: string;
  items: { nameAr: string; doseAr: string; routeAr: string }[];
}

function buildSchedule(peps: typeof allPeptides): ScheduleSlot[] {
  const morning: ScheduleSlot = { timeAr: 'الصباح (على معدة فارغة)', items: [] };
  const preworkout: ScheduleSlot = { timeAr: 'قبل التمرين', items: [] };
  const evening: ScheduleSlot = { timeAr: 'قبل النوم (معدة فارغة)', items: [] };
  const anytime: ScheduleSlot = { timeAr: 'في أي وقت', items: [] };

  for (const p of peps) {
    const timing = (p.timingAr ?? '').toLowerCase();
    const item = {
      nameAr: p.nameAr,
      doseAr: p.dosageAr?.split('.')[0] ?? '',
      routeAr: getRouteLabel(p.route),
    };

    if (timing.includes('قبل النوم') || timing.includes('مساء')) {
      evening.items.push(item);
    } else if (timing.includes('صباح') || timing.includes('استيقاظ')) {
      morning.items.push(item);
    } else if (timing.includes('تمرين')) {
      preworkout.items.push(item);
    } else if (timing.includes('قبل الوجب')) {
      anytime.items.push(item);
    } else {
      // Default: morning for nasal/oral, evening for subq
      if (p.route === 'nasal' || p.route === 'oral') {
        morning.items.push(item);
      } else {
        evening.items.push(item);
      }
    }
  }

  return [morning, preworkout, evening, anytime].filter((s) => s.items.length > 0);
}

function getRouteLabel(route?: string): string {
  switch (route) {
    case 'subq': return 'تحت الجلد';
    case 'im': return 'عضلي';
    case 'nasal': return 'بخاخ أنف';
    case 'oral': return 'فموي';
    case 'topical': return 'موضعي';
    default: return 'تحت الجلد';
  }
}

/* ── Goal-Based Stacks ──────────────────────────────────── */

export interface GoalStack {
  id: string;
  nameAr: string;
  goalAr: string;
  peptideIds: string[];
  doses: Record<string, string>;
  durationAr: string;
  monthlyCostSAR: string;
  difficulty: 'مبتدئ' | 'متوسط' | 'متقدم';
  safetyNotes: string;
  icon: LucideIcon;
}

// eslint-disable-next-line react-refresh/only-export-components
export const goalStacks: GoalStack[] = [
  {
    id: 'weight-loss',
    nameAr: 'فقدان الوزن',
    goalAr: 'بروتوكول متكامل لإنقاص الوزن يجمع بين تقليل الشهية وحرق الدهون المركّز مع حماية الجهاز الهضمي.',
    peptideIds: ['semaglutide', 'aod-9604', 'bpc-157'],
    doses: {
      semaglutide: '0.25-2.4 ملغ أسبوعيًا (تدريجي)',
      'aod-9604': '300 مكغ يوميًا',
      'bpc-157': '250 مكغ مرتين يوميًا',
    },
    durationAr: '12-16 أسبوع',
    monthlyCostSAR: '1,200-2,000 ر.س',
    difficulty: 'متوسط',
    safetyNotes: 'ابدأ بجرعة منخفضة من Semaglutide. راقب مستوى السكر. حافظ على ترطيب كافي وبروتين عالي.',
    icon: Scale,
  },
  {
    id: 'muscle-building',
    nameAr: 'بناء العضل',
    goalAr: 'تحفيز إفراز هرمون النمو الطبيعي لبناء العضلات وتحسين التكوين الجسماني مع تعافي أسرع.',
    peptideIds: ['cjc-1295', 'ipamorelin'],
    doses: {
      'cjc-1295': '100-300 مكغ قبل النوم',
      ipamorelin: '200-300 مكغ قبل النوم',
    },
    durationAr: '12-16 أسبوع ثم راحة 4 أسابيع',
    monthlyCostSAR: '600-1,050 ر.س',
    difficulty: 'متوسط',
    safetyNotes: 'خذ على معدة فارغة قبل النوم. راقب مستوى IGF-1 وسكر الدم. تمارين مقاومة ضرورية.',
    icon: Dumbbell,
  },
  {
    id: 'anti-aging',
    nameAr: 'مقاومة الشيخوخة',
    goalAr: 'بروتوكول شامل لإبطاء الشيخوخة من خلال إطالة التيلوميرات وتجديد البشرة وتعزيز المناعة.',
    peptideIds: ['epithalon', 'ghk-cu', 'thymosin-alpha-1'],
    doses: {
      epithalon: '10 ملغ يوميًا لمدة 10-20 يوم',
      'ghk-cu': '200 مكغ يوميًا',
      'thymosin-alpha-1': '1.6 ملغ مرتين أسبوعيًا',
    },
    durationAr: '20 يوم كل 4-6 أشهر',
    monthlyCostSAR: '800-1,300 ر.س',
    difficulty: 'متقدم',
    safetyNotes: 'دورة Epithalon قصيرة ومحددة. لا تتجاوز 20 يوم. GHK-Cu يمكن استخدامه موضعيًا أو بالحقن.',
    icon: Dna,
  },
  {
    id: 'athletic-recovery',
    nameAr: 'التعافي الرياضي',
    goalAr: 'المزيج الذهبي لتسريع شفاء الإصابات الرياضية وإصلاح الأوتار والأربطة والعضلات.',
    peptideIds: ['tb-500', 'bpc-157'],
    doses: {
      'tb-500': '750 مكغ مرتين أسبوعيًا',
      'bpc-157': '250 مكغ مرتين يوميًا',
    },
    durationAr: '4-8 أسابيع',
    monthlyCostSAR: '525-825 ر.س',
    difficulty: 'مبتدئ',
    safetyNotes: 'أشهر تجميعة في مجتمع البايوهاكينغ. آمنة جدًا مع آليات عمل مكمّلة. حقن BPC-157 قريبًا من موضع الإصابة.',
    icon: Activity,
  },
  {
    id: 'sleep-improvement',
    nameAr: 'تحسين النوم',
    goalAr: 'بروتوكول لتعميق النوم وإعادة ضبط الإيقاع اليومي مع فوائد إضافية لمكافحة الشيخوخة.',
    peptideIds: ['dsip', 'epithalon', 'ipamorelin'],
    doses: {
      dsip: '100-200 مكغ قبل النوم بـ 30 دقيقة',
      epithalon: '10 ملغ يوميًا لمدة 10-20 يوم',
      ipamorelin: '200 مكغ قبل النوم',
    },
    durationAr: '4-8 أسابيع',
    monthlyCostSAR: '700-1,100 ر.س',
    difficulty: 'متوسط',
    safetyNotes: 'جميعها تؤخذ مساءً. Epithalon يعيد ضبط الميلاتونين. لا تخلط مع منومات أخرى.',
    icon: Moon,
  },
  {
    id: 'immune-boost',
    nameAr: 'تعزيز المناعة',
    goalAr: 'تقوية الجهاز المناعي الفطري والتكيّفي لمقاومة العدوى وتسريع الشفاء.',
    peptideIds: ['thymosin-alpha-1', 'll-37'],
    doses: {
      'thymosin-alpha-1': '1.6 ملغ مرتين أسبوعيًا',
      'll-37': '100 مكغ يوميًا',
    },
    durationAr: '4-8 أسابيع ثم راحة',
    monthlyCostSAR: '600-950 ر.س',
    difficulty: 'متوسط',
    safetyNotes: 'ممنوع مع مثبطات المناعة (بعد زرع أعضاء أو أمراض مناعية ذاتية). راقب علامات الالتهاب.',
    icon: Shield,
  },
];

/* ── Saved Stacks ────────────────────────────────────────── */

function loadSavedStacks(): SavedStack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStacks(stacks: SavedStack[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
}

/* ── Sub-components ──────────────────────────────────────── */

function SafetyBadge({ safety }: { safety: 'safe' | 'warning' | 'dangerous' }) {
  if (safety === 'dangerous') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-400">
      <ShieldX className="h-3.5 w-3.5" /> خطير
    </span>
  );
  if (safety === 'warning') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
      <ShieldAlert className="h-3.5 w-3.5" /> تحذير
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
      <ShieldCheck className="h-3.5 w-3.5" /> آمن
    </span>
  );
}

/* ── Component ───────────────────────────────────────────── */

export default function StackBuilder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedStacks, setSavedStacks] = useState<SavedStack[]>([]);
  const [stackName, setStackName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [activeGoalStack, setActiveGoalStack] = useState<string | null>(null);
  const [pendingGoalStack, setPendingGoalStack] = useState<GoalStack | null>(null);

  // Load from URL params on mount
  useEffect(() => {
    const urlPeptides = searchParams.get('stack');
    if (urlPeptides) {
      const ids = urlPeptides.split(',').filter((id) => realPeptides.some((p) => p.id === id));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (ids.length > 0) setSelectedIds(ids.slice(0, MAX_STACK_SIZE));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedStacks(loadSavedStacks());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when selection changes
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSearchParams({ stack: selectedIds.join(',') }, { replace: true });
    } else {
      searchParams.delete('stack');
      setSearchParams(searchParams, { replace: true });
    }
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePeptide = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_STACK_SIZE) {
        toast.error(`الحد الأقصى ${MAX_STACK_SIZE} ببتيدات في البروتوكول الواحد`);
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const selectedPeptides = useMemo(
    () => selectedIds.map((id) => realPeptides.find((p) => p.id === id)).filter(Boolean) as typeof realPeptides,
    [selectedIds],
  );

  const interactions = useMemo(() => checkInteractions(selectedIds), [selectedIds]);
  const overallSafety = useMemo(() => getOverallSafety(interactions), [interactions]);

  const totalCost = useMemo(() => {
    let min = 0, max = 0;
    for (const p of selectedPeptides) {
      const range = parseCostRange(p.costEstimate);
      if (range) { min += range.min; max += range.max; }
    }
    return { min, max };
  }, [selectedPeptides]);

  const weeklyInjections = useMemo(
    () => selectedPeptides.reduce((sum, p) => sum + getInjectionsPerWeek(p.frequency), 0),
    [selectedPeptides],
  );

  const combinedBenefits = useMemo(() => extractBenefits(selectedPeptides), [selectedPeptides]);
  const suggestedSchedule = useMemo(() => buildSchedule(selectedPeptides), [selectedPeptides]);

  const filteredPeptides = useMemo(() => {
    if (!searchQuery) return realPeptides;
    const q = searchQuery.toLowerCase();
    return realPeptides.filter(
      (p) => p.nameAr.includes(q) || p.nameEn.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleSave = () => {
    if (selectedIds.length === 0) { toast.error('اختر ببتيدات أولاً'); return; }
    const name = stackName.trim() || `بروتوكول مخصص ${savedStacks.length + 1}`;
    const newStack: SavedStack = {
      id: `custom-${Date.now()}`,
      name,
      peptideIds: [...selectedIds],
      createdAt: Date.now(),
    };
    const updated = [newStack, ...savedStacks];
    saveStacks(updated);
    setSavedStacks(updated);
    setStackName('');
    toast.success('تم حفظ البروتوكول');
  };

  const handleDelete = (id: string) => {
    const updated = savedStacks.filter((s) => s.id !== id);
    saveStacks(updated);
    setSavedStacks(updated);
    toast.success('تم حذف البروتوكول');
  };

  const handleLoadStack = (stack: SavedStack) => {
    setSelectedIds(stack.peptideIds.slice(0, MAX_STACK_SIZE));
    setShowSaved(false);
    toast.success(`تم تحميل: ${stack.name}`);
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}/stacks?stack=${selectedIds.join(',')}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('تم نسخ الرابط'),
      () => toast.error('فشل نسخ الرابط'),
    );
  };

  const loadGoalStack = (stack: GoalStack) => {
    const validIds = stack.peptideIds.filter((id) => realPeptides.some((p) => p.id === id));
    if (selectedIds.length > 0 && activeGoalStack !== stack.id) {
      // Show inline confirmation instead of window.confirm
      setPendingGoalStack(stack);
      return;
    }
    setSelectedIds(validIds.slice(0, MAX_STACK_SIZE));
    setActiveGoalStack(stack.id);
  };

  const confirmLoadGoalStack = () => {
    if (!pendingGoalStack) return;
    const validIds = pendingGoalStack.peptideIds.filter((id) => realPeptides.some((p) => p.id === id));
    setSelectedIds(validIds.slice(0, MAX_STACK_SIZE));
    setActiveGoalStack(pendingGoalStack.id);
    setPendingGoalStack(null);
  };

  const SafetyBadge = ({ safety }: { safety: 'safe' | 'warning' | 'dangerous' }) => {
    if (safety === 'dangerous') return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-400">
        <ShieldX className="h-3.5 w-3.5" /> خطير
      </span>
    );
    if (safety === 'warning') return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
        <ShieldAlert className="h-3.5 w-3.5" /> تحذير
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5" /> آمن
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Section Header ──────────────────────────────── */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
          <Beaker className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold md:text-3xl text-emerald-700">
          بناء بروتوكولك الخاص
        </h2>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          اختر حتى {MAX_STACK_SIZE} ببتيدات وشاهد التكلفة والتفاعلات والجدول الزمني
        </p>
      </div>

      {/* ── What is a Stack? ────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 flex gap-3 items-start">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-0.5">ما هو البروتوكول؟</p>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            البروتوكول هو مجموعة من الببتيدات تعمل معًا لتحقيق هدف محدد — كالتعافي السريع، بناء العضل، أو مقاومة الشيخوخة. 
            <span className="font-medium text-emerald-700 dark:text-emerald-400"> ابدأ باختيار هدفك</span> من الكروت أدناه، أو قم ببناء بروتوكول مخصص يدويًا.
          </p>
        </div>
      </div>

      {/* ── Goal-Based Quick Stacks ─────────────────────── */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-500" />
          بروتوكولات حسب الهدف
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goalStacks.map((gs) => (
            <button
              key={gs.id}
              type="button"
              onClick={() => loadGoalStack(gs)}
              className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition-all hover:shadow-md ${
                activeGoalStack === gs.id
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                  : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <gs.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  gs.difficulty === 'مبتدئ' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                  gs.difficulty === 'متوسط' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                }`}>{gs.difficulty}</span>
              </div>
              <span className="text-base font-bold text-stone-900 dark:text-stone-100">{gs.nameAr}</span>
              <span className="text-xs text-stone-500 dark:text-stone-300 line-clamp-3">{gs.goalAr}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {gs.peptideIds.map((id) => {
                  const p = realPeptides.find((x) => x.id === id);
                  return p ? (
                    <span key={id} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {p.nameAr}
                    </span>
                  ) : (
                    <span key={id} className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-500 dark:text-stone-300">
                      {id}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-stone-500 dark:text-stone-300">
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{gs.monthlyCostSAR}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{gs.durationAr}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Inline overwrite confirmation ─────────────── */}
      {pendingGoalStack && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            سيتم استبدال بروتوكولك الحالي بـ «{pendingGoalStack.nameAr}». هل تريد المتابعة؟
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmLoadGoalStack}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
            >
              تأكيد
            </button>
            <button
              type="button"
              onClick={() => setPendingGoalStack(null)}
              className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ── Goal Stack Detail ──────────────────────────── */}
      {activeGoalStack && (() => {
        const gs = goalStacks.find((s) => s.id === activeGoalStack);
        if (!gs) return null;
        return (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <gs.icon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />{gs.nameAr}
              </h3>
              <button type="button" onClick={() => setActiveGoalStack(null)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">{gs.goalAr}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 p-3 space-y-2">
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300">الجرعات</h4>
                {Object.entries(gs.doses).map(([id, dose]) => {
                  const p = realPeptides.find((x) => x.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-900 dark:text-stone-100">{p?.nameAr ?? id}</span>
                      <span className="text-stone-500 dark:text-stone-300 text-xs">{dose}</span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 p-3 space-y-2">
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300">التفاصيل</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-stone-700 dark:text-stone-200">المدة: {gs.durationAr}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-stone-700 dark:text-stone-200">التكلفة: {gs.monthlyCostSAR}/شهر</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-stone-700 dark:text-stone-200">المستوى: {gs.difficulty}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> ملاحظات السلامة</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{gs.safetyNotes}</p>
            </div>
          </div>
        );
      })()}

      {/* ── Peptide Selector ───────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Syringe className="h-5 w-5 text-emerald-500" />
            اختر الببتيدات
            <span className="text-sm font-normal text-stone-500 dark:text-stone-300">({selectedIds.length}/{MAX_STACK_SIZE})</span>
          </h3>
          <div className="flex gap-2">
            {savedStacks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSaved(!showSaved)}
                className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <Bookmark className="h-3 w-3" />
                المحفوظة ({savedStacks.length})
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => { setSelectedIds([]); setActiveGoalStack(null); }}
                className="flex items-center gap-1 rounded-full border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="h-3 w-3" />
                مسح الكل
              </button>
            )}
          </div>
        </div>

        {/* Saved stacks drawer */}
        {showSaved && (
          <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-3 space-y-2">
            <h4 className="text-xs font-bold text-stone-500 dark:text-stone-300">البروتوكولات المحفوظة</h4>
            {savedStacks.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-white dark:bg-stone-900 px-3 py-2 border border-stone-200 dark:border-stone-600">
                <button type="button" onClick={() => handleLoadStack(s)} className="flex-1 text-start">
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{s.name}</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-300">{s.peptideIds.length} ببتيدات • {new Date(s.createdAt).toLocaleDateString('ar-SA')}</span>
                </button>
                <button type="button" onClick={() => handleDelete(s.id)} aria-label={`حذف ${s.name}`} className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
          >
            <span>{selectedIds.length === 0 ? 'اختر ببتيدات...' : `${selectedIds.length} ببتيد مختار`}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-xl max-h-72 overflow-hidden">
              <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-600 p-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن ببتيد..."
                    aria-label="البحث عن ببتيد"
                    className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 py-2 pe-10 ps-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-56 p-1">
                {filteredPeptides.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const isDisabled = !isSelected && selectedIds.length >= MAX_STACK_SIZE;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { togglePeptide(p.id); }}
                      disabled={isDisabled}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                          : isDisabled
                          ? 'text-stone-300 dark:text-stone-300 cursor-not-allowed'
                          : 'text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span>{p.nameAr} <span className="text-xs text-stone-400">({p.nameEn})</span></span>
                      {isSelected && <span className="text-emerald-500">✓</span>}
                    </button>
                  );
                })}
                {filteredPeptides.length === 0 && (
                  <p className="p-3 text-center text-sm text-stone-400">لا توجد نتائج</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected pills */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedPeptides.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                {p.nameAr}
                <button type="button" onClick={() => togglePeptide(p.id)} className="hover:text-red-500 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Empty State ────────────────────────────────── */}
      {selectedIds.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800">
            <Target className="h-6 w-6 text-stone-400" />
          </div>
          <h4 className="text-base font-bold text-stone-700 dark:text-stone-200 mb-1">لم تختر أي ببتيد بعد</h4>
          <p className="text-sm text-stone-500 dark:text-stone-300 mb-5">ابدأ ببساطة — اتبع الخطوات التالية:</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-start">
            <div className="flex items-start gap-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-4 py-3 max-w-[200px]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">١</span>
              <span className="text-xs text-stone-600 dark:text-stone-300">اختر هدفك من الكروت أعلاه</span>
            </div>
            <div className="text-stone-300 dark:text-stone-400 text-lg hidden sm:block">←</div>
            <div className="flex items-start gap-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-4 py-3 max-w-[200px]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">٢</span>
              <span className="text-xs text-stone-600 dark:text-stone-300">أو اختر ببتيدات يدويًا من القائمة</span>
            </div>
            <div className="text-stone-300 dark:text-stone-400 text-lg hidden sm:block">←</div>
            <div className="flex items-start gap-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-4 py-3 max-w-[200px]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">٣</span>
              <span className="text-xs text-stone-600 dark:text-stone-300">راجع السلامة والتكلفة والجدول</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Panel ──────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="space-y-4">
          {/* Safety Badge */}
          <div className={`rounded-2xl border p-5 ${
            overallSafety === 'dangerous'
              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              : overallSafety === 'warning'
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
              : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                فحص السلامة
              </h3>
              {selectedIds.length >= 2 && <SafetyBadge safety={overallSafety} />}
            </div>
            {selectedIds.length < 2 ? (
              <p className="text-sm text-stone-500 dark:text-stone-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                أضف ببتيدًا ثانيًا لفحص التفاعلات بين الببتيدات المختارة.
              </p>
            ) : interactions.length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                لم يُكتشف أي تفاعل سلبي بين الببتيدات المختارة.
              </p>
            ) : (
              <div className="space-y-2">
                {interactions.map((inter, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 border ${
                      inter.severity === 'dangerous'
                        ? 'border-red-200 dark:border-red-800 bg-red-100/50 dark:bg-red-900/20'
                        : inter.severity === 'warning'
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/20'
                        : 'border-emerald-200 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {inter.severity === 'dangerous' ? <ShieldX className="h-4 w-4 text-red-500" /> :
                       inter.severity === 'warning' ? <ShieldAlert className="h-4 w-4 text-amber-500" /> :
                       <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{inter.message}</span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 ms-6">{inter.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Cost */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-stone-500 dark:text-stone-300">التكلفة الشهرية التقريبية</span>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {totalCost.min > 0
                  ? `${totalCost.min.toLocaleString('ar-SA')}-${totalCost.max.toLocaleString('ar-SA')} ر.س`
                  : 'غير متوفر'}
              </p>
            </div>

            {/* Injections */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Syringe className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-stone-500 dark:text-stone-300">الحقن أسبوعيًا</span>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                ~{Math.round(weeklyInjections)} حقنة/أسبوع
              </p>
              {weeklyInjections >= 7 ? (
                <p className="text-xs text-stone-400">~{Math.round(weeklyInjections / 7)} يوميًا</p>
              ) : (
                <p className="text-xs text-stone-400">كل {Math.round(7 / weeklyInjections)} أيام</p>
              )}
            </div>

            {/* Peptide Count */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-stone-500 dark:text-stone-300">عدد الببتيدات</span>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {selectedIds.length} من {MAX_STACK_SIZE}
              </p>
            </div>

            {/* Routes */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-stone-500 dark:text-stone-300">طرق الإعطاء</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[...new Set(selectedPeptides.map((p) => p.route))].map((r) => (
                  <span key={r ?? 'default'} className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-600 dark:text-stone-300">
                    {getRouteLabel(r)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Combined Benefits */}
          {combinedBenefits.length > 0 && (
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5">
              <h3 className="mb-3 font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                الفوائد المجمّعة
              </h3>
              <ul className="space-y-2">
                {combinedBenefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-200">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Schedule */}
          {suggestedSchedule.length > 0 && (
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5">
              <h3 className="mb-3 font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                الجدول اليومي المقترح
              </h3>
              <div className="space-y-3">
                {suggestedSchedule.map((slot) => (
                  <div key={slot.timeAr} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-3">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">{slot.timeAr}</h4>
                    <div className="space-y-1.5">
                      {slot.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">{item.nameAr}</span>
                          <span className="text-stone-500 dark:text-stone-300">{item.routeAr} • {item.doseAr.slice(0, 50)}{item.doseAr.length > 50 ? '...' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Peptide Details */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5">
            <h3 className="mb-4 font-bold text-stone-900 dark:text-stone-100">الجدول والتفاصيل</h3>
            <div className="space-y-3">
              {selectedPeptides.map((p) => (
                <div key={p.id} className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link to={`/peptide/${p.id}`} className="text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                      {p.nameAr}
                    </Link>
                    <span className="text-xs text-stone-400">{p.nameEn}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-stone-600 dark:text-stone-300">
                    <div>
                      <span className="font-bold text-stone-500 dark:text-stone-300">الجرعة: </span>
                      <span className="line-clamp-2">{p.dosageAr ?? 'اشترك لعرض الجرعة'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-stone-500 dark:text-stone-300">التوقيت: </span>
                      <span>{p.timingAr ?? 'اشترك لعرض التوقيت'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-stone-500 dark:text-stone-300">التكرار: </span>
                      <span>{getFrequencyLabel(p.frequency)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-stone-500 dark:text-stone-300">طريقة الإعطاء: </span>
                      <span>{getRouteLabel(p.route)}</span>
                    </div>
                    {p.costEstimate && (
                      <div>
                        <span className="font-bold text-stone-500 dark:text-stone-300">التكلفة: </span>
                        <span>{p.costEstimate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save & Share */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5">
            <input
              type="text"
              value={stackName}
              onChange={(e) => setStackName(e.target.value)}
              placeholder="اسم البروتوكول (اختياري)"
              aria-label="اسم البروتوكول"
              className="flex-1 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                احفظ هذا البروتوكول
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                شارك
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
