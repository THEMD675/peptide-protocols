/**
 * Vercel Serverless Function: /api/sitemap
 * Generates a dynamic XML sitemap including static pages, peptide detail pages, and blog posts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE_URL = 'https://pptides.com';

// ── Supabase config ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// ── Static routes with changefreq and priority ──
const STATIC_ROUTES: { path: string; changefreq: string; priority: number }[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/library', changefreq: 'weekly', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  { path: '/calculator', changefreq: 'monthly', priority: 0.8 },
  { path: '/table', changefreq: 'monthly', priority: 0.8 },
  { path: '/compare', changefreq: 'monthly', priority: 0.8 },
  { path: '/stacks', changefreq: 'weekly', priority: 0.8 },
  { path: '/lab-guide', changefreq: 'monthly', priority: 0.8 },
  { path: '/guide', changefreq: 'monthly', priority: 0.8 },
  { path: '/blog', changefreq: 'daily', priority: 0.8 },
  { path: '/glossary', changefreq: 'monthly', priority: 0.7 },
  { path: '/interactions', changefreq: 'monthly', priority: 0.7 },
  { path: '/sources', changefreq: 'monthly', priority: 0.7 },
  { path: '/community', changefreq: 'weekly', priority: 0.7 },
  { path: '/quiz', changefreq: 'monthly', priority: 0.7 },
  { path: '/about', changefreq: 'monthly', priority: 0.6 },
  { path: '/transparency', changefreq: 'monthly', priority: 0.6 },
  { path: '/faq', changefreq: 'monthly', priority: 0.6 },
  { path: '/contact', changefreq: 'yearly', priority: 0.5 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.4 },
  { path: '/terms', changefreq: 'yearly', priority: 0.4 },
];

// ── Peptide IDs (from PEPTIDE_META in og.ts) ──
const PEPTIDE_IDS: string[] = [
  'semaglutide', 'tirzepatide', 'retatrutide', 'orforglipron', 'tesamorelin', 'aod-9604',
  '5-amino-1mq', 'bpc-157', 'tb-500', 'cjc-1295', 'ipamorelin',
  'sermorelin', 'ghrp-2', 'ghrp-6', 'hexarelin', 'mk-677', 'igf-1-lr3',
  'follistatin-344', 'kisspeptin-10', 'pt-141', 'testicular-bioregulators',
  'gnrh-triptorelin', 'semax', 'na-semax-amidate', 'selank', 'dihexa',
  'cerebrolysin', 'p21', 'epithalon', 'dsip', 'ss-31', 'mots-c', 'humanin',
  'foxo4-dri', 'thymalin', 'thymosin-alpha-1', 'collagen-peptides',
  'ghk-cu', 'copper-peptides-topical', 'larazotide', 'kpv', 'll-37',
  'ara-290', 'melanotan-ii', 'vip', 'oxytocin', 'snap-8',
];

// ── Fetch published blog posts from Supabase ──
interface BlogRow {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
}

async function fetchPublishedBlogPosts(): Promise<BlogRow[]> {
  if (!SUPABASE_ANON_KEY) return [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?is_published=eq.true&select=slug,published_at,updated_at&order=published_at.desc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return [];
    const rows: BlogRow[] = await res.json();
    return rows || [];
  } catch {
    return [];
  }
}

// ── Build XML entry ──
function urlEntry(loc: string, lastmod: string, changefreq: string, priority: number): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

// ── Handler ──
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL) {
    return res.status(500).json({ error: 'SUPABASE_URL not configured' });
  }
  try {
    const BUILD_DATE = (process.env.VERCEL_GIT_COMMIT_DATE || new Date().toISOString()).split('T')[0];
    const entries: string[] = [];

    // 1. Static pages
    for (const route of STATIC_ROUTES) {
      const loc = route.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
      entries.push(urlEntry(loc, BUILD_DATE, route.changefreq, route.priority));
    }

    // 2. Peptide detail pages
    for (const id of PEPTIDE_IDS) {
      entries.push(urlEntry(`${SITE_URL}/peptide/${id}`, BUILD_DATE, 'monthly', 0.8));
    }

    // 3. Blog posts from Supabase
    const blogPosts = await fetchPublishedBlogPosts();
    for (const post of blogPosts) {
      const lastmod = post.updated_at?.split('T')[0] || post.published_at?.split('T')[0] || BUILD_DATE;
      entries.push(urlEntry(`${SITE_URL}/blog/${post.slug}`, lastmod, 'monthly', 0.7));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  } catch {
    // Fallback: return minimal sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    return res.status(200).send(xml);
  }
}
