import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FlaskConical, BookOpen, FileText, Compass, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptideSearchIndex, type PeptideSearchEntry } from '@/data/peptide-search-index';
import { GLOSSARY_TERMS, type GlossaryTerm } from '@/data/glossary';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/constants';
import { events } from '@/lib/analytics';

/* ── static page index ── */
const PAGE_INDEX = [
  { to: '/library', label: 'المكتبة', desc: 'تصفّح جميع الببتيدات' },
  { to: '/blog', label: 'المدونة', desc: 'مقالات ونصائح' },
  { to: '/calculator', label: 'حاسبة الجرعات', desc: 'احسب الجرعة المناسبة' },
  { to: '/table', label: 'جدول المقارنة', desc: 'قارن بين الببتيدات' },
  { to: '/interactions', label: 'فحص التعارضات', desc: 'تحقّق من التداخلات الدوائية' },
  { to: '/compare', label: 'مقارنة الببتيدات', desc: 'قارن ببتيدين جنبًا إلى جنب' },
  { to: '/stacks', label: 'البروتوكولات المُجمَّعة', desc: 'تجميعات جاهزة لأهدافك' },
  { to: '/lab-guide', label: 'دليل التحاليل', desc: 'التحاليل المطلوبة قبل وبعد' },
  { to: '/guide', label: 'دليل الحقن', desc: 'خطوة بخطوة للمبتدئين' },
  { to: '/glossary', label: 'المصطلحات', desc: 'القاموس الطبي' },
  { to: '/sources', label: 'المصادر العلمية', desc: 'أبحاث ودراسات PubMed' },
  { to: '/pricing', label: 'الأسعار', desc: 'خطط الاشتراك' },
  { to: '/faq', label: 'الأسئلة الشائعة', desc: 'إجابات على أبرز التساؤلات' },
  { to: '/about', label: 'من نحن', desc: 'تعرّف على فريق pptides' },
  { to: '/contact', label: 'تواصل معنا', desc: 'أرسل استفسارك' },
  { to: '/quiz', label: 'اختبار الببتيدات', desc: 'اكتشف البروتوكول المناسب لك' },
  { to: '/dashboard', label: 'لوحة التحكم', desc: 'نظرة عامة على نشاطك' },
  { to: '/tracker', label: 'سجل الحقن', desc: 'تتبّع جرعاتك اليومية' },
  { to: '/coach', label: 'المدرب الذكي', desc: 'مساعدك الشخصي بالذكاء الاصطناعي' },
] as const;

/* ── helpers ── */
const normalize = (s: string) =>
  s.replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase();

/** Normalize for fuzzy matching: strip hyphens, spaces, dashes for "bpc157" → "bpc157" matching "bpc-157" */
const fuzzyNorm = (s: string) =>
  normalize(s).replace(/[-\s_.]/g, '');

/** Normalize Arabic alef/hamza variants: أ إ آ ا → ا */
const normalizeAlef = (s: string) =>
  s.replace(/[أإآ]/g, 'ا');

/** Check if query matches text with fuzzy rules */
const fuzzyMatch = (text: string, query: string): boolean => {
  // Exact substring match (existing behavior)
  const nText = normalize(text);
  const nQuery = normalize(query);
  if (nText.includes(nQuery)) return true;
  // Fuzzy: strip hyphens/spaces (bpc157 matches bpc-157)
  if (fuzzyNorm(text).includes(fuzzyNorm(query))) return true;
  // Arabic alef normalization
  if (normalizeAlef(nText).includes(normalizeAlef(nQuery))) return true;
  return false;
};

type ResultItem =
  | { type: 'peptide'; data: PeptideSearchEntry }
  | { type: 'glossary'; data: GlossaryTerm }
  | { type: 'blog'; data: { slug: string; title_ar: string; excerpt_ar: string } }
  | { type: 'page'; data: (typeof PAGE_INDEX)[number] };

const TYPE_LABELS: Record<ResultItem['type'], string> = {
  peptide: 'ببتيدات',
  glossary: 'مصطلحات',
  blog: 'مقالات',
  page: 'صفحات',
};

