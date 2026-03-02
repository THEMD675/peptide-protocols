import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, CalendarDays } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  date: string;
  slug: string;
}

const posts: BlogPost[] = [
  {
    id: '1',
    title: 'ما هي الببتيدات العلاجية؟ دليل المبتدئين الشامل',
    summary: 'تعرّف على الببتيدات العلاجية: ما هي، كيف تعمل، وما الفرق بينها وبين المكملات التقليدية. دليل مبسّط لكل من يريد فهم هذا المجال.',
    date: '2026-03-01',
    slug: 'what-are-therapeutic-peptides',
  },
  {
    id: '2',
    title: 'أفضل 5 ببتيدات للمبتدئين في 2026',
    summary: 'إذا كنت تفكر في تجربة الببتيدات لأول مرة، إليك أفضل 5 خيارات مدعومة بالأدلة العلمية مع بروتوكولات آمنة وسهلة التطبيق.',
    date: '2026-02-25',
    slug: 'top-5-peptides-for-beginners',
  },
  {
    id: '3',
    title: 'كيف تقرأ الأبحاث العلمية عن الببتيدات بشكل صحيح',
    summary: 'ليست كل الدراسات متساوية. تعلّم كيف تُقيّم جودة البحث العلمي وتفرّق بين الأدلة القوية والضعيفة قبل اتخاذ قراراتك.',
    date: '2026-02-20',
    slug: 'how-to-read-peptide-research',
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>المدونة | مقالات عن الببتيدات العلاجية | pptides</title>
        <meta name="description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية، البروتوكولات، والأبحاث العلمية باللغة العربية." />
        <meta property="og:title" content="المدونة | pptides" />
        <meta property="og:description" content="مقالات ودلائل شاملة عن الببتيدات العلاجية باللغة العربية." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <FileText className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">المدونة</h1>
          <p className="mt-2 text-base text-stone-600">مقالات ودلائل مبنية على الأدلة العلمية</p>
        </div>

        <div className="space-y-5">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-stone-900">{post.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{post.summary}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
                <CalendarDays className="h-3.5 w-3.5" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-stone-500">المزيد من المقالات قريبًا...</p>
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
