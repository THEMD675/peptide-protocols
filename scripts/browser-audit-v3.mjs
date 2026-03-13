/**
 * DEEP BROWSER AUDIT v3 — pptides.com
 * Uses fresh page per request with delays to avoid rate limiting.
 * Mobile viewport: 375×812 (iPhone 13/14)
 */
import puppeteer from 'puppeteer';

const BASE = 'https://pptides.com';
const VIEWPORT = { width: 375, height: 812 };
const TIMEOUT = 30000;
const DELAY_BETWEEN_PAGES = 3000; // 3s between each page to avoid throttling

const PUBLIC_PAGES = [
  '/', '/library', '/pricing', '/login', '/signup',
  '/blog', '/contact', '/quiz', '/compare', '/interactions',
  '/glossary', '/about', '/privacy', '/terms', '/calculator',
  '/sources', '/stacks', '/lab-guide',
];

const PEPTIDE_PAGES = [
  '/library/bpc-157', '/library/semaglutide', '/library/tb-500',
  '/library/ghrp-6', '/library/ipamorelin',
];

const AUTH_PAGES = [
  '/dashboard', '/tracker', '/ai-coach', '/protocol-wizard',
  '/account', '/bookmarks',
];

const ALL_PAGES = [...PUBLIC_PAGES, ...PEPTIDE_PAGES, ...AUTH_PAGES];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function auditPage(browser, path) {
  const url = `${BASE}${path}`;
  const result = {
    path,
    url,
    status: null,
    redirectedTo: null,
    errors: [],
    warnings: [],
    info: [],
    consoleErrors: [],
    networkFailures: [],
    httpErrors: [],
  };

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      result.consoleErrors.push(msg.text().substring(0, 200));
    }
  });

  // Collect network failures and HTTP errors
  page.on('requestfailed', req => {
    const url = req.url();
    // Skip known noisy things
    if (url.includes('favicon') || url.includes('.woff') || url.includes('analytics')) return;
    result.networkFailures.push({ url: url.substring(0, 150), reason: req.failure()?.errorText || 'unknown' });
  });

  page.on('response', res => {
    const s = res.status();
    if (s >= 400) {
      const url = res.url();
      if (url.includes('favicon')) return;
      result.httpErrors.push({ status: s, url: url.substring(0, 150) });
    }
  });

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    result.status = response?.status() || 0;

    // Check for redirect
    const finalUrl = page.url();
    if (finalUrl !== url && finalUrl !== url + '/') {
      result.redirectedTo = finalUrl;
    }

    // Wait a bit for lazy-loaded content
    await sleep(1500);

    // Gather page data
    const pageData = await page.evaluate(() => {
      const dir = document.documentElement.getAttribute('dir');
      const lang = document.documentElement.getAttribute('lang');
      const h1 = document.querySelector('h1')?.textContent?.trim()?.substring(0, 100) || null;
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null;
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
      const jsonLd = document.querySelector('script[type="application/ld+json"]')?.textContent || null;

      // Count elements
      const allElements = document.querySelectorAll('*').length;

      // Check for empty containers (visible, >20px, no text content)
      let emptyContainers = 0;
      document.querySelectorAll('div, section, article').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20 && rect.height < 5 &&
            el.children.length === 0 && !el.textContent?.trim()) {
          emptyContainers++;
        }
      });

      // Check for broken images
      const brokenImages = [];
      document.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          brokenImages.push(img.src?.substring(0, 150) || img.getAttribute('src')?.substring(0, 150) || 'unknown');
        }
      });

      // Check touch targets (WCAG: 44px min)
      const smallTouchTargets = [];
      document.querySelectorAll('a, button, [role="button"], input, select, textarea').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
          const text = el.textContent?.trim()?.substring(0, 50) || el.getAttribute('aria-label') || el.tagName;
          smallTouchTargets.push({ text, width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      });

      // Check for horizontal overflow
      const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;

      // Check for visible error texts
      const errorTexts = [];
      const errorKeywords = ['error', 'خطأ', 'failed', 'فشل', 'undefined', 'null', 'NaN', 'not found'];
      document.querySelectorAll('p, span, div, h1, h2, h3').forEach(el => {
        const text = el.textContent?.trim()?.toLowerCase();
        if (text && errorKeywords.some(kw => text.includes(kw))) {
          // Skip if it's a legitimate UI element
          if (text.length < 200 && !text.includes('404') && el.offsetParent !== null) {
            const visible = el.getBoundingClientRect();
            if (visible.width > 0 && visible.height > 0) {
              errorTexts.push(el.textContent.trim().substring(0, 100));
            }
          }
        }
      });

      // Check Arabic text content
      const bodyText = document.body?.textContent || '';
      const arabicChars = (bodyText.match(/[\u0600-\u06FF]/g) || []).length;
      const hasArabic = arabicChars > 50;

      // Check links
      const links = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
          links.push({ href: href.substring(0, 150), text: a.textContent?.trim()?.substring(0, 50) || '' });
        }
      });

      // Check for z-index stacking issues (elements at 0,0 covering content)
      let overlayIssues = 0;
      document.querySelectorAll('[style*="z-index"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width >= 375 && rect.height >= 400 && style.position !== 'static') {
          overlayIssues++;
        }
      });

      return {
        dir, lang, h1, title, metaDesc, ogTitle, ogDesc, ogImage, canonical, jsonLd,
        allElements, emptyContainers, brokenImages, smallTouchTargets,
        hasHorizontalOverflow, errorTexts, hasArabic, arabicChars,
        links, overlayIssues,
      };
    });

    // === ANALYZE RESULTS ===

    // RTL check
    if (pageData.dir !== 'rtl') {
      result.errors.push(`RTL: dir="${pageData.dir}" (expected "rtl")`);
    }

    // Arabic check
    if (!pageData.hasArabic) {
      result.errors.push(`i18n: Only ${pageData.arabicChars} Arabic characters found`);
    }

    // SEO checks
    if (!pageData.title || pageData.title.length < 10) {
      result.warnings.push(`SEO: Missing or short title: "${pageData.title}"`);
    }
    if (!pageData.metaDesc) {
      result.warnings.push('SEO: Missing meta description');
    }
    if (!pageData.ogTitle) {
      result.warnings.push('SEO: Missing og:title');
    }
    if (!pageData.ogImage) {
      result.warnings.push('SEO: Missing og:image');
    }
    if (!pageData.canonical) {
      result.warnings.push('SEO: Missing canonical link');
    }
    if (!pageData.jsonLd) {
      result.warnings.push('SEO: Missing JSON-LD structured data');
    }

    // Broken images
    if (pageData.brokenImages.length > 0) {
      result.errors.push(`IMAGES: ${pageData.brokenImages.length} broken images`);
      pageData.brokenImages.forEach(img => result.info.push(`  Broken: ${img}`));
    }

    // Touch targets
    const uniqueSmall = pageData.smallTouchTargets.filter((t, i, arr) =>
      arr.findIndex(x => x.text === t.text) === i
    );
    if (uniqueSmall.length > 0) {
      result.warnings.push(`A11Y: ${uniqueSmall.length} small touch targets (<44px)`);
      uniqueSmall.slice(0, 5).forEach(t =>
        result.info.push(`  Small target: "${t.text}" (${t.width}×${t.height})`)
      );
      if (uniqueSmall.length > 5) {
        result.info.push(`  ... and ${uniqueSmall.length - 5} more`);
      }
    }

    // Horizontal overflow
    if (pageData.hasHorizontalOverflow) {
      result.errors.push('LAYOUT: Horizontal overflow detected (mobile breakage)');
    }

    // Error texts visible
    const filteredErrors = pageData.errorTexts.filter(t =>
      !t.includes('error handling') && !t.includes('no error') && t.length > 3
    );
    if (filteredErrors.length > 0) {
      result.warnings.push(`UI: ${filteredErrors.length} possible error messages visible`);
      filteredErrors.slice(0, 3).forEach(t => result.info.push(`  Error text: "${t.substring(0, 80)}"`));
    }

    // Overlay issues
    if (pageData.overlayIssues > 0) {
      result.warnings.push(`LAYOUT: ${pageData.overlayIssues} full-screen overlay elements detected`);
    }

    // Store key data
    result.info.unshift(
      `Elements: ${pageData.allElements} | H1: "${pageData.h1 || 'NONE'}"`,
      `Title: "${pageData.title}"`,
    );

  } catch (err) {
    result.errors.push(`LOAD FAILURE: ${err.message.substring(0, 200)}`);
  } finally {
    await page.close();
  }

  return result;
}

