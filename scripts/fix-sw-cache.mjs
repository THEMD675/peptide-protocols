/**
 * fix-sw-cache.mjs
 * Post-build: patches registerSW.js to disable updateViaCache on the service worker.
 * Extracted from the inline build script for maintainability and error handling.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SW_PATH = 'dist/registerSW.js';

if (!existsSync(SW_PATH)) {
  console.warn(`[fix-sw-cache] ${SW_PATH} not found — skipping patch (PWA may be disabled).`);
  process.exit(0);
}

const original = readFileSync(SW_PATH, 'utf8');
const patched = original.replace("{ scope: '/' }", "{ scope: '/', updateViaCache: 'none' }");

if (patched === original) {
  console.log('[fix-sw-cache] Already patched or pattern not found — no changes.');
} else {
  writeFileSync(SW_PATH, patched);
  console.log('[fix-sw-cache] Patched registerSW.js with updateViaCache: none');
}
