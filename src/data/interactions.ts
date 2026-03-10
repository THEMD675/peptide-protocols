export type SeverityLevel = 'dangerous' | 'warning' | 'safe';

export interface InteractionResult {
  safe: boolean;
  warning: boolean;
  severity: SeverityLevel;
  severityAr: string;
  message: string;
  details: string;
}

/** Helper to create interaction results with severity */
function danger(message: string, details: string): InteractionResult {
  return { safe: false, warning: false, severity: 'dangerous', severityAr: 'خطير', message, details };
}
function warn(message: string, details: string): InteractionResult {
  return { safe: true, warning: true, severity: 'warning', severityAr: 'تحذير', message, details };
}
function dangerWarn(message: string, details: string): InteractionResult {
  return { safe: false, warning: true, severity: 'dangerous', severityAr: 'خطير', message, details };
}
function safe(message: string, details: string): InteractionResult {
  return { safe: true, warning: false, severity: 'safe', severityAr: 'آمن', message, details };
}
function safeWarn(message: string, details: string): InteractionResult {
  return { safe: true, warning: true, severity: 'warning', severityAr: 'تحذير', message, details };
}

export const DANGEROUS_COMBOS: Record<string, InteractionResult> = {
  'semaglutide+tirzepatide': danger('لا تجمع ناهضات GLP-1', 'كلاهما ينشّط مستقبلات GLP-1. الجمع بينهما يضاعف الآثار الجانبية (غثيان شديد، هبوط سكر) بدون فائدة إضافية مثبتة.'),
  'semaglutide+retatrutide': danger('لا تجمع ناهضات GLP-1', 'كلاهما يحتوي على نشاط GLP-1. الجمع يضاعف الغثيان وهبوط السكر بدون فائدة.'),
  'tirzepatide+retatrutide': danger('لا تجمع ناهضات GLP-1', 'كلاهما ناهض لـ GLP-1 وGIP. الجمع خطير ولا فائدة مثبتة.'),
  'igf-1-lr3+*': dangerWarn('خطر تضخّم أعضاء', 'IGF-1 LR3 مع أي محفّز لهرمون النمو يرفع IGF-1 بشكل مفرط. خطر تضخّم القلب والأعضاء على المدى الطويل. لا تجمع IGF-1 مع أي GHRH أو GHRP.'),
  'melanotan-ii+*': danger('Melanotan II غير آمن', 'لا ننصح باستخدام Melanotan II مطلقًا. خطر حقيقي لسرطان الجلد (ميلانوما). لا تجمعه مع أي شيء.'),
  'dihexa+*': dangerWarn('Dihexa تجريبي بالكامل', 'صفر تجارب بشرية. لا ننصح باستخدامه ولا بتجميعه مع أي شيء آخر.'),
  'foxo4-dri+*': dangerWarn('FOXO4-DRI تجريبي بالكامل', 'صفر تجارب بشرية. مكلف جدًا وآلية عمله غير مفهومة بالكامل. لا ننصح بالتجميع.'),
  'ghrp-2+ghrp-6': danger('لا تجمع GHRPs من نفس النوع', 'كلاهما يعمل على مستقبل GHS-R1a. الجمع لا يضيف فائدة ويزيد الكورتيزول والبرولاكتين. استخدم واحدًا فقط.'),
  'ghrp-2+hexarelin': danger('لا تجمع GHRPs من نفس النوع', 'كلاهما GHRP يعمل على نفس المستقبل. الجمع يزيد الأعراض الجانبية (احتباس ماء، جوع) بدون فائدة إضافية.'),
  'ghrp-6+hexarelin': danger('لا تجمع GHRPs من نفس النوع', 'كلاهما GHRP يتنافسان على مستقبل GHS-R1a. الجمع يرفع الكورتيزول والبرولاكتين بشكل مفرط.'),
  'semax+na-semax-amidate': danger('نفس الببتيد بأشكال مختلفة', 'NA-Semax-Amidate نسخة معدّلة من Semax. الجمع بينهما يعادل جرعة مضاعفة. استخدم واحدًا فقط.'),
};

