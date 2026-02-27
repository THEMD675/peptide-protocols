import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Lock,
  Filter,
  FlaskConical,
  X,
  CheckCircle,
  Sparkles,
  Star,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { peptides, categories, type Peptide } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PRICING, PEPTIDE_COUNT, TRIAL_PEPTIDE_IDS } from '@/lib/constants';
import { categoryIcons, evidenceColors, evidenceLabels, categoryLabels, evidenceOrder } from '@/lib/peptide-labels';


const PeptideCard = memo(function PeptideCard({
  peptide,
  hasAccess,
  onLockedClick,
  isFav,
  onToggleFav,
  isCompare,
  onToggleCompare,
  isUsed,
}: {
  peptide: Peptide;
  hasAccess: boolean;
  onLockedClick: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  isCompare: boolean;
  onToggleCompare: () => void;
  isUsed: boolean;
}) {
  const Icon = categoryIcons[peptide.category];

  const cardContent = (
    <div
      className={cn(
        'relative h-full overflow-hidden rounded-2xl border p-5 transition-all duration-300',
        hasAccess
          ? 'border-stone-200 bg-white hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-600/10 hover:-translate-y-1'
          : 'border-stone-200 bg-stone-50/50 hover:border-stone-300',
        isFav && 'border-s-4 border-s-amber-400',
      )}
    >
      {!hasAccess && !peptide.isFree && (
        <div className="absolute left-3 top-3 z-10">
          <Lock className="h-3.5 w-3.5 text-stone-400" />
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
        className="absolute right-3 top-3 z-10 rounded-full p-2.5 min-h-[44px] min-w-[44px] transition-colors hover:bg-stone-100"
        aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      >
        <Star className={cn('h-4 w-4', isFav ? 'fill-amber-400 text-amber-400' : 'text-stone-300')} />
      </button>
      {hasAccess && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(); }}
          className={cn('absolute right-3 top-12 z-10 rounded-full p-2.5 min-h-[44px] min-w-[44px] transition-colors', isCompare ? 'bg-emerald-100' : 'hover:bg-stone-100')}
          aria-label={isCompare ? 'إزالة من المقارنة' : 'إضافة للمقارنة'}
          title="قارن"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', isCompare ? 'text-emerald-600' : 'text-stone-300')}>
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>
      )}

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
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-xs text-stone-800">{peptide.nameEn}</p>
            {isUsed && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">مستخدم</span>}
          </div>
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
          title={
            peptide.evidenceLevel === 'excellent' ? 'ممتاز — تجارب سريرية كبرى + اعتماد FDA' :
            peptide.evidenceLevel === 'strong' ? 'قوي — تجارب بشرية متعددة' :
            peptide.evidenceLevel === 'good' ? 'جيد — دراسات بشرية محدودة' :
            peptide.evidenceLevel === 'moderate' ? 'متوسط — دراسات حيوانية + تقارير بشرية' :
            peptide.evidenceLevel === 'weak' ? 'ضعيف — دراسات حيوانية فقط' :
            'ضعيف جدًا — بيانات أولية محدودة'
          }
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
          className="relative mb-4 max-h-12 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_20%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_20%,transparent_100%)]"
        >
          <p className="text-sm leading-relaxed text-stone-800">
            {peptide.summaryAr.slice(0, 40)}...
          </p>
        </div>
      )}

      {(hasAccess || peptide.isFree) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-stone-600">
            <FlaskConical className="h-3 w-3" />
            <span className="text-[11px]">{peptide.administrationAr.split('.')[0]}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {peptide.difficulty && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                peptide.difficulty === 'beginner' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                peptide.difficulty === 'intermediate' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                'border-red-200 bg-red-50 text-red-700'
              )}>
                {peptide.difficulty === 'beginner' ? 'مبتدئ' : peptide.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
              </span>
            )}
            {peptide.costEstimate && (
              <span className="text-[11px] font-bold text-emerald-600">{peptide.costEstimate}</span>
            )}
          </div>
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
});

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
      try { localStorage.setItem('pptides_favorites', JSON.stringify([...next])); } catch { /* expected */ }
      if (next.has(id)) toast.success('تمت الإضافة للمفضلة');
      return next;
    });
  }, []);

  return [favs, toggle];
}

