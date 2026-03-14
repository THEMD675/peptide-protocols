import { createContext, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAILS } from '@/lib/constants';

/** When true, the user's subscription has expired but they can view their own data read-only */
const ReadOnlyContext = createContext(false);
export const useReadOnly = () => useContext(ReadOnlyContext);

/** Routes that show user's own data and should allow read-only after trial */
const READ_ONLY_PATHS = ['/dashboard', '/tracker', '/coach'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresSubscription?: boolean;
  requiresAdmin?: boolean;
}

export default function ProtectedRoute({ children, requiresSubscription = true, requiresAdmin = false }: ProtectedRouteProps) {
  const { user, subscription, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <span className="text-sm text-stone-500 dark:text-stone-400">جارٍ التحميل…</span>
      </div>
    </div>
  );
  if (!user) return (
    <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  );

  if (requiresAdmin && (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresSubscription && !subscription.isProOrTrial) {
    // Allow read-only access to user's own data pages instead of hard redirect
    const isReadOnlyAllowed = READ_ONLY_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (isReadOnlyAllowed) {
      return (
        <ReadOnlyContext.Provider value={true}>
          {children}
        </ReadOnlyContext.Provider>
      );
    }
    return (
      <Navigate to="/pricing?expired=1" replace />
    );
  }

  return <>{children}</>;
}
