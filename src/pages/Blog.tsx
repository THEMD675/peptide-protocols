import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, CalendarDays, Tag } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, slug, title_ar, excerpt_ar, published_at, tags, cover_image_url')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('Blog fetch error:', fetchError);
        setError(true);
      } else {
        setPosts(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>المدونة | مقالات عن الببتيدات العلاجية | pptides</title>
        <meta name="description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية، البروتوكولات، والأبحاث العلمية باللغة العربية." />
        <meta property="og:title" content="المدونة | pptides" />
        <meta property="og:description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية باللغة العربية." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="المدونة | pptides" />
        <meta name="twitter:description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية باللغة العربية." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
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

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-5">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <article>
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
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {post.tags.join('، ')}
                      </div>
                    )}
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
