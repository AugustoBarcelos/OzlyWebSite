import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { UnauthorizedPage } from './components/UnauthorizedPage';
import { ToastProvider } from './components/Toast';
import { Spinner } from './components/Spinner';
import { LoginPage } from './routes/login';
import { AuthCallbackPage } from './routes/auth/callback';

// Heavy admin pages — lazy-loaded so Tremor / charts only ship when needed.
const DashboardPage = lazy(() =>
  import('./routes/dashboard').then((m) => ({ default: m.DashboardPage })),
);
const UserListPage = lazy(() =>
  import('./routes/users/list').then((m) => ({ default: m.UserListPage })),
);
const User360Page = lazy(() =>
  import('./routes/users/[id]').then((m) => ({ default: m.User360Page })),
);
const GrantsPage = lazy(() =>
  import('./routes/ops/grants').then((m) => ({ default: m.GrantsPage })),
);
const AuditPage = lazy(() =>
  import('./routes/ops/audit').then((m) => ({ default: m.AuditPage })),
);
const RevenuePage = lazy(() =>
  import('./routes/revenue').then((m) => ({ default: m.RevenuePage })),
);
const GrowthPage = lazy(() =>
  import('./routes/growth').then((m) => ({ default: m.GrowthPage })),
);
const ReliabilityPage = lazy(() =>
  import('./routes/reliability').then((m) => ({ default: m.ReliabilityPage })),
);

function RouteFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

/**
 * Wave 2: real auth + persistent layout.
 *
 * Public routes (no auth required):
 *  - /login
 *  - /auth/callback
 *  - /unauthorized
 *
 * Protected routes (admin only) render inside <Layout> via <ProtectedRoute>:
 *  - /              dashboard placeholder (Wave 3 replaces)
 *  - /users         list placeholder       (Wave 4)
 *  - /users/:id     360 placeholder        (Wave 4)
 *  - /ops/grants    placeholder            (Wave 5)
 *  - /ops/audit     placeholder            (Wave 5)
 *  - /ops/functions placeholder            (Wave 5)
 *  - /revenue       placeholder            (Wave 5)
 *
 * Spec: BRIEFING §§ 7-L3, 7-L4, 11.1, 11.9.
 */

function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-6">
      <section className="text-center">
        <h1 className="text-3xl font-semibold text-navy-700">404</h1>
        <p className="mt-1 text-sm text-navy-400">Route not found.</p>
      </section>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected — wrapped in Layout. Suspense around the lazy routes. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/users"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <UserListPage />
                </Suspense>
              }
            />
            <Route
              path="/users/:id"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <User360Page />
                </Suspense>
              }
            />
            <Route
              path="/growth"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <GrowthPage />
                </Suspense>
              }
            />
            <Route
              path="/reliability"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ReliabilityPage />
                </Suspense>
              }
            />
            <Route
              path="/ops/grants"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <GrantsPage />
                </Suspense>
              }
            />
            <Route
              path="/ops/audit"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AuditPage />
                </Suspense>
              }
            />
            <Route
              path="/revenue"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <RevenuePage />
                </Suspense>
              }
            />
            {/* Backward-compat redirects for old bookmarks */}
            <Route path="/marketing" element={<Navigate to="/growth" replace />} />
            <Route path="/errors" element={<Navigate to="/reliability" replace />} />
            <Route
              path="/ops/affiliates"
              element={<Navigate to="/growth" replace />}
            />
            <Route
              path="/ops/functions"
              element={<Navigate to="/" replace />}
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
