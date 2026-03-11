#!/usr/bin/env node
/**
 * Creates .vercel/output/ directory structure for `vercel deploy --prebuilt`.
 * Converts vercel.json headers/rewrites into Build Output API v3 config.
 * This allows deploying locally-built dist/ (with Puppeteer prerender) to Vercel.
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const OUTPUT = join(ROOT, '.vercel', 'output');
const STATIC = join(OUTPUT, 'static');

// Clean and create output structure
if (existsSync(OUTPUT)) {
  cpSync(OUTPUT, OUTPUT + '.bak', { recursive: true, force: true });
}
mkdirSync(STATIC, { recursive: true });

// Copy dist/ to .vercel/output/static/
cpSync(DIST, STATIC, { recursive: true });

// Read vercel.json
const vercelJson = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf-8'));

// Convert vercel.json headers to Build Output API v3 routes
const routes = [];

// Add header rules (with continue: true so they don't stop routing)
for (const h of (vercelJson.headers || [])) {
  const headerObj = {};
  for (const { key, value } of h.headers) {
    headerObj[key] = value;
  }
  routes.push({
    src: h.source,
    headers: headerObj,
    continue: true,
  });
}

// Filesystem check — serve static files first
routes.push({ handle: 'filesystem' });

// SPA fallback — only for routes without prerendered HTML
// Convert rewrites to routes
for (const r of (vercelJson.rewrites || [])) {
  routes.push({
    src: r.source,
    dest: r.destination,
  });
}

const config = {
  version: 3,
  routes,
  trailingSlash: vercelJson.trailingSlash ?? false,
};

writeFileSync(join(OUTPUT, 'config.json'), JSON.stringify(config, null, 2));

// Preserve project.json (needed for --prebuilt deploy)
const projectJson = join(ROOT, '.vercel', 'project.json');
if (existsSync(projectJson)) {
  console.log('✓ project.json preserved');
}

console.log(`✓ .vercel/output/ created with ${routes.length} route rules`);
console.log(`✓ Static files copied from dist/`);
console.log('Ready for: vercel deploy --prebuilt --prod');
