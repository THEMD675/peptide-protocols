import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CalendarDays, User, Tag } from 'lucide-react';
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, slug, title_ar, content_ar, excerpt_ar, author, published_at, cover_image_url, tags')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (fetchError || !data) {
        setError(true);
      } else {
        setPost(data);
      }
      setLoading(false);
    })();
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
        {post.cover_image_url && <meta property="og:image" content={post.cover_image_url} />}
        <meta property="article:published_time" content={post.published_at} />
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
            className="mb-8 w-full rounded-2xl object-cover"
            loading="lazy"
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
