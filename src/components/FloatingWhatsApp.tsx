import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';

export default memo(function FloatingChat() {
  return (
    <Link
      to="/coach"
      aria-label="تواصل مع المدرب الذكي"
      className="fixed bottom-20 start-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95 md:bottom-6 md:start-6 print:hidden"
    >
      <Bot className="h-7 w-7" />
    </Link>
  );
});
