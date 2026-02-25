import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides } from '@/data/peptides';

interface InteractionResult {
  safe: boolean;
  warning: boolean;
  message: string;
  details: string;
}

const DANGEROUS_COMBOS: Record<string, InteractionResult> = {
  'semaglutide+insulin': { safe: false, warning: false, message: 'خطر هبوط سكر حاد', details: 'Semaglutide يخفض السكر بشكل كبير. دمجه مع الأنسولين يضاعف خطر هبوط السكر الحاد. يحتاج إشراف طبي مباشر.' },
  'igf-1-lr3+cjc-1295': { safe: false, warning: true, message: 'خطر تضخّم أعضاء', details: 'IGF-1 LR3 مع أي محفّز لهرمون النمو يرفع IGF-1 بشكل مفرط. خطر تضخّم القلب والأعضاء على المدى الطويل.' },
  'igf-1-lr3+ipamorelin': { safe: false, warning: true, message: 'خطر تضخّم أعضاء', details: 'IGF-1 LR3 مع أي محفّز لهرمون النمو يرفع IGF-1 بشكل مفرط. خطر تضخّم القلب والأعضاء على المدى الطويل.' },
  'melanotan-ii+*': { safe: false, warning: false, message: 'Melanotan II غير آمن', details: 'لا ننصح باستخدام Melanotan II مطلقًا. خطر حقيقي لسرطان الجلد (ميلانوما). لا تجمعه مع أي شيء.' },
  'dihexa+*': { safe: false, warning: true, message: 'Dihexa تجريبي بالكامل', details: 'صفر تجارب بشرية. لا ننصح باستخدامه ولا بتجميعه مع أي شيء آخر.' },
};

const SYNERGISTIC_COMBOS: Record<string, InteractionResult> = {
  'bpc-157+tb-500': { safe: true, warning: false, message: 'تجميعة ممتازة — أفضل مزيج تعافي', details: 'BPC-157 يُصلح الأوتار والأربطة موضعيًا، TB-500 يُرمّم الأنسجة جهازيًا. يكمّلان بعض. الجرعة: BPC-157 250mcg 2x/يوم + TB-500 750mcg 2x/أسبوع.' },
  'cjc-1295+ipamorelin': { safe: true, warning: false, message: 'أفضل تجميعة هرمون نمو للمبتدئين', details: 'CJC-1295 يحفّز إفراز GH بشكل مستدام، Ipamorelin يضيف نبضة نظيفة. معًا يرفعان GH بدون رفع الكورتيزول. الجرعة: CJC 100mcg + Ipa 200mcg قبل النوم.' },
  'semax+selank': { safe: true, warning: false, message: 'تجميعة دماغ ممتازة', details: 'Semax يرفع BDNF للتركيز والذاكرة، Selank يقلل القلق عبر GABA. يكمّلان بعض بدون تعارض. بخاخ أنف صباحًا.' },
  'bpc-157+cjc-1295': { safe: true, warning: false, message: 'تعافي + هرمون نمو — تجميعة فعّالة', details: 'BPC-157 للتعافي الموضعي + CJC-1295 لتحفيز هرمون النمو يعزّزان الشفاء بآليات مختلفة.' },
  'bpc-157+ipamorelin': { safe: true, warning: false, message: 'تعافي + هرمون نمو — تجميعة فعّالة', details: 'BPC-157 للتعافي + Ipamorelin لهرمون النمو. تجميعة آمنة وفعّالة.' },
  'semaglutide+tesamorelin': { safe: true, warning: false, message: 'فقدان دهون مزدوج — فعّال جدًا', details: 'Semaglutide يقلل الشهية عبر GLP-1، Tesamorelin يحرق دهون البطن عبر هرمون النمو. آليات مختلفة = نتائج أفضل.' },
  'epithalon+ghk-cu': { safe: true, warning: false, message: 'بروتوكول إطالة عمر أساسي', details: 'Epithalon يُطيل التيلوميرات، GHK-Cu يُجدد البشرة والأنسجة. يكمّلان بعض بآليات مختلفة تمامًا.' },
  'epithalon+thymosin-alpha-1': { safe: true, warning: false, message: 'طول عمر + مناعة — تجميعة ممتازة', details: 'Epithalon للتيلوميرات + Thymosin Alpha-1 للمناعة. بروتوكول خافينسون الكلاسيكي لمكافحة الشيخوخة.' },
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

  if (p1.category === p2.category) {
    return { safe: true, warning: true, message: 'نفس الفئة — تحقق من التداخل', details: `كلا الببتيدين من فئة ${p1.category === 'metabolic' ? 'الأيض' : p1.category === 'recovery' ? 'التعافي' : p1.category === 'brain' ? 'الدماغ' : p1.category}. قد يكون هناك تداخل في الآلية. استشر مختص قبل الجمع.` };
  }

  return { safe: true, warning: false, message: 'لا يوجد تعارض معروف', details: 'بناءً على البيانات المتاحة، لا يوجد تعارض معروف بين هذين الببتيدين. لكن استشر مختص دائمًا قبل تجميع أي بروتوكول.' };
}

