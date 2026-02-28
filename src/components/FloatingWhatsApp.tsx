import { memo } from 'react';
import { Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';

export default memo(function FloatingHelp() {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      aria-label="تواصل معنا — بريد الدعم"
      className="fixed bottom-20 start-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-md transition-all hover:scale-105 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-lg active:scale-95 md:bottom-20 md:start-6 print:hidden"
    >
      <Mail className="h-5 w-5" />
    </a>
  );
});
