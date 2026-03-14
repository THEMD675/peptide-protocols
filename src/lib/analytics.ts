import { supabase } from './supabase';
import { hasOptionalConsent } from './cookie-utils';
import { logError } from './logger';
import { STORAGE_KEYS } from './constants';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Generate a session ID that persists for this browser session
function getSessionId(): string {
  const key = STORAGE_KEYS.ANALYTICS_SESSION;
  try {
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    // Private browsing or restricted context — use in-memory fallback
    return fallbackSessionId;
  }
}
const fallbackSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Batch queue to reduce DB writes
const eventQueue: Array<{
  event_name: string;
  event_params: Record<string, unknown>;
  page_path: string;
  referrer: string;
  session_id: string;
  user_id?: string;
}> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, eventQueue.length);
  try {
    await supabase.from('analytics_events').insert(batch);
  } catch (e) {
    logError('[analytics] flush failed:', e);
  }
}

async function queueEvent(event: string, params?: Record<string, unknown>) {
  // 9.2: Gate Supabase analytics behind cookie consent (same as GA4)
  if (!hasOptionalConsent()) return;
  let uid: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    uid = data.session?.user?.id;
  } catch {
    // Session fetch failed — continue without user_id
  }
  eventQueue.push({
    event_name: event,
    event_params: params || {},
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    session_id: getSessionId(),
    ...(uid ? { user_id: uid } : {}),
  });

  // Flush every 3 seconds or when batch hits 10
  if (eventQueue.length >= 10) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents();
    }, 3000);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents();
  });
  window.addEventListener('beforeunload', () => flushEvents());
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  try {
    if (!hasOptionalConsent()) return;
    // Send to GA4 if available
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
    // Send to Supabase
    queueEvent(event, params);
  } catch (e) { logError('[analytics] trackEvent failed:', e); }
}

export function trackPageView(path: string) {
  trackEvent('page_view', { page_path: path });
}

export const events = {
  // Page views
  pageView: (path: string) => trackPageView(path),

  // Auth funnel
  signup: (method: 'email' | 'google') => trackEvent('sign_up', { method }),
  login: (method: 'email' | 'google') => trackEvent('login', { method }),
  signupStart: () => trackEvent('signup_start'),
  signupComplete: () => trackEvent('signup_complete'),

  // Quiz funnel
  quizStart: () => trackEvent('quiz_start'),
  quizComplete: (goal: string) => trackEvent('quiz_complete', { goal }),

  // Pricing / checkout funnel
  pricingView: () => trackEvent('pricing_view'),
  checkoutStart: (tier: string, billing: 'monthly' | 'annual') => trackEvent('checkout_start', { tier, billing }),
  trialStart: (tier: string) => trackEvent('begin_checkout', { currency: 'SAR', value: 0, items: [{ item_name: tier }] }),
  subscribe: (tier: string, value: number) => trackEvent('purchase', { currency: 'SAR', value, items: [{ item_name: tier }] }),

  // Feature engagement
  coachMessage: () => trackEvent('coach_message'),
  injectionLog: (peptide: string) => trackEvent('injection_log', { peptide }),
  protocolStart: (peptide: string) => trackEvent('protocol_start', { peptide }),
  trackerView: () => trackEvent('tracker_view'),
  calculatorUse: (peptide: string) => trackEvent('calculator_use', { peptide }),
  searchUse: (query: string) => {
    const healthTerms = /testosterone|إستروجين|هرمون|سكري|ضغط|كوليسترول|أنسولين|thyroid|diabetes|insulin|blood/i;
    const sanitized = healthTerms.test(query) ? '[health_query]' : query;
    trackEvent('search_use', { query: sanitized });
  },

  // Subscription lifecycle
  subscriptionCancelled: (tier: string, reason?: string) => trackEvent('subscription_cancelled', { tier, ...(reason ? { reason } : {}) }),

  // Sharing & referrals
  referralShare: (method: string) => trackEvent('referral_share', { method }),
  referralConversion: (referralCode: string) => trackEvent('referral_conversion', { referral_code: referralCode }),
  shareClick: (target: string) => trackEvent('share_click', { target }),

  // Contact / enquiry
  enquirySubmit: () => trackEvent('enquiry_submit'),

  // Conversion funnel
  trialStarted: (tier: string) => trackEvent('trial_started', { tier }),
  subscriptionCreated: (tier: string, billing?: string) => trackEvent('subscription_created', { tier, billing }),
  featureUsedFirstTime: (feature: string) => trackEvent('feature_used_first_time', { feature }),
} as const;
