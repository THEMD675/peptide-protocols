import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Users, Package, AlertTriangle, Mail, Tag, Send, Loader2, BookOpen, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORT_EMAIL, SITE_URL } from '@/lib/constants';
import { peptides } from '@/data/peptides';

function SourcingInterestForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [selectedPeptides, setSelectedPeptides] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const popularPeptides = peptides.filter(p =>
    ['bpc-157', 'tb-500', 'semaglutide', 'tirzepatide', 'retatrutide', 'cjc-1295', 'ipamorelin', 'semax', 'epithalon'].includes(p.id)
  );

  const togglePeptide = (id: string) => {
    setSelectedPeptides(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('يرجى إدخال بريدك الإلكتروني'); return; }
    if (selectedPeptides.length === 0) { toast.error('اختر ببتيد واحد على الأقل'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('enquiries').insert({
        user_id: user?.id ?? null,
        email: email.trim(),
        subject: 'sourcing_interest',
        peptide_name: selectedPeptides.join(', '),
        message: `رقم التواصل: ${phone || 'لم يُذكر'}\n\nالببتيدات المطلوبة: ${selectedPeptides.join(', ')}\n\nملاحظات: ${notes || 'لا يوجد'}`,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('تم تسجيل اهتمامك — سنتواصل معك قريبًا');
    } catch {
      toast.error('تعذّر إرسال الطلب — حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="mt-10 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <p className="text-lg font-bold text-stone-900">تم تسجيل اهتمامك</p>
        <p className="mt-2 text-sm text-stone-600">سنتواصل معك عند توفّر خدمة التوريد الموثوق</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 md:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Package className="h-5 w-5 text-emerald-700" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">تبحث عن مورّد موثوق؟</h2>
        <p className="mt-2 text-sm text-stone-600">نعمل على توفير خدمة توريد ببتيدات موثوقة للمنطقة العربية. سجّل اهتمامك وسنتواصل معك عند الإطلاق.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="src-email" className="mb-1 block text-sm font-medium text-stone-800 dark:text-stone-200">البريد الإلكتروني *</label>
            <input id="src-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
          </div>
          <div>
            <label htmlFor="src-phone" className="mb-1 block text-sm font-medium text-stone-800 dark:text-stone-200">رقم التواصل (واتساب)</label>
            <input id="src-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" dir="ltr"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-stone-800 dark:text-stone-200">ما الببتيدات التي تبحث عنها؟ *</p>
          <div className="flex flex-wrap gap-2">
            {popularPeptides.map(p => (
              <button key={p.id} type="button" onClick={() => togglePeptide(p.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]',
                  selectedPeptides.includes(p.id)
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600',
                )}
              >
                {p.nameAr}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="src-notes" className="mb-1 block text-sm font-medium text-stone-800 dark:text-stone-200">ملاحظات إضافية</label>
          <textarea id="src-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="الكمية المطلوبة، الهدف، أي تفاصيل إضافية..."
            className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 resize-none" />
        </div>

        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'جارٍ الإرسال...' : 'سجّل اهتمامك'}
        </button>

        <p className="text-center text-xs text-stone-500">pptides لا تبيع ببتيدات حاليًا — نجمع الاهتمام لتوفير خدمة موثوقة مستقبلًا</p>
      </form>
    </section>
  );
}

const criteria = [
  {
    icon: Shield,
    titleAr: 'شهادة تحليل طرف ثالث',
    titleEn: 'Third-party COA',
    descriptionAr:
      'يجب أن يوفّر المورد شهادة تحليل (Certificate of Analysis) من مختبر مستقل لكل دفعة، تؤكد الهوية والنقاء والتعقيم.',
  },
  {
    icon: CheckCircle,
    titleAr: 'نقاء HPLC ≥ 98%',
    titleEn: 'HPLC purity ≥ 98%',
    descriptionAr:
      'النقاء المرتفع يعني شوائب أقل وفعالية أعلى. ابحث عن نتائج HPLC و Mass Spec في شهادة التحليل.',
  },
  {
    icon: Package,
    titleAr: 'تخزين وشحن مبرّد',
    titleEn: 'Cold storage & shipping',
    descriptionAr:
      'الببتيدات حساسة للحرارة. المورد الجيد يخزّن ويشحن بتغليف مبرّد (ice packs) ويوفر تتبعًا للشحنة.',
  },
  {
    icon: Tag,
    titleAr: 'توسيم واضح',
    titleEn: 'Clear labeling',
    descriptionAr:
      'التوسيم الصحيح يتضمن اسم الببتيد، رقم الدفعة، تاريخ الانتهاء، والتركيز. تجنّب المنتجات غير المُوسَّمة.',
  },
  {
    icon: Users,
    titleAr: 'سمعة في مجتمعات البيوهاكينغ',
    titleEn: 'Community reputation',
    descriptionAr:
      'تحقق من التقييمات في منتديات Reddit و Discord ومجتمعات البيوهاكينغ المعروفة. التجارب الحقيقية أهم من الإعلانات.',
  },
];

interface StudyRef {
  title: string;
  url: string;
  year: number;
  journal: string;
  category: 'clinical-trial' | 'review' | 'meta-analysis' | 'preclinical';
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  'clinical-trial': { label: 'تجربة سريرية', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  'review': { label: 'مراجعة', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  'meta-analysis': { label: 'تحليل تجميعي', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  'preclinical': { label: 'ما قبل سريري', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
};

const scientificReferences: StudyRef[] = [
  { title: 'STEP Trials — Semaglutide لفقدان الوزن', url: 'https://pubmed.ncbi.nlm.nih.gov/33567185/', year: 2021, journal: 'N Engl J Med', category: 'clinical-trial' },
  { title: 'SURMOUNT — Tirzepatide فقدان 22.5%', url: 'https://pubmed.ncbi.nlm.nih.gov/35658024/', year: 2022, journal: 'N Engl J Med', category: 'clinical-trial' },
  { title: 'BPC-157 — مراجعة شاملة للتعافي', url: 'https://pubmed.ncbi.nlm.nih.gov/30915550/', year: 2019, journal: 'J Physiol Pharmacol', category: 'review' },
  { title: 'Semax — تأثيره على BDNF والدماغ', url: 'https://pubmed.ncbi.nlm.nih.gov/17369778/', year: 2007, journal: 'Bull Exp Biol Med', category: 'preclinical' },
  { title: 'Epithalon — التيلوميرات وإطالة العمر', url: 'https://pubmed.ncbi.nlm.nih.gov/12937145/', year: 2003, journal: 'Bull Exp Biol Med', category: 'preclinical' },
  { title: 'GLP-1 Receptor Agonists — مراجعة منهجية للفعالية والأمان', url: 'https://pubmed.ncbi.nlm.nih.gov/34986330/', year: 2022, journal: 'Lancet Diabetes Endocrinol', category: 'meta-analysis' },
  { title: 'TB-500 (Thymosin Beta-4) — دوره في إصلاح الأنسجة', url: 'https://pubmed.ncbi.nlm.nih.gov/20146022/', year: 2010, journal: 'Ann N Y Acad Sci', category: 'review' },
  { title: 'CJC-1295 و Ipamorelin — تحفيز هرمون النمو', url: 'https://pubmed.ncbi.nlm.nih.gov/16352683/', year: 2006, journal: 'J Clin Endocrinol Metab', category: 'clinical-trial' },
  { title: 'GHK-Cu — ببتيد النحاس في إصلاح البشرة والجروح', url: 'https://pubmed.ncbi.nlm.nih.gov/24687257/', year: 2014, journal: 'Int J Mol Sci', category: 'review' },
  { title: 'Retatrutide — ناهض ثلاثي المستقبلات في السمنة', url: 'https://pubmed.ncbi.nlm.nih.gov/37385275/', year: 2023, journal: 'N Engl J Med', category: 'clinical-trial' },
];

const categoryOrder = ['clinical-trial', 'meta-analysis', 'review', 'preclinical'] as const;

export default function Sources() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredRefs = activeCategory === 'all'
    ? scientificReferences
    : scientificReferences.filter(r => r.category === activeCategory);

  const groupedRefs = categoryOrder
    .map(cat => ({
      category: cat,
      refs: filteredRefs.filter(r => r.category === cat),
    }))
    .filter(g => g.refs.length > 0);

  return (
    <div className="min-h-screen animate-fade-in" role="main" aria-label="المصادر الموثوقة">
      <Helmet>
        <title>المصادر الموثوقة | pptides</title>
        <meta
          name="description"
          content="تعلّم كيف تختار مورد ببتيدات موثوق — شهادات التحليل، النقاء ≥98%، السمعة المجتمعية، والشحن المبرّد."
        />
        <meta property="og:title" content="المصادر الموثوقة | pptides" />
        <meta property="og:description" content="معايير اختيار مورد ببتيدات موثوق — شهادات التحليل والنقاء والشحن المبرّد" />
        <meta property="og:url" content={`${SITE_URL}/sources`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="المصادر الموثوقة للببتيدات | pptides" />
        <meta name="twitter:description" content="معايير اختيار مورد ببتيدات موثوق — شهادات التحليل، النقاء ≥98%، السمعة المجتمعية، والشحن المبرّد." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/sources`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'المصادر الموثوقة للببتيدات',
          url: `${SITE_URL}/sources`,
          description: 'معايير اختيار مورد ببتيدات موثوق — شهادات التحليل والنقاء والشحن المبرّد.',
          inLanguage: 'ar',
          publisher: { '@type': 'Organization', name: 'pptides', url: SITE_URL },
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <BookOpen className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
            مصادر{' '}
            <span className="text-emerald-600">موثوقة</span>
          </h1>
          <p className="mt-2 text-stone-600">
            معايير اختيار المورد + المراجع العلمية
          </p>
        </div>

        {/* Section 1: Criteria */}
        <section className="mb-10">
          <div className="mb-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4">
            <p className="text-sm text-stone-700">
              <strong className="text-stone-900">تنويه:</strong> pptides منصة تعليمية — لا نبيع ببتيدات ولا نتحمل مسؤولية أي عملية شراء. المعايير أدناه لمساعدتك في اختيار مورد موثوق.
            </p>
          </div>
          <h2 className="mb-6 text-xl font-bold text-stone-900 md:text-2xl">
            كيف تختار مورد ببتيدات موثوق؟
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {criteria.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.titleEn}
                  className={cn(
                    'group rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-5 transition-all',
                    'hover:border-emerald-300 hover:bg-white dark:hover:bg-stone-800'
                  )}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <Icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-stone-900">{item.titleAr}</h3>
                  <span className="mb-2 block text-xs text-stone-700">{item.titleEn}</span>
                  <p className="text-sm leading-relaxed text-stone-800">{item.descriptionAr}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Disclaimer */}
        <section className="mb-10">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-600">ملاحظة مهمة</h2>
            </div>
            <p className="text-sm leading-relaxed text-stone-800">
              هذه القائمة لأغراض تعليمية فقط. لا نبيع ببتيدات ولا نتحمل مسؤولية أي عملية شراء.
              تحقق من القوانين المحلية في بلدك قبل الشراء.
            </p>
          </div>
        </section>

        {/* Section 3: Scientific References — Research Library */}
        <section className="mb-10" aria-labelledby="sources-refs-heading">
          <div className="mb-6 flex items-center gap-3">
            <BookOpen className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 id="sources-refs-heading" className="text-xl font-bold text-stone-900 md:text-2xl">المراجع العلمية</h2>
          </div>

          {/* Category filter tabs */}
          <div className="mb-6 -mx-4 overflow-x-auto px-4 scrollbar-hide">
            <div className="flex flex-nowrap gap-2 pb-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all min-h-[44px]',
                  activeCategory === 'all'
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-emerald-200'
                )}
              >
                الكل ({scientificReferences.length})
              </button>
              {categoryOrder.map(cat => {
                const count = scientificReferences.filter(r => r.category === cat).length;
                if (count === 0) return null;
                const meta = CATEGORY_LABELS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all min-h-[44px]',
                      activeCategory === cat
                        ? `border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300`
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-emerald-200'
                    )}
                  >
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouped references */}
          <div className="space-y-8">
            {groupedRefs.map(({ category, refs }) => {
              const meta = CATEGORY_LABELS[category];
              return (
                <div key={category}>
                  {activeCategory === 'all' && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className={cn('rounded-full border px-3 py-1 text-xs font-bold', meta.bgColor, meta.color)}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-stone-400">{refs.length} مرجع</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {refs.map((study) => {
                      const studyMeta = CATEGORY_LABELS[study.category];
                      return (
                        <a
                          key={study.url}
                          href={study.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-stone-800 hover:shadow-sm"
                        >
                          {/* PubMed icon */}
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 transition-colors group-hover:bg-emerald-200">
                            <BookOpen className="h-5 w-5 text-emerald-700" />
                          </span>
                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-stone-900 leading-relaxed group-hover:text-emerald-800">
                              {study.title}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {study.year}
                              </span>
                              <span className="font-medium text-stone-700" dir="ltr">{study.journal}</span>
                              {activeCategory === 'all' ? null : (
                                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', studyMeta.bgColor, studyMeta.color)}>
                                  {studyMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* External link */}
                          <span className="flex shrink-0 items-center gap-1 self-center text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                            PubMed <ExternalLink className="h-3 w-3" />
                          </span>
                          <span className="sr-only"> (يفتح في نافذة جديدة)</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Contact CTA */}
        <section>
          <div className="rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Mail className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-stone-900">
              هل تعرف موردًا موثوقًا؟
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-800">
              إذا كنت تعرف موردًا يستوفي هذه المعايير، أرسل لنا على
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-600 transition-opacity hover:opacity-80"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        {/* Peptide Sourcing Interest Form */}
        <SourcingInterestForm />

        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">جاهز تختار بروتوكولك؟</p>
          <p className="mt-1 text-sm text-stone-600">تصفّح مكتبة الببتيدات واحسب جرعتك</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center">تصفّح المكتبة</Link>
            <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 min-h-[44px] inline-flex items-center justify-center">حاسبة الجرعات</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
