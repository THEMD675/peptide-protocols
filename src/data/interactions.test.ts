import { describe, it, expect } from 'vitest';
import { DANGEROUS_COMBOS, SYNERGISTIC_COMBOS, GH_PEPTIDE_IDS, FAT_LOSS_PEPTIDE_IDS } from './interactions';

/**
 * Checks an interaction pair — tries both orderings (a+b and b+a).
 * Also handles wildcard patterns like 'igf-1-lr3+*'.
 */
function checkInteraction(a: string, b: string): { safe: boolean; warning: boolean; message: string } | null {
  const key1 = `${a}+${b}`;
  const key2 = `${b}+${a}`;

  if (DANGEROUS_COMBOS[key1]) return DANGEROUS_COMBOS[key1];
  if (DANGEROUS_COMBOS[key2]) return DANGEROUS_COMBOS[key2];

  // Check wildcard patterns
  if (DANGEROUS_COMBOS[`${a}+*`]) return DANGEROUS_COMBOS[`${a}+*`];
  if (DANGEROUS_COMBOS[`${b}+*`]) return DANGEROUS_COMBOS[`${b}+*`];

  if (SYNERGISTIC_COMBOS[key1]) return SYNERGISTIC_COMBOS[key1];
  if (SYNERGISTIC_COMBOS[key2]) return SYNERGISTIC_COMBOS[key2];

  return null;
}

describe('Interaction Checker — dangerous combos', () => {
  it('flags duplicate GLP-1 agonists as unsafe', () => {
    const result = checkInteraction('semaglutide', 'tirzepatide');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(false);
    expect(result!.message).toContain('GLP-1');
  });

  it('flags semaglutide+retatrutide as unsafe', () => {
    const result = checkInteraction('semaglutide', 'retatrutide');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(false);
  });

  it('flags IGF-1 LR3 + any peptide via wildcard', () => {
    const result = checkInteraction('igf-1-lr3', 'cjc-1295');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(false);
    expect(result!.message).toContain('تضخّم');
  });

  it('flags Melanotan II as always unsafe', () => {
    const result = checkInteraction('melanotan-ii', 'bpc-157');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(false);
  });

  it('flags duplicate GHRPs as unsafe', () => {
    const result = checkInteraction('ghrp-2', 'ghrp-6');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(false);
    expect(result!.message).toContain('GHRPs');
  });

  it('flags Semax + NA-Semax as same peptide', () => {
    const result = checkInteraction('semax', 'na-semax-amidate');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(false);
    expect(result!.message).toContain('نفس الببتيد');
  });
});

describe('Interaction Checker — synergistic combos', () => {
  it('recognizes BPC-157 + TB-500 as safe golden combo', () => {
    const result = checkInteraction('bpc-157', 'tb-500');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(true);
    expect(result!.message).toContain('الذهبي');
  });

  it('recognizes CJC-1295 + Ipamorelin as safe GH stack', () => {
    const result = checkInteraction('cjc-1295', 'ipamorelin');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(true);
  });

  it('recognizes Semax + Selank as safe brain combo', () => {
    const result = checkInteraction('semax', 'selank');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(true);
    expect(result!.message).toContain('دماغ');
  });

  it('marks tesamorelin+ipamorelin with warning', () => {
    const result = checkInteraction('tesamorelin', 'ipamorelin');
    expect(result).not.toBeNull();
    expect(result!.safe).toBe(true);
    expect(result!.warning).toBe(true);
  });
});

describe('Interaction Checker — no known interaction', () => {
  it('returns null for unrelated peptides', () => {
    const result = checkInteraction('bpc-157', 'semax');
    // Could be null (no known interaction) or synergistic
    // BPC-157 + Semax has no entry in either combos list
    expect(result).toBeNull();
  });
});

describe('Peptide group lists', () => {
  it('GH peptide list contains expected IDs', () => {
    expect(GH_PEPTIDE_IDS).toContain('cjc-1295');
    expect(GH_PEPTIDE_IDS).toContain('ipamorelin');
    expect(GH_PEPTIDE_IDS).toContain('ghrp-2');
    expect(GH_PEPTIDE_IDS.length).toBeGreaterThanOrEqual(5);
  });

  it('Fat loss peptide list contains expected IDs', () => {
    expect(FAT_LOSS_PEPTIDE_IDS).toContain('semaglutide');
    expect(FAT_LOSS_PEPTIDE_IDS).toContain('tirzepatide');
    expect(FAT_LOSS_PEPTIDE_IDS.length).toBeGreaterThanOrEqual(5);
  });
});
