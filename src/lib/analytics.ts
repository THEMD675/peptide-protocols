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
  signup: (method: 'email' | 'google') => trackEvent('sign_up', { method }),
  login: (method: 'email' | 'google') => trackEvent('login', { method }),
  trialStart: (tier: string) => trackEvent('begin_checkout', { currency: 'SAR', value: 0, items: [{ item_name: tier }] }),
  subscribe: (tier: string, value: number) => trackEvent('purchase', { currency: 'SAR', value, items: [{ item_name: tier }] }),
  coachMessage: () => trackEvent('coach_message'),
  injectionLog: (peptide: string) => trackEvent('injection_log', { peptide }),
  protocolStart: (peptide: string) => trackEvent('protocol_start', { peptide }),
  quizComplete: (goal: string) => trackEvent('quiz_complete', { goal }),
  referralShare: (method: string) => trackEvent('referral_share', { method }),
  enquirySubmit: () => trackEvent('enquiry_submit'),
} as const;
