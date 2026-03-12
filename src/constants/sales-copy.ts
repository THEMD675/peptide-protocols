/**
 * sales-copy.ts — Single source of truth for ALL Arabic sales/discount/offer strings.
 *
 * Every page that shows pricing, discounts, referrals, retention, or upgrade prompts
 * MUST import from here. No hardcoded Arabic sales copy elsewhere.
 */

import { PRICING, PEPTIDE_COUNT, TRIAL_DAYS } from '@/lib/constants';

// ─── Trial ──────────────────────────────────────────────────
export const TRIAL = {
  /** Banner: days remaining in trial */
  bannerDaysLeft: (daysText: string) =>
    `تبقّى ${daysText} في تجربتك المجانية — اشترك بـ ${PRICING.essentials.label}/شهر قبل انتهاء الوصول`,
  /** Banner: last day urgency */
  bannerLastDay: 'آخر يوم في تجربتك — لا تفقد الوصول',
  /** CTA on pricing page */
  ctaFree: `جرّب مجانًا ${TRIAL_DAYS} أيام — بدون أي رسوم`,
  /** CTA for non-logged-in users */
  ctaSignup: 'سجّل الآن وجرّب مجانًا',
  /** Pricing page subtitle */
  subtitle: `${TRIAL_DAYS} أيام مجانية — جرّب كل الأدوات بدون مخاطرة.`,
  /** Post-trial setup toast */
  setupToast: 'أكمل إعداد حسابك لبدء التجربة المجانية',
  /** Expired trial toast */
  expiredTrialToast: 'انتهت فترة تجربتك المجانية — اختر خطة للاستمرار',
  /** Expired paid toast */
  expiredPaidToast: 'انتهى اشتراكك — جدّده للعودة إلى الوصول الكامل',
  /** Payment wall banner */
  paymentWallBanner: 'أدخل بيانات الدفع لتفعيل تجربتك المجانية — لن يتم خصم أي مبلغ خلال 3 أيام',
  /** Payment wall modal title */
  paymentWallTitle: 'أكمل إعداد حسابك',
  /** Payment wall modal description */
  paymentWallDesc: 'أكمل إعداد حسابك لبدء التجربة المجانية',
  /** Payment wall modal fine print */
  paymentWallFinePrint: 'لن يتم خصم أي مبلغ خلال 3 أيام — يمكنك الإلغاء في أي وقت',
  /** Payment wall CTA */
  paymentWallCta: 'أدخل بيانات الدفع',
  /** Expired modal title (trial) */
  expiredModalTitleTrial: 'انتهت تجربتك المجانية',
  /** Expired modal title (paid) */
  expiredModalTitlePaid: 'انتهت صلاحية اشتراكك',
  /** Expired modal body */
  expiredModalBody: `لا تخسر تقدّمك — اشترك الآن للاحتفاظ ببياناتك والوصول لـ ${PEPTIDE_COUNT}+ بروتوكول، المدرب الذكي، وجميع الأدوات`,
  /** Expired banner (trial) */
  expiredBannerTrial: 'انتهت تجربتك المجانية — اشترك للوصول لكل المحتوى',
  /** Expired banner (paid) */
  expiredBannerPaid: 'انتهت صلاحية اشتراكك — جدّد للوصول لكل المحتوى',
  /** "Start free trial" button */
  startTrialCta: 'ابدأ تجربتك المجانية',
  /** Bottom CTA on pricing */
  bottomCta: 'انطلق مع المتقدّمة — ابدأ مجانًا',
  /** Bottom CTA fine print */
  bottomCtaFinePrint: `${TRIAL_DAYS} أيام مجانًا — إلغاء بضغطة واحدة، بدون أسئلة`,
  /** Signup CTA bottom pricing */
  signupBottomCta: `سجّل الآن — ${TRIAL_DAYS} أيام مجانًا`,
} as const;

// ─── Referral ───────────────────────────────────────────────
export const REFERRAL = {
  /** Section heading on landing + account */
  heading: 'ادعُ صديقًا واحصل على مكافأة',
  /** Section description — what both parties get */
  description: 'ادعُ صديقك — يحصل على خصم 40% على شهره الثاني، وأنت تحصل على شهر مجاني!',
  /** Account page heading (slightly different) */
  accountHeading: 'ادعُ صديقًا واحصل على شهر مجاني',
  /** Account page description */
  accountDescription: 'ادعُ صديقك — يحصل على خصم 40% على شهره الثاني، وأنت تحصل على شهر مجاني تلقائيًا!',
  /** CTA for logged-in users on landing */
  ctaLoggedIn: 'احصل على رابط إحالتك',
  /** CTA for visitors on landing */
  ctaVisitor: 'سجّل الآن لتحصل على رابطك',
  /** Friend's context on pricing page when arriving via referral */
  friendBanner: (refCode: string) =>
    `صديقك دعاك عبر كود ${refCode} — سعرك العادي الآن، وخصم 40% يبدأ من الشهر الثاني تلقائيًا`,
  /** Copy success toast */
  copySuccess: 'تم نسخ رابط الإحالة',
  /** Referral stats label */
  statsLabel: 'إحصائيات الإحالة',
  /** Stats: invites */
  statsInvites: 'دعوات',
  /** Stats: signed up */
  statsSignedUp: 'سجّلوا',
  /** Stats: rewards */
  statsRewarded: 'مكافآت',
  /** Reward codes section title */
  rewardCodesTitle: 'أكواد المكافآت الخاصة بك',
  /** Reward codes description */
  rewardCodesDesc: 'استخدم هذه الأكواد عند الدفع للحصول على شهر مجاني',
  /** Your referral code label */
  yourCodeLabel: (code: string) => `كود الإحالة الخاص بك: ${code}`,
  /** WhatsApp share text template */
  shareText: (url: string) =>
    `جرّب pptides — أشمل دليل عربي للببتيدات العلاجية مع مدرب ذكي وحاسبة جرعات\n${url}`,
} as const;

