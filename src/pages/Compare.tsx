import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeftRight,
  Share2,
  Check,
  ChevronDown,
  X,
  FlaskConical,
  BookOpen,
  Trash2,
  SlidersHorizontal,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { peptides, type Peptide } from '@/data/peptides';
import { categoryLabels, evidenceLabels } from '@/lib/peptide-labels';
import { SITE_URL } from '@/lib/constants';

const ROUTE_LABELS: Record<string, string> = {
  subq: 'تحت الجلد',
  im: 'عضلي',
  nasal: 'أنفي',
  oral: 'فموي',
  topical: 'موضعي',
};

interface CompareRow {
  label: string;
  get: (p: Peptide) => string;
  key: string;
}

const COMPARE_ROWS: CompareRow[] = [
  { key: 'name', label: 'الاسم', get: (p) => `${p.nameAr} (${p.nameEn})` },
  { key: 'category', label: 'التصنيف', get: (p) => categoryLabels[p.category] ?? p.category },
  { key: 'evidence', label: 'مستوى الأدلة', get: (p) => evidenceLabels[p.evidenceLevel] ?? p.evidenceLevel },
  { key: 'benefits', label: 'الفوائد الرئيسية', get: (p) => p.summaryAr.split('.').slice(0, 2).join('.') + '.' },
  { key: 'dosage', label: 'نطاق الجرعة', get: (p) => p.dosageAr },
  {
    key: 'administration',
    label: 'طريقة الإعطاء',
    get: (p) =>
      p.route ? ROUTE_LABELS[p.route] ?? p.administrationAr.split('.')[0] : p.administrationAr.split('.')[0],
  },
  { key: 'cycle', label: 'مدة الدورة', get: (p) => p.cycleAr },
  { key: 'sideEffects', label: 'الأعراض الجانبية', get: (p) => p.sideEffectsAr },
  { key: 'cost', label: 'نطاق السعر', get: (p) => p.costEstimate ?? '—' },
  { key: 'pubmed', label: 'مراجع PubMed', get: (p) => (p.pubmedIds ? `${p.pubmedIds.length} مرجع` : 'لا يوجد') },
  {
    key: 'difficulty',
    label: 'المستوى',
    get: (p) =>
      p.difficulty === 'beginner'
        ? 'مبتدئ 🟢'
        : p.difficulty === 'intermediate'
          ? 'متوسط 🟡'
          : p.difficulty === 'advanced'
            ? 'متقدم 🔴'
            : '—',
  },
  {
    key: 'aminoAcids',
    label: 'التركيب',
    get: (p) => {
      // Extract just the amino acid count, not the full paragraph
      const match = p.aminoAcids.match(/\d+\s+حمض/);
      return match ? match[0] + 'ًا أمينيًا' : p.aminoAcids.split('—')[0].trim();
    },
  },
];

const POPULAR_COMPARISONS = [
  { p1: 'semaglutide', p2: 'tirzepatide', label: 'سيماغلوتايد vs تيرزيباتايد', tag: 'إنقاص الوزن' },
  { p1: 'bpc-157', p2: 'tb-500', label: 'BPC-157 vs TB-500', tag: 'التعافي' },
  { p1: 'cjc-1295', p2: 'sermorelin', label: 'CJC-1295 vs سيرموريلين', tag: 'النمو' },
  { p1: 'kisspeptin-10', p2: 'pt-141', label: 'كيسبيبتين vs PT-141', tag: 'الجنسية' },
  { p1: 'epithalon', p2: 'ghk-cu', label: 'إبيتالون vs GHK-Cu', tag: 'إطالة العمر' },
  { p1: 'semax', p2: 'selank', label: 'سيماكس vs سيلانك', tag: 'الدماغ' },
];

// ─── Expandable Cell ─────────────────────────────────────────
function ExpandableCell({ text, isDiff }: { text: string; isDiff: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 80;

  return (
    <div className="text-xs leading-relaxed">
      <span className={cn(!expanded && isLong && 'line-clamp-3')}>{text}</span>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-1 block text-[10px] font-bold underline-offset-2 hover:underline transition-colors',
            isDiff ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500',
          )}
        >
          {expanded ? 'أقل ▲' : 'المزيد ▼'}
        </button>
      )}
    </div>
  );
}