export default function InteractionChecker() {
  const [peptide1, setPeptide1] = useState('');
  const [peptide2, setPeptide2] = useState('');

  const result = useMemo(() => {
    if (!peptide1 || !peptide2 || peptide1 === peptide2) return null;
    return checkInteraction(peptide1, peptide2);
  }, [peptide1, peptide2]);

  const sortedPeptides = useMemo(() => [...peptides].sort((a, b) => a.nameEn.localeCompare(b.nameEn)), []);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>فحص التعارضات — هل يمكن تجميع ببتيدين معًا؟ | Interaction Checker</title>
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

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-stone-900">الببتيد الأول</label>
            <select
              value={peptide1}
              onChange={(e) => setPeptide1(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none"
            >
              <option value="">اختر ببتيد...</option>
              {sortedPeptides.map(p => (
                <option key={p.id} value={p.id}>{p.nameAr} ({p.nameEn})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-stone-900">الببتيد الثاني</label>
            <select
              value={peptide2}
              onChange={(e) => setPeptide2(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none"
            >
              <option value="">اختر ببتيد...</option>
              {sortedPeptides.filter(p => p.id !== peptide1).map(p => (
                <option key={p.id} value={p.id}>{p.nameAr} ({p.nameEn})</option>
              ))}
            </select>
          </div>
        </div>

        {peptide1 && peptide2 && peptide1 === peptide2 && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-600">
            اختر ببتيدين مختلفين للمقارنة
          </div>
        )}

        {result && (
          <div className={cn(
            'rounded-2xl border-2 p-6',
            !result.safe ? 'border-red-300 bg-red-50' :
            result.warning ? 'border-amber-300 bg-amber-50' :
            'border-emerald-300 bg-emerald-50'
          )}>
            <div className="flex items-center gap-3 mb-4">
              {!result.safe ? (
                <XCircle className="h-8 w-8 text-red-600 shrink-0" />
              ) : result.warning ? (
                <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="h-8 w-8 text-emerald-600 shrink-0" />
              )}
              <div>
                <p className={cn(
                  'text-lg font-bold',
                  !result.safe ? 'text-red-900' : result.warning ? 'text-amber-900' : 'text-emerald-900'
                )}>
                  {result.message}
                </p>
              </div>
            </div>
            <p className={cn(
              'text-sm leading-relaxed',
              !result.safe ? 'text-red-800' : result.warning ? 'text-amber-800' : 'text-emerald-800'
            )}>
              {result.details}
            </p>

            <div className="mt-4 flex gap-2">
              <Link to={`/peptide/${peptide1}`} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
                {peptides.find(p => p.id === peptide1)?.nameAr}
              </Link>
              <Link to={`/peptide/${peptide2}`} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
                {peptides.find(p => p.id === peptide2)?.nameAr}
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-5 text-center text-xs text-stone-500 leading-relaxed">
          هذه الأداة تعليمية وليست بديلًا عن الاستشارة الطبية. استشر مختص قبل تجميع أي بروتوكول.
        </div>

        <div className="mt-6 text-center">
          <Link to="/coach" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" />
            اسأل المدرب الذكي عن تجميعة مخصّصة
          </Link>
        </div>
      </div>
    </div>
  );
}