function useUsedPeptides() {
  const { user } = useAuth();
  const [used, setUsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from('injection_logs').select('peptide_name').eq('user_id', user.id).limit(500).then(({ data }) => {
      if (mounted && data) setUsed(new Set(data.map(d => d.peptide_name)));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user]);
  return used;
}

export default function Library() {
  const { subscription, isLoading } = useAuth();
  const isPaid = !isLoading && (subscription?.isPaidSubscriber ?? false);
  const isTrial = !isLoading && (subscription?.isTrial ?? false);
  const hasFullAccess = isPaid;
  const usedPeptides = useUsedPeptides();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [evidenceFilter, setEvidenceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'evidence' | 'alpha' | 'favorites'>('default');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, toggleFavorite] = useFavorites();
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try { const s = sessionStorage.getItem('pptides_compare'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showCompare, setShowCompare] = useState(false);

  const [upsellPeptide, setUpsellPeptide] = useState<string | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem('pptides_compare', JSON.stringify(compareIds)); } catch { /* expected */ }
  }, [compareIds]);

  const handleLockedClick = useCallback((peptideId?: string) => {
    setUpsellPeptide(peptideId ?? null);
  }, []);

  const filtered = useMemo(() => {
    const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, '');
    const result = peptides.filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (evidenceFilter !== 'all' && p.evidenceLevel !== evidenceFilter) return false;
      if (search.trim()) {
        const q = stripDiacritics(search.trim().toLowerCase());
        return (
          stripDiacritics(p.nameAr).includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          stripDiacritics(p.summaryAr).includes(q) ||
          stripDiacritics(p.mechanismAr).includes(q) ||
          stripDiacritics(p.dosageAr).includes(q)
        );
      }
      return true;
    });
    if (sortBy === 'evidence') result.sort((a, b) => (evidenceOrder[a.evidenceLevel] ?? 5) - (evidenceOrder[b.evidenceLevel] ?? 5));
    if (sortBy === 'alpha') result.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    if (sortBy === 'favorites') result.sort((a, b) => (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0));
    return result;
  }, [activeCategory, search, evidenceFilter, sortBy, favorites]);

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>{`مكتبة الببتيدات | ${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة | pptides`}</title>
        <meta name="description" content={`تصفّح ${PEPTIDE_COUNT} ببتيد علاجي مع شرح مفصّل للآليات والجرعات والآثار الجانبية. Browse ${PEPTIDE_COUNT} therapeutic peptides with detailed protocols.`} />
        <meta property="og:locale" content="ar_SA" />
      </Helmet>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div
          className="mb-8 text-center"
        >
          <h1
            className="text-3xl font-bold md:text-4xl"
            
          >
            مكتبة الببتيدات
          </h1>
          <p className="mt-2 text-base text-stone-800">
            استكشف البروتوكولات المبنية على الأدلة العلمية
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div
          className="mb-6 flex flex-wrap gap-2 items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-700" />
            <input
              type="text"
              role="searchbox"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم العربي أو الإنجليزي..."
              className={cn(
                'w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 ps-10 pe-4',
                'text-sm text-stone-900 placeholder:text-stone-700',
                'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100',
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="مسح البحث"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-700 transition-colors hover:text-stone-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'default' | 'evidence' | 'alpha' | 'favorites')}
            aria-label="ترتيب"
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-auto"
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
                : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300',
            )}
          >
            <Filter className="h-4 w-4" />
            تصفية
          </button>
        </div>

        {/* Evidence Filter Dropdown */}
        <>
          {showFilters && (
            <div
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <label className="mb-2 block text-xs font-medium text-stone-800">
                  مستوى الدليل العلمي
                </label>
                <select
                  value={evidenceFilter}
                  onChange={(e) => setEvidenceFilter(e.target.value)}
                  aria-label="مستوى الدليل العلمي"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-auto"
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
        </>

        {/* Category Tabs */}
        <div
          className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide scroll-fade"
        >
          <div className="flex gap-2 pb-2 min-w-max">
            <button
              onClick={() => setActiveCategory('all')}
              aria-pressed={activeCategory === 'all'}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                activeCategory === 'all'
                  ? 'gold-gradient border-emerald-300 text-white'
                  : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300 hover:text-stone-800',
              )}
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
                  aria-pressed={active}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                    active
                      ? 'gold-gradient border-emerald-300 text-white'
                      : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300 hover:text-stone-800',
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {categoryLabels[cat.id]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count + Clear Filters */}
        <div className="mb-4 flex items-center justify-between text-sm text-stone-800">
          <span>{filtered.length} ببتيد</span>
          {(activeCategory !== 'all' || search.trim() !== '' || evidenceFilter !== 'all') && (
            <button
              onClick={() => { setActiveCategory('all'); setSearch(''); setEvidenceFilter('all'); setSortBy('default'); }}
              className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-3 w-3" />
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Peptide Grid */}
        {filtered.length > 0 ? (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((p) => (
                <PeptideCard
                  key={p.id}
                  peptide={p}
                  hasAccess={hasFullAccess || p.isFree || (isTrial && TRIAL_PEPTIDE_IDS.has(p.id))}
                  onLockedClick={() => handleLockedClick(p.id)}
                  isFav={favorites.has(p.id)}
                  onToggleFav={() => toggleFavorite(p.id)}
                  isCompare={compareIds.includes(p.id)}
                  onToggleCompare={() => setCompareIds(prev => {
                    if (prev.includes(p.id)) return prev.filter(x => x !== p.id);
                    if (prev.length >= 3) { toast('الحد الأقصى 3 ببتيدات للمقارنة'); return prev; }
                    return [...prev, p.id];
                  })}
                  isUsed={usedPeptides.has(p.nameEn)}
                />
              ))}

              {(!hasFullAccess) && (
                <div
                  className="md:col-span-2"
                >
                  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-8 text-center">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                    <span className="text-lg font-bold text-stone-900">
                      اكتشف البروتوكولات الكاملة لـ {PEPTIDE_COUNT} ببتيد
                    </span>
                    <p className="text-sm text-stone-800">مش متأكد وش يناسبك؟ اسأل المدرب الذكي — 3 أسئلة مجانية.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                        اشترك — {PRICING.essentials.label}/شهريًا
                      </Link>
                      <Link to="/coach" className="rounded-full border-2 border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">
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
                {search.trim() ? `لا توجد نتائج لـ "${search}"` : 'لا توجد نتائج للفلاتر المحددة'}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {search.trim() ? 'جرّب كلمات بحث مختلفة أو اسأل المدرب الذكي' : 'جرّب تغيير التصنيف أو مستوى الدليل'}
              </p>
              <Link to="/coach" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                <Bot className="h-4 w-4" />
                اسأل المدرب الذكي
              </Link>
            </div>
          )}
      </div>

      {/* Floating Compare Bar */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-white/95 backdrop-blur-lg px-6 py-3 shadow-xl md:bottom-6 animate-slide-up">
          <span className="text-sm font-bold text-stone-900">قارن {compareIds.length} ببتيدات</span>
          <div className="flex gap-1.5">
            {compareIds.map(id => {
              const p = peptides.find(x => x.id === id);
              return p ? <span key={id} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{p.nameAr}</span> : null;
            })}
          </div>
          <button onClick={() => setShowCompare(true)} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700">عرض المقارنة</button>
          <button onClick={() => setCompareIds([])} className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50">مسح</button>
        </div>
      )}

      {/* Compare Modal */}
      {showCompare && compareIds.length >= 2 && (() => {
        const items = compareIds.map(id => peptides.find(x => x.id === id)).filter((p): p is Peptide => p != null);
        const rows = [
          { label: 'الاسم العلمي', get: (p: Peptide) => p.nameEn },
          { label: 'التصنيف', get: (p: Peptide) => categoryLabels[p.category] },
          { label: 'الدليل العلمي', get: (p: Peptide) => evidenceLabels[p.evidenceLevel] },
          { label: 'الجرعة', get: (p: Peptide) => p.dosageAr },
          { label: 'طريقة الإعطاء', get: (p: Peptide) => p.administrationAr.split('.')[0] },
          { label: 'مدة الدورة', get: (p: Peptide) => p.cycleAr },
          { label: 'الأعراض الجانبية', get: (p: Peptide) => p.sideEffectsAr },
          { label: 'التكلفة', get: (p: Peptide) => p.costEstimate ?? '—' },
          { label: 'المستوى', get: (p: Peptide) => p.difficulty === 'beginner' ? 'مبتدئ' : p.difficulty === 'intermediate' ? 'متوسط' : 'متقدم' },
        ];
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowCompare(false)} role="dialog" aria-modal="true" aria-label="مقارنة ببتيدات">
            <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <div className="w-full max-w-4xl my-8 rounded-2xl bg-white shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
                <h2 className="text-lg font-bold text-stone-900">مقارنة ببتيدات</h2>
                <button onClick={() => setShowCompare(false)} className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-4 py-3 text-right text-xs font-bold text-stone-500 w-[160px]">المعيار</th>
                      {items.map(p => (
                        <th key={p.id} className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-stone-900">{p.nameAr}</p>
                          <p className="text-xs text-stone-500">{p.nameEn}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.label} className={cn('border-b border-stone-100', i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50')}>
                        <td className="px-4 py-3 text-xs font-bold text-stone-700">{row.label}</td>
                        {items.map(p => (
                          <td key={p.id} className="px-4 py-3 text-xs text-stone-800 leading-relaxed">{row.get(p)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </FocusTrap>
          </div>
        );
      })()}

      {/* Upsell Modal */}
      {upsellPeptide && (() => {
        const p = peptides.find(x => x.id === upsellPeptide);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setUpsellPeptide(null)} role="dialog" aria-modal="true" aria-label="اشترك لفتح البروتوكول">
            <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center animate-fade-in" onClick={e => e.stopPropagation()}>
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
                افتح البروتوكول — {PRICING.essentials.label}/شهريًا
              </Link>
              <Link
                to="/coach"
                onClick={() => setUpsellPeptide(null)}
                className="text-sm text-emerald-600 hover:underline"
              >
                أو اسأل المدرب الذكي عن {p.nameAr} مجانًا
              </Link>
            </div>
            </FocusTrap>
          </div>
        );
      })()}
    </div>
  );
}
