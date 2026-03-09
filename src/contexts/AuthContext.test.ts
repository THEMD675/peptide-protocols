import { describe, it, expect } from 'vitest'
import { buildSubscription } from './AuthContext'

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

describe('buildSubscription', () => {
  it('returns default subscription for null row', () => {
    const sub = buildSubscription(null)
    expect(sub.status).toBe('none')
    expect(sub.tier).toBe('free')
    expect(sub.isProOrTrial).toBe(false)
    expect(sub.isPaidSubscriber).toBe(false)
    expect(sub.isTrial).toBe(false)
    expect(sub.trialDaysLeft).toBe(0)
  })

  // --- Tier mapping ---
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

  // --- Active subscription ---
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

  // --- Trial with time remaining ---
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

  // --- Expired trial ---
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

  // --- Cancelled but still within period ---
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

  // --- Cancelled past period end ---
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

  // --- Past due with grace period ---
  it('gives access during past_due grace period', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysAgo(3), // 3 days past, within 7 day grace
    })
    expect(sub.status).toBe('past_due')
    expect(sub.isProOrTrial).toBe(true)
    expect(sub.isPaidSubscriber).toBe(true)
  })

  // --- Past due after grace period ---
  it('denies access after past_due grace period expires', () => {
    const sub = buildSubscription({
      status: 'past_due',
      tier: 'essentials',
      current_period_end: daysAgo(10), // 10 days past, beyond 7 day grace
    })
    expect(sub.status).toBe('past_due')
    expect(sub.isProOrTrial).toBe(false)
  })

  // --- Trial end without Z suffix ---
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

  // --- Trial end with +00:00 offset (Supabase PostgREST format) ---
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

  // --- Unknown status ---
  it('treats unknown status as none', () => {
    const sub = buildSubscription({
      status: 'some_invalid_status',
      tier: 'essentials',
    })
    expect(sub.status).toBe('none')
    expect(sub.isProOrTrial).toBe(false)
  })

  // --- Current period end passthrough ---
  it('passes through current_period_end', () => {
    const periodEnd = daysFromNow(30)
    const sub = buildSubscription({
      status: 'active',
      tier: 'essentials',
      current_period_end: periodEnd,
    })
    expect(sub.currentPeriodEnd).toBe(periodEnd)
  })

  it('returns undefined currentPeriodEnd when not set', () => {
    const sub = buildSubscription({
      status: 'active',
      tier: 'essentials',
    })
    expect(sub.currentPeriodEnd).toBeUndefined()
  })
})