export const SYNERGISTIC_COMBOS: Record<string, InteractionResult> = {
  'bpc-157+tb-500': safe('المزيج الذهبي للتعافي', 'BPC-157 يُصلح الأوتار والأربطة موضعيًا، TB-500 يُرمّم الأنسجة جهازيًا. أشهر تجميعة في مجتمع البايوهاكينغ. الجرعة: BPC-157 250mcg 2x/يوم + TB-500 750mcg 2x/أسبوع.'),
  'cjc-1295+ipamorelin': safe('أفضل تجميعة هرمون نمو', 'CJC-1295 يحفّز إفراز GH بشكل مستدام، Ipamorelin يضيف نبضة نظيفة بدون رفع الكورتيزول. الجرعة: CJC 100mcg + Ipa 200mcg قبل النوم فارغ المعدة.'),
  'semax+selank': safe('تجميعة دماغ مثالية', 'Semax يرفع BDNF 300-800% للتركيز والذاكرة، Selank يقلل القلق عبر GABA. توازن مثالي بين الحدّة والهدوء. بخاخ أنف صباحًا.'),
  'bpc-157+cjc-1295': safe('تعافي + هرمون نمو', 'BPC-157 يُسرّع شفاء الأنسجة، CJC-1295 يحفّز GH اللي يعزّز التعافي. آليات مكمّلة.'),
  'bpc-157+ipamorelin': safe('تعافي + هرمون نمو نظيف', 'BPC-157 للتعافي الموضعي + Ipamorelin لرفع GH بدون أعراض جانبية. تجميعة شائعة وآمنة.'),
  'bpc-157+ghk-cu': safe('تعافي شامل — أنسجة + بشرة', 'BPC-157 يُصلح الأوتار والأمعاء، GHK-Cu يُجدد الكولاجين والبشرة. آليات مختلفة تمامًا.'),
  'tb-500+cjc-1295': safe('تعافي عضلي + هرمون نمو', 'TB-500 للتعافي الجهازي + CJC-1295 لهرمون النمو. ممتاز للرياضيين.'),
  'tb-500+ipamorelin': safe('تعافي + GH نظيف', 'TB-500 يُرمّم العضلات + Ipamorelin يرفع GH. تجميعة آمنة للتعافي المتقدم.'),
  'semaglutide+tesamorelin': safe('فقدان دهون مزدوج — قوي جدًا', 'Semaglutide يقلل الشهية عبر GLP-1، Tesamorelin يحرق دهون البطن عبر GHRH. آليات مختلفة = نتائج مضاعفة.'),
  'semaglutide+aod-9604': safe('GLP-1 + حرق دهون مركّز', 'Semaglutide يقلل الشهية، AOD-9604 يستهدف الدهون مباشرة. تجميعة فقدان وزن فعّالة.'),
  'tesamorelin+aod-9604': safeWarn('حرق دهون مكثّف — تداخل محتمل', 'كلاهما يستهدف الدهون عبر آليات GH. قد يكون هناك تداخل. الأفضل استخدام واحد فقط.'),
  'tesamorelin+ipamorelin': safeWarn('كلاهما يحفّز GH — احترس', 'Tesamorelin (GHRH) + Ipamorelin (GHRP) = رفع GH قوي. قد يكون مفرط للمبتدئين. راقب IGF-1.'),
  'epithalon+ghk-cu': safe('بروتوكول إطالة عمر أساسي', 'Epithalon يُطيل التيلوميرات، GHK-Cu يُجدد البشرة والأنسجة. تجميعة خافينسون.'),
  'epithalon+thymosin-alpha-1': safe('طول عمر + مناعة', 'Epithalon للتيلوميرات + Thymosin Alpha-1 يعيد بناء الغدة الزعترية. بروتوكول مكافحة الشيخوخة الكلاسيكي.'),
  'kisspeptin-10+pt-141': safeWarn('هرمونات + أداء جنسي — بحذر', 'Kisspeptin يرفع التستوستيرون طبيعيًا، PT-141 يحسّن الأداء الجنسي. آليات مختلفة لكن كلاهما يؤثر هرمونيًا.'),
  'bpc-157+larazotide': safe('إصلاح أمعاء شامل', 'BPC-157 يُصلح بطانة الأمعاء، Larazotide يغلق الفجوات بين الخلايا (leaky gut). تجميعة مثالية لمشاكل الأمعاء.'),
  'bpc-157+kpv': safe('إصلاح أمعاء + مضاد التهاب', 'BPC-157 للشفاء + KPV للالتهاب المعوي. يكمّلان بعض.'),
  'semax+dsip': safeWarn('تركيز نهاري + نوم ليلي — توقيت مهم', 'Semax صباحًا للتركيز + DSIP مساءً للنوم. لا تأخذهم بنفس الوقت — Semax منبّه وDSIP منوّم.'),
  'epithalon+dsip': safe('نوم + تيلوميرات — تآزر مثالي', 'Epithalon يعيد ضبط الميلاتونين + DSIP يعمّق النوم. كلاهما مساءً. بروتوكول إطالة عمر شامل.'),
  'epithalon+thymalin': safe('بروتوكول خافينسون الكلاسيكي', 'Epithalon للتيلوميرات + Thymalin لتجديد الغدة الزعترية. دورات قصيرة متتابعة 2x سنويًا.'),
  'larazotide+kpv': safe('إصلاح أمعاء مزدوج', 'Larazotide يغلق الوصلات المحكمة + KPV يقلل الالتهاب. المرحلتان الأولى والثانية من بروتوكول إصلاح الأمعاء.'),
};

