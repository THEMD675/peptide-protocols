import { Link } from 'react-router-dom';
import { FlaskConical, Heart } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { peptidesLite as allPeptides } from '@/data/peptides-lite';

export default function SavedPeptides() {
  const { bookmarks, isLoading, toggle } = useBookmarks();

  const savedPeptides = allPeptides.filter((p) => bookmarks.has(p.id));

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الببتيدات المحفوظة</h2>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Heart className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">الببتيدات المحفوظة</h2>
        {savedPeptides.length > 0 && (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {savedPeptides.length}
          </span>
        )}
      </div>

      {savedPeptides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/50 px-6 py-8 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-stone-300 dark:text-stone-300" />
          <p className="text-sm text-stone-500 dark:text-stone-300 mb-3">لم تحفظ أي ببتيدات بعد</p>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            تصفّح المكتبة
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {savedPeptides.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-3 transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <FlaskConical className="h-5 w-5 text-emerald-700" />
              </div>
              <Link to={`/peptide/${p.id}`} className="min-w-0 flex-1">
                <p className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors truncate">
                  {p.nameAr}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-300 truncate">{p.nameEn}</p>
              </Link>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="shrink-0 rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="إزالة من المحفوظات"
              >
                <Heart className="h-4 w-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
