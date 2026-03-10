import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  type: 'offline' | 'fetch';
  onRetry?: () => void;
  className?: string;
}

export default function NetworkError({ type, onRetry, className = '' }: Props) {
  const isOffline = type === 'offline';

  return (
    <div
      dir="rtl"
      role="alert"
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center ${
        isOffline
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      } ${className}`}
    >
      {isOffline ? (
        <WifiOff className="h-10 w-10 text-amber-500 dark:text-amber-400" />
      ) : (
        <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
      )}

      <div>
        <p className={`font-bold text-lg ${
          isOffline ? 'text-amber-800 dark:text-amber-200' : 'text-red-800 dark:text-red-200'
        }`}>
          {isOffline ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر تحميل البيانات'}
        </p>
        <p className={`mt-1 text-sm ${
          isOffline ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isOffline
            ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى'
            : 'حدث خطأ أثناء تحميل البيانات — حاول مرة أخرى'}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bold text-white transition-colors ${
            isOffline
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          حاول مرة أخرى
        </button>
      )}
    </div>
  );
}
