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
  'bpc-157+cancer': danger('BPC-157 محظور مع السرطان النشط', 'BPC-157 يحفّز تكوين أوعية دموية جديدة (angiogenesis) مما قد يُغذّي الأورام السرطانية. محظور تمامًا مع أي سرطان نشط.'),
  'tb-500+cancer': danger('TB-500 محظور مع السرطان النشط', 'TB-500 يُعزّز نمو الأنسجة وتكوين الأوعية الدموية الجديدة. قد يُسرّع نمو الأورام. محظور مع السرطان النشط.'),
  'igf-1-lr3+cancer': danger('IGF-1 محظور مع السرطان', 'IGF-1 يحفّز نمو الخلايا بما فيها الخلايا السرطانية. مستويات IGF-1 المرتفعة مرتبطة بزيادة خطر السرطان. محظور تمامًا.'),
  'ghk-cu+cancer': dangerWarn('GHK-Cu — تجنّب مع السرطان', 'GHK-Cu يُعيد برمجة الجينات ويحفّز نمو الأنسجة. بيانات محدودة مع السرطان — تجنّب كإجراء احتياطي.'),
  'follistatin-344+cancer': dangerWarn('Follistatin — تجنّب مع السرطان', 'Follistatin يحفّز نمو العضلات عبر تثبيط myostatin. قد يؤثر على نمو الأورام. تجنّب مع السرطان النشط.'),
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
  // Levothyroxine / thyroid interactions
  'bpc-157+thyroid': safe('BPC-157 + ليفوثيروكسين — آمن', 'لا يوجد تفاعل معروف بين BPC-157 وأدوية الغدة الدرقية. BPC-157 لا يؤثر على امتصاص أو استقلاب ليفوثيروكسين.'),
  'cjc-1295+thyroid': safeWarn('محفّز GH + أدوية الغدة — مراقبة TSH', 'هرمون النمو يُسرّع تحويل T4 إلى T3 مما قد يُغيّر احتياجك من ليفوثيروكسين. افحص TSH وFT4 كل 6-8 أسابيع عند بدء CJC-1295.'),
  'ipamorelin+thyroid': safeWarn('محفّز GH + أدوية الغدة — مراقبة TSH', 'Ipamorelin يرفع هرمون النمو الذي يُسرّع تحويل T4 إلى T3. قد تحتاج لتعديل جرعة ليفوثيروكسين. راقب TSH بانتظام.'),
  'tesamorelin+thyroid': safeWarn('GHRH + أدوية الغدة — مراقبة وظائف الغدة', 'Tesamorelin يحفّز GH بقوة. هرمون النمو يؤثر على استقلاب هرمونات الغدة الدرقية. تابع TSH وFT3 مع طبيبك.'),
  'sermorelin+thyroid': safeWarn('GHRH + أدوية الغدة — مراقبة TSH', 'Sermorelin يحفّز إفراز هرمون النمو الذي يؤثر على تحويل T4→T3. راقب وظائف الغدة الدرقية بانتظام.'),
  'retatrutide+thyroid': safeWarn('GLP-1 ثلاثي + أدوية الغدة — امتصاص', 'مثل Semaglutide وTirzepatide — يبطئ إفراغ المعدة وقد يُقلل امتصاص ليفوثيروكسين. خذ دواء الغدة على معدة فارغة صباحًا.'),
  // Oral contraceptives
  'semaglutide+oral-contraceptives': safeWarn('GLP-1 + حبوب منع الحمل — انتبهي للامتصاص', 'Semaglutide يبطئ إفراغ المعدة بشكل ملحوظ مما قد يُقلل امتصاص حبوب منع الحمل الفموية. استخدمي وسيلة إضافية (واقي) خلال أول 3 أشهر وعند زيادة الجرعة.'),
  'tirzepatide+oral-contraceptives': safeWarn('GLP-1/GIP + حبوب منع الحمل — انتبهي للامتصاص', 'Tirzepatide يبطئ إفراغ المعدة. الدراسات أظهرت انخفاضًا في امتصاص حبوب منع الحمل. استخدمي وسيلة إضافية أو انتقلي لوسيلة غير فموية.'),
  'retatrutide+oral-contraceptives': safeWarn('GLP-1 ثلاثي + حبوب منع الحمل — امتصاص', 'Retatrutide يبطئ الهضم عبر 3 مستقبلات. احتمال كبير لتقليل امتصاص الأدوية الفموية بما فيها حبوب منع الحمل. استخدمي وسيلة بديلة.'),
  // Sulfonylureas (common Saudi diabetes meds)
  'semaglutide+sulfonylureas': dangerWarn('GLP-1 + سلفونيل يوريا — هبوط سكر', 'الجمع بين Semaglutide وأدوية السلفونيل يوريا (غليميبيرايد، غليبينكلاميد) يرفع خطر هبوط السكر. قلّل جرعة السلفونيل يوريا بنسبة 50% عند بدء GLP-1.'),
  'tirzepatide+sulfonylureas': dangerWarn('GLP-1/GIP + سلفونيل يوريا — هبوط سكر', 'Tirzepatide مع السلفونيل يوريا يزيد خطر هبوط السكر الحاد. قلّل جرعة السلفونيل يوريا واراقب الجلوكوز يوميًا.'),
  // Diabetes combo - DPP-4 inhibitors
  'semaglutide+dpp4-inhibitors': warn('GLP-1 + مثبطات DPP-4 — لا فائدة', 'مثبطات DPP-4 (سيتاغلبتين، فيلداغلبتين) تعمل على نفس مسار GLP-1. الجمع مع Semaglutide لا يُضيف فائدة وقد يزيد الآثار الجانبية. أوقف DPP-4 عند بدء GLP-1.'),
  'tirzepatide+dpp4-inhibitors': warn('GLP-1/GIP + مثبطات DPP-4 — لا فائدة', 'Tirzepatide يعمل على GLP-1 وGIP. مثبطات DPP-4 مكرّرة ولا تُضيف شيئًا. أوقفها عند بدء Tirzepatide.'),
  // Proton pump inhibitors (very common in Saudi)
  'bpc-157+ppi': safe('BPC-157 + مثبطات مضخة البروتون — آمن وتكميلي', 'BPC-157 يُصلح بطانة المعدة طبيعيًا. مع PPIs (أوميبرازول، إيزوميبرازول) يعملان بآليات مختلفة. قد يُساعد BPC-157 في تقليل الاعتماد على PPIs.'),
  // SGLT2 inhibitors (very common Saudi diabetes meds — empagliflozin, dapagliflozin)
  'semaglutide+sglt2-inhibitors': safeWarn('GLP-1 + مثبطات SGLT2 — مراقبة الجفاف والسكر', 'الجمع بين Semaglutide ومثبطات SGLT2 (إمباغليفلوزين، داباغليفلوزين) شائع وفعّال لكن يرفع خطر الجفاف وهبوط السكر. اشرب ماء كافي وراقب الجلوكوز. قد تحتاج تقليل الجرعة.'),
  'tirzepatide+sglt2-inhibitors': safeWarn('GLP-1/GIP + مثبطات SGLT2 — مراقبة الجفاف', 'Tirzepatide مع إمباغليفلوزين/داباغليفلوزين فعّال لكن كلاهما يسبب الجفاف. غثيان GLP-1 + إدرار SGLT2 = خطر جفاف مرتفع. اشرب 2-3 لتر ماء يوميًا.'),
  'retatrutide+sglt2-inhibitors': safeWarn('GLP-1 ثلاثي + مثبطات SGLT2 — جفاف وسكر', 'Retatrutide يخفض السكر عبر 3 مسارات + SGLT2 تُخرج السكر عبر البول. خطر هبوط سكر وجفاف. تابع مع طبيبك.'),
  // DOACs — Direct Oral Anticoagulants (replacing warfarin in modern practice)
  'bpc-157+doac': dangerWarn('BPC-157 + مميعات دم حديثة — خطر نزيف', 'BPC-157 يؤثر على نظام أكسيد النيتريك والتخثر. مع DOACs (ريفاروكسابان، أبيكسابان، إدوكسابان) يزيد خطر النزيف. استشر طبيبك قبل الاستخدام.'),
  'tb-500+doac': dangerWarn('TB-500 + مميعات دم حديثة — خطر نزيف', 'TB-500 يُعزز تكوين أوعية دموية جديدة. مع DOACs (ريفاروكسابان، أبيكسابان) يزيد خطر النزيف. تجنّب الجمع.'),
  // Corticosteroids + immune peptides
  'thymosin-alpha-1+corticosteroids': safeWarn('Thymosin Alpha-1 + كورتيزون — تعارض جزئي', 'الكورتيزون (بريدنيزون، ديكساميثازون) يثبّط المناعة، Thymosin Alpha-1 يُنشّطها. تأثيرات متعاكسة. إذا تأخذ كورتيزون لفترة طويلة، فائدة Thymosin Alpha-1 تقل. استشر طبيبك.'),
  'll-37+corticosteroids': safeWarn('LL-37 + كورتيزون — تأثير متعاكس', 'LL-37 مضاد ميكروبي ومنشّط مناعي. الكورتيزون يثبّط المناعة. الجمع يُقلل فعالية LL-37.'),
  // PDE5 inhibitors + PT-141 (very important safety interaction)
  'pt-141+pde5-inhibitors': dangerWarn('PT-141 + فياغرا/سياليس — هبوط ضغط', 'PT-141 (Bremelanotide) مع مثبطات PDE5 (سيلدينافيل، تادالافيل) يسبب هبوط ضغط حاد. لا تأخذهم بنفس اليوم. انتظر 24 ساعة بين PT-141 والفياغرا.'),
  // GH peptides + diabetes meds (GH raises blood sugar)
  'cjc-1295+metformin': safeWarn('محفّز GH + ميتفورمين — مراقبة السكر', 'هرمون النمو يرفع مقاومة الأنسولين ويزيد سكر الدم. مع الميتفورمين تحتاج مراقبة الجلوكوز. GH يعاكس عمل الميتفورمين جزئيًا.'),
  'ipamorelin+metformin': safeWarn('GHRP + ميتفورمين — مراقبة السكر', 'Ipamorelin يرفع هرمون النمو الذي يزيد مقاومة الأنسولين. مع الميتفورمين راقب السكر خصوصًا صباحًا.'),
  'tesamorelin+metformin': safeWarn('GHRH + ميتفورمين — مراقبة السكر', 'Tesamorelin يرفع GH بقوة مما يزيد مقاومة الأنسولين. أظهرت الدراسات ارتفاع طفيف في HbA1c. راقب سكرك.'),
  'cjc-1295+insulin': dangerWarn('محفّز GH + أنسولين — تعقيد سكر', 'هرمون النمو يرفع السكر والأنسولين يخفضه. الجمع يُعقّد التحكم بالسكر. تحتاج مراقبة دقيقة وتعديل جرعات متكرر. لا تجمعهم بدون إشراف طبي.'),
  'ipamorelin+insulin': dangerWarn('GHRP + أنسولين — تعقيد سكر', 'Ipamorelin يرفع GH الذي يرفع السكر. مع الأنسولين الخارجي يصعب التحكم بالجرعة. استشر طبيبك.'),
  // Anticoagulants — heparin specific
  'bpc-157+heparin': dangerWarn('BPC-157 + هيبارين — خطر نزيف', 'BPC-157 يؤثر على منظومة التخثر وأكسيد النيتريك. مع الهيبارين (بما فيه إينوكسابارين/كليكسان) يزيد خطر النزيف. أوقف BPC-157 قبل أي عملية جراحية بأسبوع.'),
  'tb-500+heparin': dangerWarn('TB-500 + هيبارين — خطر نزيف', 'TB-500 يُعزز الأوعية الجديدة ويؤثر على التئام الجروح. مع الهيبارين يزيد خطر النزيف والكدمات. تجنّب الجمع.'),
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
  { id: 'oral-contraceptives', nameAr: 'حبوب منع الحمل', nameEn: 'Oral Contraceptives' },
  { id: 'sulfonylureas', nameAr: 'سلفونيل يوريا (غليميبيرايد)', nameEn: 'Sulfonylureas' },
  { id: 'dpp4-inhibitors', nameAr: 'مثبطات DPP-4 (سيتاغلبتين)', nameEn: 'DPP-4 Inhibitors' },
  { id: 'ppi', nameAr: 'مثبطات مضخة البروتون (أوميبرازول)', nameEn: 'Proton Pump Inhibitors (PPIs)' },
  { id: 'sglt2-inhibitors', nameAr: 'مثبطات SGLT2 (إمباغليفلوزين، داباغليفلوزين)', nameEn: 'SGLT2 Inhibitors' },
  { id: 'doac', nameAr: 'مميعات دم حديثة (ريفاروكسابان، أبيكسابان)', nameEn: 'DOACs (Rivaroxaban, Apixaban)' },
  { id: 'corticosteroids', nameAr: 'كورتيزون (بريدنيزون، ديكساميثازون)', nameEn: 'Corticosteroids' },
  { id: 'pde5-inhibitors', nameAr: 'فياغرا / سياليس (سيلدينافيل، تادالافيل)', nameEn: 'PDE5 Inhibitors (Viagra/Cialis)' },
  { id: 'heparin', nameAr: 'هيبارين / كليكسان (إينوكسابارين)', nameEn: 'Heparin / Enoxaparin' },
  { id: 'cancer', nameAr: 'سرطان نشط (أي نوع)', nameEn: 'Active Cancer' },
];

