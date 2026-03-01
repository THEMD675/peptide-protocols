import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layers, Clock, DollarSign, BarChart3, Syringe, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtocolWizard from '@/components/ProtocolWizard';
import { PRICING, SITE_URL } from '@/lib/constants';
import { stacks, peptides, categories } from '@/data/peptides';

const STACK_META: Record<string, { difficulty: string; cost: string; duration: string }> = {
  'golden-recovery': { difficulty: 'مبتدئ', cost: '$140-220/شهر', duration: '4-6 أسابيع' },
  'gh-optimization': { difficulty: 'متوسط', cost: '$260-380/شهر', duration: '8-12 أسبوع' },
  'brain-performance': { difficulty: 'مبتدئ', cost: '$80-130/شهر', duration: '4 أسابيع مع راحة' },
  'longevity-protocol': { difficulty: 'متقدم', cost: '$270/دورة', duration: '20 يوم كل 6 أشهر' },
  'gut-repair': { difficulty: 'متوسط', cost: '$160-270/شهر', duration: '8-12 أسبوع' },
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      {activeWizard && <ProtocolWizard peptideId={activeWizard} onClose={() => setActiveWizard(null)} />}
      <Helmet>
        <title>بروتوكولات ببتيدات مُجمَّعة | خلطات مُجرَّبة | pptides</title>
        <meta name="description" content="بروتوكولات مُجمَّعة لأهداف محددة" />
        <meta property="og:title" content="البروتوكولات المُجمَّعة | pptides" />
        <meta property="og:description" content="خلطات ببتيدات مُجرَّبة لأهداف محددة — تعافي، دماغ، طول عمر" />
        <meta property="og:url" content={`${SITE_URL}/stacks`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content="https://pptides.com/og-image.png" />
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"
        >
          <Layers className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-600">
          البروتوكولات المُجمَّعة
        </h1>
        <p className="mt-2 text-lg text-stone-600">
          خلطات مُجرَّبة لأهداف محددة
        </p>
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
              className="glass-card gold-border flex flex-col overflow-hidden p-6 transition-all hover:shadow-lg"
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
              <p className="mb-3 text-sm leading-relaxed text-stone-700">
                {stack.goalAr}
              </p>

              {/* Stack meta — always visible */}
              {STACK_META[stack.id] && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm font-medium text-stone-700">
                    <BarChart3 className="h-3 w-3" />
                    {STACK_META[stack.id].difficulty}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm font-medium text-stone-700">
                    <DollarSign className="h-3 w-3" />
                    {STACK_META[stack.id].cost}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm font-medium text-stone-700">
                    <Clock className="h-3 w-3" />
                    {STACK_META[stack.id].duration}
                  </span>
                </div>
              )}

              {/* Peptide name chips — always visible */}
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-bold tracking-wider">
                  الببتيدات
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stackPeptides.map((p) =>
                    p ? (
                      <Link
                        key={p.id}
                        to={`/peptide/${p.id}`}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm"
                      >
                        {p.nameAr}
                      </Link>
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
                  <p className="mb-4 text-sm leading-relaxed text-stone-700">
                    {stack.descriptionAr}
                  </p>

                  <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4 text-sm leading-relaxed text-stone-700 space-y-4">
                    {stack.protocolAr.split(/\n\n+/).filter(Boolean).map((block, i) => {
                      const idx = block.indexOf('\n');
                      const firstLine = idx >= 0 ? block.slice(0, idx) : block;
                      const rest = idx >= 0 ? block.slice(idx + 1) : '';
                      const isPhaseHeader = /^(المرحلة \d|البروتوكول |البديل |الدورة\b|بروتوكول |دعم مساعد)/.test(firstLine.trim());
                      return (
                        <div key={i} className="rounded-xl bg-white/50 p-3 py-2 border-s-2 border-emerald-300 ps-3">
                          <span className={isPhaseHeader ? 'text-base font-bold text-stone-900 block mb-1' : ''}>{firstLine}</span>
                          {rest ? <span className="whitespace-pre-line block">{rest}</span> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => stack.peptideIds[0] && setActiveWizard(stack.peptideIds[0])}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Syringe className="h-3.5 w-3.5" />
                      ابدأ البروتوكول
                    </button>
                    <Link
                      to={`/calculator?peptide=${encodeURIComponent(stackPeptides[0]?.nameEn ?? '')}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:border-emerald-200 transition-colors"
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
                        className="rounded-full border-2 border-emerald-300 px-5 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
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
        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">اكتشف البروتوكولات الكاملة</p>
          <p className="mt-1 text-sm text-stone-600">اشترك لفتح كل البروتوكولات المُجمَّعة مع الجرعات والتوقيت</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">اشترك — {PRICING.essentials.label}/شهريًا</Link>
            <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">اسأل المدرب الذكي</Link>
          </div>
        </div>
      )}
    </div>
  );
}
