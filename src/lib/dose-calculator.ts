/**
 * Dose calculator business logic — extracted for testability.
 * These are the core reconstitution math functions used by DoseCalculator.tsx.
 */

export interface DoseResult {
  /** mcg/mL concentration after reconstitution */
  concentration: number;
  /** Volume to draw in mL */
  volumeMl: number;
  /** Syringe units (based on syringe capacity) */
  syringeUnits: number;
  /** How many doses per vial */
  dosesPerVial: number;
  /** Dose in mcg */
  doseMcg: number;
  /** Monthly vials needed (at dosesPerDay) */
  monthlyVials: number;
  /** Days one vial lasts */
  daysPerVial: number;
}

export interface Syringe {
  ml: number;
  units: number;
}

/**
 * Calculate reconstitution and dosing values.
 *
 * @param vialMg - Vial size in mg
 * @param waterMl - Bacteriostatic water volume in mL
 * @param doseMcg - Desired dose in mcg
 * @param syringe - Syringe capacity (mL and units)
 * @param dosesPerDay - Number of doses per day
 */
export function calculateDose(
  vialMg: number,
  waterMl: number,
  doseMcg: number,
  syringe: Syringe = { ml: 1, units: 100 },
  dosesPerDay = 1,
): DoseResult {
  if (!vialMg || !waterMl || !doseMcg || vialMg <= 0 || waterMl <= 0 || doseMcg <= 0) {
    return { concentration: 0, volumeMl: 0, syringeUnits: 0, dosesPerVial: 0, doseMcg: 0, monthlyVials: 0, daysPerVial: 0 };
  }

  const concentration = (vialMg * 1000) / waterMl; // mcg/mL
  const volumeMl = doseMcg / concentration;
  const syringeUnits = volumeMl * syringe.units / syringe.ml;
  const dosesPerVial = (vialMg * 1000) / doseMcg;
  const daysPerVial = dosesPerVial / dosesPerDay;
  const monthlyVials = 30 / daysPerVial;

  return { concentration, volumeMl, syringeUnits, dosesPerVial, doseMcg, monthlyVials, daysPerVial };
}
