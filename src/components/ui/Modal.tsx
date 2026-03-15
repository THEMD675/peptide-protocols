import { useEffect, useRef, lazy, Suspense, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FocusTrap = lazy(() => import('focus-trap-react'));

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

export default function Modal({ open, title, children, onClose, maxWidth = 'max-w-md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${title.replace(/\s+/g, '-')}`;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => { prev?.focus(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <Suspense fallback={null}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('relative w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-800 p-6 shadow-xl dark:shadow-stone-900/40 outline-none animate-scale-in', maxWidth)}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="h-5 w-5 text-stone-500 dark:text-stone-300" />
          </button>
        </div>
        {children}
      </div>
      </FocusTrap>
      </Suspense>
      </div>
  );
}
