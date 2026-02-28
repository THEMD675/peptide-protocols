export const PRICING = {
  essentials: { monthly: 9, label: '$9' },
  elite: { monthly: 99, label: '$99' },
} as const;

export const PEPTIDE_COUNT = 41;

export const VALUE_TOTAL = '$299+';
export const VALUE_SAVINGS_ESSENTIALS = '$290';
export const VALUE_SAVINGS_ELITE = '$200+';

export const SUPPORT_EMAIL = 'contact@pptides.com';

export const FREE_PEPTIDE_IDS = new Set([
  'semaglutide', 'bpc-157', 'kisspeptin-10', 'semax', 'epithalon', 'collagen-peptides',
]);

export const TRIAL_PEPTIDE_IDS = new Set([
  'semaglutide', 'tirzepatide', 'retatrutide', 'tesamorelin', 'aod-9604', '5-amino-1mq',
]);

export const LEGAL_LAST_UPDATED = '25 فبراير 2026';

export const TIER_LABELS: Record<string, string> = {
  free: 'مجاني',
  essentials: 'Essentials',
  elite: 'Elite',
};

export const STATUS_LABELS: Record<string, string> = {
  trial: 'فترة تجريبية',
  active: 'مفعّل',
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

export const TRIAL_DAYS = 3;
export const SITE_URL = 'https://pptides.com';

export const VALUE_STACK = [
  { item: `مكتبة ${PEPTIDE_COUNT} ببتيد مع بروتوكولات كاملة`, value: '$149' },
  { item: 'حاسبة جرعات دقيقة (مايكروغرام + سيرنج)', value: '$29' },
  { item: 'دليل تحاليل مخبرية شامل', value: '$39' },
  { item: 'دليل تحضير وحقن بالصور', value: '$19' },
  { item: 'بروتوكولات مُجمَّعة جاهزة', value: '$29' },
  { item: 'فحص تعارضات الببتيدات', value: '$19' },
  { item: 'تجارب مستخدمين حقيقية', value: '$15' },
  { item: 'تحديثات مستمرة', value: 'لا تُقدّر' },
];
