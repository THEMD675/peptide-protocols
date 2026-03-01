import { useState, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import { Sparkles, BookOpen, Calculator, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

const ONBOARDING_KEY = 'pptides_onboarded';

const GOALS = [
  { id: 'fat-loss', label: 'فقدان دهون وإنقاص وزن' },
  { id: 'recovery', label: 'تعافي من إصابة أو أداء رياضي' },
  { id: 'muscle', label: 'بناء عضل وقوة' },
  { id: 'brain', label: 'تركيز وذاكرة وأداء ذهني' },
  { id: 'hormones', label: 'تحسين هرمونات' },
  { id: 'longevity', label: 'إطالة عمر ومكافحة شيخوخة' },
  { id: 'gut-skin', label: 'بشرة أو أمعاء أو نوم' },
] as const;

const TRIAL_PLAN = [
  { day: 'اليوم الأول', task: 'تصفّح المكتبة واكتشف الببتيد المناسب', icon: BookOpen, to: '/library' },
  { day: 'اليوم الثاني', task: 'اسأل المدرب الذكي عن بروتوكول مخصّص', icon: Bot, to: '/coach' },
  { day: 'اليوم الثالث', task: 'جرّب حاسبة الجرعات واحسب جرعتك', icon: Calculator, to: '/calculator' },
];

export default function OnboardingModal() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) !== 'true'; } catch { return true; }
  });
  const [step, setStep] = useState<'goal' | 'plan'>('goal');
  const [selectedGoal, setSelectedGoal] = useState('');

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [show]);

  if (!show) return null;

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
    try {
      const existing = localStorage.getItem('pptides_quiz_answers');
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem('pptides_quiz_answers', JSON.stringify({ ...parsed, goal: goalId, ts: Date.now() }));
    } catch { /* expected */ }
    setStep('plan');
  };

  const handleClose = () => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch { /* expected */ }
    setShow(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleClose}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
          {step === 'goal' ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <Sparkles className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 id="onboarding-title" className="mb-2 text-center text-xl font-bold text-stone-900">مرحبًا في pptides</h2>
              <p className="mb-6 text-center text-sm text-stone-600">ما هدفك الأساسي؟ سنساعدك في إيجاد الببتيد المناسب.</p>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGoalSelect(g.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-800 transition-all hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <button onClick={handleClose} className="mt-4 w-full text-center text-xs text-stone-400 hover:text-stone-600">
                تخطّي
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <Sparkles className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 id="onboarding-title" className="mb-2 text-center text-xl font-bold text-stone-900">خطتك لـ 3 أيام</h2>
              <p className="mb-6 text-center text-sm text-stone-600">استفد من تجربتك المجانية بأقصى قدر</p>
              <div className="space-y-3">
                {TRIAL_PLAN.map((item, i) => (
                  <Link
                    key={i}
                    to={item.to}
                    onClick={handleClose}
                    className="flex items-center gap-4 rounded-xl border border-stone-200 px-4 py-4 transition-all hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <item.icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-600">{item.day}</p>
                      <p className="text-sm font-medium text-stone-800">{item.task}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <button
                onClick={handleClose}
                className="mt-5 w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
              >
                ابدأ الاستكشاف
              </button>
            </>
          )}
        </div>
      </FocusTrap>
    </div>
  );
}
