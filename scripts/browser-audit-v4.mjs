/**
 * BROWSER AUDIT v4 — pptides.com
 * Launches a FRESH BROWSER per page to avoid Vercel rate limiting.
 */
import puppeteer from 'puppeteer';

const BASE = 'https://pptides.com';
const VIEWPORT = { width: 375, height: 812 };
const TIMEOUT = 25000;
const DELAY = 4000;

const PAGES = [
  '/', '/library', '/pricing', '/login', '/signup',
  '/blog', '/contact', '/quiz', '/compare', '/interactions',
  '/glossary', '/about', '/privacy', '/terms', '/calculator',
  '/sources', '/stacks', '/lab-guide',
  '/library/bpc-157', '/library/semaglutide', '/library/tb-500',
  '/dashboard', '/tracker', '/ai-coach', '/protocol-wizard',
  '/account', '/bookmarks',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function auditPage(path) {
  const url = `${BASE}${path}`;
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-http2'],
  });

  const result = { path, errors: [], warnings: [], info: [], consoleErrors: [], networkFails: [], httpErrors: [] };
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15');

  page.on('console', msg => { if (msg.type() === 'error') result.consoleErrors.push(msg.text().substring(0, 200)); });
  page.on('requestfailed', req => {
    const u = req.url(); if (u.includes('favicon')) return;
    result.networkFails.push(`${u.substring(0, 120)} | ${req.failure()?.errorText || '?'}`);
  });
  page.on('response', res => {
    if (res.status() >= 400) { const u = res.url(); if (!u.includes('favicon')) result.httpErrors.push(`${res.status()} ${u.substring(0, 120)}`); }
  });

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    result.status = res?.status() || 0;
    const finalUrl = page.url();
    if (finalUrl !== url && finalUrl !== url + '/') result.redirectedTo = finalUrl;

    await sleep(1000);

    const data = await page.evaluate(() => {
      const dir = document.documentElement.getAttribute('dir');
      const h1 = document.querySelector('h1')?.textContent?.trim()?.substring(0, 80) || null;
      const title = document.title || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
      const jsonLd = !!document.querySelector('script[type="application/ld+json"]');
      const bodyText = document.body?.textContent || '';
      const arabicChars = (bodyText.match(/[\u0600-\u06FF]/g) || []).length;
      const elCount = document.querySelectorAll('*').length;
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;

      const brokenImgs = [];
      document.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) brokenImgs.push(img.src?.substring(0, 120) || '?');
      });

      const smallTargets = [];
      document.querySelectorAll('a, button, [role="button"], input, select').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
          const t = el.textContent?.trim()?.substring(0, 40) || el.tagName;
          smallTargets.push(`${t} (${Math.round(r.width)}×${Math.round(r.height)})`);
        }
      });
      // Deduplicate
      const uniqueSmall = [...new Set(smallTargets)];

      // Check for visible error texts on page
      const errorTexts = [];
      document.querySelectorAll('p, span, div, h1, h2, h3').forEach(el => {
        const t = el.textContent?.trim()?.toLowerCase() || '';
        if (t.length > 3 && t.length < 200 && el.offsetParent !== null) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            if (['undefined', 'nan', 'null'].some(kw => t === kw)) {
              errorTexts.push(el.textContent.trim().substring(0, 80));
            }
          }
        }
      });

      return { dir, h1, title, metaDesc, ogTitle, ogImage, canonical, jsonLd, arabicChars, elCount, overflow, brokenImgs, uniqueSmall, errorTexts };
    });

    result.info.push(`${data.elCount} elements | H1: "${data.h1 || 'NONE'}" | Title: "${data.title.substring(0, 60)}"`);

    if (data.dir !== 'rtl') result.errors.push(`RTL missing (dir="${data.dir}")`);
    if (data.arabicChars < 50) result.errors.push(`No Arabic text (${data.arabicChars} chars)`);
    if (!data.metaDesc) result.warnings.push('Missing meta description');
    if (!data.ogTitle) result.warnings.push('Missing og:title');
    if (!data.ogImage) result.warnings.push('Missing og:image');
    if (!data.canonical) result.warnings.push('Missing canonical');
    if (!data.jsonLd) result.warnings.push('Missing JSON-LD');
    if (data.overflow) result.errors.push('Horizontal overflow (mobile broken)');
    if (data.brokenImgs.length > 0) {
      result.errors.push(`${data.brokenImgs.length} broken images`);
      data.brokenImgs.slice(0, 3).forEach(i => result.info.push(`  Broken: ${i}`));
    }
    if (data.uniqueSmall.length > 3) {
      result.warnings.push(`${data.uniqueSmall.length} small touch targets`);
      data.uniqueSmall.slice(0, 3).forEach(s => result.info.push(`  Small: ${s}`));
    }
    if (data.errorTexts.length > 0) {
      result.errors.push(`Visible error text: ${data.errorTexts.join(', ')}`);
    }

  } catch (err) {
    result.errors.push(`LOAD: ${err.message.substring(0, 150)}`);
  }

  await browser.close();
  return result;
}

function print(r) {
  const icon = r.errors.length ? '🔴' : r.warnings.length ? '🟡' : '🟢';
  console.log(`${icon} ${r.path}  [${r.status || 'ERR'}${r.redirectedTo ? ' → ' + r.redirectedTo.replace(BASE, '') : ''}]`);
  r.info.forEach(i => console.log(`   ${i}`));
  r.errors.forEach(e => console.log(`   🔴 ${e}`));
  r.warnings.forEach(w => console.log(`   🟡 ${w}`));
  if (r.consoleErrors.length) { console.log(`   🟠 ${r.consoleErrors.length} console errors`); r.consoleErrors.slice(0, 2).forEach(e => console.log(`      ${e}`)); }
  if (r.networkFails.length) { console.log(`   🟠 ${r.networkFails.length} net failures`); r.networkFails.slice(0, 2).forEach(f => console.log(`      ${f}`)); }
  if (r.httpErrors.length) { console.log(`   🟠 ${r.httpErrors.length} HTTP errors`); r.httpErrors.slice(0, 2).forEach(e => console.log(`      ${e}`)); }
}

(async () => {
  console.log(`\n🔍 AUDIT v4 — ${new Date().toISOString()} — ${PAGES.length} pages\n`);
  const all = [];
  for (const p of PAGES) {
    process.stdout.write(`  Testing ${p}...`);
    const r = await auditPage(p);
    all.push(r);
    print(r);
    process.stdout.write('\n');
    await sleep(DELAY);
  }

  console.log('\n══════════ SUMMARY ══════════');
  const errs = all.filter(r => r.errors.length > 0);
  const warns = all.filter(r => r.warnings.length > 0 && r.errors.length === 0);
  const clean = all.filter(r => r.errors.length === 0 && r.warnings.length === 0);
  console.log(`🟢 ${clean.length} clean | 🟡 ${warns.length} warnings only | 🔴 ${errs.length} errors`);

  if (errs.length) {
    console.log('\nPages with errors:');
    errs.forEach(r => { console.log(`  ${r.path}:`); r.errors.forEach(e => console.log(`    - ${e}`)); });
  }
  console.log('\n✅ Done');
})();
