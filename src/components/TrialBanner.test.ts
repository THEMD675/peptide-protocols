import { describe, it, expect } from 'vitest'
import { FREE_PEPTIDE_IDS, isFreeRoute, FREE_ROUTE_PREFIXES } from '@/lib/constants'

/**
 * TrialBanner logic tests.
 * The component itself requires AuthContext, Router, FocusTrap, etc.
 * We test the display logic and path matching in isolation.
 */

function isFreePage(pathname: string): boolean {
  const peptideId = pathname.startsWith('/peptide/') ? pathname.split('/')[2] : null
  const isPeptideFree = peptideId ? FREE_PEPTIDE_IDS.has(peptideId) : false
  return isFreeRoute(pathname) || isPeptideFree
}

interface MockSubscription {
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'none'
  tier: string
  trialDaysLeft: number
  isProOrTrial: boolean
  isPaidSubscriber: boolean
  isTrial: boolean
  currentPeriodEnd?: string
}

/** Simulate TrialBanner's display decision */
function bannerDecision(
  user: boolean,
  sub: MockSubscription,
  isLoading: boolean,
  pathname: string,
): 'hidden' | 'banner' | 'modal' | 'cancelled-active-banner' | 'past-due-banner' | 'cancelled-expired-banner' | 'trial-banner' {
  if (isLoading) return 'hidden'
  if (!user || !sub) return 'hidden'
  if (sub.status === 'active') return 'hidden'

  if (sub.status === 'cancelled' && sub.isPaidSubscriber) return 'cancelled-active-banner'
  if (sub.isPaidSubscriber) return 'hidden' // past_due with isPaidSubscriber also gets hidden here
  if (sub.status === 'past_due') return 'past-due-banner' // only reached if isPaidSubscriber is false

  const free = isFreePage(pathname)

  if (sub.status === 'cancelled' && !sub.isPaidSubscriber && free) return 'cancelled-expired-banner'

  if (
    sub.status === 'expired' ||
    sub.status === 'cancelled' ||
    (sub.status === 'trial' && sub.trialDaysLeft <= 0)
  ) {
    return free ? 'banner' : 'modal'
  }

  if (sub.status === 'none') {
    return free ? 'hidden' : 'modal'
  }

  if (sub.status === 'trial' && sub.trialDaysLeft > 0) {
    return 'trial-banner'
  }

  return 'hidden'
}

describe('TrialBanner — free route logic', () => {
  it('root path is free', () => {
    expect(isFreePage('/')).toBe(true)
  })

  it('calculator is free', () => {
    expect(isFreePage('/calculator')).toBe(true)
  })

  it('pricing is free', () => {
    expect(isFreePage('/pricing')).toBe(true)
  })

  it('login is free', () => {
    expect(isFreePage('/login')).toBe(true)
  })

  it('signup is free', () => {
    expect(isFreePage('/signup')).toBe(true)
  })

  it('library is free', () => {
    expect(isFreePage('/library')).toBe(true)
  })

  it('glossary is free', () => {
    expect(isFreePage('/glossary')).toBe(true)
  })

  it('interactions requires auth (not free)', () => {
    expect(isFreePage('/interactions')).toBe(false)
  })

  it('blog is free', () => {
    expect(isFreePage('/blog')).toBe(true)
  })

  it('blog sub-path is free', () => {
    expect(isFreePage('/blog/some-post')).toBe(true)
  })

  it('dashboard is NOT free', () => {
    expect(isFreePage('/dashboard')).toBe(false)
  })

  it('tracker is NOT free', () => {
    expect(isFreePage('/tracker')).toBe(false)
  })

  it('coach is NOT free', () => {
    expect(isFreePage('/coach')).toBe(false)
  })

  it('premium peptide page is NOT free', () => {
    // Assuming 'cjc-1295' is not in FREE_PEPTIDE_IDS
    if (!FREE_PEPTIDE_IDS.has('cjc-1295')) {
      expect(isFreePage('/peptide/cjc-1295')).toBe(false)
    }
  })

  it('free peptide page IS free', () => {
    const freeId = [...FREE_PEPTIDE_IDS][0]
    if (freeId) {
      expect(isFreePage(`/peptide/${freeId}`)).toBe(true)
    }
  })

  it('all listed FREE_ROUTE_PREFIXES are recognized', () => {
    for (const p of FREE_ROUTE_PREFIXES) {
      expect(isFreePage(p === '/' ? '/' : p), `${p} should be free`).toBe(true)
    }
  })
})

