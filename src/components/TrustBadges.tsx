import { Lock, Shield, Stethoscope, Smartphone } from 'lucide-react';

const BADGES = [
  { icon: Lock, text: 'دفع آمن عبر Stripe' },
  { icon: Shield, text: 'ضمان استرداد 3 أيام' },
  { icon: Stethoscope, text: 'محتوى مراجع طبياً' },
  { icon: Smartphone, text: 'متوفر على جميع الأجهزة' },
];

export default function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8">
      {BADGES.map((badge) => (
        <div
          key={badge.text}
          className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 backdrop-blur-sm"
        >
          <badge.icon className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  );
}
