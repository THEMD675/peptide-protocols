import { describe, it, expect } from 'vitest';
import { calculateDose } from './dose-calculator';

describe('calculateDose — reconstitution math', () => {
  // ── Invalid inputs ──
  it('returns zeros for zero vialMg', () => {
    expect(calculateDose(0, 2, 250)).toEqual(
      expect.objectContaining({ concentration: 0, volumeMl: 0, syringeUnits: 0 }),
    );
  });

  it('returns zeros for zero waterMl', () => {
    expect(calculateDose(5, 0, 250)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
  });

  it('returns zeros for zero doseMcg', () => {
    expect(calculateDose(5, 2, 0)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
  });

  it('returns zeros for negative vialMg', () => {
    expect(calculateDose(-1, 2, 250)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
  });

  it('returns zeros for negative waterMl', () => {
    expect(calculateDose(5, -2, 250)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
  });

  it('returns zeros for negative doseMcg', () => {
    expect(calculateDose(5, 2, -250)).toEqual(
      expect.objectContaining({ concentration: 0 }),
    );
  });

  it('returns zeros when all inputs are zero', () => {
    const r = calculateDose(0, 0, 0);
    expect(r.concentration).toBe(0);
    expect(r.volumeMl).toBe(0);
    expect(r.dosesPerVial).toBe(0);
  });

  // ── Standard calculation: 5mg vial + 2mL water ──
  it('calculates concentration correctly (5mg vial + 2mL water)', () => {
    const r = calculateDose(5, 2, 250);
    expect(r.concentration).toBe(2500);
  });

  it('calculates volume to draw for 250mcg dose from 5mg/2mL', () => {
    const r = calculateDose(5, 2, 250);
    expect(r.volumeMl).toBeCloseTo(0.1);
  });

  it('passes through doseMcg', () => {
    const r = calculateDose(5, 2, 250);
    expect(r.doseMcg).toBe(250);
  });

  // ── Syringe size variations ──
  it('calculates syringe units for 1mL/100U syringe', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 });
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  it('calculates syringe units for 0.5mL/50U insulin syringe', () => {
    const r = calculateDose(5, 2, 250, { ml: 0.5, units: 50 });
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  it('calculates syringe units for 0.3mL/30U syringe', () => {
    const r = calculateDose(5, 2, 250, { ml: 0.3, units: 30 });
    // 0.1mL * 30 / 0.3 = 10 units
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  it('calculates syringe units for 3mL/300U syringe', () => {
    const r = calculateDose(5, 2, 250, { ml: 3, units: 300 });
    // 0.1mL * 300 / 3 = 10 units
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  it('default syringe is 1mL/100U', () => {
    const r = calculateDose(5, 2, 250);
    expect(r.syringeUnits).toBeCloseTo(10);
  });

  // ── Doses per vial ──
  it('calculates doses per vial', () => {
    const r = calculateDose(5, 2, 250);
    expect(r.dosesPerVial).toBe(20);
  });

  it('calculates fractional doses per vial', () => {
    const r = calculateDose(5, 2, 300);
    // 5000/300 ≈ 16.67
    expect(r.dosesPerVial).toBeCloseTo(16.67, 1);
  });

  // ── Days per vial ──
  it('calculates days per vial with 1 dose/day', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 1);
    expect(r.daysPerVial).toBe(20);
  });

  it('calculates days per vial with 2 doses/day', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 2);
    expect(r.daysPerVial).toBe(10);
  });

  it('calculates days per vial with 3 doses/day', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 3);
    expect(r.daysPerVial).toBeCloseTo(6.67, 1);
  });

  // ── Monthly vials ──
  it('calculates monthly vials needed', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 1);
    expect(r.monthlyVials).toBeCloseTo(1.5);
  });

  it('monthly vials for twice daily dosing', () => {
    const r = calculateDose(5, 2, 250, { ml: 1, units: 100 }, 2);
    // days per vial = 10, monthly = 30/10 = 3
    expect(r.monthlyVials).toBeCloseTo(3);
  });

  // ── Different vial sizes ──
  it('handles 10mg vial with 3mL water', () => {
    const r = calculateDose(10, 3, 500);
    expect(r.concentration).toBeCloseTo(3333.33, 1);
    expect(r.volumeMl).toBeCloseTo(0.15);
    expect(r.syringeUnits).toBeCloseTo(15);
    expect(r.dosesPerVial).toBe(20);
  });

  it('handles 2mg vial with 1mL water', () => {
    const r = calculateDose(2, 1, 100);
    // 2000/1 = 2000 mcg/mL
    expect(r.concentration).toBe(2000);
    // 100/2000 = 0.05 mL
    expect(r.volumeMl).toBeCloseTo(0.05);
    // 2000/100 = 20 doses
    expect(r.dosesPerVial).toBe(20);
  });

  it('handles 1mg vial with 1mL water', () => {
    const r = calculateDose(1, 1, 50);
    expect(r.concentration).toBe(1000);
    expect(r.volumeMl).toBeCloseTo(0.05);
    expect(r.dosesPerVial).toBe(20);
  });

  // ── Boundary: very small dose ──
  it('handles very small dose (100mcg from 5mg/2mL)', () => {
    const r = calculateDose(5, 2, 100);
    expect(r.volumeMl).toBeCloseTo(0.04);
    expect(r.syringeUnits).toBeCloseTo(4);
    expect(r.dosesPerVial).toBe(50);
  });

  it('handles tiny dose (10mcg)', () => {
    const r = calculateDose(5, 2, 10);
    // 10/2500 = 0.004 mL
    expect(r.volumeMl).toBeCloseTo(0.004);
    // 0.004 * 100 = 0.4 units
    expect(r.syringeUnits).toBeCloseTo(0.4);
    // 5000/10 = 500 doses
    expect(r.dosesPerVial).toBe(500);
  });

  it('handles 1mcg dose', () => {
    const r = calculateDose(5, 2, 1);
    expect(r.volumeMl).toBeCloseTo(0.0004);
    expect(r.dosesPerVial).toBe(5000);
  });

  // ── Boundary: very large vial ──
  it('handles very large vial (50mg)', () => {
    const r = calculateDose(50, 5, 500);
    // 50000/5 = 10000 mcg/mL
    expect(r.concentration).toBe(10000);
    // 500/10000 = 0.05 mL
    expect(r.volumeMl).toBeCloseTo(0.05);
    // 50000/500 = 100 doses
    expect(r.dosesPerVial).toBe(100);
  });

  // ── Boundary: very large dose ──
  it('handles dose equal to entire vial', () => {
    const r = calculateDose(5, 2, 5000);
    // Dose = entire vial content
    expect(r.volumeMl).toBeCloseTo(2);
    expect(r.dosesPerVial).toBe(1);
    expect(r.daysPerVial).toBe(1);
    expect(r.monthlyVials).toBe(30);
  });

  it('handles dose larger than vial (theoretical)', () => {
    const r = calculateDose(5, 2, 10000);
    // Would need more than 1 vial per dose
    expect(r.volumeMl).toBeCloseTo(4); // 4 mL (more than water added)
    expect(r.dosesPerVial).toBe(0.5);
    expect(r.daysPerVial).toBe(0.5);
  });

  // ── Rounding behavior ──
  it('does not round — returns raw float for concentration', () => {
    const r = calculateDose(10, 3, 500);
    // 10000/3 = 3333.333...
    expect(r.concentration).not.toBe(3333);
    expect(r.concentration).toBeCloseTo(3333.33, 1);
  });

  it('does not round volume', () => {
    const r = calculateDose(10, 3, 100);
    // 100/3333.33 = 0.03
    expect(r.volumeMl).toBeCloseTo(0.03, 2);
  });

  // ── Default dosesPerDay ──
  it('defaults to 1 dose per day', () => {
    const r = calculateDose(5, 2, 250);
    expect(r.daysPerVial).toBe(20);
    expect(r.monthlyVials).toBeCloseTo(1.5);
  });

  // ── Edge: very small water volume ──
  it('handles 0.1mL water (high concentration)', () => {
    const r = calculateDose(5, 0.1, 250);
    // 5000/0.1 = 50000 mcg/mL
    expect(r.concentration).toBe(50000);
    // 250/50000 = 0.005 mL
    expect(r.volumeMl).toBeCloseTo(0.005);
  });

  // ── Fractional vial sizes ──
  it('handles fractional vialMg (0.5mg)', () => {
    const r = calculateDose(0.5, 1, 50);
    // 500/1 = 500 mcg/mL
    expect(r.concentration).toBe(500);
    expect(r.volumeMl).toBeCloseTo(0.1);
    expect(r.dosesPerVial).toBe(10);
  });

  it('handles fractional waterMl (1.5mL)', () => {
    const r = calculateDose(5, 1.5, 250);
    // 5000/1.5 = 3333.33
    expect(r.concentration).toBeCloseTo(3333.33, 1);
  });
});
