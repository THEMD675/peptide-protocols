import { useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, FlaskConical, TrendingDown, Heart, Brain, Zap, Clock, Shield, Syringe, Pill, SprayCan, Dumbbell, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';

interface QuizOption {
  id: string;
  label: string;
  icon?: ElementType;
}

interface QuizStep {
  question: string;
  options: QuizOption[];
}

const STEPS: QuizStep[] = [
  {
    question: 'ما هدفك الأساسي؟',
    options: [
      { id: 'fat-loss', label: 'فقدان دهون وإنقاص وزن', icon: TrendingDown },
      { id: 'recovery', label: 'تعافي من إصابة أو أداء رياضي', icon: Heart },
      { id: 'muscle', label: 'بناء عضل وقوة', icon: Dumbbell },
      { id: 'brain', label: 'تركيز وذاكرة وأداء ذهني', icon: Brain },
      { id: 'hormones', label: 'تحسين هرمونات', icon: Zap },
      { id: 'longevity', label: 'إطالة عمر ومكافحة شيخوخة', icon: Clock },
      { id: 'gut-skin', label: 'بشرة أو أمعاء أو نوم', icon: Shield },
    ],
  },
  {
    question: 'ما مستوى خبرتك مع الببتيدات؟',
    options: [
      { id: 'beginner', label: 'مبتدئ — أول مرة' },
      { id: 'some', label: 'جربت ببتيد أو اثنين من قبل' },
      { id: 'advanced', label: 'خبرة متقدمة — أستخدم بانتظام' },
    ],
  },
  {
    question: 'هل تتقبّل الحقن؟',
    options: [
      { id: 'yes', label: 'نعم، عادي عندي', icon: Syringe },
      { id: 'prefer-no', label: 'أفضّل بدون حقن إن أمكن', icon: SprayCan },
      { id: 'no', label: 'لا — فموي أو بخاخ أنف فقط', icon: Pill },
    ],
  },
];

interface Recommendation {
  peptideId: string;
  nameAr: string;
  nameEn: string;
  reason: string;
  altId?: string;
  altName?: string;
}

function getRecommendation(answers: string[]): Recommendation {
  const [goal, experience, injection] = answers;

  if (goal === 'fat-loss') {
    if (injection === 'no') return { peptideId: '5-amino-1mq', nameAr: '5-أمينو-1MQ', nameEn: '5-Amino-1MQ', reason: 'فموي بدون حقن — يثبّط إنزيم NNMT لزيادة حرق الدهون.', altId: 'aod-9604', altName: 'AOD-9604' };
    if (experience === 'beginner') return { peptideId: 'aod-9604', nameAr: 'AOD-9604', nameEn: 'AOD-9604', reason: 'جزء من هرمون النمو — يحرق الدهون بدون الأعراض الجانبية. آمن جدًا للمبتدئين.', altId: 'tesamorelin', altName: 'Tesamorelin' };
    return { peptideId: 'tesamorelin', nameAr: 'تيساموريلين', nameEn: 'Tesamorelin', reason: 'أقوى ببتيد بحثي لحرق دهون البطن — يحفّز هرمون النمو مباشرة.', altId: 'aod-9604', altName: 'AOD-9604' };
  }

  if (goal === 'recovery') {
    if (experience === 'beginner') return { peptideId: 'bpc-157', nameAr: 'BPC-157', nameEn: 'BPC-157', reason: 'أشهر ببتيد تعافي — يُسرّع شفاء الأوتار والأربطة. ملف أمان ممتاز.', altId: 'tb-500', altName: 'TB-500' };
    return { peptideId: 'tb-500', nameAr: 'TB-500', nameEn: 'TB-500', reason: 'تعافي جهازي — يُرمّم العضلات والأنسجة. يُجمع مع BPC-157.', altId: 'bpc-157', altName: 'BPC-157' };
  }

  if (goal === 'muscle') {
    if (injection === 'no') return { peptideId: 'collagen-peptides', nameAr: 'ببتيدات الكولاجين', nameEn: 'Collagen Peptides', reason: 'فموي — يدعم المفاصل والأنسجة الضامة. لا يبني عضل مباشرة لكن يحمي المفاصل تحت الأحمال.', altId: 'bpc-157', altName: 'BPC-157' };
    if (experience === 'beginner') return { peptideId: 'cjc-1295', nameAr: 'CJC-1295', nameEn: 'CJC-1295', reason: 'يحفّز إفراز هرمون النمو بشكل مستدام — يُجمع مع Ipamorelin لأفضل النتائج.', altId: 'ipamorelin', altName: 'Ipamorelin' };
    return { peptideId: 'follistatin-344', nameAr: 'فوليستاتين-344', nameEn: 'Follistatin 344', reason: 'يثبّط الميوستاتين — أقوى ببتيد لبناء العضل. للمتقدمين فقط.', altId: 'cjc-1295', altName: 'CJC-1295' };
  }

  if (goal === 'brain') {
    if (injection === 'no') return { peptideId: 'semax', nameAr: 'سيماكس', nameEn: 'Semax', reason: 'بخاخ أنف — يرفع BDNF 300-800%. تركيز وذاكرة بدون حقن.', altId: 'selank', altName: 'Selank' };
    return { peptideId: 'semax', nameAr: 'سيماكس', nameEn: 'Semax', reason: 'أقوى ببتيد دماغ متاح — يرفع BDNF بشكل كبير. معتمد في روسيا.', altId: 'selank', altName: 'Selank' };
  }

  if (goal === 'hormones') {
    if (experience === 'beginner') return { peptideId: 'ipamorelin', nameAr: 'إيباموريلين', nameEn: 'Ipamorelin', reason: 'أنظف محفّز لهرمون النمو — بدون رفع الكورتيزول. الخيار الأول للمبتدئين.', altId: 'cjc-1295', altName: 'CJC-1295' };
    return { peptideId: 'kisspeptin-10', nameAr: 'كيسبيبتين-10', nameEn: 'Kisspeptin-10', reason: 'يرفع التستوستيرون طبيعيًا من أعلى المحور الهرموني.', altId: 'ipamorelin', altName: 'Ipamorelin' };
  }

  if (goal === 'longevity') {
    if (injection === 'no') return { peptideId: 'collagen-peptides', nameAr: 'ببتيدات الكولاجين', nameEn: 'Collagen Peptides', reason: 'فموي — يبطئ شيخوخة البشرة والمفاصل. أكثر الببتيدات دراسة وأمانًا.', altId: 'epithalon', altName: 'Epithalon' };
    return { peptideId: 'epithalon', nameAr: 'إيبيثالون', nameEn: 'Epithalon', reason: 'يُطيل التيلوميرات — 40+ سنة من البيانات. دورة قصيرة كل 6 أشهر.', altId: 'thymosin-alpha-1', altName: 'Thymosin Alpha-1' };
  }

  if (goal === 'gut-skin') {
    if (injection === 'no') return { peptideId: 'collagen-peptides', nameAr: 'ببتيدات الكولاجين', nameEn: 'Collagen Peptides', reason: 'فموي — مسحوق يومي يحسّن البشرة والمفاصل. أكثر الببتيدات دراسة وأمانًا.', altId: 'ghk-cu', altName: 'GHK-Cu' };
    return { peptideId: 'bpc-157', nameAr: 'BPC-157', nameEn: 'BPC-157', reason: 'مشتق من العصارة المعدية — يُصلح الأمعاء والأوتار معًا.', altId: 'kpv', altName: 'KPV' };
  }

  return { peptideId: 'bpc-157', nameAr: 'BPC-157', nameEn: 'BPC-157', reason: 'الببتيد الأكثر تنوعًا وأمانًا — نقطة بداية ممتازة.' };
}

export default function PeptideQuiz() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [hasPreviousResult] = useState(() => {
    try {
      const saved = localStorage.getItem('pptides_quiz_answers');
      if (saved) {
        const data = JSON.parse(saved);
        return !!(data.goal && data.experience && data.injection);
      }
    } catch { /* expected */ }
    return false;
  });

  const loadPreviousResult = () => {
    try {
      const saved = localStorage.getItem('pptides_quiz_answers');
      if (saved) {
        const data = JSON.parse(saved);
        setAnswers([data.goal, data.experience, data.injection]);
        setShowResult(true);
      }
    } catch { /* expected */ }
  };

  const handleSelect = (optionId: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[step] = optionId;

      if (step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else {
        setShowResult(true);
        try {
          localStorage.setItem('pptides_quiz_answers', JSON.stringify({
            goal: newAnswers[0],
            experience: newAnswers[1],
            injection: newAnswers[2],
            ts: Date.now(),
          }));
          if (user) {
            supabase.from('user_profiles').upsert({
              user_id: user.id,
              goals: [newAnswers[0]],
            }, { onConflict: 'user_id' }).then(() => {}).catch(() => {});
          }
        } catch { /* expected */ }
      }

      return newAnswers;
    });
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleReset = () => {
    setStep(0);
    setAnswers([]);
    setShowResult(false);
  };

  if (showResult) {
    const rec = getRecommendation(answers);
    const peptideData = allPeptides.find(p => p.id === rec.peptideId);

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-lg shadow-emerald-600/5 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800">توصيتنا لك</p>
            <p className="text-xs text-emerald-600">بناءً على إجاباتك</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-emerald-200 bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-black text-stone-900">{rec.nameAr}</h3>
            <span className="text-sm font-medium text-stone-500" dir="ltr">{rec.nameEn}</span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">{rec.reason}</p>
          {peptideData?.dosageAr && (
            <p className="mt-2 text-sm text-stone-600"><strong>الجرعة:</strong> {peptideData.dosageAr.split('.')[0]}</p>
          )}
          {peptideData?.costEstimate && (
            <p className="mt-2 text-sm text-emerald-700 font-semibold">التكلفة التقريبية: {peptideData.costEstimate}</p>
          )}
          {peptideData?.timingAr && <p className="text-xs text-stone-500 mt-1">التوقيت: {peptideData.timingAr.split('.')[0]}</p>}
          {peptideData?.cycleAr && <p className="text-xs text-stone-500">الدورة: {peptideData.cycleAr.split('.')[0]}</p>}
          {peptideData?.administrationAr && <p className="text-xs text-stone-500">طريقة الحقن: {peptideData.administrationAr.split('.')[0]}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={user ? '/coach' : '/signup?redirect=/coach'}
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-600 px-5 py-3 text-white transition-all hover:bg-emerald-700"
          >
            <span className="text-sm font-bold flex items-center gap-2">{user ? 'صمّم بروتوكول مخصّص' : 'سجّل مجانًا وصمّم بروتوكولك'} <ArrowLeft className="h-4 w-4 shrink-0" /></span>
            <span className="text-xs opacity-80">{user ? 'بناءً على إجاباتك — المدرب الذكي جاهز' : 'أنشئ حساب مجاني واحصل على بروتوكول مخصّص'}</span>
          </Link>
          <Link
            to={`/peptide/${rec.peptideId}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 transition-all hover:border-emerald-200 hover:shadow-sm"
          >
            شاهد بروتوكول {rec.nameAr}
          </Link>
          <Link
            to={`/calculator?peptide=${encodeURIComponent(rec.nameEn)}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 transition-all hover:border-emerald-200 hover:shadow-sm"
          >
            <Calculator className="h-4 w-4" />
            احسب جرعة {rec.nameAr}
          </Link>
        </div>

        {rec.altId && rec.altName && (
          <Link to={`/peptide/${rec.altId}`} className="mt-3 block text-center text-sm text-stone-500 hover:text-emerald-600 transition-colors">
            بديل آخر: <span className="font-bold">{rec.altName}</span>
          </Link>
        )}
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => { setShowResult(false); setStep(STEPS.length - 1); }} className="min-h-[44px] px-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">
            غيّر إجابتك
          </button>
          <span className="text-stone-300">|</span>
          <button onClick={handleReset} className="min-h-[44px] px-2 text-sm text-emerald-600 hover:underline transition-colors">
            أعد الاختبار
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-emerald-600/5 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900">أي ببتيد يناسبك؟</p>
            <p className="text-xs text-stone-500">{step + 1} من {STEPS.length}</p>
          </div>
        </div>
        {step > 0 && (
          <button onClick={handleBack} className="flex items-center gap-1 min-h-[44px] text-sm text-stone-500 transition-colors hover:text-stone-800">
            <ArrowRight className="h-3 w-3 shrink-0" /> رجوع
          </button>
        )}
      </div>

      <div className="mb-2 h-2 w-full rounded-full bg-stone-100" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="تقدّم الاختبار">
        <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <h3 className="mb-5 text-lg font-bold text-stone-900">{currentStep.question}</h3>

      <div className={cn('grid gap-2', step === 0 ? 'grid-cols-1 sm:grid-cols-2' : '')}>
        {currentStep.options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              aria-pressed={answers[step] === opt.id}
              className={cn(
                'w-full rounded-xl border text-sm font-medium transition-all',
                Icon ? 'flex flex-col items-center gap-1.5 px-3 py-3 text-center' : 'px-5 py-3.5 text-right',
                answers[step] === opt.id
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
                  : 'border-stone-200 bg-white text-stone-800 hover:border-emerald-300 transition-colors hover:bg-stone-50'
              )}
            >
              {Icon && <Icon className={cn('h-5 w-5', answers[step] === opt.id ? 'text-emerald-600' : 'text-stone-500')} />}
              <span className="text-sm font-bold">{opt.label}</span>
            </button>
          );
        })}
      </div>
      {hasPreviousResult && (
        <button onClick={loadPreviousResult} className="mt-3 block w-full text-center text-sm font-bold text-emerald-600 hover:underline transition-colors">
          عرض نتائجك السابقة
        </button>
      )}
      <Link to="/library" className="mt-4 block text-center text-sm text-stone-500 hover:text-stone-600 transition-colors">
        تخطّي — تصفّح المكتبة مباشرة
      </Link>
    </div>
  );
}
