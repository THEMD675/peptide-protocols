import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Search, Lock, BookOpen, AlertTriangle, FlaskConical, Layers, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides, categories, stacks } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';

const categoryColors: Record<string, { badge: string; border: string }> = {
  metabolic: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', border: 'border-orange-500/20' },
  recovery: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', border: 'border-blue-500/20' },
  hormonal: { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', border: 'border-purple-500/20' },
  brain: { badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30', border: 'border-pink-500/20' },
  longevity: { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', border: 'border-emerald-500/20' },
  'skin-gut': { badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30', border: 'border-teal-500/20' },
};

const categoryIcons: Record<string, string> = {
  metabolic: '⚡',
  recovery: '💪',
  hormonal: '🧬',
  brain: '🧠',
  longevity: '⏳',
  'skin-gut': '🛡️',
};

function isLongTerm(cycleAr: string): boolean {
  return cycleAr.includes('مستمر');
}

export default function PeptideTable() {
  const { subscription, isLoading } = useAuth();
  const hasAccess = isLoading || (subscription?.isProOrTrial ?? false);

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

  const blurStyle = { filter: 'blur(5px)', userSelect: 'none' as const, WebkitUserSelect: 'none' as const };

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>جدول الببتيدات الشامل — مقارنة 41 ببتيد بالعربي | Peptide Comparison Table Arabic</title>
        <meta
          name="description"
          content="أشمل جدول مقارنة ببتيدات بالعربي — 41 ببتيد مع الجرعات المثالية، التوقيت، الدورات، الاستخدام طويل الأمد، ونصائح التجميع. دليلك الكامل لبروتوكولات الببتيدات."
        />
        <meta
          name="keywords"
          content="جدول ببتيدات, peptide comparison table arabic, مقارنة ببتيدات, بروتوكولات ببتيدات, جرعات ببتيدات, ببتيدات عربي"
        />
        <link rel="canonical" href="https://pptides.com/table" />
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
              className="shrink-0 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, var(--gold, #10b981), #34d399)' }}
            >
              عرض الباقات
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-12 lg:py-16">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 1: Header + How to Use
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <header
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-extrabold leading-tight text-stone-900 md:text-4xl lg:text-5xl">
            جدول الببتيدات{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--gold, #10b981), #34d399)' }}
            >
              الشامل
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-stone-800 md:text-lg">
            دليل مقارنة سريع لجميع الببتيدات مع الجرعات والتوقيت والدورات والتجميع
          </p>

          <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-stone-300 bg-stone-50 p-5 text-right">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 shrink-0"  />
              <h2 className="text-base font-bold text-stone-900">كيف تستخدم هذا الجدول</h2>
            </div>
            <p className="text-sm leading-relaxed text-stone-800">
              هذا الجدول يُلخّص أهم المعلومات العملية لكل ببتيد في مكان واحد. استخدم خانة البحث أو أزرار الفئات للتصفية.
              اضغط على اسم أي ببتيد للانتقال لصفحته التفصيلية الكاملة. الأعمدة مُصمّمة لتعطيك نظرة سريعة على الجرعة المثالية،
              أفضل توقيت، بروتوكول الدورة، وإمكانية الاستخدام طويل الأمد، مع نصائح التجميع مع ببتيدات أخرى.
            </p>
          </div>
        </header>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           SECTION 2: Legend / Abbreviations
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="mb-10"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Column Definitions */}
            <div className="rounded-xl border border-stone-300 bg-stone-50 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
                <Info className="h-4 w-4"  />
                تعريف الأعمدة
              </h3>
              <dl className="space-y-2 text-xs text-stone-800">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-stone-800">الجرعة المثالية:</dt>
                  <dd>النطاق المحافظ المبني على البيانات العملية</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-stone-800">التوقيت المثالي:</dt>
                  <dd>أفضل أوقات الاستخدام خلال اليوم</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-stone-800">الدورة المثالية:</dt>
                  <dd>بروتوكول الاستخدام والراحة</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-stone-800">طويل الأمد؟:</dt>
                  <dd>هل الاستخدام المستمر مدروس وآمن</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-stone-800">نصائح التجميع:</dt>
                  <dd>ببتيدات متآزرة أو تحذيرات</dd>
                </div>
              </dl>
            </div>

            {/* Abbreviations */}
            <div className="rounded-xl border border-stone-300 bg-stone-50 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
                <FlaskConical className="h-4 w-4"  />
                الاختصارات المستخدمة
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { label: 'SubQ', full: 'تحت الجلد' },
                  { label: 'IM', full: 'عضلي' },
                  { label: 'IN', full: 'بخاخ أنف' },
                  { label: 'AM', full: 'صباحًا' },
                  { label: 'PM', full: 'مساءً' },
                  { label: 'قبل التمرين', full: '' },
                  { label: 'بعد التمرين', full: '' },
                  { label: 'FDA', full: 'إدارة الغذاء والدواء' },
                ].map((abbr) => (
                  <span
                    key={abbr.label}
                    className="rounded-md border border-stone-300 bg-white/[0.05] px-2 py-1 text-stone-800"
                  >
                    <span className="font-semibold text-stone-800">{abbr.label}</span>
                    {abbr.full && <span className="text-stone-800"> = {abbr.full}</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

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
              className="w-full rounded-xl border border-stone-300 bg-stone-50 py-3 pr-10 pl-4 text-sm text-stone-900 placeholder-white/30 outline-none transition-colors focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                activeCategory === 'all'
                  ? 'text-white shadow-lg'
                  : 'border border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-300 hover:text-stone-900'
              )}
              style={activeCategory === 'all' ? { background: 'linear-gradient(135deg, var(--gold, #10b981), #34d399)' } : undefined}
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
                    ? 'text-white shadow-lg'
                    : 'border border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-300 hover:text-stone-900'
                )}
                style={activeCategory === cat.id ? { background: 'linear-gradient(135deg, var(--gold, #10b981), #34d399)' } : undefined}
              >
                {categoryIcons[cat.id]} {cat.nameAr} ({cat.peptideCount})
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
              <table className="w-full min-w-[1100px] border-collapse text-xs md:text-sm">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
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
                        className={cn(
                          'border-b-2 border-emerald-200 px-3 py-3.5 text-right text-xs font-bold tracking-wide',
                          col.sticky && 'sticky z-20'
                        )}
                        style={{
                          color: col.sticky ? '#10b981' : '#ffffff',
                          minWidth: col.minW,
                          ...(col.sticky ? { right: col.stickyRight, zIndex: col.zIndex, background: '#f5f5f4' } : {}),
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
                      const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent';

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-white/[0.05] transition-colors hover:bg-stone-100"
                          style={{ background: rowBg }}
                        >
                          {/* Category — sticky */}
                          <td
                            className="sticky z-10 px-3 py-3"
                            style={{ right: '0', background: i % 2 === 0 ? '#fafaf9' : '#ffffff' }}
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
                            className="sticky z-10 px-3 py-3"
                            style={{ right: '120px', background: i % 2 === 0 ? '#fafaf9' : '#ffffff' }}
                          >
                            <Link to={`/peptide/${p.id}`} className="group block">
                              <span className="block font-bold text-stone-900 transition-colors group-hover:text-emerald-600">
                                {p.nameAr}
                              </span>
                              <span className="block text-[10px] text-stone-800 md:text-xs">{p.nameEn}</span>
                            </Link>
                          </td>

                          {/* Dosage — blurred for non-subscribers */}
                          <td className="px-3 py-3">
                            <span
                              className="block leading-relaxed text-stone-800"
                              style={shouldBlur ? blurStyle : undefined}
                            >
                              {p.dosageAr}
                            </span>
                          </td>

                          {/* Timing — blurred */}
                          <td className="px-3 py-3">
                            <span
                              className="block leading-relaxed text-stone-800"
                              style={shouldBlur ? blurStyle : undefined}
                            >
                              {p.timingAr}
                            </span>
                          </td>

                          {/* Cycle — blurred */}
                          <td className="px-3 py-3">
                            <span
                              className="block leading-relaxed text-stone-800"
                              style={shouldBlur ? blurStyle : undefined}
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
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              )}
                              style={shouldBlur ? blurStyle : undefined}
                            >
                              {longTerm ? 'نعم' : 'تحتاج دورات'}
                            </span>
                          </td>

                          {/* Stacking — blurred */}
                          <td className="px-3 py-3">
                            <span
                              className="block leading-relaxed text-stone-800"
                              style={shouldBlur ? blurStyle : undefined}
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
            <Layers className="h-6 w-6"  />
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700">الهدف</span>
                    <p
                      className="mt-1 text-xs leading-relaxed text-stone-800"
                      style={!hasAccess ? blurStyle : undefined}
                    >
                      {stack.goalAr}
                    </p>
                  </div>

                  {/* Protocol preview */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700">البروتوكول</span>
                    <p
                      className="mt-1 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-stone-800"
                      style={!hasAccess ? blurStyle : undefined}
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
            <FlaskConical className="h-6 w-6"  />
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
                    <span className="text-xl">{categoryIcons[cat.id]}</span>
                    <h3 className="text-base font-bold text-stone-900">{cat.nameAr}</h3>
                    <span className="mr-auto rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-800">
                      {cat.peptideCount} ببتيد
                    </span>
                  </div>

                  <p className="mb-4 text-xs leading-relaxed text-stone-800">{cat.descriptionAr}</p>

                  {/* Peptide list */}
                  <div className="mb-4">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-stone-700">
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
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-stone-700">
                      ملاحظات تجميع رئيسية
                    </span>
                    <ul className="space-y-1.5">
                      {stackingNotes.map((sn, idx) => (
                        <li key={idx} className="text-[10px] leading-relaxed text-stone-800">
                          <span className="font-semibold text-stone-800">{sn.name}:</span>{' '}
                          <span style={!hasAccess ? blurStyle : undefined}>
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
      </div>
    </div>
  );
}
