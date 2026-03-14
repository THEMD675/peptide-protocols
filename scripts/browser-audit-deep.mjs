import puppeteer from 'puppeteer';

const SITE = 'https://pptides.com';

// Every public route a user could hit
const PUBLIC_PAGES = [
  '/', '/library', '/pricing', '/login', '/signup', '/blog',
  '/contact', '/quiz', '/compare', '/interactions', '/glossary',
  '/about', '/privacy', '/terms', '/calculator', '/sources',
  '/stacks', '/lab-guide',
];

// Sample peptide detail pages
const PEPTIDE_PAGES = [
  '/library/bpc-157', '/library/semaglutide', '/library/tb-500',
  '/library/pt-141', '/library/ghk-cu',
];

// Auth-required pages (should redirect to login)
const AUTH_PAGES = [
  '/dashboard', '/tracker', '/coach', '/account', '/community',
];

const ALL_BUGS = [];

function bug(page, severity, category, description) {
  ALL_BUGS.push({ page, severity, category, description });
  const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : severity === 'MEDIUM' ? '🟡' : '⚪';
  console.log(`  ${icon} [${severity}] ${category}: ${description}`);
}

async function auditPage(browser, path, opts = {}) {
  const url = SITE + path;
  const page = await browser.newPage();
  
  // Mobile viewport by default
  await page.setViewport({ width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 });
  
  const consoleErrors = [];
  const jsExceptions = [];
  const networkFails = [];
  const httpErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Skip known noise
      if (text.includes('favicon') || text.includes('google') || text.includes('gtag')) return;
      consoleErrors.push(text.slice(0, 300));
    }
  });
  page.on('pageerror', err => jsExceptions.push(err.message.slice(0, 300)));
  page.on('requestfailed', req => {
    const u = req.url();
    if (u.includes('google') || u.includes('gtag') || u.includes('favicon')) return;
    networkFails.push({ url: u.slice(0, 250), reason: req.failure()?.errorText || 'unknown' });
  });
  page.on('response', resp => {
    const u = resp.url();
    if (resp.status() >= 400 && !u.includes('google') && !u.includes('gtag') && !u.includes('favicon')) {
      httpErrors.push({ url: u.slice(0, 250), status: resp.status() });
    }
  });

  console.log(`\n━━━ ${path} ━━━`);

  let status = 0;
  let timedOut = false;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    status = resp?.status() || 0;
  } catch (e) {
    timedOut = true;
    try {
      // Try getting partial content
      status = 0;
    } catch {}
  }

  // Wait for lazy content
  await new Promise(r => setTimeout(r, 3000));

  if (timedOut) bug(path, 'CRITICAL', 'LOAD', 'Page timed out after 25s');
  if (status >= 400) bug(path, 'CRITICAL', 'HTTP', `Page returned HTTP ${status}`);

  const finalUrl = page.url();
  const redirected = !finalUrl.startsWith(url);
  
  // === CONTENT CHECKS ===
  const pageData = await page.evaluate(() => {
    const body = document.body;
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    const mainText = (main || body)?.innerText?.replace(/\s+/g, ' ') || '';
    
    return {
      title: document.title,
      hasArabic: /[\u0600-\u06FF]/.test(body?.innerText || ''),
      isRTL: document.documentElement.dir === 'rtl' || getComputedStyle(document.documentElement).direction === 'rtl',
      elementCount: document.querySelectorAll('h1, h2, h3, p, button, a').length,
      mainTextLength: mainText.length,
      mainPreview: mainText.slice(0, 400),
      h1Count: document.querySelectorAll('h1').length,
      h1Text: document.querySelector('h1')?.textContent?.trim().slice(0, 100) || '',
      hasOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      bodyHeight: document.body.scrollHeight,
      
      // Images
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src.slice(0, 120),
        loaded: img.naturalWidth > 0,
        alt: img.alt?.slice(0, 60) || '',
        visible: img.getBoundingClientRect().height > 0 && img.getBoundingClientRect().width > 0,
      })),
      
      // Broken links
      deadLinks: Array.from(document.querySelectorAll('a[href]')).filter(l => {
        const h = l.getAttribute('href');
        return h === '#' || h === '' || h === 'undefined' || h === 'null' || h === 'javascript:void(0)';
      }).map(l => ({ text: l.textContent?.trim().slice(0, 40), href: l.getAttribute('href') })).slice(0, 10),
      
      // Overflow elements
      overflowEls: (() => {
        const p = [];
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 5 && r.width > 10) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className?.toString() || '').slice(0, 60);
            const text = el.textContent?.trim().slice(0, 40) || '';
            if (!p.some(x => x.cls === cls)) p.push({ tag, cls, text, right: Math.round(r.right) });
          }
        });
        return p.slice(0, 5);
      })(),
      
      // Touch targets
      smallTargets: (() => {
        const s = [];
        document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="checkbox"]').forEach(b => {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.width < 44 && r.height < 44) {
            const text = (b.textContent?.trim() || b.getAttribute('aria-label') || '').slice(0, 30);
            if (text && !s.some(x => x.text === text)) {
              s.push({ text, w: Math.round(r.width), h: Math.round(r.height) });
            }
          }
        });
        return s.slice(0, 10);
      })(),
      
      // Empty containers (user sees blank space)
      emptyContainers: (() => {
        const e = [];
        document.querySelectorAll('div, section').forEach(el => {
          const r = el.getBoundingClientRect();
          const text = el.innerText?.trim() || '';
          if (r.height > 100 && r.width > 200 && text.length < 5 && el.children.length < 2) {
            const cls = (el.className?.toString() || '').slice(0, 60);
            e.push({ tag: el.tagName, cls, h: Math.round(r.height) });
          }
        });
        return e.slice(0, 5);
      })(),

      // Forms without validation
      forms: Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action?.slice(0, 80) || '',
        inputs: f.querySelectorAll('input, textarea, select').length,
        hasRequired: f.querySelector('[required]') !== null,
        submitBtn: f.querySelector('button[type="submit"], input[type="submit"]')?.textContent?.trim().slice(0, 30) || '',
      })),
      
      // Buttons that look broken (no text, no aria-label)
      unlabeledButtons: Array.from(document.querySelectorAll('button')).filter(b => {
        const text = (b.textContent?.trim() || '');
        const label = b.getAttribute('aria-label') || '';
        return text.length === 0 && label.length === 0 && b.getBoundingClientRect().height > 0;
      }).length,
      
      // Loading spinners still visible after 3s
      visibleSpinners: document.querySelectorAll('[class*="animate-spin"], [class*="animate-pulse"], [class*="skeleton"]').length,
      
      // Error messages visible on page
      errorMessages: Array.from(document.querySelectorAll('[class*="error"], [class*="Error"], [role="alert"]')).map(e => e.textContent?.trim().slice(0, 100)).filter(t => t && t.length > 0).slice(0, 5),
    };
  });

  // Report status line
  console.log(`  Status: ${status} | Redirected: ${redirected ? finalUrl : 'no'} | Elements: ${pageData.elementCount} | RTL: ${pageData.isRTL}`);
  if (pageData.h1Text) console.log(`  H1: "${pageData.h1Text}"`);

  // === FLAG ISSUES ===
  
  if (!pageData.isRTL) bug(path, 'HIGH', 'RTL', 'Page is NOT right-to-left');
  if (!pageData.hasArabic && !opts.expectNoArabic) bug(path, 'HIGH', 'i18n', 'No Arabic text detected');
  if (pageData.h1Count === 0 && !opts.noH1) bug(path, 'MEDIUM', 'SEO', 'Missing H1 tag');
  if (pageData.h1Count > 1) bug(path, 'LOW', 'SEO', `Multiple H1 tags (${pageData.h1Count})`);
  if (pageData.mainTextLength < 50 && !opts.expectMinimal) bug(path, 'CRITICAL', 'CONTENT', `Page appears blank/empty (${pageData.mainTextLength} chars)`);
  if (pageData.hasOverflowX) bug(path, 'HIGH', 'LAYOUT', 'Horizontal overflow — content wider than viewport');
  if (pageData.bodyHeight < 300) bug(path, 'HIGH', 'CONTENT', `Page very short (${pageData.bodyHeight}px) — likely broken render`);
  if (pageData.unlabeledButtons > 0) bug(path, 'MEDIUM', 'A11Y', `${pageData.unlabeledButtons} buttons with no label or text`);
  if (pageData.visibleSpinners > 2) bug(path, 'HIGH', 'UX', `${pageData.visibleSpinners} loading spinners still visible after 3s`);

  // Images
  const brokenImages = pageData.images.filter(i => !i.loaded && i.visible);
  if (brokenImages.length > 0) {
    bug(path, 'HIGH', 'IMAGES', `${brokenImages.length} broken images visible to user`);
    brokenImages.forEach(i => console.log(`    🖼️ ${i.src}`));
  }
  
  // Dead links
  if (pageData.deadLinks.length > 0) {
    bug(path, 'MEDIUM', 'LINKS', `${pageData.deadLinks.length} dead links (href="#" or empty)`);
    pageData.deadLinks.forEach(l => console.log(`    🔗 "${l.text}" → ${l.href}`));
  }

  // Overflow elements
  if (pageData.overflowEls.length > 0) {
    pageData.overflowEls.forEach(o => console.log(`    📐 <${o.tag}> "${o.text}" overflows at ${o.right}px`));
  }

  // Touch targets
  if (pageData.smallTargets.length > 0) {
    bug(path, 'MEDIUM', 'TOUCH', `${pageData.smallTargets.length} touch targets under 44px`);
    pageData.smallTargets.forEach(t => console.log(`    👆 "${t.text}" ${t.w}×${t.h}px`));
  }
  
  // Empty containers
  if (pageData.emptyContainers.length > 0) {
    bug(path, 'MEDIUM', 'LAYOUT', `${pageData.emptyContainers.length} empty visible containers`);
  }

  // Error messages
  if (pageData.errorMessages.length > 0) {
    bug(path, 'HIGH', 'ERROR', 'Error messages visible on page:');
    pageData.errorMessages.forEach(m => console.log(`    ⚠️ "${m}"`));
  }

  // Console errors
  if (consoleErrors.length > 0) {
    bug(path, 'HIGH', 'CONSOLE', `${consoleErrors.length} console errors`);
    consoleErrors.forEach(e => console.log(`    ❌ ${e}`));
  }

  // JS exceptions
  if (jsExceptions.length > 0) {
    bug(path, 'CRITICAL', 'CRASH', `${jsExceptions.length} uncaught JS exceptions`);
    jsExceptions.forEach(e => console.log(`    💥 ${e}`));
  }

  // Network failures (skip supabase health check — known issue)
  const realNetworkFails = networkFails.filter(f => !f.url.endsWith('/rest/v1/'));
  if (realNetworkFails.length > 0) {
    bug(path, 'HIGH', 'NETWORK', `${realNetworkFails.length} network request failures`);
    realNetworkFails.forEach(f => console.log(`    🔴 ${f.url} | ${f.reason}`));
  }

  // HTTP errors
  const realHttpErrors = httpErrors.filter(e => !e.url.endsWith('/rest/v1/'));
  if (realHttpErrors.length > 0) {
    bug(path, 'MEDIUM', 'HTTP', `${realHttpErrors.length} HTTP error responses`);
    realHttpErrors.forEach(e => console.log(`    ⚠️ ${e.status} ${e.url}`));
  }

  // Auth redirect check
  if (opts.expectAuthRedirect) {
    if (!finalUrl.includes('/login')) {
      bug(path, 'CRITICAL', 'AUTH', 'Protected page accessible without authentication!');
    } else {
      console.log(`  ✅ Correctly redirects to login`);
    }
  }
  
  // Unexpected redirect
  if (redirected && !opts.expectAuthRedirect) {
    bug(path, 'HIGH', 'REDIRECT', `Unexpected redirect to ${finalUrl}`);
  }

  await page.close();
}

