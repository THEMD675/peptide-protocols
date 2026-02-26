import { useState, useMemo, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  Lock,
  Filter,
  FlaskConical,
  Shield,
  X,
  TrendingDown,
  Heart,
  Zap,
  Brain,
  Clock,
  CheckCircle,
  Sparkles,
  Star,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { peptides, categories, type Peptide } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';

const categoryIcons: Record<string, React.ElementType> = {
  metabolic: TrendingDown,
  recovery: Heart,
  hormonal: Zap,
  brain: Brain,
  longevity: Clock,
  'skin-gut': Shield,
};

const evidenceColors: Record<string, string> = {
  excellent: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  strong: 'bg-blue-100 text-blue-800 border-blue-300',
  good: 'bg-sky-100 text-sky-800 border-sky-300',
  moderate: 'bg-amber-100 text-amber-800 border-amber-300',
  weak: 'bg-orange-100 text-orange-800 border-orange-300',
  'very-weak': 'bg-red-100 text-red-800 border-red-300',
};

const evidenceLabels: Record<string, string> = {
  excellent: 'ممتاز',
  strong: 'قوي',
  good: 'جيد',
  moderate: 'متوسط',
  weak: 'ضعيف',
  'very-weak': 'ضعيف جدًا',
};

const categoryLabels: Record<string, string> = {
  metabolic: 'الأيض',
  recovery: 'التعافي',
  hormonal: 'الهرمونات',
  brain: 'الدماغ',
  longevity: 'إطالة العمر',
  'skin-gut': 'البشرة والأمعاء',
};


function PeptideCard({
  peptide,
  index,
  hasAccess,
  onLockedClick,
  isFav,
  onToggleFav,
}: {
  peptide: Peptide;
  index: number;
  hasAccess: boolean;
  onLockedClick: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const Icon = categoryIcons[peptide.category];

  const cardContent = (
    <div
      className={cn(
        'relative h-full overflow-hidden rounded-2xl border p-5 transition-all duration-300',
        hasAccess
          ? 'border-stone-200 bg-white hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-600/10 hover:-translate-y-1'
          : 'border-stone-200 bg-stone-50/50 hover:border-stone-300',
      )}
    >
      {!hasAccess && !peptide.isFree && (
        <div className="absolute left-3 top-3 z-10">
          <Lock className="h-3.5 w-3.5 text-stone-700" />
        </div>
      )}
      {peptide.isFree && !hasAccess && (
        <div className="absolute left-3 top-3 z-10">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">مجاني</span>
        </div>
      )}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
        className="absolute left-3 top-3 z-10 rounded-full p-1.5 transition-colors hover:bg-stone-100"
        aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      >
        <Star className={cn('h-4 w-4', isFav ? 'fill-amber-400 text-amber-400' : 'text-stone-300')} />
      </button>

      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3
            className={cn(
              'text-lg font-bold transition-colors',
              hasAccess
                ? 'text-stone-900 group-hover:text-emerald-600'
                : 'text-stone-900',
            )}
          >
            {peptide.nameAr}
          </h3>
          <p className="mt-0.5 text-xs text-stone-800">{peptide.nameEn}</p>
        </div>
        {peptide.fdaApproved && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            FDA
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-full border border-stone-300 bg-stone-50 px-2.5 py-0.5 text-[11px] font-medium text-stone-800">
          {Icon && <Icon className="h-3 w-3" />}
          {categoryLabels[peptide.category]}
        </span>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
            evidenceColors[peptide.evidenceLevel],
          )}
        >
          {evidenceLabels[peptide.evidenceLevel]}
        </span>
      </div>

      {(hasAccess || peptide.isFree) ? (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-stone-800">
          {peptide.summaryAr}
        </p>
      ) : (
        <div
          className="relative mb-4 overflow-hidden"
          style={{
            maxHeight: '3rem',
            maskImage: 'linear-gradient(to bottom, #000 20%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 20%, transparent 100%)',
          }}
        >
          <p className="text-sm leading-relaxed text-stone-800">
            {peptide.summaryAr.slice(0, 40)}...
          </p>
        </div>
      )}

      {(hasAccess || peptide.isFree) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-stone-800">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="text-xs">{peptide.administrationAr.split('.')[0]}</span>
          </div>
          {peptide.costEstimate && (
            <span className="text-xs font-semibold text-emerald-600">{peptide.costEstimate}</span>
          )}
        </div>
      )}
    </div>
  );

  if (hasAccess || peptide.isFree) {
    return (
      <div>
        <Link to={`/peptide/${peptide.id}`} className="group block h-full">
          {cardContent}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onLockedClick}
        className="block h-full w-full cursor-pointer text-start"
      >
        {cardContent}
      </button>
    </div>
  );
}

