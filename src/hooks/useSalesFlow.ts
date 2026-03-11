/**
 * useSalesFlow — React hook wrapping SalesFlowService.
 *
 * Provides the current offer, URL params, and helper functions
 * for any component that needs sales/discount logic.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOffer,
  parseUrlParams,
  getCheckoutCoupon,
  getCheckoutReferral,
  getPricingCtaText,
  showTrialMessaging as _showTrialMessaging,
  type Offer,
  type UrlParams,
  type UserState,
} from '@/services/SalesFlowService';

export interface UseSalesFlowResult {
  /** The determined offer to show */
  offer: Offer;
  /** Parsed URL parameters */
  urlParams: UrlParams;
  /** User state snapshot */
  userState: UserState;
  /** Coupon to pass to checkout */
  checkoutCoupon: string | undefined;
  /** Referral code to pass to checkout */
  checkoutReferral: string | undefined;
  /** CTA text for pricing action buttons */
  pricingCtaText: string;
  /** Whether to show trial messaging */
  showTrialMessaging: boolean;
}

export function useSalesFlow(): UseSalesFlowResult {
  const { user, subscription } = useAuth();
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const urlParams = parseUrlParams(searchParams);
    const userState: UserState = {
      isLoggedIn: !!user,
      subscription,
    };
    const offer = getOffer(userState, urlParams);
    const checkoutCoupon = getCheckoutCoupon(urlParams);
    const checkoutReferral = getCheckoutReferral();
    const pricingCtaText = getPricingCtaText(userState);
    const showTrialMessaging = _showTrialMessaging(userState);

    return {
      offer,
      urlParams,
      userState,
      checkoutCoupon,
      checkoutReferral,
      pricingCtaText,
      showTrialMessaging,
    };
  }, [user, subscription, searchParams]);
}
