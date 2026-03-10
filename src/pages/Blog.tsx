import { useEffect, useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, CalendarDays, Tag, Search, X } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface BlogPost {
  id: string;
  slug: string;
  title_ar: string;
  excerpt_ar: string;
  published_at: string;
  tags: string[];
  cover_image_url: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
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
        .limit(50);

      if (cancelled) return;
      if (fetchError) {
        // Try cache as fallback
        try {
          const cached = localStorage.getItem('pptides_cache_blog_posts');
          if (cached) {
            const { data: cachedData } = JSON.parse(cached) as { data: BlogPost[] };
            setPosts(cachedData);
            setLoading(false);
            return;
          }
        } catch { /* ignore */ }
        setError('fetch');
      } else {
        setPosts(data ?? []);
        // Cache for offline use
        try { localStorage.setItem('pptides_cache_blog_posts', JSON.stringify({ ts: Date.now(), data: data ?? [] })); } catch { /* quota */ }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

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

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <FileText className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">المدونة</h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-400">مقالات ودلائل مبنية على الأدلة العلمية</p>
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
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-2.5 pe-4 ps-10 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-stone-600 dark:text-stone-400"
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
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-emerald-200 dark:border-emerald-800'
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
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-emerald-200 dark:border-emerald-800'
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
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6">
                <div className="h-5 w-3/4 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="mt-3 h-4 w-full rounded bg-stone-100 dark:bg-stone-800" />
                <div className="mt-2 h-4 w-2/3 rounded bg-stone-100 dark:bg-stone-800" />
                <div className="mt-4 h-3 w-24 rounded bg-stone-100 dark:bg-stone-800" />
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
          <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-8 text-center">
            <p className="font-bold text-stone-700 dark:text-stone-300">لا توجد مقالات حاليًا</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">سنضيف مقالات جديدة قريبًا</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-8 text-center">
            <p className="font-bold text-stone-700 dark:text-stone-300">لا توجد نتائج</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر</p>
            <button
              onClick={() => { setSearch(''); setActiveTag(null); }}
              className="mt-3 text-sm font-bold text-emerald-600 hover:underline"
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
                className="block overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 shadow-sm dark:shadow-stone-900/30 card-hover"
              >
                <article>
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt={post.title_ar}
                      className="h-48 w-full object-cover sm:h-56"
                      loading="lazy"
                      width="800"
                      height="192"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="p-6">
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{post.title_ar}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{post.excerpt_ar}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                                : 'bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:bg-emerald-900/20 hover:text-emerald-700 dark:text-emerald-400'
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/library"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
          >
            تصفّح مكتبة الببتيدات
          </Link>
        </div>
      </div>
    </div>
  );
}
