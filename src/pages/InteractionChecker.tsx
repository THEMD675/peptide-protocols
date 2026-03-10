import { useState, useMemo, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides } from '@/data/peptides';
import { categoryLabels } from '@/lib/peptide-labels';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { DANGEROUS_COMBOS, SYNERGISTIC_COMBOS, DRUG_INTERACTIONS, GH_PEPTIDE_IDS, FAT_LOSS_PEPTIDE_IDS, type InteractionResult } from '@/data/interactions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

function checkInteraction(id1: string, id2: string): InteractionResult {
  const key1 = `${id1}+${id2}`;
  const key2 = `${id2}+${id1}`;

  if (DANGEROUS_COMBOS[key1]) return DANGEROUS_COMBOS[key1];
  if (DANGEROUS_COMBOS[key2]) return DANGEROUS_COMBOS[key2];
  if (DANGEROUS_COMBOS[`${id1}+*`]) return DANGEROUS_COMBOS[`${id1}+*`];
  if (DANGEROUS_COMBOS[`${id2}+*`]) return DANGEROUS_COMBOS[`${id2}+*`];

  if (DRUG_INTERACTIONS[key1]) return DRUG_INTERACTIONS[key1];
  if (DRUG_INTERACTIONS[key2]) return DRUG_INTERACTIONS[key2];

  if (SYNERGISTIC_COMBOS[key1]) return SYNERGISTIC_COMBOS[key1];
  if (SYNERGISTIC_COMBOS[key2]) return SYNERGISTIC_COMBOS[key2];

  const p1 = peptides.find(p => p.id === id1);
  const p2 = peptides.find(p => p.id === id2);
  if (!p1 || !p2) return { safe: true, warning: true, message: 'غير متوفر', details: '' };

  if (GH_PEPTIDE_IDS.includes(id1) && GH_PEPTIDE_IDS.includes(id2)) {
    return { safe: true, warning: true, message: 'كلاهما يحفّز هرمون النمو — راقب IGF-1', details: `${p1.nameAr} و ${p2.nameAr} كلاهما يحفّز إفراز هرمون النمو. الجمع قد يرفع IGF-1 بشكل مفرط. اعمل تحليل IGF-1 بعد أسبوعين. لا تجمع أكثر من 2 محفّزات GH.` };
  }

  if (FAT_LOSS_PEPTIDE_IDS.includes(id1) && FAT_LOSS_PEPTIDE_IDS.includes(id2)) {
    return { safe: true, warning: true, message: 'كلاهما لفقدان الدهون — تحقق من الحاجة', details: `${p1.nameAr} و ${p2.nameAr} كلاهما يستهدف فقدان الدهون. تأكد أن آلياتهم مختلفة قبل الجمع. إذا كانا بنفس الآلية (مثلًا ناهضان GLP-1)، لا تجمع.` };
  }

  if (p1.category === p2.category) {
    const catName = categoryLabels[p1.category] ?? p1.category;
    return { safe: true, warning: true, message: `نفس فئة ${catName} — تحقق من التداخل`, details: `${p1.nameAr} و ${p2.nameAr} من نفس الفئة (${catName}). إذا كانت آلية عملهم متشابهة، قد يكون الجمع غير ضروري أو يزيد الأعراض الجانبية. تحقق من أن كل واحد يضيف قيمة مختلفة.` };
  }

  return { safe: true, warning: false, message: `${p1.nameAr} + ${p2.nameAr} — لا تعارض معروف`, details: `الببتيدان من فئات مختلفة (${categoryLabels[p1.category] ?? p1.category} + ${categoryLabels[p2.category] ?? p2.category}). آليات مختلفة عادةً لا تتعارض. استشر مختص قبل أي تجميعة جديدة.` };
}

