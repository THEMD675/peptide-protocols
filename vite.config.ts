import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
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
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/rest/, /^\/_vercel/, /^\/dashboard/, /^\/tracker/, /^\/coach/, /^\/account/, /^\/admin/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Must stay in sync with VITE_SUPABASE_URL — regex matches the Supabase project URL for REST API requests
          {
            urlPattern: /^https:\/\/rxxzphwojutewvbfzgqd\.supabase\.co\/rest\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
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
