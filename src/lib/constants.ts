// PERF: These values are hardcoded to avoid importing peptides.ts (145KB) in the main bundle.
// Update manually when adding/removing peptides or changing isFree/pubmedIds fields.
// Last synced: 2026-03-14 (47 peptides, 7 free, 127 PubMed IDs)

/** Free peptide IDs — peptides with isFree: true in src/data/peptides.ts */
export const FREE_PEPTIDE_IDS = new Set([
  'semaglutide', 'bpc-157', 'kisspeptin-10', 'semax', 'epithalon', 'collagen-peptides', 'snap-8',
]);

export const PRICING = {
  essentials: { monthly: 34, label: '34 ر.س', annualMonthly: Math.round(296 / 12), annualTotal: 296, annualLabel: '296 ر.س' },
  elite: { monthly: 371, label: '371 ر.س', annualMonthly: Math.round(2963 / 12), annualTotal: 2963, annualLabel: '2,963 ر.س' },
} as const;

/** Total peptide count — update when adding/removing peptides */
export const PEPTIDE_COUNT = 47;

/** Unique PubMed ID count across all peptides — update when pubmedIds change */
export const PUBMED_SOURCE_COUNT = 127;
export const PUBMED_SOURCE_LABEL = `${PUBMED_SOURCE_COUNT}+`;

export const FREQUENCY_LABELS: Record<string, string> = {
  od: 'مرة يوميًا',
  bid: 'مرتين يوميًا',
  tid: 'ثلاث مرات يوميًا',
  weekly: 'مرة أسبوعيًا',
  biweekly: 'مرتين أسبوعيًا',
  'daily-10': '10 أيام من 14',
  'daily-20': '20 يوم من 28',
  prn: 'عند الحاجة',
};

export const VALUE_TOTAL = '1,121 ر.س+';
export const VALUE_SAVINGS_ESSENTIALS = '1,087 ر.س';
export const VALUE_SAVINGS_ELITE = '750 ر.س+';

export const REFERRAL_CODE_REGEX = /^PP-[A-Z0-9]{6}$/i;

export const SUPPORT_EMAIL = 'contact@pptides.com';
// Admin check uses truncated SHA-256 hashes so emails aren't in the client bundle.
// Real authorization is enforced server-side in edge functions.
const ADMIN_HASHES = new Set(['9caf029e7d15881b','be5d3d48617efe3a','0537e83ca68d6f5e','2a9065084fdeea45']);
async function hashEmail(email: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
export async function isAdmin(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  return ADMIN_HASHES.has(await hashEmail(email));
}
// Synchronous version for initial render — populated after first async check
let _cachedIsAdmin = false;
export function isAdminSync(): boolean { return _cachedIsAdmin; }
export function setAdminCache(v: boolean): void { _cachedIsAdmin = v; }
export const USD_TO_SAR = 3.75;

/** Free peptides + trial-exclusive peptides. The 5 IDs below are hardcoded trial-exclusive peptides (beyond FREE_PEPTIDE_IDS) — not in the free tier, but available during trial. */
export const TRIAL_PEPTIDE_IDS = new Set([
  ...FREE_PEPTIDE_IDS,
  'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq',
]);

export const LEGAL_LAST_UPDATED = '25 فبراير 2026';

export const TIER_LABELS: Record<string, string> = {
  free: 'مجاني',
  essentials: 'أساسي',
  elite: 'متقدم',
};

export const STATUS_LABELS: Record<string, string> = {
  trial: 'فترة تجريبية',
  active: 'نشط',
  past_due: 'مشكلة في الدفع',
  cancelled: 'ملغي',
  expired: 'منتهي',
  none: 'بدون اشتراك',
};

/** Routes any user can access without subscription — single source of truth for TrialBanner and gating */
export const FREE_ROUTE_PREFIXES = [
  '/calculator', '/pricing', '/login', '/signup', '/privacy', '/terms', '/',
  '/glossary', '/sources', '/community', '/account',
  '/library', '/table', '/stacks', '/guide',
  '/about', '/faq', '/quiz', '/blog', '/contact', '/transparency',
] as const;

export function isFreeRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  return FREE_ROUTE_PREFIXES.some(p => p === pathname || (p !== '/' && pathname.startsWith(p + '/')));
}

/** Routes a trial user without payment method can visit. Restricted -- card details required for product access. */
export const PAYMENT_WALL_ROUTE_PREFIXES = ['/', '/pricing', '/account', '/login', '/signup', '/privacy', '/terms', '/contact'] as const;

