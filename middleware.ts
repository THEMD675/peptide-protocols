/**
 * Vercel Edge Middleware (non-Next.js / Vite project)
 * Detects social sharing bots and rewrites to /api/og for proper OG meta tags.
 * Normal users get the SPA as usual.
 *
 * See: https://vercel.com/docs/functions/edge-middleware/middleware-api
 */
import { next, rewrite } from '@vercel/edge';

// Bot user-agents that fetch OG meta for link previews
const BOT_UA_PATTERNS = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'whatsapp',
  'linkedinbot',
  'slackbot',
  'telegrambot',
  'discordbot',
  'googlebot',
  'bingbot',
  'baiduspider',
  'yandex',
  'applebot',
  'pinterestbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'rogerbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'mediapartners-google',
  'adsbot-google',
  'google-inspectiontool',
];

// Paths to skip (static assets, API routes, etc.)
const SKIP_PATTERNS = [
  /^\/api\//,
  /^\/assets\//,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/manifest\.webmanifest$/,
  /^\/sw\.js$/,
  /^\/workbox-/,
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|webp|map|json|txt|xml)$/,
];

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip static assets and API routes
  if (SKIP_PATTERNS.some((p) => p.test(pathname))) {
    return next();
  }

  // Check user-agent for bots
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOT_UA_PATTERNS.some((pattern) => ua.includes(pattern));

  if (!isBot) {
    return next();
  }

  // Rewrite bot requests to /api/og with the original path
  const ogUrl = new URL('/api/og', request.url);
  ogUrl.searchParams.set('path', pathname);

  return rewrite(ogUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|assets/|api/).*)',
  ],
};
