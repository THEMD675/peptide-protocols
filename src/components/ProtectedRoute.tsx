import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="جارٍ التحميل"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" /></div>;
  if (!user) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-6">
      <p className="text-lg font-bold text-stone-900">يرجى تسجيل الدخول للوصول لهذه الصفحة</p>
      <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
    </div>
  );
  return <>{children}</>;
}
