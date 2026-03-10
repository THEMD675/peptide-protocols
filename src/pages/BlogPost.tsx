import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CalendarDays, User, Tag, Link2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/constants';
import { renderMarkdown } from '@/lib/markdown';
import type { ReactNode } from 'react';
import { GenericPageSkeleton } from '@/components/Skeletons';

interface BlogPostData {
  id: string;
  slug: string;
  title_ar: string;
  content_ar: string;
  excerpt_ar: string;
  author: string;
  published_at: string;
  cover_image_url: string | null;
  tags: string[];
}

interface RelatedPost {
  id: string;
  slug: string;
  title_ar: string;
  excerpt_ar: string;
  published_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, slug, title_ar, content_ar, excerpt_ar, author, published_at, cover_image_url, tags')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (cancelled) return;
      if (fetchError || !data) {
        setError(true);
      } else {
        setPost(data);
        // Fetch related posts (other published posts excluding this one)
        const { data: related } = await supabase
          .from('blog_posts')
          .select('id, slug, title_ar, excerpt_ar, published_at')
          .eq('is_published', true)
          .neq('id', data.id)
          .order('published_at', { ascending: false })
          .limit(3);
        if (!cancelled && related) setRelatedPosts(related);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <GenericPageSkeleton />;

  if (error || !post) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <h2 className="mb-3 text-2xl font-bold text-stone-900">المقالة غير موجودة</h2>
        <p className="mb-6 text-stone-600">لم نتمكن من العثور على هذه المقالة. قد تكون محذوفة أو غير منشورة.</p>
        <Link to="/blog" className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors">
          العودة للمدونة
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>{post.title_ar} | مدونة pptides</title>
        <meta name="description" content={post.excerpt_ar} />
        <meta property="og:title" content={post.title_ar} />
        <meta property="og:description" content={post.excerpt_ar} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/blog/${post.slug}`} />
        <meta property="og:image" content={post.cover_image_url || `${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta property="article:published_time" content={post.published_at} />
        <link rel="canonical" href={`${SITE_URL}/blog/${post.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title_ar} />
        <meta name="twitter:description" content={post.excerpt_ar} />
        <meta name="twitter:image" content={post.cover_image_url || `${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title_ar,
          description: post.excerpt_ar,
          url: `${SITE_URL}/blog/${post.slug}`,
          image: post.cover_image_url || `${SITE_URL}/og-image.jpg`,
          datePublished: post.published_at,
          inLanguage: 'ar',
          publisher: { '@type': 'Organization', name: 'pptides', url: SITE_URL },
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
          <ArrowRight className="h-4 w-4" />
          العودة للمدونة
        </Link>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title_ar}
            className="mb-8 w-full rounded-2xl object-cover h-56 sm:h-72 md:h-80"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <h1 className="mb-4 text-3xl font-bold leading-tight text-stone-900 md:text-4xl">
          {post.title_ar}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-stone-500">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {post.author}
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </div>
          {post.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag className="h-4 w-4" />
              {post.tags.join('، ')}
            </div>
          )}
        </div>

        <article className="text-stone-800 leading-relaxed text-[15px]">
          {renderMarkdown(post.content_ar) as ReactNode}
        </article>

        {/* Share Buttons */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-6">
          <span className="text-sm font-bold text-stone-700">شارك المقالة:</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${SITE_URL}/blog/${post.slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'تم النسخ!' : 'نسخ الرابط'}
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title_ar)}&url=${encodeURIComponent(`${SITE_URL}/blog/${post.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-sky-200 hover:text-sky-600"
          >
            𝕏
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${post.title_ar} — ${SITE_URL}/blog/${post.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-green-200 hover:text-green-600"
          >
            واتساب
          </a>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-stone-900">مقالات ذات صلة</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  to={`/blog/${rp.slug}`}
                  className="rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-sm"
                >
                  <h3 className="text-sm font-bold text-stone-900 line-clamp-2">{rp.title_ar}</h3>
                  <p className="mt-1 text-xs text-stone-500 line-clamp-2">{rp.excerpt_ar}</p>
                  <time className="mt-2 block text-xs text-stone-400" dateTime={rp.published_at}>
                    {new Date(rp.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-bold text-stone-900">استكشف المزيد عن الببتيدات العلاجية</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
              مكتبة الببتيدات
            </Link>
            <Link to="/blog" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
              المزيد من المقالات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