// Drug-peptide interactions — medications that interact with peptides
export const DRUG_INTERACTIONS: Record<string, InteractionResult> = {
  'semaglutide+metformin': safeWarn('GLP-1 + ميتفورمين — راقب السكر', 'كلاهما يخفض السكر. الجمع يزيد خطر هبوط السكر خصوصًا مع الصيام. راقب مستوى الجلوكوز يوميًا وقلّل جرعة الميتفورمين إذا لزم.'),
  'tirzepatide+metformin': safeWarn('GLP-1/GIP + ميتفورمين — راقب السكر', 'Tirzepatide يخفض السكر بقوة مع الميتفورمين. قد تحتاج لتقليل جرعة الميتفورمين. راقب الجلوكوز.'),
  'retatrutide+metformin': safeWarn('GLP-1 ثلاثي + ميتفورمين — راقب السكر', 'Retatrutide يخفض السكر عبر 3 مستقبلات. مع الميتفورمين راقب الجلوكوز بعناية.'),
  'semaglutide+insulin': danger('خطر هبوط سكر حاد', 'GLP-1 مع الأنسولين يضاعف خطر هبوط السكر الحاد (hypoglycemia). لا تجمعهم بدون إشراف طبي مباشر وتعديل جرعة الأنسولين.'),
  'tirzepatide+insulin': danger('خطر هبوط سكر حاد', 'Tirzepatide مع الأنسولين خطير جدًا. هبوط سكر حاد محتمل. لا تجمعهم بدون طبيب.'),
  'retatrutide+insulin': danger('خطر هبوط سكر حاد', 'Retatrutide مع الأنسولين خطير جدًا — ثلاثة مسارات لخفض السكر + أنسولين خارجي. لا تجمعهم بدون إشراف طبي.'),
  'bpc-157+warfarin': dangerWarn('BPC-157 يؤثر على التخثر', 'BPC-157 يؤثر على نظام أكسيد النيتريك والتخثر. مع مميعات الدم (وارفارين/هيبارين) يزيد خطر النزيف. أوقف BPC-157 أو استشر طبيبك.'),
  'tb-500+warfarin': dangerWarn('TB-500 + مميعات دم — خطر نزيف', 'TB-500 يُعزز تكوين أوعية دموية جديدة ويؤثر على التئام الجروح. مع مميعات الدم يزيد خطر النزيف.'),
  'ghk-cu+warfarin': safeWarn('GHK-Cu + مميعات دم — احتياط', 'GHK-Cu يؤثر على إصلاح الأنسجة وتكوين الأوعية. مع مميعات الدم قد يكون هناك تأثير. راقب INR بانتظام.'),
  'thymosin-alpha-1+immunosuppressants': danger('تعارض مع مثبطات المناعة', 'Thymosin Alpha-1 يُنشّط الجهاز المناعي. إذا تأخذ مثبطات مناعة (بعد زرع عضو، أمراض مناعية) = تعارض مباشر وخطير. لا تجمعهم.'),
  'll-37+immunosuppressants': dangerWarn('LL-37 + مثبطات مناعة — تعارض', 'LL-37 ينشّط الجهاز المناعي الفطري. مع مثبطات المناعة يحدث تعارض في آلية العمل. استشر طبيبك.'),
  'cjc-1295+ssri': safeWarn('GH + مضادات اكتئاب — متابعة', 'هرمون النمو يؤثر على السيروتونين. مع SSRIs (فلوكستين، سيرترالين) قد تلاحظ تغيرات مزاجية. ليس خطيرًا لكن راقب حالتك.'),
  'ipamorelin+ssri': safeWarn('GHRP + مضادات اكتئاب — متابعة', 'Ipamorelin يرفع GH الذي يؤثر على الناقلات العصبية. مع SSRIs تابع مزاجك ونومك.'),
  'semaglutide+thyroid': safeWarn('GLP-1 + أدوية الغدة الدرقية — امتصاص', 'Semaglutide يبطئ إفراغ المعدة مما قد يؤثر على امتصاص ليفوثيروكسين. خذ دواء الغدة على معدة فارغة صباحًا، قبل ساعة من أي شيء.'),
  'tirzepatide+thyroid': safeWarn('GLP-1 + أدوية الغدة — امتصاص', 'مثل Semaglutide، يبطئ الهضم وقد يقلل امتصاص ليفوثيروكسين. خذ الدواء على معدة فارغة.'),
  'cjc-1295+statins': safeWarn('GH + ستاتينات — مراقبة الكبد', 'هرمون النمو يؤثر على استقلاب الدهون والكبد. مع الستاتينات (أتورفاستاتين، روسوفاستاتين) راقب وظائف الكبد بانتظام.'),
  'bpc-157+nsaids': safe('BPC-157 يحمي من أضرار المسكنات', 'BPC-157 يحمي بطانة المعدة من تأثير مضادات الالتهاب (إيبوبروفين، نابروكسين). تجميعة مفيدة فعلًا — BPC-157 يقلل القرحة الناتجة عن NSAIDs.'),
  // Blood pressure medications
  'bpc-157+antihypertensives': safeWarn('BPC-157 + أدوية ضغط — مراقبة الضغط', 'BPC-157 يؤثر على أكسيد النيتريك الذي يوسّع الأوعية الدموية. مع أدوية الضغط (أملوديبين، ليزينوبريل) قد ينخفض الضغط أكثر من المتوقع. راقب ضغطك يوميًا.'),
  'semaglutide+antihypertensives': safeWarn('GLP-1 + أدوية ضغط — قد يتحسّن الضغط', 'Semaglutide يخفض الوزن مما يُحسّن ضغط الدم طبيعيًا. قد تحتاج لتقليل جرعة أدوية الضغط مع فقدان الوزن. تابع مع طبيبك.'),
  'tirzepatide+antihypertensives': safeWarn('GLP-1/GIP + أدوية ضغط — قد يتحسّن الضغط', 'مثل Semaglutide — فقدان الوزن يحسّن الضغط. راقب وعدّل الجرعة مع طبيبك.'),
  // Aspirin specific
  'bpc-157+aspirin': safe('BPC-157 + أسبرين — حماية المعدة', 'BPC-157 يحمي بطانة المعدة من تأثير الأسبرين المُضر. تجميعة مفيدة خصوصًا مع الاستخدام طويل المدى.'),
  'tb-500+aspirin': safeWarn('TB-500 + أسبرين — خطر نزيف خفيف', 'الأسبرين مميع دم خفيف + TB-500 يؤثر على الأوعية. خطر النزيف منخفض لكن موجود. راقب الكدمات.'),
};

