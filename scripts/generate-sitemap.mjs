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

const STATIC_PAGES = [
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
 * Generate sitemap XML
 */
function generateSitemap(peptideIds) {
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    ...STATIC_PAGES.map(
      (path) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
  </url>`
    ),
    ...peptideIds.map(
      (id) => `  <url>
    <loc>${BASE_URL}/peptide/${id}</loc>
    <lastmod>${today}</lastmod>
  </url>`
    ),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function main() {
  const peptideIds = extractPeptideIds();
  const xml = generateSitemap(peptideIds);
  const outPath = join(ROOT, 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`Generated sitemap: ${outPath} (${STATIC_PAGES.length} static + ${peptideIds.length} peptide pages)`);
}

main();
