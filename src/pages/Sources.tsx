import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Users, Package, AlertTriangle, Mail, Tag, Send, Loader2 } from 'lucide-react';
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
    <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
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
            <label htmlFor="src-email" className="mb-1 block text-sm font-medium text-stone-800">البريد الإلكتروني *</label>
            <input id="src-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.com"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div>
            <label htmlFor="src-phone" className="mb-1 block text-sm font-medium text-stone-800">رقم التواصل (واتساب)</label>
            <input id="src-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" dir="ltr"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-stone-800">ما الببتيدات التي تبحث عنها؟ *</p>
          <div className="flex flex-wrap gap-2">
            {popularPeptides.map(p => (
              <button key={p.id} type="button" onClick={() => togglePeptide(p.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  selectedPeptides.includes(p.id)
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
                )}
              >
                {p.nameAr}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="src-notes" className="mb-1 block text-sm font-medium text-stone-800">ملاحظات إضافية</label>
          <textarea id="src-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="الكمية المطلوبة، الهدف، أي تفاصيل إضافية..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none" />
        </div>

        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
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

export default function Sources() {
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
        <div
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
            مصادر{' '}
            <span className="text-emerald-600">موثوقة</span>
          </h1>
          <p className="mt-2 text-stone-600">
            معايير اختيار المورد الموثوق
          </p>
        </div>

        {/* Section 1: Criteria */}
        <section
          className="mb-10"
        >
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
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
                    'group rounded-2xl border border-stone-300 bg-stone-50 p-5 transition-all',
                    'hover:border-emerald-300 transition-colors hover:bg-white/[0.06]'
                  )}
                >
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
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
        <section
          className="mb-10"
        >
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

        {/* Section 3: Contact CTA */}
        <section
        >
          <div
            className="rounded-2xl border border-stone-300 bg-stone-50 p-6 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Mail className="h-5 w-5" aria-hidden="true" />
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

        {/* Key Scientific References */}
        <section className="mt-10 mb-10" aria-labelledby="sources-refs-heading">
          <h2 id="sources-refs-heading" className="mb-6 text-xl font-bold text-stone-900 md:text-2xl">المراجع العلمية الرئيسية</h2>
          <div className="space-y-3">
            {[
              { title: 'STEP Trials — Semaglutide لفقدان الوزن', url: 'https://pubmed.ncbi.nlm.nih.gov/33567185/' },
              { title: 'SURMOUNT — Tirzepatide فقدان 22.5%', url: 'https://pubmed.ncbi.nlm.nih.gov/35658024/' },
              { title: 'BPC-157 — مراجعة شاملة للتعافي', url: 'https://pubmed.ncbi.nlm.nih.gov/30915550/' },
              { title: 'Semax — تأثيره على BDNF والدماغ', url: 'https://pubmed.ncbi.nlm.nih.gov/17369778/' },
              { title: 'Epithalon — التيلوميرات وإطالة العمر', url: 'https://pubmed.ncbi.nlm.nih.gov/12937145/' },
            ].map((study) => (
              <a
                key={study.url}
                href={study.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm font-medium text-stone-900 transition-all hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle className="h-4 w-4 text-emerald-700" />
                </span>
                <span className="flex-1">{study.title}</span>
                <span className="shrink-0 text-xs text-emerald-600">PubMed ↗</span>
                <span className="sr-only"> (يفتح في نافذة جديدة)</span>
              </a>
            ))}
          </div>
        </section>

        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">جاهز تختار بروتوكولك؟</p>
          <p className="mt-1 text-sm text-stone-600">تصفّح مكتبة الببتيدات واحسب جرعتك</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">تصفّح المكتبة</Link>
            <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">حاسبة الجرعات</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