// ─── Peptide Selector ─────────────────────────────────────────
function PeptideSelector({
  label,
  value,
  onChange,
  exclude,
  optional,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  exclude: string[];
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = peptides.find((p) => p.id === value);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return peptides.filter(
      (p) => !exclude.includes(p.id) && (p.nameAr.includes(search) || p.nameEn.toLowerCase().includes(q)),
    );
  }, [search, exclude]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-xs font-bold text-stone-500 dark:text-stone-300">{label}</p>
        {optional && (
          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400 dark:text-stone-500">
            اختياري
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm transition-colors',
          value
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-bold'
            : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-500',
        )}
      >
        <span className="truncate">{selected ? `${selected.nameAr} — ${selected.nameEn}` : 'اختر ببتيدًا...'}</span>
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setOpen(false);
            }}
            className="shrink-0 rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors"
            aria-label="إزالة"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-xl dark:shadow-stone-900/40 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم العربي أو الإنجليزي..."
              aria-label="البحث عن ببتيد للمقارنة"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-1">
            <p className="text-[10px] text-stone-400">{filtered.length} ببتيد متاح</p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-center text-xs text-stone-500 dark:text-stone-300">لا توجد نتائج</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-stone-800"
                >
                  <span className="font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">{p.nameEn}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [canScrollTable, setCanScrollTable] = useState(false);

  const [ids, setIds] = useState<[string, string, string]>(() => {
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const parts = idsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''] as [string, string, string];
    }
    return [
      searchParams.get('p1') ?? '',
      searchParams.get('p2') ?? '',
      searchParams.get('p3') ?? '',
    ] as [string, string, string];
  });

  // Sync URL params when ids change
  useEffect(() => {
    const params = new URLSearchParams();
    if (ids[0]) params.set('p1', ids[0]);
    if (ids[1]) params.set('p2', ids[1]);
    if (ids[2]) params.set('p3', ids[2]);
    setSearchParams(params, { replace: true });
  }, [ids, setSearchParams]);

  // Detect horizontal scrollability of table
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const check = () => setCanScrollTable(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedPeptides = useMemo(
    () => ids.map((id) => peptides.find((p) => p.id === id)).filter((p): p is Peptide => p != null),
    [ids],
  );

  const selectedCount = ids.filter(Boolean).length;

  const setId = (index: number, value: string) => {
    setIds((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
  };

  const clearAll = () => {
    setIds(['', '', '']);
    setShowDiffsOnly(false);
  };

  const excludeFor = (index: number) => ids.filter((_, i) => i !== index && ids[i]);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    ids.forEach((id, i) => {
      if (id) params.set(`p${i + 1}`, id);
    });
    return `${SITE_URL}/compare?${params.toString()}`;
  }, [ids]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('تم نسخ رابط المقارنة ✓', { description: 'شاركه مع أي شخص ليرى نفس المقارنة' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('فشل نسخ الرابط');
    }
  };

  const hasDifference = (row: CompareRow) => {
    if (selectedPeptides.length < 2) return false;
    const values = selectedPeptides.map((p) => row.get(p));
    return new Set(values).size > 1;
  };

  const diffCount = useMemo(
    () => COMPARE_ROWS.filter((r) => hasDifference(r)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPeptides],
  );

  const visibleRows = showDiffsOnly ? COMPARE_ROWS.filter((r) => hasDifference(r)) : COMPARE_ROWS;

  const hasTable = selectedPeptides.length >= 2;

  return (
    <div dir="rtl" className="mx-auto max-w-5xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
      <Helmet>
        <title>مقارنة الببتيدات | pptides</title>
        <meta
          name="description"
          content="قارن بين الببتيدات جنبًا إلى جنب — الجرعات، الفوائد، الأعراض الجانبية، والأسعار"
        />
        <meta property="og:title" content="مقارنة الببتيدات | pptides" />
        <meta
          property="og:description"
          content="قارن بين الببتيدات جنبًا إلى جنب — الجرعات، الفوائد، الأعراض الجانبية، والأسعار"
        />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="مقارنة الببتيدات | pptides" />
        <meta name="twitter:description" content="قارن بين الببتيدات جنبًا إلى جنب — الجرعات والفوائد والأعراض" />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
      </Helmet>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
          <ArrowLeftRight className="h-7 w-7 text-emerald-700" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">مقارنة الببتيدات</h1>
        <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
          اختر 2 أو 3 ببتيدات لمقارنتها جنبًا إلى جنب في 12 معيارًا
        </p>
      </div>

      {/* Selectors + actions row */}
      <div className="mb-2 flex items-center justify-between">
        {/* Selection progress */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full transition-colors duration-300',
                ids[i] ? 'bg-emerald-500' : i < 2 ? 'bg-stone-300 dark:bg-stone-600' : 'bg-stone-200 dark:bg-stone-700',
              )}
            />
          ))}
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {selectedCount === 0
              ? 'اختر ببتيدين على الأقل'
              : selectedCount === 1
                ? 'اختر ببتيدًا آخر للمقارنة'
                : `${selectedCount} ببتيدات محددة`}
          </span>
        </div>

        {/* Clear all */}
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            مسح الكل
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <PeptideSelector
          label="الببتيد الأول"
          value={ids[0]}
          onChange={(v) => setId(0, v)}
          exclude={excludeFor(0)}
        />
        <PeptideSelector
          label="الببتيد الثاني"
          value={ids[1]}
          onChange={(v) => setId(1, v)}
          exclude={excludeFor(1)}
        />
        <PeptideSelector
          label="الببتيد الثالث"
          value={ids[2]}
          onChange={(v) => setId(2, v)}
          exclude={excludeFor(2)}
          optional
        />
      </div>

      {/* Comparison Table */}
      {hasTable ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Table toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Diffs-only toggle */}
            <button
              type="button"
              onClick={() => setShowDiffsOnly((v) => !v)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-colors',
                showDiffsOnly
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  : 'border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showDiffsOnly ? `إظهار الكل (${COMPARE_ROWS.length})` : `الاختلافات فقط (${diffCount})`}
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'تم النسخ!' : 'مشاركة المقارنة'}
            </button>
          </div>

          {/* Scroll hint for mobile */}
          {canScrollTable && (
            <div className="mb-2 flex items-center justify-end gap-1 text-[11px] text-stone-400 dark:text-stone-500 sm:hidden">
              <ChevronLeft className="h-3.5 w-3.5" />
              اسحب يسارًا للمزيد
            </div>
          )}

          {/* Table */}
          <div
            ref={tableRef}
            className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600 shadow-sm dark:shadow-stone-900/30"
          >
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                  {/* Sticky criterion header */}
                  <th
                    scope="col"
                    className="sticky start-0 z-10 bg-stone-50 dark:bg-stone-900 px-4 py-4 text-start text-xs font-bold text-stone-500 dark:text-stone-300 w-[130px] shadow-[1px_0_0_0_rgb(0_0_0_/_0.06)] dark:shadow-[1px_0_0_0_rgb(255_255_255_/_0.04)]"
                  >
                    المعيار
                  </th>
                  {selectedPeptides.map((p) => (
                    <th key={p.id} scope="col" className="px-4 py-4 text-start min-w-[180px]">
                      <Link to={`/peptide/${p.id}`} className="group">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                            <FlaskConical className="h-4 w-4 text-emerald-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors">
                              {p.nameAr}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-300">{p.nameEn}</p>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2 flex gap-3">
                        <Link
                          to={`/peptide/${p.id}`}
                          className="text-[10px] font-semibold text-emerald-700 hover:underline"
                        >
                          البروتوكول الكامل
                        </Link>
                        <Link
                          to={`/calculator?preset=${encodeURIComponent(p.nameEn)}`}
                          className="text-[10px] font-semibold text-stone-500 dark:text-stone-300 hover:text-emerald-700 hover:underline"
                        >
                          احسب الجرعة
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && showDiffsOnly ? (
                  <tr>
                    <td
                      colSpan={selectedPeptides.length + 1}
                      className="px-6 py-10 text-center text-sm text-stone-500 dark:text-stone-400"
                    >
                      <Check className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                      هذه الببتيدات متطابقة في جميع المعايير المتاحة
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, i) => {
                    const isDiff = hasDifference(row);
                    return (
                      <tr
                        key={row.key}
                        className={cn(
                          'border-b border-stone-100 dark:border-stone-800 transition-colors',
                          isDiff
                            ? 'bg-amber-50/70 dark:bg-amber-900/10'
                            : i % 2 === 0
                              ? 'bg-white dark:bg-stone-900'
                              : 'bg-stone-50/50 dark:bg-stone-900/30',
                        )}
                      >
                        {/* Sticky criterion column */}
                        <th
                          scope="row"
                          className={cn(
                            'sticky start-0 z-10 px-4 py-3.5 text-xs font-bold text-start shadow-[1px_0_0_0_rgb(0_0_0_/_0.06)] dark:shadow-[1px_0_0_0_rgb(255_255_255_/_0.04)]',
                            isDiff
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                              : i % 2 === 0
                                ? 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200'
                                : 'bg-stone-50/50 dark:bg-stone-900/30 text-stone-700 dark:text-stone-200',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {isDiff && (
                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            )}
                            {row.label}
                          </div>
                        </th>
                        {selectedPeptides.map((p) => (
                          <td
                            key={p.id}
                            className={cn(
                              'px-4 py-3.5',
                              isDiff ? 'text-amber-900 dark:text-amber-200' : 'text-stone-800 dark:text-stone-200',
                            )}
                          >
                            <ExpandableCell text={row.get(p)} isDiff={isDiff} />
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Diff legend */}
          {diffCount > 0 && (
            <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500 text-end">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                الصفوف المضاءة تعني اختلافًا بين الببتيدات — {diffCount} من {COMPARE_ROWS.length} معيارًا مختلف
              </span>
            </p>
          )}

          {/* Action bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/interactions?p1=${ids[0]}&p2=${ids[1]}`}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              فحص التعارضات بين هذه الببتيدات
            </Link>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/50 px-6 py-12 text-center">
          <ArrowLeftRight className="mx-auto mb-4 h-10 w-10 text-stone-300 dark:text-stone-500" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-1">
            {selectedCount === 0 ? 'ابدأ بالمقارنة' : 'اختر ببتيدًا آخر'}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
            {selectedCount === 0
              ? 'اختر ببتيدين من القوائم أعلاه وستظهر المقارنة تلقائيًا'
              : 'اختر ببتيدًا ثانيًا لبدء المقارنة الجنبية'}
          </p>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
            <p className="text-xs font-bold text-stone-400 dark:text-stone-500 shrink-0">أو ابدأ بمقارنة شائعة</p>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-start">
            {POPULAR_COMPARISONS.slice(0, 4).map(({ p1, p2, label, tag }) => (
              <Link
                key={`${p1}-${p2}`}
                to={`/compare?p1=${p1}&p2=${p2}`}
                className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-emerald-700" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{label}</p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500">{tag}</p>
                </div>
              </Link>
            ))}
          </div>

          <Link
            to="/library"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            تصفّح المكتبة
          </Link>
        </div>
      )}

      {/* Popular comparisons section */}
      <div className="mt-12">
        <h2 className="mb-1 text-xl font-bold text-stone-900 dark:text-stone-100">مقارنات شائعة</h2>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">انقر لتحميل المقارنة مباشرة</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_COMPARISONS.map(({ p1, p2, label, tag }) => (
            <Link
              key={`${p1}-${p2}`}
              to={`/compare?p1=${p1}&p2=${p2}`}
              className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md hover:-translate-y-0.5"
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800 dark:text-stone-200">{label}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{tag}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