export function isPaymentWallFreeRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  return PAYMENT_WALL_ROUTE_PREFIXES.some(p => p === pathname || (p !== '/' && pathname.startsWith(p + '/')));
}

export const STORAGE_KEYS = {
  AGE_VERIFIED: 'pptides_age_verified',
  COOKIE_CONSENT: 'pptides_cookie_consent',
  FAVORITES: 'pptides_favorites',
  QUIZ_RESULTS: 'pptides_quiz_results',
  CALC_HISTORY: 'pptides_calc_history',
  VISITED_PAGES: 'pptides_visited',
  COACH_HISTORY_PREFIX: 'pptides_coach_',
  CHUNK_RELOAD: 'pptides_chunk_reload',
  COMPARE: 'pptides_compare',
  STICKY_DISMISSED: 'pptides_sticky_dismissed',
  EXIT_POPUP: 'pptides_exit_popup_shown',
  USER_COUNT: 'pptides_user_count',
  USER_COUNT_TS: 'pptides_user_count_ts',
  REVIEWS: 'pptides_reviews',
  REVIEWS_TS: 'pptides_reviews_ts',
  REFERRAL: 'pptides_referral',
  ONBOARDED: 'pptides_onboarded',
  CALENDAR_PREF: 'pptides_calendar_pref',
  PREMIUM_WELCOMED: 'pptides_premium_welcomed',
  COACH_DRAFT: 'pptides_coach_draft',
  CONTACT_DRAFT: 'pptides_contact_draft',
  RECENT_PEPTIDES: 'pptides_recent_peptides',
  UPVOTED: 'pptides_upvoted',
  COMMUNITY_DRAFT: 'pptides_community_draft',
  COACH_STEP: 'pptides_coach_step',
  COACH_INTAKE: 'pptides_coach_intake',
  DEEPSEEK_CONSENT: 'pptides_deepseek_consent',
  ANALYTICS_SESSION: 'pptides_analytics_session',
  AGE_OK: 'pptides_age_ok',
  BILLING_CYCLE: 'pptides_billing_cycle',
  BLOG_CACHE: 'pptides_cache_blog_posts',
  CC: 'pptides_cc',
  CELEBRATIONS: 'pptides_celebrations',
  CHECKLIST_DISMISSED: 'pptides_checklist_dismissed',
  COACH_INTAKE_ANON: 'pptides_coach_intake_anon',
  COACH_STEP_ANON: 'pptides_coach_step_anon',
  CURRENCY: 'pptides_currency',
  FAILED_ATTEMPTS: 'pptides_failed_attempts',
  INJECTION_REMINDER: 'pptides_injection_reminder',
  INSTALL_DISMISSED: 'pptides_install_dismissed',
  LAB_DRAFT: 'pptides_lab_draft',
  LOCKOUT_UNTIL: 'pptides_lockout_until',
  QUIZ_ANSWERS: 'pptides_quiz_answers',
  QUIZ_PROGRESS: 'pptides_quiz_progress',
  QUIZ_STEP: 'pptides_quiz_step',
  RECOVERY: 'pptides_recovery',
  REFERRAL_CODE: 'pptides_referral_code',
  THEME: 'pptides_theme',
  TRACKER_FORM_DRAFT: 'pptides_tracker_form_draft',
  TRIAL_BANNER_DISMISSED: 'pptides_trial_banner_dismissed',
  WELCOME_CONFETTI: 'pptides_welcome_confetti',
  WELCOME_SENT: 'pptides_welcome_sent',
} as const;

/** Re-export from single source of truth — must match supabase-migration.sql trigger */
export { TRIAL_DAYS } from '@/config/trial';
export const SITE_URL = 'https://pptides.com';

// VALUE_STACK prices are marketing estimates, not derived from PRICING. Update manually when pricing changes.
export const VALUE_STACK = [
  { item: `مكتبة ${PEPTIDE_COUNT} ببتيد مع بروتوكولات كاملة`, value: '679 ر.س' },
  { item: 'حاسبة جرعات دقيقة (مايكروغرام + سيرنج)', value: '109 ر.س' },
  { item: 'دليل تحاليل مخبرية شامل', value: '146 ر.س' },
  { item: 'دليل تحضير وحقن عملي', value: '71 ر.س' },
  { item: 'بروتوكولات مُجمَّعة جاهزة', value: '109 ر.س' },
  { item: 'فحص تعارضات الببتيدات', value: '71 ر.س' },
  { item: 'شارك تجربتك مع المجتمع', value: '56 ر.س' },
  { item: 'تحديثات مستمرة', value: 'لا تُقدّر' },
];