(async () => {
  console.log(`╔══════════════════════════════════════════════════╗`);
  console.log(`║  DEEP BROWSER AUDIT — pptides.com               ║`);
  console.log(`║  ${new Date().toISOString()}              ║`);
  console.log(`║  Mobile: 375×812 (iPhone 13/14)                 ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  console.log('\n▶ PUBLIC PAGES');
  for (const path of PUBLIC_PAGES) {
    await auditPage(browser, path);
  }

  console.log('\n\n▶ PEPTIDE DETAIL PAGES');
  for (const path of PEPTIDE_PAGES) {
    await auditPage(browser, path);
  }

  console.log('\n\n▶ AUTH-REQUIRED PAGES (should redirect to login)');
  for (const path of AUTH_PAGES) {
    await auditPage(browser, path, { expectAuthRedirect: true });
  }

  await browser.close();

  // === SUMMARY ===
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║  AUDIT SUMMARY                                   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const critical = ALL_BUGS.filter(b => b.severity === 'CRITICAL');
  const high = ALL_BUGS.filter(b => b.severity === 'HIGH');
  const medium = ALL_BUGS.filter(b => b.severity === 'MEDIUM');
  const low = ALL_BUGS.filter(b => b.severity === 'LOW');

  console.log(`Total bugs found: ${ALL_BUGS.length}`);
  console.log(`  🔴 CRITICAL: ${critical.length}`);
  console.log(`  🟠 HIGH: ${high.length}`);
  console.log(`  🟡 MEDIUM: ${medium.length}`);
  console.log(`  ⚪ LOW: ${low.length}`);

  if (critical.length > 0) {
    console.log('\n🔴 CRITICAL BUGS:');
    critical.forEach(b => console.log(`  [${b.page}] ${b.category}: ${b.description}`));
  }
  if (high.length > 0) {
    console.log('\n🟠 HIGH PRIORITY:');
    high.forEach(b => console.log(`  [${b.page}] ${b.category}: ${b.description}`));
  }
  if (medium.length > 0) {
    console.log('\n🟡 MEDIUM:');
    medium.forEach(b => console.log(`  [${b.page}] ${b.category}: ${b.description}`));
  }

  console.log('\n=== AUDIT COMPLETE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
