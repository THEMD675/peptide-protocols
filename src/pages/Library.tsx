import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
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
  Bookmark,
  BookmarkCheck,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { peptides, categories, type Peptide } from '@/data/peptides';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PRICING, PEPTIDE_COUNT, TRIAL_PEPTIDE_IDS, FREE_PEPTIDE_IDS, SITE_URL } from '@/lib/constants';
import { categoryIcons, evidenceColors, evidenceLabels, evidenceDescriptions, categoryLabels, evidenceOrder } from '@/lib/peptide-labels';

const GOAL_CATEGORY_MAP: Record<string, string> = {
  'weight-loss': 'metabolic',
  'muscle': 'recovery',
  'anti-aging': 'longevity',
  'recovery': 'recovery',
  'sleep': 'longevity',
  'immunity': 'longevity',
  'skin': 'skin-gut',
  'general': 'recovery',
};

const GOAL_LABELS: Record<string, string> = {
  'weight-loss': 'فقدان الوزن',
  'muscle': 'بناء عضل',
  'anti-aging': 'مقاومة الشيخوخة',
  'recovery': 'تعافي وإصابات',
  'sleep': 'تحسين النوم',
  'immunity': 'تعزيز المناعة',
  'skin': 'بشرة وأمعاء',
  'general': 'صحة عامة',
};

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
        'relative h-full overflow-hidden rounded-2xl border p-5 shadow-sm dark:shadow-stone-900/30 card-hover active:scale-[0.98]',
        hasAccess
          ? 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 hover:border-emerald-300 dark:border-emerald-700 hover:shadow-lg hover:shadow-emerald-600/10'
          : 'border-stone-200 dark:border-stone-600 bg-stone-50/50 hover:border-stone-300 dark:border-stone-600',
        isFav && 'border-s-4 border-s-emerald-400',
      )}
    >
      {/* Top action bar — in flow, no absolute positioning */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {!hasAccess && !peptide.isFree && (
            <Lock className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />
          )}
          {peptide.isFree && !hasAccess && (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">مجاني</span>
          )}
          {peptide.fdaApproved && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              <CheckCircle className="h-3 w-3" />
              FDA
            </span>
          )}
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(); }}
            className={cn('flex items-center gap-1 rounded-full px-2.5 py-1.5 min-h-[44px] text-xs font-medium transition-colors', isCompare ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:text-stone-300')}
            aria-label={isCompare ? 'إزالة من المقارنة' : 'إضافة للمقارنة'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            {isCompare ? 'مُختار' : 'قارن'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
            className="rounded-full p-2.5 min-h-[44px] min-w-[44px] transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label={isFav ? 'إزالة من المحفوظات' : 'إضافة للمحفوظات'}
          >
            {isFav ? <BookmarkCheck className="h-4 w-4 text-emerald-700" /> : <Bookmark className="h-4 w-4 text-stone-300" />}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <h3
          className={cn(
            'text-lg font-bold transition-colors truncate',
            hasAccess
              ? 'text-stone-900 dark:text-stone-100 group-hover:text-emerald-700'
              : 'text-stone-900 dark:text-stone-100',
          )}
        >
          {peptide.nameAr}
        </h3>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="min-w-0 text-xs text-stone-800 dark:text-stone-200 truncate">{peptide.nameEn}</p>
          {isUsed && <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">مستخدم</span>}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-full border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-200">
          {Icon && <Icon className="h-3 w-3" />}
          {categoryLabels[peptide.category]}
        </span>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium',
            evidenceColors[peptide.evidenceLevel],
          )}
          title={evidenceDescriptions[peptide.evidenceLevel]}
        >
          {evidenceLabels[peptide.evidenceLevel]}
        </span>
      </div>

      {(hasAccess || peptide.isFree) ? (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
          {peptide.summaryAr}
        </p>
      ) : (
        <div
          className="relative mb-4 max-h-12 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_20%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_20%,transparent_100%)]"
        >
          <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
            {peptide.summaryAr.slice(0, 40)}...
          </p>
        </div>
      )}

      {(hasAccess || peptide.isFree) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
            <FlaskConical className="h-3 w-3" />
            <span className="text-xs">{peptide.administrationAr.split('.')[0]}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {peptide.difficulty && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold border',
                peptide.difficulty === 'beginner' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                peptide.difficulty === 'intermediate' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              )}>
                {peptide.difficulty === 'beginner' ? 'مبتدئ' : peptide.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
              </span>
            )}
            {peptide.costEstimate && (
              <span className="text-xs font-bold text-emerald-700" dir="ltr">{peptide.costEstimate}</span>
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

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLockedClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onLockedClick}
      onKeyDown={handleEnter}
      className="block h-full w-full cursor-pointer text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 rounded-2xl"
    >
      {cardContent}
    </div>
  );
});

