import { describe, it, expect } from 'vitest'
import { GLOSSARY_TERMS, type GlossaryTerm } from './glossary'
import { peptides } from './peptides'

const validPeptideIds = new Set(peptides.map(p => p.id))

describe('Glossary data integrity', () => {
  it('has at least 10 terms', () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(10)
  })

  it('all terms have required "ar" field (non-empty string)', () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.ar, `Term missing ar: ${JSON.stringify(term)}`).toBeTruthy()
      expect(typeof term.ar).toBe('string')
      expect(term.ar.trim().length).toBeGreaterThan(0)
    }
  })

  it('all terms have required "en" field (non-empty string)', () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.en, `Term missing en: ${JSON.stringify(term)}`).toBeTruthy()
      expect(typeof term.en).toBe('string')
      expect(term.en.trim().length).toBeGreaterThan(0)
    }
  })

  it('all terms have required "definition" field (non-empty string)', () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.definition, `Term missing definition: ${term.en}`).toBeTruthy()
      expect(typeof term.definition).toBe('string')
      expect(term.definition.trim().length).toBeGreaterThan(0)
    }
  })

  it('definitions have reasonable length (>20 chars)', () => {
    for (const term of GLOSSARY_TERMS) {
      expect(
        term.definition.length,
        `Definition too short for "${term.en}": "${term.definition}"`
      ).toBeGreaterThan(20)
    }
  })

  it('no duplicate Arabic names', () => {
    const seen = new Set<string>()
    for (const term of GLOSSARY_TERMS) {
      expect(seen.has(term.ar), `Duplicate Arabic name: "${term.ar}"`).toBe(false)
      seen.add(term.ar)
    }
  })

  it('no duplicate English names', () => {
    const seen = new Set<string>()
    for (const term of GLOSSARY_TERMS) {
      expect(seen.has(term.en), `Duplicate English name: "${term.en}"`).toBe(false)
      seen.add(term.en)
    }
  })

  it('relatedPeptides reference valid peptide IDs', () => {
    for (const term of GLOSSARY_TERMS) {
      if (!term.relatedPeptides) continue
      for (const id of term.relatedPeptides) {
        expect(
          validPeptideIds.has(id),
          `Term "${term.en}" references invalid peptide ID "${id}". Valid IDs: ${[...validPeptideIds].join(', ')}`
        ).toBe(true)
      }
    }
  })

  it('relatedPeptides arrays have no duplicates', () => {
    for (const term of GLOSSARY_TERMS) {
      if (!term.relatedPeptides) continue
      const unique = new Set(term.relatedPeptides)
      expect(
        unique.size,
        `Term "${term.en}" has duplicate relatedPeptides`
      ).toBe(term.relatedPeptides.length)
    }
  })

  it('at least some terms have relatedPeptides', () => {
    const withRelated = GLOSSARY_TERMS.filter(t => t.relatedPeptides && t.relatedPeptides.length > 0)
    expect(withRelated.length).toBeGreaterThan(5)
  })

  it('Arabic names contain Arabic characters', () => {
    const arRegex = /[\u0600-\u06FF]/
    for (const term of GLOSSARY_TERMS) {
      expect(
        arRegex.test(term.ar),
        `Arabic name "${term.ar}" for "${term.en}" contains no Arabic characters`
      ).toBe(true)
    }
  })

  it('English names contain Latin characters', () => {
    const enRegex = /[a-zA-Z]/
    for (const term of GLOSSARY_TERMS) {
      expect(
        enRegex.test(term.en),
        `English name "${term.en}" contains no Latin characters`
      ).toBe(true)
    }
  })

  it('definitions contain Arabic text', () => {
    const arRegex = /[\u0600-\u06FF]/
    for (const term of GLOSSARY_TERMS) {
      expect(
        arRegex.test(term.definition),
        `Definition for "${term.en}" contains no Arabic text`
      ).toBe(true)
    }
  })
})
