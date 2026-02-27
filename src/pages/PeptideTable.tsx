import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Search, Lock, BookOpen, AlertTriangle, FlaskConical, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides, categories, stacks } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { categoryIcons } from '@/lib/peptide-labels';

const categoryColors: Record<string, { badge: string; border: string }> = {
  metabolic: { badge: 'bg-orange-100 text-orange-800 border-orange-300', border: 'border-orange-200' },
  recovery: { badge: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-blue-200' },
  hormonal: { badge: 'bg-purple-100 text-purple-800 border-purple-300', border: 'border-purple-200' },
  brain: { badge: 'bg-pink-100 text-pink-800 border-pink-300', border: 'border-pink-200' },
  longevity: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', border: 'border-emerald-200' },
  'skin-gut': { badge: 'bg-teal-100 text-teal-800 border-teal-300', border: 'border-teal-200' },
};

function isLongTerm(cycleAr: string): boolean {
  return cycleAr.includes('مستمر');
}

export default function PeptideTable() {
  const { subscription, isLoading } = useAuth();
  const hasAccess = !isLoading && (subscription?.isProOrTrial ?? false);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = peptides;
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.nameAr.includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          categories.find((c) => c.id === p.category)?.nameAr.includes(q)
      );
    }
    return result;
  }, [search, activeCategory]);

  const peptidesByCategory = useMemo(() => {
    const map: Record<string, typeof peptides> = {};
    for (const cat of categories) {
      map[cat.id] = peptides.filter((p) => p.category === cat.id);
    }
    return map;
  }, []);

  const blurClass = 'blur-[5px] select-none';

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>{`جدول الببتيدات الشامل | مقارنة ${PEPTIDE_COUNT} ببتيد | pptides`}</title>
        <meta
          name="description"
          content={`أشمل جدول مقارنة ببتيدات بالعربي — ${PEPTIDE_COUNT} ببتيد مع الجرعات المثالية، التوقيت، الدورات، الاستخدام طويل الأمد، ونصائح التجميع. دليلك الكامل لبروتوكولات الببتيدات.`}
        />
        <meta
          name="keywords"
          content={`جدول ببتيدات, peptide comparison table arabic, مقارنة ببتيدات, بروتوكولات ببتيدات, جرعات ببتيدات, ببتيدات عربي, ${PEPTIDE_COUNT} ببتيد`}
        />
        <link rel="canonical" href={`${SITE_URL}/table`} />
      </Helmet>

      {/* ━━━ STICKY SUBSCRIPTION BANNER ━━━ */}
      {!hasAccess && (
        <div className="sticky top-0 z-50 border-b border-[var(--gold,#10b981)]/40 bg-gradient-to-l from-[var(--gold,#10b981)]/15 to-[var(--gold,#10b981)]/5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-stone-800">
              <Lock className="h-4 w-4 shrink-0"  />
              <span className="font-medium">اشترك لرؤية الجرعات والبروتوكولات الكاملة</span>
            </div>
            <Link
              to="/pricing"
              className="shrink-0 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              عرض الباقات
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-12">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 1: Header + How to Use
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <header
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-extrabold leading-tight text-stone-900 md:text-4xl lg:text-5xl">
            جدول الببتيدات{' '}
            <span
              className="gold-gradient bg-clip-text text-transparent"
            >
              الشامل
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-stone-800 md:text-lg">
            دليل مقارنة سريع لجميع الببتيدات مع الجرعات والتوقيت والدورات والتجميع
          </p>

        </header>

        {/* Collapsible guide — starts CLOSED so data is visible immediately */}
        <details className="mb-6 rounded-xl border border-stone-200 bg-stone-50">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-bold text-stone-700 hover:text-stone-900">
            <BookOpen className="h-4 w-4" />
            دليل استخدام الجدول والاختصارات
          </summary>
          <div className="border-t border-stone-200 px-5 py-4 space-y-4">
            <p className="text-xs leading-relaxed text-stone-600">
              استخدم البحث أو الفئات للتصفية. اضغط على اسم أي ببتيد لصفحته الكاملة. الأعمدة: الجرعة المثالية، التوقيت، الدورة، الاستخدام طويل الأمد، ونصائح التجميع.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { label: 'SubQ', full: 'تحت الجلد' },
                { label: 'IM', full: 'عضلي' },
                { label: 'IN', full: 'بخاخ أنف' },
                { label: 'AM', full: 'صباحًا' },
                { label: 'PM', full: 'مساءً' },
                { label: 'FDA', full: 'إدارة الغذاء والدواء' },
              ].map((abbr) => (
                <span
                  key={abbr.label}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-700"
                  >
                    <span className="font-semibold text-stone-800">{abbr.label}</span>
                    {abbr.full && <span className="text-stone-800"> = {abbr.full}</span>}
                  </span>
                ))}
              </div>
          </div>
        </details>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 3: Search + Category Filters
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="mb-6 space-y-4"
        >
          <div className="relative max-w-lg">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-800" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الفئة..."
              aria-label="ابحث في الببتيدات"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 py-3 ps-10 pe-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-colors focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                activeCategory === 'all'
                  ? 'gold-gradient text-white shadow-lg'
                  : 'border border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-300 hover:text-stone-900'
              )}
            >
              الكل ({peptides.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                  activeCategory === cat.id
                    ? 'gold-gradient text-white shadow-lg'
                    : 'border border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-300 hover:text-stone-900'
                )}
              >
                {(() => { const Icon = categoryIcons[cat.id]; return Icon ? <Icon className="inline h-4 w-4" /> : null; })()} {cat.nameAr} ({cat.peptideCount})
              </button>
            ))}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 4: The Comparison Table
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="mb-12"
        >
          <div className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-100 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-xs md:text-sm" aria-label="جدول الببتيدات">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-l from-emerald-500 to-emerald-600">
                    {[
                      { key: 'cat', label: 'الفئة', sticky: true, stickyRight: '0', minW: '120px', zIndex: 21 },
                      { key: 'name', label: 'الببتيد', sticky: true, stickyRight: '120px', minW: '180px', zIndex: 20 },
                      { key: 'dosage', label: 'الجرعة المثالية', minW: '180px' },
                      { key: 'timing', label: 'التوقيت المثالي', minW: '150px' },
                      { key: 'cycle', label: 'الدورة المثالية', minW: '180px' },
                      { key: 'longterm', label: 'طويل الأمد؟', minW: '90px' },
                      { key: 'stack', label: 'نصائح التجميع', minW: '200px' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn(
                          'border-b-2 border-emerald-200 px-3 py-3.5 text-right text-xs font-bold tracking-wide',
                          col.sticky ? 'sticky z-20 bg-stone-100 text-emerald-500' : 'text-white'
                        )}
                        style={{
                          minWidth: col.minW,
                          ...(col.sticky ? { right: col.stickyRight, zIndex: col.zIndex } : {}),
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-stone-800">
                        <Search className="mx-auto mb-2 h-8 w-8 text-stone-500" />
                        لا توجد نتائج مطابقة
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, i) => {
                      const catColor = categoryColors[p.category] ?? categoryColors.metabolic;
                      const catName = categories.find((c) => c.id === p.category)?.nameAr ?? p.category;
                      const longTerm = isLongTerm(p.cycleAr);
                      const shouldBlur = !hasAccess && !p.isFree;

                      return (
                        <tr
                          key={p.id}
                          className={cn("border-b border-white/[0.05] transition-colors hover:bg-stone-100", i % 2 === 0 ? "bg-stone-50" : "bg-white")}
                        >
                          {/* Category — sticky */}
                          <td
                            className={cn('sticky right-0 z-10 px-3 py-3', i % 2 === 0 ? 'bg-stone-50' : 'bg-white')}
                          >
                            <span
                              className={cn(
                                'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold md:text-xs',
                                catColor.badge
                              )}
                            >
                              {catName}
                            </span>
                          </td>

                          {/* Peptide name — sticky */}
                          <td
                            className={cn('sticky right-[120px] z-10 px-3 py-3', i % 2 === 0 ? 'bg-stone-50' : 'bg-white')}
                          >
                            <Link to={`/peptide/${p.id}`} className="group block">
                              <span className="block font-bold text-stone-900 transition-colors group-hover:text-emerald-600 group-hover:underline">
                                {p.nameAr}
                              </span>
                              <span className="block text-[10px] text-stone-800 md:text-xs">{p.nameEn}</span>
                            </Link>
                          </td>

                          {/* Dosage — blurred for non-subscribers */}
                          <td className="px-3 py-3">
                            <span
                              className={cn("block leading-relaxed text-stone-800", shouldBlur && blurClass)}
                              aria-hidden={shouldBlur || undefined}
                            >
                              {p.dosageAr}
                            </span>
                          </td>

                          {/* Timing — blurred */}
                          <td className="px-3 py-3">
                            <span
                              className={cn("block leading-relaxed text-stone-800", shouldBlur && blurClass)}
                              aria-hidden={shouldBlur || undefined}
                            >
                              {p.timingAr}
                            </span>
                          </td>

                          {/* Cycle — blurred */}
                          <td className="px-3 py-3">
                            <span
                              className={cn("block leading-relaxed text-stone-800", shouldBlur && blurClass)}
                              aria-hidden={shouldBlur || undefined}
                            >
                              {p.cycleAr}
                            </span>
                          </td>

                          {/* Long-term? */}
                          <td className="px-3 py-3 text-center">
                            <span
                              className={cn(
                                'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold md:text-xs',
                                longTerm
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800',
                                shouldBlur && blurClass
                              )}
                              aria-hidden={shouldBlur || undefined}
                            >
                              {longTerm ? 'نعم' : 'تحتاج دورات'}
                            </span>
                          </td>

                          {/* Stacking — blurred */}
                          <td className="px-3 py-3">
                            <span
                              className={cn("block leading-relaxed text-stone-800", shouldBlur && blurClass)}
                              aria-hidden={shouldBlur || undefined}
                            >
                              {p.stackAr}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-center text-xs text-stone-700">
            عرض {filtered.length} ببتيد من أصل {peptides.length}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 5: Top Synergistic Stacks
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="mb-12"
        >
          <div className="mb-6 flex items-center gap-3">
            <Layers className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-stone-900 md:text-2xl">
              البروتوكولات المُركّبة{' '}
              <span className="text-stone-800 font-normal text-base">(Synergistic Stacks)</span>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stacks.map((stack) => {
              const stackPeptides = stack.peptideIds
                .map((id) => peptides.find((p) => p.id === id))
                .filter(Boolean);

              return (
                <div
                  key={stack.id}
                  className="group rounded-xl border border-stone-300 bg-stone-50 p-5 transition-all hover:border-emerald-300 hover:bg-stone-100"
                >
                  <h3 className="mb-1 text-base font-bold text-stone-900">{stack.nameAr}</h3>
                  <p className="mb-3 text-xs text-stone-800">{stack.nameEn}</p>

                  {/* Peptides involved */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {stackPeptides.map((sp) =>
                      sp ? (
                        <Link
                          key={sp.id}
                          to={`/peptide/${sp.id}`}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors hover:opacity-80',
                            categoryColors[sp.category]?.badge
                          )}
                        >
                          {sp.nameAr}
                        </Link>
                      ) : null
                    )}
                  </div>

                  {/* Goal */}
                  <div className="mb-3">
                    <span className="text-[10px] font-bold tracking-wider text-stone-700">الهدف</span>
                    <p
                      className={cn("mt-1 text-xs leading-relaxed text-stone-800", !hasAccess && blurClass)}
                      aria-hidden={!hasAccess || undefined}
                    >
                      {stack.goalAr}
                    </p>
                  </div>

                  {/* Protocol preview */}
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-stone-700">البروتوكول</span>
                    <p
                      className={cn("mt-1 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-stone-800", !hasAccess && blurClass)}
                      aria-hidden={!hasAccess || undefined}
                    >
                      {stack.protocolAr}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 6: Category Breakdowns
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="mb-12"
        >
          <div className="mb-6 flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-stone-900 md:text-2xl">تفصيل الفئات</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const catPeptides = peptidesByCategory[cat.id] ?? [];
              const catColor = categoryColors[cat.id];
              const stackingNotes = catPeptides
                .filter((p) => p.stackAr)
                .slice(0, 3)
                .map((p) => ({ name: p.nameAr, note: p.stackAr }));

              return (
                <div
                  key={cat.id}
                  className={cn(
                    'rounded-xl border bg-stone-50 p-5',
                    catColor?.border ?? 'border-stone-300'
                  )}
                >
                  <div className="mb-3 flex items-center gap-2">
                    {(() => { const Icon = categoryIcons[cat.id]; return Icon ? <Icon className="h-5 w-5 text-emerald-600" /> : null; })()}
                    <h3 className="text-base font-bold text-stone-900">{cat.nameAr}</h3>
                    <span className="mr-auto rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-800">
                      {cat.peptideCount} ببتيد
                    </span>
                  </div>

                  <p className="mb-4 text-xs leading-relaxed text-stone-800">{cat.descriptionAr}</p>

                  {/* Peptide list */}
                  <div className="mb-4">
                    <span className="mb-2 block text-[10px] font-bold tracking-wider text-stone-700">
                      الببتيدات
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {catPeptides.map((p) => (
                        <Link
                          key={p.id}
                          to={`/peptide/${p.id}`}
                          className="rounded-md border border-stone-300 bg-white/[0.05] px-2 py-1 text-[10px] font-medium text-stone-800 transition-colors hover:border-emerald-300 hover:text-stone-900"
                        >
                          {p.nameAr}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Key stacking notes */}
                  <div>
                    <span className="mb-2 block text-[10px] font-bold tracking-wider text-stone-700">
                      ملاحظات تجميع رئيسية
                    </span>
                    <ul className="space-y-1.5">
                      {stackingNotes.map((sn, idx) => (
                        <li key={idx} className="text-[10px] leading-relaxed text-stone-800">
                          <span className="font-semibold text-stone-800">{sn.name}:</span>{' '}
                          <span className={cn(!hasAccess && blurClass)} aria-hidden={!hasAccess || undefined}>
                            {sn.note.length > 100 ? sn.note.slice(0, 100) + '…' : sn.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 7: Warnings & Disclaimers
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
        >
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <h2 className="text-base font-bold text-red-400">تحذيرات وإخلاء مسؤولية</h2>
            </div>

            <div className="grid gap-3 text-xs leading-relaxed text-stone-800 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
                <h4 className="mb-1 text-xs font-bold text-stone-800">📚 تعليمي فقط</h4>
                <p>
                  جميع المعلومات في هذا الجدول لأغراض تعليمية وبحثية فقط، ولا تُعتبر وصفة طبية أو نصيحة علاجية.
                  استشر طبيبك المختص قبل استخدام أي ببتيد.
                </p>
              </div>

              <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
                <h4 className="mb-1 text-xs font-bold text-stone-800">🧬 التباين الفردي</h4>
                <p>
                  الاستجابة للببتيدات تختلف بشكل كبير بين الأفراد. الجرعات المذكورة هي نطاقات عامة وقد
                  تحتاج إلى تعديل بناءً على وزنك، صحتك، وأهدافك. ابدأ دائمًا بأقل جرعة.
                </p>
              </div>

              <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
                <h4 className="mb-1 text-xs font-bold text-stone-800">👨‍⚕️ الإشراف الطبي</h4>
                <p>
                  لا تستخدم أي ببتيد بدون إشراف طبيب مختص. تحاليل الدم الدورية ضرورية لمراقبة
                  الأمان والفعالية. أخبر طبيبك بجميع ما تستخدمه.
                </p>
              </div>

              <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
                <h4 className="mb-1 text-xs font-bold text-stone-800">✅ جودة المصدر</h4>
                <p>
                  جودة الببتيدات تتفاوت بشكل كبير بين الموردين. اطلب دائمًا شهادة تحليل (COA) من مختبر
                  طرف ثالث، وتأكد من النقاء (≥98%). المصدر غير الموثوق قد يكون خطيرًا.
                </p>
              </div>

              <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
                <h4 className="mb-1 text-xs font-bold text-stone-800">🔄 الدورات ضرورية</h4>
                <p>
                  معظم الببتيدات تحتاج فترات راحة بين دورات الاستخدام. الاستخدام المستمر دون راحة قد يُقلل
                  الفعالية أو يزيد المخاطر. التزم بدورات الاستخدام والراحة المذكورة.
                </p>
              </div>

              <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
                <h4 className="mb-1 text-xs font-bold text-stone-800">⚖️ الوضع القانوني</h4>
                <p>
                  الوضع القانوني للببتيدات يختلف حسب البلد. بعضها معتمد من FDA وبعضها بحثي فقط.
                  تحقق من القوانين المحلية في بلدك قبل الشراء أو الاستخدام.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">اخترت ببتيداتك؟</p>
          <p className="mt-1 text-sm text-stone-600">تحقق من التعارضات بينها واحسب الجرعة الدقيقة</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/interactions" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">فحص التعارضات</Link>
            <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">حاسبة الجرعات</Link>
            <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">اسأل المدرب الذكي</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
