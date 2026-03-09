import { describe, it, expect } from 'vitest'
import { DOSE_PRESETS, DOSE_PRESETS_MAP } from './dose-presets'

describe('Dose presets data integrity', () => {
  it('has at least 20 presets', () => {
    expect(DOSE_PRESETS.length).toBeGreaterThanOrEqual(20)
  })

  it('all presets have a non-empty name', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.name.trim().length, `Preset has empty name`).toBeGreaterThan(0)
    }
  })

  it('all presets have positive dose', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.dose, `${p.name} has non-positive dose`).toBeGreaterThan(0)
    }
  })

  it('all presets have valid unit (mcg or mg)', () => {
    for (const p of DOSE_PRESETS) {
      expect(['mcg', 'mg'], `${p.name} has invalid unit "${p.unit}"`).toContain(p.unit)
    }
  })

  it('all presets have positive vialMg', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.vialMg, `${p.name} has non-positive vialMg`).toBeGreaterThan(0)
    }
  })

  it('all presets have positive waterMl', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.waterMl, `${p.name} has non-positive waterMl`).toBeGreaterThan(0)
    }
  })

  it('all presets have positive minDose', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.minDose, `${p.name} has non-positive minDose`).toBeGreaterThan(0)
    }
  })

  it('all presets have maxDose > minDose', () => {
    for (const p of DOSE_PRESETS) {
      expect(
        p.maxDose,
        `${p.name}: maxDose (${p.maxDose}) should be > minDose (${p.minDose})`
      ).toBeGreaterThan(p.minDose)
    }
  })

  it('default dose falls within min-max range', () => {
    for (const p of DOSE_PRESETS) {
      expect(
        p.dose >= p.minDose && p.dose <= p.maxDose,
        `${p.name}: dose (${p.dose}) not in range [${p.minDose}, ${p.maxDose}]`
      ).toBe(true)
    }
  })

  it('no duplicate preset names', () => {
    const seen = new Set<string>()
    for (const p of DOSE_PRESETS) {
      expect(seen.has(p.name), `Duplicate preset name: "${p.name}"`).toBe(false)
      seen.add(p.name)
    }
  })

  it('vial sizes are reasonable (0.5–50 mg)', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.vialMg, `${p.name} vialMg=${p.vialMg} seems unreasonable`).toBeGreaterThanOrEqual(0.5)
      expect(p.vialMg, `${p.name} vialMg=${p.vialMg} seems unreasonable`).toBeLessThanOrEqual(50)
    }
  })

  it('water volumes are reasonable (0.5–5 mL)', () => {
    for (const p of DOSE_PRESETS) {
      expect(p.waterMl, `${p.name} waterMl=${p.waterMl}`).toBeGreaterThanOrEqual(0.5)
      expect(p.waterMl, `${p.name} waterMl=${p.waterMl}`).toBeLessThanOrEqual(5)
    }
  })

  it('dose ranges are clinically reasonable (not >100mg = 100000mcg)', () => {
    for (const p of DOSE_PRESETS) {
      const maxInMcg = p.unit === 'mg' ? p.maxDose * 1000 : p.maxDose
      expect(maxInMcg, `${p.name} maxDose seems unreasonably high`).toBeLessThanOrEqual(100000)
    }
  })
})

describe('DOSE_PRESETS_MAP', () => {
  it('contains all presets by name', () => {
    for (const p of DOSE_PRESETS) {
      expect(DOSE_PRESETS_MAP[p.name], `Missing map entry for "${p.name}"`).toBeDefined()
      expect(DOSE_PRESETS_MAP[p.name]).toBe(p)
    }
  })

  it('contains PT-141 / Bremelanotide alias', () => {
    const pt141 = DOSE_PRESETS.find(p => p.name === 'PT-141')
    expect(pt141).toBeDefined()
    expect(DOSE_PRESETS_MAP['PT-141 / Bremelanotide']).toBe(pt141)
  })

  it('map has more entries than array (due to aliases)', () => {
    expect(Object.keys(DOSE_PRESETS_MAP).length).toBeGreaterThanOrEqual(DOSE_PRESETS.length)
  })

  it('all map values are valid DosePreset objects', () => {
    for (const [key, preset] of Object.entries(DOSE_PRESETS_MAP)) {
      expect(preset.name, `Map key "${key}" has no name`).toBeTruthy()
      expect(preset.dose, `Map key "${key}" has no dose`).toBeGreaterThan(0)
      expect(preset.vialMg, `Map key "${key}" has no vialMg`).toBeGreaterThan(0)
    }
  })
})
