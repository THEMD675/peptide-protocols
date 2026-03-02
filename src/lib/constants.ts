import { peptides } from '@/data/peptides';

/** Derived from peptides — never out of sync with isFree field */
export const FREE_PEPTIDE_IDS = new Set(peptides.filter((p) => p.isFree).map((p) => p.id));

export const PRICING = {
  essentials: { monthly: 34, label: '34 ر.س', annualMonthly: Math.round(296 / 12), annualTotal: 296, annualLabel: '296 ر.س' },
  elite: { monthly: 371, label: '371 ر.س', annualMonthly: Math.round(2963 / 12), annualTotal: 2963, annualLabel: '2,963 ر.س' },
} as const;

export const PEPTIDE_COUNT = peptides.length;

/** Unique PubMed IDs across all peptides — used for "X+ مصدر علمي" stats */
const _pubmedSet = new Set<string>();
for (const p of peptides) {
  for (const id of p.pubmedIds ?? []) _pubmedSet.add(id);
}
export const PUBMED_SOURCE_COUNT = _pubmedSet.size;
export const PUBMED_SOURCE_LABEL = `${PUBMED_SOURCE_COUNT}+`;

export const FREQUENCY_LABELS: Record<string, string> = {
  od: 'مرة يوميًا',
  bid: 'مرتين يوميًا',
  weekly: 'مرة أسبوعيًا',
  biweekly: 'مرتين أسبوعيًا',
  prn: 'عند الحاجة',
  tid: 'ثلاث مرات يوميًا',
};

export const VALUE_TOTAL = '1,121 ر.س+';
export const VALUE_SAVINGS_ESSENTIALS = '1,087 ر.س';
export const VALUE_SAVINGS_ELITE = '750 ر.س+';

export const SUPPORT_EMAIL = 'contact@pptides.com';
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

export const STORAGE_KEYS = {
  AGE_VERIFIED: 'pptides_age_verified',
  COOKIE_CONSENT: 'pptides_cookie_consent',
  FAVORITES: 'pptides_favorites',
  QUIZ_ANSWERS: 'pptides_quiz_answers',
  CALC_HISTORY: 'pptides_calc_history',
  VISITED_PAGES: 'pptides_visited',
  COACH_HISTORY_PREFIX: 'pptides_coach_',
  CHUNK_RELOAD: 'pptides_chunk_reload',
  COMPARE: 'pptides_compare',
  STICKY_DISMISSED: 'pptides_sticky_dismissed',
  EXIT_POPUP: 'pptides_exit_popup_shown',
  USER_COUNT: 'pptides_user_count',
  USER_COUNT_TS: 'pptides_user_count_ts',
} as const;

/** Re-export from single source of truth — must match supabase-migration.sql trigger */
export { TRIAL_DAYS } from '@/config/trial';
export const SITE_URL = 'https://pptides.com';

// VALUE_STACK prices are marketing estimates, not derived from PRICING. Update manually when pricing changes.
export const VALUE_STACK = [
  { item: `مكتبة ${PEPTIDE_COUNT} ببتيد مع بروتوكولات كاملة`, value: '559 ر.س' },
  { item: 'حاسبة جرعات دقيقة (مايكروغرام + سيرنج)', value: '109 ر.س' },
  { item: 'دليل تحاليل مخبرية شامل', value: '146 ر.س' },
  { item: 'دليل تحضير وحقن عملي', value: '71 ر.س' },
  { item: 'بروتوكولات مُجمَّعة جاهزة', value: '109 ر.س' },
  { item: 'فحص تعارضات الببتيدات', value: '71 ر.س' },
  { item: 'شارك تجربتك مع المجتمع', value: '56 ر.س' },
  { item: 'تحديثات مستمرة', value: 'لا تُقدّر' },
];