/** Common medications that have known interactions with peptides */
export interface MedicationItem {
  id: string;
  nameAr: string;
  nameEn: string;
}

export const MEDICATIONS: MedicationItem[] = [
  { id: 'metformin', nameAr: 'ميتفورمين', nameEn: 'Metformin' },
  { id: 'insulin', nameAr: 'أنسولين', nameEn: 'Insulin' },
  { id: 'warfarin', nameAr: 'وارفارين', nameEn: 'Warfarin' },
  { id: 'immunosuppressants', nameAr: 'مثبطات المناعة', nameEn: 'Immunosuppressants' },
  { id: 'ssri', nameAr: 'مضادات الاكتئاب (SSRI)', nameEn: 'SSRIs' },
  { id: 'thyroid', nameAr: 'أدوية الغدة الدرقية', nameEn: 'Thyroid Medication' },
  { id: 'statins', nameAr: 'ستاتينات (أدوية الكوليسترول)', nameEn: 'Statins' },
  { id: 'nsaids', nameAr: 'مسكنات (إيبوبروفين، نابروكسين)', nameEn: 'NSAIDs' },
  { id: 'antihypertensives', nameAr: 'أدوية الضغط', nameEn: 'Antihypertensives' },
  { id: 'aspirin', nameAr: 'أسبرين', nameEn: 'Aspirin' },
];

export const GH_PEPTIDE_IDS = ['cjc-1295', 'ipamorelin', 'tesamorelin', 'sermorelin', 'ghrp-2', 'ghrp-6', 'hexarelin'];

export const FAT_LOSS_PEPTIDE_IDS = ['semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq', 'mots-c'];
