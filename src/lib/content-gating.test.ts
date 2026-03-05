import { describe, it, expect } from 'vitest';
import { FREE_PEPTIDE_IDS, TRIAL_PEPTIDE_IDS } from './constants';
import { peptides } from '@/data/peptides';

describe('Content gating — FREE_PEPTIDE_IDS', () => {
  it('is derived from peptides with isFree=true', () => {
    const expected = peptides.filter((p) => p.isFree).map((p) => p.id);
    expect(FREE_PEPTIDE_IDS.size).toBe(expected.length);
    for (const id of expected) {
      expect(FREE_PEPTIDE_IDS.has(id)).toBe(true);
    }
  });

  it('contains at least 5 free peptides', () => {
    expect(FREE_PEPTIDE_IDS.size).toBeGreaterThanOrEqual(5);
  });

  it('does not include paid-only peptides', () => {
    const paidOnly = peptides.filter((p) => !p.isFree).map((p) => p.id);
    for (const id of paidOnly) {
      expect(FREE_PEPTIDE_IDS.has(id)).toBe(false);
    }
  });
});

describe('Content gating — TRIAL_PEPTIDE_IDS', () => {
  const TRIAL_EXCLUSIVE = ['tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq'];

  it('includes all free peptides', () => {
    for (const id of FREE_PEPTIDE_IDS) {
      expect(TRIAL_PEPTIDE_IDS.has(id)).toBe(true);
    }
  });

  it('includes the 5 trial-exclusive peptides', () => {
    for (const id of TRIAL_EXCLUSIVE) {
      expect(TRIAL_PEPTIDE_IDS.has(id)).toBe(true);
    }
  });

  it('has size = free count + 5 trial-exclusive', () => {
    expect(TRIAL_PEPTIDE_IDS.size).toBe(FREE_PEPTIDE_IDS.size + TRIAL_EXCLUSIVE.length);
  });

  it('trial-exclusive peptides are NOT in free set', () => {
    for (const id of TRIAL_EXCLUSIVE) {
      expect(FREE_PEPTIDE_IDS.has(id)).toBe(false);
    }
  });
});
