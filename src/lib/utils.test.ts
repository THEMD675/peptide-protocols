import { describe, it, expect } from 'vitest'
import { cn, arPlural } from './utils'

describe('cn() — class name merging', () => {
  it('merges simple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })

  it('merges tailwind conflicting classes (last wins)', () => {
    // tailwind-merge should resolve conflicts
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('merges tailwind bg color conflicts', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('keeps non-conflicting tailwind classes', () => {
    const result = cn('p-4', 'mx-2', 'text-sm')
    expect(result).toContain('p-4')
    expect(result).toContain('mx-2')
    expect(result).toContain('text-sm')
  })

  it('handles arrays from clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles object syntax from clsx', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('merges complex responsive + variant classes', () => {
    const result = cn('text-sm md:text-lg', 'font-bold')
    expect(result).toContain('text-sm')
    expect(result).toContain('md:text-lg')
    expect(result).toContain('font-bold')
  })

  it('handles empty strings', () => {
    expect(cn('', 'foo', '')).toBe('foo')
  })
})

describe('arPlural() — Arabic plural rules', () => {
  const singular = 'ببتيد'
  const dual = 'ببتيدان'
  const plural = 'ببتيدات'
  const accusative = 'ببتيدًا'

  // 0 items
  it('returns 0 + plural for zero', () => {
    expect(arPlural(0, singular, dual, plural)).toBe('0 ببتيدات')
  })

  // 1 item — singular (no count prefix)
  it('returns singular for 1', () => {
    expect(arPlural(1, singular, dual, plural)).toBe('ببتيد')
  })

  // 2 items — dual (no count prefix)
  it('returns dual for 2', () => {
    expect(arPlural(2, singular, dual, plural)).toBe('ببتيدان')
  })

  // 3-10 items — count + plural
  it('returns count + plural for 3', () => {
    expect(arPlural(3, singular, dual, plural)).toBe('3 ببتيدات')
  })

  it('returns count + plural for 5', () => {
    expect(arPlural(5, singular, dual, plural)).toBe('5 ببتيدات')
  })

  it('returns count + plural for 10', () => {
    expect(arPlural(10, singular, dual, plural)).toBe('10 ببتيدات')
  })

  // 11+ — count + accusative (if provided)
  it('returns count + accusative for 11', () => {
    expect(arPlural(11, singular, dual, plural, accusative)).toBe('11 ببتيدًا')
  })

  it('returns count + accusative for 25', () => {
    expect(arPlural(25, singular, dual, plural, accusative)).toBe('25 ببتيدًا')
  })

  it('returns count + accusative for 100', () => {
    expect(arPlural(100, singular, dual, plural, accusative)).toBe('100 ببتيدًا')
  })

  it('returns count + accusative for 999', () => {
    expect(arPlural(999, singular, dual, plural, accusative)).toBe('999 ببتيدًا')
  })

  // 11+ without accusative — falls back to singular
  it('falls back to singular for 11 when no accusative', () => {
    expect(arPlural(11, singular, dual, plural)).toBe('11 ببتيد')
  })

  it('falls back to singular for 50 when no accusative', () => {
    expect(arPlural(50, singular, dual, plural)).toBe('50 ببتيد')
  })

  // Negative numbers floor to 0
  it('treats negative as 0', () => {
    expect(arPlural(-3, singular, dual, plural)).toBe('0 ببتيدات')
  })

  // Decimals are floored
  it('floors decimal input', () => {
    expect(arPlural(2.7, singular, dual, plural)).toBe('ببتيدان')
  })

  it('floors 0.9 to 0', () => {
    expect(arPlural(0.9, singular, dual, plural)).toBe('0 ببتيدات')
  })

  // With different Arabic words
  it('works with day words', () => {
    expect(arPlural(1, 'يوم', 'يومان', 'أيام', 'يومًا')).toBe('يوم')
    expect(arPlural(2, 'يوم', 'يومان', 'أيام', 'يومًا')).toBe('يومان')
    expect(arPlural(5, 'يوم', 'يومان', 'أيام', 'يومًا')).toBe('5 أيام')
    expect(arPlural(14, 'يوم', 'يومان', 'أيام', 'يومًا')).toBe('14 يومًا')
  })
})

describe('stripDiacritics — Arabic diacritics removal', () => {
  // Note: stripDiacritics is defined inline in Library.tsx and Glossary.tsx (not exported from utils)
  // We test the pattern directly since it's a utility pattern
  const stripDiacritics = (s: string) =>
    s.normalize('NFD').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, '')

  it('removes fathah', () => {
    expect(stripDiacritics('بَ')).toBe('ب')
  })

  it('removes kasrah', () => {
    expect(stripDiacritics('بِ')).toBe('ب')
  })

  it('removes dammah', () => {
    expect(stripDiacritics('بُ')).toBe('ب')
  })

  it('removes tanween fath', () => {
    expect(stripDiacritics('ببتيدًا')).toBe('ببتيدا')
  })

  it('removes shadda', () => {
    expect(stripDiacritics('مُحَمَّد')).toBe('محمد')
  })

  it('removes sukun', () => {
    expect(stripDiacritics('قَلْب')).toBe('قلب')
  })

  it('preserves base Arabic text', () => {
    expect(stripDiacritics('ببتيد')).toBe('ببتيد')
  })

  it('preserves English text', () => {
    expect(stripDiacritics('BPC-157')).toBe('BPC-157')
  })

  it('handles mixed Arabic and English', () => {
    expect(stripDiacritics('ببتيد BPC-157')).toBe('ببتيد BPC-157')
  })

  it('handles empty string', () => {
    expect(stripDiacritics('')).toBe('')
  })

  it('handles multiple diacritics in sequence', () => {
    const result = stripDiacritics('كَلِمَاتٌ مُتَعَدِّدَةٌ')
    expect(result).not.toMatch(/[\u064B-\u065F]/)
    expect(result).toContain('كلمات')
  })
})

describe('safeRedirect — URL redirect safety', () => {
  // safeRedirect is defined in Login.tsx but is critical utility logic
  function safeRedirect(raw: string | null, fallback = '/dashboard'): string {
    if (!raw || typeof raw !== 'string') return fallback
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback
  }

  it('allows valid internal paths', () => {
    expect(safeRedirect('/library')).toBe('/library')
    expect(safeRedirect('/peptide/bpc-157')).toBe('/peptide/bpc-157')
    expect(safeRedirect('/dashboard')).toBe('/dashboard')
  })

  it('blocks protocol-relative URLs (//)', () => {
    expect(safeRedirect('//evil.com')).toBe('/dashboard')
    expect(safeRedirect('//evil.com/path')).toBe('/dashboard')
  })

  it('blocks absolute URLs', () => {
    expect(safeRedirect('https://evil.com')).toBe('/dashboard')
    expect(safeRedirect('http://evil.com')).toBe('/dashboard')
  })

  it('blocks javascript: protocol', () => {
    expect(safeRedirect('javascript:alert(1)')).toBe('/dashboard')
  })

  it('blocks data: protocol', () => {
    expect(safeRedirect('data:text/html,<script>alert(1)</script>')).toBe('/dashboard')
  })

  it('returns fallback for null', () => {
    expect(safeRedirect(null)).toBe('/dashboard')
  })

  it('returns fallback for empty string', () => {
    expect(safeRedirect('')).toBe('/dashboard')
  })

  it('returns custom fallback', () => {
    expect(safeRedirect(null, '/pricing')).toBe('/pricing')
    expect(safeRedirect('https://evil.com', '/home')).toBe('/home')
  })

  it('allows root path', () => {
    expect(safeRedirect('/')).toBe('/')
  })

  it('allows paths with query params', () => {
    expect(safeRedirect('/library?q=bpc')).toBe('/library?q=bpc')
  })

  it('allows paths with hash', () => {
    expect(safeRedirect('/faq#question-1')).toBe('/faq#question-1')
  })

  it('blocks relative paths without leading slash', () => {
    expect(safeRedirect('library')).toBe('/dashboard')
    expect(safeRedirect('evil.com/login')).toBe('/dashboard')
  })
})
