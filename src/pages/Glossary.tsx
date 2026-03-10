import { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BookA, Search, X, FlaskConical } from 'lucide-react';
import { PEPTIDE_COUNT, SITE_URL } from '@/lib/constants';
import { GLOSSARY_TERMS as TERMS } from '@/data/glossary';
import { peptides as allPeptides } from '@/data/peptides';

const stripDiacritics = (s: string) => s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, '');

function getArabicFirstLetter(ar: string): string {
  const stripped = stripDiacritics(ar.trim());
  if (!stripped) return '';
  const first = stripped.charAt(0);
  if (/[\u0621-\u064A]/.test(first)) return first;
  return first;
}

function normalizeLetterForSort(c: string): number {
  const alef = '\u0627';
  const alefVariants = '\u0622\u0623\u0625';
  if (c === alef || alefVariants.includes(c)) return 0;
  const order = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
  const i = order.indexOf(c);
  return i >= 0 ? i + 1 : 999;
}

/** Highlight matching text with emerald background */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const normalizedQuery = stripDiacritics(query.trim().toLowerCase());
  const normalizedText = stripDiacritics(text.toLowerCase());

  const parts: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  let searchIdx = normalizedText.indexOf(normalizedQuery, lastIndex);
  while (searchIdx !== -1) {
    if (searchIdx > lastIndex) {
      parts.push({ text: text.slice(lastIndex, searchIdx), highlighted: false });
    }
    parts.push({ text: text.slice(searchIdx, searchIdx + normalizedQuery.length), highlighted: true });
    lastIndex = searchIdx + normalizedQuery.length;
    searchIdx = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false });
  }

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="rounded bg-emerald-100 px-0.5 text-emerald-900">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export default function Glossary() {
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return TERMS;
    const q = stripDiacritics(search.trim().toLowerCase());
    return TERMS.filter(
      (t) =>
        stripDiacritics(t.ar.toLowerCase()).includes(q) ||
        t.en.toLowerCase().includes(q) ||
        stripDiacritics(t.definition.toLowerCase()).includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof TERMS>();
    for (const term of filtered) {
      const letter = getArabicFirstLetter(term.ar) || '؟';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(term);
    }
    const letters = [...map.keys()].sort((a, b) => normalizeLetterForSort(a) - normalizeLetterForSort(b));
    return letters.map((letter) => ({ letter, terms: map.get(letter)! }));
  }, [filtered]);

  const scrollToLetter = useCallback((letter: string) => {
    setActiveLetter(letter);
    const el = document.getElementById(`glossary-${letter}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Reset active state after animation
    setTimeout(() => setActiveLetter(null), 1500);
  }, []);

  return (
    <div className="min-h-screen mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>قاموس مصطلحات الببتيدات والبيوهاكينغ | pptides</title>
        <meta name="description" content="قاموس عربي شامل لمصطلحات الببتيدات والطب الرياضي والبيوهاكينغ — تعريفات واضحة لكل مصطلح تقني من GH وIGF-1 إلى الببتيدات العصبية والمناعية." />
        <link rel="canonical" href={`${SITE_URL}/glossary`} />
        <meta property="og:title" content="قاموس مصطلحات الببتيدات | pptides" />
        <meta property="og:description" content="قاموس عربي شامل لمصطلحات الببتيدات والطب الرياضي والبيوهاكينغ." />
        <meta property="og:url" content={`${SITE_URL}/glossary`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="قاموس مصطلحات الببتيدات | pptides" />
        <meta name="twitter:description" content="قاموس عربي شامل لمصطلحات الببتيدات والطب الرياضي والبيوهاكينغ." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          "name": "مصطلحات الببتيدات",
          "description": "قاموس شامل لمصطلحات الببتيدات والطب الرياضي",
          "inLanguage": "ar",
          "url": `${SITE_URL}/glossary`
        })}</script>
      </Helmet>

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <BookA className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">المصطلحات</h1>
        <p className="mt-2 text-lg text-stone-600">قاموس شامل لمصطلحات الببتيدات والبيوهاكينغ</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        {!search && <Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" />}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مصطلح..."
          aria-label="البحث في المصطلحات"
          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 py-4 ps-12 pe-10 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="مسح البحث"
            className="absolute start-4 top-1/2 -translate-y-1/2 text-stone-500 transition-colors hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-stone-500">
        {search.trim() ? `${filtered.length} نتيجة` : `${TERMS.length} مصطلح`}
      </p>

      {/* Alphabet jump bar — sticky, always visible when not searching */}
      {!search.trim() && grouped.length > 0 && (
        <div className="sticky top-16 z-20 -mx-4 mb-6 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md px-4 py-3 border-b border-stone-100 dark:border-stone-800 rounded-b-xl" role="navigation" aria-label="القفز حسب الحرف">
          <div className="flex flex-wrap justify-center gap-1.5">
            {grouped.map(({ letter }) => (
              <button
                key={letter}
                type="button"
                onClick={() => scrollToLetter(letter)}
                className={`flex h-10 w-10 min-w-[40px] items-center justify-center rounded-xl text-sm font-bold transition-all min-h-[44px] ${
                  activeLetter === letter
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110'
                    : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-stone-800 hover:text-emerald-700'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Terms Grid — grouped by letter */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 py-16 text-center">
          <BookA className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="text-sm text-stone-500">لا توجد نتائج لـ &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ letter, terms }) => (
            <section key={letter} id={`glossary-${letter}`} className="scroll-mt-32">
              <h2 className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-700">
                {letter}
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {terms.map((term) => (
                  <div
                    key={term.en}
                    className="rounded-2xl border border-stone-200 dark:border-stone-700 border-s-2 border-s-emerald-300 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-200 hover:shadow-md"
                  >
                    <dt className="flex items-baseline justify-between gap-3">
                      <span className="text-base font-bold text-stone-900">
                        <HighlightedText text={term.ar} query={search} />
                      </span>
                      <span className="shrink-0 text-xs font-medium text-emerald-600" dir="ltr">
                        <HighlightedText text={term.en} query={search} />
                      </span>
                    </dt>
                    <dd className="mt-3 text-sm leading-relaxed text-stone-600">
                      <HighlightedText text={term.definition} query={search} />
                    </dd>
                    {term.relatedPeptides && term.relatedPeptides.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {term.relatedPeptides.map((pid) => {
                          const p = allPeptides.find(x => x.id === pid);
                          return p ? (
                            <Link
                              key={pid}
                              to={`/peptide/${pid}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[32px]"
                            >
                              <FlaskConical className="h-3 w-3" />
                              {p.nameEn}
                            </Link>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-bold text-stone-900">مستعد تبدأ؟</p>
        <p className="mt-1 text-sm text-stone-600">تصفّح البروتوكولات الكاملة لـ {PEPTIDE_COUNT}+ ببتيد</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center">تصفّح المكتبة</Link>
          <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">اسأل المدرب الذكي</Link>
        </div>
      </div>
    </div>
  );
}
