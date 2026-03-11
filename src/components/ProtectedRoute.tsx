import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When false, only requires login — does not enforce active subscription.
   *  Use for pages like /account that logged-in users must always be able to reach. */
  requiresSubscription?: boolean;
}

export default function ProtectedRoute({ children, requiresSubscription = true }: ProtectedRouteProps) {
  const { user, subscription, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="جارٍ التحميل"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 dark:border-emerald-800 border-t-emerald-600" /></div>;
  if (!user) return (
    <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  );

  // If subscription expired/cancelled AND trial ended, redirect to pricing
  // Exception: pages that only require login (e.g. /account) must always be reachable.
  if (requiresSubscription && !subscription.isProOrTrial) {
    return (
      <Navigate to="/pricing?expired=1" replace />
    );
  }

  return <>{children}</>;
}
