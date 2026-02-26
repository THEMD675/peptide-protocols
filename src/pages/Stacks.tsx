import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layers, Clock, DollarSign, BarChart3, Syringe, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { stacks, peptides, categories } from '@/data/peptides';

const STACK_META: Record<string, { difficulty: string; cost: string; duration: string }> = {
  'golden-recovery': { difficulty: 'مبتدئ', cost: '$120-180/شهر', duration: '4-6 أسابيع' },
  'gh-optimization': { difficulty: 'متوسط', cost: '$200-350/شهر', duration: '8-12 أسبوع' },
  'brain-performance': { difficulty: 'مبتدئ', cost: '$70-100/شهر', duration: '4 أسابيع مع راحة' },
  'longevity-protocol': { difficulty: 'متقدم', cost: '$270/دورة', duration: '20 يوم كل 6 أشهر' },
  'gut-repair': { difficulty: 'متوسط', cost: '$160-270/شهر', duration: '8-12 أسبوع' },
};

function getCategoryLabel(categoryId: string) {
  return categories.find((c) => c.id === categoryId)?.nameAr ?? categoryId;
}

function getPrimaryCategory(peptideIds: string[]) {
  const first = peptides.find((p) => p.id === peptideIds[0]);
  return first?.category ?? 'recovery';
}

export default function Stacks() {
  const { subscription, isLoading } = useAuth();
  const isPro = !isLoading && (subscription?.isProOrTrial ?? false);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
      <Helmet>
        <title>بروتوكولات ببتيدات مُجمَّعة — خلطات مُجرَّبة | Peptide Stacks & Protocols</title>
        <meta name="description" content="بروتوكولات مُجمَّعة تجمع عدة ببتيدات حسب الهدف: تعافي، دماغ، طول عمر. Curated peptide stacks for recovery, brain, and longevity." />
      </Helmet>
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: '#10b981' }}
        >
          <Layers className="h-7 w-7"  />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl text-emerald-600">
          البروتوكولات المُجمَّعة
        </h1>
        <p className="mt-2 text-lg" >
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
              className="glass-card gold-border flex flex-col overflow-hidden p-6"
            >
              {/* Category badge — always visible */}
              <span
                className="mb-3 w-fit rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                }}
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
              <p className="mb-3 text-sm leading-relaxed text-stone-700" >
                {stack.goalAr}
              </p>

              {/* Stack meta — always visible */}
              {STACK_META[stack.id] && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-700">
                    <BarChart3 className="h-3 w-3" />
                    {STACK_META[stack.id].difficulty}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-700">
                    <DollarSign className="h-3 w-3" />
                    {STACK_META[stack.id].cost}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-700">
                    <Clock className="h-3 w-3" />
                    {STACK_META[stack.id].duration}
                  </span>
                </div>
              )}

              {/* Peptide name chips — always visible */}
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider" >
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
                  style={
                    !isPro
                      ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }
                      : undefined
                  }
                >
                  <p className="mb-4 text-sm leading-relaxed" >
                    {stack.descriptionAr}
                  </p>

                  <div
                    className="rounded-xl p-4 text-xs leading-relaxed"
                    style={{
                      background: 'rgba(var(--navy-rgb, 15 23 42) / 0.05)',
                      color: '#57534e',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {stack.protocolAr}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/tracker?peptide=${encodeURIComponent(stackPeptides[0]?.nameEn ?? '')}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Syringe className="h-3.5 w-3.5" />
                      ابدأ البروتوكول
                    </Link>
                    <Link
                      to={`/calculator?peptide=${encodeURIComponent(stackPeptides[0]?.nameEn ?? '')}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:border-emerald-200 transition-colors"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      احسب الجرعة
                    </Link>
                  </div>
                </div>

                {!isPro && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        to="/pricing"
                        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        اشترك — $9/شهريًا
                      </Link>
                      <Link
                        to="/coach"
                        className="rounded-full border-2 border-emerald-300 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
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
            <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">اشترك — $9/شهريًا</Link>
            <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">اسأل المدرب الذكي</Link>
          </div>
        </div>
      )}
    </main>
  );
}
