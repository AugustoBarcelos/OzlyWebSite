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

// ─── Cockpit (W2 — north star home) ─────────────────────────────────────────
const CockpitPage = lazy(() =>
  import('./routes/cockpit').then((m) => ({ default: m.CockpitPage })),
);

// ─── Help / Glossary ────────────────────────────────────────────────────────
const GlossaryPage = lazy(() =>
  import('./routes/help/glossary').then((m) => ({ default: m.GlossaryPage })),
);

// ─── Existing pages (preserved) ─────────────────────────────────────────────
const DashboardPage = lazy(() =>
  import('./routes/dashboard').then((m) => ({ default: m.DashboardPage })),
);
const UserListPage = lazy(() =>
  import('./routes/users/list').then((m) => ({ default: m.UserListPage })),
);
const User360Page = lazy(() =>
  import('./routes/users/[id]').then((m) => ({ default: m.User360Page })),
);
const UsersNpsPage = lazy(() =>
  import('./routes/users/nps').then((m) => ({ default: m.UsersNpsPage })),
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
const SettingsIntegrationsPage = lazy(() =>
  import('./routes/settings/integrations').then((m) => ({
    default: m.SettingsIntegrationsPage,
  })),
);
const TeamPage = lazy(() =>
  import('./routes/team').then((m) => ({ default: m.TeamPage })),
);

// Marketing
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
// AI Composer (Gemini)
const AiComposerPage = lazy(() =>
  import('./routes/marketing/ai-composer').then((m) => ({
    default: m.AiComposerPage,
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

// Ads (Tráfego Pago)
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

// Mensageria
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

// ─── W4 — real Inbox ────────────────────────────────────────────────────────
const InboxPage = lazy(() =>
  import('./routes/inbox').then((m) => ({ default: m.InboxPage })),
);

// ─── New IA Hubs (W1 — placeholders) ────────────────────────────────────────
const GrowthHubPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.GrowthHubPage })),
);
const MarketingHubPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.MarketingHubPage })),
);
// W5 — real Finance Hub
const FinanceHubPage = lazy(() =>
  import('./routes/finance').then((m) => ({ default: m.FinanceHubPage })),
);
const ProductHubPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.ProductHubPage })),
);
const OperationsHubPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.OperationsHubPage })),
);
const TechHubPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.TechHubPage })),
);

// W3 — real Sales Funnel
const SalesFunnelPage = lazy(() =>
  import('./routes/growth/funnel').then((m) => ({ default: m.SalesFunnelPage })),
);

// Sub-page placeholders
// W5 — real Costs + Forecast
const FinanceCostsPage = lazy(() =>
  import('./routes/finance/costs').then((m) => ({ default: m.FinanceCostsPage })),
);
const FinanceCostMonitorPage = lazy(() =>
  import('./routes/finance/cost-monitor').then((m) => ({ default: m.FinanceCostMonitorPage })),
);
// Tier B — real P&L
const FinancePnlPage = lazy(() =>
  import('./routes/finance/pnl').then((m) => ({ default: m.FinancePnlPage })),
);
const FinanceForecastPage = lazy(() =>
  import('./routes/finance/forecast').then((m) => ({ default: m.FinanceForecastPage })),
);
// Tier B — Finance reconciliation (real)
const FinanceReconciliationPage = lazy(() =>
  import('./routes/finance/reconciliation').then((m) => ({ default: m.FinanceReconciliationPage })),
);
const FinanceTaxPage = lazy(() =>
  import('./routes/finance/tax').then((m) => ({ default: m.FinanceTaxPage })),
);
// Tier A — real Product analytics
const ProductActivationPage = lazy(() =>
  import('./routes/product/activation').then((m) => ({ default: m.ProductActivationPage })),
);
const ProductRetentionPage = lazy(() =>
  import('./routes/product/retention').then((m) => ({ default: m.ProductRetentionPage })),
);
const ProductEngagementPage = lazy(() =>
  import('./routes/product/engagement').then((m) => ({ default: m.ProductEngagementPage })),
);
// Tier B — Product features (real)
const ProductFeaturesPage = lazy(() =>
  import('./routes/product/features').then((m) => ({ default: m.ProductFeaturesPage })),
);
const ProductFeedbackPage = lazy(() =>
  import('./routes/product/feedback').then((m) => ({ default: m.ProductFeedbackPage })),
);
// W8 — real Operations
const OperationsRoadmapPage = lazy(() =>
  import('./routes/operations/roadmap').then((m) => ({ default: m.OperationsRoadmapPage })),
);
const OperationsIncidentsPage = lazy(() =>
  import('./routes/operations/incidents').then((m) => ({ default: m.OperationsIncidentsPage })),
);
// Tier B — Releases + Runbooks
const OperationsReleasesPage = lazy(() =>
  import('./routes/operations/releases').then((m) => ({ default: m.OperationsReleasesPage })),
);
const OperationsRunbooksPage = lazy(() =>
  import('./routes/operations/runbooks').then((m) => ({ default: m.OperationsRunbooksPage })),
);
// Tier A — real Tech > Errors
const TechErrorsPage = lazy(() =>
  import('./routes/tech/errors').then((m) => ({ default: m.TechErrorsPage })),
);
// Tier B — Tech sub-pages (real)
const TechEdgeFunctionsPage = lazy(() =>
  import('./routes/tech/edge-functions').then((m) => ({ default: m.TechEdgeFunctionsPage })),
);
const TechDatabasePage = lazy(() =>
  import('./routes/tech/database').then((m) => ({ default: m.TechDatabasePage })),
);
const TechCronPage = lazy(() =>
  import('./routes/tech/cron').then((m) => ({ default: m.TechCronPage })),
);
const TechCICDPage = lazy(() =>
  import('./routes/tech/cicd').then((m) => ({ default: m.TechCICDPage })),
);
// Tier B — Inbox sub-pages (real where possible)
const InboxAlertsPage = lazy(() =>
  import('./routes/inbox/alerts').then((m) => ({ default: m.InboxAlertsPage })),
);
const InboxSupportPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.InboxSupportPage })),
);
const InboxReviewsPage = lazy(() =>
  import('./routes/inbox/reviews').then((m) => ({ default: m.InboxReviewsPage })),
);
const InboxRefundsPage = lazy(() =>
  import('./routes/inbox/refunds').then((m) => ({ default: m.InboxRefundsPage })),
);
const InboxSystemPage = lazy(() =>
  import('./routes/inbox/system').then((m) => ({ default: m.InboxSystemPage })),
);
const InboxAffiliatesPage = lazy(() =>
  import('./routes/_hubs').then((m) => ({ default: m.InboxAffiliatesPage })),
);

function RouteFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

const lazyRoute = (Component: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
);

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

/**
 * IA v3 (9 Hubs Founder Cockpit). See docs/ADMIN_PORTAL_UX_PLAN.md.
 *
 *   /                       → redirects to /cockpit
 *   /cockpit                → CockpitPage (W2 — north star)
 *   /inbox                  → InboxPage + sub-routes (W4)
 *   /growth                 → GrowthHubPage + /growth/funnel (W3)
 *   /marketing              → MarketingHubPage + /marketing/* (existing)
 *   /finance                → FinanceHubPage + /finance/* (W5)
 *   /product                → ProductHubPage + /product/* (post-MVP)
 *   /users, /users/:id      → existing
 *   /operations             → OperationsHubPage + /operations/* (W8)
 *   /tech                   → TechHubPage + /tech/* (W8.5)
 *
 * Legacy redirects below preserve all old bookmarks.
 */
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

            {/* Protected — wrapped in Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                {/* Cockpit (home) */}
                <Route path="/" element={<Navigate to="/cockpit" replace />} />
                <Route path="/cockpit" element={lazyRoute(CockpitPage)} />

                {/* Legacy /dashboard kept reachable for back-compat */}
                <Route path="/dashboard" element={lazyRoute(DashboardPage)} />

                {/* Inbox */}
                <Route path="/inbox" element={lazyRoute(InboxPage)} />
                <Route path="/inbox/alerts" element={lazyRoute(InboxAlertsPage)} />
                <Route path="/inbox/support" element={lazyRoute(InboxSupportPage)} />
                <Route path="/inbox/reviews" element={lazyRoute(InboxReviewsPage)} />
                <Route path="/inbox/refunds" element={lazyRoute(InboxRefundsPage)} />
                <Route path="/inbox/system" element={lazyRoute(InboxSystemPage)} />
                <Route path="/inbox/affiliates" element={lazyRoute(InboxAffiliatesPage)} />

                {/* Growth Hub */}
                <Route path="/growth" element={lazyRoute(GrowthHubPage)} />
                <Route path="/growth/funnel" element={lazyRoute(SalesFunnelPage)} />
                <Route path="/insights" element={lazyRoute(InsightsPage)} />

                {/* Ads (Growth > Channels — kept at /ads/* for compat) */}
                <Route path="/ads" element={lazyRoute(AdsOverviewPage)} />
                <Route path="/ads/google" element={lazyRoute(GoogleAdsPage)} />
                <Route path="/ads/meta" element={lazyRoute(MetaAdsPage)} />
                <Route path="/ads/asa" element={lazyRoute(AppleSearchAdsPage)} />
                <Route path="/ads/tiktok" element={lazyRoute(TikTokAdsPage)} />
                <Route path="/ads/attribution" element={lazyRoute(AttributionPage)} />

                {/* Affiliates */}
                <Route path="/affiliates" element={lazyRoute(AffiliatesPage)} />

                {/* Marketing Hub */}
                <Route path="/marketing" element={lazyRoute(MarketingHubPage)} />
                <Route path="/marketing/calendar" element={lazyRoute(MarketingCalendarPage)} />
                <Route path="/marketing/composer" element={lazyRoute(MarketingComposerPage)} />
                <Route path="/marketing/ai-composer" element={lazyRoute(AiComposerPage)} />
                <Route path="/marketing/posts" element={lazyRoute(MarketingPostsPage)} />
                <Route path="/marketing/channels" element={lazyRoute(MarketingChannelsPage)} />
                <Route path="/marketing/seo" element={lazyRoute(MarketingSeoPage)} />
                <Route path="/marketing/aso" element={lazyRoute(MarketingAsoPage)} />

                {/* Messaging (Marketing > Messaging — kept at /messaging/* for compat) */}
                <Route path="/messaging/email" element={lazyRoute(MessagingEmailPage)} />
                <Route path="/messaging/whatsapp" element={lazyRoute(MessagingWhatsAppPage)} />
                <Route path="/messaging/sms" element={lazyRoute(MessagingSmsPage)} />

                {/* Finance Hub */}
                <Route path="/finance" element={lazyRoute(FinanceHubPage)} />
                <Route path="/finance/costs" element={lazyRoute(FinanceCostsPage)} />
                <Route path="/finance/cost-monitor" element={lazyRoute(FinanceCostMonitorPage)} />
                <Route path="/finance/pnl" element={lazyRoute(FinancePnlPage)} />
                <Route path="/finance/forecast" element={lazyRoute(FinanceForecastPage)} />
                <Route path="/finance/reconciliation" element={lazyRoute(FinanceReconciliationPage)} />
                <Route path="/finance/tax" element={lazyRoute(FinanceTaxPage)} />
                <Route path="/revenue" element={lazyRoute(RevenuePage)} />

                {/* Product Hub */}
                <Route path="/product" element={lazyRoute(ProductHubPage)} />
                <Route path="/product/activation" element={lazyRoute(ProductActivationPage)} />
                <Route path="/product/retention" element={lazyRoute(ProductRetentionPage)} />
                <Route path="/product/engagement" element={lazyRoute(ProductEngagementPage)} />
                <Route path="/product/features" element={lazyRoute(ProductFeaturesPage)} />
                <Route path="/product/feedback" element={lazyRoute(ProductFeedbackPage)} />

                {/* Users */}
                <Route path="/users" element={lazyRoute(UserListPage)} />
                <Route path="/users/nps" element={lazyRoute(UsersNpsPage)} />
                <Route path="/users/:id" element={lazyRoute(User360Page)} />

                {/* Operations Hub */}
                <Route path="/operations" element={lazyRoute(OperationsHubPage)} />
                <Route path="/operations/roadmap" element={lazyRoute(OperationsRoadmapPage)} />
                <Route path="/operations/incidents" element={lazyRoute(OperationsIncidentsPage)} />
                <Route path="/operations/releases" element={lazyRoute(OperationsReleasesPage)} />
                <Route path="/operations/runbooks" element={lazyRoute(OperationsRunbooksPage)} />
                <Route path="/ops/grants" element={lazyRoute(GrantsPage)} />
                <Route path="/ops/audit" element={lazyRoute(AuditPage)} />

                {/* Tech Hub */}
                <Route path="/tech" element={lazyRoute(TechHubPage)} />
                <Route path="/tech/errors" element={lazyRoute(TechErrorsPage)} />
                <Route path="/tech/edge-functions" element={lazyRoute(TechEdgeFunctionsPage)} />
                <Route path="/tech/database" element={lazyRoute(TechDatabasePage)} />
                <Route path="/tech/cron" element={lazyRoute(TechCronPage)} />
                <Route path="/tech/cicd" element={lazyRoute(TechCICDPage)} />
                <Route path="/reliability" element={lazyRoute(ReliabilityPage)} />

                {/* Help / Glossary */}
                <Route path="/help/glossary" element={lazyRoute(GlossaryPage)} />
                <Route path="/glossary" element={<Navigate to="/help/glossary" replace />} />

                {/* Settings & Team */}
                <Route path="/settings" element={lazyRoute(SettingsPage)} />
                <Route path="/settings/integrations" element={lazyRoute(SettingsIntegrationsPage)} />
                <Route path="/team" element={lazyRoute(TeamPage)} />

                {/* Backward-compat redirects for old bookmarks */}
                <Route path="/errors" element={<Navigate to="/reliability" replace />} />
                <Route path="/ops/affiliates" element={<Navigate to="/affiliates" replace />} />
                <Route path="/growth/affiliates" element={<Navigate to="/affiliates" replace />} />
                <Route path="/ops/functions" element={<Navigate to="/cockpit" replace />} />
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
