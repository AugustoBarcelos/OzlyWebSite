/**
 * New IA Hub landing pages — each is a thin wrapper around <HubPlaceholder/>
 * that lists sub-pages with description and status badges.
 *
 * Cockpit (which has real KPI content) lives in /routes/cockpit/index.tsx.
 *
 * See docs/ADMIN_PORTAL_UX_PLAN.md (sec 3) for the full IA tree.
 */
import { HubPlaceholder } from '@/components/HubPlaceholder';
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BellIcon,
  DollarSignIcon,
  FunnelIcon,
  HandshakeIcon,
  HomeIcon,
  InboxIcon,
  MailIcon,
  MegaphoneIcon,
  PackageIcon,
  PenSquareIcon,
  ScrollTextIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
  WhatsAppIcon,
  WorkflowIcon,
} from '@/components/Icons';

// ─── Inbox ──────────────────────────────────────────────────────────────────
export function InboxPage() {
  return (
    <HubPlaceholder
      title="Inbox"
      subtitle="Tudo que precisa da sua atenção, num só lugar."
      icon={InboxIcon}
      wave="Wave 4 — Inbox unificada"
      links={[
        {
          label: 'Alerts (anomalias)',
          to: '/inbox/alerts',
          description: 'CAC subiu sem motivo, churn em pico, MRR caiu — IA detecta e te avisa.',
          icon: BellIcon,
          status: 'wip',
        },
        {
          label: 'Support tickets',
          to: '/inbox/support',
          description: 'Issues formais — refunds, bugs, queixas escaladas.',
          icon: ScrollTextIcon,
          status: 'wip',
        },
        {
          label: 'App Store reviews',
          to: '/inbox/reviews',
          description: 'Reviews novas no App Store + Play Store agregadas.',
          icon: SparklesIcon,
          status: 'wip',
        },
        {
          label: 'Refund requests',
          to: '/inbox/refunds',
          description: 'Pedidos de reembolso pendentes de aprovação.',
          icon: DollarSignIcon,
          status: 'wip',
        },
        {
          label: 'System events',
          to: '/inbox/system',
          description: 'Snapshots, sync jobs, edge functions errors, CI failures.',
          icon: ActivityIcon,
          status: 'wip',
        },
        {
          label: 'Affiliate approvals',
          to: '/inbox/affiliates',
          description: 'Aplicações de novos afiliados pendentes.',
          icon: HandshakeIcon,
          status: 'wip',
        },
      ]}
    />
  );
}

// ─── Growth Hub ─────────────────────────────────────────────────────────────
export function GrowthHubPage() {
  return (
    <HubPlaceholder
      title="Growth"
      subtitle="Aquisição, atribuição e otimização de canais."
      icon={TrendingUpIcon}
      wave="Wave 3 + 3.5 — Sales Funnel + Affiliates"
      links={[
        {
          label: 'Sales Funnel',
          to: '/growth/funnel',
          description: 'Impression → Click → Install → Signup → Activation → Trial → Paid → Retained.',
          icon: FunnelIcon,
          status: 'wip',
        },
        {
          label: 'Insights (GA4)',
          to: '/insights',
          description: 'GA4 sessions/users/conversion existentes.',
          icon: ActivityIcon,
        },
        {
          label: 'Google Ads',
          to: '/ads/google',
          description: 'Campanhas, spend, CPA, ROAS — Google Ads.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'Meta Ads',
          to: '/ads/meta',
          description: 'Campanhas Facebook + Instagram Ads.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'Apple Search Ads',
          to: '/ads/asa',
          description: 'ASA pipeline (já operacional via JWT ES256).',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'TikTok Ads',
          to: '/ads/tiktok',
          description: 'Campanhas TikTok + cost per install.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'Attribution / UTM',
          to: '/ads/attribution',
          description: 'Gerador de UTM links curtos + tracking.',
          icon: ActivityIcon,
        },
        {
          label: 'Affiliates',
          to: '/affiliates',
          description: 'Programa de afiliados — payouts, commissions, bonuses.',
          icon: HandshakeIcon,
        },
      ]}
    />
  );
}