// Bookmarks now powered by useBookmarks hook (Supabase for logged-in, localStorage fallback)

function useUsedPeptides() {
  const { user } = useAuth();
  const [used, setUsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from('injection_logs').select('peptide_name').eq('user_id', user.id).limit(500).then(({ data }) => {
      if (mounted && data) setUsed(new Set(data.map(d => d.peptide_name)));
    }).catch(() => { if (mounted) /* silently ignored — non-critical */; });
    return () => { mounted = false; };
  }, [user]);
  return used;
}

export default function Library() {
  const { subscription, isLoading } = useAuth();
  const isPaid = !isLoading && (subscription?.isPaidSubscriber ?? false);
  const isTrial = !isLoading && (subscription?.isTrial ?? false);
  const hasFullAccess = isPaid || isTrial;
  const usedPeptides = useUsedPeptides();

  const [searchParams, setSearchParams] = useSearchParams();
  const validCategories = ['all', 'free', 'bookmarks', ...categories.map(c => c.id)];
  const validEvidence = ['all', 'excellent', 'strong', 'good', 'moderate', 'weak', 'very-weak'];
  const validSorts = ['default', 'evidence', 'alpha', 'favorites'] as const;
  const [activeCategory, setActiveCategory] = useState(() => {
    const c = searchParams.get('category') ?? 'all';
    return validCategories.includes(c) ? c : 'all';
  });
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [evidenceFilter, setEvidenceFilter] = useState(() => {
    const e = searchParams.get('evidence') ?? 'all';
    return validEvidence.includes(e) ? e : 'all';
  });
  const [sortBy, setSortBy] = useState<'default' | 'evidence' | 'alpha' | 'favorites'>(() => {
    const s = searchParams.get('sort') as 'default' | 'evidence' | 'alpha' | 'favorites';
    return (validSorts as readonly string[]).includes(s) ? s : 'default';
  });

  // Consolidated URL↔state sync: state→URL on change; URL→state only when URL differs (e.g. back/forward)
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (search.trim()) params.set('q', search.trim());
    if (evidenceFilter !== 'all') params.set('evidence', evidenceFilter);
    if (sortBy !== 'default') params.set('sort', sortBy);
    const next = params.toString();
    const curr = searchParams.toString();
    if (next !== curr) setSearchParams(params, { replace: true });
  }, [activeCategory, search, evidenceFilter, sortBy, setSearchParams, searchParams]);

  useEffect(() => {
    const urlCategory = searchParams.get('category') ?? 'all';
    const urlSearch = searchParams.get('q') ?? '';
    const urlEvidence = searchParams.get('evidence') ?? 'all';
    const urlSort = (searchParams.get('sort') as 'default' | 'evidence' | 'alpha' | 'favorites') ?? 'default';
    const safeCategory = validCategories.includes(urlCategory) ? urlCategory : 'all';
    const safeEvidence = validEvidence.includes(urlEvidence) ? urlEvidence : 'all';
    const safeSort = (validSorts as readonly string[]).includes(urlSort) ? urlSort : 'default';
    if (safeCategory !== activeCategory || urlSearch !== search || safeEvidence !== evidenceFilter || safeSort !== sortBy) {
      setActiveCategory(safeCategory);
      setSearch(urlSearch);
      setEvidenceFilter(safeEvidence);
      setSortBy(safeSort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL→state sync, avoid loop
  }, [searchParams]);
  const [quizGoalFilter, setQuizGoalFilter] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('category')) return;
    try {
      const raw = localStorage.getItem('pptides_quiz_results');
      if (!raw) return;
      const { goal } = JSON.parse(raw);
      if (!goal) return;
      const cat = GOAL_CATEGORY_MAP[goal];
      if (cat && validCategories.includes(cat)) {
        setActiveCategory(cat);
        setQuizGoalFilter(goal);
      }
    } catch { /* expected */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showFilters, setShowFilters] = useState(false);
  const { bookmarks: favorites, toggle: toggleFavorite } = useBookmarks();
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try { const s = sessionStorage.getItem('pptides_compare'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showCompare, setShowCompare] = useState(false);

  const [upsellPeptide, setUpsellPeptide] = useState<string | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem('pptides_compare', JSON.stringify(compareIds)); } catch { /* expected */ }
  }, [compareIds]);

  useEffect(() => {
    if (!showCompare) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCompare(false); };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [showCompare]);

  useEffect(() => {
    if (!upsellPeptide) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setUpsellPeptide(null); };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [upsellPeptide]);

  const handleLockedClick = useCallback((peptideId?: string) => {
    setUpsellPeptide(peptideId ?? null);
  }, []);

  const filtered = useMemo(() => {
    const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, '');
    const result = peptides.filter((p) => {
      if (activeCategory === 'bookmarks') {
        if (!favorites.has(p.id)) return false;
      } else if (activeCategory === 'free') {
        if (!FREE_PEPTIDE_IDS.has(p.id)) return false;
      } else if (activeCategory !== 'all' && p.category !== activeCategory) return false;
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
    <div className="min-h-screen animate-fade-in" >
      <Helmet>
        <title>{`مكتبة الببتيدات | ${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة | pptides`}</title>
        <meta name="description" content={`تصفّح ${PEPTIDE_COUNT} ببتيد علاجي مع شرح مفصّل للآليات والجرعات والآثار الجانبية. Browse ${PEPTIDE_COUNT} therapeutic peptides with detailed protocols.`} />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:title" content={`مكتبة الببتيدات | ${PEPTIDE_COUNT} ببتيد علاجي | pptides`} />
        <meta property="og:description" content={`تصفّح ${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة وحاسبة جرعات.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/library`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/library`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`مكتبة الببتيدات | ${PEPTIDE_COUNT} ببتيد علاجي | pptides`} />
        <meta name="twitter:description" content={`تصفّح ${PEPTIDE_COUNT} ببتيد علاجي مع بروتوكولات كاملة وحاسبة جرعات.`} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "مكتبة الببتيدات العلاجية",
          "description": `${PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة مبنية على الأدلة العلمية`,
          "numberOfItems": PEPTIDE_COUNT,
          "itemListElement": peptides.slice(0, 10).map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": p.nameAr,
            "url": `${SITE_URL}/peptide/${p.id}`
          }))
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div
          className="mb-10 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <FlaskConical className="h-7 w-7 text-emerald-700" />
          </div>
          <h1
            className="text-3xl font-bold md:text-4xl"
          >
            مكتبة الببتيدات
          </h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
            استكشف البروتوكولات المبنية على الأدلة العلمية
          </p>
        </div>

        {/* Recommended for you */}
        {(() => {
          let quizGoal: string | null = null;
          try { const q = localStorage.getItem('pptides_quiz_results'); if (q) { const parsed = JSON.parse(q); quizGoal = parsed.goal; } } catch { /* expected */ }
          let recentIds: string[] = [];
          try { const r = localStorage.getItem('pptides_recent_peptides'); if (r) recentIds = JSON.parse(r); } catch { /* expected */ }
          const goalMap: Record<string, string> = { 'weight-loss': 'metabolic', muscle: 'recovery', 'anti-aging': 'longevity', recovery: 'recovery', sleep: 'longevity', immunity: 'longevity', skin: 'skin-gut', general: 'recovery' };
          const category = quizGoal ? goalMap[quizGoal] : null;
          const recommended = category ? peptides.filter(p => p.category === category && !recentIds.includes(p.id)).slice(0, 3) : [];
          if (recommended.length === 0 && recentIds.length === 0) return null;
          const recentPeptides = recentIds.slice(0, 3).map(id => peptides.find(p => p.id === id)).filter(Boolean);
          return (
            <div className="mb-6">
              {recommended.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-2">مُوصى لك بناءً على هدفك</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recommended.map(p => (
                      <Link key={p!.id} to={`/peptide/${p!.id}`} className="shrink-0 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:bg-emerald-900/30 transition-colors whitespace-nowrap">
                        {p!.nameAr}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {recentPeptides.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-2">شاهدت مؤخرًا</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recentPeptides.map(p => (
                      <Link key={p!.id} to={`/peptide/${p!.id}`} className="shrink-0 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors whitespace-nowrap">
                        {p!.nameAr}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Search & Filter Bar */}
        <div
          className="mb-6 flex flex-wrap gap-2 items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-700 dark:text-stone-200" />
            <input
              type="text"
              role="searchbox"
              aria-label="البحث في المكتبة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن ببتيد..."
              className={cn(
                'w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 py-2.5 ps-10 pe-4',
                'text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300',
                'transition-colors focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900',
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="مسح البحث"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-700 dark:text-stone-200 transition-colors hover:text-stone-800 dark:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'default' | 'evidence' | 'alpha' | 'favorites')}
            aria-label="ترتيب"
            className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2.5 text-sm text-stone-800 dark:text-stone-200 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 sm:w-auto"
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
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 transition-colors hover:border-stone-300 dark:border-stone-600',
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
              <div className="rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-4">
                <label className="mb-2 block text-xs font-medium text-stone-800 dark:text-stone-200">
                  مستوى الدليل العلمي
                </label>
                <select
                  value={evidenceFilter}
                  onChange={(e) => setEvidenceFilter(e.target.value)}
                  aria-label="مستوى الدليل العلمي"
                  className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 sm:w-auto"
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

        {/* Best First Cycle — beginner section */}
        {(() => {
          const beginnerIds = ['bpc-157', 'semaglutide', 'epithalon'] as const;
          const beginnerPeptides = beginnerIds.map(id => peptides.find(p => p.id === id)).filter(Boolean) as Peptide[];
          if (beginnerPeptides.length === 0) return null;
          return (
            <div className="mb-8">
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-3">أفضل دورة أولى</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {beginnerPeptides.map(p => (
                  <Link key={p.id} to={`/peptide/${p.id}`} className="shrink-0 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:bg-emerald-900/30 transition-colors whitespace-nowrap flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {p.nameAr}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Quiz goal filter banner */}
        {quizGoalFilter && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              عرض النتائج بناءً على هدفك: <span className="font-bold">{GOAL_LABELS[quizGoalFilter] ?? quizGoalFilter}</span>
            </p>
            <button
              onClick={() => { setQuizGoalFilter(null); setActiveCategory('all'); }}
              className="shrink-0 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-950 px-3 py-2 min-h-[44px] text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30"
            >
              عرض الكل
            </button>
          </div>
        )}

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
                  ? 'primary-gradient border-emerald-300 dark:border-emerald-700 text-white'
                  : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:border-stone-600 transition-colors hover:text-stone-800 dark:text-stone-200',
              )}
            >
              الكل
            </button>
            <button
              onClick={() => setActiveCategory('free')}
              aria-pressed={activeCategory === 'free'}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                activeCategory === 'free'
                  ? 'primary-gradient border-emerald-300 dark:border-emerald-700 text-white'
                  : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:border-stone-600 transition-colors hover:text-stone-800 dark:text-stone-200',
              )}
            >
              مجاني
            </button>
            <button
              onClick={() => setActiveCategory('bookmarks')}
              aria-pressed={activeCategory === 'bookmarks'}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                activeCategory === 'bookmarks'
                  ? 'primary-gradient border-emerald-300 dark:border-emerald-700 text-white'
                  : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:border-stone-600 transition-colors hover:text-stone-800 dark:text-stone-200',
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              المحفوظات
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
                      ? 'primary-gradient border-emerald-300 dark:border-emerald-700 text-white'
                      : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:border-stone-600 transition-colors hover:text-stone-800 dark:text-stone-200',
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
        <div className="mb-4 flex items-center justify-between text-sm text-stone-800 dark:text-stone-200">
          <span>{filtered.length} ببتيد</span>
          {(activeCategory !== 'all' || search.trim() !== '' || evidenceFilter !== 'all') && (
            <button
              onClick={() => { setActiveCategory('all'); setSearch(''); setEvidenceFilter('all'); setSortBy('default'); }}
              className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-1.5 min-h-[44px] text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:border-red-200 dark:border-red-800 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-600 dark:text-red-400"
            >
              <X className="h-3 w-3" />
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Peptide Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-600 p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1"><div className="h-6 w-32 rounded bg-stone-200 dark:bg-stone-700" /><div className="h-4 w-24 rounded bg-stone-100 dark:bg-stone-800" /></div>
                  <div className="h-8 w-16 rounded-full bg-stone-100 dark:bg-stone-800" />
                </div>
                <div className="flex gap-2"><div className="h-6 w-20 rounded-full bg-stone-100 dark:bg-stone-800" /><div className="h-6 w-16 rounded-full bg-stone-100 dark:bg-stone-800" /></div>
                <div className="h-10 w-full rounded bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-40 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
            <>
            <h2 className="sr-only">قائمة الببتيدات</h2>
            <div
              className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
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
                  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-8 text-center">
                    <Sparkles className="h-6 w-6 text-emerald-700" />
                    <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      اكتشف البروتوكولات الكاملة لـ {PEPTIDE_COUNT} ببتيد
                    </span>
                    <p className="text-sm text-stone-800 dark:text-stone-200">لست متأكدًا من اختيارك؟ اسأل المدرب الذكي — 3 أسئلة مجانية.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link to="/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                        اشترك — {PRICING.essentials.label}/شهريًا
                      </Link>
                      <Link to="/coach" className="rounded-full border-2 border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">
                        اسأل المدرب الذكي
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <FlaskConical className="mb-4 h-12 w-12 text-stone-500 dark:text-stone-300" />
              <p className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                {search.trim() ? `لا توجد نتائج لـ "${search}"` : 'لا توجد نتائج للفلاتر المحددة'}
              </p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-950/95 backdrop-blur-lg px-6 py-3 shadow-xl dark:shadow-stone-900/40 md:bottom-6 animate-slide-up">
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">قارن {compareIds.length} ببتيدات</span>
          <div className="flex gap-1.5">
            {compareIds.map(id => {
              const p = peptides.find(x => x.id === id);
              return p ? <span key={id} className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{p.nameAr}</span> : null;
            })}
          </div>
          <Link to={`/compare?${compareIds.map((id, i) => `p${i + 1}=${id}`).join('&')}`} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700">عرض المقارنة</Link>
          <button onClick={() => setCompareIds([])} className="rounded-xl border border-stone-200 dark:border-stone-600 px-3 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">مسح</button>
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
            <div className="w-full max-w-4xl my-8 rounded-2xl bg-white dark:bg-stone-950 shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-600 px-6 py-4">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">مقارنة ببتيدات</h2>
                <button onClick={() => setShowCompare(false)} aria-label="إغلاق" className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"><X className="h-5 w-5" /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
                      <th scope="col" className="px-4 py-3 text-start text-xs font-bold text-stone-500 dark:text-stone-300 w-[160px]">المعيار</th>
                      {items.map(p => (
                        <th key={p.id} scope="col" className="px-4 py-3 text-start">
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-300">{p.nameEn}</p>
                          <Link
                            to={`/calculator?preset=${encodeURIComponent(p.nameEn)}`}
                            onClick={() => setShowCompare(false)}
                            className="text-xs text-emerald-700 hover:underline"
                          >
                            احسب الجرعة
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.label} className={cn('border-b border-stone-100 dark:border-stone-800', i % 2 === 0 ? 'bg-white dark:bg-stone-950' : 'bg-stone-50/50')}>
                        <th scope="row" className="px-4 py-3 text-xs font-bold text-stone-700 dark:text-stone-200">{row.label}</th>
                        {items.map(p => (
                          <td key={p.id} className="px-4 py-3 text-xs text-stone-800 dark:text-stone-200 leading-relaxed">{row.get(p)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-center gap-3 border-t border-stone-200 dark:border-stone-600 px-6 py-4">
                <Link
                  to={`/interactions?p1=${compareIds[0]}&p2=${compareIds[1]}`}
                  onClick={() => setShowCompare(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:bg-emerald-900/20"
                >
                  فحص التعارضات بين هذه الببتيدات
                </Link>
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
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-950 p-6 sm:p-8 shadow-2xl text-center animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Lock className="h-7 w-7 text-emerald-700" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</h3>
              <p className="mb-1 text-sm text-stone-500 dark:text-stone-300" dir="ltr">{p.nameEn}</p>
              <p className="mb-4 text-sm text-stone-700 dark:text-stone-200 leading-relaxed line-clamp-2">{p.summaryAr}</p>
              <div className="mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                <p className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold mb-1">البروتوكول الكامل يتضمن:</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">الجرعة الدقيقة • التوقيت المثالي • الأعراض الجانبية • التجميعات • التخزين • التحاليل المطلوبة</p>
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
                className="text-sm text-emerald-700 hover:underline"
              >
                أو اسأل المدرب الذكي عن {p.nameAr} مجانًا
              </Link>
              {(() => {
                const related = peptides.filter(x => x.isFree && x.id !== p.id && x.category === p.category).slice(0, 2);
                const fallback = related.length === 0 ? peptides.filter(x => x.isFree && x.id !== p.id).slice(0, 2) : related;
                if (fallback.length === 0) return null;
                return (
                  <div className="mt-4 border-t border-stone-100 dark:border-stone-800 pt-4">
                    <p className="mb-2 text-xs font-bold text-stone-500 dark:text-stone-300">ببتيدات مجانية يمكنك تصفّحها:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {fallback.map(f => (
                        <Link key={f.id} to={`/peptide/${f.id}`} onClick={() => setUpsellPeptide(null)} className="rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 min-h-[44px] inline-flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30">
                          {f.nameAr}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            </FocusTrap>
          </div>
        );
      })()}
    </div>
  );
}
