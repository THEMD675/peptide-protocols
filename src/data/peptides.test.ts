import { describe, it, expect } from 'vitest'
import { peptides, categories } from './peptides'
import { FREE_PEPTIDE_IDS } from '@/lib/constants'

describe('peptides', () => {
  describe('peptides array', () => {
    it('has exactly 47 peptides', () => {
      expect(peptides.length).toBe(47)
    })

    it('every peptide has id, nameAr, nameEn, category', () => {
      for (const p of peptides) {
        expect(p).toHaveProperty('id')
        expect(p).toHaveProperty('nameAr')
        expect(p).toHaveProperty('nameEn')
        expect(p).toHaveProperty('category')
        expect(typeof p.id).toBe('string')
        expect(typeof p.nameAr).toBe('string')
        expect(typeof p.nameEn).toBe('string')
        expect(p.id.length).toBeGreaterThan(0)
        expect(p.nameAr.length).toBeGreaterThan(0)
        expect(p.nameEn.length).toBeGreaterThan(0)
      }
    })
  })

  describe('FREE_PEPTIDE_IDS', () => {
    it('matches peptides with isFree: true', () => {
      const freeFromData = new Set(peptides.filter((p) => p.isFree).map((p) => p.id))
      expect(FREE_PEPTIDE_IDS.size).toBe(freeFromData.size)
      for (const id of FREE_PEPTIDE_IDS) {
        expect(freeFromData.has(id)).toBe(true)
      }
      for (const id of freeFromData) {
        expect(FREE_PEPTIDE_IDS.has(id)).toBe(true)
      }
    })
  })

  describe('categories', () => {
    it('all have peptideCount > 0', () => {
      for (const cat of categories) {
        expect(cat.peptideCount).toBeGreaterThan(0)
      }
    })

    it('every peptide category exists in categories array', () => {
      const categoryIds = new Set(categories.map((c) => c.id))
      for (const p of peptides) {
        expect(categoryIds.has(p.category)).toBe(true)
      }
    })
  })
})
