import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAILS } from '@/lib/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresSubscription?: boolean;
  requiresAdmin?: boolean;
}

export default function ProtectedRoute({ children, requiresSubscription = true, requiresAdmin = false }: ProtectedRouteProps) {
  const { user, subscription, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return (
    <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  );

  if (requiresAdmin && (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresSubscription && !subscription.isProOrTrial) {
    return (
      <Navigate to="/pricing?expired=1" replace />
    );
  }

  return <>{children}</>;
}
