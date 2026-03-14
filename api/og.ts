/**
 * Vercel Serverless Function: /api/og
 * Returns minimal HTML with proper OG meta tags for social sharing bots.
 * Called by middleware.ts when a bot user-agent is detected.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE_URL = 'https://pptides.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const SITE_NAME = 'pptides';
const DEFAULT_TITLE = 'pptides | أشمل دليل عربي للببتيدات العلاجية';
const DEFAULT_DESC = '41+ ببتيد مع بروتوكولات كاملة، حاسبة جرعات، دليل تحاليل، مدرب ذكي. 3 أيام مجانًا.';

// ── Supabase config for blog post lookups ──
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// ── Peptide data (id → { nameAr, nameEn, summaryAr }) ──
// Embedded at build time to avoid importing the full peptides.ts
const PEPTIDE_META: Record<string, { nameAr: string; nameEn: string; summaryAr: string }> = {
  'semaglutide': { nameAr: 'سيماغلوتايد', nameEn: 'Semaglutide', summaryAr: 'أشهر ببتيد معتمد لإنقاص الوزن — يحقق فقدان 15-20% من وزن الجسم عبر تقليل الشهية وتحسين حساسية الأنسولين.' },
  'tirzepatide': { nameAr: 'تيرزيباتايد', nameEn: 'Tirzepatide', summaryAr: 'أحدث وأقوى ببتيد لإنقاص الوزن — الناهض المزدوج الأول (GLP-1 + GIP) يحقق فقدان وزن يصل إلى 22.5%.' },
  'retatrutide': { nameAr: 'ريتاتروتايد', nameEn: 'Retatrutide', summaryAr: 'أول ناهض ثلاثي المستقبلات يستهدف GLP-1 وGIP والجلوكاجون معًا، محققًا فقدان وزن يصل إلى 24%.' },
  'orforglipron': { nameAr: 'أورفورغليبرون', nameEn: 'Orforglipron', summaryAr: 'أول GLP-1 فموي غير ببتيدي — حبة يومية بدلاً من حقن أسبوعية. سيغيّر قواعد اللعبة في علاج السمنة.' },
  'tesamorelin': { nameAr: 'تيساموريلين', nameEn: 'Tesamorelin', summaryAr: 'ببتيد GHRH معتمد من FDA يستهدف الدهون الحشوية تحديدًا ويحفّز هرمون النمو بنمط فسيولوجي طبيعي.' },
  'aod-9604': { nameAr: 'AOD-9604', nameEn: 'AOD-9604', summaryAr: 'جزء معزول من هرمون النمو يستهدف حرق الدهون فقط دون رفع سكر الدم أو IGF-1.' },
  '5-amino-1mq': { nameAr: '5-أمينو-1MQ', nameEn: '5-Amino-1MQ', summaryAr: 'جزيء فموي يثبّط إنزيم NNMT لزيادة حرق الدهون ورفع NAD+.' },
  'bpc-157': { nameAr: 'BPC-157', nameEn: 'BPC-157', summaryAr: 'أشهر ببتيد تعافي في العالم — مشتق من العصارة المعدية البشرية، يُسرّع شفاء الأوتار والأربطة والأمعاء.' },
  'tb-500': { nameAr: 'TB-500 (ثايموسين بيتا-4)', nameEn: 'TB-500', summaryAr: 'ببتيد تعافي جهازي قوي من الغدة الزعترية — يُسرّع شفاء العضلات والأنسجة الرخوة ويقلل الالتهاب.' },
  'cjc-1295': { nameAr: 'CJC-1295', nameEn: 'CJC-1295', summaryAr: 'نظير GHRH يرفع هرمون النمو بشكل مستدام — يُدمج عادة مع Ipamorelin لتحفيز أمثل.' },
  'ipamorelin': { nameAr: 'إيباموريلين', nameEn: 'Ipamorelin', summaryAr: 'أنظف ببتيد لتحفيز هرمون النمو — الخيار الأول للمبتدئين.' },
  'sermorelin': { nameAr: 'سيرموريلين', nameEn: 'Sermorelin', summaryAr: 'أول ببتيد GHRH معتمد من FDA — آمن ومدروس لتحفيز هرمون النمو الطبيعي.' },
  'ghrp-2': { nameAr: 'GHRP-2', nameEn: 'GHRP-2', summaryAr: 'أقوى محفز لهرمون النمو من عائلة GHRP — يرفع GH بقوة لكن يزيد الشهية والكورتيزول.' },
  'ghrp-6': { nameAr: 'GHRP-6', nameEn: 'GHRP-6', summaryAr: 'محفز قوي لهرمون النمو والشهية — مفيد لمن يعاني من نقص الوزن أو ضعف الشهية.' },
  'hexarelin': { nameAr: 'هيكساريلين', nameEn: 'Hexarelin', summaryAr: 'أقوى ببتيد GHRP لتحفيز هرمون النمو — لكنه يفقد فعاليته بسرعة مع الاستخدام المتكرر.' },
  'igf-1-lr3': { nameAr: 'IGF-1 LR3', nameEn: 'IGF-1 LR3', summaryAr: 'نسخة معدّلة طويلة المفعول من عامل النمو الشبيه بالأنسولين — قوي لبناء العضلات لكنه يحمل مخاطر جدية.' },
  'follistatin-344': { nameAr: 'فوليستاتين-344', nameEn: 'Follistatin-344', summaryAr: 'بروتين يثبّط الميوستاتين لتعزيز نمو العضلات — واعد نظريًا لكن بيانات بشرية محدودة.' },
  'kisspeptin-10': { nameAr: 'كيسبيبتين-10', nameEn: 'Kisspeptin-10', summaryAr: 'ببتيد طبيعي يحفّز المحور التناسلي لرفع التستوستيرون والهرمون اللوتيني بطريقة فسيولوجية.' },
  'pt-141': { nameAr: 'PT-141 (بريميلانوتايد)', nameEn: 'PT-141', summaryAr: 'ببتيد معتمد من FDA لعلاج ضعف الرغبة الجنسية — يعمل مركزيًا عبر مستقبلات الميلانوكورتين في الدماغ.' },
  'testicular-bioregulators': { nameAr: 'المنظّمات الحيوية الخصوية', nameEn: 'Testicular Bioregulators', summaryAr: 'ببتيدات روسية قصيرة (خاصة Testalamin) تستهدف أنسجة الخصية لدعم إنتاج التستوستيرون الطبيعي.' },
  'gnrh-triptorelin': { nameAr: 'تريبتوريلين (GnRH)', nameEn: 'GnRH / Triptorelin', summaryAr: 'ناهض GnRH يُعيد تشغيل محور HPG — يُستخدم بجرعة واحدة لاستعادة إنتاج التستوستيرون بعد دورات الستيرويد.' },
  'semax': { nameAr: 'سيماكس', nameEn: 'Semax', summaryAr: 'ببتيد عصبي روسي معتمد يرفع BDNF ويحسّن التركيز والذاكرة — من أكثر الببتيدات الدماغية أمانًا ودراسة.' },
  'na-semax-amidate': { nameAr: 'NA-Semax-Amidate', nameEn: 'NA-Semax-Amidate', summaryAr: 'نسخة معدّلة أقوى من Semax — نفاذية أعلى وتأثير أطول على BDNF والتركيز الذهني.' },
  'selank': { nameAr: 'سيلانك', nameEn: 'Selank', summaryAr: 'ببتيد مضاد للقلق معتمد في روسيا — يعمل عبر نظام GABA والسيروتونين بدون تخدير أو إدمان.' },
  'dihexa': { nameAr: 'دايهكسا', nameEn: 'Dihexa', summaryAr: 'أقوى معزز معروف لعامل نمو الكبد (HGF) — واعد للذاكرة والتنكّس العصبي لكنه تجريبي بالكامل.' },
  'cerebrolysin': { nameAr: 'سيريبروليسين', nameEn: 'Cerebrolysin', summaryAr: 'مزيج ببتيدي عصبي مشتق من دماغ الخنزير — معتمد في أوروبا لعلاج السكتة والخرف مع أدلة سريرية قوية.' },
  'p21': { nameAr: 'P21', nameEn: 'P21', summaryAr: 'ببتيد تجريبي مشتق من CNTF يعزز تكوّن الخلايا العصبية في الحُصين — واعد للذاكرة لكنه يحتاج مزيدًا من الدراسات.' },
  'epithalon': { nameAr: 'إيبيثالون', nameEn: 'Epithalon', summaryAr: 'ببتيد روسي يُنشّط التيلوميراز لإطالة التيلوميرات — أبرز ببتيد لإطالة العمر مع 35+ سنة من الأبحاث.' },
  'dsip': { nameAr: 'DSIP (ببتيد النوم العميق)', nameEn: 'DSIP', summaryAr: 'ببتيد يعزز النوم العميق ويُنظّم الإيقاع اليومي — مفيد لمن يعاني من اضطرابات النوم أو تأخر إيقاع الساعة البيولوجية.' },
  'ss-31': { nameAr: 'SS-31 (إلاميبريتايد)', nameEn: 'SS-31', summaryAr: 'ببتيد يستهدف الغشاء الداخلي للميتوكوندريا مباشرة — يحسّن إنتاج الطاقة ويحمي من أضرار الشيخوخة الخلوية.' },
  'mots-c': { nameAr: 'MOTS-c', nameEn: 'MOTS-c', summaryAr: 'ببتيد ميتوكوندري يُحاكي فوائد التمرين الرياضي — ينشّط AMPK ويحسّن حساسية الأنسولين واستقلاب الطاقة.' },
  'foxo4-dri': { nameAr: 'FOXO4-DRI', nameEn: 'FOXO4-DRI', summaryAr: 'ببتيد تجريبي يستهدف الخلايا الشائخة (Senolytic) — يدفعها للموت المبرمج مع الحفاظ على الخلايا السليمة.' },
  'thymalin': { nameAr: 'ثيمالين', nameEn: 'Thymalin', summaryAr: 'ببتيد روسي من الغدة الزعترية يُعيد تنظيم المناعة — أظهر في دراسة 6 سنوات انخفاض معدل الوفيات بـ 50%.' },
  'thymosin-alpha-1': { nameAr: 'ثايموسين ألفا-1', nameEn: 'Thymosin Alpha-1', summaryAr: 'ببتيد مناعي معتمد في 35+ دولة — يُنشّط الخلايا التائية والمتغصّنة لتعزيز المناعة ومكافحة العدوى المزمنة.' },
  'collagen-peptides': { nameAr: 'ببتيدات الكولاجين', nameEn: 'Collagen Peptides', summaryAr: 'أكثر ببتيد استخدامًا عالميًا — يُحسّن مرونة الجلد وصحة المفاصل بأدلة سريرية قوية وأمان عالٍ.' },
  'ghk-cu': { nameAr: 'GHK-Cu', nameEn: 'GHK-Cu', summaryAr: 'ببتيد نحاسي طبيعي يتناقص مع العمر — يُجدد الكولاجين ويُسرّع التئام الجروح ويُعيد برمجة التعبير الجيني.' },
  'copper-peptides-topical': { nameAr: 'ببتيدات النحاس الموضعية', nameEn: 'Copper Peptides (Topical)', summaryAr: 'تطبيق موضعي لـ GHK-Cu — يُحسّن ملمس الجلد ويقلل التجاعيد مع دعم التئام الجروح.' },
  'larazotide': { nameAr: 'لارازوتايد', nameEn: 'Larazotide', summaryAr: 'ببتيد يُعيد إحكام حاجز الأمعاء (Tight Junctions) — في المرحلة الثالثة لعلاج حساسية القمح.' },
  'kpv': { nameAr: 'KPV', nameEn: 'KPV', summaryAr: 'ثلاثي ببتيد مضاد للالتهاب مشتق من هرمون MSH — يُهدّئ التهابات الأمعاء والجلد بدون تأثيرات جهازية.' },
  'll-37': { nameAr: 'LL-37', nameEn: 'LL-37', summaryAr: 'ببتيد مضاد للميكروبات من جهاز المناعة الفطري — يقتل البكتيريا والفيروسات ويُنظّم الاستجابة المناعية.' },
  'ara-290': { nameAr: 'ARA-290', nameEn: 'ARA-290', summaryAr: 'ببتيد يستهدف مستقبل EPO غير المكوّن للدم — يحمي الأعصاب ويقلل الالتهاب المزمن والألم العصبي.' },
  'melanotan-ii': { nameAr: 'ميلانوتان II', nameEn: 'Melanotan II', summaryAr: 'ببتيد تسمير يحفّز الميلانين ويؤثر على الرغبة الجنسية — شائع لكنه يحمل مخاطر جدية تستوجب الحذر.' },
};

// ── Static route meta ──
const STATIC_META: Record<string, { title: string; description: string }> = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESC },
  '/pricing': { title: 'الاشتراكات والأسعار | pptides', description: 'اختر خطتك — أساسي بـ 34 ر.س/شهر أو متقدم بـ 371 ر.س/شهر. 3 أيام تجربة مجانية لكل الخطط.' },
  '/about': { title: 'عن pptides | أشمل دليل عربي للببتيدات', description: 'تعرّف على قصة pptides — أول منصة عربية متخصصة في البيبتايدات العلاجية بمحتوى طبي مبني على الأدلة.' },
  '/transparency': { title: 'الشفافية | pptides', description: 'نؤمن بالشفافية الكاملة — تعرّف على منهجيتنا العلمية ومصادرنا وطريقة تصنيف مستويات الأدلة.' },
  '/faq': { title: 'الأسئلة الشائعة | pptides', description: 'إجابات شاملة على أهم الأسئلة حول الببتيدات العلاجية والاشتراك والاستخدام.' },
  '/contact': { title: 'تواصل معنا | pptides', description: 'تواصل مع فريق pptides — نسعد بالرد على استفساراتك حول الببتيدات والمنصة.' },
  '/blog': { title: 'المدونة | pptides', description: 'مقالات طبية متخصصة حول الببتيدات العلاجية — أحدث الأبحاث والبروتوكولات والنصائح العملية.' },
  '/glossary': { title: 'قاموس المصطلحات | pptides', description: 'قاموس شامل لمصطلحات الببتيدات والمفاهيم العلمية المستخدمة في المنصة.' },
  '/sources': { title: 'المصادر العلمية | pptides', description: '110+ مرجع علمي من PubMed — كل معلومة في pptides مدعومة بدراسات سريرية موثّقة.' },
  '/guide': { title: 'دليل البدء | pptides', description: 'دليل شامل للمبتدئين — كيف تبدأ مع الببتيدات العلاجية خطوة بخطوة.' },
  '/lab-guide': { title: 'دليل التحاليل المخبرية | pptides', description: 'تحاليل أساسية قبل وأثناء وبعد استخدام الببتيدات — مع القيم المرجعية والتفسير.' },
  '/quiz': { title: 'اختبار الببتيد المناسب | pptides', description: 'أجب على أسئلة بسيطة واكتشف الببتيد الأنسب لأهدافك الصحية.' },
  '/library': { title: 'مكتبة الببتيدات | pptides', description: '41+ ببتيد مع بروتوكولات مفصّلة — ابحث، قارن، واختر الببتيد المناسب لك.' },
  '/table': { title: 'جدول المقارنة | pptides', description: 'قارن جميع الببتيدات في جدول واحد — الجرعات، مستوى الأدلة، الفئة، والتكلفة التقديرية.' },
  '/stacks': { title: 'البروتوكولات المُجمَّعة | pptides', description: 'بروتوكولات جاهزة تجمع ببتيدات متكاملة لأهداف محددة — تعافي، أيض، هرمونات، وأكثر.' },
  '/interactions': { title: 'فحص التعارضات | pptides', description: 'تحقق من تعارضات الببتيدات قبل الاستخدام — أداة تفاعلية لفحص التوافق والمخاطر.' },
  '/compare': { title: 'مقارنة الببتيدات | pptides', description: 'قارن ببتيدين أو أكثر جنبًا إلى جنب — الجرعات، الأدلة، الآثار الجانبية، والتكلفة.' },
  '/calculator': { title: 'حاسبة الجرعات | pptides', description: 'حاسبة دقيقة لجرعات الببتيدات — أدخل الببتيد والوزن واحصل على الجرعة بالمايكروغرام والسيرنج.' },
  '/privacy': { title: 'سياسة الخصوصية | pptides', description: 'سياسة خصوصية pptides — كيف نحمي بياناتك ونستخدمها.' },
  '/terms': { title: 'شروط الاستخدام | pptides', description: 'شروط وأحكام استخدام منصة pptides.' },
  '/community': { title: 'المجتمع | pptides', description: 'انضم لمجتمع pptides — شارك تجربتك واستفد من تجارب الآخرين.' },
  '/reviews': { title: 'التقييمات | pptides', description: 'آراء وتقييمات مستخدمي pptides — تجارب حقيقية من مستخدمين عرب.' },
};

// ── Blog post fetcher (Supabase REST) ──
async function fetchBlogMeta(slug: string): Promise<{ title: string; description: string; image: string; publishedAt?: string; rawTitle?: string; rawExcerpt?: string } | null> {
  if (!SUPABASE_ANON_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=title_ar,excerpt_ar,cover_image_url,published_at&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length === 0) return null;
    const post = rows[0];
    return {
      title: `${post.title_ar} | مدونة pptides`,
      description: post.excerpt_ar || DEFAULT_DESC,
      image: post.cover_image_url || DEFAULT_OG_IMAGE,
      publishedAt: post.published_at || undefined,
      rawTitle: post.title_ar || undefined,
      rawExcerpt: post.excerpt_ar || undefined,
    };
  } catch {
    return null;
  }
}

// ── Extended meta type with JSON-LD support ──
interface PageMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  jsonLd: object[];
}

// ── Resolve meta for any path ──
async function resolveMeta(path: string): Promise<PageMeta> {
  const cleanPath = path.replace(/\/$/, '') || '/';

  // Homepage
  if (cleanPath === '/') {
    return {
      ...STATIC_META['/'],
      image: DEFAULT_OG_IMAGE,
      url: `${SITE_URL}/`,
      jsonLd: [...getHomepageJsonLd()],
    };
  }

  // Blog post: /blog/:slug
  const blogMatch = cleanPath.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const blogMeta = await fetchBlogMeta(slug);
    const pageUrl = `${SITE_URL}${cleanPath}`;
    if (blogMeta) {
      return {
        title: blogMeta.title,
        description: blogMeta.description,
        image: blogMeta.image,
        url: pageUrl,
        jsonLd: [
          getBlogArticleJsonLd(blogMeta, pageUrl),
          getBreadcrumbJsonLd(blogMeta.rawTitle || 'مقال', pageUrl),
        ],
      };
    }
    return {
      title: 'المدونة | pptides',
      description: DEFAULT_DESC,
      image: DEFAULT_OG_IMAGE,
      url: pageUrl,
      jsonLd: [getBreadcrumbJsonLd('المدونة', pageUrl)],
    };
  }

  // Peptide: /peptide/:slug
  const peptideMatch = cleanPath.match(/^\/peptide\/([a-z0-9-]+)$/);
  if (peptideMatch) {
    const id = peptideMatch[1];
    const pep = PEPTIDE_META[id];
    if (pep) {
      const displayName = pep.nameAr === pep.nameEn ? pep.nameAr : `${pep.nameAr} | ${pep.nameEn}`;
      const pageUrl = `${SITE_URL}${cleanPath}`;
      return {
        title: `${displayName} | pptides`,
        description: `بروتوكول ${pep.nameAr} — ${pep.summaryAr}`,
        image: DEFAULT_OG_IMAGE,
        url: pageUrl,
        jsonLd: [
          getPeptideJsonLd(pep, pageUrl),
          getBreadcrumbJsonLd(pep.nameAr, pageUrl),
        ],
      };
    }
  }

  // Static routes
  if (STATIC_META[cleanPath]) {
    const pageUrl = `${SITE_URL}${cleanPath}`;
    const jsonLd: object[] = [getBreadcrumbJsonLd(PAGE_NAMES[cleanPath] || STATIC_META[cleanPath].title, pageUrl)];

    // Add page-specific schemas
    if (cleanPath === '/faq') {
      jsonLd.unshift(getFaqJsonLd());
    } else if (cleanPath === '/pricing') {
      jsonLd.unshift(getPricingJsonLd());
    }

    return {
      ...STATIC_META[cleanPath],
      image: DEFAULT_OG_IMAGE,
      url: pageUrl,
      jsonLd,
    };
  }

  // Default fallback
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    image: DEFAULT_OG_IMAGE,
    url: `${SITE_URL}${cleanPath}`,
    jsonLd: [getBreadcrumbJsonLd('', `${SITE_URL}${cleanPath}`)],
  };
}

// ── JSON-LD structured data generators ──

// Homepage schemas (copied from index.html)
function getHomepageJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "pptides",
      "alternateName": "دليل البيبتايدات",
      "url": "https://pptides.com/",
      "description": "أشمل دليل عربي للببتيدات العلاجية — 41+ ببتيد مع بروتوكولات كاملة",
      "inLanguage": "ar",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://pptides.com/library?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "pptides — دليل البيبتايدات العلاجية",
      "description": "وصول كامل لأكثر من 41 ببتيد مع بروتوكولات مفصّلة، حاسبة جرعات، دليل تحاليل مخبرية، مدرب ذكي بالذكاء الاصطناعي",
      "brand": { "@type": "Brand", "name": "pptides" },
      "offers": [
        {
          "@type": "Offer",
          "name": "Essentials",
          "price": "34",
          "priceCurrency": "SAR",
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2027-12-31",
          "url": "https://pptides.com/pricing"
        },
        {
          "@type": "Offer",
          "name": "Elite",
          "price": "371",
          "priceCurrency": "SAR",
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2027-12-31",
          "url": "https://pptides.com/pricing"
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "pptides",
      "url": "https://pptides.com",
      "logo": "https://pptides.com/icon-512.png",
      "description": "أشمل دليل عربي للببتيدات العلاجية",
      "sameAs": ["https://x.com/pptides"]
    }
  ];
}

// Blog Article schema
function getBlogArticleJsonLd(blogMeta: { rawTitle?: string; rawExcerpt?: string; image: string; publishedAt?: string }, url: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": blogMeta.rawTitle || '',
    "description": blogMeta.rawExcerpt || '',
    "image": blogMeta.image,
    "author": { "@type": "Organization", "name": "pptides" },
    "publisher": { "@type": "Organization", "name": "pptides", "url": "https://pptides.com", "logo": { "@type": "ImageObject", "url": "https://pptides.com/icon-512.png" } },
    "datePublished": blogMeta.publishedAt || new Date().toISOString(),
    "mainEntityOfPage": url
  };
}

// Peptide MedicalWebPage schema
function getPeptideJsonLd(pep: { nameAr: string; nameEn: string; summaryAr: string }, url: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": pep.nameAr,
    "description": pep.summaryAr,
    "url": url,
    "about": { "@type": "Drug", "name": pep.nameEn }
  };
}

// FAQ schema (top 10 questions hardcoded)
function getFaqJsonLd(): object {
  const faqs = [
    { q: 'ما هو pptides؟', a: 'pptides هي أول منصة عربية متخصصة في تعليم الببتيدات العلاجية. نقدّم مكتبة شاملة تضم 41+ ببتيد مع بروتوكولات استخدام مفصّلة، حاسبة جرعات دقيقة، ودليل تحاليل مخبرية — كل ذلك باللغة العربية ومبني على أبحاث علمية موثّقة.' },
    { q: 'هل المحتوى موثوق علمياً؟', a: 'نعم. جميع المعلومات في pptides مستندة إلى أبحاث علمية منشورة في مجلات محكّمة (PubMed). كل ببتيد مرفق بمصادره العلمية التي يمكنك مراجعتها.' },
    { q: 'هل هذا استشارة طبية؟', a: 'لا. محتوى pptides تعليمي بالكامل ولا يُعدّ بديلًا عن الاستشارة الطبية المتخصصة. يجب دائمًا استشارة طبيبك قبل استخدام أي ببتيد.' },
    { q: 'هل تبيعون ببتيدات؟', a: 'لا. pptides منصة تعليمية ومعلوماتية فقط. لا نبيع أي ببتيدات أو مكمّلات أو أدوية.' },
    { q: 'كم تكلفة الاشتراك؟', a: 'لدينا خطتان: الأساسية بسعر 34 ر.س شهرياً، والمتقدمة بسعر 371 ر.س شهرياً. كما نوفّر خصم كبير على الاشتراك السنوي.' },
    { q: 'هل يوجد تجربة مجانية؟', a: 'نعم! نقدّم تجربة مجانية لمدة 3 أيام تمنحك وصولاً كاملاً لجميع ميزات الخطة التي تختارها.' },
    { q: 'هل أحتاج بطاقة ائتمان للتجربة المجانية؟', a: 'نعم، نطلب بيانات بطاقتك عند بدء التجربة المجانية لضمان تجربة سلسة. لكن لن يتم خصم أي مبلغ خلال فترة التجربة.' },
    { q: 'ما هي الببتيدات العلاجية؟', a: 'الببتيدات هي سلاسل قصيرة من الأحماض الأمينية تعمل كإشارات بيولوجية في الجسم. الببتيدات العلاجية تُستخدم لأهداف صحية محددة مثل التعافي وتحسين الأداء.' },
    { q: 'هل الببتيدات آمنة؟', a: 'تختلف درجة الأمان حسب الببتيد. بعضها معتمد من FDA وله سجل أمان ممتاز، وبعضها تجريبي. كل ببتيد في pptides مصنّف بمستوى الأدلة العلمية.' },
    { q: 'كيف أختار الببتيد المناسب لي؟', a: 'يمكنك استخدام اختبار الببتيد المناسب في المنصة، أو تصفح مكتبة الببتيدات حسب الفئة والهدف. دائمًا استشر طبيبك قبل البدء.' },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  };
}

// Pricing Product schema
function getPricingJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "pptides - بروتوكولات الببتيد",
    "description": "وصول كامل لأكثر من 41 ببتيد مع بروتوكولات مفصّلة، حاسبة جرعات، دليل تحاليل مخبرية",
    "brand": { "@type": "Brand", "name": "pptides" },
    "offers": [
      { "@type": "Offer", "price": "34", "priceCurrency": "SAR", "name": "الأساسية", "availability": "https://schema.org/InStock", "url": "https://pptides.com/pricing" },
      { "@type": "Offer", "price": "371", "priceCurrency": "SAR", "name": "المتقدّمة", "availability": "https://schema.org/InStock", "url": "https://pptides.com/pricing" }
    ]
  };
}

// BreadcrumbList schema
function getBreadcrumbJsonLd(pageName: string, pageUrl: string): object {
  const items: { "@type": string; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://pptides.com/" }
  ];
  if (pageName && pageUrl !== `${SITE_URL}/`) {
    items.push({ "@type": "ListItem", "position": 2, "name": pageName, "item": pageUrl });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
}

// Page name mapping for breadcrumbs
const PAGE_NAMES: Record<string, string> = {
  '/pricing': 'الاشتراكات',
  '/about': 'عن pptides',
  '/transparency': 'الشفافية',
  '/faq': 'الأسئلة الشائعة',
  '/contact': 'تواصل معنا',
  '/blog': 'المدونة',
  '/glossary': 'قاموس المصطلحات',
  '/sources': 'المصادر العلمية',
  '/guide': 'دليل البدء',
  '/lab-guide': 'دليل التحاليل',
  '/quiz': 'اختبار الببتيد',
  '/library': 'مكتبة الببتيدات',
  '/table': 'جدول المقارنة',
  '/stacks': 'البروتوكولات المُجمَّعة',
  '/interactions': 'فحص التعارضات',
  '/compare': 'مقارنة الببتيدات',
  '/calculator': 'حاسبة الجرعات',
  '/privacy': 'سياسة الخصوصية',
  '/terms': 'شروط الاستخدام',
  '/community': 'المجتمع',
  '/reviews': 'التقييمات',
};

// ── Generate minimal HTML with OG tags ──
function renderOgHtml(meta: PageMeta, originalPath: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Generate JSON-LD script tags
  const jsonLdTags = (meta.jsonLd || [])
    .map(schema => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="ar_SA" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:url" content="${esc(meta.url)}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:image" content="${esc(meta.image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(meta.image)}" />
  <meta name="twitter:site" content="@pptides" />

  <!-- Canonical -->
  <link rel="canonical" href="${esc(meta.url)}" />

  <!-- Structured Data (JSON-LD) -->
${jsonLdTags}

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${esc(meta.url)}" />
</head>
<body>
  <p>Redirecting to <a href="${esc(meta.url)}">${esc(meta.title)}</a>...</p>
</body>
</html>`;
}

// ── Handler ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.query.path as string) || '/';

  try {
    const meta = await resolveMeta(path);
    const html = renderOgHtml(meta, path);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (err) {
    // Fallback on error
    const meta: PageMeta = { title: DEFAULT_TITLE, description: DEFAULT_DESC, image: DEFAULT_OG_IMAGE, url: `${SITE_URL}${path}`, jsonLd: [] };
    const html = renderOgHtml(meta, path);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
}