const TYPE_ICONS: Record<ResultItem['type'], typeof FlaskConical> = {
  peptide: FlaskConical,
  glossary: BookOpen,
  blog: FileText,
  page: Compass,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  const [blogResults, setBlogResults] = useState<
    { slug: string; title_ar: string; excerpt_ar: string }[]
  >([]);
  const searchTrackTimer = useRef<ReturnType<typeof setTimeout>>();
  const blogTimer = useRef<ReturnType<typeof setTimeout>>();

  /* focus input on open */
  useEffect(() => {
    if (open) {
      setQuery('');
      setFocusIdx(0);
      setBlogResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
    const q = query.trim();
    if (q.length >= 3) {
      searchTrackTimer.current = setTimeout(() => {
        events.searchUse(q.slice(0, 50));
      }, 2000);
    }
    return () => { if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current); };
  }, [query]);

  /* debounced blog search */
  useEffect(() => {
    if (blogTimer.current) clearTimeout(blogTimer.current);
    const q = query.trim();
    if (q.length < 2) { setBlogResults([]); return; }
    blogTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('blog_posts')
          .select('slug, title_ar, excerpt_ar')
          .eq('is_published', true)
          .or(`title_ar.ilike.%${q.replace(/[{}%_.,]/g, '')}%,excerpt_ar.ilike.%${q.replace(/[{}%_.,]/g, '')}%,tags.cs.{${q.replace(/[{}%_.,]/g, '')}}`)
          .limit(5);
        setBlogResults(data ?? []);
      } catch { setBlogResults([]); }
    }, 300);
    return () => { if (blogTimer.current) clearTimeout(blogTimer.current); };
  }, [query]);

  /* build results */
  const results = useMemo<ResultItem[]>(() => {
    const q = normalize(query);
    if (q.length < 2) return [];

    const items: ResultItem[] = [];

    // peptides — fuzzy match (handles bpc157 → BPC-157, Arabic alef variants)
    const peps = peptideSearchIndex.filter(
      (p) => fuzzyMatch(p.nameAr, query) || fuzzyMatch(p.nameEn, query)
    );
    for (const p of peps.slice(0, 5)) items.push({ type: 'peptide', data: p });

    // glossary
    const terms = GLOSSARY_TERMS.filter(
      (t) =>
        fuzzyMatch(t.ar, query) ||
        fuzzyMatch(t.en, query) ||
        fuzzyMatch(t.definition, query)
    );
    for (const t of terms.slice(0, 4)) items.push({ type: 'glossary', data: t });

    // blog (async results)
    for (const b of blogResults) items.push({ type: 'blog', data: b });

    // pages
    const pages = PAGE_INDEX.filter(
      (p) =>
        fuzzyMatch(p.label, query) ||
        fuzzyMatch(p.desc, query) ||
        p.to.toLowerCase().includes(q)
    );
    for (const p of pages.slice(0, 4)) items.push({ type: 'page', data: p });

    return items;
  }, [query, blogResults]);

  /* recent peptides */
  const recentPeptides = useMemo(() => {
    if (query.trim().length >= 2) return [];
    try {
      const ids: string[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.RECENT_PEPTIDES) ?? '[]'
      ).slice(0, 5);
      return ids
        .map((id) => peptideSearchIndex.find((p) => p.id === id))
        .filter(Boolean) as PeptideSearchEntry[];
    } catch {
      return [];
    }
  }, [query]);

  const goTo = useCallback(
    (item: ResultItem) => {
      switch (item.type) {
        case 'peptide':
          navigate(`/peptide/${item.data.id}`);
          break;
        case 'glossary':
          navigate('/glossary');
          break;
        case 'blog':
          navigate(`/blog/${item.data.slug}`);
          break;
        case 'page':
          navigate(item.data.to);
          break;
      }
      onClose();
    },
    [navigate, onClose]
  );

  /* keyboard nav */
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length === 0) return;
        setFocusIdx((i) => Math.max(0, Math.min(i + 1, results.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[focusIdx]) {
        e.preventDefault();
        goTo(results[focusIdx]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, focusIdx, goTo, onClose]
  );

  // scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${focusIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);

  // reset focus when results change
  useEffect(() => setFocusIdx(0), [results.length]);

  if (!open) return null;

  /* group results by type */
  const grouped = results.reduce<Record<string, { idx: number; item: ResultItem }[]>>(
    (acc, item, idx) => {
      (acc[item.type] ??= []).push({ idx, item });
      return acc;
    },
    {}
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* modal */}
      <div
        className="search-modal relative w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-2xl dark:shadow-black/60 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* input */}
        <div className="flex items-center gap-3 border-b border-stone-200 dark:border-stone-700 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-stone-500 dark:text-stone-300" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="ابحث عن ببتيد، مصطلح، مقالة، أو صفحة..."
            className="flex-1 bg-transparent text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500 outline-none focus:outline-none focus:ring-0"
            aria-label="بحث شامل"
          />
          <kbd className="hidden rounded-md border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-medium text-stone-500 dark:text-stone-300 sm:inline">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-300 transition-colors sm:hidden"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* screen-reader results announcement */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {query.trim().length >= 2
            ? results.length > 0
              ? `${results.length} نتيجة`
              : `لا توجد نتائج لـ "${query}"`
            : ''}
        </span>

        {/* results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain">
          {/* empty state: recent */}
          {query.trim().length < 2 && recentPeptides.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1.5 text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wider">
                شوهدت مؤخرًا
              </p>
              {recentPeptides.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    navigate(`/peptide/${p.id}`);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/80"
                >
                  <FlaskConical className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {p.nameAr}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-300">
                    {p.nameEn}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* empty: type more */}
          {query.trim().length === 1 && (
            <p className="px-4 py-6 text-center text-sm text-stone-500 dark:text-stone-300">
              اكتب حرفين على الأقل للبحث...
            </p>
          )}

          {/* no results */}
          {query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-stone-500 dark:text-stone-300">
                لا توجد نتائج لـ &quot;{query}&quot;
              </p>
              <button
                onClick={() => {
                  navigate('/library');
                  onClose();
                }}
                className="mt-2 text-xs text-emerald-600 hover:underline"
              >
                تصفّح المكتبة
              </button>
            </div>
          )}

          {/* grouped results */}
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type as ResultItem['type']];
            return (
              <div key={type} className="py-1">
                <p className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-wider">
                  <Icon className="h-3.5 w-3.5 text-emerald-500" />
                  {TYPE_LABELS[type as ResultItem['type']]}
                </p>
                {items.map(({ idx, item }) => (
                  <button
                    key={idx}
                    data-idx={idx}
                    onClick={() => goTo(item)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors',
                      idx === focusIdx
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/80'
                    )}
                  >
                    {item.type === 'peptide' && (
                      <>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {item.data.nameAr}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-300">
                          {item.data.nameEn}
                        </span>
                      </>
                    )}
                    {item.type === 'glossary' && (
                      <>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {item.data.ar}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-300 line-clamp-1">
                          {item.data.en}
                        </span>
                      </>
                    )}
                    {item.type === 'blog' && (
                      <span className="font-medium text-stone-900 dark:text-stone-100 line-clamp-1">
                        {item.data.title_ar}
                      </span>
                    )}
                    {item.type === 'page' && (
                      <>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {item.data.label}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-300">
                          {item.data.desc}
                        </span>
                      </>
                    )}
                    {idx === focusIdx && (
                      <ArrowLeft className="ms-auto h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 px-4 py-2.5 text-xs text-stone-500 dark:text-stone-300">
            <span className="font-medium">{results.length} نتيجة</span>
            <span className="flex items-center gap-2">
              <kbd className="rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-700 px-1.5 py-0.5 text-stone-600 dark:text-stone-300">↑↓</kbd>
              للتنقل
              <kbd className="rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-700 px-1.5 py-0.5 text-stone-600 dark:text-stone-300">↵</kbd>
              للفتح
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
