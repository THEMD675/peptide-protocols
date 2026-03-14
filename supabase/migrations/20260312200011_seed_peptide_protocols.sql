-- Seed peptide_protocols from peptides.ts (paid peptides only)
-- Generated: 2026-03-12T18:32:24.101Z

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('tirzepatide', 'يُبدأ بـ 2.5 ملغ أسبوعيًا لمدة 4 أسابيع، ثم يُرفع تدريجيًا كل 4 أسابيع (5 → 7.5 → 10 → 12.5 → 15 ملغ).', 'حقنة واحدة أسبوعية في نفس اليوم. يمكن أخذها في أي وقت.', 'استخدام مستمر تحت إشراف طبي. عند الإيقاف يُنصح بالتدرج خلال 8-12 أسبوع مع تثبيت العادات الغذائية والرياضية.', 'حقن تحت الجلد (Sub-Q) — قلم مُعبّأ مسبقًا. يُحقن في البطن أو الفخذ أو أعلى الذراع.', 'غثيان (أقل حدة من Semaglutide عند كثير من المستخدمين)، إسهال، إمساك، ألم بطن. نادرًا: التهاب بنكرياس. فقدان كتلة عضلية محتمل.', 'نفس موانع Semaglutide: تاريخ سرطان الغدة الدرقية النخاعي، MEN2، التهاب بنكرياس. الحمل والرضاعة.', 'يمكن دمجه مع Ipamorelin أو Tesamorelin لدعم هرمون النمو والحفاظ على الكتلة العضلية. البروتين الكافي وتمارين المقاومة ضروريان.', 'يُحفظ في الثلاجة (2-8°C). بعد الفتح يمكن حفظه في حرارة الغرفة لمدة 21 يومًا. لا يُجمّد.', 'ينشّط مستقبلَي GLP-1 وGIP معًا بشكل تآزري. GLP-1 يقلل الشهية ويُبطئ الهضم، وGIP يحسّن حساسية الأنسولين ويعزز أكسدة الدهون. التفعيل المزدوج يعطي نتائج أفضل من تفعيل GLP-1 وحده.', 'مستوى الدليل: ممتاز — تجارب SURMOUNT أظهرت فقدان وزن يصل إلى 22.5%. معتمد من FDA عام 2023 (Zepbound) للوزن و2022 (Mounjaro) للسكري. اعتُمد للمراهقين 2025. دراسة مارس 2026 أظهرت خفض مخاطر أحداث القلب والأوعية مقارنة بدولاغلوتايد. تجارب جارية لعلاج السكري النوع الأول مع السمنة ورجفان الأذين.', 2500, 15000, 'weekly', NULL, NULL, 'subq', '[{"week":1,"doseMcg":2500},{"week":5,"doseMcg":5000},{"week":9,"doseMcg":7500},{"week":13,"doseMcg":10000},{"week":17,"doseMcg":12500},{"week":21,"doseMcg":15000}]'::jsonb, ARRAY['38078870','35658024','34170647'], '750-1,500 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('retatrutide', 'في التجارب: 1-12 ملغ أسبوعيًا بالتدريج. الجرعة المثلى لم تُحدد نهائيًا بعد انتظارًا لنتائج المرحلة الثالثة.', 'حقنة واحدة أسبوعية.', 'قيد البحث — لا يوجد بروتوكول نهائي. يُنصح بعدم استخدامه خارج السياق البحثي حاليًا.', 'حقن تحت الجلد (Sub-Q).', 'غثيان خفيف إلى متوسط (أكثر شيوعًا مع الجرعات الأعلى)، إسهال، نقص شهية ملحوظ. ملف أمان مشابه للأدوية المعتمدة في هذه الفئة.', 'نفس الفئة: تاريخ سرطان الغدة الدرقية النخاعي، MEN2. لم تُدرس بشكل كافٍ في الحوامل.', 'لا يُنصح بالدمج مع GLP-1 agonists أخرى بسبب التداخل. يمكن إضافة Ipamorelin لدعم هرمون النمو.', 'يُحفظ في الثلاجة (2-8°C). تجنب الضوء المباشر.', 'يُفعّل ثلاثة مستقبلات هرمونية: GLP-1 (تقليل الشهية)، GIP (تحسين الأنسولين)، والجلوكاجون (زيادة حرق الدهون مباشرة وتوليد الحرارة). التفعيل الثلاثي يعطي أقوى تأثير على تكوين الجسم.', 'مستوى الدليل: قوي — المرحلة الثانية أظهرت فقدان وزن يصل إلى 24% خلال 48 أسبوع. تجارب المرحلة الثالثة جارية (TRIUMPH-4 أظهرت نتائج إيجابية في مارس 2026). تقديم طلب FDA متوقع نهاية 2026 أو بداية 2027، مع اعتماد محتمل نهاية 2027.', 1000, 12000, 'weekly', NULL, NULL, 'subq', NULL, ARRAY['37366315','37385280','38843460'], '750-1,313 ر.س/شهر', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('orforglipron', 'في التجارب: 12-36-48 ملغ فمويًا مرة يوميًا. الجرعة المثلى النهائية ستُحدد مع الاعتماد. يُبدأ بجرعة منخفضة وتُرفع تدريجيًا.', 'حبة واحدة يوميًا على معدة فارغة، صباحًا قبل الأكل بـ 30 دقيقة.', 'استخدام مستمر تحت إشراف طبي — مشابه لسيماغلوتايد.', 'فموي (حبوب) — لا حاجة للحقن إطلاقًا. هذه الميزة الرئيسية التي تميزه عن سيماغلوتايد وتيرزيباتايد.', 'غثيان (الأكثر شيوعًا، يتراجع مع الوقت)، إسهال، إمساك، قيء. ملف أمان مشابه لفئة GLP-1 بشكل عام.', 'نفس فئة GLP-1: تاريخ سرطان الغدة الدرقية النخاعي، MEN2، التهاب بنكرياس. الحمل والرضاعة.', 'لا يُدمج مع ناهضات GLP-1 أخرى (سيماغلوتايد، تيرزيباتايد). يمكن إضافة تمارين مقاومة وبروتين كافي للحفاظ على الكتلة العضلية.', 'يُحفظ في درجة حرارة الغرفة — لا يحتاج تبريد (ميزة كبيرة على الحقن).', 'ناهض غير ببتيدي لمستقبلات GLP-1 يعمل بنفس آلية سيماغلوتايد: يقلل الشهية عبر مراكز الشبع في الدماغ، يُبطئ إفراغ المعدة، ويحسّن إفراز الأنسولين. الميزة الكبرى: يُمتص فمويًا بسهولة دون حاجة لتقنيات امتصاص خاصة.', 'مستوى الدليل: قوي — تجارب المرحلة الثالثة مكتملة. المرحلة الثانية أظهرت فقدان وزن يصل إلى 14.7% خلال 36 أسبوع. قُدّم لـ FDA في 2025 وحصل على أولوية المراجعة الوطنية. قرار الاعتماد متوقع في أبريل 2026.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, ARRAY['37385275','37840095'], 'غير محدد — لم يُطرح تجاريًا بعد', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('tesamorelin', '2 ملغ يوميًا حقنة واحدة.', 'قبل النوم بـ 30-60 دقيقة على معدة فارغة (لا طعام لمدة ساعتين قبلها) لتعزيز النبض الليلي لهرمون النمو.', '12-26 أسبوع استخدام، ثم 4-8 أسابيع راحة. يمكن التكرار.', 'حقن تحت الجلد (Sub-Q) في البطن. يحتاج إعادة تكوين بماء معقم.', 'ألم وتورم خفيف مكان الحقن (أكثر شيوعًا)، ألم مفاصل، وذمة خفيفة، تنميل أطراف. نادرًا: ارتفاع سكر الدم.', 'أورام نشطة أو تاريخ حديث لأورام (خاصة أورام الغدة النخامية). اضطراب محور HPA. الحمل والرضاعة.', 'يُدمج بشكل ممتاز مع Ipamorelin (تآزر في تحفيز GH). يمكن إضافة Semaglutide لتأثير مزدوج على الدهون الحشوية.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 14 يومًا مُبرّدًا.', 'يحفّز الغدة النخامية لإفراز هرمون النمو بشكل نابض طبيعي (يحافظ على النمط الفسيولوجي). يستهدف الدهون الحشوية تحديدًا، ويحسّن نسبة الدهون إلى العضلات دون رفع IGF-1 لمستويات خطرة.', 'مستوى الدليل: ممتاز — معتمد من FDA عام 2010 (Egrifta) لعلاج الدهون الحشوية المرتبطة بفيروس HIV. تجارب سريرية واسعة أثبتت تقليل الدهون الحشوية بنسبة 15-18%.', 2000, 3000, 'od', 16, 6, 'subq', NULL, ARRAY['41476424','21283099','38905488'], '675-938 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('aod-9604', '300 ميكروغرام يوميًا. بعض البروتوكولات تستخدم 500 ميكروغرام.', 'صباحًا على معدة فارغة أو قبل التمرين بـ 30 دقيقة.', '12 أسبوع استخدام، ثم 4 أسابيع راحة.', 'حقن تحت الجلد (Sub-Q) في منطقة الدهون المستهدفة (البطن عادة).', 'آثار جانبية نادرة وخفيفة: احمرار مكان الحقن، صداع خفيف. لا يرفع سكر الدم ولا IGF-1 بشكل ملحوظ.', 'أورام نشطة. الحمل والرضاعة. مرض السكري (يؤثر على أيض الدهون). لا يُستخدم مع هرمون النمو الخارجي.', 'يُدمج مع CJC-1295 + Ipamorelin لتأثير شامل على تكوين الجسم. يمكن إضافته لبروتوكول Semaglutide لاستهداف الدهون العنيدة.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 28 يومًا مُبرّدًا.', 'يحاكي تأثير هرمون النمو على تكسير الدهون (lipolysis) دون التأثيرات الأخرى لهرمون النمو مثل رفع السكر أو نمو الأنسجة. يحفّز إنزيم lipase الحساس للهرمونات ويثبّط تكوّن الدهون الجديد (lipogenesis).', 'مستوى الدليل: متوسط — دراسات بشرية محدودة أظهرت فقدان وزن متواضع. لم يحصل على موافقة FDA كدواء. معتمد من FDA كمكمل غذائي (GRAS) فقط.', 300, 600, 'od', 12, 4, 'subq', NULL, ARRAY['15134286','41490200','14685303'], '225-375 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('5-amino-1mq', '50-150 ملغ يوميًا عن طريق الفم (كبسولات). البعض يبدأ بـ 50 ملغ ويرفع تدريجيًا.', 'صباحًا مع الإفطار أو بعده مباشرة.', '8-12 أسبوع استخدام، ثم 4 أسابيع راحة.', 'عن طريق الفم (كبسولات) — ميزة كبرى لمن يتجنب الحقن.', 'غثيان خفيف عند بعض المستخدمين، صداع نادر. ملف أمان يبدو جيدًا لكن البيانات البشرية طويلة الأمد غير متوفرة بعد.', 'لا توجد موانع موثقة بشكل قاطع. يُنصح بالحذر عند مرضى الكبد والكلى. غير مدروس في الحوامل.', 'يُدمج مع Semaglutide أو AOD-9604 لتأثير متعدد الآليات على الدهون. يمكن إضافته لأي بروتوكول أيض.', 'يُحفظ في درجة حرارة الغرفة بعيدًا عن الرطوبة والضوء.', 'يثبّط إنزيم NNMT (Nicotinamide N-Methyltransferase) الذي يزداد نشاطه في الخلايا الدهنية. تثبيطه يزيد مستويات NAD+ داخل الخلايا مما يعزز أيض الدهون ويحوّل الخلايا الدهنية البيضاء إلى خلايا أكثر نشاطًا أيضيًا.', 'مستوى الدليل: متوسط — دراسات ما قبل سريرية واعدة جدًا. أظهرت الدراسات الحيوانية تقليل الدهون بنسبة 30% دون تغيير النظام الغذائي. لا توجد تجارب بشرية كبيرة حتى الآن.', NULL, NULL, 'od', 10, 4, 'oral', NULL, ARRAY['29395804','9643626','32185724'], '300-450 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('tb-500', '500-750 ميكروغرام مرتين أسبوعيًا في مرحلة التحميل (أول 4-6 أسابيع). ثم 500 ميكروغرام مرة أسبوعيًا للصيانة.', 'صباحًا فقط — يُفضل في أيام عدم التمرين أو قبل التمرين بـ 30 دقيقة على الأقل. لا يُحقن في المساء.', '6-8 أسابيع تحميل، ثم 4 أسابيع صيانة، ثم 4 أسابيع راحة. يُكرر حسب الحاجة.', 'حقن تحت الجلد (Sub-Q) أو حقن عضلي (IM). يعمل جهازيًا فلا حاجة للحقن بالقرب من الإصابة.', 'صداع مؤقت عند بعض المستخدمين (خاصة الأيام الأولى)، إحساس بالحرارة أو احمرار مكان الحقن. نادرًا: دوخة خفيفة.', 'سرطان نشط (يحفّز تكوّن الأوعية وهجرة الخلايا). لا يُستخدم بالقرب من أورام. الحمل والرضاعة.', 'يُدمج مع BPC-157 (المزيج الذهبي). BPC-157 يعمل موضعيًا وTB-500 يعمل جهازيًا — تآزر مثالي.', 'يُحفظ مجففًا في الثلاجة أو المجمّد. بعد إعادة التكوين يُستخدم خلال 14 يومًا مُبرّدًا.', 'ينظّم بروتين الأكتين (المكوّن الرئيسي للهيكل الخلوي) مما يعزز هجرة الخلايا إلى مواقع الإصابة. يقلل الالتهاب، يحفّز تكوّن أوعية دموية جديدة، ويعزز تمايز الخلايا الجذعية. يعمل على مستوى جهازي (systemic) وليس موضعي فقط.', 'مستوى الدليل: قوي — عشرات الدراسات الحيوانية والخلوية. مستخدم بشكل واسع في الطب البيطري (سباق الخيل). تقارير سريرية بشرية واسعة لكن تجارب RCT محدودة.', 2500, 10000, 'biweekly', 10, 4, 'subq', NULL, ARRAY['22963545','20167896'], '300-450 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('cjc-1295', 'CJC-1295 بدون DAC: 100-300 ميكروغرام قبل النوم. CJC-1295 مع DAC: 2 ملغ مرتين أسبوعيًا.', 'بدون DAC: قبل النوم على معدة فارغة. مع DAC: في أي وقت (لكن يُفضل المساء).', '12-16 أسبوع استخدام ثم 4-8 أسابيع راحة. مراقبة IGF-1 ضرورية.', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين بماء معقم للجراثيم.', 'تنبيه مهم: احمرار الوجه وإحساس بالحرارة (flushing) شائع — ناتج عن تحرير الهيستامين وليس حساسية. احتباس سوائل خفيف، تنميل أصابع، صداع. مع DAC: ارتفاع مستمر في IGF-1 قد يكون غير مرغوب.', 'أورام نشطة أو تاريخ سرطان. داء السكري غير المنضبط. أورام الغدة النخامية.', 'يُدمج بشكل كلاسيكي مع Ipamorelin (GHRH + GHRP = تآزر مثالي). الأفضل استخدام النسخة بدون DAC مع Ipamorelin.', 'يُحفظ مجففًا في المجمّد. بعد إعادة التكوين يُستخدم خلال 21 يومًا مُبرّدًا. حساس للحرارة.', 'يحفّز مستقبلات GHRH في الغدة النخامية فيزيد إفراز هرمون النمو. نسخة DAC تتحد مع الألبومين في الدم فتُطيل مدة التأثير إلى 6-8 أيام. يرفع GH و IGF-1 بشكل نابض.', 'مستوى الدليل: جيد — تجارب بشرية أظهرت رفع هرمون النمو وIGF-1 بشكل ملحوظ ومستدام. الأدلة السريرية أقل من Tesamorelin لكن الاستخدام العملي واسع.', 100, 300, 'od', 14, 6, 'subq', NULL, ARRAY['16352683','21204297','41476424'], '300-563 ر.س/شهر', 'intermediate', 'نسخة DAC ترفع IGF-1 بشكل مستمر — راقب مستويات IGF-1 بانتظام. احمرار الوجه (flushing) طبيعي وليس رد فعل تحسسي.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ipamorelin', '200-300 ميكروغرام 1-3 مرات يوميًا. الجرعة الأكثر شيوعًا: 200 ميكروغرام قبل النوم.', 'قبل النوم بـ 30-60 دقيقة على معدة فارغة (الأهم). يمكن إضافة جرعة صباحية عند الاستيقاظ قبل الأكل بـ 30 دقيقة.', '12-16 أسبوع استخدام ثم 4 أسابيع راحة. بعض البروتوكولات: 5 أيام استخدام + 2 أيام راحة أسبوعيًا.', 'حقن تحت الجلد (Sub-Q) في البطن. يحتاج إعادة تكوين.', 'آثار جانبية قليلة جدًا — صداع خفيف (نادر)، جوع مؤقت بعد الحقن (لأنه يحاكي الغريلين). لا يرفع الكورتيزول أو البرولاكتين.', 'أورام نشطة. داء السكري غير المنضبط. أورام الغدة النخامية.', 'المزيج الأمثل: CJC-1295 (بدون DAC) + Ipamorelin قبل النوم. يمكن إضافته لبروتوكول Tesamorelin لتأثير تآزري.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 28 يومًا مُبرّدًا.', 'يرتبط بمستقبل الغريلين (GHS-R) في الغدة النخامية فيحفّز إفراز هرمون النمو بنبضات. الميزة الفريدة: لا يرفع الكورتيزول ولا البرولاكتين ولا الألدوستيرون — أنظف ببتيد GHRP متاح.', 'مستوى الدليل: جيد — تجارب بشرية أثبتت رفع هرمون النمو بشكل انتقائي ونظيف. أكثر GHRP دراسةً من حيث الانتقائية. مستخدم على نطاق واسع في الطب التجديدي.', 200, 300, 'od', 14, 4, 'subq', NULL, ARRAY['41476424','41490200','10373343'], '300-488 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('sermorelin', '200-300 ميكروغرام قبل النوم يوميًا.', 'قبل النوم بـ 30-60 دقيقة على معدة فارغة.', '3-6 أشهر استخدام مستمر. بعض الأطباء يصفونه طويل الأمد. يُقيّم بتحاليل IGF-1 كل 3 أشهر.', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين.', 'احمرار وحكة مكان الحقن (شائع)، صداع، دوخة خفيفة. ملف أمان ممتاز مع تاريخ طويل.', 'أورام نشطة. أورام الغدة النخامية. الحمل.', 'يُدمج مع GHRP مثل Ipamorelin أو GHRP-2 لتأثير تآزري. خيار بديل عن CJC-1295.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 14 يومًا مُبرّدًا.', 'يحاكي GHRH الطبيعي فيحفّز الغدة النخامية لإفراز هرمون النمو بنمط نابض فسيولوجي. يحافظ على آلية التغذية الراجعة السلبية فلا يُفرط في رفع GH.', 'مستوى الدليل: جيد — كان معتمدًا من FDA سابقًا (Geref) لتشخيص نقص هرمون النمو عند الأطفال. سُحب لأسباب تجارية وليس لأسباب أمان. تاريخ طويل من الاستخدام الآمن.', 300, 500, 'od', 18, NULL, 'subq', NULL, ARRAY['41490200','37688464','32257855'], '375-675 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ghrp-2', '100-300 ميكروغرام 1-3 مرات يوميًا.', 'قبل النوم + عند الاستيقاظ (على معدة فارغة). يمكن إضافة جرعة ما بعد التمرين.', '8-12 أسبوع استخدام ثم 4 أسابيع راحة. يمكن التبديل بين GHRP-2 وIpamorelin.', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين.', 'زيادة الشهية (ملحوظة — قد تكون ميزة أو عيب)، احتباس سوائل خفيف، ارتفاع طفيف في الكورتيزول والبرولاكتين.', 'أورام نشطة. السمنة المفرطة (بسبب زيادة الشهية). ارتفاع البرولاكتين. داء كوشينج.', 'يُدمج مع CJC-1295 (بدون DAC) أو Sermorelin. يُفضل Ipamorelin عليه للذين لا يريدون زيادة الشهية.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 21 يومًا مُبرّدًا.', 'يرتبط بمستقبل الغريلين (GHS-R) ويحفّز إفراز هرمون النمو بقوة. يرفع أيضًا الكورتيزول والبرولاكتين بدرجة خفيفة (على عكس Ipamorelin). يزيد الشهية بشكل ملحوظ.', 'مستوى الدليل: جيد — تجارب بشرية متعددة أثبتت فعاليته في رفع GH. أقوى من Ipamorelin لكن أقل انتقائية.', 200, 300, 'bid', 10, 4, 'subq', NULL, ARRAY['28400207','15230633','30051972'], '225-375 ر.س/شهر', 'intermediate', 'يرفع الكورتيزول والبرولاكتين — يجب مراقبة التحاليل. قد يسبب احتباس ماء وجوع شديد.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ghrp-6', '100-300 ميكروغرام 1-3 مرات يوميًا.', 'قبل الوجبات بـ 30 دقيقة للاستفادة من زيادة الشهية، أو قبل النوم.', '8-12 أسبوع ثم 4 أسابيع راحة.', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين.', 'زيادة شهية قوية جدًا (الأقوى بين GHRPs)، احتباس سوائل، ارتفاع كورتيزول وبرولاكتين. قد يرفع سكر الدم.', 'السمنة. داء السكري. ارتفاع البرولاكتين. متلازمة كوشينج. أورام نشطة.', 'يُفضل فقط لمن يريد زيادة الوزن والكتلة العضلية. يُدمج مع CJC-1295 أو Sermorelin.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 21 يومًا مُبرّدًا.', 'يرتبط بمستقبل الغريلين ويحفّز إفراز هرمون النمو. يرفع الغريلين بشكل كبير مما يزيد الشهية بقوة. يرفع الكورتيزول والبرولاكتين أكثر من GHRP-2.', 'مستوى الدليل: جيد — من أقدم GHRPs وأكثرها دراسة. تجارب بشرية متعددة. يُعتبر أقوى محفّز للشهية بين الببتيدات.', 200, 300, 'bid', 10, 4, 'subq', NULL, ARRAY['41327290','8887178','24697286'], '188-338 ر.س/شهر', 'intermediate', 'يسبب جوعًا شديدًا وقد يرفع سكر الدم. يرفع الكورتيزول والبرولاكتين. راقب التحاليل بانتظام.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('hexarelin', '100-200 ميكروغرام 1-2 مرات يوميًا. لا يُنصح بتجاوز 200 ميكروغرام بسبب التحمّل.', 'قبل النوم على معدة فارغة.', '4-6 أسابيع فقط (بسبب التحمّل السريع) ثم 4-8 أسابيع راحة. أقصر دورة بين GHRPs.', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين.', 'ارتفاع ملحوظ في الكورتيزول والبرولاكتين. احتباس سوائل. تحمّل سريع يقلل الفعالية. زيادة شهية.', 'ارتفاع البرولاكتين. أورام نشطة. داء كوشينج. لا يُستخدم طويل الأمد.', 'يمكن استخدامه كـ "kickstart" لدورات قصيرة ثم الانتقال إلى Ipamorelin للصيانة. يُدمج مع GHRH مثل CJC-1295.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 14 يومًا مُبرّدًا.', 'يرتبط بمستقبل الغريلين بأعلى قوة بين GHRPs. يُطلق أكبر نبضة من هرمون النمو لكن التأثير يتناقص خلال أسابيع بسبب التحمّل (desensitization). يرفع الكورتيزول والبرولاكتين.', 'مستوى الدليل: جيد — تجارب بشرية أثبتت أنه الأقوى في رفع GH بين جميع GHRPs. لكن الجسم يطوّر تحمّلًا (tolerance) سريعًا.', 200, 300, 'od', 5, 6, 'subq', NULL, ARRAY['28400207','25278975','18787392'], '263-413 ر.س/شهر', 'advanced', 'يحدث تحمّل سريع — تقل الفعالية بعد 4-6 أسابيع. يرفع الكورتيزول والبرولاكتين أكثر من بقية محفّزات GH.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('igf-1-lr3', '20-50 ميكروغرام يوميًا. للرياضيين: 50-100 ميكروغرام (جرعة أعلى = خطورة أعلى).', 'بعد التمرين مباشرة أو صباحًا. تجنب الأخذ قبل النوم.', '4-6 أسابيع فقط. لا يُستخدم لأكثر من 6 أسابيع متواصلة. راحة مساوية لمدة الاستخدام.', 'حقن تحت الجلد (Sub-Q) أو حقن عضلي (IM) في العضلة المستهدفة.', 'هبوط سكر الدم (الأهم — يجب الأكل مع الحقن)، ألم مفاصل، احتباس سوائل، نمو أنسجة غير مرغوب (عند الإفراط). خطر نظري لتحفيز نمو أورام.', 'أي تاريخ سرطان. داء السكري (خطر هبوط سكر حاد). أمراض القلب. الحمل. أعمار أقل من 25 سنة.', 'يُدمج بحذر شديد مع هرمون النمو. لا يُنصح بدمجه مع أنسولين خارجي (خطورة عالية). يُفضل استخدام GHRPs الأكثر أمانًا بدلًا منه.', 'يُحفظ مجمّدًا (-20°C). بعد إعادة التكوين يُستخدم خلال 7 أيام مُبرّدًا. حساس للغاية.', 'يرتبط مباشرة بمستقبلات IGF-1 فيحفّز نمو العضلات (hypertrophy + hyperplasia)، يثبّط الموت الخلوي المبرمج، ويُسرّع تخليق البروتين. تأثيره مباشر — لا يحتاج تحفيز الغدة النخامية.', 'مستوى الدليل: متوسط — مدروس بشريًا لعدة حالات. التعديل يُطيل نصف العمر إلى 20-30 ساعة بدلًا من 12-15 دقيقة لـ IGF-1 الطبيعي. خطورة أعلى من GHRPs.', 50, 100, 'od', 5, 5, 'subq', NULL, ARRAY['39679943','37261455','37114757'], '563-1,125 ر.س/شهر', 'advanced', 'خطر هبوط سكر الدم حقيقي — يجب تناول كربوهيدرات مع كل حقنة. لا يُستخدم من قِبل المبتدئين أو بدون إشراف طبي.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('follistatin-344', '100 ميكروغرام يوميًا لمدة 10-30 يومًا. بروتوكولات قصيرة بسبب قصر نصف العمر والتكلفة العالية.', 'صباحًا أو قبل التمرين.', '10-30 يوم استخدام ثم توقف. دورات قصيرة فقط. مراقبة FSH ضرورية (قد يخفضه).', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين دقيقة (جزيء كبير وهش).', 'انخفاض FSH (قد يؤثر على الخصوبة مؤقتًا)، ألم مكان الحقن. مخاوف نظرية حول التأثير على أعضاء أخرى غير العضلات.', 'مشاكل الخصوبة (يخفض FSH). أورام نشطة. أمراض عضلة القلب (القلب عضلة أيضًا!). الحمل.', 'يمكن إضافته لبروتوكول هرمون النمو لتأثير تآزري على العضلات. لا يُدمج مع IGF-1 LR3 (خطورة نمو غير منضبط).', 'يُحفظ مجمّدًا (-20°C). بعد إعادة التكوين يُستخدم خلال 7 أيام فقط مُبرّدًا. حساس للغاية — تجنب الرج.', 'يرتبط بالميوستاتين (Myostatin) ويثبّطه. الميوستاتين هو المُثبّط الطبيعي لنمو العضلات — تثبيطه يرفع السقف الوراثي لبناء العضلات. يؤثر أيضًا على الأكتيفين وFSH.', 'مستوى الدليل: متوسط — علم الأحياء واضح ومثبت (تثبيط الميوستاتين يزيد الكتلة العضلية بشكل درامي في الحيوانات). التجارب البشرية محدودة جدًا بسبب الحجم الكبير للجزيء.', 100, 200, 'od', 3, NULL, 'subq', NULL, ARRAY['31758732','32671599','27787698'], '750-1,500 ر.س/دورة', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('pt-141', '1.75 ملغ (الجرعة المعتمدة من FDA). للرجال: 1-2 ملغ. يمكن البدء بـ 0.5 ملغ لتقييم الاستجابة.', 'قبل النشاط الجنسي المتوقع بـ 45-60 دقيقة. لا يُستخدم أكثر من مرة كل 24 ساعة. الحد: 8 جرعات شهريًا.', 'عند الحاجة فقط — ليس استخدامًا يوميًا. لا يحتاج دورات. الحد: 8 جرعات شهريًا كحد أقصى.', 'حقن تحت الجلد (Sub-Q) في البطن (Vyleesi المعتمد). يتوفر أيضًا كبخاخ أنف (غير معتمد رسميًا لكن شائع الاستخدام).', 'غثيان (40% — الأثر الجانبي الأكثر شيوعًا، يتراجع مع الاستخدام)، احمرار الوجه، صداع. قد يسبب ارتفاعًا مؤقتًا في ضغط الدم. قد يُسبّب تصبّغًا جلديًا بسيطًا عند الاستخدام المتكرر.', 'ارتفاع ضغط الدم غير المنضبط. أمراض قلبية حادة. لا يُستخدم مع مثبطات MAO. الحمل والرضاعة.', 'يمكن دمجه مع Kisspeptin-10 لتأثير مزدوج (رفع التستوستيرون + تحفيز الرغبة). لا يُدمج مع Melanotan II (تداخل على نفس المستقبلات).', 'Vyleesi المعتمد: يُحفظ في درجة حرارة الغرفة. الشكل البحثي: يُحفظ مُبرّدًا بعد إعادة التكوين.', 'يعمل مباشرة على الجهاز العصبي المركزي عبر تفعيل مستقبلات الميلانوكورتين MC3R وMC4R في الدماغ. يختلف تمامًا عن أدوية الانتصاب (مثل الفياغرا) التي تعمل على الأوعية الدموية — PT-141 يحفّز الرغبة الجنسية نفسها.', 'مستوى الدليل: ممتاز — معتمد من FDA عام 2019 (Vyleesi) لعلاج اضطراب نقص الرغبة الجنسية عند النساء. تجارب بشرية واسعة أثبتت فعاليته للجنسين.', 1750, 2000, 'prn', NULL, NULL, 'subq', NULL, ARRAY['15134289','31369224','31429064'], '56-94 ر.س/جرعة', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('testicular-bioregulators', '10-20 ملغ يوميًا عن طريق الفم (كبسولات). بعض المنتجات: كبسولتان يوميًا لمدة 10-30 يومًا.', 'صباحًا ومساءً مع الطعام.', '10-30 يوم استخدام، ثم 3-6 أشهر راحة. يُكرر 2-3 مرات سنويًا.', 'عن طريق الفم (كبسولات). لا يحتاج حقن — ميزة كبرى.', 'ملف أمان ممتاز في البيانات المتوفرة. آثار جانبية نادرة جدًا.', 'سرطان البروستاتا أو أورام حساسة للأندروجين. الحمل (للنساء).', 'يُدمج مع Kisspeptin-10 لتحفيز شامل على مستويات متعددة. يمكن إضافته لبروتوكول Epithalon (ببتيدات خافينسون).', 'يُحفظ في درجة حرارة الغرفة بعيدًا عن الرطوبة.', 'ببتيدات قصيرة جدًا تدخل نواة الخلية وتتفاعل مع الحمض النووي (DNA) لتنظيم التعبير الجيني لخلايا Leydig المنتجة للتستوستيرون. تعيد ضبط وظيفة الأنسجة على المستوى الجينومي دون تثبيط المحور.', 'مستوى الدليل: متوسط — مبنية على أبحاث البروفيسور خافينسون (روسيا) الممتدة لـ 40+ سنة في الببتيدات القصيرة المنظّمة للجينات. بيانات سريرية موجودة لكنها من مصادر روسية بشكل رئيسي.', NULL, NULL, 'od', 3, 18, 'oral', NULL, ARRAY['30178547','29179259','9824503'], '150-300 ر.س/دورة', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('gnrh-triptorelin', 'لاستعادة المحور: جرعة واحدة 100 ميكروغرام. هذا يختلف تمامًا عن جرعات علاج السرطان (3.75 ملغ شهريًا). الجرعة الخاطئة يمكن أن تُثبّط المحور بالكامل.', 'جرعة واحدة فقط. التوقيت ليس حرجًا. يُعطى عادة في بداية بروتوكول PCT.', 'جرعة واحدة فقط كإعادة تشغيل (restart) — ليس استخدامًا متكررًا. يُتبع ببروتوكول PCT كامل.', 'حقن عضلي (IM) أو تحت الجلد (Sub-Q). جرعة واحدة.', 'تعرّق ساخن (hot flashes) مؤقت، صداع، تغيرات مزاجية. هذه عابرة لأن الاستخدام جرعة واحدة.', 'الحمل (فئة X). حساسية معروفة. لا يُستخدم مع دورة ستيرويد نشطة (يجب الانتظار حتى تخلّص الجسم من الستيرويد).', 'يُتبع بـ Clomiphene + Tamoxifen (بروتوكول PCT كلاسيكي). يمكن إضافة Kisspeptin-10 بعده لتعزيز التعافي.', 'يُحفظ في الثلاجة. حساس للحرارة.', 'عند إعطائه بجرعة واحدة صغيرة: يحفّز إطلاقًا قويًا وحادًا لـ LH وFSH من الغدة النخامية (flare effect) مما يعيد تشغيل المحور HPG. عند الاستخدام المستمر: يُثبّط المحور (يُستخدم لعلاج سرطان البروستاتا).', 'مستوى الدليل: ممتاز — معتمد من FDA لعدة استخدامات (سرطان البروستاتا، البلوغ المبكر، IVF). يُستخدم بشكل غير رسمي لاستعادة المحور الهرموني بعد دورات الستيرويد.', 100, 200, 'prn', NULL, NULL, 'im', NULL, ARRAY['6387490','20166771','38546114'], '113-188 ر.س/جرعة', 'advanced', 'تحذير حرج: الجرعة الواحدة الصغيرة (100 ميكروغرام) تُحفّز المحور، لكن الجرعات الأكبر أو المتكررة تُثبّطه بالكامل. لا يُستخدم بدون إشراف طبي.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('na-semax-amidate', '100-400 ميكروغرام يوميًا (بخاخ أنف). أقل من Semax العادي بسبب القوة الأعلى.', 'صباحًا أو قبل المهام الذهنية بـ 15 دقيقة. تجنب بعد الظهر المتأخر.', '10-20 يوم استخدام ثم 10-14 يوم راحة.', 'بخاخ أنف (intranasal).', 'مشابه لـ Semax: جفاف أنف خفيف، أرق إذا أُخذ متأخرًا. بعض التقارير عن تحفيز ذهني قوي جدًا عند الجرعات الأعلى.', 'نفس موانع Semax. يُنصح ببدء بجرعة أقل من Semax العادي بسبب القوة الأعلى.', 'يُدمج مع Selank للتوازن. بديل أقوى عن Semax العادي لمن يحتاج تأثيرًا أقوى.', 'يُحفظ في الثلاجة. بعد الفتح يُستخدم خلال 30 يومًا.', 'نفس آلية Semax لكن بنفاذية أعلى عبر الحاجز الدموي الدماغي ومقاومة أكبر للتكسّر الإنزيمي. تعديل N-Acetyl يزيد الذوبان في الدهون، وAmidate يحمي من البيبتيداز. التأثير أقوى وأطول من Semax العادي.', 'مستوى الدليل: متوسط — مبني على أبحاث Semax القوية مع تعديلات تزيد الاستقرار والنفاذية. بيانات مباشرة عن هذه النسخة المعدّلة أقل، لكن الآلية مفهومة.', 200, 400, 'od', 2, 2, 'nasal', NULL, ARRAY['29395804','9643626','32185724'], '188-300 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('selank', '200-400 ميكروغرام يوميًا (بخاخ أنف). يُقسم على 2-3 بخّات.', 'في أي وقت عند الحاجة لتقليل القلق. يمكن استخدامه صباحًا أو مساءً. لا يُسبب نعاسًا.', '14-21 يوم استخدام ثم 14 يوم راحة. يمكن التبديل مع Semax.', 'بخاخ أنف (intranasal) — نفس سهولة استخدام Semax.', 'ملف أمان ممتاز — آثار جانبية نادرة جدًا. لا إدمان، لا تحمّل، لا انسحاب. لا يُسبب نعاسًا على عكس أدوية القلق التقليدية.', 'الحمل والرضاعة. أمراض المناعة الذاتية النشطة (بسبب التأثير المناعي المشتق من Tuftsin).', 'المزيج المثالي: Semax (صباحًا للتركيز) + Selank (عند الحاجة لتقليل القلق). يمكن إضافة Epithalon للنوم.', 'يُحفظ في الثلاجة (2-8°C). بعد الفتح يُستخدم خلال 30 يومًا.', 'يعدّل نظام GABA (يزيد مستوياته دون إدمان مثل البنزوديازيبينات). يؤثر على السيروتونين والدوبامين والنورإبنفرين بشكل متوازن. يقلل القلق مع الحفاظ على التركيز — لا يُسبب نعاسًا أو تثبيطًا إدراكيًا.', 'مستوى الدليل: قوي — معتمد كدواء في روسيا لعلاج القلق العام (GAD). عقود من البحث في معهد علم الوراثة الجزيئية الروسي. نفس المختبر الذي طوّر Semax.', 300, 500, 'od', 2, 2, 'nasal', NULL, ARRAY['36322304','31625062','30255741'], '150-263 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('dihexa', '10-20 ملغ يوميًا عن طريق الفم (حسب التقارير المتاحة). لا توجد جرعة مثبتة بشريًا.', 'صباحًا عن طريق الفم.', '10-30 يوم استخدام ثم فترة راحة مماثلة. الحذر الشديد بسبب قلة البيانات البشرية.', 'عن طريق الفم (كبسولات أو محلول). ميزة عدم الحاجة للحقن.', 'غير مدروسة بشريًا بشكل كافٍ. تقارير عن صداع وأرق. مخاوف نظرية حول تحفيز مسار c-Met (مرتبط بنمو بعض الأورام).', 'أي تاريخ سرطان (مسار c-Met مرتبط بالأورام). الحمل. أمراض الكبد.', 'يمكن دمجه نظريًا مع Semax لتأثير تآزري على BDNF ونمو المشابك. لكن لا توجد بيانات عن الجمع.', 'يُحفظ في درجة حرارة الغرفة بعيدًا عن الرطوبة والضوء.', 'يرتبط بمستقبل HGF/c-Met (عامل نمو الخلايا الكبدية) في الدماغ. يحفّز تكوّن مشابك عصبية جديدة (synaptogenesis) بقوة هائلة. يعزز إشارات عامل نمو الأعصاب (NGF) ويحمي من التنكّس العصبي.', 'مستوى الدليل: ضعيف — دراسات حيوانية مبهرة من جامعة واشنطن (2013). لا توجد تجارب بشرية. نتائج الفئران مذهلة (استعادة الذاكرة في نماذج الزهايمر) لكن الانتقال للبشر غير مؤكد.', NULL, NULL, 'od', 3, 3, 'oral', NULL, ARRAY['41490200','18097939','25187433'], '300-563 ر.س/شهر', 'advanced', 'لا توجد تجارب بشرية. مسار c-Met مرتبط بنمو بعض الأورام — خطر نظري جدّي. للباحثين والمتقدمين فقط.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('cerebrolysin', '5-30 مل يوميًا حسب الحالة. للتعزيز المعرفي: 5-10 مل. لعلاج السكتة: 30-50 مل. دورات 10-20 يوم.', 'صباحًا. يُعطى يوميًا لمدة الدورة.', '10-20 يوم استخدام ثم 1-3 أشهر راحة. يُكرر 2-4 مرات سنويًا.', 'حقن عضلي (IM) حتى 5 مل، أو حقن وريدي (IV) بالتسريب البطيء للجرعات الأعلى. لا يؤخذ عن طريق الفم ولا تحت الجلد.', 'دوخة، صداع، تعرّق، أرق (عند الأخذ متأخرًا). نادرًا: تفاعلات تحسسية (مصدر حيواني). ملف أمان جيد في 200+ تجربة.', 'صرع غير منضبط. حساسية بروتين الخنزير. فشل كلوي حاد. الحمل.', 'يمكن دمجه مع Semax (بخاخ أنف) بين دورات Cerebrolysin. يُعتبر "البروتوكول الروسي الشامل" مع Semax + Selank + Cerebrolysin.', 'أمبولات جاهزة — تُحفظ في درجة حرارة الغرفة بعيدًا عن الضوء. لا يُجمّد.', 'يحاكي تأثير عوامل التغذية العصبية الطبيعية (NGF, BDNF, CNTF). يحمي الخلايا العصبية من الموت، يحفّز نمو محاور عصبية جديدة (neurogenesis)، ويعزز مرونة المشابك. تأثيره متعدد الأهداف على عكس الأدوية التقليدية أحادية الهدف.', 'مستوى الدليل: قوي — أكثر من 200 تجربة سريرية بشرية منشورة. معتمد كدواء في 44 دولة (بما فيها دول أوروبية وآسيوية). مستخدم لعلاج السكتة الدماغية وإصابات الدماغ والزهايمر. غير معتمد في أمريكا.', NULL, NULL, 'od', 2, 8, 'im', NULL, ARRAY['37480458','38737662','34560919'], '375-750 ر.س/دورة', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('p21', '750 ميكروغرام يوميًا (بخاخ أنف أو حقن). لا توجد جرعة بشرية مُثبتة.', 'صباحًا (بخاخ أنف أو حقن تحت الجلد).', '10-30 يوم استخدام ثم فترة راحة مماثلة. بيانات الدورات المثلى غير متوفرة.', 'بخاخ أنف (intranasal) — الأكثر شيوعًا. يمكن حقن تحت الجلد.', 'غير مدروسة بشريًا بشكل كافٍ. تقارير عن صداع خفيف وتحفيز ذهني.', 'أورام الدماغ. الصرع. الحمل. أي حالة يكون فيها تحفيز نمو عصبي غير مرغوب.', 'يمكن تبديله مع Semax (لا يُستخدمان معًا — آليات مشابهة). يمكن إضافة Selank للتوازن.', 'يُحفظ في الثلاجة أو المجمّد. حساس للحرارة.', 'يحفّز تكوّن خلايا عصبية جديدة (neurogenesis) في منطقة الحصين (hippocampus) عبر محاكاة تأثير CNTF. يزيد إنتاج BDNF ويثبّط GSK-3β مما يحمي من تراكم بروتين Tau المرتبط بالزهايمر.', 'مستوى الدليل: ضعيف — دراسات حيوانية واعدة أظهرت تحسين الذاكرة في نماذج الزهايمر. لا توجد تجارب بشرية منشورة. ببتيد تجريبي.', 750, 1000, 'od', 3, 3, 'nasal', NULL, ARRAY['40480232','38917788','37463267'], '225-375 ر.س/شهر', 'advanced', 'تجريبي بالكامل — صفر تجارب بشرية. آلية العمل غير مفهومة بالكامل. لا ننصح بالاستخدام بدون إشراف طبي متخصص.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('dsip', '100-300 ميكروغرام قبل النوم. يمكن البدء بـ 100 ميكروغرام وزيادتها حسب الاستجابة.', 'قبل النوم بـ 30-60 دقيقة. استخدام مسائي فقط.', '10-14 يوم استخدام ثم أسبوعين راحة. يمكن استخدامه لإعادة ضبط نمط النوم.', 'بخاخ أنف (intranasal) — الأكثر شيوعًا وفعالية. يتوفر أيضًا كحقن تحت الجلد.', 'نعاس صباحي خفيف عند بعض المستخدمين (يتراجع مع ضبط الجرعة). صداع نادر. لا يُسبب إدمان أو اعتماد على عكس حبوب النوم.', 'انخفاض ضغط الدم (DSIP قد يخفضه أكثر). العمل الليلي أو القيادة بعد الأخذ. الحمل.', 'يُدمج مع Epithalon (Epithalon يحسّن الميلاتونين + DSIP يحسّن موجات دلتا = نوم شامل). يمكن التبديل بينهما.', 'يُحفظ في المجمّد (-20°C). بعد إعادة التكوين يُستخدم خلال 10 أيام مُبرّدًا. جزيء هش — تجنب الرج.', 'يعدّل إيقاع النوم والاستيقاظ عبر التأثير على موجات دلتا في الدماغ (النوم العميق). يقلل الكورتيزول ليلًا مما يُسهّل الدخول في النوم العميق. يعزز إفراز هرمون النمو الليلي. يحسّن نسبة REM إلى deep sleep.', 'مستوى الدليل: متوسط — اكتُشف عام 1977. دراسات بشرية أظهرت تحسين جودة النوم وزيادة مراحل النوم العميق (delta waves). البيانات مختلطة لكن التقارير السريرية إيجابية.', 200, 300, 'od', 2, 2, 'nasal', NULL, ARRAY['16539679','3550726','39444618'], '188-300 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ss-31', '40 ملغ يوميًا (الجرعة المعتمدة لمتلازمة بارث). لتعزيز الميتوكوندريا: 20-40 ملغ. في التجارب: 5-40 ملغ.', 'صباحًا يوميًا.', 'استخدام مستمر لمتلازمة بارث (معتمد). لتعزيز الميتوكوندريا: دورات 4-8 أسابيع ثم تقييم.', 'حقن تحت الجلد (Sub-Q) يوميًا. الشكل المعتمد من FDA.', 'ألم مكان الحقن (أكثر شيوعًا). غثيان خفيف. صداع. ملف أمان مقبول في التجارب السريرية.', 'لا توجد موانع مطلقة معروفة حتى الآن. الحذر عند مرضى الكلى (يُطرح كلويًا).', 'يُدمج مع MOTS-c (كلاهما يستهدف الميتوكوندريا بآليات مختلفة). يمكن إضافة Epithalon لبروتوكول شيخوخة شامل.', 'يُحفظ في الثلاجة. الشكل المعتمد (Stegazah): شروط التخزين حسب الشركة المصنّعة.', 'يخترق الخلية ويرتبط بالكارديوليبين (cardiolipin) في الغشاء الداخلي للميتوكوندريا. يُعيد تنظيم سلسلة نقل الإلكترونات فيزيد إنتاج ATP ويقلل الشوارد الحرة (ROS). يحمي الميتوكوندريا من الشيخوخة ويُعيد وظيفتها.', 'مستوى الدليل: قوي — معتمد من FDA عام 2025 لعلاج متلازمة بارث (Barth syndrome). تجارب بشرية متعددة في أمراض القلب والشيخوخة. أول دواء يستهدف الميتوكوندريا مباشرة.', 20000, 40000, 'od', 6, NULL, 'subq', NULL, ARRAY['31747905','39848110','34480713'], '750-1,500 ر.س/شهر', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('mots-c', '5-10 ملغ يوميًا (حقن). بعض البروتوكولات: 5 ملغ 3 مرات أسبوعيًا.', 'صباحًا أو قبل التمرين.', '4-8 أسابيع استخدام ثم 4 أسابيع راحة. قيد البحث.', 'حقن تحت الجلد (Sub-Q). يحتاج إعادة تكوين دقيقة.', 'غير مدروسة بشريًا بشكل كافٍ. تقارير عن إحساس بالدفء وزيادة طاقة.', 'أمراض الميتوكوندريا الأولية (قد يُعقّد الصورة). لم يُدرس في الحوامل.', 'يُدمج مع SS-31 (استهداف مزدوج للميتوكوندريا). يمكن إضافة 5-Amino-1MQ لتأثير أيضي شامل.', 'يُحفظ مجمّدًا (-20°C). بعد إعادة التكوين يُستخدم خلال 7 أيام مُبرّدًا. حساس للأكسدة.', 'يُنتج طبيعيًا من الميتوكوندريا أثناء الإجهاد الأيضي. يُنشّط مسار AMPK (نفس مسار التمرين والصيام). يحسّن حساسية الأنسولين، يزيد أكسدة الدهون، ويحاكي تأثيرات التمرين الرياضي (exercise mimetic).', 'مستوى الدليل: متوسط — اكتُشف عام 2015 في USC. دراسات حيوانية أظهرت تحسين الأيض وحساسية الأنسولين وممارسة التمرين. تجارب بشرية صغيرة. ببتيد ثوري من حيث المفهوم.', 5000, 10000, 'od', 6, 4, 'subq', NULL, ARRAY['25738459','36761202','39321430'], '563-1,125 ر.س/شهر', 'advanced', 'تأكد من مصدر موثوق — بعض المنتجات البحثية المتاحة قد تحتوي على شوائب بسبب صعوبة تصنيع هذا الببتيد. اطلب شهادة تحليل (COA) من طرف ثالث.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('foxo4-dri', 'غير محددة بشريًا. في الفئران: 5 ملغ/كغ (= جرعة ضخمة وباهظة للبشر). لا يوجد بروتوكول بشري مثبت.', 'غير محدد. في الفئران: حقن كل 3 أيام لمدة 3 أسابيع.', 'غير محدد بشريًا. قيد البحث.', 'حقن تحت الجلد أو وريدي (في الحيوانات). الشكل البشري غير مُعتمد.', 'غير معروفة بشريًا. خطر نظري: قتل خلايا سليمة إذا كان الاستهداف غير دقيق.', 'لا يوجد بروتوكول بشري — أي استخدام بشري تجريبي بالكامل وعلى المسؤولية الشخصية.', 'نظريًا يمكن دمجه مع Epithalon (تنظيف الخلايا الهرمة + إطالة التيلوميرات = مقاربة شاملة لمكافحة الشيخوخة).', 'يُحفظ مجمّدًا (-20°C). حساس للغاية. مكلف جدًا.', 'يستهدف الخلايا الهَرِمة (senescent cells) — خلايا توقفت عن الانقسام لكنها لا تموت وتُفرز عوامل التهاب مزمن. FOXO4-DRI يتنافس مع FOXO4 الطبيعي على الارتباط بـ p53، مما يُحرر p53 ليُفعّل موت الخلية المبرمج (apoptosis) في الخلايا الهرمة فقط.', 'مستوى الدليل: ضعيف جدًا — دراسة واحدة رئيسية (2017) من هولندا على الفئران. صفر تجارب بشرية. النتائج الحيوانية مثيرة (عكس علامات الشيخوخة) لكن الانتقال للبشر غير مؤكد إطلاقًا.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, ARRAY['36515093','33996787','34877934'], '1,875+ ر.س/دورة', 'advanced', 'صفر تجارب بشرية. التكلفة باهظة جدًا. أي استخدام بشري تجريبي بالكامل. لا يُنصح بالاستخدام خارج السياق البحثي.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('thymalin', '10 ملغ يوميًا حقنًا لمدة 10 أيام. بعض البروتوكولات: 10 ملغ كل يومين لمدة 5 جرعات.', 'صباحًا أو ظهرًا.', '10 أيام استخدام ثم 6 أشهر راحة. يُكرر مرتين سنويًا. في دراسة خافينسون: دورة سنوية مع Epithalon.', 'حقن عضلي (IM). يحتاج إعادة تكوين.', 'ملف أمان جيد في البيانات المتوفرة. تفاعلات حساسية نادرة (مصدر حيواني). ارتفاع مؤقت في درجة الحرارة عند بعض المستخدمين.', 'أمراض المناعة الذاتية النشطة (يُنشّط الجهاز المناعي). حساسية بروتينات حيوانية. الحمل.', 'يُدمج كلاسيكيًا مع Epithalon في "بروتوكول خافينسون لإطالة العمر". يمكن إضافة Thymosin Alpha-1 لتعزيز مناعي شامل.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم فورًا.', 'يُعيد تنشيط الغدة الزعترية التي تضمر مع التقدم في العمر. يحفّز نضج الخلايا التائية (T-cells) ويعزز المراقبة المناعية. ينظّم التوازن بين المناعة الفطرية والتكيّفية. يعيد ضبط وظيفة الغدة الصنوبرية.', 'مستوى الدليل: متوسط — بيانات البروفيسور خافينسون ممتدة لـ 40+ سنة. دراسة على 266 شخصًا فوق 60 سنة أظهرت انخفاض معدل الوفاة بنسبة 50% خلال 6 سنوات متابعة. معتمد كدواء في روسيا.', 10000, 20000, 'od', 2, 24, 'im', NULL, ARRAY['33237528','12374906','12577695'], '300-450 ر.س/دورة', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('thymosin-alpha-1', '1.6 ملغ حقنة واحدة يوميًا أو كل يومين. هذه الجرعة المعتمدة في الدول التي يُباع فيها كدواء.', 'صباحًا أو ظهرًا.', '2-4 أسابيع للتعزيز المناعي. يمكن الاستمرار أطول في حالات العدوى المزمنة. يُكرر 2-4 مرات سنويًا.', 'حقن تحت الجلد (Sub-Q). سهل الإعطاء الذاتي.', 'ملف أمان ممتاز — آثار جانبية نادرة وخفيفة (احمرار مكان الحقن، حمّى خفيفة مؤقتة). لا يُسبب فرط نشاط مناعي.', 'أمراض المناعة الذاتية النشطة (رغم أنه أكثر أمانًا من المحفّزات المناعية الأخرى). مرضى زراعة الأعضاء على مثبّطات المناعة.', 'يُدمج مع Epithalon لبروتوكول إطالة عمر شامل (مناعة + تيلوميرات). يمكن إضافته في موسم الإنفلونزا كدعم مناعي.', 'يُحفظ مجففًا في الثلاجة. بعد إعادة التكوين يُستخدم خلال 14 يومًا مُبرّدًا.', 'يُنشّط الخلايا المتغصنة (dendritic cells) والخلايا التائية. يعزز المراقبة المناعية ضد الفيروسات والأورام. يحسّن استجابة اللقاحات عند كبار السن. ينظّم التوازن المناعي (يُنشّط دون فرط نشاط).', 'مستوى الدليل: قوي — معتمد كدواء (Zadaxin) في أكثر من 35 دولة لعلاج التهاب الكبد B وC وكمحفّز مناعي. تجارب سريرية واسعة. استُخدم ضد COVID-19. غير معتمد في أمريكا.', 1600, 3200, 'od', 3, NULL, 'subq', NULL, ARRAY['35364609','11381492','41373628'], '450-750 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ghk-cu', 'موضعي: كريم أو سيروم 1-2% مرتين يوميًا. حقن: 1-2 ملغ يوميًا تحت الجلد (أقل شيوعًا). كلا الطريقتين فعالتان.', 'الموضعي: صباحًا ومساءً بعد تنظيف البشرة. الحقن: مساءً.', 'الموضعي: استخدام يومي مستمر — النتائج تظهر بعد 4-6 أسابيع. الحقن: 4-8 أسابيع ثم راحة.', 'موضعي (كريم/سيروم) — الأكثر شيوعًا وأمانًا. حقن تحت الجلد (Sub-Q) — لتأثير جهازي أقوى.', 'الموضعي: تهيّج بشرة خفيف نادر. الحقن: احمرار وتورم مكان الحقن. تلوّن بشرة أخضر مؤقت مكان الحقن (بسبب النحاس).', 'حساسية النحاس أو المعادن. مرض ويلسون (تراكم النحاس). لا يُستخدم مع فيتامين C عالي التركيز موضعيًا (يؤكسد النحاس).', 'يُدمج موضعيًا مع ريتينول (في أوقات مختلفة) وواقي شمس. حقنًا مع BPC-157 لتسريع شفاء الأنسجة.', 'الموضعي: حسب تعليمات المنتج. الحقن: يُحفظ مُبرّدًا بعد إعادة التكوين ويُستخدم خلال 14 يومًا.', 'يحفّز إنتاج الكولاجين والإيلاستين والجلايكوزامينوجليكان في البشرة. يعزز تكوّن أوعية دموية جديدة في الأنسجة المتضررة. يزيد حجم بصيلات الشعر. يقلل الالتهاب. النحاس المرتبط يعمل كعامل مساعد لإنزيمات مهمة.', 'مستوى الدليل: جيد — عقود من البحث. فعالية موضعية مثبتة في تحسين البشرة وتسريع شفاء الجروح. دراسات جينية أظهرت أنه يُعيد تنظيم 31% من الجينات البشرية نحو "حالة أكثر صحة".', 200, 500, 'bid', 6, NULL, 'topical', NULL, ARRAY['29986520','35083444','39963574'], '113-300 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('copper-peptides-topical', 'سيروم 1-2% مرتين يوميًا. بعض المنتجات بتركيز أعلى (5-8%) للشعر.', 'صباحًا ومساءً بعد تنظيف البشرة. لا يُستخدم مع أحماض مباشرة (AHA/BHA) أو فيتامين C في نفس الوقت.', 'استخدام يومي مستمر. النتائج تظهر بعد 8-12 أسبوع.', 'موضعي فقط — كريم أو سيروم. يُوضع على بشرة نظيفة قبل المرطب.', 'تهيّج خفيف عند الاستخدام الأول (نادر). جفاف مؤقت عند بعض المستخدمين. لا آثار جانبية جهازية.', 'حساسية النحاس. مرض ويلسون. لا يُستخدم على جروح مفتوحة بتركيزات عالية.', 'ريتينول (مساءً) + ببتيدات النحاس (صباحًا). واقي شمس ضروري. ببتيدات الكولاجين الفموية لتأثير من الداخل والخارج.', 'حسب تعليمات المنتج. يُحفظ بعيدًا عن الضوء والحرارة.', 'نفس آلية GHK-Cu لكن بتركيبات محسّنة للنفاذية عبر البشرة. تحفّز الخلايا الليفية في الأدمة، تزيد إنتاج الكولاجين I و III، وتقلل تكسّر الكولاجين بواسطة MMPs. تعزز شفاء الجروح والحروق.', 'مستوى الدليل: جيد — دراسات سريرية أثبتت تحسين كثافة الكولاجين وسماكة الجلد ومرونته. مقارنات مع ريتينول أظهرت نتائج مماثلة مع تهيّج أقل.', NULL, NULL, 'bid', NULL, NULL, 'topical', NULL, ARRAY['40339657','38026438','15691601'], '75-188 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('larazotide', '0.5-1 ملغ ثلاث مرات يوميًا قبل الوجبات (الجرعة المستخدمة في التجارب السريرية).', 'قبل كل وجبة رئيسية بـ 15 دقيقة (3 مرات يوميًا).', '8-12 أسبوع استخدام. يُقيّم بتحليل Zonulin وأعراض الأمعاء.', 'عن طريق الفم (كبسولات). يعمل موضعيًا على بطانة الأمعاء — لا يُمتص بشكل ملحوظ إلى الدم.', 'ملف أمان ممتاز — ألم بطن خفيف وغثيان نادر. لا يُمتص جهازيًا فالآثار الجانبية الجهازية نادرة جدًا.', 'لا توجد موانع معروفة حتى الآن. الحمل والرضاعة (غير مدروس كفاية).', 'بروتوكول إصلاح الأمعاء التسلسلي: Larazotide (إغلاق الوصلات) → KPV (تقليل الالتهاب) → BPC-157 فموي (شفاء البطانة).', 'يُحفظ في درجة حرارة الغرفة.', 'يُنظّم بروتين Zonulin الذي يتحكم في فتح وإغلاق الوصلات المحكمة بين خلايا بطانة الأمعاء. يمنع الفتح المفرط لهذه الوصلات (leaky gut) مما يقلل مرور البروتينات والسموم عبر جدار الأمعاء إلى الدم.', 'مستوى الدليل: قوي — تجارب سريرية بشرية المرحلة الثالثة لمرض السيلياك (الداء البطني). أظهر تقليل أعراض النفاذية المعوية بشكل ملحوظ. قيد المراجعة للحصول على موافقة FDA.', 500, 1000, 'bid', 10, NULL, 'oral', NULL, ARRAY['33881350','32332732','34502335'], '375-675 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('kpv', '200-500 ميكروغرام يوميًا فمويًا (كبسولات). بعض البروتوكولات: كبسولتان يوميًا.', 'على معدة فارغة (لتعزيز الوصول المباشر لبطانة الأمعاء).', '4-8 أسابيع استخدام ثم تقييم الأعراض. يمكن الاستمرار حسب الحاجة.', 'عن طريق الفم (كبسولات) — الطريق الأكثر منطقية لمشاكل الأمعاء. يتوفر أيضًا كحقن تحت الجلد للالتهاب الجهازي.', 'ملف أمان جيد — آثار جانبية خفيفة ونادرة. غثيان خفيف عند بعض المستخدمين.', 'أورام الأمعاء النشطة. أمراض مناعة ذاتية حادة (استشر طبيبك).', 'بروتوكول إصلاح الأمعاء: Larazotide (المرحلة 1) → KPV (المرحلة 2) → BPC-157 فموي (المرحلة 3). يمكن استخدام KPV مع L-Glutamine.', 'يُحفظ في درجة حرارة الغرفة أو مُبرّدًا. مستقر نسبيًا.', 'يثبّط مسار NF-κB (المفتاح الرئيسي للالتهاب) في خلايا بطانة الأمعاء. يقلل إنتاج السيتوكينات الالتهابية (TNF-α, IL-6). يعبر الحاجز المعوي ويعمل مباشرة على الخلايا المناعية في جدار الأمعاء.', 'مستوى الدليل: متوسط — دراسات حيوانية وخلوية قوية أظهرت تأثيرًا مضادًا للالتهاب في الأمعاء (التهاب القولون). بعض البيانات البشرية الأولية. واعد جدًا لأمراض الأمعاء الالتهابية.', 500, 1000, 'od', 6, NULL, 'oral', NULL, ARRAY['28343991','40073467','35830641'], '225-375 ر.س/شهر', 'beginner', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ll-37', '100-200 ميكروغرام يوميًا (حقن تحت الجلد). لا يُؤخذ فمويًا.', 'صباحًا.', '2-4 أسابيع عند الحاجة (عدوى مزمنة، مشاكل أغشية حيوية).', 'حقن تحت الجلد (Sub-Q). بعض الاستخدامات الموضعية قيد البحث.', 'ألم مكان الحقن. احمرار موضعي. عند الجرعات العالية: خطر نظري لتحفيز التهاب مفرط.', 'أمراض المناعة الذاتية النشطة (يُنشّط المناعة). الصدفية (LL-37 مرتفع أصلًا ويُحفّز المرض).', 'يُدمج مع فيتامين D (5000-10000 IU) لتعزيز الإنتاج الطبيعي. يمكن إضافة Thymosin Alpha-1 لمناعة شاملة.', 'يُحفظ مجمّدًا (-20°C). بعد إعادة التكوين يُستخدم خلال 7 أيام مُبرّدًا. حساس جدًا.', 'يخترق أغشية البكتيريا ويقتلها مباشرة. يُفكك الأغشية الحيوية (biofilms) التي تحمي البكتيريا المقاومة. ينشّط الخلايا المناعية. إنتاجه في الجسم يعتمد على مستوى فيتامين D — نقص الفيتامين = نقص LL-37.', 'مستوى الدليل: متوسط — مدروس بشكل واسع كببتيد مناعي طبيعي. فعّال ضد البكتيريا والفيروسات والفطريات والأغشية الحيوية (biofilms). تجارب سريرية بشرية محدودة للاستخدام العلاجي.', 200, 400, 'od', 3, NULL, 'subq', NULL, ARRAY['38450615','20049649','40960088'], '300-563 ر.س/شهر', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('ara-290', '2-4 ملغ يوميًا (حقن تحت الجلد). الجرعة المستخدمة في التجارب السريرية.', 'صباحًا يوميًا.', '4-8 أسابيع (حسب التجارب السريرية). يُقيّم بمقاييس الألم والوظيفة العصبية.', 'حقن تحت الجلد (Sub-Q).', 'ملف أمان جيد في التجارب — صداع خفيف، غثيان نادر. لا يزيد كريات الدم الحمراء (على عكس EPO).', 'لا توجد موانع واضحة حتى الآن. الحذر عند مرضى الأورام.', 'يمكن دمجه مع BPC-157 لشفاء عصبي شامل. يمكن إضافته لبروتوكول اعتلال الأعصاب السكري مع السيطرة على السكر.', 'يُحفظ مجففًا في الثلاجة أو المجمّد. بعد إعادة التكوين يُستخدم خلال 14 يومًا مُبرّدًا.', 'يرتبط بالمستقبل غير المُكوّن للدم للإريثروبويتين (IRR — Innate Repair Receptor) وليس بمستقبل EPO التقليدي. هذا المستقبل موجود في الخلايا العصبية والمناعية. يحمي الأعصاب، يقلل الالتهاب، ويُسرّع إصلاح الأنسجة دون زيادة كريات الدم الحمراء.', 'مستوى الدليل: متوسط — تجارب بشرية في اعتلال الأعصاب السكري والساركويدوز أظهرت تحسين الألم العصبي. آلية فريدة ومبتكرة.', 2000, 4000, 'od', 6, NULL, 'subq', NULL, ARRAY['34343617','25387363','24529189'], '375-750 ر.س/شهر', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('melanotan-ii', 'لا يُنصح بالاستخدام. الجرعات المتداولة: 0.25-1 ملغ (لا تستخدمها).', 'لا يُنصح بالاستخدام.', 'لا يُنصح بالاستخدام.', 'حقن تحت الجلد (Sub-Q). بعض الأشكال كبخاخ أنف.', 'خطيرة ومتعددة: غثيان شديد، تغيّر لون الشامات وزيادة حجمها (خطر تحوّل سرطاني)، انتصاب مؤلم ومطوّل (priapism)، ارتفاع ضغط الدم، تشنجات بطن، تلوّن دائم غير منتظم للبشرة.', 'ممنوع تمامًا في حالات: تاريخ ميلانوما أو سرطان جلد، شامات متعددة أو غير نمطية، أمراض قلبية. لا يُنصح بالاستخدام إطلاقًا.', 'لا يُنصح بأي استخدام أو دمج.', 'لا يُنصح بالشراء أو الاستخدام.', 'يُفعّل مستقبلات MC1R في الخلايا الصبغية (melanocytes) فيزيد إنتاج الميلانين ويُسمّر البشرة بدون شمس. لكنه يُفعّل أيضًا MC3R/MC4R/MC5R مما يُسبب تأثيرات جانبية واسعة: تغيير الشهية، تأثيرات جنسية، وأخطرها تحفيز نمو الشامات والوحمات.', 'مستوى الدليل: متوسط — مدروس بشريًا لكن لم يُعتمد من أي جهة تنظيمية بسبب ملف الأمان. يُسبب اسمرار البشرة وانتصابًا غير مرغوب. مخاطره تفوق فوائده.', 250, 1000, 'od', NULL, NULL, 'subq', NULL, ARRAY['38285527','31953620','8637402'], '113-188 ر.س/شهر', 'advanced', 'تحذير شديد: Melanotan II مرتبط بتحفيز نمو الشامات وتحوّلها السرطاني. تم تسجيل حالات ميلانوما عند مستخدمين. غير معتمد من أي جهة تنظيمية في العالم. لا تستخدمه. إذا كنت تريد حماية من الشمس، استخدم واقي شمس.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('mk-677', '10-25 ملغ يوميًا فمويًا. يُبدأ بـ 10 ملغ لتقييم التحمّل، ثم يُرفع إلى 25 ملغ. الجرعة المثالية: 25 ملغ.', 'قبل النوم (يُعزز ذروة GH الليلية الطبيعية ويقلل تأثير الشهية المزعج أثناء الاستيقاظ).', '8-12 أسبوع استخدام ثم 4-8 أسابيع راحة. بعض البروتوكولات تستخدمه باستمرار مع مراقبة سكر الدم و IGF-1.', 'فموي (كبسولات أو سائل). لا يحتاج حقن — ميزة كبرى مقارنة بببتيدات GH الأخرى.', 'زيادة ملحوظة في الشهية (تأثير الجريلين)، احتباس ماء خفيف، تنميل في اليدين صباحًا، ارتفاع سكر الدم الصيامي (5-10%). طويل الأمد: مقاومة أنسولين محتملة عند الاستخدام المستمر.', 'مرض السكري النوع 2 غير المسيطر عليه، أورام نشطة (GH يُحفّز النمو)، قصور قلبي. يُستخدم بحذر مع أدوية السكري.', 'يُدمج بشكل ممتاز مع CJC-1295 (no DAC) + Ipamorelin لتحفيز GH على مدار الساعة. يمكن إضافة Cardarine أو MOTS-c لمقاومة تأثيره على السكر.', 'يُحفظ في درجة حرارة الغرفة بعيدًا عن الرطوبة والضوء. لا يحتاج تبريد.', 'يرتبط بمستقبل الجريلين (GHS-R1a) في الغدة النخامية فيُحفّز إفراز هرمون النمو (GH) ويرفع IGF-1 بشكل مستدام على مدار 24 ساعة. يُحسّن النوم العميق (المرحلة 3 و4) وزمن نوم REM. لا يثبّط المحور الهرموني — يعمل عبر مسار الجريلين.', 'مستوى الدليل: جيد — عشرات الدراسات البشرية تُثبت رفع GH وIGF-1 بنسبة 40-60%. دراسات على كبار السن أظهرت تحسين الكتلة العضلية وجودة النوم. لم يُعتمد من FDA — وُضع في "القائمة 2" عام 2023.', NULL, NULL, 'od', 10, 6, 'oral', NULL, ARRAY['9349662','18981447','10404017'], '150-375 ر.س/شهر', 'intermediate', 'MK-677 يرفع سكر الدم الصيامي بشكل ملحوظ عند بعض المستخدمين. إذا كنت مصابًا بالسكري أو ما قبل السكري، لا تستخدمه دون إشراف طبي ومراقبة منتظمة لسكر الدم وHbA1c.')
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('humanin', 'غير محددة بشكل نهائي. البروتوكولات البحثية: 1-5 ملغ يوميًا (حقن). النسخة المعدّلة HNG أقوى بـ 1000 ضعف وتُستخدم بجرعات أقل.', 'صباحًا على معدة فارغة.', '4-8 أسابيع استخدام ثم 4 أسابيع راحة. قيد البحث — لا يوجد بروتوكول قياسي.', 'حقن تحت الجلد (Sub-Q). النسخة الفموية قيد التطوير.', 'لم تُسجّل آثار جانبية خطيرة في الدراسات المتاحة. نظريًا: قد يؤثر على مسارات النمو الخلوي. يحتاج مزيدًا من الدراسات البشرية.', 'أورام نشطة (نظريًا — كببتيد مضاد لموت الخلايا قد يحمي الخلايا السرطانية أيضًا). الحمل والرضاعة.', 'يُدمج بشكل طبيعي مع MOTS-c (كلاهما ببتيدات ميتوكوندرية بآليات مكمّلة). يمكن إضافة SS-31 لبروتوكول ميتوكوندري شامل، أو Epithalon لبروتوكول شيخوخة متكامل.', 'يُحفظ مجمّدًا (-20°C). بعد إعادة التكوين يُستخدم خلال 7-10 أيام مُبرّدًا.', 'يرتبط بمستقبل FPRL-1 ومستقبل IGFBP-3 فيُنشّط مسارات حماية الخلايا ضد الإجهاد التأكسدي. يمنع موت الخلايا المبرمج (apoptosis) عبر تثبيط بروتين Bax. يُحسّن حساسية الأنسولين عبر تفعيل مسار STAT3. يُقلل الالتهاب المزمن المرتبط بالشيخوخة.', 'مستوى الدليل: متوسط — اكتُشف عام 2001 في اليابان أثناء دراسة الزهايمر. دراسات حيوانية وخلوية قوية جدًا تُثبت الحماية العصبية وتحسين الأيض. تجارب بشرية محدودة لكن مستويات Humanin الطبيعية تنخفض مع العمر وترتبط بالأمراض.', 1000, 5000, 'od', 6, 4, 'subq', NULL, ARRAY['11578310','28928068','30547850'], '563-1,125 ر.س/شهر', 'advanced', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('vip', 'بخاخ أنف: 50 ميكروغرام لكل بخّة، 1-4 بخّات يوميًا. يُبدأ بجرعة منخفضة (50 ميكروغرام) ويُرفع تدريجيًا.', 'صباحًا ومساءً. بعض البروتوكولات تضيف جرعة وسط اليوم.', '30-90 يومًا في بروتوكول CIRS. يمكن استخدامه باستمرار تحت إشراف طبي. يُوقف تدريجيًا.', 'بخاخ أنف (الأكثر شيوعًا في بروتوكول CIRS). حقن تحت الجلد متاح أيضًا.', 'خفيفة عمومًا: إسهال مائي (الأكثر شيوعًا)، سيلان أنف، انخفاض ضغط الدم (خاصة عند الجرعات العالية). نادرًا: دوخة، تسارع قلب.', 'انخفاض ضغط الدم المزمن. استخدام أدوية خافضة للضغط (يُستخدم بحذر). VIPoma (ورم مُفرز لـ VIP — نادر جدًا).', 'في بروتوكول CIRS: يُستخدم كآخر خطوة بعد Cholestyramine وتصحيح البيئة. يمكن دمجه مع BPC-157 وKPV لدعم شامل للأمعاء. يتآزر مع Thymosin Alpha-1 لتنظيم المناعة.', 'يُحفظ في الثلاجة (2-8°C). بخاخ الأنف يُستخدم خلال 30 يومًا من الفتح.', 'يرتبط بمستقبلات VPAC1 وVPAC2 فيُنشّط مسارات مضادة للالتهاب عبر رفع cAMP. يُنظّم الخلايا التائية التنظيمية (Tregs) ويخفض السيتوكينات الالتهابية (TNF-α, IL-6). يُوسّع الأوعية ويخفض ضغط الدم. يدعم حاجز الأمعاء ويحمي الخلايا العصبية.', 'مستوى الدليل: جيد — عقود من البحث الأساسي (آلاف الدراسات). اكتسب شهرة واسعة في بروتوكول Shoemaker لعلاج CIRS. تجارب سريرية محدودة لكن تاريخ استخدام طويل في الأبحاث. VIP الأنفي مُستخدم سريريًا في عيادات CIRS المتخصصة.', 50, 200, 'bid', 12, NULL, 'nasal', NULL, ARRAY['26667723','22484321','30088471'], '375-750 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

INSERT INTO peptide_protocols (id, dosage_ar, timing_ar, cycle_ar, administration_ar, side_effects_ar, contraindications_ar, stack_ar, storage_ar, mechanism_ar, evidence_ar, dose_mcg, dose_max_mcg, frequency, cycle_duration_weeks, rest_period_weeks, route, weekly_schedule, pubmed_ids, cost_estimate, difficulty, warning_ar)
VALUES ('oxytocin', 'بخاخ أنف: 20-40 وحدة دولية (IU) لكل جلسة. البروتوكولات النفسية: 24 IU (الجرعة الأكثر دراسة). لا يُستخدم عبر الفم (يتكسّر في المعدة).', '30-45 دقيقة قبل الموقف الاجتماعي المطلوب. أو صباحًا للاستخدام المنتظم.', 'يُستخدم حسب الحاجة أو بشكل منتظم لمدة 4-6 أسابيع ثم يُقيّم. لا يُسبب تحمّلًا واضحًا.', 'بخاخ أنف (الطريقة الأكثر فعالية للوصول للدماغ). حقن وريدي في الولادة فقط.', 'خفيفة عمومًا: صداع خفيف، احتقان أنف. نادرًا: تقلصات رحمية (ممنوع في الحمل خارج إشراف طبي). قد يُعزز الثقة المفرطة في مواقف غير آمنة.', 'الحمل (يُسبب تقلصات رحمية خارج الإشراف الطبي). أمراض القلب والأوعية الشديدة. لا يُستخدم مع أدوية أخرى تؤثر على الولادة.', 'يمكن دمجه مع Selank (مضاد قلق ببتيدي) لتأثير مهدّئ اجتماعي شامل. يتآزر مع DSIP لتحسين النوم وتقليل التوتر.', 'يُحفظ في الثلاجة (2-8°C). بخاخ الأنف يُستخدم خلال 30 يومًا من الفتح. حساس للحرارة.', 'يرتبط بمستقبلات الأوكسيتوسين (OXTR) في الدماغ فيُخفّض نشاط اللوزة الدماغية (amygdala) ويُقلل استجابة الخوف والقلق. يُعزز التعرّف على الوجوه والتعاطف العاطفي. يرفع الدوبامين في مسارات المكافأة الاجتماعية. يخفض الكورتيزول ويُقلل الالتهاب.', 'مستوى الدليل: جيد — معتمد من FDA للولادة (Pitocin) منذ عقود. مئات الدراسات البشرية على التأثيرات العصبية والاجتماعية. نتائج مختلطة في التوحد والقلق — واعد لكن ليس حاسمًا.', 20, 40, 'prn', NULL, NULL, 'nasal', NULL, ARRAY['15834840','20079369','25189358'], '188-375 ر.س/شهر', 'intermediate', NULL)
ON CONFLICT (id) DO UPDATE SET
  dosage_ar = EXCLUDED.dosage_ar, timing_ar = EXCLUDED.timing_ar, cycle_ar = EXCLUDED.cycle_ar,
  administration_ar = EXCLUDED.administration_ar, side_effects_ar = EXCLUDED.side_effects_ar,
  contraindications_ar = EXCLUDED.contraindications_ar, stack_ar = EXCLUDED.stack_ar,
  storage_ar = EXCLUDED.storage_ar, mechanism_ar = EXCLUDED.mechanism_ar, evidence_ar = EXCLUDED.evidence_ar,
  dose_mcg = EXCLUDED.dose_mcg, dose_max_mcg = EXCLUDED.dose_max_mcg, frequency = EXCLUDED.frequency,
  cycle_duration_weeks = EXCLUDED.cycle_duration_weeks, rest_period_weeks = EXCLUDED.rest_period_weeks,
  route = EXCLUDED.route, weekly_schedule = EXCLUDED.weekly_schedule, pubmed_ids = EXCLUDED.pubmed_ids,
  cost_estimate = EXCLUDED.cost_estimate, difficulty = EXCLUDED.difficulty, warning_ar = EXCLUDED.warning_ar,
  updated_at = now();

