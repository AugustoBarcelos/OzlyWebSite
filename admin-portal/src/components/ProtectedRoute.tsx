import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { FullScreenSpinner } from './Spinner';

/**
 * Route guard for authenticated portal routes.
 *
 * Aceita: admin (profiles.role='admin') OU team_member ativo com pelo menos
 * 1 grant. Senão → /unauthorized.
 *
 * Per-channel access (e.g. "só vê /paid se tem qualquer grant paid_*") é feito
 * pelo `<ProtectedChannel>` em rotas individuais — esse guard só bloqueia
 * randoms.
 */
export function ProtectedRoute() {
  const { user, role, hasPortalAccess, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenSpinner label="Checking your session…" />;
  }

  if (!user) {
    const from = location.pathname + location.search;
    const to = `/login?from=${encodeURIComponent(from)}`;
    return <Navigate to={to} replace />;
  }

  if (role === null || !hasPortalAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
