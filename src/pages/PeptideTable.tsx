import { useState, useMemo, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Lock, BookOpen, AlertTriangle, FlaskConical, Layers,
  ArrowUpDown, ArrowUp, ArrowDown, Download, Columns3, ChevronDown,
  X, GitCompareArrows,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides, categories, stacks } from '@/data/peptides';
import type { Peptide } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { categoryIcons } from '@/lib/peptide-labels';

// ── Colour maps ────────────────────────────────────────────

const categoryColors: Record<string, { badge: string; border: string }> = {
  metabolic: { badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700', border: 'border-orange-200 dark:border-orange-800' },
  recovery: { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700', border: 'border-blue-200 dark:border-blue-800' },
  hormonal: { badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700', border: 'border-purple-200 dark:border-purple-800' },
  brain: { badge: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-700', border: 'border-pink-200 dark:border-pink-800' },
  longevity: { badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', border: 'border-emerald-200 dark:border-emerald-800' },
  'skin-gut': { badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700', border: 'border-teal-200 dark:border-teal-800' },
};

const routeLabels: Record<string, string> = {
  subq: 'تحت الجلد (SubQ)',
  im: 'عضلي (IM)',
  oral: 'فموي (Oral)',
  nasal: 'أنفي (Nasal)',
  topical: 'موضعي (Topical)',
};

// ── Helpers ────────────────────────────────────────────────

function isLongTerm(cycleAr: string): boolean {
  return cycleAr.includes('مستمر');
}

/** Derive route label from route field or administrationAr text */
function getRouteLabel(p: Peptide): string {
  if (p.route) return routeLabels[p.route] ?? p.route;
  const a = p.administrationAr.toLowerCase();
  if (a.includes('sub-q') || a.includes('تحت الجلد')) return routeLabels.subq;
  if (a.includes('عضلي') || a.includes('im')) return routeLabels.im;
  if (a.includes('فموي') || a.includes('oral') || a.includes('كبسول')) return routeLabels.oral;
  if (a.includes('أنف') || a.includes('nasal') || a.includes('بخاخ')) return routeLabels.nasal;
  if (a.includes('موضعي') || a.includes('topical')) return routeLabels.topical;
  return 'أخرى';
}

function getRouteKey(p: Peptide): string {
  if (p.route) return p.route;
  const a = p.administrationAr.toLowerCase();
  if (a.includes('sub-q') || a.includes('تحت الجلد')) return 'subq';
  if (a.includes('عضلي') || a.includes('im')) return 'im';
  if (a.includes('فموي') || a.includes('oral') || a.includes('كبسول')) return 'oral';
  if (a.includes('أنف') || a.includes('nasal') || a.includes('بخاخ')) return 'nasal';
  if (a.includes('موضعي') || a.includes('topical')) return 'topical';
  return 'other';
}

// ── Column definitions ─────────────────────────────────────

type ColumnKey = 'category' | 'name' | 'route' | 'dosage' | 'timing' | 'cycle' | 'longterm' | 'stack';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  minW: string;
  sortable: boolean;
  blurrable: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'category', label: 'الفئة', minW: '120px', sortable: true, blurrable: false },
  { key: 'name', label: 'الببتيد', minW: '180px', sortable: true, blurrable: false },
  { key: 'route', label: 'طريقة الإعطاء', minW: '130px', sortable: true, blurrable: false },
  { key: 'dosage', label: 'الجرعة المثالية', minW: '180px', sortable: false, blurrable: true },
  { key: 'timing', label: 'التوقيت المثالي', minW: '150px', sortable: false, blurrable: true },
  { key: 'cycle', label: 'الدورة المثالية', minW: '180px', sortable: true, blurrable: true },
  { key: 'longterm', label: 'طويل الأمد؟', minW: '90px', sortable: false, blurrable: true },
  { key: 'stack', label: 'نصائح التجميع', minW: '200px', sortable: false, blurrable: true },
];

const LS_KEY = 'pptides-table-columns';

function loadVisibleCols(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnKey[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return ALL_COLUMNS.map((c) => c.key);
}

// ── Sort helpers ───────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function comparePeptides(a: Peptide, b: Peptide, key: ColumnKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case 'name':
      cmp = a.nameAr.localeCompare(b.nameAr, 'ar');
      break;
    case 'category': {
      const catA = categories.find((c) => c.id === a.category)?.nameAr ?? '';
      const catB = categories.find((c) => c.id === b.category)?.nameAr ?? '';
      cmp = catA.localeCompare(catB, 'ar');
      break;
    }
    case 'route':
      cmp = getRouteLabel(a).localeCompare(getRouteLabel(b), 'ar');
      break;
    case 'cycle':
      cmp = a.cycleAr.localeCompare(b.cycleAr, 'ar');
      break;
    default:
      break;
  }
  return dir === 'desc' ? -cmp : cmp;
}

// ── CSV / PDF export ──────────────────────────────────────

function exportCSV(data: Peptide[], visibleCols: ColumnKey[]) {
  const colMap: Record<ColumnKey, (p: Peptide) => string> = {
    category: (p) => categories.find((c) => c.id === p.category)?.nameAr ?? p.category,
    name: (p) => `${p.nameAr} (${p.nameEn})`,
    route: (p) => getRouteLabel(p),
    dosage: (p) => p.dosageAr,
    timing: (p) => p.timingAr,
    cycle: (p) => p.cycleAr,
    longterm: (p) => (isLongTerm(p.cycleAr) ? 'نعم' : 'تحتاج دورات'),
    stack: (p) => p.stackAr,
  };

  const headers = visibleCols.map((k) => ALL_COLUMNS.find((c) => c.key === k)!.label);
  const rows = data.map((p) => visibleCols.map((k) => `"${colMap[k](p).replace(/"/g, '""')}"`));

  const BOM = '\uFEFF';
  const csv = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'جدول-الببتيدات.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function exportAsImage(data: Peptide[], visibleCols: ColumnKey[]) {
  const html2canvas = (await import('html2canvas')).default;

  const colMap: Record<ColumnKey, (p: Peptide) => string> = {
    category: (p) => categories.find((c) => c.id === p.category)?.nameAr ?? p.category,
    name: (p) => `${p.nameAr} (${p.nameEn})`,
    route: (p) => getRouteLabel(p),
    dosage: (p) => p.dosageAr,
    timing: (p) => p.timingAr,
    cycle: (p) => p.cycleAr,
    longterm: (p) => (isLongTerm(p.cycleAr) ? 'نعم' : 'تحتاج دورات'),
    stack: (p) => p.stackAr,
  };

  const headers = visibleCols.map((k) => ALL_COLUMNS.find((c) => c.key === k)!.label);
  const rows = data.map((p) => visibleCols.map((k) => colMap[k](p)));

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;right:0;width:1200px;padding:40px;background:#fff;direction:rtl;font-family:Cairo,sans-serif;';
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="font-size:24px;color:#059669;margin:0;">جدول الببتيدات — pptides.com</h1>
      <p style="color:#78716c;font-size:14px;margin-top:8px;">${new Date().toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p style="color:#78716c;font-size:12px;">إجمالي: ${data.length} ببتيد</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#f5f5f4;border-bottom:2px solid #d6d3d1;">
          ${headers.map(h => `<th style="padding:8px;text-align:right;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr style="border-bottom:1px solid #e7e5e4;${i % 2 === 0 ? 'background:#fafaf9;' : ''}">
            ${row.map(cell => `<td style="padding:6px 8px;">${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="text-align:center;color:#a8a29e;font-size:10px;margin-top:24px;">pptides.com — تم التصدير تلقائيًا</p>
  `;
  document.body.appendChild(container);
  const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
  document.body.removeChild(container);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `جدول-الببتيدات-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Dropdown component ─────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-2 text-sm text-stone-800 dark:text-stone-200 transition-colors hover:border-emerald-400"
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-full z-50 mt-1 w-56 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 shadow-xl">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-500"
                />
                {opt.label}
              </label>
            ))}
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="mt-1 w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                مسح الكل
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function PeptideTable() {
  const { subscription, isLoading } = useAuth();
  const hasAccess = !isLoading && (subscription?.isProOrTrial ?? false);
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(loadVisibleCols);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showColPicker, setShowColPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Persist column visibility
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  // ── Derived data ───────────────────────────────────────
  const availableRoutes = useMemo(() => {
    const s = new Set(peptides.map(getRouteKey));
    return Array.from(s)
      .filter((r) => r in routeLabels)
      .map((r) => ({ value: r, label: routeLabels[r] }));
  }, []);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.nameAr })),
    []
  );

  const filtered = useMemo(() => {
    let result = peptides;

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }
    if (selectedRoutes.length > 0) {
      result = result.filter((p) => selectedRoutes.includes(getRouteKey(p)));
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
    if (sortKey) {
      result = [...result].sort((a, b) => comparePeptides(a, b, sortKey, sortDir));
    }
    return result;
  }, [search, selectedCategories, selectedRoutes, sortKey, sortDir]);

  const peptidesByCategory = useMemo(() => {
    const map: Record<string, typeof peptides> = {};
    for (const cat of categories) {
      map[cat.id] = peptides.filter((p) => p.category === cat.id);
    }
    return map;
  }, []);

  // ── Handlers ───────────────────────────────────────────

  const handleSort = useCallback(
    (key: ColumnKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const toggleCol = useCallback((key: ColumnKey) => {
    setVisibleCols((prev) => {
      // Always keep 'name' visible
      if (key === 'name') return prev;
      return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }, []);

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)),
    [visibleCols]
  );

  const blurClass = 'blur-[5px] select-none';

  const SortIcon = ({ col }: { col: ColumnKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // ── Active filter count for badge ──────────────────────
  const activeFilterCount = selectedCategories.length + selectedRoutes.length + (search.trim() ? 1 : 0);

  return (
    <div className="min-h-screen animate-fade-in">
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
        <meta property="og:title" content={`جدول الببتيدات الشامل | ${PEPTIDE_COUNT} ببتيد | pptides`} />
        <meta property="og:description" content={`أشمل جدول مقارنة ببتيدات بالعربي — ${PEPTIDE_COUNT} ببتيد مع الجرعات والبروتوكولات.`} />
        <meta property="og:url" content={`${SITE_URL}/table`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `جدول الببتيدات الشامل — مقارنة ${PEPTIDE_COUNT} ببتيد`,
          description: `أشمل جدول مقارنة ببتيدات بالعربي — ${PEPTIDE_COUNT} ببتيد مع الجرعات والبروتوكولات.`,
          url: `${SITE_URL}/table`,
          inLanguage: 'ar',
          isPartOf: { '@type': 'WebSite', name: 'pptides', url: SITE_URL },
        })}</script>
      </Helmet>

      {/* ━━━ STICKY SUBSCRIPTION BANNER ━━━ */}
      {!hasAccess && (
        <div className="sticky top-[64px] md:top-[72px] z-40 border-b border-[var(--gold,#10b981)]/40 bg-gradient-to-l from-[var(--gold,#10b981)]/15 to-[var(--gold,#10b981)]/5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-stone-800 dark:text-stone-200">
              <Lock className="h-4 w-4 shrink-0" />
              <span className="font-medium">اشترك لرؤية الجرعات والبروتوكولات الكاملة</span>
            </div>
            <Link
              to="/pricing"
              className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              عرض الباقات
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-24 md:px-6 md:pt-12">

        {/* ━━━ HEADER ━━━ */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold leading-tight text-stone-900 dark:text-stone-100 md:text-4xl">
            جدول الببتيدات{' '}
            <span className="primary-gradient bg-clip-text text-transparent">الشامل</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-stone-600 dark:text-stone-300 md:text-lg">
            دليل مقارنة سريع لجميع الببتيدات مع الجرعات والتوقيت والدورات والتجميع
          </p>
        </header>

        {/* ━━━ COLLAPSIBLE GUIDE ━━━ */}
        <details className="mb-6 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors hover:text-stone-900 dark:text-stone-100">
            <BookOpen className="h-4 w-4" />
            دليل استخدام الجدول والاختصارات
          </summary>
          <div className="border-t border-stone-200 dark:border-stone-600 px-5 py-4 space-y-4">
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              استخدم البحث أو الفئات للتصفية. اضغط على اسم أي ببتيد لصفحته الكاملة. اضغط رأس العمود للترتيب. حدد ببتيدات للمقارنة السريعة.
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
                  className="rounded-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-2 py-1 text-stone-700 dark:text-stone-200"
                >
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{abbr.label}</span>
                  {abbr.full && <span className="text-stone-800 dark:text-stone-200"> = {abbr.full}</span>}
                </span>
              ))}
            </div>
          </div>
        </details>

        {/* ━━━ FILTERS + TOOLBAR ━━━ */}
        <section className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم عربي أو إنجليزي..."
              aria-label="ابحث في الببتيدات"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 py-3 ps-10 pe-4 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 dark:placeholder:text-stone-400 outline-none transition-colors focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-1 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelect
              label="الفئة"
              options={categoryOptions}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
            <MultiSelect
              label="طريقة الإعطاء"
              options={availableRoutes}
              selected={selectedRoutes}
              onChange={setSelectedRoutes}
            />

            {/* Column visibility toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColPicker(!showColPicker)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-2 text-sm text-stone-800 dark:text-stone-200 transition-colors hover:border-emerald-400"
              >
                <Columns3 className="h-4 w-4" />
                الأعمدة
              </button>
              {showColPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />
                  <div className="absolute start-0 top-full z-50 mt-1 w-56 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 shadow-xl">
                    {ALL_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800',
                          col.key === 'name' && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={visibleCols.includes(col.key)}
                          onChange={() => toggleCol(col.key)}
                          disabled={col.key === 'name'}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-500"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Export buttons */}
            <button
              onClick={() => { setIsExporting(true); try { exportCSV(filtered, visibleCols); } finally { setIsExporting(false); } }}
              disabled={isExporting}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-800 dark:text-stone-200 transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              تحميل CSV
            </button>
            <button
              onClick={async () => { setIsExporting(true); try { await exportAsImage(filtered, visibleCols); } finally { setIsExporting(false); } }}
              disabled={isExporting}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-800 dark:text-stone-200 transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <ArrowUpDown className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? 'جارٍ التحميل...' : 'تحميل صورة'}
            </button>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-300">فلاتر نشطة:</span>
              {selectedCategories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  {categories.find((cat) => cat.id === c)?.nameAr}
                  <button onClick={() => setSelectedCategories((prev) => prev.filter((x) => x !== c))} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedRoutes.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
                  {routeLabels[r] ?? r}
                  <button onClick={() => setSelectedRoutes((prev) => prev.filter((x) => x !== r))} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => { setSelectedCategories([]); setSelectedRoutes([]); setSearch(''); }}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                مسح الكل
              </button>
            </div>
          )}
        </section>

        {/* ━━━ COMPARE BAR ━━━ */}
        {compareIds.length > 0 && (
          <div className="sticky top-[110px] z-30 mb-4 flex items-center gap-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 shadow-lg backdrop-blur-sm">
            <GitCompareArrows className="h-5 w-5 text-emerald-700" />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {compareIds.map((id) => {
                const p = peptides.find((x) => x.id === id);
                return p ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-200 dark:bg-emerald-800 px-3 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-100">
                    {p.nameAr}
                    <button onClick={() => toggleCompare(id)} className="hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null;
              })}
              <span className="text-xs text-stone-500 dark:text-stone-300">
                {compareIds.length < 2 ? `اختر ${2 - compareIds.length} أخرى` : ''}
                {compareIds.length >= 2 && compareIds.length < 3 ? ' (أو أضف واحد)' : ''}
              </span>
            </div>
            {compareIds.length >= 2 && (
              <Link
                to={`/compare?ids=${compareIds.join(',')}`}
                className="shrink-0 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
              >
                قارن
              </Link>
            )}
            <button
              onClick={() => setCompareIds([])}
              className="text-xs font-semibold text-stone-500 dark:text-stone-300 hover:text-red-500"
            >
              مسح
            </button>
          </div>
        )}

        {/* ━━━ THE TABLE ━━━ */}
        <section className="mb-12">
          <p className="mb-2 md:hidden">
            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 dark:bg-stone-800 px-4 py-1.5 text-sm font-medium text-stone-500 dark:text-stone-300 animate-pulse">← اسحب لمشاهدة المزيد →</span>
          </p>
          <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 shadow-2xl">
            <div className="overflow-x-auto scroll-fade">
              <table className="w-full min-w-[900px] border-collapse text-xs md:text-sm" aria-label="جدول الببتيدات">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-l from-emerald-500 to-emerald-600">
                    {/* Compare checkbox column */}
                    <th className="w-10 border-b-2 border-emerald-200 dark:border-emerald-800 px-2 py-3.5 text-center">
                      <span className="sr-only">مقارنة</span>
                    </th>
                    {visibleColumns.map((col) => {
                      const isName = col.key === 'name';
                      const isSticky = isName;
                      return (
                        <th
                          key={col.key}
                          scope="col"
                          className={cn(
                            'border-b-2 border-emerald-200 dark:border-emerald-800 px-3 py-3.5 text-start text-xs font-bold tracking-wide',
                            isSticky
                              ? 'sticky start-0 z-20 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                              : 'text-white',
                            col.sortable && 'cursor-pointer select-none hover:bg-emerald-400/30 transition-colors'
                          )}
                          style={{ minWidth: col.minW }}
                          onClick={col.sortable ? () => handleSort(col.key) : undefined}
                          role={col.sortable ? 'button' : undefined}
                          tabIndex={col.sortable ? 0 : undefined}
                          onKeyDown={col.sortable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleSort(col.key); } : undefined}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {col.label}
                            {col.sortable && <SortIcon col={col.key} />}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="px-4 py-16 text-center text-stone-800 dark:text-stone-200">
                        <Search className="mx-auto mb-2 h-8 w-8 text-stone-500 dark:text-stone-300" />
                        لا توجد نتائج — جرّب بحثًا مختلفًا أو اختر فئة أخرى
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, i) => {
                      const catColor = categoryColors[p.category] ?? categoryColors.metabolic;
                      const catName = categories.find((c) => c.id === p.category)?.nameAr ?? p.category;
                      const longTerm = isLongTerm(p.cycleAr);
                      const shouldBlur = !hasAccess && !p.isFree;
                      const isComparing = compareIds.includes(p.id);
                      const rowBg = i % 2 === 0 ? 'bg-stone-50 dark:bg-stone-900' : 'bg-white dark:bg-stone-900';

                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            'border-b border-white/[0.05] transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 cursor-pointer',
                            rowBg,
                            isComparing && 'ring-2 ring-inset ring-emerald-400 dark:ring-emerald-600'
                          )}
                          onClick={(e) => {
                            // Don't navigate if clicking checkbox or link
                            const target = e.target as HTMLElement;
                            if (target.closest('input') || target.closest('a') || target.closest('button')) return;
                            navigate(`/peptide/${p.id}`);
                          }}
                        >
                          {/* Compare checkbox */}
                          <td className={cn('px-2 py-3 text-center', rowBg)}>
                            <input
                              type="checkbox"
                              checked={isComparing}
                              onChange={() => toggleCompare(p.id)}
                              disabled={!isComparing && compareIds.length >= 3}
                              className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                              aria-label={`مقارنة ${p.nameAr}`}
                            />
                          </td>

                          {/* Dynamic columns */}
                          {visibleColumns.map((col) => {
                            const blur = col.blurrable && shouldBlur;

                            switch (col.key) {
                              case 'category':
                                return (
                                  <td key={col.key} className={cn('px-3 py-3', rowBg)}>
                                    <span className={cn('inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold', catColor.badge)}>
                                      {catName}
                                    </span>
                                  </td>
                                );

                              case 'name':
                                return (
                                  <td key={col.key} className={cn('sticky start-0 z-10 px-3 py-3 border-e border-stone-200 dark:border-stone-700', rowBg)}>
                                    <Link to={`/peptide/${p.id}`} className="group block" onClick={(e) => e.stopPropagation()}>
                                      <span className="block font-bold text-stone-900 dark:text-stone-100 transition-colors group-hover:text-emerald-700 group-hover:underline">
                                        {p.nameAr}
                                      </span>
                                      <span className="block text-xs text-stone-800 dark:text-stone-200">{p.nameEn}</span>
                                    </Link>
                                  </td>
                                );

                              case 'route':
                                return (
                                  <td key={col.key} className="px-3 py-3">
                                    <span className="block text-stone-800 dark:text-stone-200">{getRouteLabel(p)}</span>
                                  </td>
                                );

                              case 'dosage':
                                return (
                                  <td key={col.key} className="px-3 py-3">
                                    <span className={cn('block leading-relaxed text-stone-800 dark:text-stone-200', blur && blurClass)} aria-hidden={blur || undefined}>
                                      {p.dosageAr}
                                    </span>
                                  </td>
                                );

                              case 'timing':
                                return (
                                  <td key={col.key} className="px-3 py-3">
                                    <span className={cn('block leading-relaxed text-stone-800 dark:text-stone-200', blur && blurClass)} aria-hidden={blur || undefined}>
                                      {p.timingAr}
                                    </span>
                                  </td>
                                );

                              case 'cycle':
                                return (
                                  <td key={col.key} className="px-3 py-3">
                                    <span className={cn('block leading-relaxed text-stone-800 dark:text-stone-200', blur && blurClass)} aria-hidden={blur || undefined}>
                                      {p.cycleAr}
                                    </span>
                                  </td>
                                );

                              case 'longterm':
                                return (
                                  <td key={col.key} className="px-3 py-3 text-center">
                                    <span
                                      className={cn(
                                        'inline-block rounded-full px-2 py-0.5 text-xs font-bold',
                                        longTerm ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:text-amber-300',
                                        blur && blurClass
                                      )}
                                      aria-hidden={blur || undefined}
                                    >
                                      {longTerm ? 'نعم' : 'تحتاج دورات'}
                                    </span>
                                  </td>
                                );

                              case 'stack':
                                return (
                                  <td key={col.key} className="px-3 py-3">
                                    <span className={cn('block leading-relaxed text-stone-800 dark:text-stone-200', blur && blurClass)} aria-hidden={blur || undefined}>
                                      {p.stackAr}
                                    </span>
                                  </td>
                                );

                              default:
                                return null;
                            }
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-center text-xs text-stone-700 dark:text-stone-200">
            عرض {filtered.length} ببتيد من أصل {peptides.length}
          </div>
        </section>

        {/* ━━━ SYNERGISTIC STACKS ━━━ */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Layers className="h-6 w-6 text-emerald-700" />
            <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 md:text-2xl">
              البروتوكولات المُركّبة{' '}
              <span className="text-stone-800 dark:text-stone-200 font-normal text-base">(التكامل التآزري)</span>
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
                  className="group rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-5 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <h3 className="mb-1 text-base font-bold text-stone-900 dark:text-stone-100">{stack.nameAr}</h3>
                  <p className="mb-3 text-xs text-stone-800 dark:text-stone-200">{stack.nameEn}</p>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {stackPeptides.map((sp) =>
                      sp ? (
                        <Link
                          key={sp.id}
                          to={`/peptide/${sp.id}`}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors hover:opacity-80',
                            categoryColors[sp.category]?.badge
                          )}
                        >
                          {sp.nameAr}
                        </Link>
                      ) : null
                    )}
                  </div>

                  <div className="mb-3">
                    <span className="text-xs font-bold tracking-wider text-stone-700 dark:text-stone-200">الهدف</span>
                    <p
                      className={cn('mt-1 text-xs leading-relaxed text-stone-800 dark:text-stone-200', !hasAccess && blurClass)}
                      aria-hidden={!hasAccess || undefined}
                    >
                      {stack.goalAr}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold tracking-wider text-stone-700 dark:text-stone-200">البروتوكول</span>
                    <p
                      className={cn('mt-1 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-stone-800 dark:text-stone-200', !hasAccess && blurClass)}
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

        {/* ━━━ CATEGORY BREAKDOWNS ━━━ */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-emerald-700" />
            <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 md:text-2xl">تفصيل الفئات</h2>
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
                    'rounded-xl border bg-stone-50 dark:bg-stone-900 p-5',
                    catColor?.border ?? 'border-stone-200 dark:border-stone-700'
                  )}
                >
                  <div className="mb-3 flex items-center gap-2">
                    {(() => { const Icon = categoryIcons[cat.id]; return Icon ? <Icon className="h-5 w-5 text-emerald-700" /> : null; })()}
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{cat.nameAr}</h3>
                    <span className="me-auto rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {cat.peptideCount} ببتيد
                    </span>
                  </div>

                  <p className="mb-4 text-xs leading-relaxed text-stone-800 dark:text-stone-200">{cat.descriptionAr}</p>

                  <div className="mb-4">
                    <span className="mb-2 block text-xs font-bold tracking-wider text-stone-700 dark:text-stone-200">الببتيدات</span>
                    <div className="flex flex-wrap gap-1.5">
                      {catPeptides.map((p) => (
                        <Link
                          key={p.id}
                          to={`/peptide/${p.id}`}
                          className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/[0.05] px-2 py-1 text-xs font-medium text-stone-800 dark:text-stone-200 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-stone-900 dark:hover:text-stone-100"
                        >
                          {p.nameAr}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-xs font-bold tracking-wider text-stone-700 dark:text-stone-200">ملاحظات تجميع رئيسية</span>
                    <ul className="space-y-1.5">
                      {stackingNotes.map((sn, idx) => (
                        <li key={idx} className="text-xs leading-relaxed text-stone-800 dark:text-stone-200">
                          <span className="font-semibold text-stone-800 dark:text-stone-200">{sn.name}:</span>{' '}
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

        {/* ━━━ WARNINGS ━━━ */}
        <section>
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <h2 className="text-base font-bold text-red-400">تحذيرات وإخلاء مسؤولية</h2>
            </div>

            <div className="grid gap-3 text-xs leading-relaxed text-stone-800 dark:text-stone-200 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'تعليمي فقط', text: 'جميع المعلومات في هذا الجدول لأغراض تعليمية وبحثية فقط، ولا تُعتبر وصفة طبية أو نصيحة علاجية. استشر طبيبك المختص قبل استخدام أي ببتيد.' },
                { title: 'التباين الفردي', text: 'الاستجابة للببتيدات تختلف بشكل كبير بين الأفراد. الجرعات المذكورة هي نطاقات عامة وقد تحتاج إلى تعديل بناءً على وزنك، صحتك، وأهدافك. ابدأ دائمًا بأقل جرعة.' },
                { title: 'الإشراف الطبي', text: 'لا تستخدم أي ببتيد بدون إشراف طبيب مختص. تحاليل الدم الدورية ضرورية لمراقبة الأمان والفعالية. أخبر طبيبك بجميع ما تستخدمه.' },
                { title: 'جودة المصدر', text: 'جودة الببتيدات تتفاوت بشكل كبير بين الموردين. اطلب دائمًا شهادة تحليل (COA) من مختبر طرف ثالث، وتأكد من النقاء (≥98%). المصدر غير الموثوق قد يكون خطيرًا.' },
                { title: 'الدورات ضرورية', text: 'معظم الببتيدات تحتاج فترات راحة بين دورات الاستخدام. الاستخدام المستمر دون راحة قد يُقلل الفعالية أو يزيد المخاطر. التزم بدورات الاستخدام والراحة المذكورة.' },
                { title: 'الوضع القانوني', text: 'الوضع القانوني للببتيدات يختلف حسب البلد. بعضها معتمد من FDA وبعضها بحثي فقط. تحقق من القوانين المحلية في بلدك قبل الشراء أو الاستخدام.' },
              ].map((w) => (
                <div key={w.title} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-3">
                  <h4 className="mb-1 text-xs font-bold text-stone-800 dark:text-stone-200">{w.title}</h4>
                  <p>{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━ CTA ━━━ */}
        <div className="mt-10 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
          <p className="font-bold text-stone-900 dark:text-stone-100">اخترت ببتيداتك؟</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">تحقق من التعارضات بينها واحسب الجرعة الدقيقة</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/interactions" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">فحص التعارضات</Link>
            <Link to="/calculator" className="rounded-full border border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30">حاسبة الجرعات</Link>
            <Link to="/coach" className="rounded-full border border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30">اسأل المدرب الذكي</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
