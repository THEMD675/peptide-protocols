import { useEffect, useState, useMemo } from 'react';
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
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, slug, title_ar, excerpt_ar, published_at, tags, cover_image_url')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (fetchError) {
        setError(true);
      } else {
        setPosts(data ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

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
          <p className="mt-2 text-base text-stone-600">مقالات ودلائل مبنية على الأدلة العلمية</p>
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
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pe-4 ps-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-stone-600"
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
                      'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                      !activeTag
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-200'
                    )}
                  >
                    الكل
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                        activeTag === tag
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-200'
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
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 bg-white p-6">
                <div className="h-5 w-3/4 rounded bg-stone-200" />
                <div className="mt-3 h-4 w-full rounded bg-stone-100" />
                <div className="mt-2 h-4 w-2/3 rounded bg-stone-100" />
                <div className="mt-4 h-3 w-24 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-800">تعذّر تحميل المقالات</p>
            <p className="mt-2 text-sm text-red-600">حاول تحديث الصفحة</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
            <p className="font-bold text-stone-700">لا توجد مقالات حاليًا</p>
            <p className="mt-2 text-sm text-stone-500">سنضيف مقالات جديدة قريبًا</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
            <p className="font-bold text-stone-700">لا توجد نتائج</p>
            <p className="mt-2 text-sm text-stone-500">جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر</p>
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
                className="block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
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
                  <h2 className="text-lg font-bold text-stone-900">{post.title_ar}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{post.excerpt_ar}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-stone-500">
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
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700'
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
