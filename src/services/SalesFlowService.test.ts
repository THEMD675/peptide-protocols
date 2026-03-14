import { describe, it, expect } from 'vitest'
import { getOffer, parseUrlParams, getCheckoutCoupon } from './SalesFlowService'

const DEFAULT_SUB = {
  status: 'none' as const,
  tier: 'free' as const,
  trialDaysLeft: 0,
  isProOrTrial: false,
  isPaidSubscriber: false,
  isTrial: false,
  hasStripeSubscription: false,
  needsPaymentSetup: false,
  isAdminGrant: false,
}

const trialSub = { ...DEFAULT_SUB, status: 'trial' as const, isTrial: true, isProOrTrial: true, trialDaysLeft: 2 }
const _activeSub = { ...DEFAULT_SUB, status: 'active' as const, isPaidSubscriber: true, isProOrTrial: true, tier: 'essentials' as const }
const expiredSub = { ...DEFAULT_SUB, status: 'expired' as const }
const adminSub = { ...DEFAULT_SUB, isAdminGrant: true, isProOrTrial: true }

describe('getOffer', () => {
  it('returns admin_grant for admin-granted accounts', () => {
    const offer = getOffer({ isLoggedIn: true, subscription: adminSub })
    expect(offer.type).toBe('admin_grant')
    expect(offer.blocking).toBe(false)
  })

  it('returns trial offer for non-logged-in visitor', () => {
    const offer = getOffer({ isLoggedIn: false, subscription: DEFAULT_SUB })
    expect(offer.type).toBe('trial_cta')
    expect(offer.ctaUrl).toContain('/signup')
  })

  it('returns upgrade urgency for trial users', () => {
    const offer = getOffer({ isLoggedIn: true, subscription: trialSub })
    expect(offer.type).toBe('upgrade_urgency')
  })

  it('returns winback when coupon URL param is present', () => {
    const offer = getOffer({ isLoggedIn: false, subscription: DEFAULT_SUB }, { coupon: 'retention_20_pct' })
    expect(offer.type).toBe('winback')
    expect(offer.coupon).toBe('retention_20_pct')
    expect(offer.discountPercent).toBe(20)
  })

  it('returns referral_friend when referral code in URL', () => {
    const offer = getOffer({ isLoggedIn: false, subscription: DEFAULT_SUB }, { referralCode: 'PP-ABC123' })
    expect(offer.type).toBe('referral_friend')
    expect(offer.referralCode).toBe('PP-ABC123')
  })

  it('returns expired for expired subscription', () => {
    const offer = getOffer({ isLoggedIn: true, subscription: expiredSub })
    expect(offer.type).toContain('expired')
    expect(offer.blocking).toBe(true)
  })
})

describe('parseUrlParams', () => {
  it('parses referral code from ?ref=', () => {
    const params = new URLSearchParams('?ref=PP-XY7K8M')
    const result = parseUrlParams(params)
    expect(result.referralCode).toBe('PP-XY7K8M')
  })

  it('rejects invalid referral code format', () => {
    const params = new URLSearchParams('?ref=invalid')
    const result = parseUrlParams(params)
    expect(result.referralCode).toBeUndefined()
  })

  it('parses coupon from ?coupon=', () => {
    const params = new URLSearchParams('?coupon=retention_20_pct')
    const result = parseUrlParams(params)
    expect(result.coupon).toBe('retention_20_pct')
  })

  it('parses payment result', () => {
    const params = new URLSearchParams('?payment=success')
    const result = parseUrlParams(params)
    expect(result.paymentResult).toBe('success')
  })

  it('returns empty for no params', () => {
    const params = new URLSearchParams('')
    const result = parseUrlParams(params)
    expect(result.referralCode).toBeUndefined()
    expect(result.coupon).toBeUndefined()
  })
})

describe('getCheckoutCoupon', () => {
  it('returns coupon from URL params', () => {
    const result = getCheckoutCoupon({ coupon: 'retention_20_pct' })
    expect(result).toBe('retention_20_pct')
  })

  it('returns undefined when no coupon', () => {
    const result = getCheckoutCoupon()
    expect(result).toBeUndefined()
  })
})
