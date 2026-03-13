#!/usr/bin/env node
/**
 * Post-build prerender script for pptides.com
 * Launches Puppeteer, visits each public route, saves rendered HTML.
 * Run after `vite build` to generate static HTML for SEO crawlers.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('Puppeteer not available — skipping prerender (SPA-only deploy)');
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

// ── Public routes (same as sitemap) ──────────────────────────────
const STATIC_ROUTES = [
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
  '/compare',
  '/sources',
  '/community',
  '/reviews',
  '/quiz',
  '/about',
  '/contact',
  '/transparency',
  '/faq',
  '/blog',
  '/privacy',
  '/terms',
];

/** Extract peptide IDs from peptides.ts (same logic as sitemap generator) */
function extractPeptideIds() {
  const peptidesPath = join(ROOT, 'src', 'data', 'peptides.ts');
  const content = readFileSync(peptidesPath, 'utf-8');
  const peptidesStart = content.indexOf('export const peptides: Peptide[] = [');
  const peptidesEnd = content.indexOf('const STRUCTURED_DATA');
  if (peptidesStart === -1 || peptidesEnd === -1) return [];
  const section = content.slice(peptidesStart, peptidesEnd);
  const matches = [...section.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/** Serve dist/ on a random port and return { server, port } */
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let url = req.url.split('?')[0];
      // Try exact file, then /index.html, then fall back to /index.html (SPA)
      let filePath = join(DIST, url === '/' ? 'index.html' : url);
      if (!existsSync(filePath) || !filePath.includes('.')) {
        filePath = join(DIST, 'index.html');
      }
      try {
        const data = readFileSync(filePath);
        const ext = filePath.split('.').pop();
        const mimeTypes = {
          html: 'text/html', js: 'application/javascript', css: 'text/css',
          png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon',
          json: 'application/json', woff2: 'font/woff2', webmanifest: 'application/manifest+json',
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ not found — run vite build first');
    process.exit(1);
  }

  // Collect all routes
  const peptideIds = extractPeptideIds();
  const routes = [
    ...STATIC_ROUTES,
    ...peptideIds.map((id) => `/peptide/${id}`),
  ];

  console.log(`Prerendering ${routes.length} routes...`);

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let success = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const page = await browser.newPage();
      // Block images/fonts/analytics to speed up rendering
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        const type = req.resourceType();
        // Block heavy media (but NOT fonts — needed for layout)
        if (['image', 'media'].includes(type)) {
          req.abort();
          return;
        }
        // Block service worker registration — SW intercepts navigations and
        // causes net::ERR_FAILED on subsequent routes in the same browser
        if (url.includes('/registerSW.js') || url.includes('/sw.js') || url.includes('/sw.mjs')) {
          req.abort();
          return;
        }
        // Block Vercel analytics scripts (don't exist on local server)
        if (url.includes('/_vercel/')) {
          req.abort();
          return;
        }
        // Block specific analytics/tracking domains (NOT all "google" URLs)
        const blockedDomains = [
          'google-analytics.com',
          'googletagmanager.com',
          'analytics.google.com',
          'www.google-analytics.com',
          'sentry.io',
          'browser.sentry-cdn.com',
          'hotjar.com',
          'clarity.ms',
          'facebook.net',
          'fbevents.js',
        ];
        if (blockedDomains.some((d) => url.includes(d))) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      // Wait a bit for React to finish rendering (lazy components, effects)
      await page.waitForSelector('main', { timeout: 5000 }).catch(() => {});

      const html = await page.content();
      await page.close();

      // Write to dist/[route]/index.html
      const outDir = route === '/' ? DIST : join(DIST, route);
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, 'index.html');
      writeFileSync(outPath, html, 'utf-8');

      success++;
      if (success % 10 === 0) console.log(`  ${success}/${routes.length} done...`);
    } catch (err) {
      console.warn(`  ⚠ Failed: ${route} — ${err.message}`);
      failed++;
    }
  }

  await browser.close();
  server.close();

  console.log(`\nPrerender complete: ${success} succeeded, ${failed} failed out of ${routes.length} routes`);
}

main().catch((err) => {
  console.warn('Prerender failed (non-fatal):', err.message);
  // Don't fail the build — SPA still works without prerendered HTML
  process.exit(0);
});
