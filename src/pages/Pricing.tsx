import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CheckCircle, Shield, Lock, CreditCard, RefreshCw, ChevronDown, MessageCircle, Crown, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT, TRIAL_DAYS, VALUE_TOTAL, VALUE_SAVINGS_ELITE, VALUE_STACK, SUPPORT_EMAIL, SITE_URL } from '@/lib/constants';

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
  'بروتوكولات مخصّصة لأهدافك وحالتك الشخصية',
  'استشارات بلا حدود — لا حد للأسئلة',
  'دعم مخصّص عبر البريد',
];

const valueStack = VALUE_STACK;

const eliteValueStack = [
  { item: 'مدرب ذكاء اصطناعي شخصي', value: '184 ر.س/شهر' },
  { item: 'بروتوكول مخصّص حسب حالتك', value: '371 ر.س' },
  { item: 'استشارات بلا حدود', value: '109 ر.س/شهر' },
  { item: 'دعم مخصّص عبر البريد', value: '71 ر.س/شهر' },
];

const faqs = [
  {
    q: 'ما الفرق بين Essentials و Elite؟',
    a: 'Essentials يعطيك كل الأدوات والمعلومات. Elite يضيف المدرب الذكي بلا حدود، بروتوكولات مخصّصة، ودعم مخصّص عبر البريد. إذا تريد استشارات كثيرة ومتابعة — Elite هو الخيار.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم. نستخدم Stripe لمعالجة الدفع ولا نخزّن بيانات بطاقتك أبدًا.',
  },
  {
    q: 'ماذا لو لم يعجبني المحتوى؟',
    a: `لديك ${TRIAL_DAYS} أيام لتجربة المحتوى. إذا لم يعجبك، تواصل معنا واسترد أموالك بالكامل. بدون أسئلة.`,
  },
  {
    q: 'هل يمكنني الإلغاء في أي وقت؟',
    a: `نعم. يمكنك طلب إلغاء الاشتراك من حسابك. لإيقاف الدفعات المستقبلية، تواصل معنا عبر ${SUPPORT_EMAIL}.`,
  },
  {
    q: 'كيف تعمل التجربة المجانية؟',
    a: `عند اشتراكك في أي خطة، تحصل على ${TRIAL_DAYS} أيام تجربة مجانية. ندعم Visa و Mastercard و Apple Pay عبر Stripe. يمكنك الإلغاء قبل انتهاء التجربة بدون أي رسوم.`,
  },
];

