import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Layers, Clock, DollarSign, BarChart3, Syringe, Calculator, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtocolWizard from '@/components/ProtocolWizard';
import StackBuilder from '@/components/StackBuilder';
import { PRICING, SITE_URL } from '@/lib/constants';
import { stacks, peptides, categories } from '@/data/peptides';
import { GenericPageSkeleton } from '@/components/Skeletons';

const STACK_META: Record<string, { difficulty: string; cost: string; duration: string }> = {
  'golden-recovery': { difficulty: 'مبتدئ', cost: '525-825 ر.س/شهر', duration: '4-6 أسابيع' },
  'gh-optimization': { difficulty: 'متوسط', cost: '975-1,425 ر.س/شهر', duration: '8-12 أسبوع' },
  'brain-performance': { difficulty: 'مبتدئ', cost: '300-488 ر.س/شهر', duration: '4 أسابيع مع راحة' },
  'longevity-protocol': { difficulty: 'متقدم', cost: '1,013 ر.س/دورة', duration: '20 يوم كل 6 أشهر' },
  'gut-repair': { difficulty: 'متوسط', cost: '600-1,013 ر.س/شهر', duration: '8-12 أسبوع' },
};

function getCategoryLabel(categoryId: string) {
  return categories.find((c) => c.id === categoryId)?.nameAr ?? categoryId;
}

