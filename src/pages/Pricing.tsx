import { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CheckCircle, Shield, Lock, CreditCard, RefreshCw, ChevronDown, MessageCircle, Crown, ArrowLeft, X, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn, timeoutSignal } from '@/lib/utils';
import { PRICING, PEPTIDE_COUNT, TRIAL_DAYS, VALUE_TOTAL, VALUE_SAVINGS_ELITE, VALUE_STACK, SUPPORT_EMAIL, SITE_URL } from '@/lib/constants';
import { events } from '@/lib/analytics';
import { useSalesFlow } from '@/hooks/useSalesFlow';
import { TRIAL, REFERRAL, WINBACK, UPGRADE, COMMON, RETENTION } from '@/constants/sales-copy';

const essentialsFeatures = [
  `بطاقات البروتوكول الكاملة لـ ${PEPTIDE_COUNT} ببتيد`,
  'حاسبة الجرعات الدقيقة',
  'دليل التحاليل المخبرية (11 تحليل)',
  'البروتوكولات المُجمَّعة حسب الهدف',
  'الدليل العملي للتحضير والحقن',
  'تحديثات علمية مستمرة',
];

const eliteFeatures = [
  'كل مزايا الأساسية',
  'مدرب ذكي بالذكاء الاصطناعي 24/7',
  'بروتوكولات مخصّصة لأهدافك وحالتك الشخصية',
  'عدد كبير من الاستشارات اليومية',
  'دعم مخصّص عبر البريد',
];

const valueStack = VALUE_STACK;

const eliteValueStack = [
  { item: 'مدرب ذكاء اصطناعي شخصي', value: '184 ر.س/شهر' },
  { item: 'بروتوكول مخصّص حسب حالتك', value: '371 ر.س' },
  { item: 'عدد كبير من الاستشارات اليومية', value: '109 ر.س/شهر' },
  { item: 'دعم مخصّص عبر البريد', value: '71 ر.س/شهر' },
];

const faqs = [
  {
    q: 'ما الفرق بين الأساسية و المتقدّمة؟',
    a: 'الأساسية تعطيك كل الأدوات والمعلومات. المتقدّمة تضيف المدرب الذكي بعدد كبير من الاستشارات اليومية، بروتوكولات مخصّصة، ودعم مخصّص عبر البريد. إذا تريد استشارات كثيرة ومتابعة — المتقدّمة هي الخيار.',
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
    a: 'نعم. يمكنك إلغاء اشتراكك في أي وقت من صفحة الحساب. يتوقف التجديد التلقائي فورًا ويمكنك الاستمرار حتى نهاية الفترة المدفوعة.',
  },
  {
    q: 'كيف تعمل التجربة المجانية؟',
    a: `عند اشتراكك في أي خطة، تحصل على ${TRIAL_DAYS} أيام تجربة مجانية. ندعم Visa و Mastercard و Apple Pay عبر Stripe. يمكنك الإلغاء قبل انتهاء التجربة بدون أي رسوم.`,
  },
];

/** Map Stripe/checkout error messages to specific Arabic messages */
function mapStripeError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('card_declined') || lower.includes('card declined') || lower.includes('your card was declined'))
    return 'بطاقتك مرفوضة — جرّب بطاقة أخرى أو تواصل مع بنكك';
  if (lower.includes('network') || lower.includes('connection') || lower.includes('timeout') || lower.includes('fetch'))
    return 'مشكلة في الاتصال — حاول مجدداً';
  if (lower.includes('already_subscribed') || lower.includes('already subscribed') || lower.includes('existing subscription'))
    return 'أنت مشترك بالفعل — انتقل إلى لوحة التحكم';
  if (lower.includes('expired_card') || lower.includes('expired card'))
    return 'بطاقتك منتهية الصلاحية — استخدم بطاقة أخرى';
  if (lower.includes('insufficient_funds') || lower.includes('insufficient funds'))
    return 'رصيد غير كافٍ — تأكد من توفر الرصيد وحاول مجدداً';
  if (lower.includes('incorrect_cvc') || lower.includes('incorrect cvc'))
    return 'رمز الأمان (CVC) غير صحيح — تحقق وأعد المحاولة';
  if (lower.includes('processing_error') || lower.includes('processing error'))
    return 'خطأ في معالجة البطاقة — حاول مرة أخرى بعد دقيقة';
  if (lower.includes('authentication_required') || lower.includes('3d secure') || lower.includes('requires_action'))
    return 'بطاقتك تتطلب تحققًا إضافيًا — أكمل خطوات التحقق وحاول مجدداً';
  if (lower.includes('rate_limit') || lower.includes('rate limit') || lower.includes('too many'))
    return 'محاولات كثيرة — انتظر دقيقة وحاول مرة أخرى';
  if (lower.includes('currency') || lower.includes('sar'))
    return 'بطاقتك لا تدعم الريال السعودي — جرّب بطاقة أخرى';
  if (lower.includes('session') || lower.includes('انتهت الجلسة'))
    return 'انتهت جلستك — أعد تسجيل الدخول وحاول مجدداً';
  if (lower.includes('coupon') || lower.includes('no such coupon'))
    return 'كود الخصم غير صالح — تحقق من الكود وحاول مرة أخرى';
  return UPGRADE.checkoutError;
}

