import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildSubscription } from './AuthContext'

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600000).toISOString()
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60000).toISOString()
}

describe('buildSubscription', () => {
  // ── Null / empty input ──
  it('returns default subscription for null row', () => {
    const sub = buildSubscription(null)
    expect(sub.status).toBe('none')
    expect(sub.tier).toBe('free')
    expect(sub.isProOrTrial).toBe(false)
    expect(sub.isPaidSubscriber).toBe(false)
    expect(sub.isTrial).toBe(false)
    expect(sub.trialDaysLeft).toBe(0)
  })

  it('returns default subscription for empty object', () => {
    const sub = buildSubscription({})
    expect(sub.status).toBe('none')
    expect(sub.tier).toBe('free')
  })

  it('returns default for row with only null values', () => {
    const sub = buildSubscription({ status: null, tier: null })
    expect(sub.status).toBe('none')
    expect(sub.tier).toBe('free')
  })

  // ── Tier mapping (comprehensive) ──
  it.each([
    ['free', 'free'],
    ['essentials', 'essentials'],
    ['pro', 'essentials'],
    ['standard', 'essentials'],
    ['elite', 'elite'],
    ['premium', 'elite'],
    ['vip', 'elite'],
  ])('maps tier "%s" to "%s"', (input, expected) => {
    const sub = buildSubscription({ status: 'active', tier: input, current_period_end: daysFromNow(30) })
    expect(sub.tier).toBe(expected)
  })

  it('falls back to free for unknown tier', () => {
    const sub = buildSubscription({ status: 'active', tier: 'unknown_tier' })
    expect(sub.tier).toBe('free')
  })

  it('falls back to free when tier is undefined', () => {
    const sub = buildSubscription({ status: 'active' })
    expect(sub.tier).toBe('free')
  })

  it('falls back to free for empty string tier', () => {
    const sub = buildSubscription({ status: 'active', tier: '' })
    expect(sub.tier).toBe('free')
  })

  // ── Active subscription ──
  it('recognizes active subscription', () => {
    const sub = buildSubscription({
      status: 'active',
      tier: 'essentials',
      current_period_end: daysFromNow(30),
    })
    expect(sub.status).toBe('active')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
    expect(sub.isTrial).toBe(false)
  })

  it('active subscription without period end is still active', () => {
    const sub = buildSubscription({ status: 'active', tier: 'elite' })
    expect(sub.status).toBe('active')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  // ── Trial with time remaining ──
  it('recognizes active trial', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: daysFromNow(2),
    })
    expect(sub.status).toBe('trial')
    expect(sub.isTrial).toBe(true)
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(false)
    expect(sub.trialDaysLeft).toBeGreaterThan(0)
  })

  it('trial with exactly 7 days shows 7 days left', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: daysFromNow(7),
    })
    expect(sub.trialDaysLeft).toBe(7)
    expect(sub.isTrial).toBe(true)
  })

  it('trial ending in less than 1 day shows 1 day left (ceiling)', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: hoursFromNow(2),
    })
    expect(sub.trialDaysLeft).toBe(1)
    expect(sub.isTrial).toBe(true)
    expect(sub.status).toBe('trial')
  })

  it('trial ending in 1 minute still shows 1 day left', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: minutesFromNow(1),
    })
    expect(sub.trialDaysLeft).toBe(1)
    expect(sub.isTrial).toBe(true)
  })

  // ── Expired trial ──
  it('marks expired trial as expired', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: daysAgo(1),
    })
    expect(sub.status).toBe('expired')
    expect(sub.isTrial).toBe(false)
    expect(sub.isProOrTrial).toBe(false)
    expect(sub.trialDaysLeft).toBe(0)
  })

  it('marks trial that just expired (1 minute ago) as expired', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: new Date(Date.now() - 60000).toISOString(),
    })
    expect(sub.status).toBe('expired')
    expect(sub.trialDaysLeft).toBe(0)
    expect(sub.isTrial).toBe(false)
  })

  it('trial without trial_ends_at is immediately expired', () => {
    const sub = buildSubscription({ status: 'trial', tier: 'essentials' })
    expect(sub.status).toBe('expired')
    expect(sub.trialDaysLeft).toBe(0)
    expect(sub.isTrial).toBe(false)
    expect(sub.isProOrTrial).toBe(false)
  })

  // ── Timezone handling for trial_ends_at ──
  it('handles trial_ends_at without Z suffix', () => {
    const futureDate = new Date(Date.now() + 2 * 86400000)
    const withoutZ = futureDate.toISOString().replace('Z', '')
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: withoutZ,
    })
    expect(sub.status).toBe('trial')
    expect(sub.isTrial).toBe(true)
    expect(sub.trialDaysLeft).toBeGreaterThan(0)
  })

  it('handles trial_ends_at with +00:00 offset', () => {
    const futureDate = new Date(Date.now() + 2 * 86400000)
    const withOffset = futureDate.toISOString().replace('Z', '+00:00')
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: withOffset,
    })
    expect(sub.status).toBe('trial')
    expect(sub.isTrial).toBe(true)
    expect(sub.trialDaysLeft).toBeGreaterThan(0)
  })

  it('handles trial_ends_at with +03:00 offset (Riyadh)', () => {
    const futureDate = new Date(Date.now() + 3 * 86400000)
    const withOffset = futureDate.toISOString().replace('Z', '+03:00')
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: withOffset,
    })
    expect(sub.isTrial).toBe(true)
    expect(sub.trialDaysLeft).toBeGreaterThan(0)
  })

  it('handles trial_ends_at with negative timezone offset', () => {
    const futureDate = new Date(Date.now() + 2 * 86400000)
    const withOffset = futureDate.toISOString().replace('Z', '-05:00')
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: withOffset,
    })
    expect(sub.isTrial).toBe(true)
  })

  // ── Cancelled subscription ──
  it('gives access to cancelled subscription with remaining period', () => {
    const sub = buildSubscription({
      status: 'cancelled',
      tier: 'elite',
      current_period_end: daysFromNow(15),
    })
    expect(sub.status).toBe('cancelled')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  it('denies access to cancelled subscription past period end', () => {
    const sub = buildSubscription({
      status: 'cancelled',
      tier: 'elite',
      current_period_end: daysAgo(5),
    })
    expect(sub.status).toBe('cancelled')
    expect(sub.isProOrTrial).toBe(false)
    expect(sub.isPaidSubscriber).toBe(false)
  })

  it('cancelled with no period end has no access', () => {
    const sub = buildSubscription({
      status: 'cancelled',
      tier: 'elite',
    })
    expect(sub.status).toBe('cancelled')
    expect(sub.isProOrTrial).toBe(false)
    expect(sub.isPaidSubscriber).toBe(false)
  })

  it('cancelled with period end exactly now has no access', () => {
    const sub = buildSubscription({
      status: 'cancelled',
      tier: 'elite',
      current_period_end: new Date().toISOString(),
    })
    // period end is in the past (or exactly now), so no remaining period
    expect(sub.isProOrTrial).toBe(false)
  })

  // ── Past due with grace period ──
  it('gives access during past_due grace period (3 days past)', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysAgo(3),
    })
    expect(sub.status).toBe('past_due')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  it('gives access on day 6 of grace period', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysAgo(6),
    })
    expect(sub.isProOrTrial).toBe(true)
  })

  it('denies access after past_due grace period expires (10 days)', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysAgo(10),
    })
    expect(sub.status).toBe('past_due')
    expect(sub.isProOrTrial).toBe(false)
  })

  it('denies access exactly at grace boundary (8 days past)', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysAgo(8),
    })
    // 8 days past => grace = period + 7 days. period_end + 7d = -1 day from now => expired
    expect(sub.isProOrTrial).toBe(false)
  })

  it('past_due with future period end has full access', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysFromNow(5),
    })
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  it('past_due without period end has no grace access', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
    })
    expect(sub.isProOrTrial).toBe(false)
    // isPaidSubscriber should still be true based on status
    expect(sub.isPaidSubscriber).toBe(false)
  })

  // ── Expired subscription ──
  it('expired with remaining period still has access', () => {
    const sub = buildSubscription({
      status: 'expired',
      tier: 'essentials',
      current_period_end: daysFromNow(2),
    })
    expect(sub.status).toBe('expired')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  it('expired without remaining period has no access', () => {
    const sub = buildSubscription({
      status: 'expired',
      tier: 'essentials',
      current_period_end: daysAgo(10),
    })
    expect(sub.status).toBe('expired')
    expect(sub.isProOrTrial).toBe(false)
    expect(sub.isPaidSubscriber).toBe(false)
  })

  // ── Unknown status ──
  it('treats unknown status as none', () => {
    const sub = buildSubscription({ status: 'some_invalid_status', tier: 'essentials' })
    expect(sub.status).toBe('none')
    expect(sub.isProOrTrial).toBe(false)
  })

  it('treats numeric status as none', () => {
    const sub = buildSubscription({ status: 123, tier: 'essentials' })
    expect(sub.status).toBe('none')
  })

  // ── Current period end passthrough ──
  it('passes through current_period_end', () => {
    const periodEnd = daysFromNow(30)
    const sub = buildSubscription({ status: 'active', tier: 'essentials', current_period_end: periodEnd })
    expect(sub.currentPeriodEnd).toBe(periodEnd)
  })

  it('returns undefined currentPeriodEnd when not set', () => {
    const sub = buildSubscription({ status: 'active', tier: 'essentials' })
    expect(sub.currentPeriodEnd).toBeUndefined()
  })

  // ── Combination tests ──
  it('trial user with elite tier', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'elite',
      trial_ends_at: daysFromNow(5),
    })
    expect(sub.status).toBe('trial')
    expect(sub.tier).toBe('elite')
    expect(sub.isTrial).toBe(true)
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(false)
  })

  it('active free tier (edge case)', () => {
    const sub = buildSubscription({
      status: 'active',
      tier: 'free',
      current_period_end: daysFromNow(30),
    })
    expect(sub.status).toBe('active')
    expect(sub.tier).toBe('free')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  // ── Boundary: trial ending at exact midnight ──
  it('trial ending at exact millisecond still counts as trial (ceil behavior)', () => {
    // Trial ends in exactly 0.5 days (12 hours from now)
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: hoursFromNow(12),
    })
    expect(sub.trialDaysLeft).toBe(1) // ceil(0.5) = 1
    expect(sub.isTrial).toBe(true)
  })

  it('trial ending in exactly 1 day shows 1 day left', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: hoursFromNow(24),
    })
    expect(sub.trialDaysLeft).toBe(1)
  })

  it('trial ending in 1 day + 1 hour shows 2 days left', () => {
    const sub = buildSubscription({
      status: 'trial',
      tier: 'essentials',
      trial_ends_at: hoursFromNow(25),
    })
    expect(sub.trialDaysLeft).toBe(2)
  })
})
