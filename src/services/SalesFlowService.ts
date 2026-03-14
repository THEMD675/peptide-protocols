/**
 * SalesFlowService.ts — Single source of truth for ALL pricing, discount, and offer logic.
 *
 * Every page that needs to determine what offer/CTA/banner/discount to show
 * MUST go through this service. No ad-hoc discount logic in components.
 *
 * Architecture: pure functions + a React hook (useSalesFlow) for components.
 */

import type { Subscription } from '@/contexts/AuthContext';
import { REFERRAL_CODE_REGEX } from '@/lib/constants';
import { TRIAL, REFERRAL, RETENTION, WINBACK, UPGRADE } from '@/constants/sales-copy';

// ─── Types ──────────────────────────────────────────────────

export type OfferType =
  | 'trial_cta'           // New visitor → show trial CTA
  | 'upgrade_urgency'     // Trial user → show upgrade with urgency
  | 'trial_expired'       // Trial expired → show win-back 20% offer
  | 'referral_friend'     // Referred user → show "your friend invited you"
  | 'retention'           // Cancelling user → show 20% retention offer
  | 'winback'             // Cancelled user → show win-back email offer
  | 'referral_program'    // Paid user → show referral program
  | 'resubscribe'         // Cancelled but still has access → show resubscribe
  | 'past_due'            // Payment failed → show update payment
  | 'payment_setup'       // Trial without card → show payment setup
  | 'admin_grant'         // Admin-granted → no sales needed
  | 'active'              // Active paid → no sales needed (show referral)
  | 'none';               // No offer applicable

export interface Offer {
  type: OfferType;
  /** Primary heading/title for the offer */
  heading: string;
  /** Body/description text */
  body: string;
  /** CTA button text */
  cta: string;
  /** Where the CTA should link/navigate to */
  ctaUrl: string;
  /** Optional coupon code to apply at checkout */
  coupon?: string;
  /** Optional discount percentage to display */
  discountPercent?: number;
  /** Optional referral code context */
  referralCode?: string;
  /** Whether to show urgency indicators */
  urgent: boolean;
  /** Whether this is a blocking modal (vs banner) */
  blocking: boolean;
}

export interface UserState {
  /** Is there a logged-in user? */
  isLoggedIn: boolean;
  /** Subscription state from AuthContext */
  subscription: Subscription;
}

export interface UrlParams {
  /** Referral code from ?referral=PP-XXXXXX or ?ref=PP-XXXXXX */
  referralCode?: string;
  /** Coupon from ?coupon=retention_20_pct */
  coupon?: string;
  /** Post-trial setup flow ?setup=1 */
  isSetupFlow?: boolean;
  /** Expired trial urgency ?expired=1 */
  isExpiredFlow?: boolean;
  /** Payment result ?payment=success|cancelled|error */
  paymentResult?: 'success' | 'cancelled' | 'error';
}

// ─── Core Logic ─────────────────────────────────────────────

/**
 * Determines what offer to show based on user state.
 * This is THE decision point for all sales/discount logic.
 */
