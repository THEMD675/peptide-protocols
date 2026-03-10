import { useState, useEffect, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { Sparkles, BookOpen, Calculator, Bot, TrendingDown, Brain, Dumbbell, Heart, Zap, Clock, Shield, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TRIAL_DAYS, PEPTIDE_COUNT } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
  const [show, setShow] = useState(true);
  const [step, setStep] = useState<'goal' | 'plan'>('goal');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [quizGoalLabel, setQuizGoalLabel] = useState('');
  const [animatePlan, setAnimatePlan] = useState(false);
  const userName = user?.email?.split('@')[0]?.charAt(0).toUpperCase() + (user?.email?.split('@')[0]?.slice(1) ?? '') || '';
  useEffect(() => {
    if (forceOpen) { setShow(true); return; }
    try {
      setShow(localStorage.getItem(ONBOARDING_KEY) !== 'true');
    } catch { /* expected */ }
  }, [forceOpen]);

  // If user already took the quiz, skip the goal step
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pptides_quiz_results');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.goal) {
          setSelectedGoal(parsed.goal);
          setQuizGoalLabel(GOAL_LABELS[parsed.goal] ?? '');
          setStep('plan');
          setTimeout(() => setAnimatePlan(true), 100);
        }
      }
    } catch { /* expected */ }
  }, []);
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [show]);

  const handleClose = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch { /* expected */ }
    // C13: Persist goals to Supabase user_profiles table
    if (user && selectedGoal) {
      supabase.from('user_profiles').update({
        onboarding_goals: { goal: selectedGoal, ts: Date.now() },
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id).then(() => {}).catch(() => {});
    }
    setShow(false);
    externalClose?.();
  }, [externalClose, user, selectedGoal]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [show, handleClose]);

  if (!show) return null;

  const handleGoalSelect = (goalId: string) => {
    try {
      const existing = localStorage.getItem('pptides_quiz_results');
      const parsed = existing ? JSON.parse(existing) : {};
      const ts = Date.now();
      localStorage.setItem('pptides_quiz_results', JSON.stringify({
        ...parsed,
        goal: goalId,
        answers: { ...(parsed.answers ?? {}), goal: goalId },
        ts,
      }));
    } catch { /* expected */ }
    setSelectedGoal(goalId);
    setStep('plan');
    setTimeout(() => setAnimatePlan(true), 100);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={step === 'goal' ? 'onboarding-title-step1' : 'onboarding-title-step2'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleClose}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-950 p-6 sm:p-8 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
          {/* Progress indicator */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step === 'goal' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step === 'plan' ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
          </div>
          <p className="mb-4 text-center text-[11px] font-medium text-stone-400">
            {step === 'goal' ? 'الخطوة ١ من ٢' : 'الخطوة ٢ من ٢'}
          </p>

          {step === 'goal' ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" style={{ animation: 'onb-sparkle 2s ease-in-out infinite' }}>
                <Sparkles className="h-7 w-7 text-emerald-700" />
              </div>
              <h2 id="onboarding-title-step1" className="mb-1 text-center text-xl font-bold text-stone-900 dark:text-stone-100">
                {userName ? `أهلاً ${userName}، مرحبًا في pptides` : 'مرحبًا في pptides'}
              </h2>
              <p className="mb-1 text-center text-xs font-medium text-emerald-700">{PEPTIDE_COUNT}+ ببتيد تحت تصرفك</p>
              <p className="mb-6 text-center text-sm text-stone-600 dark:text-stone-400">ما هدفك الأساسي؟ سنبني لك خطة مخصّصة.</p>
              <div className="space-y-2">
                {GOALS.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => handleGoalSelect(g.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 min-h-[44px]"
                    style={{ animation: `onb-fade-in 0.3s ease-out ${i * 0.05}s both` }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <g.Icon className="h-4 w-4 text-emerald-700" />
                    </div>
                    {g.label}
                  </button>
                ))}
              </div>
              <button onClick={handleClose} className="mt-4 w-full min-h-[44px] text-center text-xs text-stone-500 dark:text-stone-400 hover:text-stone-600 dark:text-stone-400">
                تخطّي
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" style={{ animation: 'onb-sparkle 2s ease-in-out infinite' }}>
                <Sparkles className="h-7 w-7 text-emerald-700" />
              </div>
              <h2 id="onboarding-title-step2" className="mb-1 text-center text-xl font-bold text-stone-900 dark:text-stone-100">
                خطة مخصّصة لك ✨
              </h2>
              {quizGoalLabel ? (
                <p className="mb-1 text-center text-xs font-medium text-emerald-700">بناءً على اختبارك: <span className="font-bold">{quizGoalLabel}</span></p>
              ) : (
                <p className="mb-1 text-center text-xs font-medium text-emerald-700">رحلتك في {TRIAL_DAYS} أيام — مصمّمة حسب هدفك</p>
              )}
              <p className="mb-2 text-center text-sm text-stone-600 dark:text-stone-400">خارطة طريق VIP لتحقيق أفضل النتائج</p>
              <p className="mb-6 text-center text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5 inline-block">
                🎁 لديك {TRIAL_DAYS} أيام مجانية — استغل كل دقيقة!
              </p>
              <div className="space-y-3">
                {getTrialPlan(selectedGoal).map((item, i) => (
                  <Link
                    key={i}
                    to={item.to}
                    onClick={handleClose}
                    className="flex items-center gap-4 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-4 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 min-h-[44px]"
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
              <Link
                to={getTrialPlan(selectedGoal)[0]?.to ?? '/library'}
                onClick={handleClose}
                className="mt-5 w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center"
                style={{ animation: 'onb-pulse 2s ease-in-out infinite' }}
              >
                ابدأ الاستكشاف ←
              </Link>
            </>
          )}

          <style>{`
            @keyframes onb-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes onb-sparkle { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            @keyframes onb-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
          `}</style>
        </div>
      </FocusTrap>
    </div>
  );
}
