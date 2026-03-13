import puppeteer from 'puppeteer';

const SITE = 'https://pptides.com';
const PAGES = [
  '/',
  '/library',
  '/pricing',
  '/login',
  '/blog',
  '/contact',
  '/quiz',
  '/compare',
  '/interactions',
  '/glossary',
  '/about',
  '/privacy',
  '/terms',
];

async function auditPage(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  
  const consoleErrors = [];
  const jsExceptions = [];
  const networkFails = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 250));
  });
  page.on('pageerror', err => jsExceptions.push(err.message.slice(0, 250)));
  page.on('requestfailed', req => {
    const url = req.url();
    if (url.includes('analytics') || url.includes('gtag') || url.includes('google')) return;
    networkFails.push({ url: url.slice(0, 200), reason: req.failure()?.errorText || 'unknown' });
  });

  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    status = resp?.status() || 0;
  } catch (e) {
    console.log(`  TIMEOUT/ERROR loading ${url}: ${e.message.slice(0, 100)}`);
    await page.close();
    return;
  }

  // Wait a bit for any lazy JS
  await new Promise(r => setTimeout(r, 2000));

  const title = await page.title();
  const contentCount = await page.evaluate(() => document.querySelectorAll('h1, h2, h3, p, button, a').length);
  const hasArabic = await page.evaluate(() => /[\u0600-\u06FF]/.test(document.body?.innerText || ''));
  const bodyPreview = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 150));
  
  // Check for broken images
  const brokenImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const broken = [];
    imgs.forEach(img => {
      if (img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
        broken.push(img.src.slice(0, 100));
      }
    });
    return broken;
  });

  // Check for RTL
  const isRTL = await page.evaluate(() => {
    const html = document.documentElement;
    return html.dir === 'rtl' || getComputedStyle(html).direction === 'rtl';
  });

  // Check for links that go nowhere
  const deadLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href]');
    const dead = [];
    links.forEach(l => {
      const href = l.getAttribute('href');
      if (href === '#' || href === '' || href === 'undefined' || href === 'null') {
        dead.push({ text: l.textContent?.trim().slice(0, 40), href });
      }
    });
    return dead.slice(0, 10);
  });

  // Check for overflow (horizontal scroll)
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  // Check for elements that overflow their containers
  const overflowEls = await page.evaluate(() => {
    const problems = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 5 && rect.width > 0) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className?.toString().slice(0, 50) || '';
        if (!problems.some(p => p.tag === tag && p.cls === cls)) {
          problems.push({ tag, cls, right: Math.round(rect.right), width: Math.round(rect.width) });
        }
      }
    });
    return problems.slice(0, 5);
  });

  // Check for tiny touch targets
  const smallButtons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
    const small = [];
    btns.forEach(b => {
      const rect = b.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        const text = b.textContent?.trim().slice(0, 30) || b.getAttribute('aria-label')?.slice(0, 30) || '';
        if (text && !small.some(s => s.text === text)) {
          small.push({ text, w: Math.round(rect.width), h: Math.round(rect.height) });
        }
      }
    });
    return small.slice(0, 8);
  });

  console.log(`\n=== ${url} ===`);
  console.log(`  Status: ${status} | Title: "${title}" | Elements: ${contentCount} | Arabic: ${hasArabic} | RTL: ${isRTL}`);
  if (bodyPreview.length < 20) console.log(`  ⚠️ NEARLY BLANK PAGE: "${bodyPreview}"`);
  if (hasOverflow) console.log(`  ⚠️ HORIZONTAL OVERFLOW DETECTED`);
  if (!isRTL) console.log(`  ⚠️ NOT RTL!`);
  if (!hasArabic && url !== '/login') console.log(`  ⚠️ NO ARABIC TEXT DETECTED`);
  
  if (consoleErrors.length > 0) {
    console.log(`  Console errors (${consoleErrors.length}):`);
    consoleErrors.forEach(e => console.log(`    ❌ ${e}`));
  }
  if (jsExceptions.length > 0) {
    console.log(`  JS exceptions (${jsExceptions.length}):`);
    jsExceptions.forEach(e => console.log(`    💥 ${e}`));
  }
  if (networkFails.length > 0) {
    console.log(`  Network failures (${networkFails.length}):`);
    networkFails.forEach(f => console.log(`    🔴 ${f.url} | ${f.reason}`));
  }
  if (brokenImages.length > 0) {
    console.log(`  Broken images (${brokenImages.length}):`);
    brokenImages.forEach(i => console.log(`    🖼️ ${i}`));
  }
  if (deadLinks.length > 0) {
    console.log(`  Dead links (${deadLinks.length}):`);
    deadLinks.forEach(l => console.log(`    🔗 "${l.text}" → href="${l.href}"`));
  }
  if (overflowEls.length > 0) {
    console.log(`  Overflow elements:`);
    overflowEls.forEach(o => console.log(`    📐 <${o.tag} class="${o.cls}"> right=${o.right} width=${o.width}`));
  }
  if (smallButtons.length > 0) {
    console.log(`  Small touch targets (<44px):`);
    smallButtons.forEach(b => console.log(`    👆 "${b.text}" ${b.w}x${b.h}px`));
  }
  if (consoleErrors.length === 0 && jsExceptions.length === 0 && networkFails.length === 0 && brokenImages.length === 0 && !hasOverflow) {
    console.log(`  ✅ CLEAN`);
  }
  
  await page.close();
}

(async () => {
  console.log(`Browser audit of ${SITE} — ${new Date().toISOString()}`);
  console.log(`Testing ${PAGES.length} pages on mobile viewport (375x812)\n`);
  
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });

  for (const path of PAGES) {
    await auditPage(browser, SITE + path);
  }

  await browser.close();
  console.log('\n=== AUDIT COMPLETE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