export const GH_PEPTIDE_IDS = ['cjc-1295', 'ipamorelin', 'tesamorelin', 'sermorelin', 'ghrp-2', 'ghrp-6', 'hexarelin'];

export const FAT_LOSS_PEPTIDE_IDS = ['semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq', 'mots-c'];

/** Per-peptide timing requirements — shown as blue info cards */
export const TIMING_NOTES: Record<string, string> = {
  'cjc-1295': 'يُحقن على معدة فارغة — قبل النوم أو 2-3 ساعات بعد آخر وجبة. لا تأكل لمدة 30 دقيقة بعد الحقن.',
  'ipamorelin': 'يُحقن على معدة فارغة — الأفضل قبل النوم بـ 30 دقيقة. الطعام والسكر يُقلّلان فعاليته.',
  'sermorelin': 'يُحقن على معدة فارغة قبل النوم. الطعام والسكريات تُبطل مفعوله.',
  'ghrp-2': 'يُحقن على معدة فارغة — لا تأكل 2 ساعة قبله و30 دقيقة بعده. يسبب جوعًا شديدًا.',
  'ghrp-6': 'يُحقن على معدة فارغة — يسبب جوعًا شديدًا خلال 15 دقيقة. جهّز وجبة مسبقًا.',
  'hexarelin': 'على معدة فارغة. لا يُستخدم أكثر من 8 أسابيع متواصلة بسبب تحسُّس المستقبل.',
  'tesamorelin': 'يُحقن على معدة فارغة — الأفضل قبل النوم.',
  'dsip': 'يُحقن قبل النوم بـ 30-60 دقيقة فقط. لا تستخدمه نهارًا — يسبب نعاسًا.',
  'semax': 'بخاخ أنف صباحًا. التأثير المنبّه يستمر 6-8 ساعات — تجنّب الاستخدام المسائي.',
  'na-semax-amidate': 'بخاخ أنف صباحًا فقط. أقوى من Semax — لا تستخدمه بعد الظهر.',
  'selank': 'بخاخ أنف — يمكن استخدامه صباحًا أو مساءً. لا يسبب أرقًا.',
  'epithalon': 'يُحقن مساءً قبل النوم. دورات قصيرة: 10-20 يوم ثم استراحة 4-6 أشهر.',
  'bpc-157': 'يمكن حقنه في أي وقت. الأفضل قريبًا من موضع الإصابة. لا يتأثر بالطعام.',
  'tb-500': 'يمكن حقنه في أي وقت — يعمل جهازيًا. لا يتأثر بالطعام.',
  'semaglutide': 'حقنة واحدة أسبوعية في نفس اليوم من كل أسبوع. لا يتأثر بالوجبات.',
  'tirzepatide': 'حقنة واحدة أسبوعية في نفس اليوم. لا يتأثر بالطعام.',
  'retatrutide': 'حقنة واحدة أسبوعية. تدرّج الجرعة ببطء لتقليل الغثيان.',
  'mk-677': 'يُؤخذ فمويًا قبل النوم. على معدة فارغة للحصول على أفضل نبضة GH.',
  'pt-141': 'يُحقن 1-2 ساعة قبل النشاط المطلوب. لا تأخذ أكثر من جرعة واحدة كل 24 ساعة.',
  'kisspeptin-10': 'يُحقن صباحًا. أفضل تأثير على محور HPG في الصباح الباكر.',
  'mots-c': 'يُحقن صباحًا قبل التمرين. يعمل على الميتوكوندريا ويُحسّن أداء التمرين.',
  'ss-31': 'يُحقن صباحًا. يستهدف الميتوكوندريا مباشرة.',
  'thymosin-alpha-1': 'يُحقن مرتين أسبوعيًا. لا يتأثر بتوقيت الطعام.',
  'thymalin': 'يُحقن صباحًا. دورة 10 أيام ثم استراحة.',
  'collagen-peptides': 'يُؤخذ فمويًا مع الماء. الأفضل على معدة فارغة أو مع فيتامين C.',
  'ghk-cu': 'يُحقن أو يُطبّق موضعيًا. لا قيود على التوقيت.',
  'larazotide': 'يُؤخذ فمويًا قبل الوجبات بـ 15 دقيقة — يُغلق الوصلات المحكمة قبل وصول الطعام.',
  'kpv': 'يمكن أخذه فمويًا أو حقنًا. مع مشاكل الأمعاء الأفضل فمويًا قبل الأكل.',
};
