import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <nav aria-label="التنقل بين الصفحات" className="flex items-center gap-1 justify-center">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="الصفحة السابقة"
        className="rounded-lg px-3 py-1.5 min-h-[44px] text-sm font-medium text-stone-600 dark:text-stone-300 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        →
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-stone-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`الصفحة ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'rounded-lg px-3 py-1.5 min-h-[44px] text-sm font-medium transition-colors',
              p === page
                ? 'bg-emerald-600 text-white'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="الصفحة التالية"
        className="rounded-lg px-3 py-1.5 min-h-[44px] text-sm font-medium text-stone-600 dark:text-stone-300 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        ←
      </button>
    </nav>
  );
}
