import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';

const NAMES = [
  'أحمد', 'محمد', 'خالد', 'عبدالله', 'فهد',
  'سلطان', 'ناصر', 'عمر', 'يوسف', 'سعود',
  'تركي', 'بندر', 'ماجد',
];

const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة',
  'أبها', 'تبوك', 'الخبر', 'بريدة', 'حائل',
  'نجران', 'الطائف',
];

const ACTIONS = [
  'اشترك',
  'بدأ التجربة المجانية',
  'انضم للمنصة',
];

const TIME_AGO = [
  'قبل دقيقتين',
  'قبل 3 دقائق',
  'قبل 5 دقائق',
  'قبل 7 دقائق',
  'قبل 10 دقائق',
  'قبل 12 دقيقة',
];

const STORAGE_KEY = 'pptides_social_proof_count';
const MAX_PER_SESSION = 5;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function SocialProofToast() {
  const { pathname } = useLocation();
  const [notification, setNotification] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const showNext = useCallback(() => {
    try {
      const count = Number(sessionStorage.getItem(STORAGE_KEY) || '0');
      if (count >= MAX_PER_SESSION) return;
      sessionStorage.setItem(STORAGE_KEY, String(count + 1));
    } catch { return; }

    const name = pick(NAMES);
    const city = pick(CITIES);
    const action = pick(ACTIONS);
    const time = pick(TIME_AGO);
    setNotification(`${name} من ${city} ${action} ${time}`);
    setVisible(true);

    setTimeout(() => setVisible(false), 4000);
  }, []);

  useEffect(() => {
    // Only show on landing page
    if (pathname !== '/') return;

    // Initial delay before first toast
    const initialDelay = setTimeout(() => {
      showNext();

      // Then show every 30-45s
      const interval = setInterval(() => {
        const delay = 30000 + Math.random() * 15000;
        setTimeout(showNext, delay - 30000);
      }, 35000);

      return () => clearInterval(interval);
    }, 15000);

    return () => clearTimeout(initialDelay);
  }, [pathname, showNext]);

  if (!notification || pathname !== '/') return null;

  return (
    <div
      className={`fixed bottom-24 start-4 z-40 max-w-xs rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 shadow-lg transition-all duration-500 md:bottom-6 md:start-6 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Check className="h-4 w-4 text-emerald-700" />
        </div>
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{notification}</p>
      </div>
    </div>
  );
}
