import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackEvent, events } from './analytics'

vi.mock('./cookie-utils', () => ({ hasOptionalConsent: () => true, COOKIE_CONSENT_STORAGE_KEY: 'pptides_cookie_consent' }))

describe('analytics', () => {
  let gtagSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    gtagSpy = vi.fn()
    window.gtag = gtagSpy
  })

  describe('trackEvent', () => {
    it('calls gtag with event name and params', () => {
      trackEvent('test_event', { foo: 'bar' })
      expect(gtagSpy).toHaveBeenCalledWith('event', 'test_event', { foo: 'bar' })
    })

    it('does not throw when gtag is undefined', () => {
      window.gtag = undefined
      expect(() => trackEvent('test_event')).not.toThrow()
    })

    it('does not throw when gtag throws', () => {
      window.gtag = () => { throw new Error('gtag error') }
      expect(() => trackEvent('test_event')).not.toThrow()
    })
  })

  describe('events', () => {
    it('tracks signup with method', () => {
      events.signup('google')
      expect(gtagSpy).toHaveBeenCalledWith('event', 'sign_up', { method: 'google' })
    })

    it('tracks login with method', () => {
      events.login('email')
      expect(gtagSpy).toHaveBeenCalledWith('event', 'login', { method: 'email' })
    })

    it('tracks subscribe with tier and value', () => {
      events.subscribe('elite', 371)
      expect(gtagSpy).toHaveBeenCalledWith('event', 'purchase', {
        currency: 'SAR',
        value: 371,
        items: [{ item_name: 'elite' }],
      })
    })

    it('tracks coach message', () => {
      events.coachMessage()
      expect(gtagSpy).toHaveBeenCalledWith('event', 'coach_message', undefined)
    })

    it('tracks injection log with peptide name', () => {
      events.injectionLog('BPC-157')
      expect(gtagSpy).toHaveBeenCalledWith('event', 'injection_log', { peptide: 'BPC-157' })
    })

    it('tracks quiz start', () => {
      events.quizStart()
      expect(gtagSpy).toHaveBeenCalledWith('event', 'quiz_start', undefined)
    })

    it('tracks quiz complete with goal', () => {
      events.quizComplete('muscle')
      expect(gtagSpy).toHaveBeenCalledWith('event', 'quiz_complete', { goal: 'muscle' })
    })

    it('tracks pricing view', () => {
      events.pricingView()
      expect(gtagSpy).toHaveBeenCalledWith('event', 'pricing_view', undefined)
    })

    it('tracks checkout start', () => {
      events.checkoutStart('elite', 'monthly')
      expect(gtagSpy).toHaveBeenCalledWith('event', 'checkout_start', { tier: 'elite', billing: 'monthly' })
    })

    it('tracks tracker view', () => {
      events.trackerView()
      expect(gtagSpy).toHaveBeenCalledWith('event', 'tracker_view', undefined)
    })

    it('tracks share click', () => {
      events.shareClick('whatsapp')
      expect(gtagSpy).toHaveBeenCalledWith('event', 'share_click', { target: 'whatsapp' })
    })
  })
})