function printResult(r) {
  const severity = r.errors.length > 0 ? '🔴' : r.warnings.length > 0 ? '🟡' : '🟢';
  console.log(`\n━━━ ${severity} ${r.path} ━━━`);
  console.log(`  Status: ${r.status}${r.redirectedTo ? ` → ${r.redirectedTo}` : ''}`);

  r.info.forEach(i => console.log(`  ℹ️  ${i}`));
  r.errors.forEach(e => console.log(`  🔴 ${e}`));
  r.warnings.forEach(w => console.log(`  🟡 ${w}`));

  if (r.consoleErrors.length > 0) {
    console.log(`  🟠 CONSOLE: ${r.consoleErrors.length} errors`);
    r.consoleErrors.slice(0, 3).forEach(e => console.log(`    ❌ ${e}`));
  }
  if (r.networkFailures.length > 0) {
    console.log(`  🟠 NETWORK: ${r.networkFailures.length} failures`);
    r.networkFailures.slice(0, 3).forEach(f => console.log(`    ❌ ${f.url} | ${f.reason}`));
  }
  if (r.httpErrors.length > 0) {
    console.log(`  🟠 HTTP: ${r.httpErrors.length} error responses`);
    r.httpErrors.slice(0, 3).forEach(e => console.log(`    ⚠️  ${e.status} ${e.url}`));
  }
}

