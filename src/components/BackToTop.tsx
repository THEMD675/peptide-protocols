import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="العودة للأعلى"
      aria-label="العودة للأعلى"
      className={cn(
        'print:hidden fixed bottom-20 end-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-500 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-stone-300 hover:text-stone-700 hover:shadow-md active:scale-95 md:bottom-20 md:end-6',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
