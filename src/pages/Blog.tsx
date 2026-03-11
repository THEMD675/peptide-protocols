import { useEffect, useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, CalendarDays, Tag, Search, X, ArrowLeft } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { GenericPageSkeleton } from '@/components/Skeletons';

interface BlogPost {
  id: string;
  slug: string;
  title_ar: string;
  excerpt_ar: string;
  published_at: string;
  tags: string[];
  cover_image_url: string | null;
}

const BLOG_PAGE_SIZE = 12;

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<false | 'offline' | 'fetch'>(false);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const fetchPosts = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    if (!navigator.onLine) {
      // Try cache when offline
      try {
        const cached = localStorage.getItem('pptides_cache_blog_posts');
        if (cached) {
          const { data } = JSON.parse(cached) as { data: BlogPost[] };
          setPosts(data);
          setHasMore(false);
          setLoading(false);
          return () => { cancelled = true; };
        }
      } catch { /* ignore */ }
      setError('offline');
      setLoading(false);
      return () => { cancelled = true; };
    }

    (async () => {
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, slug, title_ar, excerpt_ar, published_at, tags, cover_image_url')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(BLOG_PAGE_SIZE);

      if (cancelled) return;
      if (fetchError) {
        // Try cache as fallback
        try {
          const cached = localStorage.getItem('pptides_cache_blog_posts');
          if (cached) {
            const { data: cachedData } = JSON.parse(cached) as { data: BlogPost[] };
            setPosts(cachedData);
            setHasMore(false);
            setLoading(false);
            return;
          }
        } catch { /* ignore */ }
        setError('fetch');
      } else {
        setPosts(data ?? []);
        setHasMore((data ?? []).length === BLOG_PAGE_SIZE);
        // Cache for offline use
        try { localStorage.setItem('pptides_cache_blog_posts', JSON.stringify({ ts: Date.now(), data: data ?? [] })); } catch { /* quota */ }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    const { data } = await supabase
      .from('blog_posts')
      .select('id, slug, title_ar, excerpt_ar, published_at, tags, cover_image_url')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .lt('published_at', lastPost.published_at)
      .limit(BLOG_PAGE_SIZE);
    if (data) {
      setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === BLOG_PAGE_SIZE);
      // Update cache
      try {
        const cached = localStorage.getItem('pptides_cache_blog_posts');
        const existing = cached ? (JSON.parse(cached) as { data: BlogPost[] }).data : [];
        const merged = [...existing, ...data];
        localStorage.setItem('pptides_cache_blog_posts', JSON.stringify({ ts: Date.now(), data: merged }));
      } catch { /* quota */ }
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts]);

  useEffect(() => {
    const cleanup = fetchPosts();
    return cleanup;
  }, [fetchPosts]);

  // Collect unique tags from all posts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [posts]);

  // Filter by search + active tag
  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter(p => {
      const matchesTag = !activeTag || p.tags?.includes(activeTag);
      const matchesSearch =
        !q ||
        p.title_ar.toLowerCase().includes(q) ||
        p.excerpt_ar?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q));
      return matchesTag && matchesSearch;
    });
  }, [posts, search, activeTag]);

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>المدونة | مقالات عن الببتيدات العلاجية | pptides</title>
        <meta name="description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية — بروتوكولات، آليات عمل، أبحاث علمية محدّثة، وأدلة سريرية. المصدر العربي الأول لعلم الببتيدات." />
        <meta property="og:title" content="المدونة | pptides" />
        <meta property="og:description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية باللغة العربية." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="المدونة | pptides" />
        <meta name="twitter:description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية باللغة العربية." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'مدونة pptides',
          url: `${SITE_URL}/blog`,
          inLanguage: 'ar',
          description: 'مقالات ودلائل شاملة عن الببتيدات العلاجية باللغة العربية.',
          publisher: { '@type': 'Organization', name: 'pptides', url: SITE_URL },
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <FileText className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">المدونة</h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-300">مقالات ودلائل مبنية على الأدلة العلمية</p>
        </div>

        {/* Search + Tag Filter */}
        {!loading && !error && posts.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث في المقالات..."
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 py-2.5 pe-4 ps-10 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-emerald-400 dark:focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-colors min-h-[44px]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-stone-600 dark:text-stone-300"
                  aria-label="مسح البحث"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tag filter pills */}
            {allTags.length > 0 && (
              <div className="-mx-4 overflow-x-auto px-4">
                <div className="flex flex-nowrap gap-2 pb-1">
                  <button
                    onClick={() => setActiveTag(null)}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                      !activeTag
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                        : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-200 dark:border-emerald-800'
                    )}
                  >
                    الكل
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                        activeTag === tag
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                          : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-200 dark:border-emerald-800'
                      )}
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                {/* Cover image placeholder — matches the h-48 actual image */}
                <div className="h-48 w-full animate-pulse rounded-t-2xl bg-stone-200 dark:bg-stone-700 skeleton-shimmer sm:h-56" />
                <div className="p-6 space-y-3">
                  <div className="h-5 w-3/4 rounded-lg animate-pulse bg-stone-200 dark:bg-stone-700 skeleton-shimmer" />
                  <div className="h-4 w-full rounded-lg animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
                  <div className="h-4 w-2/3 rounded-lg animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-3 w-24 rounded animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
                    <div className="h-5 w-16 rounded-full animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            dir="rtl"
            role="alert"
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center ${
              error === 'offline'
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <p className={`font-bold text-lg ${error === 'offline' ? 'text-amber-800 dark:text-amber-200' : 'text-red-800 dark:text-red-200'}`}>
              {error === 'offline' ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر تحميل المقالات'}
            </p>
            <p className={`text-sm ${error === 'offline' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {error === 'offline' ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى' : 'حدث خطأ أثناء تحميل البيانات — حاول مرة أخرى'}
            </p>
            <button
              onClick={fetchPosts}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bold text-white transition-colors ${
                error === 'offline' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              حاول مرة أخرى
            </button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/50 px-8 py-14 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800">
              <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">لا توجد مقالات بعد</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-300">
              نعمل على كتابة مقالات علمية عميقة عن الببتيدات العلاجية. ترقّب المحتوى قريبًا.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/library" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700">
                تصفّح مكتبة الببتيدات
              </Link>
              <Link to="/coach" className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-6 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700">
                اسأل المدرب الذكي
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-8 text-center">
            <p className="font-bold text-stone-700 dark:text-stone-200">لا توجد نتائج</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-300">جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر</p>
            <button
              onClick={() => { setSearch(''); setActiveTag(null); }}
              className="mt-3 text-sm font-bold text-emerald-700 hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}

        {!loading && !error && filteredPosts.length > 0 && (
          <div className="space-y-5">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group block overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm dark:shadow-stone-900/40 blog-card transition-all duration-300 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <article>
                  {post.cover_image_url && (
                    <div className="overflow-hidden">
                    <img
                      src={post.cover_image_url}
                      alt={post.title_ar}
                      className="blog-card-img h-48 w-full object-cover sm:h-56"
                      loading="lazy"
                      decoding="async"
                      width="800"
                      height="192"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    </div>
                  )}
                  <div className="p-6">
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{post.title_ar}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{post.excerpt_ar}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-300">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <time dateTime={post.published_at}>
                          {new Date(post.published_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </time>
                      </div>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />
                          {post.tags.map(tag => (
                            <span
                              key={tag}
                              onClick={e => { e.preventDefault(); setActiveTag(tag === activeTag ? null : tag); }}
                              className={cn(
                                'cursor-pointer rounded-full px-2 py-0.5 transition-colors',
                                activeTag === tag
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400'
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 group-hover:gap-2 transition-all">
                      اقرأ المقالة
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  </div>
                </article>
              </Link>
            ))}
            {hasMore && !search && !activeTag && (
              <div className="pt-2 text-center">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-8 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm disabled:opacity-50"
                >
                  {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/library"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            تصفّح مكتبة الببتيدات
          </Link>
        </div>
      </div>
    </div>
  );
}
