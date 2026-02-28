import { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';

const HIDDEN_PATHS = ['/pricing', '/login', '/signup', '/coach', '/dashboard', '/account', '/tracker'];

export default memo(function FloatingHelp() {
  const { pathname } = useLocation();
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;
  if (pathname === '/') return null;

  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      aria-label="تواصل معنا — بريد الدعم"
      className="fixed bottom-6 start-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition-all hover:scale-105 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-md active:scale-95 md:start-6 print:hidden"
    >
      <Mail className="h-4.5 w-4.5" />
    </a>
  );
});
