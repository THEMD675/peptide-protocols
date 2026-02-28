export interface InteractionResult {
  safe: boolean;
  warning: boolean;
  message: string;
  details: string;
}

export const DANGEROUS_COMBOS: Record<string, InteractionResult> = {
  'semaglutide+tirzepatide': { safe: false, warning: false, message: 'لا تجمع ناهضات GLP-1', details: 'كلاهما ينشّط مستقبلات GLP-1. الجمع بينهما يضاعف الآثار الجانبية (غثيان شديد، هبوط سكر) بدون فائدة إضافية مثبتة.' },
  'semaglutide+retatrutide': { safe: false, warning: false, message: 'لا تجمع ناهضات GLP-1', details: 'كلاهما يحتوي على نشاط GLP-1. الجمع يضاعف الغثيان وهبوط السكر بدون فائدة.' },
  'tirzepatide+retatrutide': { safe: false, warning: false, message: 'لا تجمع ناهضات GLP-1', details: 'كلاهما ناهض لـ GLP-1 وGIP. الجمع خطير ولا فائدة مثبتة.' },
  'igf-1-lr3+*': { safe: false, warning: true, message: 'خطر تضخّم أعضاء', details: 'IGF-1 LR3 مع أي محفّز لهرمون النمو يرفع IGF-1 بشكل مفرط. خطر تضخّم القلب والأعضاء على المدى الطويل. لا تجمع IGF-1 مع أي GHRH أو GHRP.' },
  'melanotan-ii+*': { safe: false, warning: false, message: 'Melanotan II غير آمن', details: 'لا ننصح باستخدام Melanotan II مطلقًا. خطر حقيقي لسرطان الجلد (ميلانوما). لا تجمعه مع أي شيء.' },
  'dihexa+*': { safe: false, warning: true, message: 'Dihexa تجريبي بالكامل', details: 'صفر تجارب بشرية. لا ننصح باستخدامه ولا بتجميعه مع أي شيء آخر.' },
  'foxo4-dri+*': { safe: false, warning: true, message: 'FOXO4-DRI تجريبي بالكامل', details: 'صفر تجارب بشرية. مكلف جدًا وآلية عمله غير مفهومة بالكامل. لا ننصح بالتجميع.' },
  'ghrp-2+ghrp-6': { safe: false, warning: false, message: 'لا تجمع GHRPs من نفس النوع', details: 'كلاهما يعمل على مستقبل GHS-R1a. الجمع لا يضيف فائدة ويزيد الكورتيزول والبرولاكتين. استخدم واحدًا فقط.' },
  'ghrp-2+hexarelin': { safe: false, warning: false, message: 'لا تجمع GHRPs من نفس النوع', details: 'كلاهما GHRP يعمل على نفس المستقبل. الجمع يزيد الأعراض الجانبية (احتباس ماء، جوع) بدون فائدة إضافية.' },
  'ghrp-6+hexarelin': { safe: false, warning: false, message: 'لا تجمع GHRPs من نفس النوع', details: 'كلاهما GHRP يتنافسان على مستقبل GHS-R1a. الجمع يرفع الكورتيزول والبرولاكتين بشكل مفرط.' },
  'semax+na-semax-amidate': { safe: false, warning: false, message: 'نفس الببتيد بأشكال مختلفة', details: 'NA-Semax-Amidate نسخة معدّلة من Semax. الجمع بينهما يعادل جرعة مضاعفة. استخدم واحدًا فقط.' },
};

