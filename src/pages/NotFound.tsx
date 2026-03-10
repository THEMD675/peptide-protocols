import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, BookOpen, FileText, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RecentPost {
  slug: string;
  title_ar: string;
  published_at: string;
}

const QUICK_LINKS = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/library', label: 'المكتبة', icon: BookOpen },
  { to: '/blog', label: 'المدونة', icon: FileText },
  { to: '/pricing', label: 'الأسعار', icon: CreditCard },
];

export default function NotFound() {
  const [query, setQuery] = useState('');
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('blog_posts')
      .select('slug, title_ar, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!cancelled && data) setRecentPosts(data);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/library?q=${encodeURIComponent(q)}`);
  };

  const formattedDate = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' });
    return (d: string) => fmt.format(new Date(d));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6 animate-fade-in" dir="rtl">
      <Helmet>
        <title>الصفحة غير موجودة | pptides</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Brand */}
      <Link
        to="/"
        className="mb-8 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 hover:opacity-90 transition-opacity"
        dir="ltr"
      >
        <span aria-hidden="true">pp</span>
        <span className="text-emerald-600" aria-hidden="true">tides</span>
      </Link>

      {/* 404 Heading */}
      <div className="mb-2 text-8xl font-black text-emerald-600/20 dark:text-emerald-400/15 select-none">404</div>
      <h1 className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">الصفحة غير موجودة</h1>
      <p className="mb-8 text-stone-600 dark:text-stone-400 max-w-md text-center leading-relaxed">
        يبدو أن الرابط الذي تبحث عنه لم يعد متاحاً
      </p>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="w-full max-w-md mb-10">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث عن ببتيد أو موضوع..."
            className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 pr-12 pl-4 py-3 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
          />
        </div>
      </form>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg mb-10">
        {QUICK_LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 text-stone-700 dark:text-stone-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <link.icon className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-bold">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Blog Posts */}
      {recentPosts.length > 0 && (
        <div className="w-full max-w-lg">
          <h2 className="mb-4 text-lg font-bold text-stone-800 dark:text-stone-200">آخر المقالات</h2>
          <div className="space-y-3">
            {recentPosts.map(post => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {post.title_ar}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {formattedDate(post.published_at)}
                  </p>
                </div>
                <ArrowLeft className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-emerald-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
