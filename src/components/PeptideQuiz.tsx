import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides as allPeptides } from '@/data/peptides';

interface QuizOption {
  id: string;
  label: string;
}

interface QuizStep {
  question: string;
  options: QuizOption[];
}

const STEPS: QuizStep[] = [
  {
    question: 'ما هدفك الأساسي؟',
    options: [
      { id: 'fat-loss', label: 'فقدان دهون وإنقاص وزن' },
      { id: 'recovery', label: 'تعافي من إصابة أو تحسين أداء رياضي' },
      { id: 'brain', label: 'تركيز وذاكرة وأداء ذهني' },
      { id: 'hormones', label: 'تحسين هرمونات (تستوستيرون / نمو)' },
      { id: 'longevity', label: 'إطالة عمر ومكافحة شيخوخة' },
      { id: 'gut-skin', label: 'بشرة أو أمعاء أو نوم' },
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
      { id: 'yes', label: 'نعم، عادي عندي' },
      { id: 'prefer-no', label: 'أفضّل بدون حقن إن أمكن' },
      { id: 'no', label: 'لا — فموي أو بخاخ أنف فقط' },
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
    if (injection === 'no') return { peptideId: '5-amino-1mq', nameAr: '5-أمينو-1MQ', nameEn: '5-Amino-1MQ', reason: 'فموي بدون حقن — يثبّط إنزيم NNMT لزيادة حرق الدهون. $80-120/شهر.', altId: 'aod-9604', altName: 'AOD-9604' };
    if (experience === 'beginner') return { peptideId: 'aod-9604', nameAr: 'AOD-9604', nameEn: 'AOD-9604', reason: 'جزء من هرمون النمو — يحرق الدهون بدون الأعراض الجانبية. آمن جدًا للمبتدئين. $80-120/شهر.', altId: 'tesamorelin', altName: 'Tesamorelin' };
    return { peptideId: 'tesamorelin', nameAr: 'تيساموريلين', nameEn: 'Tesamorelin', reason: 'أقوى ببتيد بحثي لحرق دهون البطن — يحفّز هرمون النمو مباشرة. $150-200/شهر.', altId: 'aod-9604', altName: 'AOD-9604' };
  }

  if (goal === 'recovery') {
    if (experience === 'beginner') return { peptideId: 'bpc-157', nameAr: 'BPC-157', nameEn: 'BPC-157', reason: 'أشهر ببتيد تعافي — يُسرّع شفاء الأوتار والأربطة. ملف أمان ممتاز.', altId: 'tb-500', altName: 'TB-500' };
    return { peptideId: 'tb-500', nameAr: 'TB-500', nameEn: 'TB-500', reason: 'تعافي جهازي — يُرمّم العضلات والأنسجة. يُجمع مع BPC-157.', altId: 'bpc-157', altName: 'BPC-157' };
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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (optionId: string) => {
    const newAnswers = [...answers];
    newAnswers[step] = optionId;
    setAnswers(newAnswers);

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
      try {
        localStorage.setItem('pptides_quiz_answers', JSON.stringify({
          goal: newAnswers[0],
          experience: newAnswers[1],
          injection: newAnswers[2],
          ts: Date.now(),
        }));
      } catch {}
    }
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
    const isFree = peptideData?.isFree ?? false;

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 md:p-8">
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
          {peptideData?.costEstimate && (
            <p className="mt-2 text-xs text-emerald-700 font-semibold">التكلفة التقريبية: {peptideData.costEstimate}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/coach"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            صمّم بروتوكول مخصّص بالذكاء الاصطناعي
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            to={`/peptide/${rec.peptideId}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 transition-all hover:border-emerald-200"
          >
            شاهد بروتوكول {rec.nameAr}
          </Link>
        </div>

        <button onClick={handleReset} className="mt-4 w-full text-center text-xs text-emerald-600 hover:underline">
          أعد الاختبار
        </button>
      </div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
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
          <button onClick={handleBack} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800">
            <ArrowRight className="h-3 w-3" /> رجوع
          </button>
        )}
      </div>

      <div className="mb-2 h-1 w-full rounded-full bg-stone-100">
        <div className="h-1 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <h3 className="mb-5 text-lg font-bold text-stone-900">{currentStep.question}</h3>

      <div className="grid gap-2">
        {currentStep.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            className={cn(
              'w-full rounded-xl border px-5 py-3.5 text-sm font-medium text-right transition-all',
              answers[step] === opt.id
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-white text-stone-800 hover:border-emerald-300 hover:bg-stone-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