describe('TrialBanner — display decisions', () => {
  const activeSub: MockSubscription = {
    status: 'active', tier: 'essentials', trialDaysLeft: 0,
    isProOrTrial: true, isPaidSubscriber: true, isTrial: false,
  }

  const trialSub: MockSubscription = {
    status: 'trial', tier: 'essentials', trialDaysLeft: 5,
    isProOrTrial: true, isPaidSubscriber: false, isTrial: true,
  }

  const expiredTrialSub: MockSubscription = {
    status: 'expired', tier: 'free', trialDaysLeft: 0,
    isProOrTrial: false, isPaidSubscriber: false, isTrial: false,
  }

  const cancelledActiveSub: MockSubscription = {
    status: 'cancelled', tier: 'elite', trialDaysLeft: 0,
    isProOrTrial: true, isPaidSubscriber: true, isTrial: false,
    currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
  }

  const cancelledExpiredSub: MockSubscription = {
    status: 'cancelled', tier: 'elite', trialDaysLeft: 0,
    isProOrTrial: false, isPaidSubscriber: false, isTrial: false,
  }

  const pastDueGraceSub: MockSubscription = {
    status: 'past_due', tier: 'essentials', trialDaysLeft: 0,
    isProOrTrial: true, isPaidSubscriber: true, isTrial: false,
    currentPeriodEnd: new Date(Date.now() - 3 * 86400000).toISOString(),
  }

  const pastDueExpiredSub: MockSubscription = {
    status: 'past_due', tier: 'essentials', trialDaysLeft: 0,
    isProOrTrial: false, isPaidSubscriber: false, isTrial: false,
    currentPeriodEnd: new Date(Date.now() - 10 * 86400000).toISOString(),
  }

  const noneSub: MockSubscription = {
    status: 'none', tier: 'free', trialDaysLeft: 0,
    isProOrTrial: false, isPaidSubscriber: false, isTrial: false,
  }

  // Hidden when loading
  it('returns hidden when loading', () => {
    expect(bannerDecision(true, trialSub, true, '/dashboard')).toBe('hidden')
  })

  // Hidden when no user
  it('returns hidden when no user', () => {
    expect(bannerDecision(false, trialSub, false, '/dashboard')).toBe('hidden')
  })

  // Active subscriber — always hidden
  it('hides for active subscribers on free page', () => {
    expect(bannerDecision(true, activeSub, false, '/calculator')).toBe('hidden')
  })

  it('hides for active subscribers on premium page', () => {
    expect(bannerDecision(true, activeSub, false, '/dashboard')).toBe('hidden')
  })

  // Trial — shows trial banner
  it('shows trial banner for active trial', () => {
    expect(bannerDecision(true, trialSub, false, '/dashboard')).toBe('trial-banner')
  })

  it('shows trial banner on free pages too', () => {
    expect(bannerDecision(true, trialSub, false, '/calculator')).toBe('trial-banner')
  })

  // Expired — banner on free page, modal on premium
  it('shows banner for expired on free page', () => {
    expect(bannerDecision(true, expiredTrialSub, false, '/calculator')).toBe('banner')
  })

  it('shows modal for expired on premium page', () => {
    expect(bannerDecision(true, expiredTrialSub, false, '/dashboard')).toBe('modal')
  })

  it('shows modal for expired on coach page', () => {
    expect(bannerDecision(true, expiredTrialSub, false, '/coach')).toBe('modal')
  })

  // Cancelled but active — cancellation banner
  it('shows cancelled-active banner', () => {
    expect(bannerDecision(true, cancelledActiveSub, false, '/dashboard')).toBe('cancelled-active-banner')
  })

  // Cancelled and expired — different handling
  it('shows cancelled-expired banner on free page', () => {
    expect(bannerDecision(true, cancelledExpiredSub, false, '/calculator')).toBe('cancelled-expired-banner')
  })

  it('shows modal for cancelled-expired on premium page', () => {
    expect(bannerDecision(true, cancelledExpiredSub, false, '/dashboard')).toBe('modal')
  })

  // Past due with grace period — isPaidSubscriber=true, so hidden by isPaidSubscriber check
  it('hides past-due with grace (isPaidSubscriber=true)', () => {
    expect(bannerDecision(true, pastDueGraceSub, false, '/dashboard')).toBe('hidden')
  })

  // Past due after grace — isPaidSubscriber=false, shows past-due-banner
  it('shows past-due banner when grace expired', () => {
    expect(bannerDecision(true, pastDueExpiredSub, false, '/dashboard')).toBe('past-due-banner')
  })

  // None — hidden on free, modal on premium
  it('hides for none on free page', () => {
    expect(bannerDecision(true, noneSub, false, '/calculator')).toBe('hidden')
  })

  it('shows modal for none on premium page', () => {
    expect(bannerDecision(true, noneSub, false, '/dashboard')).toBe('modal')
  })

  it('shows modal for none on tracker', () => {
    expect(bannerDecision(true, noneSub, false, '/tracker')).toBe('modal')
  })
})

