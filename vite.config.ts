import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";
import { TRIAL_DAYS } from "./src/config/trial";

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    {
      name: 'inject-trial-days',
      transformIndexHtml(html) {
        return html
          .replace(/%TRIAL_DAYS%/g, String(TRIAL_DAYS));
      },
    },
    {
      // Inject <link rel="modulepreload"> for the hashed entry chunk so browsers
      // start fetching it as soon as they parse the <head>, shaving ~50-100ms off TTFB.
      name: 'modulepreload-entry',
      enforce: 'post' as const,
      transformIndexHtml: {
        order: 'post' as const,
        handler(html: string) {
          const match = html.match(/<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)">/);
          if (match) {
            const preloadLink = `<link rel="modulepreload" crossorigin href="${match[1]}">`;
            return html.replace('</head>', `  ${preloadLink}\n  </head>`);
          }
          return html;
        },
      },
    },
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png', 'og-image.jpg'],
      manifest: {
        name: 'pptides — دليل الببتيدات العلاجية',
        short_name: 'pptides',
        description: 'أشمل دليل عربي للببتيدات العلاجية مع بروتوكولات كاملة وحاسبة جرعات ومدرب ذكي',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-16.png',  sizes: '16x16',   type: 'image/png' },
          { src: '/icon-32.png',  sizes: '32x32',   type: 'image/png' },
          { src: '/icon-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // NOTE: With injectManifest strategy, runtime caching MUST live in sw.ts —
      // the workbox.runtimeCaching / navigateFallback blocks here are silently
      // ignored. Font caching and navigation fallback are handled in sw.ts.
      workbox: {
        // Only globPatterns is used by injectManifest to build __WB_MANIFEST
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
    // Sentry source map upload — only runs when SENTRY_AUTH_TOKEN is set (CI / Vercel build)
    // sourcemap mode is set to 'hidden' above when this runs, so .map files are
    // generated, uploaded, then deleted — never served to the browser.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG ?? 'verdix',
            project: process.env.SENTRY_PROJECT ?? 'javascript-react',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { inject: false, create: false, finalize: false },
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/assets/**/*.js.map'],
            },
            telemetry: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    // Hidden sourcemaps: uploaded to Sentry but not served to the browser
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core vendor
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router'))
            return 'vendor';
          // Supabase
          if (id.includes('node_modules/@supabase'))
            return 'supabase';
          // UI utilities (must come before recharts to keep clsx/tailwind-merge out of heavy chunks)
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/sonner') || id.includes('node_modules/react-helmet-async') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge'))
            return 'ui';
          // Heavy chart lib — lazy loaded only
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-'))
            return 'recharts';
          // html2canvas — lazy loaded only
          if (id.includes('node_modules/html2canvas'))
            return 'html2canvas';
          // Focus trap — lazy loaded
          if (id.includes('node_modules/focus-trap') || id.includes('node_modules/tabbable'))
            return 'focus-trap';
        },
      },
    },
  },
});
