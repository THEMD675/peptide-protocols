import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CalendarDays, User, Tag, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { renderMarkdown } from '@/lib/markdown';
import type { ReactNode } from 'react';
import { GenericPageSkeleton } from '@/components/Skeletons';
import ShareButtons from '@/components/ShareButtons';

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
  const { subscription } = useAuth();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
        // Fetch related posts — prefer posts with matching tags, fallback to newest
        let related: RelatedPost[] = [];
        const postTags = data.tags ?? [];
        if (postTags.length > 0) {
          // Find posts that share at least one tag with the current post
          const { data: tagMatches } = await supabase
            .from('blog_posts')
            .select('id, slug, title_ar, excerpt_ar, published_at, tags')
            .eq('is_published', true)
            .neq('id', data.id)
            .overlaps('tags', postTags)
            .order('published_at', { ascending: false })
            .limit(3);
          if (tagMatches && tagMatches.length > 0) {
            related = tagMatches;
          }
        }
        // Fallback to newest posts if no tag matches found
        if (related.length === 0) {
          const { data: newest } = await supabase
            .from('blog_posts')
            .select('id, slug, title_ar, excerpt_ar, published_at')
            .eq('is_published', true)
            .neq('id', data.id)
            .order('published_at', { ascending: false })
            .limit(3);
          if (newest) related = newest;
        }
        if (!cancelled) setRelatedPosts(related);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="min-h-screen"><GenericPageSkeleton /></div>;

  if (error || !post) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <h2 className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">المقالة غير موجودة</h2>
        <p className="mb-6 text-stone-600 dark:text-stone-300">لم نتمكن من العثور على هذه المقالة. قد تكون محذوفة أو غير منشورة.</p>
        <Link to="/blog" className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors">
          العودة للمدونة
        </Link>
      </div>
    );
  }

  // Estimated reading time (~200 Arabic words/min)
  const readingTime = Math.max(1, Math.round(post.content_ar.trim().split(/\s+/).length / 200));

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>{`${post.title_ar} | مدونة pptides`}</title>
        <meta name="description" content={post.excerpt_ar} />
        <meta property="og:title" content={post.title_ar} />
        <meta property="og:description" content={post.excerpt_ar} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/blog/${post.slug}`} />
        <meta property="og:image" content={post.cover_image_url || `${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:author" content={post.author} />
        {(post.tags ?? []).map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <link rel="canonical" href={`${SITE_URL}/blog/${post.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title_ar} />
        <meta name="twitter:description" content={post.excerpt_ar} />
        <meta name="twitter:image" content={post.cover_image_url || `${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title_ar,
            description: post.excerpt_ar,
            url: `${SITE_URL}/blog/${post.slug}`,
            image: post.cover_image_url || `${SITE_URL}/og-image.jpg`,
            datePublished: post.published_at,
            dateModified: post.published_at,
            inLanguage: 'ar',
            author: { '@type': 'Person', name: post.author },
            publisher: { '@type': 'Organization', name: 'pptides', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.jpg` } },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${SITE_URL}/blog` },
              { '@type': 'ListItem', position: 3, name: post.title_ar, item: `${SITE_URL}/blog/${post.slug}` },
            ],
          },
        ])}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-700 dark:text-emerald-400 transition-colors">
          <ArrowRight className="h-4 w-4" />
          العودة للمدونة
        </Link>

        {post.cover_image_url && (
          <div className="mb-8 w-full aspect-[16/7] sm:aspect-[16/6] md:aspect-[5/2] overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800">
            <img
              src={post.cover_image_url}
              alt={post.title_ar}
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="800"
              height="320"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
            />
          </div>
        )}

        <h1 className="mb-4 text-3xl font-bold leading-tight text-stone-900 dark:text-stone-100 md:text-4xl">
          {post.title_ar}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-stone-500 dark:text-stone-300">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {post.author}
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </div>
          {(post.tags?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag className="h-4 w-4" />
              {post.tags?.join('، ') ?? ''}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{readingTime} دقيقة قراءة</span>
          </div>
        </div>

        <article className="text-stone-800 dark:text-stone-200 leading-relaxed text-[15px]">
          {renderMarkdown(post.content_ar) as ReactNode}
        </article>

        {/* Author Bio */}
        <div className="mt-10 flex items-center gap-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <User className="h-7 w-7 text-emerald-700" />
          </div>
          <div>
            <p className="text-base font-bold text-stone-900 dark:text-stone-100">{post.author || 'فريق pptides'}</p>
            <p className="text-sm text-stone-600 dark:text-stone-300">فريق متخصص في الببتيدات العلاجية والبيوهاكينغ — نقدّم محتوى علمي موثّق باللغة العربية</p>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="mt-10 border-t border-stone-200 dark:border-stone-600 pt-6">
          <p className="mb-3 text-sm font-bold text-stone-700 dark:text-stone-200">شارك المقالة:</p>
          <ShareButtons
            url={`${SITE_URL}/blog/${post.slug}`}
            title={post.title_ar}
            description={post.excerpt_ar}
            showTelegram={true}
          />
        </div>

        {/* Conversion CTA — non-subscribers only */}
        {!subscription?.isProOrTrial && (
          <div className="mt-10 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-6 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
              مهتم بالببتيدات؟
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">
              احصل على بروتوكولات مخصّصة، مدرب ذكي، وأدوات تتبّع متقدّمة
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700"
            >
              ابدأ تجربتك المجانية
            </Link>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">مقالات ذات صلة</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  to={`/blog/${rp.slug}`}
                  className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-200 dark:border-emerald-800 hover:shadow-sm dark:shadow-stone-900/30"
                >
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-2">{rp.title_ar}</h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-300 line-clamp-2">{rp.excerpt_ar}</p>
                  <time className="mt-2 block text-xs text-stone-400" dateTime={rp.published_at}>
                    {new Date(rp.published_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">استكشف المزيد عن الببتيدات العلاجية</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/library" className="rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors">
              مكتبة الببتيدات
            </Link>
            <Link to="/blog" className="rounded-full border border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:bg-emerald-900/30 transition-colors">
              المزيد من المقالات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
