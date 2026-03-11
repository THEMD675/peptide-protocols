import { useState, useRef, useEffect, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children?: ReactNode;
  /** Show the default "?" icon trigger */
  icon?: boolean;
  /** Position relative to trigger */
  position?: 'top' | 'bottom';
  /** Unique ID for first-time-only display (stores in localStorage) */
  firstTimeId?: string;
  className?: string;
}

export default function Tooltip({ content, children, icon = true, position = 'top', firstTimeId, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [autoShown, setAutoShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-show tooltip for first-time users
  useEffect(() => {
    if (!firstTimeId) return;
    try {
      const key = `pptides_tooltip_${firstTimeId}`;
      if (localStorage.getItem(key)) return;
      const t = setTimeout(() => {
        setVisible(true);
        setAutoShown(true);
        localStorage.setItem(key, '1');
        // Auto-hide after 4 seconds
        setTimeout(() => setVisible(false), 4000);
      }, 1500);
      return () => clearTimeout(t);
    } catch { /* Safari private mode */ }
  }, [firstTimeId]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible]);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 200);
  };

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => setVisible(v => !v)}
        className="inline-flex items-center justify-center rounded-full text-stone-400 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1"
        aria-label="مساعدة"
        aria-describedby={visible ? 'tooltip-content' : undefined}
      >
        {children ?? (icon && <HelpCircle className="h-4 w-4" />)}
      </button>
      {visible && (
        <div
          id="tooltip-content"
          role="tooltip"
          className={cn(
            'tooltip-bubble absolute z-50 w-64 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-xs leading-relaxed text-stone-700 dark:text-stone-200 shadow-lg',
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            'end-0',
          )}
        >
          {content}
          <div
            className={cn(
              'absolute h-2 w-2 rotate-45 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900',
              position === 'top'
                ? 'top-full -mt-1 end-4 border-b border-e'
                : 'bottom-full -mb-1 end-4 border-t border-s',
            )}
          />
        </div>
      )}
    </div>
  );
}
