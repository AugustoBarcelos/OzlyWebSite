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
      links={[
        {
          label: 'Alerts (anomalias)',
          to: '/inbox/alerts',
          description: 'KPIs em variação anômala — MRR, CAC, churn.',
          icon: BellIcon,
        },
        {
          label: 'Refund requests',
          to: '/inbox/refunds',
          description: 'Pedidos de reembolso pendentes de aprovação.',
          icon: DollarSignIcon,
        },
        {
          label: 'System events',
          to: '/inbox/system',
          description: 'Recent admin actions + sync/cron events.',
          icon: ActivityIcon,
        },
        {
          label: 'Affiliate approvals',
          to: '/affiliates',
          description: 'Aplicações pendentes — abre o /affiliates filtrado.',
          icon: HandshakeIcon,
        },
        {
          label: 'Support tickets',
          to: '/inbox/support',
          description: 'Issues formais — refunds, bugs, queixas escaladas.',
          icon: ScrollTextIcon,
          status: 'parte2',
        },
        {
          label: 'App Store reviews',
          to: '/inbox/reviews',
          description: 'Reviews novas no App Store + Play Store agregadas.',
          icon: SparklesIcon,
          status: 'parte2',
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
      links={[
        {
          label: 'Sales Funnel',
          to: '/growth/funnel',
          description: 'Impression → Click → Install → Signup → Activation → Trial → Paid → Retained.',
          icon: FunnelIcon,
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
          to: '/marketing/ai-composer',
          description: 'Gemini gera variações respeitando brand voice + regras de canal.',
          icon: SparklesIcon,
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
        },
        {
          label: 'P&L',
          to: '/finance/pnl',
          description: 'Profit & Loss mensal e YTD.',
          icon: TrendingUpIcon,
        },
        {
          label: 'Forecast & Runway',
          to: '/finance/forecast',
          description: 'Projeção com sliders de cenário (e se eu dobrar ad spend?).',
          icon: SparklesIcon,
        },
        {
          label: 'Reconciliation',
          to: '/finance/reconciliation',
          description: 'Diff RevenueCat × App Store × Play Store + affiliate commissions.',
          icon: ShieldCheckIcon,
        },
        {
          label: 'Tax & Reports',
          to: '/finance/tax',
          description: 'GST AU, Apple Small Business, CSV export pro contador.',
          icon: ScrollTextIcon,
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
      links={[
        {
          label: 'Activation Funnel',
          to: '/product/activation',
          description: 'Signup → onboard → trial picked → first session → first job.',
          icon: FunnelIcon,
        },
        {
          label: 'Retention Cohorts',
          to: '/product/retention',
          description: 'Heatmap de retenção por cohort de signup.',
          icon: ActivityIcon,
        },
        {
          label: 'Engagement (DAU/WAU/MAU)',
          to: '/product/engagement',
          description: 'Daily/Weekly/Monthly active users.',
          icon: TrendingUpIcon,
        },
        {
          label: 'Feature Adoption',
          to: '/product/features',
          description: 'Quais features são usadas, por quem, com que frequência.',
          icon: PackageIcon,
        },
        {
          label: 'Feedback (NPS, reviews)',
          to: '/product/feedback',
          description: 'NPS agregado + App Store reviews (parte 2).',
          icon: SparklesIcon,
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
        },
        {
          label: 'Runbooks',
          to: '/operations/runbooks',
          description: 'Procedimentos padronizados (deploy, refund, payout).',
          icon: ScrollTextIcon,
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
        },
        {
          label: 'Edge Functions',
          to: '/tech/edge-functions',
          description: 'Catálogo de edge functions + atalho pros logs.',
          icon: ServerIcon,
        },
        {
          label: 'Database',
          to: '/tech/database',
          description: 'Tamanho total + top tabelas por tamanho.',
          icon: ServerIcon,
        },
        {
          label: 'Cron Jobs',
          to: '/tech/cron',
          description: 'pg_cron schedule + última execução por job.',
          icon: ActivityIcon,
        },
        {
          label: 'CI/CD (GitHub Actions)',
          to: '/tech/cicd',
          description: 'Workflows, runs, failures, performance.',
          icon: WorkflowIcon,
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

// Placeholder pages still routed via App.tsx — keep these until real
// implementations land or the routes are redirected. All other SoonPage
// exports were removed once their real subdirectory implementations shipped.
export const InboxSupportPage = () => (
  <SoonPage title="Support tickets" wave="Parte 2 — esperando integração helpdesk" backTo="/inbox" />
);
export const InboxReviewsPage = () => (
  <SoonPage title="App Store reviews" wave="Parte 2 — esperando App Store Connect API key" backTo="/inbox" />
);
export const InboxAffiliatesPage = () => (
  <SoonPage title="Affiliate approvals" wave="Use /affiliates filtrado por status=pending" backTo="/inbox" />
);