// ─── Marketing Hub ──────────────────────────────────────────────────────────
export function MarketingHubPage() {
  return (
    <HubPlaceholder
      title="Marketing Studio"
      subtitle="Calendário, criação multi-canal, AI Composer, Messaging."
      icon={MegaphoneIcon}
      wave="Wave 6 / 6.3 / 6.5 — Composer + Messaging + WhatsApp"
      links={[
        {
          label: 'Calendar',
          to: '/marketing/calendar',
          description: 'Visão consolidada de tudo agendado em todos canais.',
          icon: PenSquareIcon,
        },
        {
          label: 'Composer',
          to: '/marketing/composer',
          description: 'Criar 1× e publicar em N canais com variações.',
          icon: PenSquareIcon,
        },
        {
          label: 'AI Composer',
          to: '/marketing/composer',
          description: 'Gemini gera variações respeitando brand voice + regras de canal.',
          icon: SparklesIcon,
          status: 'parte2',
        },
        {
          label: 'Posts',
          to: '/marketing/posts',
          description: 'Histórico de publicações com performance.',
          icon: ScrollTextIcon,
        },
        {
          label: 'Channels (organic)',
          to: '/marketing/channels',
          description: 'Canais orgânicos: IG, FB, TikTok, YouTube, X, LinkedIn.',
          icon: MegaphoneIcon,
        },
        {
          label: 'SEO & Site',
          to: '/marketing/seo',
          description: 'Search console + site analytics.',
          icon: ActivityIcon,
        },
        {
          label: 'ASO (App Store)',
          to: '/marketing/aso',
          description: 'App Store + Play Store metadata, screenshots, ranking.',
          icon: PackageIcon,
        },
        {
          label: 'Email',
          to: '/messaging/email',
          description: 'Campanhas Resend + inbox de respostas.',
          icon: MailIcon,
        },
        {
          label: 'WhatsApp',
          to: '/messaging/whatsapp',
          description: 'Campanhas WhatsApp Business + conversas inbound.',
          icon: WhatsAppIcon,
          status: 'parte2',
        },
        {
          label: 'SMS',
          to: '/messaging/sms',
          description: 'SMS broadcasts + transactional.',
          icon: MailIcon,
        },
      ]}
    />
  );
}

// ─── Finance Hub ────────────────────────────────────────────────────────────
export function FinanceHubPage() {
  return (
    <HubPlaceholder
      title="Finance"
      subtitle="MRR, ARR, custos, P&L, runway, reconciliation."
      icon={DollarSignIcon}
      wave="Wave 5 — Finance Hub"
      links={[
        {
          label: 'Revenue',
          to: '/revenue',
          description: 'MRR, subscriptions, trials, plan mix, cohorts & LTV.',
          icon: DollarSignIcon,
        },
        {
          label: 'Costs',
          to: '/finance/costs',
          description: 'Ad spend + infra + tools + affiliate payouts + WhatsApp + AI.',
          icon: ArrowDownRightIcon,
          status: 'wip',
        },
        {
          label: 'P&L',
          to: '/finance/pnl',
          description: 'Profit & Loss mensal e YTD.',
          icon: TrendingUpIcon,
          status: 'wip',
        },
        {
          label: 'Forecast & Runway',
          to: '/finance/forecast',
          description: 'Projeção com sliders de cenário (e se eu dobrar ad spend?).',
          icon: SparklesIcon,
          status: 'wip',
        },
        {
          label: 'Reconciliation',
          to: '/finance/reconciliation',
          description: 'Diff RevenueCat × App Store × Play Store + affiliate commissions.',
          icon: ShieldCheckIcon,
          status: 'wip',
        },
        {
          label: 'Tax & Reports',
          to: '/finance/tax',
          description: 'GST AU, Apple Small Business, exports pro contador.',
          icon: ScrollTextIcon,
          status: 'wip',
        },
      ]}
    />
  );
}

