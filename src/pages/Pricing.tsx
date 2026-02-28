import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Check, Shield, Lock, CreditCard, RefreshCw, ChevronDown, MessageCircle, Crown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT, VALUE_TOTAL, VALUE_SAVINGS_ELITE, VALUE_STACK, SUPPORT_EMAIL, SITE_URL } from '@/lib/constants';

const essentialsFeatures = [
  `بطاقات البروتوكول الكاملة لـ ${PEPTIDE_COUNT} ببتيد`,
  'حاسبة الجرعات الدقيقة',
  'دليل التحاليل المخبرية (11 تحليل)',
  'البروتوكولات المُجمَّعة حسب الهدف',
  'الدليل العملي للتحضير والحقن',
  'تحديثات علمية مستمرة',
];

const eliteFeatures = [
  'كل مزايا Essentials',
  'مدرب ذكي بالذكاء الاصطناعي 24/7',
  'بروتوكولات مخصّصة لأهدافك الشخصية',
  'استشارة خاصة شهرية مع المختص',
  'مراجعة تحاليلك الشخصية',
  'بروتوكول مصمّم حسب حالتك',
  'تواصل مباشر مع المختص',
  'دعم أولوية — رد خلال ساعات',
];

const valueStack = VALUE_STACK;

const eliteValueStack = [
  { item: 'مدرب ذكاء اصطناعي شخصي', value: '$49/شهر' },
  { item: 'استشارة خاصة شهرية', value: '$75/جلسة' },
  { item: 'مراجعة تحاليل شخصية', value: '$50/مراجعة' },
  { item: 'بروتوكول مخصّص', value: '$99' },
  { item: 'دعم أولوية 24/7', value: '$19/شهر' },
];

const faqs = [
  {
    q: 'ما الفرق بين Essentials و Elite؟',
    a: 'Essentials يعطيك كل الأدوات والمعلومات. Elite يضيف المدرب الذكي، الاستشارات الشخصية، ومراجعة تحاليلك. إذا تريد نتائج أسرع مع متابعة شخصية — Elite هو الخيار.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم. نستخدم Stripe لمعالجة الدفع ولا نخزّن بيانات بطاقتك أبدًا.',
  },
  {
    q: 'ماذا لو لم يعجبني المحتوى؟',
    a: 'لديك 3 أيام لتجربة المحتوى. إذا لم يعجبك، تواصل معنا واسترد أموالك بالكامل. بدون أسئلة.',
  },
  {
    q: 'هل يمكنني الإلغاء في أي وقت؟',
    a: `نعم. يمكنك طلب إلغاء الاشتراك من حسابك. لإيقاف الدفعات المستقبلية، تواصل معنا عبر ${SUPPORT_EMAIL}.`,
  },
  {
    q: 'كيف تعمل التجربة المجانية؟',
    a: 'عند اشتراكك في أي خطة، تحصل على 3 أيام تجربة مجانية. ندعم Visa و Mastercard و Apple Pay عبر Stripe. يمكنك الإلغاء قبل انتهاء التجربة بدون أي رسوم.',
  },
];

