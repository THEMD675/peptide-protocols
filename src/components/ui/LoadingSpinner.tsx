import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' };

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return <Loader2 className={cn('animate-spin text-emerald-600', SIZES[size], className)} />;
}
