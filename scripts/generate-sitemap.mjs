#!/usr/bin/env node
/**
 * Build-time sitemap generator for pptides.com
 * Extracts peptide IDs from src/data/peptides.ts and generates public/sitemap.xml
 * Run via: node scripts/generate-sitemap.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = 'https://pptides.com';

// Each entry: [path, changefreq, priority]
const STATIC_PAGES = [
  ['/', 'weekly', '1.0'],
  ['/library', 'weekly', '0.9'],
  ['/pricing', 'monthly', '0.9'],
  ['/calculator', 'monthly', '0.8'],
  ['/table', 'monthly', '0.8'],
  ['/compare', 'monthly', '0.8'],
  ['/stacks', 'weekly', '0.8'],
  ['/lab-guide', 'monthly', '0.8'],
  ['/guide', 'monthly', '0.8'],
  ['/blog', 'daily', '0.8'],
  ['/glossary', 'monthly', '0.7'],
  ['/interactions', 'monthly', '0.7'],
  ['/sources', 'monthly', '0.7'],
  ['/community', 'weekly', '0.7'],
  ['/quiz', 'monthly', '0.7'],
  ['/about', 'monthly', '0.6'],
  ['/transparency', 'monthly', '0.6'],
  ['/faq', 'monthly', '0.6'],
  ['/contact', 'yearly', '0.5'],
  ['/privacy', 'yearly', '0.4'],
  ['/terms', 'yearly', '0.4'],
];

/**
 * Extract peptide IDs from peptides.ts using regex (no TypeScript compilation)
 */
function extractPeptideIds() {
  const peptidesPath = join(ROOT, 'src', 'data', 'peptides.ts');
  const content = readFileSync(peptidesPath, 'utf-8');

  const peptidesStart = content.indexOf('export const peptides: Peptide[] = [');
  const peptidesEnd = content.indexOf('const STRUCTURED_DATA');
  if (peptidesStart === -1 || peptidesEnd === -1) {
    throw new Error('Could not find peptides array boundaries in peptides.ts');
  }

  const peptidesSection = content.slice(peptidesStart, peptidesEnd);
  const matches = [...peptidesSection.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/**
 * Fetch published blog post slugs from Supabase (best-effort at build time)
 */
async function fetchBlogSlugs() {
  try {
    const envPath = join(ROOT, '.env');
    let envContent = '';
    try { envContent = readFileSync(envPath, 'utf-8'); } catch { /* ok */ }
    const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim() || process.env.VITE_SUPABASE_URL;
    const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars not found — skipping blog slugs in sitemap');
      return [];
    }
    const url = `${supabaseUrl}/rest/v1/blog_posts?select=slug,published_at&is_published=eq.true&order=published_at.desc`;
    const res = await fetch(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) { console.warn(`Blog fetch failed: ${res.status}`); return []; }
    const posts = await res.json();
    return posts.map((p) => ({ slug: p.slug, date: p.published_at?.slice(0, 10) }));
  } catch (e) {
    console.warn('Blog fetch error (non-fatal):', e.message);
    return [];
  }
}

/**
 * Generate sitemap XML
 */
function generateSitemap(peptideIds, blogPosts) {
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    ...STATIC_PAGES.map(
      ([path, changefreq, priority]) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    ),
    ...peptideIds.map(
      (id) => `  <url>
    <loc>${BASE_URL}/peptide/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    ),
    ...blogPosts.filter(post => post.slug).map(
      (post) => `  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${post.date || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    ),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function main() {
  const peptideIds = extractPeptideIds();
  const blogPosts = await fetchBlogSlugs();
  const xml = generateSitemap(peptideIds, blogPosts);
  const outPath = join(ROOT, 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`Generated sitemap: ${outPath} (${STATIC_PAGES.length} static + ${peptideIds.length} peptide + ${blogPosts.length} blog pages)`);
}

main();
