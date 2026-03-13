import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Layers, Clock, DollarSign, BarChart3, Syringe, Calculator, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtocolWizard from '@/components/ProtocolWizard';
import StackBuilder from '@/components/StackBuilder';
import { PRICING, SITE_URL } from '@/lib/constants';
import { stacks, categories } from '@/data/peptides';
import { peptidesPublic as peptides } from '@/data/peptides-public';
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
      <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">محتوى تعليمي — استشر طبيبك قبل استخدام أي ببتيد</div>
      {activeWizard && <ProtocolWizard peptideId={activeWizard} onClose={() => setActiveWizard(null)} />}
      {stackStartDialog && (
        <div role="dialog" aria-modal="true" aria-label="بدء البروتوكول" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setStackStartDialog(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-stone-900/40" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">ابدأ البروتوكول: {stackStartDialog.stackName}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">اختر الببتيد الذي تريد بدء بروتوكوله:</p>
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
            <button onClick={() => setStackStartDialog(null)} className="mt-4 w-full rounded-xl border border-stone-200 dark:border-stone-600 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800">
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
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"
        >
          <Layers className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-700">
          البروتوكولات المُجمَّعة
        </h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-300">
          خلطات مُجرَّبة لأهداف محددة
        </p>
      </div>

      {/* Beginner intro */}
      <div className="mb-10 grid gap-3 sm:grid-cols-3 text-center text-sm">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-bold text-stone-900 dark:text-stone-100 mb-0.5">ما هو البروتوكول؟</p>
          <p className="text-xs text-stone-500 dark:text-stone-300">مجموعة ببتيدات تعمل معًا لتحقيق هدف واحد — تعافٍ، هرمونات، دماغ، أو طول عمر.</p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-bold text-stone-900 dark:text-stone-100 mb-0.5">كيف أبدأ؟</p>
          <p className="text-xs text-stone-500 dark:text-stone-300">استخدم منشئ البروتوكول أدناه لاختيار هدفك، أو اختر من البروتوكولات الجاهزة.</p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Syringe className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-bold text-stone-900 dark:text-stone-100 mb-0.5">مبتدئ؟</p>
          <p className="text-xs text-stone-500 dark:text-stone-300">ابدأ بالبروتوكولات المُعلَّمة بـ "مبتدئ" — ببتيدات واحدة أو اثنين بجرعات بسيطة.</p>
        </div>
      </div>

      {/* Interactive Stack Builder */}
      <div className="mb-12">
        <StackBuilder />
      </div>

      {/* Divider */}
      <div className="mb-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        <span className="text-sm font-bold text-stone-500 dark:text-stone-300">بروتوكولات جاهزة</span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
      </div>

      {/* Cards grid */}
      {stacks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 p-10 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-stone-300 dark:text-stone-500" />
          <p className="text-base font-bold text-stone-700 dark:text-stone-200 mb-2">أنشئ أول مجموعة لك</p>
          <p className="text-sm text-stone-500 dark:text-stone-300 mb-4">استخدم منشئ البروتوكول أعلاه لاختيار ببتيداتك وحفظها كمجموعة</p>
        </div>
      ) : (
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

              {/* Drug interaction safety warning */}
              {stack.peptideIds.length > 1 && (
                <div role="alert" className="mb-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ الجمع بين عدة ببتيدات قد يزيد من الأعراض الجانبية — استشر طبيبك قبل البدء بأي مجموعة
                </div>
              )}

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
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 text-sm font-medium text-stone-700 dark:text-stone-200">
                    <BarChart3 className="h-3 w-3" />
                    {STACK_META[stack.id].difficulty}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 text-sm font-medium text-stone-700 dark:text-stone-200">
                    <DollarSign className="h-3 w-3" />
                    {STACK_META[stack.id].cost}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 text-sm font-medium text-stone-700 dark:text-stone-200">
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
                          className="group relative flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:shadow-md hover:border-emerald-400 min-h-[44px]"
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

              {/* Description + Protocol — hidden for non-subscribers (not just blurred) */}
              <div className="relative flex-1">
                {isPro ? <div
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
                        <div key={i} className="rounded-xl bg-white dark:bg-stone-900/50 p-3 py-2 border-s-2 border-emerald-300 dark:border-emerald-700 ps-3">
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors min-h-[44px]"
                    >
                      <Syringe className="h-3.5 w-3.5" />
                      {stack.peptideIds.length > 1 ? 'ابدأ البروتوكول' : `ابدأ بـ ${stackPeptides[0]?.nameAr ?? 'البروتوكول'}`}
                    </button>
                    <Link
                      to={`/calculator?peptide=${encodeURIComponent(stackPeptides[0]?.nameEn ?? '')}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 hover:border-emerald-300 transition-colors"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      احسب الجرعة
                    </Link>
                  </div>
                </div> : null}

                {!isPro && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/70 dark:bg-stone-900/80 backdrop-blur-sm p-4 text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="mb-1 text-sm font-bold text-stone-900 dark:text-stone-100">اشترك لفتح البروتوكول الكامل</p>
                    <p className="mb-3 text-xs text-stone-500 dark:text-stone-300">الجرعات، التوقيت، ومراحل البروتوكول</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        to="/pricing"
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        اشترك — {PRICING.essentials.label}/شهريًا
                      </Link>
                      <Link
                        to="/coach"
                        className="rounded-xl border border-stone-200 dark:border-stone-700 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
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
      )}

      {!isPro && (
        <div className="mt-10 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
          <p className="font-bold text-stone-900 dark:text-stone-100">اكتشف البروتوكولات الكاملة</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">اشترك لفتح كل البروتوكولات المُجمَّعة مع الجرعات والتوقيت</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/pricing" className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700">اشترك — {PRICING.essentials.label}/شهريًا</Link>
            <Link to="/coach" className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">اسأل المدرب الذكي</Link>
          </div>
        </div>
      )}
    </div>
  );
}
