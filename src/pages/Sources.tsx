import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Users, Package, MessageCircle, AlertTriangle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    titleAr: 'نقاء ≥ 98% مؤكّد بالتحليل',
    titleEn: 'Purity ≥ 98%',
    descriptionAr:
      'النقاء المرتفع يعني شوائب أقل وفعالية أعلى. ابحث عن نتائج HPLC و Mass Spec في شهادة التحليل.',
  },
  {
    icon: Users,
    titleAr: 'سمعة في مجتمعات البيوهاكينغ',
    titleEn: 'Community reputation',
    descriptionAr:
      'تحقق من التقييمات في منتديات Reddit و Discord ومجتمعات البيوهاكينغ المعروفة. التجارب الحقيقية أهم من الإعلانات.',
  },
  {
    icon: Package,
    titleAr: 'شحن سريع وتغليف مبرّد',
    titleEn: 'Fast cold-chain shipping',
    descriptionAr:
      'الببتيدات حساسة للحرارة. المورد الجيد يشحن بتغليف مبرّد (ice packs) ويوفر تتبعًا للشحنة.',
  },
  {
    icon: MessageCircle,
    titleAr: 'دعم عملاء وسياسة استرداد واضحة',
    titleEn: 'Clear refund policy',
    descriptionAr:
      'المورد الموثوق لا يختبئ خلف سياسات غامضة. ابحث عن سياسة استرداد واضحة ودعم عملاء سريع الاستجابة.',
  },
];

export default function Sources() {
  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>مصادر ببتيدات موثوقة — معايير اختيار المورد | Trusted Peptide Sources</title>
        <meta
          name="description"
          content="تعلّم كيف تختار مورد ببتيدات موثوق — شهادات التحليل، النقاء ≥98%، السمعة المجتمعية، والشحن المبرّد."
        />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
            مصادر{' '}
            <span >موثوقة</span>
          </h1>
          <p className="mt-2 text-stone-800">
            معايير اختيار المورد الموثوق
          </p>
        </div>

        {/* Section 1: Criteria */}
        <section
          className="mb-10"
        >
          <h2 className="mb-6 text-xl font-bold text-stone-900 md:text-2xl">
            كيف تختار مورد ببتيدات موثوق؟
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {criteria.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.titleEn}
                  className={cn(
                    'group rounded-2xl border border-stone-300 bg-stone-50 p-5 transition-all',
                    'hover:border-emerald-300 hover:bg-white/[0.06]'
                  )}
                >
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"
                  >
                    <Icon className="h-5 w-5"  />
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
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-400">ملاحظة مهمة</h2>
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
              <Mail className="h-5 w-5"  />
            </div>
            <h2 className="mb-2 text-lg font-bold text-stone-900">
              هل تعرف موردًا موثوقًا؟
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-800">
              إذا كنت تعرف موردًا يستوفي هذه المعايير، أرسل لنا على
            </p>
            <a
              href="mailto:contact@pptides.com"
              className="mt-3 inline-block text-sm font-semibold transition-opacity hover:opacity-80"
              
            >
              contact@pptides.com
            </a>
          </div>
        </section>

        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">جاهز تختار بروتوكولك؟</p>
          <p className="mt-1 text-sm text-stone-600">تصفّح مكتبة الببتيدات واحسب جرعتك</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">تصفّح المكتبة</Link>
            <Link to="/calculator" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">حاسبة الجرعات</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
