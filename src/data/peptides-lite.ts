// AUTO-GENERATED: Lightweight peptide lookup (id, nameAr, nameEn, category)
// Used by pages that don't need full peptide detail data.
// Source: src/data/peptides.ts — regenerate if peptides change.

export type PeptideCategory = 'metabolic' | 'recovery' | 'hormonal' | 'brain' | 'longevity' | 'skin-gut';

export interface PeptideLite {
  id: string;
  nameAr: string;
  nameEn: string;
  category: PeptideCategory;
}

export const peptidesLite: PeptideLite[] = [
  { id: 'semaglutide', nameAr: 'سيماغلوتايد', nameEn: 'Semaglutide', category: 'metabolic' },
  { id: 'tirzepatide', nameAr: 'تيرزيباتايد', nameEn: 'Tirzepatide', category: 'metabolic' },
  { id: 'retatrutide', nameAr: 'ريتاتروتايد', nameEn: 'Retatrutide', category: 'metabolic' },
  { id: 'orforglipron', nameAr: 'أورفورغليبرون', nameEn: 'Orforglipron', category: 'metabolic' },
  { id: 'tesamorelin', nameAr: 'تيساموريلين', nameEn: 'Tesamorelin', category: 'metabolic' },
  { id: 'aod-9604', nameAr: 'AOD-9604', nameEn: 'AOD-9604', category: 'metabolic' },
  { id: '5-amino-1mq', nameAr: '5-أمينو-1MQ', nameEn: '5-Amino-1MQ', category: 'metabolic' },
  { id: 'bpc-157', nameAr: 'BPC-157', nameEn: 'BPC-157', category: 'recovery' },
  { id: 'tb-500', nameAr: 'TB-500 (ثايموسين بيتا-4)', nameEn: 'TB-500', category: 'recovery' },
  { id: 'cjc-1295', nameAr: 'CJC-1295', nameEn: 'CJC-1295', category: 'recovery' },
  { id: 'ipamorelin', nameAr: 'إيباموريلين', nameEn: 'Ipamorelin', category: 'recovery' },
  { id: 'sermorelin', nameAr: 'سيرموريلين', nameEn: 'Sermorelin', category: 'recovery' },
  { id: 'ghrp-2', nameAr: 'GHRP-2', nameEn: 'GHRP-2', category: 'recovery' },
  { id: 'ghrp-6', nameAr: 'GHRP-6', nameEn: 'GHRP-6', category: 'recovery' },
  { id: 'hexarelin', nameAr: 'هيكساريلين', nameEn: 'Hexarelin', category: 'recovery' },
  { id: 'igf-1-lr3', nameAr: 'IGF-1 LR3', nameEn: 'IGF-1 LR3', category: 'recovery' },
  { id: 'follistatin-344', nameAr: 'فوليستاتين 344', nameEn: 'Follistatin 344', category: 'recovery' },
  { id: 'kisspeptin-10', nameAr: 'كيسبيبتين-10', nameEn: 'Kisspeptin-10', category: 'hormonal' },
  { id: 'pt-141', nameAr: 'PT-141 (بريميلانوتايد)', nameEn: 'PT-141 / Bremelanotide', category: 'hormonal' },
  { id: 'testicular-bioregulators', nameAr: 'المنظمات الحيوية للخصية', nameEn: 'Testicular Bioregulators', category: 'hormonal' },
  { id: 'gnrh-triptorelin', nameAr: 'GnRH / تريبتوريلين', nameEn: 'GnRH / Triptorelin', category: 'hormonal' },
  { id: 'semax', nameAr: 'سيماكس', nameEn: 'Semax', category: 'brain' },
  { id: 'na-semax-amidate', nameAr: 'NA-Semax-Amidate', nameEn: 'NA-Semax-Amidate', category: 'brain' },
  { id: 'selank', nameAr: 'سيلانك', nameEn: 'Selank', category: 'brain' },
  { id: 'dihexa', nameAr: 'ديهيكسا', nameEn: 'Dihexa', category: 'brain' },
  { id: 'cerebrolysin', nameAr: 'سيريبروليسين', nameEn: 'Cerebrolysin', category: 'brain' },
  { id: 'p21', nameAr: 'P21', nameEn: 'P21', category: 'brain' },
  { id: 'epithalon', nameAr: 'إيبيثالون', nameEn: 'Epithalon', category: 'longevity' },
  { id: 'dsip', nameAr: 'DSIP (ببتيد تحفيز النوم العميق)', nameEn: 'DSIP', category: 'longevity' },
  { id: 'ss-31', nameAr: 'SS-31 (إيلاميبريتايد)', nameEn: 'SS-31 / Elamipretide', category: 'longevity' },
  { id: 'mots-c', nameAr: 'MOTS-c', nameEn: 'MOTS-c', category: 'longevity' },
  { id: 'foxo4-dri', nameAr: 'FOXO4-DRI', nameEn: 'FOXO4-DRI', category: 'longevity' },
  { id: 'thymalin', nameAr: 'ثيمالين', nameEn: 'Thymalin', category: 'longevity' },
  { id: 'thymosin-alpha-1', nameAr: 'ثايموسين ألفا-1', nameEn: 'Thymosin Alpha-1', category: 'longevity' },
  { id: 'collagen-peptides', nameAr: 'ببتيدات الكولاجين', nameEn: 'Collagen Peptides', category: 'skin-gut' },
  { id: 'ghk-cu', nameAr: 'GHK-Cu (ببتيد النحاس)', nameEn: 'GHK-Cu', category: 'skin-gut' },
  { id: 'copper-peptides-topical', nameAr: 'ببتيدات النحاس الموضعية', nameEn: 'Copper Peptides Topical', category: 'skin-gut' },
  { id: 'larazotide', nameAr: 'لارازوتايد', nameEn: 'Larazotide', category: 'skin-gut' },
  { id: 'kpv', nameAr: 'KPV', nameEn: 'KPV', category: 'skin-gut' },
  { id: 'll-37', nameAr: 'LL-37', nameEn: 'LL-37', category: 'skin-gut' },
  { id: 'ara-290', nameAr: 'ARA-290', nameEn: 'ARA-290', category: 'skin-gut' },
  { id: 'melanotan-ii', nameAr: 'ميلانوتان II', nameEn: 'Melanotan II', category: 'skin-gut' },
  { id: 'mk-677', nameAr: 'إيبوتاموران (MK-677)', nameEn: 'MK-677 / Ibutamoren', category: 'recovery' },
  { id: 'humanin', nameAr: 'هيومانين', nameEn: 'Humanin', category: 'longevity' },
  { id: 'vip', nameAr: 'VIP (الببتيد المعوي الفعّال)', nameEn: 'VIP (Vasoactive Intestinal Peptide)', category: 'skin-gut' },
  { id: 'oxytocin', nameAr: 'أوكسيتوسين', nameEn: 'Oxytocin', category: 'brain' },
  { id: 'snap-8', nameAr: 'سناب-8 (أرجيريلين)', nameEn: 'SNAP-8 / Argireline', category: 'skin-gut' },
];

// Quick lookup helpers
const _byId = new Map(peptidesLite.map(p => [p.id, p]));
const _byNameEn = new Map(peptidesLite.map(p => [p.nameEn.toLowerCase(), p]));

export function findPeptideById(id: string): PeptideLite | undefined {
  return _byId.get(id);
}

export function findPeptideByNameEn(name: string): PeptideLite | undefined {
  return _byNameEn.get(name.toLowerCase());
}