(async () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  BROWSER AUDIT v3 — pptides.com                 ║');
  console.log(`║  ${new Date().toISOString()}                     ║`);
  console.log('║  Mobile: 375×812 | 3s delay between pages       ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-http2'],
  });

  const results = [];
  let errCount = 0, warnCount = 0, okCount = 0;

  for (const path of ALL_PAGES) {
    process.stdout.write(`  Auditing ${path}...`);
    const r = await auditPage(browser, path);
    results.push(r);

    if (r.errors.length > 0) errCount++;
    else if (r.warnings.length > 0) warnCount++;
    else okCount++;

    printResult(r);
    // Delay between pages to avoid throttling
    await sleep(DELAY_BETWEEN_PAGES);
  }

  await browser.close();

  // === SUMMARY ===
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  🟢 Clean: ${okCount} | 🟡 Warnings: ${warnCount} | 🔴 Errors: ${errCount}`);
  console.log(`  Total pages: ${results.length}`);

  // Aggregate unique issues
  const allErrors = results.flatMap(r => r.errors.map(e => ({ page: r.path, error: e })));
  const allWarnings = results.flatMap(r => r.warnings.map(w => ({ page: r.path, warning: w })));

  if (allErrors.length > 0) {
    console.log('\n  🔴 ALL ERRORS:');
    allErrors.forEach(e => console.log(`    ${e.page}: ${e.error}`));
  }

  if (allWarnings.length > 0) {
    console.log('\n  🟡 ALL WARNINGS:');
    allWarnings.forEach(w => console.log(`    ${w.page}: ${w.warning}`));
  }

  // HTTP errors summary
  const allHttpErrors = results.flatMap(r => r.httpErrors);
  if (allHttpErrors.length > 0) {
    console.log('\n  🟠 ALL HTTP ERRORS:');
    const unique = [...new Set(allHttpErrors.map(e => `${e.status} ${e.url}`))];
    unique.forEach(e => console.log(`    ${e}`));
  }

  // Network failures summary
  const allNetworkFailures = results.flatMap(r => r.networkFailures);
  if (allNetworkFailures.length > 0) {
    console.log('\n  🟠 ALL NETWORK FAILURES:');
    const unique = [...new Set(allNetworkFailures.map(f => `${f.url} | ${f.reason}`))];
    unique.forEach(f => console.log(`    ${f}`));
  }

  console.log('\n✅ Audit complete.');
})();
