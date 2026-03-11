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

  // Return null during auth loading — the parent Suspense fallback (DashboardSkeleton,
  // TrackerSkeleton, etc.) already shows a layout-matching skeleton. A generic spinner
  // here would cause a visible flash: skeleton → spinner → content.
  if (isLoading) return null;
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
