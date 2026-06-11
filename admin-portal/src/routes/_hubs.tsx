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
  MessengerIcon,
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
          description: 'Reviews via App Store Connect API — read-only.',
          icon: SparklesIcon,
        },
      ]}
    />
  );
}

// ─── Growth Hub ─────────────────────────────────────────────────────────────
export function GrowthHubPage() {
  return (
    <HubPlaceholder
      title="Anúncios & funil"
      subtitle="De onde vêm os novos usuários e quanto custa trazer cada um."
      icon={TrendingUpIcon}
      links={[
        {
          label: 'Funil de vendas',
          to: '/growth/funnel',
          description: 'O caminho todo: viu o anúncio → baixou → cadastrou → pagou.',
          icon: FunnelIcon,
        },
        {
          label: 'Tráfego do site',
          to: '/insights',
          description: 'Quanta gente visita o site ozly.au e de onde vem.',
          icon: ActivityIcon,
        },
        {
          label: 'Google Ads',
          to: '/ads/google',
          description: 'Anúncios no Google: quanto gastou e quanto trouxe.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'Meta Ads',
          to: '/ads/meta',
          description: 'Anúncios no Facebook e Instagram.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'Apple Search Ads',
          to: '/ads/asa',
          description: 'Anúncios na busca da App Store.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'TikTok Ads',
          to: '/ads/tiktok',
          description: 'Anúncios no TikTok e custo por instalação.',
          icon: ArrowUpRightIcon,
        },
        {
          label: 'Links rastreados (UTM)',
          to: '/ads/attribution',
          description: 'Criar links curtos que mostram de onde cada cadastro veio.',
          icon: ActivityIcon,
        },
        {
          label: 'Afiliados',
          to: '/affiliates',
          description: 'Quem indica o app e quanto ganha de comissão.',
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
      title="Marketing"
      subtitle="Criar e agendar posts, emails e mensagens — tudo num lugar."
      icon={MegaphoneIcon}
      links={[
        {
          label: 'Calendário',
          to: '/marketing/calendar',
          description: 'Tudo que está agendado, em todos os canais.',
          icon: PenSquareIcon,
        },
        {
          label: 'Criar post',
          to: '/marketing/composer',
          description: 'Escreve uma vez e publica em vários canais.',
          icon: PenSquareIcon,
        },
        {
          label: 'Criar post com IA',
          to: '/marketing/ai-composer',
          description: 'A IA escreve as variações pra cada canal por você.',
          icon: SparklesIcon,
        },
        {
          label: 'Posts publicados',
          to: '/marketing/posts',
          description: 'Histórico do que foi publicado e como foi.',
          icon: ScrollTextIcon,
        },
        {
          label: 'Redes sociais',
          to: '/marketing/channels',
          description: 'Instagram, Facebook, TikTok, YouTube, X, LinkedIn.',
          icon: MegaphoneIcon,
        },
        {
          label: 'Site & Google',
          to: '/marketing/seo',
          description: 'Como o site aparece no Google e quem visita.',
          icon: ActivityIcon,
        },
        {
          label: 'Lojas de app (ASO)',
          to: '/marketing/aso',
          description: 'Como o app aparece na App Store e Play Store.',
          icon: PackageIcon,
        },
        {
          label: 'Email',
          to: '/messaging/email',
          description: 'Mandar emails pros usuários e ver respostas.',
          icon: MailIcon,
        },
        {
          label: 'WhatsApp',
          to: '/messaging/whatsapp',
          description: 'Inbox WhatsApp Cloud API + templates aprovados.',
          icon: WhatsAppIcon,
          status: 'parte2',
        },
        {
          label: 'Messenger',
          to: '/messaging/messenger',
          description: 'Inbox Facebook Page (24h window + Message Tags).',
          icon: MessengerIcon,
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
      title="Dinheiro"
      subtitle="Quanto entra, quanto sai e quanto sobra."
      icon={DollarSignIcon}
      links={[
        {
          label: 'Quanto entra',
          to: '/revenue',
          description: 'Assinaturas, planos e cancelamentos — a receita do app.',
          icon: DollarSignIcon,
        },
        {
          label: 'Quanto sai',
          to: '/finance/costs',
          description: 'Anúncios, servidores, ferramentas, comissões de afiliados.',
          icon: ArrowDownRightIcon,
        },
        {
          label: 'Quanto sobra (lucro)',
          to: '/finance/pnl',
          description: 'Entradas menos saídas, mês a mês.',
          icon: TrendingUpIcon,
        },
        {
          label: 'Previsão',
          to: '/finance/forecast',
          description: 'Como fica o caixa nos próximos meses se nada mudar (e cenários).',
          icon: SparklesIcon,
        },
        {
          label: 'Conferência',
          to: '/finance/reconciliation',
          description: 'Confere se App Store, Play Store e RevenueCat batem.',
          icon: ShieldCheckIcon,
        },
        {
          label: 'Impostos & relatórios',
          to: '/finance/tax',
          description: 'GST e arquivos prontos pra mandar pro contador.',
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
      title="Produto"
      subtitle="Como as pessoas usam o app: quem começa, quem volta, o que usam."
      icon={PackageIcon}
      links={[
        {
          label: 'Primeiros passos',
          to: '/product/activation',
          description: 'Quem cadastrou conseguiu começar a usar? Onde travam?',
          icon: FunnelIcon,
        },
        {
          label: 'Quem volta',
          to: '/product/retention',
          description: 'Quantas pessoas continuam usando semanas depois de entrar.',
          icon: ActivityIcon,
        },
        {
          label: 'Uso diário',
          to: '/product/engagement',
          description: 'Quanta gente usa o app por dia, semana e mês.',
          icon: TrendingUpIcon,
        },
        {
          label: 'Funcionalidades',
          to: '/product/features',
          description: 'Quais partes do app são mais usadas (e quais ninguém usa).',
          icon: PackageIcon,
        },
        {
          label: 'Opinião dos usuários',
          to: '/product/feedback',
          description: 'Notas, avaliações nas lojas e o que estão falando.',
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
export const InboxAffiliatesPage = () => (
  <SoonPage title="Affiliate approvals" wave="Use /affiliates filtrado por status=pending" backTo="/inbox" />
);
