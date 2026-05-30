import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { OrgProvider } from '@/lib/org';
import { ToastProvider } from '@/components/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { FullScreenSpinner } from '@/components/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginPage } from '@/routes/login';
import { SignupPage } from '@/routes/signup';
import { ForgotPasswordPage } from '@/routes/forgot-password';
import { ResetPasswordPage } from '@/routes/reset-password';
import { NotFoundPage } from '@/routes/not-found';

const InvoicesPage = lazy(() => import('@/routes/invoices').then((m) => ({ default: m.InvoicesPage })));
const WorkPage = lazy(() => import('@/routes/work').then((m) => ({ default: m.WorkPage })));
const MembersPage = lazy(() => import('@/routes/members').then((m) => ({ default: m.MembersPage })));
const SettingsPage = lazy(() => import('@/routes/settings').then((m) => ({ default: m.SettingsPage })));
const BillingPage = lazy(() => import('@/routes/billing').then((m) => ({ default: m.BillingPage })));
const ActivityPage = lazy(() => import('@/routes/activity').then((m) => ({ default: m.ActivityPage })));

function lazyRoute(Component: React.ComponentType) {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Component />
    </Suspense>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OrgProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/invoices" replace />} />
                  <Route path="/invoices" element={lazyRoute(InvoicesPage)} />
                  <Route path="/work" element={lazyRoute(WorkPage)} />
                  <Route path="/members" element={lazyRoute(MembersPage)} />
                  <Route path="/settings" element={lazyRoute(SettingsPage)} />
                  <Route path="/billing" element={lazyRoute(BillingPage)} />
                  <Route path="/activity" element={lazyRoute(ActivityPage)} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ToastProvider>
        </OrgProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