export function getOffer(state: UserState, urlParams?: UrlParams): Offer {
  const { isLoggedIn, subscription: sub } = state;

  // Admin-granted accounts → no sales needed
  if (sub.isAdminGrant) {
    return {
      type: 'admin_grant',
      heading: '',
      body: '',
      cta: '',
      ctaUrl: '/dashboard',
      urgent: false,
      blocking: false,
    };
  }

  // Skip URL param overrides (coupon/referral) for active subscribers
  const isActivePaidSubscriber = sub.isPaidSubscriber || sub.status === 'active';
  if (!isActivePaidSubscriber) {
    // URL param overrides for win-back coupons
    if (urlParams?.coupon) {
      const percent = parseCouponPercent(urlParams.coupon);
      return {
        type: 'winback',
        heading: WINBACK.couponBanner(percent),
        body: WINBACK.couponBanner(percent),
        cta: TRIAL.ctaFree,
        ctaUrl: '/pricing',
        coupon: urlParams.coupon,
        discountPercent: percent,
        urgent: true,
        blocking: false,
      };
    }

    // URL param: referral context
    if (urlParams?.referralCode) {
      return {
        type: 'referral_friend',
        heading: REFERRAL.friendBanner(urlParams.referralCode),
        body: REFERRAL.friendBanner(urlParams.referralCode),
        cta: isLoggedIn ? TRIAL.ctaFree : TRIAL.ctaSignup,
        ctaUrl: isLoggedIn ? '/pricing' : `/signup?redirect=/pricing&referral=${urlParams.referralCode}`,
        referralCode: urlParams.referralCode,
        urgent: false,
        blocking: false,
      };
    }
  }

  // Not logged in → trial CTA
  if (!isLoggedIn) {
    return {
      type: 'trial_cta',
      heading: TRIAL.subtitle,
      body: TRIAL.subtitle,
      cta: TRIAL.ctaSignup,
      ctaUrl: '/signup?redirect=/pricing',
      urgent: false,
      blocking: false,
    };
  }

  // Trial user without payment method → payment setup
  if (sub.needsPaymentSetup) {
    return {
      type: 'payment_setup',
      heading: TRIAL.paymentWallTitle,
      body: TRIAL.paymentWallDesc,
      cta: TRIAL.paymentWallCta,
      ctaUrl: '/pricing?setup=1',
      urgent: true,
      blocking: true,
    };
  }

  // Active trial → upgrade urgency
  if (sub.isTrial && sub.trialDaysLeft > 0) {
    const isLastDay = sub.trialDaysLeft <= 1;
    return {
      type: 'upgrade_urgency',
      heading: isLastDay ? TRIAL.bannerLastDay : '',
      body: isLastDay ? TRIAL.bannerLastDay : '',
      cta: UPGRADE.subscribeCta,
      ctaUrl: '/pricing',
      urgent: isLastDay,
      blocking: false,
    };
  }

  // Trial expired
  if (sub.status === 'expired' || (sub.status === 'trial' && sub.trialDaysLeft <= 0)) {
    return {
      type: 'trial_expired',
      heading: TRIAL.expiredModalTitleTrial,
      body: TRIAL.expiredModalBody,
      cta: UPGRADE.subscribeCta,
      ctaUrl: '/pricing?expired=1',
      coupon: 'retention_20_pct',
      discountPercent: WINBACK.defaultPercent,
      urgent: true,
      blocking: true,
    };
  }

  // Past due
  if (sub.status === 'past_due') {
    return {
      type: 'past_due',
      heading: UPGRADE.pastDueBanner,
      body: UPGRADE.pastDueBanner,
      cta: UPGRADE.pastDueUpdateCta,
      ctaUrl: '/account',
      urgent: true,
      blocking: false,
    };
  }

  // Cancelled with remaining access period
  if (sub.status === 'cancelled' && sub.isPaidSubscriber) {
    return {
      type: 'resubscribe',
      heading: RETENTION.cancelledBanner,
      body: RETENTION.cancelledBanner,
      cta: RETENTION.resubscribeCta,
      ctaUrl: '/pricing',
      urgent: false,
      blocking: false,
    };
  }

  // Cancelled without access → win-back
  if (sub.status === 'cancelled' && !sub.isPaidSubscriber) {
    return {
      type: 'winback',
      heading: RETENTION.cancelledBannerNoAccess,
      body: TRIAL.expiredModalBody,
      cta: RETENTION.resubscribeCta,
      ctaUrl: '/pricing?coupon=retention_20_pct',
      coupon: 'retention_20_pct',
      discountPercent: WINBACK.defaultPercent,
      urgent: true,
      blocking: true,
    };
  }

  // No subscription at all → trial CTA
  if (sub.status === 'none') {
    return {
      type: 'trial_cta',
      heading: TRIAL.subtitle,
      body: UPGRADE.subscribersOnlyBody,
      cta: TRIAL.startTrialCta,
      ctaUrl: '/pricing',
      urgent: false,
      blocking: false,
    };
  }

  // Active paid user → show referral program
  if (sub.isPaidSubscriber || sub.status === 'active') {
    return {
      type: 'referral_program',
      heading: REFERRAL.heading,
      body: REFERRAL.description,
      cta: REFERRAL.ctaLoggedIn,
      ctaUrl: '/account',
      urgent: false,
      blocking: false,
    };
  }

  // Fallback
  return {
    type: 'none',
    heading: '',
    body: '',
    cta: '',
    ctaUrl: '/pricing',
    urgent: false,
    blocking: false,
  };
}

/**
 * Parse URL search params into our UrlParams structure.
 * Call this once at the component level and pass to getOffer.
 */
export function parseUrlParams(searchParams: URLSearchParams): UrlParams {
  const referralCode = searchParams.get('referral') || searchParams.get('ref') || undefined;
  const validRef = referralCode && REFERRAL_CODE_REGEX.test(referralCode) ? referralCode : undefined;

  return {
    referralCode: validRef,
    coupon: searchParams.get('coupon') || undefined,
    isSetupFlow: searchParams.get('setup') === '1',
    isExpiredFlow: searchParams.get('expired') === '1',
    paymentResult: (['success', 'cancelled', 'error'].includes(searchParams.get('payment') ?? '')
      ? searchParams.get('payment') as 'success' | 'cancelled' | 'error'
      : undefined),
  };
}

/**
 * Determine the checkout coupon to use.
 * Priority: URL coupon > localStorage referral > none
 */
export function getCheckoutCoupon(urlParams?: UrlParams): string | undefined {
  if (urlParams?.coupon) return urlParams.coupon;
  return undefined;
}

/**
 * Get the referral code to pass to checkout, from URL or localStorage.
 */
export function getCheckoutReferral(): string | undefined {
  try {
    const r = localStorage.getItem('pptides_referral');
    if (r && REFERRAL_CODE_REGEX.test(r)) return r;
  } catch { /* expected */ }
  return undefined;
}

// ─── Helpers ────────────────────────────────────────────────

function parseCouponPercent(couponId: string): number {
  // retention_20_pct → 20
  const match = couponId.match(/(\d+)_pct/);
  return match ? parseInt(match[1], 10) : WINBACK.defaultPercent;
}

/**
 * Determine the CTA text for the pricing page action button based on user state.
 */
export function getPricingCtaText(state: UserState): string {
  if (!state.isLoggedIn) return TRIAL.ctaSignup;
  if (state.subscription.isTrial || state.subscription.status === 'none') return TRIAL.ctaFree;
  if (state.subscription.status === 'expired' || state.subscription.status === 'cancelled') return RETENTION.resubscribeCta;
  return UPGRADE.subscribeCta;
}

/**
 * Should we show trial messaging (free trial info) on pricing page?
 */
export function showTrialMessaging(state: UserState): boolean {
  return !state.isLoggedIn || state.subscription.status === 'none' || state.subscription.status === 'trial';
}
