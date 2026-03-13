import { useState, useCallback, useEffect, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, FlaskConical,
  TrendingDown, Heart, Brain, Zap, Clock, Shield,
  Syringe, Pill, SprayCan, Dumbbell, Moon, Sparkles,
  Activity, AlertTriangle, Bookmark, Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, TRIAL_DAYS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/analytics';
import { peptidesPublic as allPeptides } from '@/data/peptides-public';
import ShareButtons from '@/components/ShareButtons';
import { SITE_URL } from '@/lib/constants';

/* ─── Types ──────────────────────────────────────────── */

type GoalId = 'weight-loss' | 'muscle' | 'anti-aging' | 'recovery' | 'sleep' | 'immunity' | 'skin' | 'general';
type AgeId = '18-25' | '26-35' | '36-45' | '46-55' | '56+';
type ExperienceId = 'beginner' | 'intermediate' | 'advanced';
type HealthIssueId = 'diabetes' | 'blood-pressure' | 'thyroid' | 'none';
type MedicationId = 'yes' | 'no';
type BudgetId = 'under-200' | '200-500' | '500-1000' | 'over-1000';
type InjectionId = 'yes' | 'prefer-oral' | 'no-preference';
type PriorityId = 'speed' | 'safety' | 'cost';

interface QuizAnswers {
  goal?: GoalId;
  age?: AgeId;
  experience?: ExperienceId;
  healthIssues: HealthIssueId[];
  medication?: MedicationId;
  budget?: BudgetId;
  injection?: InjectionId;
  priority?: PriorityId;
}

interface QuizOption {
  id: string;
  label: string;
  icon?: ElementType;
  description?: string;
}

interface QuizStep {
  id: string;
  question: string;
  subtitle?: string;
  options: QuizOption[];
  multiSelect?: boolean;
}

interface ProtocolResult {
  primary: {
    peptideId: string;
    nameAr: string;
    nameEn: string;
    reason: string;
  };
  supporting: {
    peptideId: string;
    nameAr: string;
    nameEn: string;
    reason: string;
  }[];
  dosingSchedule: string;
  monthlyCost: string;
  warnings: string[];
  protocolDuration: string;
}

/* ─── Quiz Steps ─────────────────────────────────────── */

const STEPS: QuizStep[] = [
  {
    id: 'goal',
    question: 'ما هدفك الرئيسي؟',
    subtitle: 'اختر الهدف الأهم لك حالياً',
    options: [
      { id: 'weight-loss', label: 'فقدان الوزن', icon: TrendingDown, description: 'حرق الدهون وتحسين تكوين الجسم' },
      { id: 'muscle', label: 'بناء العضل', icon: Dumbbell, description: 'زيادة الكتلة العضلية والقوة' },
      { id: 'anti-aging', label: 'مقاومة الشيخوخة', icon: Clock, description: 'إطالة العمر الصحي والحيوية' },
      { id: 'recovery', label: 'التعافي', icon: Heart, description: 'شفاء الإصابات وتعافي الأنسجة' },
      { id: 'sleep', label: 'تحسين النوم', icon: Moon, description: 'نوم أعمق وأكثر جودة' },
      { id: 'immunity', label: 'تعزيز المناعة', icon: Shield, description: 'تقوية الجهاز المناعي' },
      { id: 'skin', label: 'صحة البشرة', icon: Sparkles, description: 'نضارة وتجديد البشرة' },
      { id: 'general', label: 'صحة عامة', icon: Activity, description: 'تحسين الأداء العام والطاقة' },
    ],
  },
  {
    id: 'age',
    question: 'ما عمرك؟',
    subtitle: 'يساعدنا في تحديد الجرعات المناسبة',
    options: [
      { id: '18-25', label: '18 - 25' },
      { id: '26-35', label: '26 - 35' },
      { id: '36-45', label: '36 - 45' },
      { id: '46-55', label: '46 - 55' },
      { id: '56+', label: '56+' },
    ],
  },
  {
    id: 'experience',
    question: 'ما مستوى خبرتك مع الببتيدات؟',
    subtitle: 'لا تقلق إذا كنت مبتدئ — سنوجّهك',
    options: [
      { id: 'beginner', label: 'مبتدئ', description: 'أول مرة أتعرف على الببتيدات' },
      { id: 'intermediate', label: 'متوسط', description: 'جربت ببتيد أو اثنين من قبل' },
      { id: 'advanced', label: 'متقدم', description: 'أستخدم الببتيدات بانتظام' },
    ],
  },
  {
    id: 'healthIssues',
    question: 'هل لديك أي من هذه المشاكل الصحية؟',
    subtitle: 'يمكنك اختيار أكثر من خيار',
    multiSelect: true,
    options: [
      { id: 'diabetes', label: 'سكري' },
      { id: 'blood-pressure', label: 'ضغط الدم' },
      { id: 'thyroid', label: 'غدة درقية' },
      { id: 'none', label: 'لا شيء مما سبق' },
    ],
  },
  {
    id: 'medication',
    question: 'هل تتناول أدوية حالياً؟',
    subtitle: 'لتجنب أي تعارض دوائي',
    options: [
      { id: 'yes', label: 'نعم' },
      { id: 'no', label: 'لا' },
    ],
  },
  {
    id: 'budget',
    question: 'ما ميزانيتك الشهرية؟',
    subtitle: 'سنقترح خيارات مناسبة لميزانيتك',
    options: [
      { id: 'under-200', label: 'أقل من 200 ر.س' },
      { id: '200-500', label: '200 - 500 ر.س' },
      { id: '500-1000', label: '500 - 1,000 ر.س' },
      { id: 'over-1000', label: 'أكثر من 1,000 ر.س' },
    ],
  },
  {
    id: 'injection',
    question: 'هل أنت مرتاح مع الحقن؟',
    subtitle: 'بعض الببتيدات متوفرة بأشكال فموية أو بخاخ',
    options: [
      { id: 'yes', label: 'نعم، عادي', icon: Syringe },
      { id: 'prefer-oral', label: 'أفضّل الفموي', icon: Pill },
      { id: 'no-preference', label: 'لا مانع عندي', icon: SprayCan },
    ],
  },
  {
    id: 'priority',
    question: 'ما أولويتك في النتائج؟',
    subtitle: 'سنوازن توصيتنا بناءً على أولويتك',
    options: [
      { id: 'speed', label: 'سرعة النتائج', icon: Zap, description: 'أريد أسرع نتيجة ممكنة' },
      { id: 'safety', label: 'السلامة أولاً', icon: Shield, description: 'أفضّل الخيار الأكثر أماناً' },
      { id: 'cost', label: 'أقل تكلفة', icon: Calculator, description: 'أريد أفضل قيمة مقابل السعر' },
    ],
  },
];

/* ─── Budget helpers ─────────────────────────────────── */

function parseCostRange(costEstimate?: string): { min: number; max: number } | null {
  if (!costEstimate) return null;
  const nums = costEstimate.replace(/,/g, '').match(/[\d.]+/g);
  if (!nums || nums.length < 1) return null;
  return { min: parseFloat(nums[0]), max: nums.length > 1 ? parseFloat(nums[1]) : parseFloat(nums[0]) };
}

function fitsInBudget(costEstimate: string | undefined, budget: BudgetId): boolean {
  const range = parseCostRange(costEstimate);
  if (!range) return true;
  switch (budget) {
    case 'under-200': return range.min < 200;
    case '200-500': return range.min <= 500;
    case '500-1000': return range.min <= 1000;
    case 'over-1000': return true;
  }
}

/* ─── Recommendation Engine ──────────────────────────── */

const GOAL_TO_CATEGORIES: Record<GoalId, string[]> = {
  'weight-loss': ['metabolic'],
  'muscle': ['recovery', 'hormonal'],
  'anti-aging': ['longevity'],
  'recovery': ['recovery'],
  'sleep': ['longevity'],
  'immunity': ['longevity', 'skin-gut'],
  'skin': ['skin-gut'],
  'general': ['recovery', 'longevity'],
};

const GOAL_PRIMARY_PEPTIDES: Record<GoalId, string[]> = {
  'weight-loss': ['semaglutide', 'tirzepatide', 'aod-9604', 'tesamorelin', '5-amino-1mq'],
  'muscle': ['cjc-1295', 'ipamorelin', 'follistatin-344', 'igf-1-lr3', 'sermorelin'],
  'anti-aging': ['epithalon', 'thymosin-alpha-1', 'thymalin', 'ss-31', 'mots-c'],
  'recovery': ['bpc-157', 'tb-500', 'cjc-1295', 'ipamorelin', 'sermorelin'],
  'sleep': ['dsip', 'epithalon', 'selank', 'semax'],
  'immunity': ['thymosin-alpha-1', 'thymalin', 'll-37', 'kpv'],
  'skin': ['ghk-cu', 'copper-peptides-topical', 'collagen-peptides', 'bpc-157'],
  'general': ['bpc-157', 'ipamorelin', 'cjc-1295', 'semax', 'epithalon'],
};

const ORAL_NASAL_TOPICAL_IDS = new Set([
  'collagen-peptides', '5-amino-1mq', 'copper-peptides-topical', 'larazotide', 'kpv',
  'semax', 'na-semax-amidate', 'selank', 'dihexa', 'testicular-bioregulators',
]);

function hasHealthConflict(peptideId: string, healthIssues: HealthIssueId[]): string | null {
  const peptide = allPeptides.find(p => p.id === peptideId);
  if (!peptide) return null;
  const contra = (peptide.contraindicationsAr ?? '').toLowerCase();

  if (healthIssues.includes('diabetes')) {
    if (['semaglutide', 'tirzepatide', 'retatrutide'].includes(peptideId)) {
      return 'يتطلب إشراف طبي مع مرضى السكري — تعديل أدوية السكري ضروري';
    }
    if (contra.includes('سكري') || contra.includes('سكر')) {
      return 'يتعارض مع مرض السكري — استشر طبيبك';
    }
  }
  if (healthIssues.includes('blood-pressure')) {
    if (contra.includes('ضغط') || contra.includes('قلب')) {
      return 'يتطلب حذر مع مرضى ضغط الدم';
    }
  }
  if (healthIssues.includes('thyroid')) {
    if (contra.includes('درقية') || contra.includes('الغدة الدرقية')) {
      return 'يتطلب حذر مع مشاكل الغدة الدرقية';
    }
    if (['semaglutide', 'tirzepatide', 'retatrutide'].includes(peptideId)) {
      return 'موانع استخدام مع تاريخ سرطان الغدة الدرقية — استشر طبيبك';
    }
  }
  return null;
}

function getProtocol(answers: QuizAnswers): ProtocolResult {
  const { goal, age, experience, healthIssues, medication, budget, injection, priority } = answers;
  const g = goal || 'general';
  const exp = experience || 'beginner';
  const bud = budget || '200-500';
  const inj = injection || 'no-preference';
  const pri = priority || 'safety';

  const preferOral = inj === 'prefer-oral';
  const candidateIds = GOAL_PRIMARY_PEPTIDES[g];

  // Score each candidate
  const scored = candidateIds
    .map(id => {
      const p = allPeptides.find(pp => pp.id === id);
      if (!p) return null;

      let score = 100;
      const conflict = hasHealthConflict(id, healthIssues);
      if (conflict) score -= 40;

      // Budget fit
      if (!fitsInBudget(p.costEstimate, bud)) score -= 30;

      // Experience match
      if (exp === 'beginner' && p.difficulty === 'advanced') score -= 35;
      if (exp === 'beginner' && p.difficulty === 'intermediate') score -= 15;
      if (exp === 'advanced' && p.difficulty === 'beginner') score -= 5;

      // Injection preference
      const isOralNasal = ORAL_NASAL_TOPICAL_IDS.has(id);
      if (preferOral && !isOralNasal) score -= 20;
      if (preferOral && isOralNasal) score += 15;

      // Priority
      if (pri === 'safety') {
        if (p.difficulty === 'beginner') score += 10;
        if (p.fdaApproved) score += 15;
        if (p.evidenceLevel === 'excellent' || p.evidenceLevel === 'strong') score += 10;
      }
      if (pri === 'cost') {
        const range = parseCostRange(p.costEstimate);
        if (range && range.min < 300) score += 15;
        if (range && range.min < 200) score += 10;
      }
      if (pri === 'speed') {
        if (p.difficulty === 'advanced' && exp === 'advanced') score += 10;
      }

      // Age adjustments
      if (age === '56+' && p.difficulty === 'advanced') score -= 10;
      if (age === '18-25' && p.difficulty === 'advanced') score -= 15;

      return { id, peptide: p, score, conflict };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score);

  // Pick primary
  const primary = scored[0] || {
    id: 'bpc-157',
    peptide: allPeptides.find(p => p.id === 'bpc-157')!,
    score: 50,
    conflict: null,
  };

  // Pick 1-2 supporting from different categories or complementary
  const supportingCandidates = allPeptides
    .filter(p => {
      if (p.id === primary.id) return false;
      const cats = GOAL_TO_CATEGORIES[g];
      if (!cats.includes(p.category)) return false;
      if (exp === 'beginner' && p.difficulty === 'advanced') return false;
      if (preferOral && !ORAL_NASAL_TOPICAL_IDS.has(p.id)) return false;
      if (!fitsInBudget(p.costEstimate, bud)) return false;
      if (hasHealthConflict(p.id, healthIssues)) return false;
      return true;
    })
    .slice(0, 2);

  // Build dosing schedule
  const pData = primary.peptide;
  let dosingSchedule = (pData.dosageAr ?? 'اشترك لعرض الجرعة').split('.')[0] + '.';
  if (exp === 'beginner') {
    dosingSchedule += ' يُنصح بالبدء بأقل جرعة والزيادة تدريجياً.';
  }

  // Estimated monthly cost
  const primaryCost = pData.costEstimate || 'غير محدد';

  // Warnings
  const warnings: string[] = [];
  if (primary.conflict) warnings.push(primary.conflict);
  if (medication === 'yes') {
    warnings.push('تتناول أدوية حالياً — استشر طبيبك قبل البدء لتجنب أي تعارض.');
  }
  if (healthIssues.includes('diabetes')) {
    warnings.push('مريض سكري — راقب مستويات السكر بانتظام أثناء الاستخدام.');
  }
  if (healthIssues.includes('blood-pressure')) {
    warnings.push('مريض ضغط — راقب الضغط بانتظام وأبلغ طبيبك عن أي تغييرات.');
  }
  if (age === '18-25') {
    warnings.push('عمرك أقل من 26 — بعض الببتيدات غير مُوصى بها لصغار السن. استشر طبيبك.');
  }
  if (age === '56+') {
    warnings.push('ابدأ بجرعات منخفضة وزِد تدريجياً — الاستجابة تختلف مع العمر.');
  }

  const cycleDur = pData.cycleAr ? pData.cycleAr.split('.')[0] + '.' : 'اشترك لعرض مدة الدورة';

  return {
    primary: {
      peptideId: primary.id,
      nameAr: pData.nameAr,
      nameEn: pData.nameEn,
      reason: pData.summaryAr.split('.').slice(0, 2).join('.') + '.',
    },
    supporting: supportingCandidates.map(sp => ({
      peptideId: sp.id,
      nameAr: sp.nameAr,
      nameEn: sp.nameEn,
      reason: sp.summaryAr.split('.')[0] + '.',
    })),
    dosingSchedule,
    monthlyCost: primaryCost,
    warnings,
    protocolDuration: cycleDur,
  };
}

/* ─── Slide animation wrapper ────────────────────────── */

function SlideTransition({ children, stepKey, direction }: { children: ReactNode; stepKey: string; direction: 'forward' | 'backward' }) {
  const [visible, setVisible] = useState(false);
  const [currentKey, setCurrentKey] = useState(stepKey);

  useEffect(() => {
    if (stepKey !== currentKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      const timer = setTimeout(() => {
        setCurrentKey(stepKey);
        setVisible(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [stepKey, currentKey]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-x-0' : direction === 'forward' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4',
      )}
    >
      {children}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────── */

export default function PeptideQuiz() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'welcome' | 'quiz' | 'result'>('welcome');
  const [step, setStep] = useState(() => {
    try { return parseInt(sessionStorage.getItem('pptides_quiz_step') ?? '0', 10) || 0; } catch { return 0; }
  });
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [answers, setAnswers] = useState<QuizAnswers>(() => {
    try { const s = sessionStorage.getItem('pptides_quiz_progress'); return s ? JSON.parse(s) : { healthIssues: [] }; } catch { return { healthIssues: [] }; }
  });
  const [result, setResult] = useState<ProtocolResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem('pptides_quiz_step', String(step)); } catch { /* expected */ }
  }, [step]);
  useEffect(() => {
    try { sessionStorage.setItem('pptides_quiz_progress', JSON.stringify(answers)); } catch { /* expected */ }
  }, [answers]);

  // Load previous result
  const [previousData] = useState<{ result: ProtocolResult; goal?: string; ts?: number } | null>(() => {
    try {
      const s = localStorage.getItem('pptides_quiz_results');
      if (!s) return null;
      const data = JSON.parse(s);
      if (!data.result) return null;
      return { result: data.result, goal: data.goal ?? data.answers?.goal, ts: data.ts };
    } catch { return null; }
  });
  const _hasPrevious = !!previousData;

  const loadPrevious = useCallback(() => {
    try {
      const s = localStorage.getItem('pptides_quiz_results');
      if (s) {
        const data = JSON.parse(s);
        if (data.answers) setAnswers(data.answers);
        if (data.result) setResult(data.result);
        setPhase('result');
      }
    } catch { /* ignore */ }
  }, []);

  const saveResult = useCallback((a: QuizAnswers, r: ProtocolResult) => {
    try {
      localStorage.setItem('pptides_quiz_results', JSON.stringify({
        goal: a.goal ?? null,
        answers: a,
        result: r,
        ts: Date.now(),
      }));
    } catch { /* ignore */ }
  }, []);

  const handleSelect = useCallback((optionId: string) => {
    const currentStep = STEPS[step];

    if (currentStep.multiSelect) {
      // Multi-select logic for health issues
      setAnswers(prev => {
        let newIssues = [...prev.healthIssues];
        if (optionId === 'none') {
          newIssues = ['none' as HealthIssueId];
        } else {
          newIssues = newIssues.filter(i => i !== 'none');
          if (newIssues.includes(optionId as HealthIssueId)) {
            newIssues = newIssues.filter(i => i !== optionId);
          } else {
            newIssues.push(optionId as HealthIssueId);
          }
        }
        if (newIssues.length === 0) newIssues = ['none' as HealthIssueId];
        return { ...prev, healthIssues: newIssues };
      });
      return; // Don't auto-advance for multi-select
    }

    // Single-select: update and advance
    setAnswers(prev => {
      const updated = { ...prev, [currentStep.id]: optionId };

      if (step >= STEPS.length - 1) {
        // Last step — compute result
        const protocol = getProtocol(updated);
        setResult(protocol);
        saveResult(updated, protocol);
        setPhase('result');
        events.quizComplete(updated.goal ?? 'general');

        // Save to supabase if logged in
        if (user) {
          supabase.from('user_profiles').update({
            goals: [updated.goal],
          }).eq('user_id', user.id).then(() => {}).catch((e) => { console.error('PeptideQuiz: failed to save goals', e); });
        }
      } else {
        setDirection('forward');
        setStep(s => s + 1);
      }

      return updated;
    });
  }, [step, user, saveResult]);

  const handleMultiSelectContinue = useCallback(() => {
    setDirection('forward');
    if (step >= STEPS.length - 1) {
      const protocol = getProtocol(answers);
      setResult(protocol);
      saveResult(answers, protocol);
      setPhase('result');
      events.quizComplete(answers.goal ?? 'general');
    } else {
      setStep(s => s + 1);
    }
  }, [step, answers, saveResult]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setDirection('backward');
      setStep(s => s - 1);
    } else {
      setPhase('welcome');
    }
  }, [step]);

  const handleReset = useCallback(() => {
    setPhase('welcome');
    setStep(0);
    setAnswers({ healthIssues: [] });
    setResult(null);
    setSaved(false);
    try { sessionStorage.removeItem('pptides_quiz_step'); sessionStorage.removeItem('pptides_quiz_progress'); } catch { /* expected */ }
  }, []);

  const handleSaveResult = useCallback(() => {
    if (result) {
      saveResult(answers, result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [result, answers, saveResult]);

  /* ─── Welcome Screen ───────────────────────────────── */

  if (phase === 'welcome') {
    return (
      <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-gradient-to-b from-stone-50 to-white dark:from-stone-900 dark:to-stone-950 p-8 md:p-10 shadow-xl shadow-emerald-900/5">
        {/* Icon cluster */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30">
              <FlaskConical className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 shadow-sm">
              <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 shadow-sm">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-center text-stone-900 dark:text-stone-100 mb-3 leading-tight">
          اكتشف البروتوكول المثالي لك
        </h2>
        <p className="text-center text-stone-500 dark:text-stone-300 mb-8 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          اختبار علمي مُخصّص يحدد لك الببتيدات الأنسب لأهدافك الصحية، مستوى خبرتك، وميزانيتك.
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Clock, text: '3 دقائق فقط' },
            { icon: Shield, text: 'تقييم آمن' },
            { icon: Zap, text: 'نتيجة فورية' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/50 p-3">
              <Icon className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { events.quizStart(); setPhase('quiz'); }}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-white font-semibold text-base transition-all hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-600/20"
        >
          ابدأ الاختبار
          <ArrowLeft className="h-5 w-5" />
        </button>

        {previousData && (
          <div className="mt-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">نتيجتك السابقة</p>
              {previousData.ts && (
                <span className="text-[10px] text-stone-400">
                  {new Date(previousData.ts).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <FlaskConical className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{previousData.result.primary.nameAr}</p>
                <p className="text-xs text-stone-500 dark:text-stone-300 truncate">{previousData.result.primary.nameEn}</p>
              </div>
            </div>
            {previousData.result.supporting.length > 0 && (
              <p className="text-xs text-stone-500 dark:text-stone-300 mb-3">
                + {previousData.result.supporting.map(s => s.nameAr).join('، ')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={loadPrevious}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
              >
                عرض التفاصيل
              </button>
              <button
                onClick={() => { events.quizStart(); setPhase('quiz'); }}
                className="flex-1 rounded-lg border border-emerald-300 dark:border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              >
                أعد الاختبار
              </button>
            </div>
          </div>
        )}

        {!previousData && (
          <Link
            to="/library"
            className="mt-2 flex items-center justify-center text-sm text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors py-2"
          >
            تخطّي — تصفّح المكتبة مباشرة
          </Link>
        )}
      </div>
    );
  }

  /* ─── Results Screen ───────────────────────────────── */

  if (phase === 'result' && result) {
    const primaryData = allPeptides.find(p => p.id === result.primary.peptideId);
    const hasCalcPreset = primaryData && !ORAL_NASAL_TOPICAL_IDS.has(result.primary.peptideId);
    const showSubscribeCTA = !user;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/30 dark:to-stone-950 p-6 md:p-8 shadow-xl shadow-emerald-900/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-base font-black text-emerald-800 dark:text-emerald-300">بروتوكولك المخصّص</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500">بناءً على إجاباتك</p>
            </div>
          </div>

          {/* Primary Peptide */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">الببتيد الرئيسي</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-stone-900 dark:text-stone-100">{result.primary.nameAr}</h3>
              <span className="text-sm font-medium text-stone-400" dir="ltr">{result.primary.nameEn}</span>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-200 leading-relaxed mb-3">{result.primary.reason}</p>

            {/* Dosing */}
            <div className="space-y-2 text-sm">
              <div className="flex gap-2 items-start">
                  <span className="font-bold text-stone-700 dark:text-stone-200 shrink-0">الجرعة:</span>
                  <span className="text-stone-600 dark:text-stone-300">{primaryData?.dosageAr ? primaryData.dosageAr.split('.')[0] : 'اشترك لعرض الجرعة'}</span>
                </div>
              {primaryData?.timingAr && (
                <div className="flex gap-2 items-start">
                  <span className="font-bold text-stone-700 dark:text-stone-200 shrink-0">التوقيت:</span>
                  <span className="text-stone-600 dark:text-stone-300">{primaryData.timingAr.split('.')[0]}</span>
                </div>
              )}
              <div className="flex gap-2 items-start">
                <span className="font-bold text-stone-700 dark:text-stone-200 shrink-0">المدة:</span>
                <span className="text-stone-600 dark:text-stone-300">{result.protocolDuration}</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">التكلفة:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{result.monthlyCost}</span>
              </div>
            </div>
          </div>

          {/* Supporting Peptides */}
          {result.supporting.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wider">ببتيدات داعمة</p>
              {result.supporting.map(sp => {
                const spData = allPeptides.find(p => p.id === sp.peptideId);
                return (
                  <div key={sp.peptideId} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">{sp.nameAr}</h4>
                      <span className="text-xs text-stone-400" dir="ltr">{sp.nameEn}</span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-300 leading-relaxed">{sp.reason}</p>
                    {spData?.costEstimate && (
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{spData.costEstimate}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">تنبيهات مهمة</span>
              </div>
              <ul className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed flex gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              to={user ? `/peptide/${result.primary.peptideId}?start=1` : `/signup?redirect=/pricing`}
              className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-white font-semibold transition-all hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-600/20"
            >
              {user ? 'ابدأ هذا البروتوكول' : `ابدأ بروتوكولك — ${TRIAL_DAYS} أيام مجانًا`}
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {hasCalcPreset && (
              <Link
                to={`/calculator?peptide=${encodeURIComponent(result.primary.nameEn)}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
              >
                <Calculator className="h-4 w-4" />
                احسب جرعة {result.primary.nameAr}
              </Link>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveResult}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
                  saved
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-emerald-300 dark:hover:border-emerald-700',
                )}
              >
                {saved ? <CheckCircle className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {saved ? 'تم الحفظ!' : 'احفظ النتيجة'}
              </button>
            </div>
          </div>

          {/* Share */}
          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
            <p className="text-xs text-stone-500 dark:text-stone-300 mb-2 text-center">شارك نتيجتك</p>
            <ShareButtons
              url={`${SITE_URL}/quiz`}
              title={`نتيجة اختبار الببتيدات: ${result.primary.nameAr}`}
              description={result.primary.reason}
              layout="row"
            />
          </div>

          {/* Supporting links */}
          {result.supporting.length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-700">
              <p className="text-xs text-stone-500 dark:text-stone-300 mb-2">تعرّف على الببتيدات الداعمة:</p>
              <div className="flex flex-wrap gap-2">
                {result.supporting.map(sp => (
                  <Link
                    key={sp.peptideId}
                    to={`/peptide/${sp.peptideId}`}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-700 transition-colors bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full"
                  >
                    {sp.nameAr}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleReset}
              className="text-sm text-stone-500 dark:text-stone-300 hover:text-emerald-700 transition-colors py-2"
            >
              أعد الاختبار من البداية
            </button>
          </div>
        </div>

        {/* Subscribe CTA for non-users */}
        {showSubscribeCTA && (
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/30 dark:to-stone-950 p-6 text-center">
            <p className="text-base font-black text-stone-900 dark:text-stone-100 mb-1">
              ابدأ بروتوكولك الكامل مع <span className="text-emerald-700">pptides</span>
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-300 mb-1">
              البروتوكول الكامل: الجرعة الدقيقة، التوقيت، التحاليل، والتجميعات
            </p>
            <p className="text-xs font-bold text-emerald-700 mb-4">
              {TRIAL_DAYS} أيام مجانًا — بدون رسوم، إلغاء بضغطة واحدة
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                to="/signup?redirect=/pricing"
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-600/20"
              >
                ابدأ تجربتك المجانية
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className="flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 px-5 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
              >
                عرض الأسعار — من {PRICING.essentials.label}/شهر
              </Link>
            </div>
          </div>
        )}

        {/* Medical Disclaimer */}
        <div className="rounded-xl bg-stone-100 dark:bg-stone-900/50 p-4 text-center">
          <p className="text-[11px] text-stone-500 dark:text-stone-300 leading-relaxed">
            هذا الاختبار تعليمي فقط ولا يُغني عن استشارة الطبيب. لا تبدأ أي بروتوكول بدون إشراف طبي متخصص.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Quiz Questions ───────────────────────────────── */

  const currentStep = STEPS[step];
  const isMultiSelect = currentStep.multiSelect;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xl shadow-emerald-900/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 min-h-[44px] text-sm text-stone-500 dark:text-stone-300 transition-colors hover:text-stone-700 dark:hover:text-stone-300"
        >
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          رجوع
        </button>
        <span className="text-xs text-stone-500 dark:text-stone-300 font-medium">
          {step + 1} من {STEPS.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="mb-6 h-1.5 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label="تقدّم الاختبار"
      >
        <div
          className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <SlideTransition stepKey={currentStep.id} direction={direction}>
        <div>
          <h3 className="text-lg font-black text-stone-900 dark:text-stone-100 mb-1">{currentStep.question}</h3>
          {currentStep.subtitle && (
            <p className="text-xs text-stone-500 dark:text-stone-300 mb-5">{currentStep.subtitle}</p>
          )}

          {/* Options */}
          <div className={cn(
            'grid gap-2',
            currentStep.id === 'goal' ? 'grid-cols-2' : 'grid-cols-1',
          )}>
            {currentStep.options.map(opt => {
              const Icon = opt.icon;
              const isSelected = isMultiSelect
                ? answers.healthIssues.includes(opt.id as HealthIssueId)
                : answers[currentStep.id as keyof QuizAnswers] === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'w-full rounded-xl border text-sm transition-all active:scale-[0.98]',
                    currentStep.id === 'goal'
                      ? 'flex flex-col items-center gap-1.5 px-3 py-4 text-center'
                      : 'flex items-center gap-3 px-5 py-3.5',
                    isSelected
                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-stone-50 dark:hover:bg-stone-900',
                  )}
                >
                  {Icon && (
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                      isSelected ? 'bg-emerald-100 dark:bg-emerald-800/40' : 'bg-stone-100 dark:bg-stone-800',
                    )}>
                      <Icon className={cn('h-4.5 w-4.5', isSelected ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-300')} />
                    </div>
                  )}
                  {isMultiSelect && !Icon && (
                    <div className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md border-2 shrink-0 transition-all',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-stone-200 dark:border-stone-700',
                    )}>
                      {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                  )}
                  <div className={currentStep.id === 'goal' ? '' : 'flex-1 text-start'}>
                    <span className="text-sm font-bold block">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[11px] text-stone-500 dark:text-stone-300 block mt-0.5">{opt.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Multi-select continue button */}
          {isMultiSelect && (
            <button
              onClick={handleMultiSelectContinue}
              disabled={answers.healthIssues.length === 0}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-white font-semibold transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
            >
              التالي
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </SlideTransition>

      {/* Skip to library */}
      <Link
        to="/library"
        className="mt-5 flex items-center justify-center text-xs text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300 transition-colors py-2"
      >
        تخطّي — تصفّح المكتبة مباشرة
      </Link>
    </div>
  );
}
