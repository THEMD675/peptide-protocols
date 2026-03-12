import { describe, it, expect } from 'vitest'
import { PRICING, FREE_PEPTIDE_IDS, PEPTIDE_COUNT, TRIAL_PEPTIDE_IDS } from './constants'

describe('constants', () => {
  describe('PRICING', () => {
    it('essentials.monthly is 34', () => {
      expect(PRICING.essentials.monthly).toBe(34)
    })

    it('elite.monthly is 371', () => {
      expect(PRICING.elite.monthly).toBe(371)
    })
  })

  describe('FREE_PEPTIDE_IDS', () => {
    it('is a Set with 6 items', () => {
      expect(FREE_PEPTIDE_IDS).toBeInstanceOf(Set)
      expect(FREE_PEPTIDE_IDS.size).toBe(7)
    })
  })

  describe('PEPTIDE_COUNT', () => {
    it('is greater than 40', () => {
      expect(PEPTIDE_COUNT).toBeGreaterThan(40)
    })
  })

  describe('TRIAL_PEPTIDE_IDS', () => {
    it('is a superset of FREE_PEPTIDE_IDS', () => {
      for (const id of FREE_PEPTIDE_IDS) {
        expect(TRIAL_PEPTIDE_IDS.has(id)).toBe(true)
      }
      expect(TRIAL_PEPTIDE_IDS.size).toBeGreaterThanOrEqual(FREE_PEPTIDE_IDS.size)
    })
  })
})
