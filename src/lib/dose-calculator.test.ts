import { describe, it, expect } from 'vitest';
import { calculateDose } from './dose-calculator';

describe('calculateDose — reconstitution math', () => {
  it('returns zeros for invalid inputs', () => {
    expect(calculateDose(0, 2, 250)).toEqual(
      expect.objectContaining({ concentration: 0, volumeMl: 0, syringeUnits: 0 }),
    );
    expect(calculateDose(5, 0, 250)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
    expect(calculateDose(5, 2, 0)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
    expect(calculateDose(-1, 2, 250)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
  });

  it('calculates concentration correctly (5mg vial + 2mL water)', () => {
    const r = calculateDose(5, 2, 250);
    // 5mg = 5000mcg, 5000/2 = 2500 mcg/mL
    expect(r.concentration).toBe(2500);
  });

  it('calculates volume to draw for 250mcg dose from 5mg/2mL', () => {
    const r = calculateDose(5, 2, 250);
    // 250mcg / 2500mcg/mL = 0.1 mL
    expect(r.volumeMl).toBeCloseTo(0.1);
  });

  it('calculates syringe units for 1mL/100U syringe', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 });
    // 0.1mL * 100 / 1 = 10 units
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  it('calculates syringe units for 0.5mL/50U insulin syringe', () => {
    const r = calculateDose(5, 2, 250, { ml: 0.5, units: 50 });
    // 0.1mL * 50 / 0.5 = 10 units
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  it('calculates doses per vial', () => {
    const r = calculateDose(5, 2, 250);
    // 5000mcg / 250mcg = 20 doses
    expect(r.dosesPerVial).toBe(20);
  });

  it('calculates days per vial with 1 dose/day', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 1);
    // 20 doses / 1 per day = 20 days
    expect(r.daysPerVial).toBe(20);
  });

  it('calculates days per vial with 2 doses/day', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 2);
    // 20 doses / 2 per day = 10 days
    expect(r.daysPerVial).toBe(10);
  });

  it('calculates monthly vials needed', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 1);
    // 30 / 20 = 1.5 vials per month
    expect(r.monthlyVials).toBeCloseTo(1.5);
  });

  it('handles 10mg vial with 3mL water', () => {
    const r = calculateDose(10, 3, 500);
    // concentration = 10000/3 = 3333.33 mcg/mL
    expect(r.concentration).toBeCloseTo(3333.33, 1);
    // volume = 500/3333.33 = 0.15 mL
    expect(r.volumeMl).toBeCloseTo(0.15);
    // syringe units = 0.15 * 100 = 15
    expect(r.syringeUnits).toBeCloseTo(15);
    // doses per vial = 10000/500 = 20
    expect(r.dosesPerVial).toBe(20);
  });

  it('handles very small dose (100mcg from 5mg/2mL)', () => {
    const r = calculateDose(5, 2, 100);
    // volume = 100/2500 = 0.04 mL
    expect(r.volumeMl).toBeCloseTo(0.04);
    // 4 units on 100U syringe
    expect(r.syringeUnits).toBeCloseTo(4);
    // 50 doses per vial
    expect(r.dosesPerVial).toBe(50);
  });
});
