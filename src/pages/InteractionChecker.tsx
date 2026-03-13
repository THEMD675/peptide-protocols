import { useState, useMemo, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Shield, Clock, Syringe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptidesLite as peptides } from '@/data/peptides-lite';
import { peptidesPublic as peptideFull } from '@/data/peptides-public';
import { categoryLabels } from '@/lib/peptide-labels';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { DANGEROUS_COMBOS, SYNERGISTIC_COMBOS, DRUG_INTERACTIONS, GH_PEPTIDE_IDS, FAT_LOSS_PEPTIDE_IDS, MEDICATIONS, TIMING_NOTES, type InteractionResult, type SeverityLevel } from '@/data/interactions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import ShareButtons from '@/components/ShareButtons';

const MEDICATION_IDS = new Set(MEDICATIONS.map(m => m.id));

function getMedicationName(id: string): string {
  return MEDICATIONS.find(m => m.id === id)?.nameAr ?? id;
}

/** Parse cost string like '563-938 ر.س/شهر' into [min, max] */
function parseCostRange(cost?: string): [number, number] | null {
  if (!cost) return null;
  const nums = cost.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => !isNaN(n));
  if (values.length === 1) return [values[0], values[0]];
  if (values.length >= 2) return [Math.min(...values), Math.max(...values)];
  return null;
}

/** Map frequency to daily injection count (only for injectable routes) */
function getDailyInjections(freq?: string, route?: string): number {
  if (!route || !['subq', 'im'].includes(route)) return 0;
  switch (freq) {
    case 'bid': return 2;
    case 'od': return 1;
    case 'daily-10': return 10 / 30;
    case 'daily-20': return 20 / 30;
    case 'weekly': return 1 / 7;
    case 'biweekly': return 1 / 14;
    case 'prn': return 0.5;
    default: return 1;
  }
}

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

  // If both are medications, no interaction data
  if (MEDICATION_IDS.has(id1) && MEDICATION_IDS.has(id2)) {
    return { safe: true, warning: true, severity: 'warning' as SeverityLevel, severityAr: 'تحذير', message: `${getMedicationName(id1)} + ${getMedicationName(id2)} — لا توجد بيانات`, details: 'هذه الأداة مخصصة لفحص تعارضات الببتيدات مع الأدوية. لتعارضات الأدوية مع بعضها، استشر الصيدلي.' };
  }

  // If one is a medication with no specific interaction found
  if (MEDICATION_IDS.has(id1) || MEDICATION_IDS.has(id2)) {
    const medId = MEDICATION_IDS.has(id1) ? id1 : id2;
    const pepId = MEDICATION_IDS.has(id1) ? id2 : id1;
    const med = MEDICATIONS.find(m => m.id === medId);
    const pep = peptides.find(p => p.id === pepId);
    return { safe: true, warning: false, severity: 'safe' as SeverityLevel, severityAr: 'آمن', message: `${pep?.nameAr ?? pepId} + ${med?.nameAr ?? medId} — لا تعارض معروف`, details: 'لم نجد تعارضًا مسجّلًا بين هذا الببتيد وهذا الدواء. هذا لا يعني عدم وجود تعارض — استشر مختصًا دائمًا.' };
  }

  const p1 = peptides.find(p => p.id === id1);
  const p2 = peptides.find(p => p.id === id2);
  if (!p1 || !p2) return { safe: true, warning: true, severity: 'warning' as SeverityLevel, severityAr: 'تحذير', message: 'غير متوفر', details: '' };

  if (GH_PEPTIDE_IDS.includes(id1) && GH_PEPTIDE_IDS.includes(id2)) {
    return { safe: true, warning: true, severity: 'warning', severityAr: 'تحذير', message: 'كلاهما يحفّز هرمون النمو — راقب IGF-1', details: `${p1.nameAr} و ${p2.nameAr} كلاهما يحفّز إفراز هرمون النمو. الجمع قد يرفع IGF-1 بشكل مفرط. اعمل تحليل IGF-1 بعد أسبوعين. لا تجمع أكثر من 2 محفّزات GH.` };
  }

  if (FAT_LOSS_PEPTIDE_IDS.includes(id1) && FAT_LOSS_PEPTIDE_IDS.includes(id2)) {
    return { safe: true, warning: true, severity: 'warning', severityAr: 'تحذير', message: 'كلاهما لفقدان الدهون — تحقق من الحاجة', details: `${p1.nameAr} و ${p2.nameAr} كلاهما يستهدف فقدان الدهون. تأكد أن آلياتهم مختلفة قبل الجمع. إذا كانا بنفس الآلية (مثلًا ناهضان GLP-1)، لا تجمع.` };
  }

  if (p1.category === p2.category) {
    const catName = categoryLabels[p1.category] ?? p1.category;
    return { safe: true, warning: true, severity: 'warning', severityAr: 'تحذير', message: `نفس فئة ${catName} — تحقق من التداخل`, details: `${p1.nameAr} و ${p2.nameAr} من نفس الفئة (${catName}). إذا كانت آلية عملهم متشابهة، قد يكون الجمع غير ضروري أو يزيد الأعراض الجانبية. تحقق من أن كل واحد يضيف قيمة مختلفة.` };
  }

  return { safe: true, warning: false, severity: 'safe', severityAr: 'آمن', message: `${p1.nameAr} + ${p2.nameAr} — لا تعارض معروف`, details: `الببتيدان من فئات مختلفة (${categoryLabels[p1.category] ?? p1.category} + ${categoryLabels[p2.category] ?? p2.category}). آليات مختلفة عادةً لا تتعارض. استشر مختص قبل أي تجميعة جديدة.` };
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'هل يمكن تجميع BPC-157 مع TB-500؟',
      acceptedAnswer: { '@type': 'Answer', text: 'نعم، BPC-157 + TB-500 هو المزيج الذهبي للتعافي. BPC-157 يُصلح الأوتار موضعيًا وTB-500 يُرمّم الأنسجة جهازيًا.' },
    },
    {
      '@type': 'Question',
      name: 'ما هي تعارضات الببتيدات الخطيرة؟',
      acceptedAnswer: { '@type': 'Answer', text: 'أخطر التعارضات: الجمع بين ناهضات GLP-1 (مثل سيماغلوتايد وتيرزيباتايد)، IGF-1 LR3 مع محفّزات هرمون النمو، وأي ببتيد محفّز للأوعية مع السرطان النشط.' },
    },
    {
      '@type': 'Question',
      name: 'هل يمكن الجمع بين CJC-1295 وإيباموريلين؟',
      acceptedAnswer: { '@type': 'Answer', text: 'نعم، CJC-1295 + Ipamorelin هي أفضل تجميعة هرمون نمو. CJC يحفّز GH بشكل مستدام وIpamorelin يضيف نبضة نظيفة بدون رفع الكورتيزول.' },
    },
    {
      '@type': 'Question',
      name: 'ما تعارضات الببتيدات مع أدوية السكري؟',
      acceptedAnswer: { '@type': 'Answer', text: 'ناهضات GLP-1 مع الأنسولين = خطر هبوط سكر حاد. مع الميتفورمين = يحتاج مراقبة. محفّزات هرمون النمو ترفع مقاومة الأنسولين. استشر طبيبك دائمًا.' },
    },
  ],
};

