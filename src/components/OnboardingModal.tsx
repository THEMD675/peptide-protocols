import { useState, useEffect, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { Sparkles, BookOpen, Calculator, Bot, TrendingDown, Brain, Dumbbell, Heart, Zap, Clock, Shield, Moon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TRIAL_DAYS, PEPTIDE_COUNT } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { toast } from 'sonner';

const ONBOARDING_KEY = 'pptides_onboarded';

/** Canonical goal IDs — matches PeptideQuiz.tsx */
const GOALS = [
  { id: 'weight-loss', label: 'فقدان دهون وإنقاص وزن', Icon: TrendingDown },
  { id: 'recovery', label: 'تعافي من إصابة أو أداء رياضي', Icon: Heart },
  { id: 'muscle', label: 'بناء عضل وقوة', Icon: Dumbbell },
  { id: 'anti-aging', label: 'إطالة عمر ومكافحة شيخوخة', Icon: Clock },
  { id: 'sleep', label: 'تحسين النوم', Icon: Moon },
  { id: 'immunity', label: 'تعزيز المناعة', Icon: Shield },
  { id: 'skin', label: 'بشرة أو أمعاء', Icon: Zap },
  { id: 'general', label: 'صحة عامة وتحسين هرمونات', Icon: Brain },
] as const;

function getTrialPlan(goal: string) {
  const category = GOAL_TO_CATEGORY[goal] ?? '';
  const libraryLink = `/library${category ? `?category=${encodeURIComponent(category)}` : ''}`;
  return [
    { day: 'اليوم الأول', task: 'تصفّح المكتبة واكتشف الببتيد المناسب', icon: BookOpen, to: libraryLink },
    { day: 'اليوم الثاني', task: 'اسأل المدرب الذكي عن بروتوكول مخصّص', icon: Bot, to: '/coach' },
    { day: 'اليوم الثالث', task: 'جرّب حاسبة الجرعات واحسب جرعتك', icon: Calculator, to: '/calculator' },
  ];
}

/** Maps canonical goal id → Library category id (peptides.ts) */
const GOAL_TO_CATEGORY: Record<string, string> = {
  'weight-loss': 'metabolic',
  'muscle': 'recovery',
  'anti-aging': 'longevity',
  'recovery': 'recovery',
  'sleep': 'longevity',
  'immunity': 'longevity',
  'skin': 'skin-gut',
  'general': 'recovery',
};

/** Goal label map for displaying quiz results in onboarding */
const GOAL_LABELS: Record<string, string> = {
  'weight-loss': 'فقدان الوزن',
  'muscle': 'بناء العضل',
  'anti-aging': 'مقاومة الشيخوخة',
  'recovery': 'التعافي',
  'sleep': 'تحسين النوم',
  'immunity': 'تعزيز المناعة',
  'skin': 'صحة البشرة',
  'general': 'صحة عامة',
};

export default function OnboardingModal({ forceOpen, onClose: externalClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Initialize show state synchronously from localStorage/sessionStorage to prevent flash
  const [show, setShow] = useState(() => {
    if (forceOpen) return true;
    try {
      if (localStorage.getItem(ONBOARDING_KEY) === 'true') return false;
      if (sessionStorage.getItem(ONBOARDING_KEY + '_skipped') === 'true') return false;
      return true;
    } catch (e) { logError('onboarding:', e); return true; }
  });
  const [step, setStep] = useState<'goal' | 'baseline' | 'plan'>('goal');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [quizGoalLabel, setQuizGoalLabel] = useState('');
  const [animatePlan, setAnimatePlan] = useState(false);
  const [baseline, setBaseline] = useState({ energy: 3, sleep: 3, pain: 3 });
  const userName = user?.email?.split('@')[0]?.charAt(0).toUpperCase() + (user?.email?.split('@')[0]?.slice(1) ?? '') || '';
  useEffect(() => {
    if (forceOpen) { setShow(true); return; }
  }, [forceOpen]);

  // FIX 2: Check DB for onboarding completion (survives localStorage clear)
  useEffect(() => {
    if (forceOpen || !user?.id) return;
    // If localStorage already says completed, no need to check DB
    try { if (localStorage.getItem(ONBOARDING_KEY) === 'true') return; } catch (e) { logError('onboarding:', e); }
    supabase.from('user_profiles').select('onboarding_completed_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_completed_at) {
          try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch (e) { logError('onboarding:', e); }
          setShow(false);
        }
      }).catch((e: unknown) => logError('silent catch:', e));
  }, [user?.id, forceOpen]);

  // If user already took the quiz, skip the goal step
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pptides_quiz_results');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.goal) {
          setSelectedGoal(parsed.goal);
          setQuizGoalLabel(GOAL_LABELS[parsed.goal] ?? '');
          setStep('baseline');

        }
      }
    } catch (e) { logError('onboarding:', e); }
  }, []);
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [show]);

  // Fix 4: "complete" marks onboarding as permanently done (skip button, completing plan)
  const handleComplete = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch (e) { logError('onboarding:', e); }
    // C13: Persist goals to Supabase user_profiles table
    if (user && selectedGoal) {
      supabase.from('user_profiles').update({
        onboarding_goals: { goal: selectedGoal, ts: Date.now() },
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id).then(({ error }) => { if (error) { logError('OnboardingModal: failed to persist goals', error); toast.error('تعذّر حفظ أهدافك — حاول لاحقًا من الإعدادات'); } }).catch((e) => { logError('OnboardingModal: failed to persist goals', e); });
    }
    setShow(false);
    externalClose?.();
  }, [externalClose, user, selectedGoal]);

  // "dismiss" just hides the modal for this session — user can re-open onboarding later
  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem(ONBOARDING_KEY + '_skipped', 'true'); } catch (e) { logError('onboarding:', e); }
    setShow(false);
    externalClose?.();
  }, [externalClose]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [show, handleDismiss]);

  if (!show) return null;

  const handleGoalSelect = (goalId: string) => {
    try {
      const existing = localStorage.getItem('pptides_quiz_results');
      const parsed = existing ? JSON.parse(existing) : {};
      // eslint-disable-next-line react-hooks/purity
      const ts = Date.now();
      localStorage.setItem('pptides_quiz_results', JSON.stringify({
        ...parsed,
        goal: goalId,
        answers: { ...(parsed.answers ?? {}), goal: goalId },
        ts,
      }));
    } catch (e) { logError('onboarding:', e); }
    setSelectedGoal(goalId);
    setStep('baseline');
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={step === 'goal' ? 'onboarding-title-step1' : step === 'baseline' ? 'onboarding-title-baseline' : 'onboarding-title-step2'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleDismiss}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
          {/* Progress indicator */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step === 'goal' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step === 'baseline' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step === 'plan' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
          </div>
          <p className="mb-4 text-center text-[11px] font-medium text-stone-400">
            {step === 'goal' ? 'الخطوة ١ من ٣' : step === 'baseline' ? 'الخطوة ٢ من ٣' : 'الخطوة ٣ من ٣'}
          </p>

          {step === 'goal' ? (
            /* ═══ STEP 1: GOAL ═══ */
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" style={{ animation: 'onb-sparkle 2s ease-in-out infinite' }}>
                <Sparkles className="h-7 w-7 text-emerald-700" />
              </div>
              <h2 id="onboarding-title-step1" className="mb-1 text-center text-xl font-bold text-stone-900 dark:text-stone-100">
                {userName ? `أهلاً ${userName}، مرحبًا في pptides` : 'مرحبًا في pptides'}
              </h2>
              <p className="mb-1 text-center text-xs font-medium text-emerald-700">{PEPTIDE_COUNT}+ ببتيد تحت تصرفك</p>
              <p className="mb-6 text-center text-sm text-stone-600 dark:text-stone-300">ما هدفك الأساسي؟ سنبني لك خطة مخصّصة.</p>
              <div className="space-y-2">
                {GOALS.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => handleGoalSelect(g.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 min-h-[44px]"
                    style={{ animation: `onb-fade-in 0.3s ease-out ${i * 0.05}s both` }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <g.Icon className="h-4 w-4 text-emerald-700" />
                    </div>
                    {g.label}
                  </button>
                ))}
              </div>
              <button onClick={handleDismiss} className="mt-4 w-full min-h-[44px] text-center text-xs text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300">
                تخطّي
              </button>
            </>
          ) : step === 'baseline' ? (
            /* ═══ STEP 2: BASELINE WELLNESS ═══ */
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" style={{ animation: 'onb-sparkle 2s ease-in-out infinite' }}>
                <Heart className="h-7 w-7 text-emerald-700" />
              </div>
              <h2 id="onboarding-title-baseline" className="mb-1 text-center text-xl font-bold text-stone-900 dark:text-stone-100">
                حالتك الحالية
              </h2>
              <p className="mb-6 text-center text-sm text-stone-600 dark:text-stone-300">سنقارن تقدّمك بهذه الأرقام لاحقًا</p>
              <div className="space-y-5">
                {([
                  { key: 'energy' as const, label: 'الطاقة', low: 'منخفضة', high: 'عالية' },
                  { key: 'sleep' as const, label: 'النوم', low: 'سيئ', high: 'ممتاز' },
                  { key: 'pain' as const, label: 'الألم', low: 'بدون', high: 'شديد' },
                ] as const).map(metric => (
                  <div key={metric.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{metric.label}</span>
                      <span className="text-xs text-stone-500 dark:text-stone-400">{baseline[metric.key]}/5</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          onClick={() => setBaseline(prev => ({ ...prev, [metric.key]: v }))}
                          className={`flex-1 min-h-[44px] rounded-xl border-2 text-sm font-bold transition-all ${
                            baseline[metric.key] === v
                              ? metric.key === 'pain'
                                ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                              : 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-500'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-stone-500">
                      <span>{metric.low}</span>
                      <span>{metric.high}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  // Save baseline to Supabase wellness_logs
                  if (user) {
                    supabase.from('wellness_logs').insert({
                      user_id: user.id,
                      energy: baseline.energy,
                      sleep: baseline.sleep,
                      pain: baseline.pain,
                      mood: 3,
                      appetite: 3,
                      notes: 'onboarding_baseline',
                      logged_at: new Date().toISOString(),
                    }).then(({ error: insertErr }) => {
                      if (insertErr) { toast.error('تعذّر حفظ البيانات الأساسية'); logError('Baseline save failed:', insertErr); }
                    }).catch((e: unknown) => { toast.error('تعذّر حفظ البيانات الأساسية'); logError('Baseline save failed:', e); });
                  }
                  setStep('plan');
                  setTimeout(() => setAnimatePlan(true), 100);
                }}
                className="mt-5 w-full rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center"
              >
                التالي
              </button>
              <button onClick={handleDismiss} className="mt-2 w-full min-h-[44px] text-center text-xs text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:text-stone-300">
                تخطّي
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" style={{ animation: 'onb-sparkle 2s ease-in-out infinite' }}>
                <Sparkles className="h-7 w-7 text-emerald-700" />
              </div>
              <h2 id="onboarding-title-step2" className="mb-1 text-center text-xl font-bold text-stone-900 dark:text-stone-100">
                خطة مخصّصة لك
              </h2>
              {quizGoalLabel ? (
                <p className="mb-1 text-center text-xs font-medium text-emerald-700">بناءً على اختبارك: <span className="font-bold">{quizGoalLabel}</span></p>
              ) : (
                <p className="mb-1 text-center text-xs font-medium text-emerald-700">رحلتك في {TRIAL_DAYS} أيام — مصمّمة حسب هدفك</p>
              )}
              <p className="mb-2 text-center text-sm text-stone-600 dark:text-stone-300">خارطة طريق VIP لتحقيق أفضل النتائج</p>
              <p className="mb-6 text-center text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5 inline-block">
                لديك {TRIAL_DAYS} أيام مجانية — استغل كل دقيقة!
              </p>
              <div className="space-y-3">
                {getTrialPlan(selectedGoal).map((item, i) => (
                  <Link
                    key={i}
                    to={item.to}
                    onClick={handleComplete}
                    className="flex items-center gap-4 rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-4 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 min-h-[44px]"
                    style={{ animation: animatePlan ? `onb-fade-in 0.4s ease-out ${i * 0.15}s both` : undefined, opacity: animatePlan ? undefined : 0 }}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                      <item.icon className="h-5 w-5 text-emerald-700" />
                      <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-700">{item.day}</p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{item.task}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  handleComplete();
                  const category = GOAL_TO_CATEGORY[selectedGoal] ?? '';
                  navigate(`/library${category ? `?category=${encodeURIComponent(category)}` : ''}`);
                }}
                className="mt-5 w-full rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center"
                style={{ animation: 'onb-pulse 2s ease-in-out infinite' }}
              >
                ابدأ الاستكشاف ←
              </button>
            </>
          )}

          <style>{`
            @keyframes onb-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes onb-sparkle { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            @keyframes onb-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
            @media (prefers-reduced-motion: reduce) { [style*="onb-fade-in"], [style*="onb-sparkle"], [style*="onb-pulse"] { animation: none !important; } }
          `}</style>
        </div>
      </FocusTrap>
    </div>
  );
}