// ─── Product Hub ────────────────────────────────────────────────────────────
export function ProductHubPage() {
  return (
    <HubPlaceholder
      title="Product"
      subtitle="Activation, retention, engagement, feedback."
      icon={PackageIcon}
      wave="Pós-MVP — Product analytics"
      links={[
        {
          label: 'Activation Funnel',
          to: '/product/activation',
          description: 'Signup → onboard → trial picked → first session → first job.',
          icon: FunnelIcon,
          status: 'wip',
        },
        {
          label: 'Retention Cohorts',
          to: '/product/retention',
          description: 'Heatmap de retenção por cohort de signup.',
          icon: ActivityIcon,
          status: 'wip',
        },
        {
          label: 'Engagement (DAU/WAU/MAU)',
          to: '/product/engagement',
          description: 'Daily/Weekly/Monthly active users.',
          icon: TrendingUpIcon,
          status: 'wip',
        },
        {
          label: 'Feature Adoption',
          to: '/product/features',
          description: 'Quais features são usadas, por quem, com que frequência.',
          icon: PackageIcon,
          status: 'wip',
        },
        {
          label: 'Feedback (NPS, reviews)',
          to: '/product/feedback',
          description: 'NPS, App Store reviews aggregadas, support themes.',
          icon: SparklesIcon,
          status: 'wip',
        },
      ]}
    />
  );
}

// ─── Operations Hub ─────────────────────────────────────────────────────────
export function OperationsHubPage() {
  return (
    <HubPlaceholder
      title="Operations"
      subtitle="Self-PM Kanban + incidents + releases + grants + audit."
      icon={ScrollTextIcon}
      wave="Wave 8 — Operations"
      links={[
        {
          label: 'Roadmap (Kanban)',
          to: '/operations/roadmap',
          description: 'Seu Kanban pessoal: backlog, in progress, done.',
          icon: PenSquareIcon,
        },
        {
          label: 'Incidents',
          to: '/operations/incidents',
          description: 'Log de incidents + RCAs + severidade.',
          icon: BellIcon,
        },
        {
          label: 'Releases',
          to: '/operations/releases',
          description: 'Histórico de builds — TestFlight + Play Console.',
          icon: PackageIcon,
          status: 'wip',
        },
        {
          label: 'Runbooks',
          to: '/operations/runbooks',
          description: 'Procedimentos padronizados (deploy, refund, payout).',
          icon: ScrollTextIcon,
          status: 'wip',
        },
        {
          label: 'Grants',
          to: '/ops/grants',
          description: 'Permissions de equipe (members + grants).',
          icon: UsersIcon,
        },
        {
          label: 'Audit',
          to: '/ops/audit',
          description: 'Audit log de todas ações administrativas.',
          icon: ScrollTextIcon,
        },
      ]}
    />
  );
}

// ─── Tech Hub ───────────────────────────────────────────────────────────────
export function TechHubPage() {
  return (
    <HubPlaceholder
      title="Tech"
      subtitle="Reliability, errors, edge functions, CI/CD."
      icon={ServerIcon}
      wave="Wave 8.5 — CI/CD GitHub Actions"
      links={[
        {
          label: 'Reliability',
          to: '/reliability',
          description: 'Uptime, errors recentes, performance da API.',
          icon: ShieldCheckIcon,
        },
        {
          label: 'Errors',
          to: '/tech/errors',
          description: 'Sentry + Crashlytics agregados.',
          icon: BellIcon,
          status: 'wip',
        },
        {
          label: 'Edge Functions',
          to: '/tech/edge-functions',
          description: 'Status de cada edge function + logs.',
          icon: ServerIcon,
          status: 'wip',
        },
        {
          label: 'Database',
          to: '/tech/database',
          description: 'Slow queries, table sizes, indexes.',
          icon: ServerIcon,
          status: 'wip',
        },
        {
          label: 'Cron Jobs',
          to: '/tech/cron',
          description: 'Snapshots, sync, dispatch — schedule e última execução.',
          icon: ActivityIcon,
          status: 'wip',
        },
        {
          label: 'CI/CD (GitHub Actions)',
          to: '/tech/cicd',
          description: 'Workflows, runs, failures, performance.',
          icon: WorkflowIcon,
          status: 'parte2',
        },
      ]}
    />
  );
}

