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
  puppeteer = null;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

// ── Route metadata for lightweight fallback (when Puppeteer unavailable) ──
const ROUTE_META = {
  '/': { title: 'pptides | أشمل دليل عربي للببتيدات العلاجية', desc: 'اكتشف 47+ ببتيد علاجي مع بروتوكولات كاملة، حاسبة جرعات، ومدرب ذكي. ابدأ تجربتك المجانية اليوم — أشمل دليل عربي مبني على الأبحاث.' },
  '/library': { title: 'مكتبة الببتيدات | 47 ببتيد علاجي مع بروتوكولات كاملة | pptides', desc: 'تصفّح مكتبة شاملة لـ 47 ببتيد علاجي — بروتوكولات مفصّلة، جرعات دقيقة، وتحاليل مخبرية. ابدأ مجانًا.' },
  '/calculator': { title: 'حاسبة جرعات الببتيدات | احسب الجرعة بدقة | pptides', desc: 'أشمل حاسبة عربية لجرعات الببتيدات — حساب الجرعة، التخفيف، التكلفة، ومحوّل الوحدات.' },
  '/table': { title: 'جدول الببتيدات الشامل | مقارنة 47 ببتيد | pptides', desc: 'جدول تفاعلي شامل لـ 47 ببتيد — الفئة، طريقة الإعطاء، الجرعة، التوقيت، الدورة، والتأثيرات الجانبية.' },
  '/pricing': { title: 'أسعار واشتراكات الببتيدات | pptides', desc: 'خطتان: الأساسية (47+ بروتوكول، حاسبة، تحاليل) والمتقدمة (كل شيء + مدرب ذكي 24/7). تجربة مجانية.' },
  '/stacks': { title: 'بروتوكولات ببتيدات مُجمَّعة | خلطات مُجرَّبة لأهداف محددة | pptides', desc: 'خلطات ببتيدات مُجرَّبة بعناية لأهداف محددة — تعافٍ وإصلاح، أداء دماغي، طول عمر، فقدان دهون.' },
  '/lab-guide': { title: 'دليل التحاليل المخبرية قبل وأثناء الببتيدات | pptides', desc: 'دليل شامل للفحوصات المخبرية الضرورية قبل وأثناء استخدام الببتيدات — 12 تحليل موصى به.' },
  '/guide': { title: 'مركز التعلّم — دليل الببتيدات الشامل | pptides', desc: 'دليل شامل خطوة بخطوة: ما هي الببتيدات، كيف تعمل، الطرق الآمنة للحقن، إدارة الجرعات.' },
  '/glossary': { title: 'قاموس مصطلحات الببتيدات والبيوهاكينغ | pptides', desc: 'قاموس عربي شامل لمصطلحات الببتيدات والطب الرياضي والبيوهاكينغ.' },
  '/interactions': { title: 'فحص تعارضات الببتيدات | pptides', desc: 'تحقق من أمان تجميع أي ببتيدين معًا. فحص التعارضات والتفاعلات بين 47+ ببتيد.' },
  '/compare': { title: 'مقارنة الببتيدات | pptides', desc: 'قارن بين ببتيدات متعددة — الفئة، مستوى الأدلة، الجرعة، التوقيت، الدورة، والأعراض الجانبية.' },
  '/sources': { title: 'المصادر العلمية | pptides — 127+ مرجع من PubMed', desc: 'مكتبة بحثية تضم 127+ مرجع علمي من PubMed تغطي 47 ببتيد.' },
  '/community': { title: 'مجتمع الببتيدات | pptides', desc: 'شارك تجربتك مع الببتيدات واقرأ تجارب حقيقية من مستخدمين آخرين.' },
  '/reviews': { title: 'تقييمات المستخدمين | pptides', desc: 'اقرأ تجارب وتقييمات حقيقية من مستخدمي الببتيدات.' },
  '/quiz': { title: 'اكتشف البروتوكول المثالي لك | اختبار مجاني | pptides', desc: 'اختبار مجاني ومخصّص في 3 دقائق يحدد لك البروتوكول الأفضل لهدفك الصحي.' },
  '/about': { title: 'عن pptides — أول منصة عربية للببتيدات العلاجية | pptides', desc: 'تعرّف على pptides: أول منصة عربية متخصصة في علم الببتيدات العلاجية. أكثر من 47 ببتيد مع بروتوكولات كاملة.' },
  '/contact': { title: 'تواصل معنا | pptides', desc: 'تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم حول الببتيدات العلاجية.' },
  '/transparency': { title: 'الشفافية — كيف نكسب المال ونحمي بياناتك | pptides', desc: 'pptides منصة تعليمية بحتة — لا نبيع ببتيدات ولا نأخذ عمولات. اشتراكك هو مصدر دخلنا الوحيد.' },
  '/faq': { title: 'الأسئلة الشائعة | pptides', desc: 'أسئلة وإجابات شاملة عن pptides — الاشتراك، الأسعار، المحتوى، والأدوات.' },
  '/blog': { title: 'المدونة | مقالات عن الببتيدات العلاجية | pptides', desc: 'مقالات ودلائل شاملة عن الببتيدات العلاجية — بروتوكولات، آليات عمل، أبحاث علمية محدّثة.' },
  '/privacy': { title: 'سياسة الخصوصية | pptides', desc: 'سياسة الخصوصية لموقع pptides.com — كيف نحمي بياناتك الشخصية.' },
  '/terms': { title: 'شروط الاستخدام | pptides', desc: 'شروط الاستخدام لموقع pptides.com — الاشتراكات، الاسترداد، وحدود المسؤولية.' },
};

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