function useFavorites(): [Set<string>, (id: string) => void] {
  const [favs, setFavs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pptides_favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const toggle = useCallback((id: string) => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('pptides_favorites', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  return [favs, toggle];
}

export default function Library() {
  const { subscription, isLoading } = useAuth();
  const hasAccess = !isLoading && (subscription?.isProOrTrial ?? false);

  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'evidence' | 'alpha' | 'favorites'>('default');
  const [showFilters, setShowFilters] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [favorites, toggleFavorite] = useFavorites();

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const [upsellPeptide, setUpsellPeptide] = useState<string | null>(null);

  const handleLockedClick = useCallback((peptideId?: string) => {
    setUpsellPeptide(peptideId ?? null);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 4000);
  }, []);

  const evidenceOrder: Record<string, number> = { excellent: 0, strong: 1, good: 2, moderate: 3, weak: 4, 'very-weak': 5 };

  const filtered = useMemo(() => {
    const result = peptides.filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (evidenceFilter !== 'all' && p.evidenceLevel !== evidenceFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.nameAr.includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.summaryAr.includes(q) ||
          p.mechanismAr.includes(q) ||
          p.dosageAr.includes(q)
        );
      }
      return true;
    });
    if (sortBy === 'evidence') result.sort((a, b) => (evidenceOrder[a.evidenceLevel] ?? 5) - (evidenceOrder[b.evidenceLevel] ?? 5));
    if (sortBy === 'alpha') result.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    if (sortBy === 'favorites') result.sort((a, b) => (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0));
    return result;
  }, [activeCategory, search, evidenceFilter, sortBy]);

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>مكتبة الببتيدات — 41 ببتيد علاجي مع بروتوكولات كاملة | Peptide Library</title>
        <meta name="description" content="تصفّح 41 ببتيد علاجي مع شرح مفصّل للآليات والجرعات والآثار الجانبية. Browse 41 therapeutic peptides with detailed protocols." />
      </Helmet>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div
          className="mb-8 text-center"
        >
          <h1
            className="text-3xl font-bold md:text-4xl"
            
          >
            مكتبة البيبتايدات
          </h1>
          <p className="mt-2 text-base text-stone-800">
            استكشف البروتوكولات المبنية على الأدلة العلمية
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-700" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن ببتيد..."
              className={cn(
                'w-full rounded-xl border border-stone-300 bg-stone-50 py-2.5 pr-10 pl-4',
                'text-sm text-stone-900 placeholder:text-stone-700',
                'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200',
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="مسح البحث"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-700 hover:text-stone-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'default' | 'evidence' | 'alpha')}
            aria-label="ترتيب"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 focus:border-emerald-300 focus:outline-none sm:w-auto"
          >
            <option value="default">الترتيب الافتراضي</option>
            <option value="evidence">الأقوى دليلًا</option>
            <option value="alpha">أبجدي (A-Z)</option>
            <option value="favorites">المفضلة أولًا</option>
          </select>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors sm:w-auto',
              showFilters
                ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                : 'border-stone-300 bg-white text-stone-800 hover:border-stone-300',
            )}
          >
            <Filter className="h-4 w-4" />
            تصفية
          </button>
        </div>

        {/* Evidence Filter Dropdown */}
        <AnimatePresence>
          {showFilters && (
            <div
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
                <label className="mb-2 block text-xs font-medium text-stone-800">
                  مستوى الدليل العلمي
                </label>
                <select
                  value={evidenceFilter}
                  onChange={(e) => setEvidenceFilter(e.target.value)}
                  aria-label="مستوى الدليل العلمي"
                  className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none sm:w-auto"
                >
                  <option value="all">الكل</option>
                  <option value="excellent">ممتاز</option>
                  <option value="strong">قوي</option>
                  <option value="good">جيد</option>
                  <option value="moderate">متوسط</option>
                  <option value="weak">ضعيف</option>
                  <option value="very-weak">ضعيف جدًا</option>
                </select>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Category Tabs */}
        <div
          className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide"
        >
          <div className="flex gap-2 pb-2 min-w-max">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                activeCategory === 'all'
                  ? 'border-emerald-300 text-white'
                  : 'border-stone-300 bg-white text-stone-800 hover:border-stone-300 hover:text-stone-800',
              )}
              style={
                activeCategory === 'all'
                  ? { background: 'var(--gold, #10b981)' }
                  : undefined
              }
            >
              الكل
            </button>
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.id];
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                    active
                      ? 'border-emerald-300 text-white'
                      : 'border-stone-300 bg-white text-stone-800 hover:border-stone-300 hover:text-stone-800',
                  )}
                  style={active ? { background: 'var(--gold, #10b981)' } : undefined}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {categoryLabels[cat.id]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-stone-800">
          {filtered.length} ببتيد
        </div>

        {/* Peptide Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((p, i) => (
                <PeptideCard
                  key={p.id}
                  peptide={p}
                  index={i}
                  hasAccess={hasAccess}
                  onLockedClick={() => handleLockedClick(p.id)}
                  isFav={favorites.has(p.id)}
                  onToggleFav={() => toggleFavorite(p.id)}
                />
              ))}

              {!hasAccess && (
                <div
                  className="md:col-span-2"
                >
                  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-8 text-center">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                    <span className="text-lg font-bold text-stone-900">
                      اكتشف البروتوكولات الكاملة لـ 41 ببتيد
                    </span>
                    <p className="text-sm text-stone-800">مش متأكد وش يناسبك؟ اسأل المدرب الذكي — 3 أسئلة مجانية.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                        اشترك — $9/شهريًا
                      </Link>
                      <Link to="/coach" className="rounded-full border-2 border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
                        اسأل المدرب الذكي
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <FlaskConical className="mb-4 h-12 w-12 text-stone-400" />
              <p className="text-lg font-semibold text-stone-800">
                لا توجد نتائج لـ &quot;{search}&quot;
              </p>
              <p className="mt-1 text-sm text-stone-600">
                جرّب كلمات بحث مختلفة أو اسأل المدرب الذكي
              </p>
              <Link to="/coach" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                <Bot className="h-4 w-4" />
                اسأل المدرب الذكي
              </Link>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Upsell Modal */}
      {upsellPeptide && (() => {
        const p = peptides.find(x => x.id === upsellPeptide);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setUpsellPeptide(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Lock className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-stone-900">{p.nameAr}</h3>
              <p className="mb-1 text-sm text-stone-500" dir="ltr">{p.nameEn}</p>
              <p className="mb-4 text-sm text-stone-700 leading-relaxed line-clamp-2">{p.summaryAr}</p>
              <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-sm text-emerald-800 font-semibold mb-1">البروتوكول الكامل يتضمن:</p>
                <p className="text-xs text-emerald-700">الجرعة الدقيقة • التوقيت المثالي • الأعراض الجانبية • التجميعات • التخزين • التحاليل المطلوبة</p>
              </div>
              <Link
                to="/pricing"
                onClick={() => setUpsellPeptide(null)}
                className="mb-3 flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3.5 font-bold text-white hover:bg-emerald-700 transition-all"
              >
                افتح البروتوكول — $9/شهريًا
              </Link>
              <Link
                to="/coach"
                onClick={() => setUpsellPeptide(null)}
                className="text-sm text-emerald-600 hover:underline"
              >
                أو اسأل المدرب الذكي عن {p.nameAr} مجانًا
              </Link>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