export const SYNERGISTIC_COMBOS: Record<string, InteractionResult> = {
  'bpc-157+tb-500': { safe: true, warning: false, message: 'المزيج الذهبي للتعافي', details: 'BPC-157 يُصلح الأوتار والأربطة موضعيًا، TB-500 يُرمّم الأنسجة جهازيًا. أشهر تجميعة في مجتمع البايوهاكينغ. الجرعة: BPC-157 250mcg 2x/يوم + TB-500 750mcg 2x/أسبوع.' },
  'cjc-1295+ipamorelin': { safe: true, warning: false, message: 'أفضل تجميعة هرمون نمو', details: 'CJC-1295 يحفّز إفراز GH بشكل مستدام، Ipamorelin يضيف نبضة نظيفة بدون رفع الكورتيزول. الجرعة: CJC 100mcg + Ipa 200mcg قبل النوم فارغ المعدة.' },
  'semax+selank': { safe: true, warning: false, message: 'تجميعة دماغ مثالية', details: 'Semax يرفع BDNF 300-800% للتركيز والذاكرة، Selank يقلل القلق عبر GABA. توازن مثالي بين الحدّة والهدوء. بخاخ أنف صباحًا.' },
  'bpc-157+cjc-1295': { safe: true, warning: false, message: 'تعافي + هرمون نمو', details: 'BPC-157 يُسرّع شفاء الأنسجة، CJC-1295 يحفّز GH اللي يعزّز التعافي. آليات مكمّلة.' },
  'bpc-157+ipamorelin': { safe: true, warning: false, message: 'تعافي + هرمون نمو نظيف', details: 'BPC-157 للتعافي الموضعي + Ipamorelin لرفع GH بدون أعراض جانبية. تجميعة شائعة وآمنة.' },
  'bpc-157+ghk-cu': { safe: true, warning: false, message: 'تعافي شامل — أنسجة + بشرة', details: 'BPC-157 يُصلح الأوتار والأمعاء، GHK-Cu يُجدد الكولاجين والبشرة. آليات مختلفة تمامًا.' },
  'tb-500+cjc-1295': { safe: true, warning: false, message: 'تعافي عضلي + هرمون نمو', details: 'TB-500 للتعافي الجهازي + CJC-1295 لهرمون النمو. ممتاز للرياضيين.' },
  'tb-500+ipamorelin': { safe: true, warning: false, message: 'تعافي + GH نظيف', details: 'TB-500 يُرمّم العضلات + Ipamorelin يرفع GH. تجميعة آمنة للتعافي المتقدم.' },
  'semaglutide+tesamorelin': { safe: true, warning: false, message: 'فقدان دهون مزدوج — قوي جدًا', details: 'Semaglutide يقلل الشهية عبر GLP-1، Tesamorelin يحرق دهون البطن عبر GHRH. آليات مختلفة = نتائج مضاعفة.' },
  'semaglutide+aod-9604': { safe: true, warning: false, message: 'GLP-1 + حرق دهون مركّز', details: 'Semaglutide يقلل الشهية، AOD-9604 يستهدف الدهون مباشرة. تجميعة فقدان وزن فعّالة.' },
  'tesamorelin+aod-9604': { safe: true, warning: true, message: 'حرق دهون مكثّف — تداخل محتمل', details: 'كلاهما يستهدف الدهون عبر آليات GH. قد يكون هناك تداخل. الأفضل استخدام واحد فقط.' },
  'tesamorelin+ipamorelin': { safe: true, warning: true, message: 'كلاهما يحفّز GH — احترس', details: 'Tesamorelin (GHRH) + Ipamorelin (GHRP) = رفع GH قوي. قد يكون مفرط للمبتدئين. راقب IGF-1.' },
  'epithalon+ghk-cu': { safe: true, warning: false, message: 'بروتوكول إطالة عمر أساسي', details: 'Epithalon يُطيل التيلوميرات، GHK-Cu يُجدد البشرة والأنسجة. تجميعة خافينسون.' },
  'epithalon+thymosin-alpha-1': { safe: true, warning: false, message: 'طول عمر + مناعة', details: 'Epithalon للتيلوميرات + Thymosin Alpha-1 يعيد بناء الغدة الزعترية. بروتوكول مكافحة الشيخوخة الكلاسيكي.' },
  'kisspeptin-10+pt-141': { safe: true, warning: true, message: 'هرمونات + أداء جنسي — بحذر', details: 'Kisspeptin يرفع التستوستيرون طبيعيًا، PT-141 يحسّن الأداء الجنسي. آليات مختلفة لكن كلاهما يؤثر هرمونيًا.' },
  'bpc-157+larazotide': { safe: true, warning: false, message: 'إصلاح أمعاء شامل', details: 'BPC-157 يُصلح بطانة الأمعاء، Larazotide يغلق الفجوات بين الخلايا (leaky gut). تجميعة مثالية لمشاكل الأمعاء.' },
  'bpc-157+kpv': { safe: true, warning: false, message: 'إصلاح أمعاء + مضاد التهاب', details: 'BPC-157 للشفاء + KPV للالتهاب المعوي. يكمّلان بعض.' },
  'semax+dsip': { safe: true, warning: true, message: 'تركيز نهاري + نوم ليلي — توقيت مهم', details: 'Semax صباحًا للتركيز + DSIP مساءً للنوم. لا تأخذهم بنفس الوقت — Semax منبّه وDSIP منوّم.' },
  'epithalon+dsip': { safe: true, warning: false, message: 'نوم + تيلوميرات — تآزر مثالي', details: 'Epithalon يعيد ضبط الميلاتونين + DSIP يعمّق النوم. كلاهما مساءً. بروتوكول إطالة عمر شامل.' },
  'epithalon+thymalin': { safe: true, warning: false, message: 'بروتوكول خافينسون الكلاسيكي', details: 'Epithalon للتيلوميرات + Thymalin لتجديد الغدة الزعترية. دورات قصيرة متتابعة 2x سنويًا.' },
  'larazotide+kpv': { safe: true, warning: false, message: 'إصلاح أمعاء مزدوج', details: 'Larazotide يغلق الوصلات المحكمة + KPV يقلل الالتهاب. المرحلتان الأولى والثانية من بروتوكول إصلاح الأمعاء.' },
};

export const GH_PEPTIDE_IDS = ['cjc-1295', 'ipamorelin', 'tesamorelin', 'sermorelin', 'ghrp-2', 'ghrp-6', 'hexarelin'];

export const FAT_LOSS_PEPTIDE_IDS = ['semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq', 'mots-c'];
