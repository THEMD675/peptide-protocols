import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides } from '@/data/peptides';

interface InteractionResult {
  safe: boolean;
  warning: boolean;
  message: string;
  details: string;
}

const DANGEROUS_COMBOS: Record<string, InteractionResult> = {
  'semaglutide+tirzepatide': { safe: false, warning: false, message: 'لا تجمع ناهضات GLP-1', details: 'كلاهما ينشّط مستقبلات GLP-1. الجمع بينهما يضاعف الآثار الجانبية (غثيان شديد، هبوط سكر) بدون فائدة إضافية مثبتة.' },
  'igf-1-lr3+cjc-1295': { safe: false, warning: true, message: 'خطر تضخّم أعضاء', details: 'IGF-1 LR3 مع أي محفّز لهرمون النمو يرفع IGF-1 بشكل مفرط. خطر تضخّم القلب والأعضاء على المدى الطويل.' },
  'igf-1-lr3+ipamorelin': { safe: false, warning: true, message: 'خطر تضخّم أعضاء', details: 'IGF-1 LR3 مع أي محفّز لهرمون النمو يرفع IGF-1 بشكل مفرط. خطر تضخّم القلب والأعضاء على المدى الطويل.' },
  'melanotan-ii+*': { safe: false, warning: false, message: 'Melanotan II غير آمن', details: 'لا ننصح باستخدام Melanotan II مطلقًا. خطر حقيقي لسرطان الجلد (ميلانوما). لا تجمعه مع أي شيء.' },
  'dihexa+*': { safe: false, warning: true, message: 'Dihexa تجريبي بالكامل', details: 'صفر تجارب بشرية. لا ننصح باستخدامه ولا بتجميعه مع أي شيء آخر.' },
};