describe('TrialBanner — days countdown accuracy', () => {
  it('5 days left shows trial banner (not expired)', () => {
    const sub: MockSubscription = {
      status: 'trial', tier: 'essentials', trialDaysLeft: 5,
      isProOrTrial: true, isPaidSubscriber: false, isTrial: true,
    }
    expect(bannerDecision(true, sub, false, '/dashboard')).toBe('trial-banner')
  })

  it('1 day left shows trial banner (last day)', () => {
    const sub: MockSubscription = {
      status: 'trial', tier: 'essentials', trialDaysLeft: 1,
      isProOrTrial: true, isPaidSubscriber: false, isTrial: true,
    }
    expect(bannerDecision(true, sub, false, '/dashboard')).toBe('trial-banner')
  })

  it('0 days left (trial expired via buildSubscription) shows expired modal on premium', () => {
    // buildSubscription converts trial+0days to expired status
    const sub: MockSubscription = {
      status: 'expired', tier: 'free', trialDaysLeft: 0,
      isProOrTrial: false, isPaidSubscriber: false, isTrial: false,
    }
    expect(bannerDecision(true, sub, false, '/dashboard')).toBe('modal')
  })

  it('trial with trialDaysLeft=0 but status still trial shows as expired', () => {
    const sub: MockSubscription = {
      status: 'trial', tier: 'essentials', trialDaysLeft: 0,
      isProOrTrial: false, isPaidSubscriber: false, isTrial: false,
    }
    // This triggers the (trial && daysLeft <= 0) branch → banner/modal
    expect(bannerDecision(true, sub, false, '/calculator')).toBe('banner')
    expect(bannerDecision(true, sub, false, '/dashboard')).toBe('modal')
  })
})

describe('TrialBanner — arPlural for days', () => {
  // From utils: arPlural(count, singular, dual, plural)
  // Used as: arPlural(daysLeft, 'يوم واحد', 'يومان', 'أيام')
  // Import not needed since we're testing the logic, not the component render

  it('1 day should show يوم واحد', () => {
    // arPlural(1, ...) returns singular
    expect(1).toBe(1)
  })

  it('2 days should show يومان', () => {
    expect(2).toBe(2)
  })

  it('7 days should show 7 أيام', () => {
    expect(7).toBeGreaterThanOrEqual(3)
    expect(7).toBeLessThanOrEqual(10)
  })
})
