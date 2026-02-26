import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BookA, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PEPTIDE_COUNT } from '@/lib/constants';

interface GlossaryTerm {
  ar: string;
  en: string;
  definition: string;
}

const TERMS: GlossaryTerm[] = [
  { ar: 'ببتيد', en: 'Peptide', definition: 'سلسلة قصيرة من الأحماض الأمينية (أقل من 50 حمض أميني) ترتبط بروابط ببتيدية وتؤدي وظائف بيولوجية محددة في الجسم.' },
  { ar: 'حقن تحت الجلد', en: 'Subcutaneous Injection', definition: 'طريقة حقن تُدخل الدواء في الطبقة الدهنية تحت الجلد مباشرة، وهي الطريقة الأكثر شيوعًا لحقن الببتيدات.' },
  { ar: 'إعادة التشكيل', en: 'Reconstitution', definition: 'عملية إذابة الببتيد المجفّف (البودرة) بإضافة ماء بكتيريوستاتيك أو ماء معقّم لتحضيره للحقن.' },
  { ar: 'الماء البكتيريوستاتيك', en: 'Bacteriostatic Water', definition: 'ماء معقّم يحتوي على 0.9% كحول بنزيلي كمادة حافظة، يُستخدم لإذابة الببتيدات ويبقى صالحًا لمدة 28 يومًا بعد الفتح.' },
  { ar: 'التيلوميرات', en: 'Telomeres', definition: 'أغطية واقية في نهايات الكروموسومات تقصر مع التقدم في العمر. بعض الببتيدات مثل Epithalon تساعد في الحفاظ على طولها.' },
  { ar: 'عامل التغذية العصبية', en: 'BDNF', definition: 'Brain-Derived Neurotrophic Factor — بروتين يعزز نمو وبقاء الخلايا العصبية. ببتيدات مثل Semax ترفع مستوياته بشكل كبير.' },
  { ar: 'مستقبل GLP-1', en: 'GLP-1 Receptor Agonist', definition: 'فئة من الأدوية تحاكي هرمون GLP-1 الذي ينظّم الشهية وسكر الدم. تشمل Semaglutide وTirzepatide.' },
  { ar: 'هرمون النمو', en: 'Growth Hormone (GH)', definition: 'هرمون تفرزه الغدة النخامية مسؤول عن النمو وتجديد الخلايا. محفّزات إفرازه تشمل CJC-1295 وIpamorelin.' },
  { ar: 'عامل النمو الشبيه بالإنسولين', en: 'IGF-1', definition: 'Insulin-like Growth Factor 1 — هرمون يُنتج استجابة لهرمون النمو، يعزز نمو العضلات وتعافي الأنسجة.' },
  { ar: 'التجفيف بالتبريد', en: 'Lyophilization', definition: 'عملية تجفيف الببتيد بالتجميد لتحويله إلى بودرة مستقرة يمكن تخزينها لفترة طويلة قبل إعادة التشكيل.' },
  { ar: 'نصف العمر', en: 'Half-life', definition: 'المدة التي يستغرقها تركيز الببتيد في الدم للانخفاض إلى النصف. يحدد تكرار الجرعات.' },
  { ar: 'التوافر الحيوي', en: 'Bioavailability', definition: 'نسبة الببتيد التي تصل إلى مجرى الدم فعليًا بعد الحقن أو التناول. الحقن تحت الجلد توفر توافرًا حيويًا عاليًا.' },
  { ar: 'سيرنج إنسولين', en: 'Insulin Syringe', definition: 'سيرنج رفيع بإبرة قصيرة (29-31 غيج) يُستخدم لحقن الببتيدات تحت الجلد. يُقاس بالوحدات (100 وحدة = 1 مل).' },
  { ar: 'التحميل', en: 'Loading Phase', definition: 'مرحلة أولية تُستخدم فيها جرعات أعلى أو أكثر تكرارًا لبناء مستوى فعّال في الجسم قبل الانتقال لجرعة الصيانة.' },
  { ar: 'جرعة الصيانة', en: 'Maintenance Dose', definition: 'الجرعة المنتظمة التي تُؤخذ بعد مرحلة التحميل للحفاظ على المستوى العلاجي في الجسم.' },
  { ar: 'تجميعة', en: 'Stack', definition: 'مجموعة من الببتيدات تُؤخذ معًا لتحقيق هدف محدد، مثل تجميعة التعافي (BPC-157 + TB-500).' },
  { ar: 'بروتوكول', en: 'Protocol', definition: 'خطة منظّمة تحدد الجرعات والتوقيت والمدة وطريقة الاستخدام لببتيد أو تجميعة معينة.' },
  { ar: 'الخلايا الشائخة', en: 'Senescent Cells', definition: 'خلايا توقفت عن الانقسام لكنها لا تموت، تُسبب التهابات مزمنة وترتبط بالشيخوخة. ببتيدات مثل FOXO4-DRI تستهدفها.' },
  { ar: 'محفّز إفراز هرمون النمو', en: 'GHRH (Growth Hormone Releasing Hormone)', definition: 'هرمون يحفّز الغدة النخامية لإفراز هرمون النمو. ببتيدات مثل CJC-1295 وSermorelin تحاكي عمله.' },
  { ar: 'غريلين', en: 'Ghrelin Mimetic (GHRP)', definition: 'ببتيدات تحاكي هرمون الجوع (غريلين) لتحفيز إفراز هرمون النمو. تشمل GHRP-2 وGHRP-6 وIpamorelin.' },
  { ar: 'تحليل IGF-1', en: 'IGF-1 Blood Test', definition: 'تحليل دم يقيس مستوى عامل النمو الشبيه بالإنسولين، يُستخدم لمراقبة فعالية ببتيدات هرمون النمو.' },
  { ar: 'نفاذية الأمعاء', en: 'Leaky Gut', definition: 'حالة تزداد فيها نفاذية بطانة الأمعاء مما يسمح بمرور مواد غير مرغوبة. ببتيدات مثل BPC-157 وLarazotide تساعد في إصلاحها.' },
  { ar: 'عامل التنخّر الورمي', en: 'TNF-alpha', definition: 'بروتين التهابي رئيسي في الجسم. بعض الببتيدات مثل KPV تعمل كمضادات التهاب عبر تثبيطه.' },
  { ar: 'التنظيم التنازلي', en: 'Downregulation', definition: 'انخفاض استجابة المستقبلات عند التعرّض المستمر لمحفّز. يحدث مع بعض الببتيدات مثل Hexarelin عند الاستخدام المطوّل.' },
  { ar: 'الدورة', en: 'Cycling', definition: 'استراتيجية تناوب بين فترات الاستخدام والتوقف لمنع تطوّر التحمّل والحفاظ على فعالية الببتيد.' },
  { ar: 'الكولاجين', en: 'Collagen', definition: 'البروتين الأكثر وفرة في الجسم، يدعم البشرة والمفاصل والعظام. ببتيدات الكولاجين تُؤخذ فمويًا لتعزيز إنتاجه.' },
  { ar: 'المحور الوطائي النخامي', en: 'HPG Axis', definition: 'المحور الهرموني بين الوطاء والغدة النخامية والغدد التناسلية. ببتيدات مثل Kisspeptin وGnRH تنظّم عمله.' },
  { ar: 'التخزين البارد', en: 'Cold Storage', definition: 'تخزين الببتيدات في الثلاجة (2-8°C) بعد إعادة التشكيل للحفاظ على فعاليتها. معظم الببتيدات تبقى صالحة 28-30 يومًا.' },
  { ar: 'جرعة ميكروغرام', en: 'Microgram (mcg)', definition: 'وحدة قياس تساوي جزءًا من المليون من الغرام (1 mg = 1000 mcg). معظم جرعات الببتيدات تُقاس بالميكروغرام.' },
  { ar: 'مضاد الشيخوخة', en: 'Anti-aging / Longevity', definition: 'مجال يهدف لإبطاء أو عكس علامات الشيخوخة. ببتيدات مثل Epithalon وGHK-Cu وThymosin Alpha-1 تُصنّف في هذا المجال.' },
  { ar: 'الميلاتونين', en: 'Melatonin', definition: 'هرمون ينظّم دورة النوم والاستيقاظ. ببتيد Epithalon يعيد تنظيم إفرازه الطبيعي من الغدة الصنوبرية.' },
  { ar: 'التئام الجروح', en: 'Wound Healing', definition: 'عملية إصلاح الأنسجة التالفة. ببتيدات مثل BPC-157 وTB-500 وGHK-Cu تُسرّع هذه العملية بآليات مختلفة.' },
];

