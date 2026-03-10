import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TRIAL_DAYS } from '@/lib/constants';

export default function TrialCountdown() {
  const { user } = useAuth();
  const ctaLink = user ? '/pricing' : '/signup?redirect=/pricing';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-gradient-to-l from-emerald-600 to-emerald-700 px-6 py-5 text-center shadow-lg shadow-emerald-600/10">
      {/* Subtle animated glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_60%)]" />

      <div className="relative flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-white/90" />
          <span className="text-lg font-bold text-white">
            عرض تجريبي — {TRIAL_DAYS} أيام مجاناً
          </span>
        </div>

        <div className="flex items-center gap-3" dir="ltr">
          {[TRIAL_DAYS, 0, 0, 0].map((val, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-lg font-black text-white backdrop-blur-sm">
                {val}
              </span>
              <span className="mt-1 text-[10px] font-medium text-white/70">
                {['أيام', 'ساعات', 'دقائق', 'ثوانٍ'][i]}
              </span>
            </div>
          ))}
        </div>

        <Link
          to={ctaLink}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.98]"
        >
          ابدأ مجاناً
        </Link>
      </div>
    </div>
  );
}