const SYNERGISTIC_COMBOS: Record<string, InteractionResult> = {
  'bpc-157+tb-500': { safe: true, warning: false, message: 'المزيج الذهبي للتعافي', details: 'BPC-157 يُصلح الأوتار والأربطة موضعيًا، TB-500 يُرمّم الأنسجة جهازيًا. أشهر تجميعة في مجتمع البايوهاكينغ. الجرعة: BPC-157 250mcg 2x/يوم + TB-500 750mcg 2x/أسبوع.' },
  'cjc-1295+ipamorelin': { safe: true, warning: false, message: 'أفضل تجميعة هرمون نمو', details: 'CJC-1295 يحفّز إفراز GH بشكل مستدام، Ipamorelin يضيف نبضة نظيفة بدون رفع الكورتيزول. الجرعة: CJC 100mcg + Ipa 200mcg قبل النوم فارغ المعدة.' },
  'semax+selank': { safe: true, warning: false, message: 'تجميعة دماغ مثالية', details: 'Semax يرفع BDNF 300-800% للتركيز والذاكرة، Selank يقلل القلق عبر GABA. توازن مثالي بين الحدّة والهدوء. بخاخ أنف صباحًا.' },
  'bpc-157+cjc-1295': { safe: true, warning: false, message: 'تعافي + هرمون نمو', details: 'BPC-157 يُسرّع شفاء الأنسجة، CJC-1295 يحفّز GH اللي يعزّز التعافي. آليات مكمّلة.' },
  'bpc-157+ipamorelin': { safe: true, warning: false, message: 'تعافي + هرمون نمو نظيف', details: 'BPC-157 للتعافي الموضعي + Ipamorelin لرفع GH بدون أعراض جانبية. تجميعة شائعة وآمنة.' },
  'bpc-157+ghk-cu': { safe: true, warning: false, message: 'تعافي شامل — أنسجة + بشرة', details: 'BPC-157 يُصلح الأوتار والأمعاء، GHK-Cu يُجدد الكولاجين والبشرة. آليات مختلفة تمامًا.' },
  'tb-500+cjc-1295': { safe: true, warning: false, message: 'تعافي عضلي + هرمون نمو', details: 'TB-500 للتعافي الجهازي + CJC-1295 لهرمون النمو. ممتاز للرياضيين.' },
  'tb-500+ipamorelin': { safe: true, warning: false, message: 'تعافي + GH نظيف', details: 'TB-500 يُرمّم العضلات + Ipamorelin يرفع GH. تجميعة آمنة للتعافي المتقدم.' },
  'semaglutide+tesamorelin': { safe: true, warning: false, message: 'فقدان دهون مزدوج — قوي جدًا', details: 'Semaglutide يقلل الشهية عبر GLP-1، Tesamorelin يحرق دهون البطن عبر GHRH. آليات مختلفة = نتائج مضاعفة.' },
  'semaglutide+aod-9604': { safe: true, warning: false, message: 'GLP-1 + حرق دهون مركّز', details: 'Semaglutide يقلل الشهية، AOD-9604 يستهدف الدهون مباشرة. تجميعة فقدان وزن فعّالة.' },
  'tesamorelin+aod-9604': { safe: true, warning: true, message: 'حرق دهون مكثّف — تداخل محتمل', details: 'كلاهما يستهدف الدهون عبر آليات GH. قد يكون هناك تداخل. الأفضل استخدام واحد فقط.' },
  'tesamorelin+ipamorelin': { safe: true, warning: true, message: 'كلاهما يحفّز GH — احترس', details: 'Tesamorelin (GHRH) + Ipamorelin (GHRP) = رفع GH قوي. قد يكون مفرط للمبتدئين. راقب IGF-1.' },
  'epithalon+ghk-cu': { safe: true, warning: false, message: 'بروتوكول إطالة عمر أساسي', details: 'Epithalon يُطيل التيلوميرات، GHK-Cu يُجدد البشرة والأنسجة. تجميعة خافينسون.' },
  'epithalon+thymosin-alpha-1': { safe: true, warning: false, message: 'طول عمر + مناعة', details: 'Epithalon للتيلوميرات + Thymosin Alpha-1 يعيد بناء الغدة الزعترية. بروتوكول مكافحة الشيخوخة الكلاسيكي.' },
  'kisspeptin-10+pt-141': { safe: true, warning: true, message: 'هرمونات + أداء جنسي — بحذر', details: 'Kisspeptin يرفع التستوستيرون طبيعيًا، PT-141 يحسّن الأداء الجنسي. آليات مختلفة لكن كلاهما يؤثر هرمونيًا.' },
  'bpc-157+larazotide': { safe: true, warning: false, message: 'إصلاح أمعاء شامل', details: 'BPC-157 يُصلح بطانة الأمعاء، Larazotide يغلق الفجوات بين الخلايا (leaky gut). تجميعة مثالية لمشاكل الأمعاء.' },
  'bpc-157+kpv': { safe: true, warning: false, message: 'إصلاح أمعاء + مضاد التهاب', details: 'BPC-157 للشفاء + KPV للالتهاب المعوي. يكمّلان بعض.' },
  'semax+dsip': { safe: true, warning: true, message: 'تركيز نهاري + نوم ليلي — توقيت مهم', details: 'Semax صباحًا للتركيز + DSIP مساءً للنوم. لا تأخذهم بنفس الوقت — Semax منبّه وDSIP منوّم.' },
};