// ─── Retention (cancel flow) ────────────────────────────────
export const RETENTION = {
  /** Retention offer heading */
  heading: 'هل أنت متأكد؟',
  /** Special offer badge */
  offerBadge: 'عرض خاص لك!',
  /** Retention offer body */
  offerBody: 'نقدّر وجودك — خصم 20% على اشتراكك القادم إذا بقيت معنا',
  /** Accept retention CTA */
  acceptCta: 'احصل على خصم 20%',
  /** Retention applied success toast */
  appliedToast: 'تم تطبيق الخصم — 20% خصم على اشتراكك القادم!',
  /** Retention failed toast */
  failedToast: 'تعذّر تطبيق الخصم — جرّب لاحقًا',
  /** Cancel reason prompt */
  selectReason: 'اختر سبب الإلغاء',
  /** Keep subscription CTA */
  keepCta: 'الاحتفاظ بالاشتراك',
  /** Proceed with cancellation */
  proceedCancel: 'متابعة الإلغاء',
  /** Cancelling in progress */
  cancellingText: 'جارٍ الإلغاء...',
  /** Pause option */
  pauseOption: 'إيقاف مؤقت',
  /** Pause toast */
  pauseToast: 'يمكنك إيقاف اشتراكك مؤقتًا لمدة شهر. تواصل معنا عبر contact@pptides.com لطلب الإيقاف.',
  /** "You will lose" heading */
  loseHeading: 'ستفقد:',
  /** Loss items */
  loseProtocols: `الوصول إلى ${PEPTIDE_COUNT}+ بروتوكول كامل`,
  loseCoach: 'المدرب الذكي بالذكاء الاصطناعي',
  loseAccess: 'الوصول الكامل بعد انتهاء الفترة الحالية',
  /** Cancelled banner */
  cancelledBanner: 'اشتراكك ملغي — ستحتفظ بالوصول حتى نهاية الفترة الحالية.',
  /** Cancelled banner (no access remaining) */
  cancelledBannerNoAccess: 'تم إلغاء اشتراكك',
  /** Resubscribe CTA */
  resubscribeCta: 'أعد الاشتراك',
  /** Renew CTA */
  renewCta: 'تجديد الاشتراك',
} as const;

// ─── Win-back (for cancelled/expired users) ─────────────────
export const WINBACK = {
  /** Pricing page banner when arriving with coupon param */
  couponBanner: (percent: number) =>
    `عرض خاص — خصم ${percent}% على اشتراكك! الكود مُطبّق تلقائيًا.`,
  /** Default win-back coupon percent */
  defaultPercent: 20,
} as const;

// ─── Upgrade prompts (dashboard, various) ───────────────────
export const UPGRADE = {
  /** Dashboard prompt: no subscription */
  noSubPrompt: 'اشترك للوصول إلى كل البروتوكولات والأدوات',
  /** Dashboard prompt: generic */
  genericPrompt: 'اشترك للإضافة والتعديل',
  /** Subscribe now CTA */
  subscribeCta: 'اشترك الآن',
  /** Pricing page: current subscription badge */
  currentPlanBadge: 'اشتراكك الحالي',
  /** Change plan text */
  changePlanText: 'للتغيير تواصل معنا:',
  /** Checkout redirect loading */
  checkoutRedirecting: 'جارٍ التحويل لصفحة الدفع...',
  /** Checkout error */
  checkoutError: 'تعذّر التحويل لصفحة الدفع — تحقق من اتصالك وحاول مرة أخرى',
  /** Payment cancelled */
  paymentCancelled: 'تم إلغاء عملية الدفع — يمكنك المحاولة مرة أخرى',
  /** Subscribers-only modal */
  subscribersOnlyTitle: 'محتوى للمشتركين فقط',
  /** Subscribers-only body */
  subscribersOnlyBody: `اشترك للوصول إلى ${PEPTIDE_COUNT}+ بروتوكول، المدرب الذكي، وجميع الأدوات`,
  /** Past due banner */
  pastDueBanner: 'تعذّر تحصيل الدفعة —',
  /** Past due update CTA */
  pastDueUpdateCta: 'إعدادات الحساب',
  /** Past due days left */
  pastDueDaysLeft: (days: number) =>
    ` متبقي ${days} ${days <= 2 ? (days === 1 ? 'يوم' : 'يومان') : 'أيام'} لتحديث وسيلة الدفع.`,
  /** Payment success toast */
  paymentSuccessToast: 'تم تفعيل اشتراكك بنجاح!',
  /** Reactivated toast */
  reactivatedToast: 'تم إعادة تفعيل اشتراكك بنجاح!',
} as const;

// ─── Common / shared ────────────────────────────────────────
export const COMMON = {
  /** "Cancel anytime" */
  cancelAnytime: 'إلغاء في أي وقت',
  /** Money-back guarantee */
  moneyBackGuarantee: `ضمان استرداد ${TRIAL_DAYS} أيام`,
  /** Safe payment */
  safePayment: 'دفع آمن عبر Stripe',
  /** No commitments */
  noCommitments: 'يمكنك الإلغاء في أي وقت — لا التزامات ولا رسوم مخفية',
  /** Back button */
  back: 'رجوع',
  /** Complete setup CTA */
  completeSetup: 'أكمل الإعداد',
  /** Login required */
  loginRequired: 'يرجى تسجيل الدخول أولًا',
} as const;
