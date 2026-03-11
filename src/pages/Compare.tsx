import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeftRight, Share2, Check, ChevronDown, X, FlaskConical, BookOpen } from 'lucide-react';
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
  { key: 'administration', label: 'طريقة الإعطاء', get: (p) => p.route ? ROUTE_LABELS[p.route] ?? p.administrationAr.split('.')[0] : p.administrationAr.split('.')[0] },
  { key: 'cycle', label: 'مدة الدورة', get: (p) => p.cycleAr },
  { key: 'sideEffects', label: 'الأعراض الجانبية', get: (p) => p.sideEffectsAr },
  { key: 'cost', label: 'نطاق السعر', get: (p) => p.costEstimate ?? '—' },
  { key: 'pubmed', label: 'عدد مراجع PubMed', get: (p) => p.pubmedIds ? String(p.pubmedIds.length) : '0' },
  { key: 'difficulty', label: 'المستوى', get: (p) => p.difficulty === 'beginner' ? 'مبتدئ' : p.difficulty === 'intermediate' ? 'متوسط' : p.difficulty === 'advanced' ? 'متقدم' : '—' },
  { key: 'aminoAcids', label: 'الأحماض الأمينية', get: (p) => p.aminoAcids },
];

function PeptideSelector({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  exclude: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = peptides.find((p) => p.id === value);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return peptides.filter(
      (p) => !exclude.includes(p.id) && (p.nameAr.includes(search) || p.nameEn.toLowerCase().includes(q)),
    );
  }, [search, exclude]);

  return (
    <div className="relative">
      <p className="mb-1.5 text-xs font-bold text-stone-500 dark:text-stone-300">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm transition-colors',
          value
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-bold'
            : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-300',
        )}
      >
        <span className="truncate">{selected ? `${selected.nameAr} — ${selected.nameEn}` : 'اختر ببتيدًا...'}</span>
        {value ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
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
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-xl dark:shadow-stone-900/40 animate-fade-in">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث..."
              className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-center text-xs text-stone-500 dark:text-stone-300">لا توجد نتائج</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <span className="font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-300">{p.nameEn}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const [ids, setIds] = useState<[string, string, string]>(() => {
    // Support both ?ids=x,y,z and legacy ?p1=x&p2=y&p3=z
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const parts = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
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

  const selectedPeptides = useMemo(
    () => ids.map((id) => peptides.find((p) => p.id === id)).filter((p): p is Peptide => p != null),
    [ids],
  );

  const setId = (index: number, value: string) => {
    setIds((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
  };

  const excludeFor = (index: number) => ids.filter((_, i) => i !== index && ids[i]);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    ids.forEach((id, i) => { if (id) params.set(`p${i + 1}`, id); });
    return `${SITE_URL}/compare?${params.toString()}`;
  }, [ids]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('تم نسخ رابط المقارنة');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('فشل نسخ الرابط');
    }
  };

  const hasDifference = (row: CompareRow) => {
    if (selectedPeptides.length < 2) return false;
    const values = selectedPeptides.map((p) => row.get(p));
    return new Set(values).size > 1;
  };

  return (
    <div dir="rtl" className="mx-auto max-w-5xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
      <Helmet>
        <title>مقارنة الببتيدات | pptides</title>
        <meta name="description" content="قارن بين الببتيدات جنبًا إلى جنب — الجرعات، الفوائد، الأعراض الجانبية، والأسعار" />
        <meta property="og:title" content="مقارنة الببتيدات | pptides" />
        <meta property="og:description" content="قارن بين الببتيدات جنبًا إلى جنب — الجرعات، الفوائد، الأعراض الجانبية، والأسعار" />
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
        <h1 className="mb-2 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
          مقارنة الببتيدات
        </h1>
        <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
          اختر 2-3 ببتيدات لمقارنتها جنبًا إلى جنب
        </p>
      </div>

      {/* Selectors */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <PeptideSelector label="الببتيد الأول" value={ids[0]} onChange={(v) => setId(0, v)} exclude={excludeFor(0)} />
        <PeptideSelector label="الببتيد الثاني" value={ids[1]} onChange={(v) => setId(1, v)} exclude={excludeFor(1)} />
        <PeptideSelector label="الببتيد الثالث (اختياري)" value={ids[2]} onChange={(v) => setId(2, v)} exclude={excludeFor(2)} />
      </div>

      {/* Comparison Table */}
      {selectedPeptides.length >= 2 ? (
        <>
          {/* Share button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'تم النسخ!' : 'مشاركة المقارنة'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600 shadow-sm dark:shadow-stone-900/30">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                  <th scope="col" className="px-4 py-4 text-start text-xs font-bold text-stone-500 dark:text-stone-300 w-[140px]">
                    المعيار
                  </th>
                  {selectedPeptides.map((p) => (
                    <th key={p.id} scope="col" className="px-4 py-4 text-start">
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
                      <div className="mt-2 flex gap-2">
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
                {COMPARE_ROWS.map((row, i) => {
                  const isDiff = hasDifference(row);
                  return (
                    <tr
                      key={row.key}
                      className={cn(
                        'border-b border-stone-100 dark:border-stone-800 transition-colors',
                        isDiff
                          ? 'bg-amber-50/60 dark:bg-amber-900/10'
                          : i % 2 === 0
                            ? 'bg-white dark:bg-stone-900'
                            : 'bg-stone-50/50 dark:bg-stone-900/30',
                      )}
                    >
                      <th
                        scope="row"
                        className={cn(
                          'px-4 py-3.5 text-xs font-bold',
                          isDiff ? 'text-amber-800 dark:text-amber-300' : 'text-stone-700 dark:text-stone-200',
                        )}
                      >
                        {row.label}
                        {isDiff && <span className="ms-1 text-[10px]">●</span>}
                      </th>
                      {selectedPeptides.map((p) => (
                        <td
                          key={p.id}
                          className={cn(
                            'px-4 py-3.5 text-xs leading-relaxed',
                            isDiff
                              ? 'text-amber-900 dark:text-amber-200'
                              : 'text-stone-800 dark:text-stone-200',
                          )}
                        >
                          {row.get(p)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/interactions?p1=${ids[0]}&p2=${ids[1]}`}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              فحص التعارضات بين هذه الببتيدات
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/50 px-6 py-16 text-center">
          <ArrowLeftRight className="mx-auto mb-4 h-10 w-10 text-stone-300 dark:text-stone-300" />
          <p className="text-sm text-stone-500 dark:text-stone-300">
            اختر ببتيدين على الأقل من القوائم أعلاه لبدء المقارنة
          </p>
          <Link
            to="/library"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            تصفّح المكتبة
          </Link>
        </div>
      )}

      {/* Popular comparisons */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">مقارنات شائعة</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { p1: 'semaglutide', p2: 'tirzepatide', label: 'سيماغلوتايد vs تيرزيباتايد' },
            { p1: 'bpc-157', p2: 'tb-500', label: 'BPC-157 vs TB-500' },
            { p1: 'cjc-1295', p2: 'sermorelin', label: 'CJC-1295 vs سيرموريلين' },
            { p1: 'kisspeptin-10', p2: 'pt-141', label: 'كيسبيبتين vs PT-141' },
            { p1: 'epithalon', p2: 'ghk-cu', label: 'إبيتالون vs GHK-Cu' },
            { p1: 'semax', p2: 'selank', label: 'سيماكس vs سيلانك' },
          ].map(({ p1, p2, label }) => (
            <Link
              key={`${p1}-${p2}`}
              to={`/compare?p1=${p1}&p2=${p2}`}
              className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md hover:-translate-y-0.5"
            >
              <ArrowLeftRight className="h-5 w-5 shrink-0 text-emerald-700" />
              <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
