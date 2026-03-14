import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface SuggestedChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export default function SuggestedChips({ suggestions, onSelect, disabled }: SuggestedChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 justify-end max-w-[88%] ms-auto animate-fade-up">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-700',
            'bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5',
            'text-xs font-medium text-amber-800 dark:text-amber-300',
            'transition-all hover:bg-amber-100 dark:hover:bg-amber-900/30',
            'hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm',
            'active:scale-[0.97]',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          {text}
        </button>
      ))}
    </div>
  );
}
