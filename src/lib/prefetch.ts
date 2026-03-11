/**
 * Route-based chunk prefetching.
 * Call prefetchRoute(path) on hover/focus to preload the JS chunk
 * so navigation feels instant.
 */

const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Landing'),
  '/library': () => import('@/pages/Library'),
  '/blog': () => import('@/pages/Blog'),
  '/pricing': () => import('@/pages/Pricing'),
  '/calculator': () => import('@/pages/DoseCalculator'),
  '/quiz': () => import('@/pages/Quiz'),
  '/stacks': () => import('@/pages/Stacks'),
  '/lab-guide': () => import('@/pages/LabGuide'),
  '/guide': () => import('@/pages/Guide'),
  '/coach': () => import('@/pages/Coach'),
  '/table': () => import('@/pages/PeptideTable'),
  '/sources': () => import('@/pages/Sources'),
  '/community': () => import('@/pages/Community'),
  '/about': () => import('@/pages/About'),
  '/contact': () => import('@/pages/Contact'),
  '/faq': () => import('@/pages/FAQ'),
  '/glossary': () => import('@/pages/Glossary'),
  '/interactions': () => import('@/pages/InteractionChecker'),
  '/compare': () => import('@/pages/Compare'),
  '/login': () => import('@/pages/Login'),
  '/signup': () => import('@/pages/Login'),
  '/dashboard': () => import('@/pages/Dashboard'),
  '/tracker': () => import('@/pages/Tracker'),
  '/account': () => import('@/pages/Account'),
  '/admin': () => import('@/pages/Admin'),
  '/privacy': () => import('@/pages/Privacy'),
  '/terms': () => import('@/pages/Terms'),
  '/transparency': () => import('@/pages/Transparency'),
};

// Track which routes have already been prefetched to avoid duplicate fetches
const prefetched = new Set<string>();

/**
 * Prefetch the JS chunk for a given route path.
 * Safe to call multiple times — deduplicates automatically.
 * For /peptide/:id and /blog/:slug, prefetches the detail page chunk.
 */
export function prefetchRoute(path: string): void {
  // Normalize: strip query/hash
  const clean = path.split('?')[0].split('#')[0];

  if (prefetched.has(clean)) return;
  prefetched.add(clean);

  // Direct match
  const loader = routeImports[clean];
  if (loader) {
    loader().catch(() => {
      // Remove from set so retry is possible
      prefetched.delete(clean);
    });
    return;
  }

  // Dynamic routes
  if (clean.startsWith('/peptide/')) {
    import('@/pages/PeptideDetail').catch(() => prefetched.delete(clean));
    return;
  }
  if (clean.startsWith('/blog/') && clean !== '/blog') {
    import('@/pages/BlogPost').catch(() => prefetched.delete(clean));
    return;
  }
}

/**
 * Returns onMouseEnter/onFocus props for prefetching a route on hover.
 * Usage: <Link to="/library" {...prefetchProps('/library')}>
 */
export function prefetchProps(path: string) {
  return {
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path),
  } as const;
}