function getPrimaryCategory(peptideIds: string[]) {
  const counts: Record<string, number> = {};
  for (const id of peptideIds) {
    const p = peptides.find(x => x.id === id);
    if (p) counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  let best = 'recovery';
  let max = 0;
  for (const [cat, n] of Object.entries(counts)) {
    if (n > max) { max = n; best = cat; }
  }
  return best;
}

export default function Stacks() {
  const { subscription, isLoading } = useAuth();
  const isPro = !isLoading && (subscription?.isProOrTrial ?? false);
  const [activeWizard, setActiveWizard] = useState<string | null>(null);
  const [stackStartDialog, setStackStartDialog] = useState<{ peptideIds: string[]; stackName: string } | null>(null);

  if (isLoading) {
    return <GenericPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      {activeWizard && <ProtocolWizard peptideId={activeWizard} onClose={() => setActiveWizard(null)} />}
      {stackStartDialog && (
        <div role="dialog" aria-modal="true" aria-label="بدء البروتوكول" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setStackStartDialog(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">ابدأ البروتوكول: {stackStartDialog.stackName}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">اختر الببتيد الذي تريد بدء بروتوكوله:</p>
            <div className="space-y-2">
              {stackStartDialog.peptideIds.map(pid => {
                const p = peptides.find(x => x.id === pid);
                return p ? (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => { setActiveWizard(pid); setStackStartDialog(null); }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30"
                  >
                    <span>{p.nameAr}</span>
                    <Syringe className="h-4 w-4 shrink-0" />
                  </button>
                ) : null;
              })}
            </div>
            <button onClick={() => setStackStartDialog(null)} className="mt-4 w-full rounded-xl border border-stone-200 dark:border-stone-700 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800">
              إلغاء
            </button>
          </div>
        </div>
      )}
      <Helmet>
        <title>بروتوكولات ببتيدات مُجمَّعة | خلطات مُجرَّبة لأهداف محددة | pptides</title>
        <meta name="description" content="خلطات ببتيدات مُجرَّبة بعناية لأهداف محددة — تعافٍ وإصلاح، أداء دماغي، طول عمر، فقدان دهون، وتعزيز النوم. بروتوكولات مبنية على الأدلة العلمية." />
        <link rel="canonical" href={`${SITE_URL}/stacks`} />
        <meta property="og:title" content="البروتوكولات المُجمَّعة | pptides" />
        <meta property="og:description" content="خلطات ببتيدات مُجرَّبة لأهداف محددة — تعافٍ، دماغ، طول عمر، فقدان دهون." />
        <meta property="og:url" content={`${SITE_URL}/stacks`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="البروتوكولات المُجمَّعة | pptides" />
        <meta name="twitter:description" content="خلطات ببتيدات مُجرَّبة لأهداف محددة — تعافٍ، دماغ، طول عمر، فقدان دهون." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'البروتوكولات المُجمَّعة',
          url: `${SITE_URL}/stacks`,
          description: 'خلطات ببتيدات مُجرَّبة لأهداف محددة — تعافي، دماغ، طول عمر.',
          inLanguage: 'ar',
        })}</script>
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"
        >
          <Layers className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-700">
          البروتوكولات المُجمَّعة
        </h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">
          خلطات مُجرَّبة لأهداف محددة
        </p>
      </div>

      {/* Interactive Stack Builder */}
      <div className="mb-12">
        <StackBuilder />
      </div>

      {/* Divider */}
      <div className="mb-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        <span className="text-sm font-bold text-stone-400 dark:text-stone-400">بروتوكولات جاهزة</span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
      </div>

      {/* Cards grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {stacks.map((stack) => {
          const stackPeptides = stack.peptideIds
            .map((id) => peptides.find((p) => p.id === id))
            .filter(Boolean);
          const primaryCategory = getPrimaryCategory(stack.peptideIds);

          return (
            <article
              key={stack.id}
              className="glass-card primary-border card-hover flex flex-col overflow-hidden p-6"
            >
              {/* Category badge — always visible */}
              <span
                className="mb-3 w-fit rounded-full bg-emerald-500/[0.12] px-3 py-1 text-xs font-semibold text-emerald-500"
              >
                {getCategoryLabel(primaryCategory)}
              </span>

              {/* Title — always visible */}
              <h2
                className="mb-1 text-xl font-bold"
                
              >
                {stack.nameAr}
              </h2>

              {/* Goal — always visible */}
              <p className="mb-3 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                {stack.goalAr}
              </p>

              {/* Stack meta — always visible */}
              {STACK_META[stack.id] && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 text-sm font-medium text-stone-700 dark:text-stone-200">
                    <BarChart3 className="h-3 w-3" />
                    {STACK_META[stack.id].difficulty}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 text-sm font-medium text-stone-700 dark:text-stone-200">
                    <DollarSign className="h-3 w-3" />
                    {STACK_META[stack.id].cost}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 text-sm font-medium text-stone-700 dark:text-stone-200">
                    <Clock className="h-3 w-3" />
                    {STACK_META[stack.id].duration}
                  </span>
                </div>
              )}

              {/* Peptide chain — visual connections */}
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-bold tracking-wider">
                  الببتيدات
                </h3>
                <div className="flex flex-wrap items-center gap-1">
                  {stackPeptides.map((p, idx) =>
                    p ? (
                      <div key={p.id} className="flex items-center gap-1">
                        <Link
                          to={`/peptide/${p.id}`}
                          className="group relative flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md hover:border-emerald-400 min-h-[44px]"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500 group-hover:animate-pulse" />
                          {p.nameAr}
                        </Link>
                        {idx < stackPeptides.length - 1 && (
                          <div className="flex items-center px-0.5">
                            <div className="h-px w-3 bg-emerald-300" />
                            <ArrowLeftRight className="h-3 w-3 text-emerald-400" />
                            <div className="h-px w-3 bg-emerald-300" />
                          </div>
                        )}
                      </div>
                    ) : null,
                  )}
                </div>
              </div>

              {/* Description + Protocol — blurred for non-subscribers */}
              <div className="relative flex-1">
                <div
                  aria-hidden={!isPro}
                  tabIndex={!isPro ? -1 : undefined}
                  className={!isPro ? 'blur-[6px] pointer-events-none select-none max-h-32 overflow-hidden' : ''}
                >
                  <p className="mb-4 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                    {stack.descriptionAr}
                  </p>

                  <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4 text-sm leading-relaxed text-stone-700 dark:text-stone-200 space-y-4">
                    {stack.protocolAr.split(/\n\n+/).filter(Boolean).map((block, i) => {
                      const idx = block.indexOf('\n');
                      const firstLine = idx >= 0 ? block.slice(0, idx) : block;
                      const rest = idx >= 0 ? block.slice(idx + 1) : '';
                      const isPhaseHeader = /^(المرحلة \d|البروتوكول |البديل |الدورة\b|بروتوكول |دعم مساعد)/.test(firstLine.trim());
                      return (
                        <div key={i} className="rounded-xl bg-white dark:bg-stone-950/50 p-3 py-2 border-s-2 border-emerald-300 dark:border-emerald-700 ps-3">
                          <span className={isPhaseHeader ? 'text-base font-bold text-stone-900 dark:text-stone-100 block mb-1' : ''}>{firstLine}</span>
                          {rest ? <span className="whitespace-pre-line block">{rest}</span> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (stack.peptideIds.length === 0) { toast.error('لا يوجد ببتيد مرتبط بهذا البروتوكول'); return; }
                        if (stack.peptideIds.length === 1) {
                          setActiveWizard(stack.peptideIds[0]);
                        } else {
                          setStackStartDialog({ peptideIds: stack.peptideIds, stackName: stack.nameAr });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors min-h-[44px]"
                    >
                      <Syringe className="h-3.5 w-3.5" />
                      {stack.peptideIds.length > 1 ? 'ابدأ البروتوكول' : `ابدأ بـ ${stackPeptides[0]?.nameAr ?? 'البروتوكول'}`}
                    </button>
                    <Link
                      to={`/calculator?peptide=${encodeURIComponent(stackPeptides[0]?.nameEn ?? '')}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-2 text-sm font-bold text-stone-700 dark:text-stone-200 hover:border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      احسب الجرعة
                    </Link>
                  </div>
                </div>

                {!isPro && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        to="/pricing"
                        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                      >
                        اشترك — {PRICING.essentials.label}/شهريًا
                      </Link>
                      <Link
                        to="/coach"
                        className="rounded-full border-2 border-emerald-300 dark:border-emerald-700 px-5 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:bg-emerald-900/20"
                      >
                        اسأل المدرب الذكي
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!isPro && (
        <div className="mt-10 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
          <p className="font-bold text-stone-900 dark:text-stone-100">اكتشف البروتوكولات الكاملة</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">اشترك لفتح كل البروتوكولات المُجمَّعة مع الجرعات والتوقيت</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">اشترك — {PRICING.essentials.label}/شهريًا</Link>
            <Link to="/coach" className="rounded-full border border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">اسأل المدرب الذكي</Link>
          </div>
        </div>
      )}
    </div>
  );
}
