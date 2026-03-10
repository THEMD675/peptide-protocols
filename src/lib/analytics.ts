declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
  } catch { /* analytics should never crash the app */ }
}

export const events = {
  // Auth funnel
  signup: (method: 'email' | 'google') => trackEvent('sign_up', { method }),
  login: (method: 'email' | 'google') => trackEvent('login', { method }),

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

  // Sharing & referrals
  referralShare: (method: string) => trackEvent('referral_share', { method }),
  shareClick: (target: string) => trackEvent('share_click', { target }),

  // Contact / enquiry
  enquirySubmit: () => trackEvent('enquiry_submit'),
} as const;