export default function Pricing() {
  const { user, subscription, upgradeTo } = useAuth();

  const isSubscribedTo = (tier: string) =>
    user && (subscription?.status === 'active' || subscription?.status === 'past_due' || subscription?.isTrial) && subscription.tier === tier;

  const showTrialMessaging = !user || subscription?.status === 'none';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const renderAction = (planKey: 'essentials' | 'elite', isElite: boolean) => {
    if (isSubscribedTo(planKey)) {
      return (
        <div className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold',
          'border border-emerald-200 bg-emerald-50 text-emerald-700'
        )}>
          <Check className="h-5 w-5" />
          <span>اشتراكك الحالي</span>
        </div>
      );
    }

    if (user) {
      const isLoading = loadingPlan === planKey;
      return (
        <button
          onClick={() => {
            setLoadingPlan(planKey);
            try {
              upgradeTo(planKey);
            } catch {
              setLoadingPlan(null);
              toast.error('حدث خطأ أثناء التحويل لصفحة الدفع. حاول مرة أخرى.');
            }
          }}
          disabled={isLoading}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5',
            'font-bold transition-all duration-300',
            'hover:scale-[1.02] active:scale-[0.98]',
            isElite
              ? 'btn-primary-glow bg-emerald-600 text-white transition-colors hover:bg-emerald-700'
              : 'border-2 border-stone-300 bg-white text-stone-800 hover:border-emerald-200 transition-colors hover:text-emerald-700',
            isLoading && 'opacity-70 pointer-events-none'
          )}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              جارٍ التحويل لصفحة الدفع...
            </>
          ) : 'اشترك الآن'}
        </button>
      );
    }

    return (
      <Link
        to="/signup?redirect=/pricing"
        className={cn(
          'inline-flex w-full items-center justify-center rounded-full px-6 py-3.5',
          'font-bold transition-all duration-300',
          'hover:scale-[1.02] active:scale-[0.98]',
          isElite
            ? 'btn-primary-glow bg-emerald-600 text-white transition-colors hover:bg-emerald-700'
            : 'border-2 border-stone-300 bg-white text-stone-800 hover:border-emerald-200 transition-colors hover:text-emerald-700'
        )}
      >
        ابدأ التجربة المجانية
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-stone-50 to-white">
      <Helmet>
        <title>أسعار واشتراكات الببتيدات | pptides</title>
        <meta name="description" content={`اختر خطتك: Essentials ${PRICING.essentials.label}/شهر أو Elite ${PRICING.elite.label}/شهر. 3 أيام تجربة مجانية. ضمان استرداد كامل.`} />
        <meta property="og:title" content="أسعار pptides | ابدأ بتجربة 3 أيام مجانية" />
        <meta property="og:description" content={`Essentials ${PRICING.essentials.label}/شهر أو Elite ${PRICING.elite.label}/شهر. ضمان استرداد كامل.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/pricing`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": { "@type": "Answer", "text": f.a }
          }))
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Header */}
        <div className="mb-16 text-center">
          {showTrialMessaging && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-bold text-emerald-700">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              3 أيام تجربة مجانية على كل الخطط
            </div>
          )}
          <h1 className="mb-4 text-3xl font-bold text-stone-900 md:text-5xl lg:text-6xl">
            استثمر في <span className="text-emerald-600">صحتك</span>
          </h1>
          {showTrialMessaging && (
            <p className="mx-auto max-w-lg text-lg text-stone-600">
              3 أيام تجربة مجانية مع كل اشتراك.
            </p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-stone-500">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> إلغاء في أي وقت</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 shrink-0 text-emerald-500" /> ضمان استرداد 3 أيام</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 shrink-0 text-emerald-500" /> دفع آمن عبر Stripe</span>
          </div>
        </div>

        {/* Billing cycle: monthly only (annual coming soon) */}

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Essentials */}
          <div
            className="relative flex flex-col rounded-2xl border border-stone-300/60 bg-white p-8 md:p-10 transition-all duration-300 hover:shadow-lg hover:border-stone-400 hover:-translate-y-1"
          >
            <h2 className="mb-1 text-2xl font-bold text-stone-900">Essentials</h2>
            <p className="mb-6 text-stone-800">كل الأدوات الأساسية التي تحتاجها</p>

            <div className="mb-2">
              <span className="text-3xl font-black text-stone-900 sm:text-5xl">${PRICING.essentials.monthly}</span>
              <span className="text-lg text-stone-800"> /شهريًا</span>
            </div>
            <div className="mb-6" />

            <ul className="mb-8 flex-1 space-y-3">
              {essentialsFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stone-800">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {renderAction('essentials', false)}
          </div>

          {/* Elite */}
          <div
            className="relative flex flex-col rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-xl shadow-emerald-600/5 md:p-10 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            <span className="absolute -top-3.5 end-6 rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-bold text-white">
              الأفضل قيمة
            </span>

            <div className="mb-1 flex items-center gap-2">
              <Crown className="h-5 w-5 text-emerald-600" />
              <h2 className="text-2xl font-bold text-stone-900">Elite</h2>
            </div>
            <p className="mb-6 text-stone-800">كل شيء + مدرب ذكي + استشارات شخصية</p>

            <div className="mb-2">
              <span className="text-3xl font-black text-stone-900 sm:text-5xl">${PRICING.elite.monthly}</span>
              <span className="text-lg text-stone-800"> /شهريًا</span>
            </div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Crown className="h-3.5 w-3.5" />
              الباقة الشاملة
            </div>
            <div className="mb-2" />

            <ul className="mb-8 flex-1 space-y-3">
              {eliteFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stone-800">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {renderAction('elite', true)}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-800">
          يمكنك الإلغاء في أي وقت — لا التزامات ولا رسوم مخفية
        </p>

        {/* Value Stack — Essentials */}
        <div
          className="mt-20"
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 md:text-3xl">
            ماذا تحصل مع <span className="text-emerald-600">Essentials</span>؟
          </h2>
          <div className="space-y-2">
            {valueStack.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-stone-300/60 bg-white px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="font-medium text-stone-800">{item.item}</span>
                </div>
                <span className="text-sm font-bold text-stone-800 line-through">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-stone-800">القيمة الإجمالية: <span className="font-bold text-stone-800 line-through">{VALUE_TOTAL}</span></p>
            <p className="mt-1 text-2xl font-black text-emerald-600">أنت تدفع فقط {PRICING.essentials.label}/شهريًا</p>
          </div>
        </div>

        {/* Value Stack — Elite */}
        <div
          className="mt-16"
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 md:text-3xl">
            ماذا يضيف <span className="text-emerald-600">Elite</span>؟
          </h2>
          <div className="space-y-2">
            {eliteValueStack.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/30 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="font-medium text-stone-800">{item.item}</span>
                </div>
                <span className="text-sm font-bold text-stone-800 line-through">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-stone-800">القيمة الإضافية: <span className="font-bold text-stone-800 line-through">{VALUE_SAVINGS_ELITE}/شهريًا</span></p>
            <p className="mt-1 text-2xl font-black text-emerald-600">كل شيء بـ {PRICING.elite.label}/شهريًا فقط</p>
          </div>
        </div>

        {/* Money-back guarantee */}
        <div
          className="mt-16 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 p-8"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-200">
              <Shield className="h-8 w-8 text-emerald-700" />
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xl font-bold text-stone-900">ضمان استرداد كامل خلال 3 أيام</p>
              <p className="mt-1 text-stone-800">
                إذا لم يعجبك المحتوى — استرد أموالك بالكامل. بدون أسئلة. بدون شروط.
              </p>
            </div>
          </div>
        </div>

        {/* Referral removed — backend not ready */}

        {/* Payment security */}
        <div
          className="mt-10 grid gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Lock, text: 'دفع آمن ومشفّر عبر Stripe' },
            { icon: CreditCard, text: 'نقبل Visa و Mastercard و Apple Pay' },
            { icon: RefreshCw, text: 'إلغاء فوري — بدون رسوم مخفية' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-2 rounded-xl border border-stone-300/60 bg-white p-5 text-center">
              <Icon className="h-6 w-6 text-emerald-600" />
              <p className="text-sm font-semibold text-stone-800">{text}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div
          className="mt-8 rounded-xl border border-stone-300/60 bg-white p-6 text-center"
        >
          <MessageCircle className="mx-auto mb-3 h-6 w-6 text-emerald-600" />
          <p className="text-sm font-semibold text-stone-800">
            تواصل معنا: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 underline">{SUPPORT_EMAIL}</a>
          </p>
          <p className="mt-1 text-xs text-stone-800">الدعم متاح 24/7 عبر البريد الإلكتروني</p>
        </div>

        {/* FAQ */}
        <div
          className="mt-16"
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900">أسئلة شائعة</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-stone-300/60 bg-white transition-all hover:border-stone-400/60">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-semibold text-stone-800">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-4 w-4 text-stone-800 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-stone-800">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div
          className="mt-16 text-center"
        >
          {user ? (
            <button
              onClick={() => upgradeTo('elite')}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700"
            >
              <span>ابدأ مع Elite الآن</span>
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link
              to="/signup?redirect=/pricing"
              className="btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700"
            >
              <span>ابدأ تجربتك المجانية الآن</span>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          {showTrialMessaging && (
            <p className="mt-4 text-sm text-stone-800">3 أيام مجانًا — إلغاء في أي وقت</p>
          )}
        </div>

        {/* Disclaimer */}
        <p
          className="mt-10 text-center text-sm text-stone-600 leading-relaxed"
        >
          تنويه طبي: المحتوى المقدّم في هذا الموقع لأغراض تعليمية فقط ولا يُعدّ بديلًا عن
          الاستشارة الطبية المتخصصة. استشر طبيبك قبل استخدام أي ببتيد أو مكمّل.
        </p>
      </div>
    </div>
  );
}