export default function Pricing() {
  const { user, subscription, upgradeTo, isLoading: authLoading } = useAuth();
  const salesFlow = useSalesFlow();
  const { offer, urlParams, checkoutCoupon, showTrialMessaging } = salesFlow;

  const isSubscribedTo = (tier: string) =>
    user && subscription?.status !== 'trial' && subscription?.isProOrTrial && subscription.tier === tier;

  // Detect if user has already used their trial (includes current trial users)
  const hasUsedTrial = user && subscription && (
    subscription.status === 'trial' ||
    subscription.status === 'active' ||
    subscription.status === 'expired' ||
    subscription.status === 'cancelled' ||
    subscription.status === 'past_due'
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycleRaw] = useState<'monthly' | 'annual'>(() => {
    try { const saved = sessionStorage.getItem('pptides_billing_cycle'); return saved === 'annual' ? 'annual' : 'monthly'; } catch { return 'monthly'; }
  });
  const setBillingCycle = useCallback((v: 'monthly' | 'annual') => { setBillingCycleRaw(v); try { sessionStorage.setItem('pptides_billing_cycle', v); } catch { /* expected */ } }, []);
  const [userCount, setUserCount] = useState(0);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const navigatingRef = useRef(false);
  const [guestCurrency, setGuestCurrency] = useState<{ code: string; rate: number; symbol: string } | null>(null);

  // Capture coupon on first render so setSearchParams({}) doesn't lose it
  const initialCouponRef = useRef(searchParams.get('coupon') || undefined);

  // Unified coupon: from URL params via SalesFlowService, fallback to initial capture
  const couponFromUrl = checkoutCoupon || offer.coupon || initialCouponRef.current;

  // Referral: from URL params or localStorage (ReferralCapture strips ?ref= from URL)
  const referralFromStorage = (() => { try { return localStorage.getItem('pptides_referral'); } catch { return null; } })();
  const hasReferral = urlParams?.referralCode || referralFromStorage;
  const referralCode = urlParams?.referralCode || referralFromStorage;

  // Dynamic Stripe preconnect — only on Pricing page
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://js.stripe.com';
    link.crossOrigin = '';
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  // GeoJS + Frankfurter: auto-detect Gulf currency for non-Saudi visitors
  useEffect(() => {
    const cached = sessionStorage.getItem('pptides_currency');
    if (cached) {
      try { setGuestCurrency(JSON.parse(cached)); } catch { /* invalid */ }
      return;
    }
    fetch('https://get.geojs.io/v1/ip/country.json')
      .then(r => r.json())
      .then(data => {
        const currencyMap: Record<string, { code: string; symbol: string }> = {
          AE: { code: 'AED', symbol: 'د.إ' },
          KW: { code: 'KWD', symbol: 'د.ك' },
          BH: { code: 'BHD', symbol: 'د.ب' },
          QA: { code: 'QAR', symbol: 'ر.ق' },
          OM: { code: 'OMR', symbol: 'ر.ع' },
        };
        const match = currencyMap[data.country];
        if (!match) return; // Saudi or unknown -- keep SAR
        return fetch(`https://api.frankfurter.app/latest?from=SAR&to=${match.code}`)
          .then(r => r.json())
          .then((fx: { rates?: Record<string, number> }) => {
            const rate = fx.rates?.[match.code];
            if (rate) {
              const currency = { ...match, rate };
              setGuestCurrency(currency);
              try { sessionStorage.setItem('pptides_currency', JSON.stringify(currency)); } catch { /* quota */ }
            }
          });
      })
      .catch(() => { /* non-blocking */ });
  }, []);

  useEffect(() => { navigatingRef.current = false; events.pricingView(); return () => { navigatingRef.current = false; }; }, []);

  // Fix: BFCache restore resets navigatingRef so checkout button works after Back
  useEffect(() => {
    const h = (e: PageTransitionEvent) => { if (e.persisted) { navigatingRef.current = false; setLoadingPlan(null); try { const saved = sessionStorage.getItem('pptides_billing_cycle'); if (saved === 'annual' || saved === 'monthly') setBillingCycle(saved); } catch { /* expected */ } } };
    window.addEventListener('pageshow', h);
    return () => window.removeEventListener('pageshow', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setBillingCycle is a stable useState setter
  }, []);

  useEffect(() => {
    let mounted = true;
    try { const c = localStorage.getItem('pptides_user_count'); if (c) setUserCount(Number(c)); } catch { /* expected */ }
    supabase.rpc('get_active_subscriber_count')
      .then(({ data }) => { if (mounted && data != null && data > 0) { setUserCount(data); try { localStorage.setItem('pptides_user_count', String(data)); } catch { /* expected */ } } })
      .catch(() => { /* RPC not available — use cached count */ });
    return () => { mounted = false; };
  }, []);

  // Auto-trigger checkout when arriving from signup redirect
  const autoCheckoutFired = useRef(false);
  useEffect(() => {
    const autoCheckout = searchParams.get('auto_checkout');
    if (autoCheckout && user && !autoCheckoutFired.current && !authLoading) {
      autoCheckoutFired.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete('auto_checkout');
      setSearchParams(next, { replace: true });
      const tier = autoCheckout === 'elite' ? 'elite' : 'essentials';
      setLoadingPlan(tier);
      navigatingRef.current = true;
      upgradeTo(tier, billingCycle, couponFromUrl).catch((err: unknown) => {
        navigatingRef.current = false;
        setLoadingPlan(null);
        const msg = err instanceof Error ? err.message : '';
        toast.error(mapStripeError(msg));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time auto-checkout on mount, guarded by autoCheckoutFired ref
  }, [searchParams, user, authLoading]);

  useEffect(() => {
    if (searchParams.get('payment') === 'cancelled') {
      toast.error(UPGRADE.paymentCancelled);
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
    }
    if (urlParams.isSetupFlow) {
      toast(TRIAL.setupToast, { duration: 6000 });
      setSearchParams({}, { replace: true });
    }
    if (urlParams.isExpiredFlow) {
      const isExpiredPaid = subscription?.status === 'expired' || subscription?.status === 'cancelled';
      toast.error(
        isExpiredPaid ? TRIAL.expiredPaidToast : TRIAL.expiredTrialToast,
        { duration: 7000 },
      );
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, urlParams.isSetupFlow, urlParams.isExpiredFlow, subscription?.status]);

  const renderAction = (planKey: 'essentials' | 'elite', isElite: boolean) => {
    if (authLoading) {
      return <div className="h-[52px] w-full animate-pulse rounded-full bg-stone-200 dark:bg-stone-700" />;
    }
    const cancelledButActive = user && subscription?.status === 'cancelled' && subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date();
    const openPortal = async () => {
      if (isLoadingPortal) return;
      setIsLoadingPortal(true);
      try {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { toast.error('يرجى تسجيل الدخول'); return; }
        toast('جارٍ فتح إدارة الدفع...');
        let res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
          method: 'POST',
          signal: timeoutSignal(15000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        });
        if (res.status === 401) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
              method: 'POST',
              signal: timeoutSignal(15000),
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshData.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
            });
          }
        }
        if (!res.ok) { toast.error('تعذّر فتح إدارة الدفع — أعد تسجيل الدخول وحاول مرة أخرى'); return; }
        const { url } = await res.json();
        if (url && typeof url === 'string' && url.startsWith('https://') && url.includes('stripe.com')) window.location.href = url;
      } catch { toast.error('تعذّر فتح إدارة الدفع. حاول مرة أخرى.'); } finally { setIsLoadingPortal(false); }
    };

    if (cancelledButActive && subscription?.tier === planKey) {
      const isReactivating = loadingPlan === planKey;
      return (
        <button
          onClick={async () => {
            if (isReactivating || navigatingRef.current) return;
            setLoadingPlan(planKey);
            try {
              await upgradeTo(planKey, billingCycle);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : '';
              toast.error(mapStripeError(msg));
            } finally {
              setLoadingPlan(null);
            }
          }}
          disabled={isReactivating}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold',
            'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors',
            isReactivating && 'opacity-70 pointer-events-none'
          )}
        >
          {isReactivating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <RefreshCw className="h-5 w-5" />}
          {RETENTION.renewCta}
        </button>
      );
    }

    if (isSubscribedTo(planKey)) {
      return (
        <div className="space-y-2">
          <div className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-bold',
            'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
          )}>
            <Check className="h-5 w-5" />
            <span>{UPGRADE.currentPlanBadge}</span>
          </div>
          <button
            onClick={openPortal}
            disabled={isLoadingPortal}
            className={cn("w-full text-center text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline min-h-[44px]", isLoadingPortal && 'opacity-70')}
          >
            {isLoadingPortal ? 'جارٍ الفتح...' : 'إدارة الاشتراك'}
          </button>
        </div>
      );
    }

    if (user && subscription?.status !== 'trial' && subscription?.isProOrTrial && subscription.tier !== planKey) {
      return (
        <button
          onClick={openPortal}
          disabled={isLoadingPortal}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold transition-all',
            isElite
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800',
            isLoadingPortal && 'opacity-70 pointer-events-none'
          )}
        >
          {isLoadingPortal ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : null}
          {isElite ? 'ترقية إلى المتقدّمة' : 'تغيير إلى الأساسية'}
        </button>
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
            events.checkoutStart(planKey, billingCycle);
            // Reset navigatingRef after 15s if checkout didn't redirect
            const navTimeout = setTimeout(() => { navigatingRef.current = false; setLoadingPlan(null); }, 15000);
            try {
              await upgradeTo(planKey, billingCycle, couponFromUrl);
            } catch (err: unknown) {
              clearTimeout(navTimeout);
              navigatingRef.current = false;
              setLoadingPlan(null);
              const msg = err instanceof Error ? err.message : '';
              const stripeMsg = mapStripeError(msg);
              toast.error(stripeMsg);
            }
          }}
          disabled={isLoading}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5',
            'text-base font-semibold transition-all duration-300',
            'hover:scale-[1.02] active:scale-[0.98]',
            isElite
              ? 'btn-primary-glow bg-emerald-600 text-white transition-colors hover:bg-emerald-700'
              : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors hover:text-emerald-700 dark:text-emerald-400',
            isLoading && 'opacity-70 pointer-events-none'
          )}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {UPGRADE.checkoutRedirecting}
            </>
          ) : hasUsedTrial ? 'اشترك الآن' : TRIAL.ctaFree}
        </button>
      );
    }

    return (
      <Link
        to={`/signup?redirect=${encodeURIComponent(`/pricing?auto_checkout=${planKey}`)}`}
        className={cn(
          'inline-flex w-full items-center justify-center rounded-full px-8 py-3.5',
          'text-base font-semibold transition-all duration-300',
          'hover:scale-[1.02] active:scale-[0.98]',
          isElite
            ? 'btn-primary-glow bg-emerald-600 text-white transition-colors hover:bg-emerald-700'
            : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors hover:text-emerald-700 dark:text-emerald-400'
        )}
      >
        {TRIAL.ctaSignup}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white dark:from-stone-950 via-stone-50 dark:via-stone-900 to-white dark:to-stone-950 animate-fade-in pb-28">
      <Helmet>
        <title>أسعار واشتراكات الببتيدات | pptides</title>
        <meta name="description" content={`اختر خطتك: الأساسية ${PRICING.essentials.label}/شهر أو المتقدّمة ${PRICING.elite.label}/شهر. ${TRIAL_DAYS} أيام تجربة مجانية. ضمان استرداد كامل.`} />
        <meta property="og:title" content={`أسعار pptides | ابدأ بتجربة ${TRIAL_DAYS} أيام مجانية`} />
        <meta property="og:description" content={`الأساسية ${PRICING.essentials.label}/شهر أو المتقدّمة ${PRICING.elite.label}/شهر. ضمان استرداد كامل.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/pricing`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:image:alt" content="pptides — دليل الببتيدات العلاجية" />
        <meta property="og:site_name" content="pptides" />
        <meta property="og:locale" content="ar_SA" />
        <link rel="canonical" href={`${SITE_URL}/pricing`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`أسعار pptides | ابدأ بتجربة ${TRIAL_DAYS} أيام مجانية`} />
        <meta name="twitter:description" content={`الأساسية ${PRICING.essentials.label}/شهر أو المتقدّمة ${PRICING.elite.label}/شهر. ضمان استرداد كامل.`} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:site" content="@pptides" />
        <meta name="twitter:creator" content="@pptides" />
        <script type="application/ld+json">{JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(f => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": { "@type": "Answer", "text": f.a }
            }))
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "الأساسية — pptides",
            "description": `اشتراك يتضمن بطاقات بروتوكول كاملة لـ ${PEPTIDE_COUNT} ببتيد، حاسبة جرعات، دليل تحاليل مخبرية، وبروتوكولات مُجمَّعة.`,
            "brand": { "@type": "Brand", "name": "pptides" },
            "offers": [
              { "@type": "Offer", "name": "شهري", "price": String(PRICING.essentials.monthly), "priceCurrency": "SAR", "availability": "https://schema.org/InStock", "url": `${SITE_URL}/pricing` },
              { "@type": "Offer", "name": "سنوي", "price": String(PRICING.essentials.annualTotal), "priceCurrency": "SAR", "availability": "https://schema.org/InStock", "url": `${SITE_URL}/pricing` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "المتقدّمة — pptides",
            "description": "اشتراك يتضمن كل مزايا الأساسية بالإضافة إلى مدرب ذكي بالذكاء الاصطناعي 24/7، بروتوكولات مخصّصة، وعدد كبير من الاستشارات اليومية.",
            "brand": { "@type": "Brand", "name": "pptides" },
            "offers": [
              { "@type": "Offer", "name": "شهري", "price": String(PRICING.elite.monthly), "priceCurrency": "SAR", "availability": "https://schema.org/InStock", "url": `${SITE_URL}/pricing` },
              { "@type": "Offer", "name": "سنوي", "price": String(PRICING.elite.annualTotal), "priceCurrency": "SAR", "availability": "https://schema.org/InStock", "url": `${SITE_URL}/pricing` },
            ],
          },
        ])}</script>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Contextual banners from SalesFlowService */}
        {hasReferral && (
          <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gift className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">صديقك دعاك!</p>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {REFERRAL.friendBanner(referralCode)}
            </p>
          </div>
        )}
        {urlParams.coupon && !hasReferral && (
          <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {WINBACK.couponBanner(offer.discountPercent ?? WINBACK.defaultPercent)}
            </p>
          </div>
        )}

        {/* Header — clean, minimal, no emojis */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl md:text-5xl leading-tight">
            بروتوكولك الشخصي يبدأ من هنا
          </h1>
          {showTrialMessaging && (
            <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-300">
              {TRIAL.subtitle}
            </p>
          )}
          {userCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {userCount.toLocaleString('ar-u-nu-latn')}+ مشترك نشط الآن
            </div>
          )}
          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6 text-sm text-stone-500 dark:text-stone-300">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 text-emerald-600" /> {COMMON.cancelAnytime}</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 shrink-0 text-emerald-600" /> {COMMON.moneyBackGuarantee}</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 shrink-0 text-emerald-600" /> {COMMON.safePayment}</span>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={cn('text-sm font-semibold transition-colors duration-200', billingCycle === 'monthly' ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-300')}>شهري</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className={cn('relative h-8 w-16 shrink-0 rounded-full transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2', billingCycle === 'annual' ? 'bg-emerald-600 shadow-md shadow-emerald-500/30' : 'bg-stone-300 dark:bg-stone-600')}
            aria-label="تبديل بين شهري وسنوي"
            aria-checked={billingCycle === 'annual'}
            role="switch"
          >
            <span className={cn('billing-toggle-thumb absolute top-1 h-6 w-6 rounded-full bg-white shadow-md', billingCycle === 'annual' ? 'end-1' : 'start-1')} />
          </button>
          <span className={cn('flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200', billingCycle === 'annual' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-300')}>
            سنوي
            <span className={cn('inline-flex items-center text-xs font-bold rounded-full px-2 py-0.5 leading-none transition-all duration-200', billingCycle === 'annual' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-emerald-600')}>وفّر حتى 33%</span>
            {billingCycle === 'annual' && (
              <span className="inline-flex items-center text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 leading-none animate-fade-in">
                شهرين مجاناً — وفّر ~33%
              </span>
            )}
          </span>
        </div>

        {/* Doctor visit cost anchor */}
        <div className="mt-6 mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-5 py-2 text-sm text-stone-600 dark:text-stone-300 shadow-sm">
            <span>طبيب: <span className="font-bold text-stone-800 dark:text-stone-200">500+ ر.س/جلسة</span></span>
            <span className="text-stone-300 dark:text-stone-600">|</span>
            <span>pptides الأساسية: <span className="font-bold text-emerald-700 dark:text-emerald-400">1.1 ر.س/يوم</span></span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Essentials */}
          <div
            className="pricing-card relative flex flex-col rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-8 shadow-lg md:p-10"
          >
            <div className="mb-4 flex justify-center gap-2">
              <span className="rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-bold text-white shadow-md">
                الأكثر شعبية
              </span>
              {showTrialMessaging && !hasUsedTrial && (
                <span className="inline-flex flex-col items-center">
                  <span className="rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                    {TRIAL_DAYS} أيام مجانًا
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">(بطاقة بنكية مطلوبة)</span>
                </span>
              )}
            </div>
            <h2 className="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-100">الأساسية</h2>
            <p className="mb-6 text-stone-600 dark:text-stone-300">كل ما تحتاجه لتبدأ بثقة وبروتوكول واضح</p>

            <div className="mb-1">
              <span className="price-huge text-stone-900 dark:text-stone-100">{billingCycle === 'annual' ? PRICING.essentials.annualLabel : PRICING.essentials.label}</span>
              <span className="text-lg text-stone-600 dark:text-stone-300"> /{billingCycle === 'annual' ? 'سنويًا' : 'شهريًا'}</span>
            </div>
            {guestCurrency && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1" dir="ltr">
                ≈ {((billingCycle === 'monthly' ? PRICING.essentials.monthly : PRICING.essentials.annualTotal) * guestCurrency.rate).toFixed(1)} {guestCurrency.symbol}
              </p>
            )}
            {billingCycle === 'monthly' && <p className="mb-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">~١.١ ر.س/يوم</p>}
            {billingCycle === 'monthly' && <p className="mb-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">سنوي: <span dir="ltr">{PRICING.essentials.annualLabel}</span>/سنة — وفّر 27%</p>}
            {billingCycle === 'annual' && (
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">≈ {Math.round(PRICING.essentials.annualTotal / 12)} ر.س/شهر</p>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  وفّر {PRICING.essentials.monthly * 12 - PRICING.essentials.annualTotal} ر.س
                </span>
              </div>
            )}
            <div className="mb-4" />

            <ul className="mb-8 flex-1 space-y-3">
              {essentialsFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stone-800 dark:text-stone-200">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            {renderAction('essentials', false)}
          </div>

          {/* Elite */}
          <div
            className="pricing-card pricing-card-featured relative flex flex-col rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 p-8 md:p-10"
            style={{ animation: 'pricing-elite-glow 3s ease-in-out infinite' }}
          >
            <div className="mb-4 flex justify-center gap-2">
              <span className="rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-bold text-white shadow-md">
                الأفضل قيمة
              </span>
              {showTrialMessaging && !hasUsedTrial && (
                <span className="inline-flex flex-col items-center">
                  <span className="rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                    {TRIAL_DAYS} أيام مجانًا
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">(بطاقة بنكية مطلوبة)</span>
                </span>
              )}
            </div>

            <h2 className="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-100">المتقدّمة</h2>
            <p className="mb-6 text-stone-800 dark:text-stone-200">مدربك الشخصي + بروتوكول مفصّل على حالتك</p>

            <div className="mb-1">
              <span className="price-huge text-stone-900 dark:text-stone-100">{billingCycle === 'annual' ? PRICING.elite.annualLabel : PRICING.elite.label}</span>
              <span className="text-lg text-stone-600 dark:text-stone-300"> /{billingCycle === 'annual' ? 'سنويًا' : 'شهريًا'}</span>
            </div>
            {guestCurrency && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1" dir="ltr">
                ≈ {((billingCycle === 'monthly' ? PRICING.elite.monthly : PRICING.elite.annualTotal) * guestCurrency.rate).toFixed(1)} {guestCurrency.symbol}
              </p>
            )}
            {billingCycle === 'monthly' && <p className="mb-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">~١٢.٤ ر.س/يوم</p>}
            {billingCycle === 'monthly' && <p className="mb-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">سنوي: <span dir="ltr">{PRICING.elite.annualLabel}</span>/سنة — وفّر 33%</p>}
            {billingCycle === 'annual' && (
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">≈ {Math.round(PRICING.elite.annualTotal / 12)} ر.س/شهر</p>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  وفّر {PRICING.elite.monthly * 12 - PRICING.elite.annualTotal} ر.س
                </span>
              </div>
            )}
            <div className="mb-2" />

            <ul className="mb-8 flex-1 space-y-3">
              {eliteFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-stone-800 dark:text-stone-200">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 p-4">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-3">معاينة المدرب الذكي:</p>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-bl-md bg-emerald-600 px-4 py-2 text-xs text-white">أفضل ببتيد للتعافي؟</div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-br-md border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 px-4 py-2 text-xs text-stone-800 dark:text-stone-200">أنصحك بـ BPC-157 — يُسرّع شفاء الأنسجة والأوتار. الجرعة: 250-500 mcg يوميًا...</div>
                </div>
              </div>
            </div>

            {renderAction('elite', true)}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500 dark:text-stone-300">
              <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> دفع آمن عبر Stripe</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> ضمان استرداد {TRIAL_DAYS} أيام</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-800 dark:text-stone-200">
          {COMMON.noCommitments}
        </p>

        {/* Refund guarantee badge */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-2.5 shadow-sm">
            <Shield className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">ضمان استرداد 100% — بدون أسئلة</span>
          </div>
        </div>

        {/* vs ChatGPT callout */}
        <div className="mt-6 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-4 text-center">
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200 mb-1">لماذا ليس ChatGPT؟</p>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            ChatGPT لا يعرف بروتوكولك، لا يتابع تقدّمك، لا يحذّرك من التفاعلات
          </p>
        </div>

        {/* Free Tier Teaser */}
        <div className="mt-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 p-5 text-center">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            هل تريد تجربة المنصة قبل الاشتراك؟{' '}
            <Link to="/library" className="text-emerald-700 dark:text-emerald-400 underline underline-offset-2">
              تصفّح 7 ببتيدات مجانًا
            </Link>{' '}
            — بدون بطاقة بنكية
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-300">يشمل BPC-157 و Semaglutide و Epithalon وغيرها</p>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-stone-900 dark:text-stone-100">مقارنة الباقات</h2>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
                  <th className="px-5 py-3 text-start font-semibold text-stone-700 dark:text-stone-200">الميزة</th>
                  <th className="px-5 py-3 text-center font-semibold text-stone-700 dark:text-stone-200">الأساسية</th>
                  <th className="px-5 py-3 text-center font-semibold text-emerald-700 dark:text-emerald-400">المتقدّمة</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { feature: `المكتبة (${PEPTIDE_COUNT} ببتيد)`, essentials: true, elite: true },
                  { feature: 'حاسبة الجرعات', essentials: true, elite: true },
                  { feature: 'دليل التحاليل المخبرية', essentials: true, elite: true },
                  { feature: 'البروتوكولات المُجمَّعة حسب الهدف', essentials: true, elite: true },
                  { feature: 'المدرب الذكي', essentials: false, elite: true },
                  { feature: 'عدد كبير من الاستشارات اليومية', essentials: false, elite: true },
                  { feature: 'بروتوكولات مخصّصة', essentials: false, elite: true },
                  { feature: 'دعم مخصّص عبر البريد', essentials: false, elite: true },
                ] as const).map((row, i) => (
                  <tr key={i} className={cn('border-b border-stone-100 dark:border-stone-700 last:border-b-0', i % 2 === 0 ? 'bg-white dark:bg-stone-900' : 'bg-stone-50/50')}>
                    <td className="px-5 py-3 font-medium text-stone-800 dark:text-stone-200">{row.feature}</td>
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
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-stone-100 md:text-3xl">
            ماذا تحصل مع <span className="text-emerald-700 dark:text-emerald-400">الأساسية</span>؟
          </h2>
          <div className="space-y-2">
            {valueStack.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-900 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-medium text-stone-800 dark:text-stone-200">{item.item}</span>
                </div>
                <span className="text-sm font-bold text-stone-800 dark:text-stone-200 line-through">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-stone-800 dark:text-stone-200">القيمة الإجمالية: <span className="font-bold text-stone-800 dark:text-stone-200 line-through">{VALUE_TOTAL}</span></p>
            <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">أنت تدفع فقط {PRICING.essentials.label}/شهريًا</p>
          </div>
        </div>

        {/* Value Stack — Elite */}
        <div
          className="mt-16"
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-stone-100 md:text-3xl">
            ماذا يضيف <span className="text-emerald-700 dark:text-emerald-400">المتقدّمة</span>؟
          </h2>
          <div className="space-y-2">
            {eliteValueStack.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/20 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-medium text-stone-800 dark:text-stone-200">{item.item}</span>
                </div>
                <span className="text-sm font-bold text-stone-800 dark:text-stone-200 line-through">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-stone-800 dark:text-stone-200">القيمة الإضافية: <span className="font-bold text-stone-800 dark:text-stone-200 line-through">{VALUE_SAVINGS_ELITE}/شهريًا</span></p>
            <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">كل شيء بـ {PRICING.elite.label}/شهريًا فقط</p>
          </div>
        </div>

        {/* Money-back guarantee */}
        <div
          className="mt-16 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 p-8"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800/30">
              <Shield className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-center sm:text-start">
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">ضمان استرداد كامل خلال {TRIAL_DAYS} أيام</p>
              <p className="mt-1 text-stone-800 dark:text-stone-200">
                إذا لم يعجبك المحتوى خلال {TRIAL_DAYS} أيام — نرجّع لك كل ريال. بدون أسئلة. بدون شروط. المخاطرة علينا.
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
            <div key={text} className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-900 p-5 text-center">
              <Icon className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{text}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div
          className="mt-8 rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-900 p-6 text-center"
        >
          <MessageCircle className="mx-auto mb-3 h-6 w-6 text-emerald-700 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            تواصل معنا: <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[44px] items-center text-emerald-700 dark:text-emerald-400 underline">{SUPPORT_EMAIL}</a>
          </p>
          <p className="mt-1 text-xs text-stone-800 dark:text-stone-200">الدعم متاح 24/7 عبر البريد الإلكتروني</p>
        </div>

        {/* Why pptides vs free */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-stone-100 md:text-3xl">
            لماذا <span className="text-emerald-700 dark:text-emerald-400">pptides</span> وليس المصادر المجانية؟
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6">
              <h3 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">المصادر المجانية</h3>
              <p className="mb-3 text-xs font-medium text-stone-500 dark:text-stone-300">Reddit / YouTube</p>
              <ul className="space-y-2.5 text-sm text-stone-600 dark:text-stone-300">
                {[
                  'محتوى إنجليزي فقط',
                  'معلومات مبعثرة وغير منظّمة',
                  'بدون أدوات حساب أو تتبّع',
                  'آراء شخصية بدون مراجعة',
                  'لا دعم — ابحث بنفسك',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6">
              <h3 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">العيادات</h3>
              <p className="mb-3 text-xs font-medium text-stone-500 dark:text-stone-300">استشارات مباشرة</p>
              <ul className="space-y-2.5 text-sm text-stone-600 dark:text-stone-300">
                {[
                  'مكلفة — 750 ر.س+ للجلسة',
                  'محدودة جغرافيًا',
                  'لا تغطي كل الببتيدات',
                  'بدون أدوات رقمية',
                  'انتظار مواعيد طويلة',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 p-6">
              <h3 className="mb-4 text-lg font-bold text-emerald-700 dark:text-emerald-400">pptides</h3>
              <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">الكل في مكان واحد</p>
              <ul className="space-y-2.5 text-sm text-stone-800 dark:text-stone-200">
                {[
                  'عربي أولًا — محتوى بلغتك',
                  'مدرب ذكي بالذكاء الاصطناعي 24/7',
                  'حاسبة جرعات دقيقة',
                  'سجل حقن وتتبّع مخبري',
                  `${PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة`,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
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
          <h2 className="mb-8 text-center text-2xl font-bold text-stone-900 dark:text-stone-100">أسئلة شائعة</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-900 transition-all hover:border-stone-400 dark:hover:border-stone-600/60">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-semibold text-stone-800 dark:text-stone-200">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-4 w-4 text-stone-800 dark:text-stone-200 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-stone-800 dark:text-stone-200">{faq.a}</p>
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
                events.checkoutStart('elite', billingCycle);
                try {
                  await upgradeTo('elite', billingCycle, couponFromUrl);
                } catch (err: unknown) {
                  navigatingRef.current = false;
                  setLoadingPlan(null);
                  const msg = err instanceof Error ? err.message : '';
                  const stripeMsg = mapStripeError(msg);
                  toast.error(stripeMsg);
                }
              }}
              disabled={loadingPlan === 'elite'}
              className={cn(
                'btn-primary-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] sm:w-auto sm:px-10 sm:py-4 sm:text-lg',
                loadingPlan === 'elite' && 'opacity-70 pointer-events-none'
              )}
            >
              {loadingPlan === 'elite' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {UPGRADE.checkoutRedirecting}
                </>
              ) : (
                <>
                  <span>{hasUsedTrial ? 'اشترك الآن' : TRIAL.bottomCta}</span>
                  <ArrowLeft className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <Link
              to={`/signup?redirect=${encodeURIComponent('/pricing?auto_checkout=elite')}`}
              className="btn-primary-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
            >
              <span>{TRIAL.signupBottomCta}</span>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          {showTrialMessaging && (
            <p className="mt-4 text-sm text-stone-800 dark:text-stone-200">{TRIAL.bottomCtaFinePrint}</p>
          )}
        </div>
        )}

        <style>{`
          @keyframes pricing-elite-glow {
            0%, 100% { box-shadow: 0 4px 6px -1px rgba(16,185,129,0.05), 0 0 0 0 rgba(16,185,129,0); }
            50% { box-shadow: 0 10px 25px -5px rgba(16,185,129,0.12), 0 0 20px 0 rgba(16,185,129,0.06); }
          }
          @media (prefers-reduced-motion: reduce) { .pricing-card-featured { animation: none !important; } }
        `}</style>

        {/* Disclaimer */}
        <p
          className="mt-10 text-center text-sm text-stone-600 dark:text-stone-300 leading-relaxed"
        >
          تنويه طبي: المحتوى المقدّم في هذا الموقع لأغراض تعليمية فقط ولا يُعدّ بديلًا عن
          الاستشارة الطبية المتخصصة. استشر طبيبك قبل استخدام أي ببتيد أو مكمّل.
        </p>
      </div>

      {/* Mobile sticky CTA */}
      {!subscription?.isProOrTrial && (
        <div className="fixed bottom-14 inset-x-0 z-50 border-t border-stone-200 dark:border-stone-700 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-3 md:hidden pb-[env(safe-area-inset-bottom)]">
          {user ? (
            <button
              onClick={async () => {
                if (navigatingRef.current) return;
                navigatingRef.current = true;
                setLoadingPlan('elite');
                events.checkoutStart('elite', billingCycle);
                try {
                  await upgradeTo('elite', billingCycle, couponFromUrl);
                } catch (err: unknown) {
                  navigatingRef.current = false;
                  setLoadingPlan(null);
                  const msg = err instanceof Error ? err.message : '';
                  toast.error(mapStripeError(msg));
                }
              }}
              disabled={loadingPlan === 'elite'}
              className={cn(
                'btn-primary-glow flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700',
                loadingPlan === 'elite' && 'opacity-70 pointer-events-none'
              )}
            >
              {loadingPlan === 'elite' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {UPGRADE.checkoutRedirecting}
                </>
              ) : (
                hasUsedTrial ? 'اشترك الآن' : TRIAL.ctaFree
              )}
            </button>
          ) : (
            <Link
              to={`/signup?redirect=${encodeURIComponent('/pricing?auto_checkout=elite')}`}
              className="btn-primary-glow flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700"
            >
              {TRIAL.ctaSignup}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
