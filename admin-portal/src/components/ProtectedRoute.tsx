import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { FullScreenSpinner } from './Spinner';

/**
 * Route guard for authenticated admin routes.
 *
 * BRIEFING § 7-L4 / § 11.1:
 *  - Loading → spinner.
 *  - No user → redirect to /login, preserving intended path in `from` query.
 *  - User but role != admin → redirect to /unauthorized.
 *  - Else render nested routes via <Outlet />.
 */
export function ProtectedRoute() {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenSpinner label="Checking your session…" />;
  }

  if (!user) {
    const from = location.pathname + location.search;
    const to = `/login?from=${encodeURIComponent(from)}`;
    return <Navigate to={to} replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