/** Fetch published blog post slugs from Supabase for prerendering */
async function fetchBlogSlugs() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) { console.log('  Skipping blog slug fetch (no Supabase env vars)'); return []; }
  try {
    const res = await fetch(`${url}/rest/v1/blog_posts?is_published=eq.true&select=slug&order=published_at.desc&limit=100`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) { console.log(`  Blog slug fetch failed: ${res.status}`); return []; }
    const posts = await res.json();
    return posts.map(p => `/blog/${p.slug}`);
  } catch (e) { console.log(`  Blog slug fetch error: ${e.message}`); return []; }
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

/** Extract peptide names (Arabic) from peptides.ts for SEO titles */
function extractPeptideNames() {
  const peptidesPath = join(ROOT, 'src', 'data', 'peptides.ts');
  const content = readFileSync(peptidesPath, 'utf-8');
  const names = {};
  // Only parse within the peptides array (between 'export const peptides' and 'const STRUCTURED_DATA')
  const peptidesStart = content.indexOf('export const peptides: Peptide[] = [');
  const peptidesEnd = content.indexOf('const STRUCTURED_DATA');
  if (peptidesStart === -1 || peptidesEnd === -1) return names;
  const section = content.slice(peptidesStart, peptidesEnd);
  // Match objects that have both id and nameAr (peptide entries, not categories)
  const idMatches = [...section.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  const nameArMatches = [...section.matchAll(/nameAr:\s*['"]([^'"]+)['"]/g)];
  // Pair them: each peptide object has id followed by nameAr
  for (let i = 0; i < idMatches.length && i < nameArMatches.length; i++) {
    names[idMatches[i][1]] = nameArMatches[i][1];
  }
  return names;
}

/** Lightweight fallback: inject correct <title> and meta tags without Puppeteer */
function lightweightPrerender(routes, peptideNames) {
  console.log(`Lightweight prerender: injecting metadata for ${routes.length} routes...`);
  const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf-8');
  let success = 0;

  for (const route of routes) {
    let meta = ROUTE_META[route];
    // For peptide detail pages, generate metadata from peptide data
    if (!meta && route.startsWith('/peptide/')) {
      const peptideId = route.replace('/peptide/', '');
      const nameAr = peptideNames[peptideId] || peptideId;
      meta = {
        title: `${nameAr} — بروتوكول وجرعة وأبحاث | pptides`,
        desc: `دليل شامل لـ ${nameAr}: البروتوكول، الجرعة، التوقيت، الدورة، الأعراض الجانبية، والأبحاث العلمية.`,
      };
    }
    if (!meta) continue;

    let html = indexHtml;
    // Replace <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
    // Replace or inject <meta name="description">
    if (html.includes('name="description"')) {
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/, `<meta name="description" content="${meta.desc}"`);
    } else {
      html = html.replace('</title>', `</title>\n    <meta name="description" content="${meta.desc}">`);
    }
    // Replace or inject <meta property="og:title">
    if (html.includes('property="og:title"')) {
      html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"/, `<meta property="og:title" content="${meta.title}"`);
    } else {
      html = html.replace('</title>', `</title>\n    <meta property="og:title" content="${meta.title}">`);
    }
    // Replace or inject <meta property="og:description">
    if (html.includes('property="og:description"')) {
      html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"/, `<meta property="og:description" content="${meta.desc}"`);
    } else {
      html = html.replace('</title>', `</title>\n    <meta property="og:description" content="${meta.desc}">`);
    }
    // Set canonical URL
    const canonical = `https://pptides.com${route === '/' ? '' : route}`;
    if (html.includes('rel="canonical"')) {
      html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"/, `<link rel="canonical" href="${canonical}"`);
    } else {
      html = html.replace('</title>', `</title>\n    <link rel="canonical" href="${canonical}">`);
    }

    const outDir = route === '/' ? DIST : join(DIST, route);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf-8');
    success++;
    if (success % 10 === 0) console.log(`  ${success}/${routes.length} done...`);
  }
  console.log(`\nLightweight prerender complete: ${success} routes with unique metadata`);
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ not found — run vite build first');
    process.exit(1);
  }

  // Collect all routes including blog posts
  const peptideIds = extractPeptideIds();
  const peptideNames = extractPeptideNames();
  const blogSlugs = await fetchBlogSlugs();
  if (blogSlugs.length > 0) console.log(`  Found ${blogSlugs.length} blog posts to prerender`);
  const routes = [
    ...STATIC_ROUTES,
    ...peptideIds.map((id) => `/peptide/${id}`),
    ...blogSlugs,
  ];

  // Fallback: if Puppeteer unavailable, inject metadata via string replacement
  if (!puppeteer) {
    console.log('Puppeteer not available — using lightweight metadata injection');
    lightweightPrerender(routes, peptideNames);
    return;
  }

  console.log(`Prerendering ${routes.length} routes...`);

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (launchErr) {
    console.log('Puppeteer launch failed:', launchErr.message);
    console.log('Falling back to lightweight metadata injection');
    server.close();
    lightweightPrerender(routes, peptideNames);
    return;
  }

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
  // Last resort: try lightweight fallback even if main() crashed
  try {
    const peptideIds = extractPeptideIds();
    const peptideNames = extractPeptideNames();
    const blogSlugsRetry = await fetchBlogSlugs().catch(() => []);
    const routes = [...STATIC_ROUTES, ...peptideIds.map((id) => `/peptide/${id}`), ...blogSlugsRetry];
    console.log('Attempting lightweight metadata injection as last resort...');
    lightweightPrerender(routes, peptideNames);
  } catch (fallbackErr) {
    console.warn('Lightweight fallback also failed:', fallbackErr.message);
    process.exit(0);
  }
});
