import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { UnauthorizedPage } from './components/UnauthorizedPage';
import { ToastProvider } from './components/Toast';
import { Spinner } from './components/Spinner';
import { PreferencesProvider } from './lib/preferences';
import { LoginPage } from './routes/login';
import { AuthCallbackPage } from './routes/auth/callback';
import { OAuthPopupCallbackPage } from './routes/oauth/popup-callback';

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
const InsightsPage = lazy(() =>
  import('./routes/insights').then((m) => ({ default: m.InsightsPage })),
);
const AffiliatesPage = lazy(() =>
  import('./routes/ops/affiliates').then((m) => ({ default: m.AffiliatesPage })),
);
const ReliabilityPage = lazy(() =>
  import('./routes/reliability').then((m) => ({ default: m.ReliabilityPage })),
);
const SettingsPage = lazy(() =>
  import('./routes/settings').then((m) => ({ default: m.SettingsPage })),
);
const TeamPage = lazy(() =>
  import('./routes/team').then((m) => ({ default: m.TeamPage })),
);

// Marketing — sidebar branch
const MarketingCalendarPage = lazy(() =>
  import('./routes/marketing/calendar').then((m) => ({
    default: m.MarketingCalendarPage,
  })),
);
const MarketingComposerPage = lazy(() =>
  import('./routes/marketing/composer').then((m) => ({
    default: m.MarketingComposerPage,
  })),
);
const MarketingPostsPage = lazy(() =>
  import('./routes/marketing/posts').then((m) => ({
    default: m.MarketingPostsPage,
  })),
);
const MarketingChannelsPage = lazy(() =>
  import('./routes/marketing/channels').then((m) => ({
    default: m.MarketingChannelsPage,
  })),
);
const MarketingSeoPage = lazy(() =>
  import('./routes/marketing/seo').then((m) => ({
    default: m.MarketingSeoPage,
  })),
);
const MarketingAsoPage = lazy(() =>
  import('./routes/marketing/aso').then((m) => ({
    default: m.MarketingAsoPage,
  })),
);

// Tráfego Pago — sidebar branch
const AdsOverviewPage = lazy(() =>
  import('./routes/ads').then((m) => ({ default: m.AdsOverviewPage })),
);
const GoogleAdsPage = lazy(() =>
  import('./routes/ads/google').then((m) => ({ default: m.GoogleAdsPage })),
);
const MetaAdsPage = lazy(() =>
  import('./routes/ads/meta').then((m) => ({ default: m.MetaAdsPage })),
);
const AppleSearchAdsPage = lazy(() =>
  import('./routes/ads/asa').then((m) => ({ default: m.AppleSearchAdsPage })),
);
const TikTokAdsPage = lazy(() =>
  import('./routes/ads/tiktok').then((m) => ({ default: m.TikTokAdsPage })),
);
const AttributionPage = lazy(() =>
  import('./routes/ads/attribution').then((m) => ({
    default: m.AttributionPage,
  })),
);

// Mensageria — sidebar branch
const MessagingEmailPage = lazy(() =>
  import('./routes/messaging/email').then((m) => ({
    default: m.MessagingEmailPage,
  })),
);
const MessagingWhatsAppPage = lazy(() =>
  import('./routes/messaging/whatsapp').then((m) => ({
    default: m.MessagingWhatsAppPage,
  })),
);
const MessagingSmsPage = lazy(() =>
  import('./routes/messaging/sms').then((m) => ({
    default: m.MessagingSmsPage,
  })),
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
 * Protected routes (admin only) render inside <Layout> via <ProtectedRoute>.
 *
 * IA atual:
 *  - /                      Dashboard
 *  - /users, /users/:id     User search + 360
 *  - /revenue               Revenue snapshot
 *  - /affiliates            Affiliates
 *  - /insights              Crescimento (KPIs blended)
 *  - /marketing/*           Marketing branch (calendar/composer/posts/channels/seo/aso)
 *  - /ads/*                 Tráfego Pago branch (google/meta/asa/tiktok/attribution)
 *  - /messaging/*           Mensageria branch (email/whatsapp/sms)
 *  - /reliability           Reliability
 *  - /team, /ops/*          Ops
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
      <PreferencesProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/oauth/popup-callback" element={<OAuthPopupCallbackPage />} />
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
              path="/insights"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <InsightsPage />
                </Suspense>
              }
            />

            {/* Marketing branch */}
            <Route
              path="/marketing/calendar"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MarketingCalendarPage />
                </Suspense>
              }
            />
            <Route
              path="/marketing/composer"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MarketingComposerPage />
                </Suspense>
              }
            />
            <Route
              path="/marketing/posts"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MarketingPostsPage />
                </Suspense>
              }
            />
            <Route
              path="/marketing/channels"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MarketingChannelsPage />
                </Suspense>
              }
            />
            <Route
              path="/marketing/seo"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MarketingSeoPage />
                </Suspense>
              }
            />
            <Route
              path="/marketing/aso"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MarketingAsoPage />
                </Suspense>
              }
            />

            {/* Tráfego Pago branch */}
            <Route
              path="/ads"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AdsOverviewPage />
                </Suspense>
              }
            />
            <Route
              path="/ads/google"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <GoogleAdsPage />
                </Suspense>
              }
            />
            <Route
              path="/ads/meta"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MetaAdsPage />
                </Suspense>
              }
            />
            <Route
              path="/ads/asa"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AppleSearchAdsPage />
                </Suspense>
              }
            />
            <Route
              path="/ads/tiktok"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <TikTokAdsPage />
                </Suspense>
              }
            />
            <Route
              path="/ads/attribution"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AttributionPage />
                </Suspense>
              }
            />

            {/* Mensageria branch */}
            <Route
              path="/messaging/email"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MessagingEmailPage />
                </Suspense>
              }
            />
            <Route
              path="/messaging/whatsapp"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MessagingWhatsAppPage />
                </Suspense>
              }
            />
            <Route
              path="/messaging/sms"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MessagingSmsPage />
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
            <Route
              path="/affiliates"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AffiliatesPage />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="/team"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <TeamPage />
                </Suspense>
              }
            />
            {/* Backward-compat redirects for old bookmarks */}
            <Route path="/growth" element={<Navigate to="/insights" replace />} />
            <Route path="/marketing" element={<Navigate to="/marketing/calendar" replace />} />
            <Route path="/errors" element={<Navigate to="/reliability" replace />} />
            <Route
              path="/ops/affiliates"
              element={<Navigate to="/affiliates" replace />}
            />
            <Route
              path="/growth/affiliates"
              element={<Navigate to="/affiliates" replace />}
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
      </PreferencesProvider>
    </AuthProvider>
  );
}
