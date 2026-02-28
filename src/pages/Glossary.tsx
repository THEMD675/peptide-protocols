import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BookA, Search, X } from 'lucide-react';
import { PEPTIDE_COUNT } from '@/lib/constants';
import { GLOSSARY_TERMS as TERMS } from '@/data/glossary';

export default function Glossary() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return TERMS;
    const q = search.trim().toLowerCase();
    return TERMS.filter(
      (t) =>
        t.ar.toLowerCase().includes(q) ||
        t.en.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="min-h-screen mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
      <Helmet>
        <title>مصطلحات الببتيدات | pptides</title>
        <meta name="description" content="قاموس شامل لمصطلحات الببتيدات والبيوهاكينغ بالعربي مع المعادل الإنجليزي. Comprehensive Arabic peptide and biohacking glossary." />
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
      <div className="relative mb-8">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مصطلح..."
          aria-label="البحث في المصطلحات"
          className="w-full rounded-2xl border border-stone-300 bg-stone-50 py-4 ps-12 pe-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="مسح البحث"
            className="absolute end-4 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-stone-500">
        {search.trim() ? `${filtered.length} نتيجة` : `${TERMS.length} مصطلح`}
      </p>

      {/* Terms Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 py-16 text-center">
          <BookA className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="text-sm text-stone-500">لا توجد نتائج لـ "{search}"</p>
        </div>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          {filtered.map((term) => (
            <div
              key={term.en}
              className="rounded-2xl border border-stone-200 border-s-2 border-s-emerald-300 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <dt className="flex items-baseline justify-between gap-3">
                <span className="text-base font-bold text-stone-900">{term.ar}</span>
                <span className="shrink-0 text-xs font-medium text-emerald-600" dir="ltr">{term.en}</span>
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-stone-600">{term.definition}</dd>
            </div>
          ))}
        </dl>
      )}
      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-bold text-stone-900">مستعد تبدأ؟</p>
        <p className="mt-1 text-sm text-stone-600">تصفّح البروتوكولات الكاملة لـ {PEPTIDE_COUNT}+ ببتيد</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">تصفّح المكتبة</Link>
          <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">اسأل المدرب الذكي</Link>
        </div>
      </div>
    </div>
  );
}
