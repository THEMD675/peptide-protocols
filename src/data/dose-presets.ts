export type DoseUnit = 'mcg' | 'mg';

export interface DosePreset {
  name: string;
  dose: number;
  unit: DoseUnit;
  vialMg: number;
  waterMl: number;
  minDose: number;
  maxDose: number;
  /** If true, dose is calculated as mcg/kg body weight */
  weightBased?: boolean;
  /** mcg/kg range for weight-based peptides */
  mcgPerKgMin?: number;
  mcgPerKgMax?: number;
}

export const DOSE_PRESETS: DosePreset[] = [
  { name: 'BPC-157', dose: 250, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 500, weightBased: true, mcgPerKgMin: 3, mcgPerKgMax: 10 },
  { name: 'TB-500', dose: 2500, unit: 'mcg', vialMg: 10, waterMl: 2, minDose: 500, maxDose: 10000, weightBased: true, mcgPerKgMin: 5, mcgPerKgMax: 20 },
  { name: 'Semaglutide', dose: 250, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 250, maxDose: 2400 },
  { name: 'CJC-1295', dose: 100, unit: 'mcg', vialMg: 2, waterMl: 2, minDose: 50, maxDose: 300, weightBased: true, mcgPerKgMin: 1, mcgPerKgMax: 2 },
  { name: 'Ipamorelin', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300, weightBased: true, mcgPerKgMin: 1, mcgPerKgMax: 3 },
  { name: 'Tesamorelin', dose: 2000, unit: 'mcg', vialMg: 2, waterMl: 2, minDose: 1000, maxDose: 3000 },
  { name: 'PT-141', dose: 1750, unit: 'mcg', vialMg: 10, waterMl: 2, minDose: 500, maxDose: 2000 },
  { name: 'Semax', dose: 400, unit: 'mcg', vialMg: 3, waterMl: 1, minDose: 200, maxDose: 1000 },
  { name: 'Epithalon', dose: 5000, unit: 'mcg', vialMg: 10, waterMl: 2, minDose: 2500, maxDose: 10000 },
  { name: 'AOD-9604', dose: 300, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 200, maxDose: 600 },
  { name: 'GHK-Cu', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 500 },
  { name: 'Kisspeptin-10', dose: 100, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 50, maxDose: 200 },
  { name: 'Tirzepatide', dose: 2500, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 2500, maxDose: 15000 },
  { name: 'Retatrutide', dose: 1000, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 1000, maxDose: 12000 },
  { name: 'Sermorelin', dose: 300, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 200, maxDose: 500 },
  { name: 'GHRP-2', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  { name: 'GHRP-6', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  { name: 'Hexarelin', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  { name: 'IGF-1 LR3', dose: 50, unit: 'mcg', vialMg: 1, waterMl: 1, minDose: 20, maxDose: 100 },
  { name: 'Follistatin 344', dose: 100, unit: 'mcg', vialMg: 1, waterMl: 1, minDose: 50, maxDose: 200 },
  { name: 'GnRH / Triptorelin', dose: 100, unit: 'mcg', vialMg: 2, waterMl: 1, minDose: 50, maxDose: 200 },
  { name: 'P21', dose: 750, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 500, maxDose: 1000 },
  { name: 'DSIP', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 300 },
  { name: 'SS-31 / Elamipretide', dose: 40000, unit: 'mcg', vialMg: 40, waterMl: 2, minDose: 5000, maxDose: 40000 },
  { name: 'MOTS-c', dose: 5000, unit: 'mcg', vialMg: 10, waterMl: 2, minDose: 5000, maxDose: 10000 },
  { name: 'Thymalin', dose: 10000, unit: 'mcg', vialMg: 10, waterMl: 2, minDose: 5000, maxDose: 20000 },
  { name: 'Thymosin Alpha-1', dose: 1600, unit: 'mcg', vialMg: 5, waterMl: 1, minDose: 800, maxDose: 3200 },
  { name: 'KPV', dose: 500, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 200, maxDose: 1000 },
  { name: 'LL-37', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 400 },
  { name: 'ARA-290', dose: 2000, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 2000, maxDose: 4000 },
  { name: 'Selank', dose: 300, unit: 'mcg', vialMg: 5, waterMl: 1, minDose: 100, maxDose: 500 },
  { name: '5-Amino-1MQ', dose: 100, unit: 'mg', vialMg: 50, waterMl: 1, minDose: 50, maxDose: 150 },
  { name: 'Cerebrolysin', dose: 10, unit: 'ml', vialMg: 10, waterMl: 0, minDose: 5, maxDose: 30 }, // liquid, measured in ml — no reconstitution
  { name: 'Collagen Peptides', dose: 10, unit: 'g', vialMg: 10, waterMl: 0, minDose: 5, maxDose: 15 }, // oral powder, measured in grams
  { name: 'Dihexa', dose: 20, unit: 'mg', vialMg: 20, waterMl: 1, minDose: 10, maxDose: 40 },
  { name: 'FOXO4-DRI', dose: 5, unit: 'mg', vialMg: 10, waterMl: 2, minDose: 2, maxDose: 10 },
  { name: 'Larazotide', dose: 500, unit: 'mcg', vialMg: 1, waterMl: 0, minDose: 250, maxDose: 1000 }, // oral capsule — vialMg/waterMl not applicable
  { name: 'Melanotan II', dose: 250, unit: 'mcg', vialMg: 10, waterMl: 2, minDose: 100, maxDose: 500 },
  { name: 'NA-Semax-Amidate', dose: 400, unit: 'mcg', vialMg: 5, waterMl: 1, minDose: 200, maxDose: 1000 },
  { name: 'Testicular Bioregulators', dose: 10, unit: 'mg', vialMg: 20, waterMl: 1, minDose: 10, maxDose: 20 },
  { name: 'Copper Peptides Topical', dose: 200, unit: 'mcg', vialMg: 5, waterMl: 2, minDose: 100, maxDose: 500 },
];

const PT141_PRESET = DOSE_PRESETS.find(p => p.name === 'PT-141');

export const DOSE_PRESETS_MAP: Record<string, DosePreset> = {
  ...Object.fromEntries(DOSE_PRESETS.map(p => [p.name, p])),
  ...(PT141_PRESET && { 'PT-141 / Bremelanotide': PT141_PRESET }),
};