export default function Pricing() {
  const { user, subscription, upgradeTo } = useAuth();

  const isSubscribedTo = (tier: string) =>
    user && subscription?.status !== 'trial' && subscription?.isProOrTrial && subscription.tier === tier;

  const [searchParams, setSearchParams] = useSearchParams();
  const showTrialMessaging = !user || subscription?.status === 'none' || subscription?.status === 'trial';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigatingRef = useRef(false);

  useEffect(() => { navigatingRef.current = false; }, []);

  useEffect(() => {
    if (searchParams.get('payment') === 'cancelled') {
      toast.error('تم إلغاء عملية الدفع — يمكنك المحاولة مرة أخرى');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const renderAction = (planKey: 'essentials' | 'elite', isElite: boolean) => {
    const cancelledButActive = user && subscription?.status === 'cancelled' && subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date();
    const openPortal = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { toast.error('يرجى تسجيل الدخول'); return; }
        toast('جارٍ فتح إدارة الدفع...');
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        });
        if (!res.ok) { toast.error('تعذّر فتح إدارة الدفع'); return; }
        const { url } = await res.json();
        if (url) window.location.href = url;
      } catch { toast.error('تعذّر فتح إدارة الدفع. حاول مرة أخرى.'); }
    };

    if (cancelledButActive && subscription?.tier === planKey) {
      return (
        <button
          onClick={openPortal}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-bold',
            'border-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors'
          )}
        >
          <RefreshCw className="h-5 w-5" />
          تجديد الاشتراك
        </button>
      );
    }

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

    if (user && subscription?.status !== 'trial' && subscription?.isProOrTrial && subscription.tier !== planKey) {
      return (
        <div className="text-center text-sm text-stone-500">
          للتغيير تواصل معنا: <a href={`mailto:${SUPPORT_EMAIL}?subject=تغيير الباقة`} className="inline-flex min-h-[44px] items-center text-emerald-600 underline">{SUPPORT_EMAIL}</a>
        </div>
      );
    }

    if (user) {
      const isLoading = loadingPlan === planKey;
      return (
        <button
          onClick={async () => {
            if (navigatingRef.current) return;
            navigatingRef.current = true;
            setLoadingPlan(planKey);
            try {
              await upgradeTo(planKey, billingCycle);
            } catch {
              navigatingRef.current = false;
              setLoadingPlan(null);
              toast.error('تعذّر التحويل لصفحة الدفع — تحقق من اتصالك وحاول مرة أخرى');
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
          ) : `ابدأ تجربة ${TRIAL_DAYS} أيام مجانية`}
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
    <div className="min-h-screen bg-gradient-to-b from-white via-stone-50 to-white animate-fade-in">
      <Helmet>
        <title>أسعار واشتراكات الببتيدات | pptides</title>
        <meta name="description" content={`اختر خطتك: Essentials ${PRICING.essentials.label}/شهر أو Elite ${PRICING.elite.label}/شهر. ${TRIAL_DAYS} أيام تجربة مجانية. ضمان استرداد كامل.`} />
        <meta property="og:title" content={`أسعار pptides | ابدأ بتجربة ${TRIAL_DAYS} أيام مجانية`} />
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
        {/* Urgency Banner */}
        {showTrialMessaging && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-amber-100/50 px-5 py-3 text-center">
            <p className="text-sm font-bold text-amber-800">
              عرض محدود — التجربة المجانية متاحة لفترة محدودة
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-16 text-center">
          {showTrialMessaging && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-bold text-emerald-700">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              عرض تجريبي — جرّب {TRIAL_DAYS} أيام مجانًا
            </div>
          )}
          <h1 className="mb-4 text-3xl font-bold text-stone-900 md:text-5xl lg:text-6xl">
            استثمر في <span className="text-emerald-600">صحتك</span>
          </h1>
          {showTrialMessaging && (
            <p className="mx-auto max-w-lg text-lg text-stone-600">
              {TRIAL_DAYS} أيام تجربة مجانية مع كل اشتراك.
            </p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-stone-500">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> إلغاء في أي وقت</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 shrink-0 text-emerald-500" /> ضمان استرداد {TRIAL_DAYS} أيام</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 shrink-0 text-emerald-500" /> دفع آمن عبر Stripe</span>
          </div>
          <p className="mt-4 text-center text-sm font-medium text-stone-700">
            ضمان استرداد كامل + إلغاء في أي وقت + بدون التزام
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <span className={cn('text-sm font-semibold transition-colors', billingCycle === 'monthly' ? 'text-stone-900' : 'text-stone-500')}>شهري</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className={cn('relative h-7 w-14 rounded-full transition-colors', billingCycle === 'annual' ? 'bg-emerald-600' : 'bg-stone-300')}
            aria-label="تبديل بين شهري وسنوي"
          >
            <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', billingCycle === 'annual' ? 'start-0.5' : 'end-0.5')} />
          </button>
          <span className={cn('text-sm font-semibold transition-colors', billingCycle === 'annual' ? 'text-emerald-600' : 'text-stone-500')}>
            سنوي <span className="text-xs text-emerald-600">(وفّر حتى 33%)</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Essentials */}
          <div
            className="relative flex flex-col rounded-2xl border border-stone-300/60 bg-white p-8 md:p-10 transition-all duration-300 hover:shadow-lg hover:border-stone-400 hover:-translate-y-1"
          >
            <h2 className="mb-1 text-2xl font-bold text-stone-900">Essentials</h2>
            <p className="mb-6 text-stone-800">كل الأدوات الأساسية التي تحتاجها</p>

            <div className="mb-2">
              <span className="text-3xl font-black text-stone-900 sm:text-5xl">{billingCycle === 'annual' ? PRICING.essentials.annualLabel : PRICING.essentials.label}</span>
              <span className="text-lg text-stone-800"> /{billingCycle === 'annual' ? 'سنويًا' : 'شهريًا'}</span>
            </div>
            {billingCycle === 'monthly' && <p className="text-xs text-emerald-600 font-medium mt-1">سنوي: <span dir="ltr">{PRICING.essentials.annualLabel}</span>/سنة — وفّر 27%</p>}
            {billingCycle === 'annual' && <p className="text-xs text-emerald-600 font-medium mt-1">≈ {Math.round(PRICING.essentials.annualTotal / 12)} ر.س/شهر — وفّر 27%</p>}
            <div className="mb-6" />

            <ul className="mb-8 flex-1 space-y-3">
              {essentialsFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stone-800">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            {renderAction('essentials', false)}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-emerald-600" /> دفع آمن عبر Stripe</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-600" /> ضمان استرداد {TRIAL_DAYS} أيام</span>
            </div>
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
              <span className="text-3xl font-black text-stone-900 sm:text-5xl">{billingCycle === 'annual' ? PRICING.elite.annualLabel : PRICING.elite.label}</span>
              <span className="text-lg text-stone-800"> /{billingCycle === 'annual' ? 'سنويًا' : 'شهريًا'}</span>
            </div>
            {billingCycle === 'monthly' && <p className="text-xs text-emerald-600 font-medium mt-1">سنوي: <span dir="ltr">{PRICING.elite.annualLabel}</span>/سنة — وفّر 33%</p>}
            {billingCycle === 'annual' && <p className="text-xs text-emerald-600 font-medium mt-1">≈ {Math.round(PRICING.elite.annualTotal / 12)} ر.س/شهر — وفّر 33%</p>}
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Crown className="h-3.5 w-3.5" />
              الباقة الشاملة
            </div>
            <div className="mb-2" />

            <ul className="mb-8 flex-1 space-y-3">
              {eliteFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stone-800">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-xs font-bold text-emerald-700 mb-3">معاينة المدرب الذكي:</p>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-bl-md bg-emerald-600 px-4 py-2 text-xs text-white">أفضل ببتيد للتعافي؟</div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-br-md border border-emerald-200 bg-white px-4 py-2 text-xs text-stone-800">أنصحك بـ BPC-157 — يُسرّع شفاء الأنسجة والأوتار. الجرعة: 250-500 mcg يوميًا...</div>
                </div>
              </div>
            </div>

            {renderAction('elite', true)}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-emerald-600" /> دفع آمن عبر Stripe</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-600" /> ضمان استرداد {TRIAL_DAYS} أيام</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-800">
          يمكنك الإلغاء في أي وقت — لا التزامات ولا رسوم مخفية
        </p>

        {/* Feature Comparison Table */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-stone-900">مقارنة الباقات</h2>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-start font-semibold text-stone-700">الميزة</th>
                  <th className="px-5 py-3 text-center font-semibold text-stone-700">Essentials</th>
                  <th className="px-5 py-3 text-center font-semibold text-emerald-700">Elite</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { feature: `المكتبة (${PEPTIDE_COUNT} ببتيد)`, essentials: true, elite: true },
                  { feature: 'حاسبة الجرعات', essentials: true, elite: true },
                  { feature: 'دليل التحاليل المخبرية', essentials: true, elite: true },
                  { feature: 'البروتوكولات المُجمَّعة حسب الهدف', essentials: true, elite: true },
                  { feature: 'المدرب الذكي', essentials: false, elite: true },
                  { feature: 'استشارات بلا حدود', essentials: false, elite: true },
                  { feature: 'بروتوكولات مخصّصة', essentials: false, elite: true },
                  { feature: 'دعم مخصّص عبر البريد', essentials: false, elite: true },
                ] as const).map((row, i) => (
                  <tr key={i} className={cn('border-b border-stone-100 last:border-b-0', i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50')}>
                    <td className="px-5 py-3 font-medium text-stone-800">{row.feature}</td>
                    <td className="px-5 py-3 text-center">
                      {row.essentials
                        ? <CheckCircle className="mx-auto h-5 w-5 text-emerald-500" />
                        : <X className="mx-auto h-5 w-5 text-stone-300" />}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {row.elite
                        ? <CheckCircle className="mx-auto h-5 w-5 text-emerald-500" />
                        : <X className="mx-auto h-5 w-5 text-stone-300" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
            <div className="text-center sm:text-start">
              <p className="text-xl font-bold text-stone-900">ضمان استرداد كامل خلال {TRIAL_DAYS} أيام</p>
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
            تواصل معنا: <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[44px] items-center text-emerald-600 underline">{SUPPORT_EMAIL}</a>
          </p>
          <p className="mt-1 text-xs text-stone-800">الدعم متاح 24/7 عبر البريد الإلكتروني</p>
        </div>

        {/* Why pptides vs free */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 md:text-3xl">
            لماذا <span className="text-emerald-600">pptides</span> وليس المصادر المجانية؟
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-stone-900">المصادر المجانية</h3>
              <p className="mb-3 text-xs font-medium text-stone-500">Reddit / YouTube</p>
              <ul className="space-y-2.5 text-sm text-stone-600">
                {[
                  'محتوى إنجليزي فقط',
                  'معلومات مبعثرة وغير منظّمة',
                  'بدون أدوات حساب أو تتبّع',
                  'آراء شخصية بدون مراجعة',
                  'لا دعم — ابحث بنفسك',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-stone-900">العيادات</h3>
              <p className="mb-3 text-xs font-medium text-stone-500">استشارات مباشرة</p>
              <ul className="space-y-2.5 text-sm text-stone-600">
                {[
                  'مكلفة — 750 ر.س+ للجلسة',
                  'محدودة جغرافيًا',
                  'لا تغطي كل الببتيدات',
                  'بدون أدوات رقمية',
                  'انتظار مواعيد طويلة',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-6">
              <h3 className="mb-4 text-lg font-bold text-emerald-700">pptides</h3>
              <p className="mb-3 text-xs font-medium text-emerald-600">الكل في مكان واحد</p>
              <ul className="space-y-2.5 text-sm text-stone-800">
                {[
                  'عربي أولًا — محتوى بلغتك',
                  'مدرب ذكي بالذكاء الاصطناعي 24/7',
                  'حاسبة جرعات دقيقة',
                  'سجل حقن وتتبّع مخبري',
                  `${PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة`,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
        {!subscription?.isProOrTrial && (
        <div className="mt-16 text-center">
          {user ? (
            <button
              onClick={async () => {
                if (navigatingRef.current) return;
                navigatingRef.current = true;
                setLoadingPlan('elite');
                try {
                  await upgradeTo('elite', billingCycle);
                } catch {
                  navigatingRef.current = false;
                  setLoadingPlan(null);
                  toast.error('تعذّر التحويل لصفحة الدفع — تحقق من اتصالك وحاول مرة أخرى');
                }
              }}
              disabled={loadingPlan === 'elite'}
              className={cn(
                'btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]',
                loadingPlan === 'elite' && 'opacity-70 pointer-events-none'
              )}
            >
              {loadingPlan === 'elite' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  جارٍ التحويل لصفحة الدفع...
                </>
              ) : (
                <>
                  <span>ابدأ مع Elite الآن</span>
                  <ArrowLeft className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <Link
              to="/signup?redirect=/pricing"
              className="btn-primary-glow inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              <span>ابدأ تجربتك المجانية الآن</span>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          {showTrialMessaging && (
            <p className="mt-4 text-sm text-stone-800">{TRIAL_DAYS} أيام مجانًا — إلغاء في أي وقت</p>
          )}
        </div>
        )}

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