export default function InteractionChecker() {
  const { user, subscription, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const hasAutoFilled = useRef(false);
  const hasTracked = useRef(false);
  const [autoFilledFromProtocols, setAutoFilledFromProtocols] = useState(false);
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

  // Auto-populate from user's active protocols
  useEffect(() => {
    if (!user || hasAutoFilled.current) return;
    // Skip auto-fill if URL params provided peptides
    const hasUrlParams = searchParams.get('p1') !== null || searchParams.get('p2') !== null || searchParams.get('p') !== null || searchParams.get('peptide') !== null;
    if (hasUrlParams) { hasAutoFilled.current = true; return; }
    let mounted = true;
    supabase
      .from('user_protocols')
      .select('peptide_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (!mounted || error || !data || data.length === 0) return;
        hasAutoFilled.current = true;
        const ids = data.map(d => d.peptide_id).slice(0, 5);
        // Ensure at least 2 slots
        const slots = ids.length >= 2 ? ids : [...ids, ...Array(2 - ids.length).fill('')];
        setSelected(slots);
        setAutoFilledFromProtocols(true);
      })
      .catch((e: unknown) => console.error("silent catch:", e));
    return () => { mounted = false; };
  }, [user, searchParams]);

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

  // Timing notes for selected peptides (only actual peptides, not medications)
  const timingNotes = useMemo(() => {
    return filledPeptides
      .filter(id => !MEDICATION_IDS.has(id) && TIMING_NOTES[id])
      .map(id => ({ id, name: peptides.find(p => p.id === id)?.nameAr ?? id, note: TIMING_NOTES[id] }));
  }, [filledPeptides]);

  // Injection count + cost summary from full peptide data
  const stackSummary = useMemo(() => {
    const pepIds = filledPeptides.filter(id => !MEDICATION_IDS.has(id));
    let totalDaily = 0;
    let costMin = 0;
    let costMax = 0;
    let hasCost = false;
    const injectables: string[] = [];

    for (const id of pepIds) {
      const p = peptideFull.find(pf => pf.id === id);
      if (!p) continue;
      const daily = getDailyInjections(p.frequency, p.route);
      if (daily > 0) {
        totalDaily += daily;
        injectables.push(p.nameAr);
      }
      const range = parseCostRange(p.costEstimate);
      if (range) {
        costMin += range[0];
        costMax += range[1];
        hasCost = true;
      }
    }

    return {
      totalDaily: Math.round(totalDaily * 10) / 10,
      injectableCount: injectables.length,
      costMin,
      costMax,
      hasCost,
      needsRotation: injectables.length >= 2,
    };
  }, [filledPeptides]);

  // Gating: first pair free, rest require login + subscription
  const canSeeFullResults = !!user && (subscription?.isPaidSubscriber || subscription?.isTrial);

  // Analytics: track interaction check
  useEffect(() => {
    if (filledPeptides.length >= 2 && !hasTracked.current) {
      hasTracked.current = true;
      trackEvent('interaction_check', { peptides: filledPeptides.join(','), count: filledPeptides.length });
    }
    if (filledPeptides.length < 2) {
      hasTracked.current = false;
    }
  }, [filledPeptides]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>فحص تعارضات الببتيدات | pptides</title>
        <meta name="description" content={`تحقق من أمان تجميع أي ببتيدين معًا. فحص التعارضات والتفاعلات بين ${PEPTIDE_COUNT}+ ببتيد.`} />
        <meta property="og:title" content="فحص تعارضات الببتيدات | pptides" />
        <meta property="og:description" content="اختر ببتيدين لمعرفة إذا يمكن تجميعهما بأمان" />
        <meta property="og:url" content={`${SITE_URL}/interactions`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/interactions`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="فحص تعارضات الببتيدات | pptides" />
        <meta name="twitter:description" content={`تحقق من أمان تجميع أي ببتيدين معًا — فحص التعارضات والتفاعلات بين ${PEPTIDE_COUNT}+ ببتيد.`} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
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
        <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">قاعدة البيانات لا تشمل جميع التعارضات المحتملة — استشر مختصًا قبل تجميع أي بروتوكول</div>
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Shield className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            فحص <span className="text-emerald-700">التعارضات</span>
          </h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
            اختر ببتيدين لمعرفة إذا يمكن تجميعهما بأمان
          </p>
        </div>

        {autoFilledFromProtocols && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
            <Syringe className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">تم تحميل ببتيداتك النشطة تلقائيًا من بروتوكولاتك</p>
          </div>
        )}

        <div className="mb-6 space-y-3">
          {selected.map((sel, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-bold text-emerald-700 dark:text-emerald-400">{idx + 1}</span>
              <select
                value={sel}
                onChange={(e) => updateSlot(idx, e.target.value)}
                aria-label={`اختر الببتيد ${idx + 1}`}
                className={cn('flex-1 rounded-xl border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900', sel ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-300 italic')}
              >
                <option value="">اختر ببتيد أو دواء...</option>
                <optgroup label="الببتيدات">
                {sortedPeptides.map(p => {
                  const usedElsewhere = selected.some((s, i) => i !== idx && s === p.id);
                  return (
                    <option key={p.id} value={p.id} disabled={usedElsewhere}>{p.nameAr} ({p.nameEn}){usedElsewhere ? ' (محدد)' : ''}</option>
                  );
                })}
                </optgroup>
                <optgroup label="الأدوية والحالات">
                {MEDICATIONS.map(m => {
                  const usedElsewhere = selected.some((s, i) => i !== idx && s === m.id);
                  return (
                    <option key={m.id} value={m.id} disabled={usedElsewhere}>{m.nameAr} ({m.nameEn}){usedElsewhere ? ' (محدد)' : ''}</option>
                  );
                })}
                </optgroup>
              </select>
              {selected.length > 2 && (
                <button onClick={() => removeSlot(idx)} aria-label="إزالة" className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors hover:text-red-500 dark:hover:text-red-400"><XCircle className="h-4 w-4" /></button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
          {selected.length < 5 && (
            <button onClick={addSlot} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-600 py-3 text-sm font-medium text-stone-500 dark:text-stone-300 hover:border-emerald-300 dark:border-emerald-700 transition-colors hover:text-emerald-700">
              + أضف ببتيد آخر
            </button>
          )}
          {filledPeptides.length > 0 && (
            <button onClick={resetAll} className="rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-3 text-sm font-medium text-stone-500 dark:text-stone-300 hover:border-red-200 dark:border-red-800 hover:text-red-500 dark:text-red-400 transition-colors">
              مسح الكل
            </button>
          )}
          </div>
        </div>

        {filledPeptides.length < 2 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 py-12 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-stone-300 dark:text-stone-400" />
            <p className="text-sm font-bold text-stone-600 dark:text-stone-300">اختر ببتيدين أو أكثر لفحص التعارضات بينهما</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-300">نتحقق من أمان الدمج بناءً على آليات العمل والأدلة العلمية</p>
          </div>
        )}

        {filledPeptides.length >= 2 && hasDuplicates && (
          <div className="rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">اختر ببتيدات مختلفة لفحص التعارضات</p>
          </div>
        )}

        {/* Stack Summary */}
        {filledPeptides.length >= 2 && !hasDuplicates && (
          <div className={cn(
            'mb-6 rounded-2xl border-2 p-5',
            hasAnyDanger ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
            hasAnyWarning ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' :
            'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
          )}>
            {filledPeptides.length >= 3 && (
              <p className={cn(
                'mb-3 text-center text-2xl font-black md:text-3xl',
                hasAnyDanger ? 'text-red-700 dark:text-red-400' : hasAnyWarning ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
              )}>
                {hasAnyDanger ? 'التجميعة غير آمنة' : hasAnyWarning ? 'التجميعة تحتاج مراجعة' : 'التجميعة آمنة'}
              </p>
            )}
            <div className="flex items-center gap-3">
              {hasAnyDanger ? (
                <XCircle className="h-7 w-7 text-red-600 dark:text-red-400 shrink-0" />
              ) : hasAnyWarning ? (
                <AlertTriangle className="h-7 w-7 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="h-7 w-7 text-emerald-700 shrink-0" />
              )}
              <p className={cn('text-base font-bold', hasAnyDanger ? 'text-red-900 dark:text-red-400' : hasAnyWarning ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-300')}>
                {hasAnyDanger ? 'تعارض خطير — لا تجمع هذه التجميعة' :
                 hasAnyWarning ? 'يوجد تحذيرات — راجع التفاصيل' :
                 `التجميعة آمنة — ${filledPeptides.length} ببتيدات بدون تعارضات`}
              </p>
            </div>
          </div>
        )}

        {/* Pair-by-pair details */}
        {pairs.length > 0 && !hasDuplicates && (
          <div className="space-y-3 mb-6 relative">
            {pairs.map((pair, idx) => {
              const p1 = peptides.find(p => p.id === pair.id1);
              const p2 = peptides.find(p => p.id === pair.id2);
              const m1 = MEDICATIONS.find(m => m.id === pair.id1);
              const m2 = MEDICATIONS.find(m => m.id === pair.id2);
              const name1 = p1?.nameEn ?? m1?.nameEn ?? pair.id1;
              const name2 = p2?.nameEn ?? m2?.nameEn ?? pair.id2;
              const isGated = idx > 0 && !canSeeFullResults;
              return (
                <div key={idx} className={cn(
                  'rounded-xl border p-4 transition-all hover:shadow-sm dark:shadow-stone-900/30',
                  !pair.result.safe ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
                  pair.result.warning ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' :
                  'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
                  isGated && 'select-none',
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {!pair.result.safe ? <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" /> :
                     pair.result.warning ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> :
                     <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">
                      {p1 ? <Link to={`/peptide/${pair.id1}`} className="hover:text-emerald-700 transition-colors">{name1}</Link> : <span>{name1}</span>}
                      <span> + </span>
                      {p2 ? <Link to={`/peptide/${pair.id2}`} className="hover:text-emerald-700 transition-colors">{name2}</Link> : <span>{name2}</span>}
                    </span>
                    <span className={cn(
                      'ms-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold',
                      pair.result.severity === 'dangerous' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                      pair.result.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    )}>
                      {pair.result.severityAr}
                    </span>
                  </div>
                  {isGated ? (
                    <div className="blur-sm pointer-events-none" aria-hidden="true">
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{pair.result.message}</p>
                      <p className="text-sm text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">{pair.result.details}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{pair.result.message}</p>
                      <p className="text-sm text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">{pair.result.details}</p>
                    </>
                  )}
                </div>
              );
            })}

            {/* Gating CTA */}
            {pairs.length > 1 && !canSeeFullResults && (
              <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5 text-center">
                <Lock className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
                  {!user ? 'سجّل دخولك لرؤية كل التفاصيل' : 'اشترك لرؤية كل التفاعلات بالتفصيل'}
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">
                  النتيجة الأولى مجانية — التفاصيل الكاملة للمشتركين
                </p>
                <Link
                  to={!user ? '/login' : '/pricing'}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  {!user ? 'تسجيل الدخول' : 'اشترك الآن'}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Injection Count + Cost Summary */}
        {filledPeptides.length >= 2 && !hasDuplicates && (stackSummary.totalDaily > 0 || stackSummary.hasCost) && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
            {stackSummary.totalDaily > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Syringe className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">الحقن اليومية</span>
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  ~{stackSummary.totalDaily < 1 ? stackSummary.totalDaily.toFixed(1) : Math.round(stackSummary.totalDaily)}
                  <span className="text-sm font-medium text-stone-500 dark:text-stone-300 me-1"> حقنة/يوم</span>
                </p>
                {stackSummary.needsRotation && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {stackSummary.injectableCount} ببتيدات حقنية — بدّل مواقع الحقن
                  </p>
                )}
              </div>
            )}
            {stackSummary.hasCost && (
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">التكلفة الشهرية التقريبية</span>
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {stackSummary.costMin === stackSummary.costMax
                    ? `${stackSummary.costMin.toLocaleString('ar-u-nu-latn')}`
                    : `${stackSummary.costMin.toLocaleString('ar-u-nu-latn')}–${stackSummary.costMax.toLocaleString('ar-u-nu-latn')}`}
                  <span className="text-sm font-medium text-stone-500 dark:text-stone-300 me-1"> ر.س/شهر</span>
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">تقدير تقريبي — الأسعار تختلف حسب المصدر</p>
              </div>
            )}
          </div>
        )}

        {/* Timing Notes */}
        {timingNotes.length > 0 && !hasDuplicates && (
          <div className="mb-6 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">ملاحظات التوقيت</h2>
            </div>
            {timingNotes.map(({ id, name, note }) => (
              <div key={id} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">{name}</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{note}</p>
              </div>
            ))}
            {stackSummary.needsRotation && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">تدوير مواقع الحقن</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  عند حقن {stackSummary.injectableCount} ببتيدات تحت الجلد — بدّل بين البطن والفخذ وأعلى الذراع. لا تحقن أكثر من ببتيد واحد في نفس الموقع.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Share */}
        {pairs.length > 0 && !hasDuplicates && (
          <div className="mb-6 text-center">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">شارك نتيجة الفحص</p>
            <ShareButtons
              url={`${SITE_URL}/interactions?p=${filledPeptides.join(',')}`}
              title={`فحص تعارضات: ${filledPeptides.map(id => peptides.find(p => p.id === id)?.nameEn ?? MEDICATIONS.find(m => m.id === id)?.nameEn ?? id).join(' + ')}`}
              description="تحقق من أمان تجميع الببتيدات — pptides.com"
              layout="row"
            />
          </div>
        )}

        <div className="mt-8 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-5 text-center text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          هذه الأداة تعليمية وليست بديلًا عن الاستشارة الطبية. قاعدة بيانات التعارضات لا تشمل جميع التعارضات المحتملة — استشر مختصًا قبل تجميع أي بروتوكول.
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/calculator" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            احسب الجرعة
          </Link>
          <Link to="/tracker" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">
            سجّل في سجل الحقن
          </Link>
          <Link to="/coach" className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">
            اسأل المدرب الذكي
          </Link>
          <Link to="/library" className="inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-700 hover:underline">
            العودة للمكتبة
          </Link>
        </div>
      </div>
    </div>
  );
}