function checkInteraction(id1: string, id2: string): InteractionResult {
  const key1 = `${id1}+${id2}`;
  const key2 = `${id2}+${id1}`;

  if (DANGEROUS_COMBOS[key1]) return DANGEROUS_COMBOS[key1];
  if (DANGEROUS_COMBOS[key2]) return DANGEROUS_COMBOS[key2];
  if (DANGEROUS_COMBOS[`${id1}+*`]) return DANGEROUS_COMBOS[`${id1}+*`];
  if (DANGEROUS_COMBOS[`${id2}+*`]) return DANGEROUS_COMBOS[`${id2}+*`];

  if (SYNERGISTIC_COMBOS[key1]) return SYNERGISTIC_COMBOS[key1];
  if (SYNERGISTIC_COMBOS[key2]) return SYNERGISTIC_COMBOS[key2];

  const p1 = peptides.find(p => p.id === id1);
  const p2 = peptides.find(p => p.id === id2);
  if (!p1 || !p2) return { safe: true, warning: true, message: 'غير متوفر', details: '' };

  const ghPeptides = ['cjc-1295', 'ipamorelin', 'tesamorelin', 'sermorelin', 'mk-677', 'hexarelin'];
  const bothGH = ghPeptides.includes(id1) && ghPeptides.includes(id2);
  if (bothGH) {
    return { safe: true, warning: true, message: 'كلاهما يحفّز هرمون النمو — راقب IGF-1', details: `${p1.nameAr} و ${p2.nameAr} كلاهما يحفّز إفراز هرمون النمو. الجمع قد يرفع IGF-1 بشكل مفرط. اعمل تحليل IGF-1 بعد أسبوعين. لا تجمع أكثر من 2 محفّزات GH.` };
  }

  const fatLossPeptides = ['semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq', 'mots-c'];
  const bothFatLoss = fatLossPeptides.includes(id1) && fatLossPeptides.includes(id2);
  if (bothFatLoss) {
    return { safe: true, warning: true, message: 'كلاهما لفقدان الدهون — تحقق من الحاجة', details: `${p1.nameAr} و ${p2.nameAr} كلاهما يستهدف فقدان الدهون. تأكد أن آلياتهم مختلفة قبل الجمع. إذا كانا بنفس الآلية (مثلًا ناهضان GLP-1)، لا تجمع.` };
  }

  if (p1.category === p2.category) {
    const catLabels: Record<string, string> = {
      metabolic: 'الأيض', recovery: 'التعافي', brain: 'الدماغ',
      hormonal: 'الهرمونات', longevity: 'إطالة العمر', 'skin-gut': 'البشرة والأمعاء',
    };
    const catName = catLabels[p1.category] ?? p1.category;
    return { safe: true, warning: true, message: `نفس فئة ${catName} — تحقق من التداخل`, details: `${p1.nameAr} و ${p2.nameAr} من نفس الفئة (${catName}). إذا كانت آلية عملهم متشابهة، قد يكون الجمع غير ضروري أو يزيد الأعراض الجانبية. تحقق من أن كل واحد يضيف قيمة مختلفة.` };
  }

  return { safe: true, warning: false, message: `${p1.nameAr} + ${p2.nameAr} — آمن على الأرجح`, details: `الببتيدان من فئات مختلفة (${p1.nameAr}: ${p1.category === 'metabolic' ? 'أيض' : p1.category === 'recovery' ? 'تعافي' : p1.category === 'brain' ? 'دماغ' : p1.category === 'hormonal' ? 'هرمونات' : p1.category === 'longevity' ? 'طول عمر' : 'بشرة/أمعاء'} + ${p2.nameAr}: ${p2.category === 'metabolic' ? 'أيض' : p2.category === 'recovery' ? 'تعافي' : p2.category === 'brain' ? 'دماغ' : p2.category === 'hormonal' ? 'هرمونات' : p2.category === 'longevity' ? 'طول عمر' : 'بشرة/أمعاء'}). آليات مختلفة عادةً لا تتعارض. لكن استشر مختص قبل أي تجميعة جديدة.` };
}

