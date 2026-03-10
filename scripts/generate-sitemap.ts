#!/usr/bin/env npx tsx
/**
 * Sitemap Generator for pptides.com
 *
 * Reads peptide slugs from src/data/peptides.ts,
 * fetches published blog slugs from Supabase,
 * and writes a complete sitemap.xml to public/sitemap.xml.
 *
 * Usage: npx tsx scripts/generate-sitemap.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Config ──────────────────────────────────────────────────
const SITE = 'https://pptides.com';
const SUPABASE_URL = 'https://rxxzphwojutewvbfzgqd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eHpwaHdvanV0ZXd2YmZ6Z3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTAzNTAsImV4cCI6MjA4ODU4NjM1MH0.ptaZAKJg7XYVOABq867LzHUy-Ma3I5gpLvCKA0XqiPc';

const today = new Date().toISOString().slice(0, 10);

// ── Static pages (public-facing only) ───────────────────────
const staticPages = [
  '/',
  '/library',
  '/calculator',
  '/table',
  '/pricing',
  '/stacks',
  '/lab-guide',
  '/guide',
  '/glossary',
  '/interactions',
  '/sources',
  '/community',
  '/reviews',
  '/quiz',
  '/about',
  '/transparency',
  '/faq',
  '/blog',
  '/privacy',
  '/terms',
  '/contact',
];

// ── Peptide slugs (from src/data/peptides.ts) ───────────────
async function getPeptideSlugs(): Promise<string[]> {
  // Dynamic import of the data file (TypeScript via tsx)
  const { peptides } = await import('../src/data/peptides.ts');
  return peptides.map((p: { id: string }) => p.id);
}

// ── Blog slugs (from Supabase) ──────────────────────────────
async function getBlogSlugs(): Promise<string[]> {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug&is_published=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    console.error(`Failed to fetch blog slugs: ${res.status} ${res.statusText}`);
    return [];
  }
  const rows: { slug: string }[] = await res.json();
  return rows.map((r) => r.slug);
}

// ── XML helpers ─────────────────────────────────────────────
function urlEntry(loc: string, lastmod: string, priority: string, changefreq: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('🗺️  Generating sitemap for pptides.com…');

  const [peptideSlugs, blogSlugs] = await Promise.all([
    getPeptideSlugs(),
    getBlogSlugs(),
  ]);

  console.log(`  Static pages: ${staticPages.length}`);
  console.log(`  Peptides:     ${peptideSlugs.length}`);
  console.log(`  Blog posts:   ${blogSlugs.length}`);

  const entries: string[] = [];

  // Static pages
  for (const path of staticPages) {
    const priority = path === '/' ? '1.0' : path === '/library' ? '0.9' : '0.7';
    const freq = path === '/' || path === '/blog' ? 'daily' : 'weekly';
    entries.push(urlEntry(`${SITE}${path}`, today, priority, freq));
  }

  // Peptide detail pages
  for (const slug of peptideSlugs) {
    entries.push(urlEntry(`${SITE}/peptide/${slug}`, today, '0.8', 'weekly'));
  }

  // Blog post pages
  for (const slug of blogSlugs) {
    entries.push(urlEntry(`${SITE}/blog/${slug}`, today, '0.6', 'monthly'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  const outPath = resolve(import.meta.dirname!, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');

  const total = staticPages.length + peptideSlugs.length + blogSlugs.length;
  console.log(`\n✅ Sitemap written to public/sitemap.xml (${total} URLs)`);
}

main().catch((err) => {
  console.error('❌ Sitemap generation failed:', err);
  process.exit(1);
});
