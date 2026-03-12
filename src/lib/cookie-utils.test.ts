import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCookiePreferences, hasOptionalConsent, COOKIE_CONSENT_STORAGE_KEY } from './cookie-utils'

const createLocalStorageMock = () => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  }
}

describe('cookie-utils', () => {
  beforeEach(() => {
    const mock = createLocalStorageMock()
    vi.stubGlobal('localStorage', mock)
  })

  describe('getCookiePreferences', () => {
    it('returns null when no consent stored', () => {
      expect(getCookiePreferences()).toBeNull()
    })

    it('returns { essential: true, optional: true } for "accepted"', () => {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted')
      expect(getCookiePreferences()).toEqual({ essential: true, optional: true })
    })

    it('returns { essential: true, optional: false } for "rejected"', () => {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'rejected')
      expect(getCookiePreferences()).toEqual({ essential: true, optional: false })
    })
  })

  describe('hasOptionalConsent', () => {
    it('returns false when no consent', () => {
      expect(hasOptionalConsent()).toBe(false)
    })

    it('returns true when consent is accepted', () => {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted')
      expect(hasOptionalConsent()).toBe(true)
    })

    it('returns false when consent is rejected', () => {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'rejected')
      expect(hasOptionalConsent()).toBe(false)
    })
  })
})