export default function Glossary() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return TERMS;
    const q = search.trim().toLowerCase();
    return TERMS.filter(
      (t) =>
        t.ar.toLowerCase().includes(q) ||
        t.en.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
      <Helmet>
        <title>مصطلحات الببتيدات | pptides</title>
        <meta name="description" content="قاموس شامل لمصطلحات الببتيدات والبيوهاكينغ بالعربي مع المعادل الإنجليزي. Comprehensive Arabic peptide and biohacking glossary." />
      </Helmet>

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <BookA className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">المصطلحات</h1>
        <p className="mt-2 text-lg text-stone-600">قاموس شامل لمصطلحات الببتيدات والبيوهاكينغ</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مصطلح..."
          aria-label="البحث في المصطلحات"
          className="w-full rounded-2xl border border-stone-300 bg-stone-50 py-4 pr-12 pl-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="مسح البحث"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-stone-500">
        {search.trim() ? `${filtered.length} نتيجة` : `${TERMS.length} مصطلح`}
      </p>

      {/* Terms Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 py-16 text-center">
          <BookA className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="text-sm text-stone-500">لا توجد نتائج لـ "{search}"</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((term) => (
            <article
              key={term.en}
              className="rounded-2xl border border-stone-200 border-r-2 border-r-emerald-300 bg-white p-5 transition-all hover:border-emerald-200 hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-bold text-stone-900">{term.ar}</h3>
                <p className="shrink-0 text-xs font-medium text-emerald-600" dir="ltr">{term.en}</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{term.definition}</p>
            </article>
          ))}
        </div>
      )}
      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-bold text-stone-900">مستعد تبدأ؟</p>
        <p className="mt-1 text-sm text-stone-600">تصفّح البروتوكولات الكاملة لـ {PEPTIDE_COUNT}+ ببتيد</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">تصفّح المكتبة</Link>
          <Link to="/coach" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">اسأل المدرب الذكي</Link>
        </div>
      </div>
    </main>
  );
}