export default function InteractionChecker() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const hasAutoFilled = useRef(false);
  const [selected, setSelected] = useState<string[]>(() => {
    const p1 = searchParams.get('p1');
    const p2 = searchParams.get('p2');
    const p = searchParams.get('p');
    if (p1 !== null || p2 !== null) {
      return [p1 ?? '', p2 ?? ''];
    }
    if (p) {
      const parts = p.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      return parts.length >= 2 ? parts : [...parts, ...Array(2 - parts.length).fill('')];
    }
    const legacyPeptide = searchParams.get('peptide');
    return legacyPeptide ? [legacyPeptide, ''] : ['', ''];
  });

  useEffect(() => {
    const p1 = searchParams.get('p1');
    const p2 = searchParams.get('p2');
    const p = searchParams.get('p');
    let next: [string, string] | null = null;
    if (p1 !== null || p2 !== null) {
      next = [p1 ?? '', p2 ?? ''];
    } else if (p) {
      const parts = p.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      next = parts.length >= 2 ? parts as [string, string] : [...parts, ...Array(2 - parts.length).fill('')] as [string, string];
    } else {
      const legacyPeptide = searchParams.get('peptide');
      if (legacyPeptide) next = [legacyPeptide, ''];
    }
    if (next) queueMicrotask(() => setSelected(next!));
  }, [searchParams]);

  useEffect(() => {
    if (!user || selected.some(s => s !== '') || hasAutoFilled.current) return;
    let mounted = true;
    supabase
      .from('user_protocols')
      .select('peptide_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (mounted && !error && data && data.length >= 2) {
          setSelected(data.map(d => d.peptide_id).slice(0, 5));
          hasAutoFilled.current = true;
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [user, selected]);

  const addSlot = () => { if (selected.length < 5) setSelected(prev => [...prev, '']); };
  const removeSlot = (idx: number) => { if (selected.length > 2) setSelected(prev => prev.filter((_, i) => i !== idx)); };
  const updateSlot = (idx: number, val: string) => setSelected(prev => prev.map((v, i) => i === idx ? val : v));
  const resetAll = () => setSelected(['', '']);

  const filledPeptides = useMemo(() => selected.filter(s => s.trim() !== ''), [selected]);
  const uniquePeptides = useMemo(() => [...new Set(filledPeptides)], [filledPeptides]);
  const hasDuplicates = uniquePeptides.length < filledPeptides.length;
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

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <Helmet>
        <title>فحص تعارضات الببتيدات | pptides</title>
        <meta name="description" content={`تحقق من أمان تجميع أي ببتيدين معًا. فحص التعارضات والتفاعلات بين ${PEPTIDE_COUNT}+ ببتيد.`} />
        <meta property="og:title" content="فحص تعارضات الببتيدات | pptides" />
        <meta property="og:description" content="اختر ببتيدين لمعرفة إذا يمكن تجميعهما بأمان" />
        <meta property="og:url" content={`${SITE_URL}/interactions`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'فحص تعارضات الببتيدات',
          url: `${SITE_URL}/interactions`,
          description: 'تحقق من أمان تجميع أي ببتيدين معًا — فحص التعارضات والتفاعلات.',
          applicationCategory: 'HealthApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
          inLanguage: 'ar',
        })}</script>
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
                className={cn('flex-1 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100', sel ? 'text-stone-900' : 'text-stone-500 italic')}
              >
                <option value="">اختر ببتيد...</option>
                {sortedPeptides.map(p => {
                  const usedElsewhere = selected.some((s, i) => i !== idx && s === p.id);
                  return (
                    <option key={p.id} value={p.id} disabled={usedElsewhere}>{p.nameAr} ({p.nameEn}){usedElsewhere ? ' (محدد)' : ''}</option>
                  );
                })}
              </select>
              {selected.length > 2 && (
                <button onClick={() => removeSlot(idx)} aria-label="إزالة" className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-500 hover:bg-red-50 transition-colors hover:text-red-500"><XCircle className="h-4 w-4" /></button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
          {selected.length < 5 && (
            <button onClick={addSlot} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-500 hover:border-emerald-300 transition-colors hover:text-emerald-600">
              + أضف ببتيد آخر
            </button>
          )}
          {filledPeptides.length > 0 && (
            <button onClick={resetAll} className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-500 hover:border-red-200 hover:text-red-500 transition-colors">
              مسح الكل
            </button>
          )}
          </div>
        </div>

        {filledPeptides.length < 2 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 py-12 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-stone-300" />
            <p className="text-sm font-bold text-stone-600">اختر ببتيدين أو أكثر لفحص التعارضات بينهما</p>
            <p className="mt-1 text-sm text-stone-500">نتحقق من أمان الدمج بناءً على آليات العمل والأدلة العلمية</p>
          </div>
        )}

        {filledPeptides.length >= 2 && hasDuplicates && (
          <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <p className="text-sm font-bold text-amber-800">اختر ببتيدات مختلفة لفحص التعارضات</p>
          </div>
        )}

        {/* Stack Summary */}
        {filledPeptides.length >= 2 && !hasDuplicates && (
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
                {hasAnyDanger ? 'التجميعة غير آمنة' : hasAnyWarning ? 'التجميعة تحتاج مراجعة' : 'التجميعة آمنة'}
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
        {pairs.length > 0 && !hasDuplicates && (
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
                    <span className="text-sm font-bold text-stone-900" dir="ltr">
                      <Link to={`/peptide/${pair.id1}`} className="hover:text-emerald-600 transition-colors">{p1?.nameEn}</Link>
                      <span> + </span>
                      <Link to={`/peptide/${pair.id2}`} className="hover:text-emerald-600 transition-colors">{p2?.nameEn}</Link>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-stone-800">{pair.result.message}</p>
                  <p className="text-sm text-stone-600 mt-1 leading-relaxed">{pair.result.details}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-5 text-center text-sm text-stone-600 leading-relaxed">
          هذه الأداة تعليمية وليست بديلًا عن الاستشارة الطبية. قاعدة بيانات التعارضات لا تشمل جميع التعارضات المحتملة — استشر مختصًا قبل تجميع أي بروتوكول.
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/calculator" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
            احسب الجرعة
          </Link>
          <Link to="/tracker" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 px-5 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">
            سجّل في المتتبع
          </Link>
          <Link to="/coach" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 px-5 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">
            اسأل المدرب الذكي
          </Link>
          <Link to="/library" className="inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-600 hover:underline">
            العودة للمكتبة
          </Link>
        </div>
      </div>
    </div>
  );
}