// ─── Simple placeholder pages (sub-routes that aren't built yet) ────────────
function SoonPage(props: { title: string; wave: string; backTo?: string; backLabel?: string }) {
  return (
    <HubPlaceholder
      title={props.title}
      wave={props.wave}
      links={
        props.backTo
          ? [
              {
                label: props.backLabel ?? 'Voltar pro Hub',
                to: props.backTo,
                icon: HomeIcon,
              },
            ]
          : []
      }
    />
  );
}

export const SalesFunnelPage = () => (
  <SoonPage
    title="Sales Funnel"
    wave="Wave 3 — Impression → Retained"
    backTo="/growth"
    backLabel="Growth Hub"
  />
);

export const FinanceCostsPage = () => (
  <SoonPage title="Costs" wave="Wave 5 — Finance" backTo="/finance" />
);
export const FinancePnlPage = () => (
  <SoonPage title="P&L" wave="Wave 5 — Finance" backTo="/finance" />
);
export const FinanceForecastPage = () => (
  <SoonPage title="Forecast & Runway" wave="Wave 5 — Finance" backTo="/finance" />
);
export const FinanceReconciliationPage = () => (
  <SoonPage title="Reconciliation" wave="Wave 5 — Finance" backTo="/finance" />
);
export const FinanceTaxPage = () => (
  <SoonPage title="Tax & Reports" wave="Wave 5 — Finance" backTo="/finance" />
);

export const ProductActivationPage = () => (
  <SoonPage title="Activation Funnel" wave="Pós-MVP — Product" backTo="/product" />
);
export const ProductRetentionPage = () => (
  <SoonPage title="Retention Cohorts" wave="Pós-MVP — Product" backTo="/product" />
);
export const ProductEngagementPage = () => (
  <SoonPage title="Engagement" wave="Pós-MVP — Product" backTo="/product" />
);
export const ProductFeaturesPage = () => (
  <SoonPage title="Feature Adoption" wave="Pós-MVP — Product" backTo="/product" />
);
export const ProductFeedbackPage = () => (
  <SoonPage title="Feedback (NPS, reviews)" wave="Pós-MVP — Product" backTo="/product" />
);

export const OperationsRoadmapPage = () => (
  <SoonPage title="Roadmap (Kanban)" wave="Wave 8 — Operations" backTo="/operations" />
);
export const OperationsIncidentsPage = () => (
  <SoonPage title="Incidents" wave="Wave 8 — Operations" backTo="/operations" />
);
export const OperationsReleasesPage = () => (
  <SoonPage title="Releases" wave="Wave 8 — Operations" backTo="/operations" />
);
export const OperationsRunbooksPage = () => (
  <SoonPage title="Runbooks" wave="Wave 8 — Operations" backTo="/operations" />
);

export const TechErrorsPage = () => (
  <SoonPage title="Errors" wave="Wave — Tech" backTo="/tech" />
);
export const TechEdgeFunctionsPage = () => (
  <SoonPage title="Edge Functions" wave="Wave — Tech" backTo="/tech" />
);
export const TechDatabasePage = () => (
  <SoonPage title="Database" wave="Wave — Tech" backTo="/tech" />
);
export const TechCronPage = () => (
  <SoonPage title="Cron Jobs" wave="Wave — Tech" backTo="/tech" />
);
export const TechCICDPage = () => (
  <SoonPage
    title="CI/CD — GitHub Actions"
    wave="Wave 8.5 — Parte 2 (precisa GitHub PAT)"
    backTo="/tech"
  />
);

export const InboxAlertsPage = () => (
  <SoonPage title="Alerts" wave="Wave 4 — Inbox" backTo="/inbox" />
);
export const InboxSupportPage = () => (
  <SoonPage title="Support tickets" wave="Wave 4 — Inbox" backTo="/inbox" />
);
export const InboxReviewsPage = () => (
  <SoonPage title="App Store reviews" wave="Wave 4 — Inbox" backTo="/inbox" />
);
export const InboxRefundsPage = () => (
  <SoonPage title="Refund requests" wave="Wave 4 — Inbox" backTo="/inbox" />
);
export const InboxSystemPage = () => (
  <SoonPage title="System events" wave="Wave 4 — Inbox" backTo="/inbox" />
);
export const InboxAffiliatesPage = () => (
  <SoonPage title="Affiliate approvals" wave="Wave 4 — Inbox" backTo="/inbox" />
);