export default function InteractionChecker() {
  const [selected, setSelected] = useState<string[]>(['', '']);

  const addSlot = () => { if (selected.length < 5) setSelected(prev => [...prev, '']); };
  const removeSlot = (idx: number) => { if (selected.length > 2) setSelected(prev => prev.filter((_, i) => i !== idx)); };
  const updateSlot = (idx: number, val: string) => setSelected(prev => prev.map((v, i) => i === idx ? val : v));

  const filledPeptides = selected.filter(s => s.trim() !== '');
  const pairs = useMemo(() => {
    const results: { id1: string; id2: string; result: InteractionResult }[] = [];
    for (let i = 0; i < filledPeptides.length; i++) {
      for (let j = i + 1; j < filledPeptides.length; j++) {
        if (filledPeptides[i] !== filledPeptides[j]) {
          results.push({ id1: filledPeptides[i], id2: filledPeptides[j], result: checkInteraction(filledPeptides[i], filledPeptides[j]) });
        }
      }
    }
    return results;
  }, [filledPeptides]);

  const hasAnyDanger = pairs.some(p => !p.result.safe);
  const hasAnyWarning = pairs.some(p => p.result.warning);

  const sortedPeptides = useMemo(() => [...peptides].sort((a, b) => a.nameEn.localeCompare(b.nameEn)), []);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>فحص التعارضات | pptides</title>
        <meta name="description" content="تحقق من أمان تجميع أي ببتيدين معًا. فحص التعارضات والتفاعلات بين 41+ ببتيد." />
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <Shield className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
            فحص <span className="text-emerald-600">التعارضات</span>
          </h1>
          <p className="mt-2 text-base text-stone-600">
            اختر ببتيدين لمعرفة إذا يمكن تجميعهما بأمان
          </p>
        </div>

        <div className="mb-6 space-y-3">
          {selected.map((sel, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{idx + 1}</span>
              <select
                value={sel}
                onChange={(e) => updateSlot(idx, e.target.value)}
                aria-label={`اختر الببتيد ${idx + 1}`}
                className={cn('flex-1 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm focus:border-emerald-300 focus:outline-none', sel ? 'text-stone-900' : 'text-stone-400 italic')}
              >
                <option value="">اختر ببتيد...</option>
                {sortedPeptides.map(p => (
                  <option key={p.id} value={p.id}>{p.nameAr} ({p.nameEn})</option>
                ))}
              </select>
              {selected.length > 2 && (
                <button onClick={() => removeSlot(idx)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500"><XCircle className="h-4 w-4" /></button>
              )}
            </div>
          ))}
          {selected.length < 5 && (
            <button onClick={addSlot} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-500 hover:border-emerald-300 hover:text-emerald-600">
              + أضف ببتيد آخر
            </button>
          )}
        </div>

        {/* Stack Summary */}
        {filledPeptides.length >= 2 && (
          <div className={cn(
            'mb-6 rounded-2xl border-2 p-5',
            hasAnyDanger ? 'border-red-300 bg-red-50' :
            hasAnyWarning ? 'border-amber-300 bg-amber-50' :
            'border-emerald-300 bg-emerald-50'
          )}>
            {filledPeptides.length >= 3 && (
              <p className={cn(
                'mb-3 text-center text-2xl font-black md:text-3xl',
                hasAnyDanger ? 'text-red-700' : hasAnyWarning ? 'text-amber-700' : 'text-emerald-700'
              )}>
                {hasAnyDanger ? 'Stack غير آمن' : hasAnyWarning ? 'Stack يحتاج مراجعة' : 'Stack آمن'}
              </p>
            )}
            <div className="flex items-center gap-3">
              {hasAnyDanger ? (
                <XCircle className="h-7 w-7 text-red-600 shrink-0" />
              ) : hasAnyWarning ? (
                <AlertTriangle className="h-7 w-7 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="h-7 w-7 text-emerald-600 shrink-0" />
              )}
              <p className={cn('text-base font-bold', hasAnyDanger ? 'text-red-900' : hasAnyWarning ? 'text-amber-900' : 'text-emerald-900')}>
                {hasAnyDanger ? 'تعارض خطير — لا تجمع هذه التجميعة' :
                 hasAnyWarning ? 'يوجد تحذيرات — راجع التفاصيل' :
                 `التجميعة آمنة — ${filledPeptides.length} ببتيدات بدون تعارضات`}
              </p>
            </div>
          </div>
        )}

        {/* Pair-by-pair details */}
        {pairs.length > 0 && (
          <div className="space-y-3 mb-6">
            {pairs.map((pair, idx) => {
              const p1 = peptides.find(p => p.id === pair.id1);
              const p2 = peptides.find(p => p.id === pair.id2);
              return (
                <div key={idx} className={cn(
                  'rounded-xl border p-4 transition-all hover:shadow-sm',
                  !pair.result.safe ? 'border-red-200 bg-red-50/50' :
                  pair.result.warning ? 'border-amber-200 bg-amber-50/50' :
                  'border-emerald-200 bg-emerald-50/50'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {!pair.result.safe ? <XCircle className="h-4 w-4 text-red-500 shrink-0" /> :
                     pair.result.warning ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> :
                     <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                    <span className="text-sm font-bold text-stone-900" dir="ltr">{p1?.nameEn} + {p2?.nameEn}</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-800">{pair.result.message}</p>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">{pair.result.details}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-5 text-center text-xs text-stone-500 leading-relaxed">
          هذه الأداة تعليمية وليست بديلًا عن الاستشارة الطبية. استشر مختص قبل تجميع أي بروتوكول.
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/calculator" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            احسب الجرعة
          </Link>
          <Link to="/coach" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
            اسأل المدرب الذكي عن تجميعة مخصّصة
          </Link>
        </div>
      </div>
    </div>
  );
}
