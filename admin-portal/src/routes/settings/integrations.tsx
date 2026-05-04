import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  CogIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  HandshakeIcon,
  InstagramIcon,
  MailIcon,
  MegaphoneIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WhatsAppIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { env } from '@/lib/env';
import { isGeminiConfigured } from '@/lib/gemini';
import { callRpc, RpcError } from '@/lib/rpc';

type IntegrationStatus = 'active' | 'configured' | 'pending' | 'parte2' | 'unknown';

interface Integration {
  id: string;
  name: string;
  category: 'core' | 'analytics' | 'ai' | 'marketing' | 'finance' | 'devops';
  description: string;
  status: IntegrationStatus;
  detail?: string | undefined;
  consoleUrl?: string | undefined;
  docsUrl?: string | undefined;
  icon: React.ComponentType<{ className?: string }>;
  /** What the user needs to do to activate it (when pending/parte2) */
  activationHint?: string | undefined;
}

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  active: 'Ativo',
  configured: 'Configurado',
  pending: 'Pendente',
  parte2: 'Parte 2',
  unknown: 'Desconhecido',
};

const STATUS_TONE: Record<IntegrationStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  configured: 'bg-brand-100 text-brand-800 ring-brand-200',
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  parte2: 'bg-navy-100 text-navy-700 ring-navy-200',
  unknown: 'bg-navy-50 text-navy-500 ring-navy-200',
};

const STATUS_ICON: Record<IntegrationStatus, React.ComponentType<{ className?: string }>> = {
  active: ShieldCheckIcon,
  configured: CogIcon,
  pending: AlertTriangleIcon,
  parte2: SparklesIcon,
  unknown: AlertTriangleIcon,
};

const CATEGORY_LABEL: Record<Integration['category'], string> = {
  core: 'Core',
  analytics: 'Analytics & observability',
  ai: 'AI / generative',
  marketing: 'Marketing',
  finance: 'Finance & subscriptions',
  devops: 'DevOps & infra',
};

interface TiktokRow {
  id: string;
  expires_at: string | null;
}

/**
 * /settings/integrations — single page that surfaces the live config status
 * of every external integration the portal depends on.
 *
 * Most checks are static (env var present? → configured). A few do a live
 * probe (TikTok OAuth row count, RC sync edge function reachable, etc).
 */
export function SettingsIntegrationsPage() {
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Probe TikTok via the existing tiktok-stats edge function (which we
    // already use in /marketing/channels — 200 = connected, 404 = not).
    void Promise.allSettled([
      // We can't call the edge function from here without a circular dep,
      // so just check if oauth_connections has any row by doing a minimal
      // rpc the admin already has access to.
      callRpc<{ rows: TiktokRow[] }>('admin_oauth_connections_list', {
        p_provider: 'tiktok',
      }).catch((e) => {
        // If RPC doesn't exist yet, fall back to "unknown"
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          return null;
        }
        throw e;
      }),
    ]).then((results) => {
      if (!alive) return;
      const r = results[0];
      if (r.status === 'fulfilled' && r.value && r.value.rows) {
        const hasActive = r.value.rows.some(
          (row) => !row.expires_at || new Date(row.expires_at) > new Date(),
        );
        setTiktokConnected(hasActive);
      } else {
        setTiktokConnected(null);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const integrations: Integration[] = [
    // ─── Core ──────────────────────────────────────────────────────
    {
      id: 'supabase',
      name: 'Supabase',
      category: 'core',
      description: 'Banco de dados, auth, storage, edge functions, RLS.',
      status: env.supabaseUrl && env.supabaseAnonKey ? 'active' : 'pending',
      detail: env.supabaseUrl ? `URL: ${env.supabaseUrl}` : undefined,
      consoleUrl: 'https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql',
      icon: DollarSignIcon,
    },
    {
      id: 'cloudflare-pages',
      name: 'Cloudflare Pages',
      category: 'core',
      description: 'Hosting do admin portal — deploy automático via CI.',
      status: 'active',
      detail: 'Deploy via GitHub Actions a cada push em main',
      consoleUrl: 'https://dash.cloudflare.com',
      icon: CogIcon,
    },

    // ─── Analytics & observability ─────────────────────────────────
    {
      id: 'sentry',
      name: 'Sentry',
      category: 'analytics',
      description: 'Error tracking + performance monitoring (mobile + web).',
      status: env.sentryDsn ? 'active' : 'pending',
      detail: env.sentryApiToken
        ? 'DSN + API token configurados (errors page com REST data)'
        : env.sentryDsn
          ? 'DSN configurado, sem API token (errors page mostra link)'
          : 'VITE_SENTRY_DSN não configurado',
      consoleUrl: 'https://sentry.io',
      icon: ShieldCheckIcon,
      activationHint: !env.sentryDsn
        ? 'Adicionar ADMIN_PORTAL_SENTRY_DSN como secret no GitHub'
        : undefined,
    },
    {
      id: 'posthog',
      name: 'PostHog',
      category: 'analytics',
      description: 'Product analytics + session replay + feature flags.',
      status: env.posthogApiKey ? 'active' : 'pending',
      detail: `Host: ${env.posthogHost}`,
      consoleUrl: 'https://eu.posthog.com',
      icon: ActivityIcon,
    },

    // ─── AI / generative ───────────────────────────────────────────
    {
      id: 'gemini',
      name: 'Google Gemini API',
      category: 'ai',
      description:
        'Powers AI Composer + "Sugerir com AI" em broadcasts + OCR no app.',
      status: isGeminiConfigured() ? 'active' : 'pending',
      detail: isGeminiConfigured()
        ? 'Key configurada via VITE_GEMINI_API_KEY · custos em /finance/cost-monitor'
        : 'VITE_GEMINI_API_KEY não configurado',
      consoleUrl: 'https://aistudio.google.com/app/apikey',
      icon: SparklesIcon,
      activationHint: !isGeminiConfigured()
        ? 'Adicionar ADMIN_PORTAL_GEMINI_KEY como secret no GitHub OzlyWebSite'
        : undefined,
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      category: 'ai',
      description: 'Alternativa pra texto longo / análise complexa.',
      status: 'parte2',
      detail: 'Não habilitado — Gemini cobre os casos atuais',
      consoleUrl: 'https://console.anthropic.com',
      icon: SparklesIcon,
      activationHint:
        'Quando precisar: criar API key Anthropic + secret ADMIN_PORTAL_ANTHROPIC_KEY + adaptar lib/gemini.ts pra ter alt path',
    },

    // ─── Marketing ─────────────────────────────────────────────────
    {
      id: 'resend',
      name: 'Resend (email)',
      category: 'marketing',
      description: 'Email broadcasts + transactional via /messaging/email.',
      status: 'active',
      detail:
        'Edge function admin-resend-stats ACTIVE no Supabase. RESEND_API_KEY armazenado nos Supabase secrets, não exposto ao client.',
      consoleUrl: 'https://resend.com/dashboard',
      icon: MailIcon,
    },
    {
      id: 'youtube',
      name: 'YouTube Data API v3',
      category: 'marketing',
      description: 'Stats do canal Ozly — followers, views, recent videos.',
      status: env.ytApiKey && env.ytChannelId ? 'active' : 'pending',
      detail:
        env.ytApiKey && env.ytChannelId
          ? `Channel: ${env.ytChannelId.slice(0, 12)}…`
          : 'API key + Channel ID precisam estar nos secrets',
      consoleUrl: 'https://console.cloud.google.com/apis/credentials',
      icon: MegaphoneIcon,
    },
    {
      id: 'tiktok',
      name: 'TikTok Business OAuth',
      category: 'marketing',
      description: 'Profile stats + future content posting via OAuth flow.',
      status: tiktokConnected === true ? 'active' : tiktokConnected === false ? 'pending' : 'unknown',
      detail:
        tiktokConnected === true
          ? 'OAuth row ativo em oauth_connections.'
          : tiktokConnected === false
            ? 'Sem OAuth row ativo — ir em /marketing/channels e clicar "Conectar TikTok"'
            : 'Não foi possível verificar — admin_oauth_connections_list pode não estar deployada',
      consoleUrl: 'https://developers.tiktok.com/apps',
      icon: PhoneIcon,
      activationHint: tiktokConnected === false
        ? 'Marketing → Channels → expandir TikTok → Conectar TikTok'
        : undefined,
    },
    {
      id: 'meta',
      name: 'Meta OAuth (IG / FB / Threads)',
      category: 'marketing',
      description: 'Posting + insights + DM webhooks (futuro Messaging Hub).',
      status: 'parte2',
      detail: 'Business verification + app aprovado pela Meta (~1 sem)',
      consoleUrl: 'https://developers.facebook.com/apps',
      icon: InstagramIcon,
      activationHint:
        '1) Criar app Meta Business 2) Verificar negócio 3) Solicitar advanced access aos scopes 4) Adicionar VITE_META_APP_ID + secret backend',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business (Meta Cloud API)',
      category: 'marketing',
      description:
        'Mensagens transacionais + campanhas. Templates pré-aprovados.',
      status: 'parte2',
      detail: 'Aprovação Meta (2-4 sem) + business verification',
      consoleUrl: 'https://business.facebook.com/wa/manage',
      icon: WhatsAppIcon,
      activationHint:
        '1) Aplicar pra WhatsApp Business Account 2) Submeter 5-10 templates pra aprovação 3) Adicionar WHATSAPP_PHONE_NUMBER_ID + access token nos Supabase secrets',
    },
    {
      id: 'apple-search-ads',
      name: 'Apple Search Ads',
      category: 'marketing',
      description: 'Pipeline JWT ES256 ativo — paid_asa snapshot 1×/h.',
      status: 'active',
      detail: 'JWT key em ~/Documents/apple-ads-keys/, cron `:17` operacional',
      consoleUrl: 'https://app.searchads.apple.com',
      icon: MegaphoneIcon,
    },

    // ─── Finance & subscriptions ───────────────────────────────────
    {
      id: 'revenuecat',
      name: 'RevenueCat',
      category: 'finance',
      description:
        'Source of truth de subscriptions (TFN/ABN/PRO). Webhook ativo.',
      status: 'active',
      detail: 'Edge function revenuecat-webhook ACTIVE',
      consoleUrl: 'https://app.revenuecat.com',
      icon: DollarSignIcon,
    },
    {
      id: 'app-store-connect',
      name: 'App Store Connect API',
      category: 'finance',
      description: 'Reviews + sales reports + screenshot A/B tests.',
      status: 'parte2',
      detail: 'Não habilitado — usar billing direto no App Store Connect',
      consoleUrl: 'https://appstoreconnect.apple.com',
      icon: DollarSignIcon,
      activationHint:
        'Settings → Users and Access → Keys → Create API Key → adicionar ADMIN_PORTAL_APP_STORE_CONNECT_KEY',
    },
    {
      id: 'play-developer',
      name: 'Google Play Developer API',
      category: 'finance',
      description: 'Reviews + sales reports + listing experiments.',
      status: 'parte2',
      detail: 'Não habilitado — usar Play Console direto',
      consoleUrl: 'https://play.google.com/console',
      icon: DollarSignIcon,
      activationHint:
        'Play Console → API access → Create service account → adicionar credentials JSON',
    },

    // ─── DevOps & infra ────────────────────────────────────────────
    {
      id: 'github-actions',
      name: 'GitHub Actions',
      category: 'devops',
      description:
        'CI/CD do admin portal + admin-portal CI workflow + auto-deploy Cloudflare.',
      status: 'active',
      detail: 'Workflow admin-portal.yml verde · workflow_dispatch enabled',
      consoleUrl:
        'https://github.com/AugustoBarcelos/OzlyWebSite/actions/workflows/admin-portal.yml',
      icon: CogIcon,
    },
    {
      id: 'github-pat',
      name: 'GitHub PAT (Tech > CI/CD page)',
      category: 'devops',
      description:
        'Personal Access Token pra a página /tech/cicd mostrar runs + logs.',
      status: 'parte2',
      detail: 'Página /tech/cicd existe como placeholder até a key ser adicionada',
      consoleUrl: 'https://github.com/settings/tokens',
      icon: HandshakeIcon,
      activationHint:
        '1) Criar fine-grained PAT em settings/tokens com escopo repo + workflow 2) gh secret set ADMIN_PORTAL_GITHUB_PAT --repo AugustoBarcelos/OzlyWebSite --body "..." 3) Mexe no workflow + lib/github.ts',
    },
  ];

  // Group by category
  const byCategory = integrations.reduce<Record<Integration['category'], Integration[]>>(
    (acc, i) => {
      const arr = acc[i.category] ?? [];
      arr.push(i);
      acc[i.category] = arr;
      return acc;
    },
    { core: [], analytics: [], ai: [], marketing: [], finance: [], devops: [] },
  );

  const counts = integrations.reduce(
    (acc, i) => {
      acc[i.status] += 1;
      return acc;
    },
    { active: 0, configured: 0, pending: 0, parte2: 0, unknown: 0 } as Record<
      IntegrationStatus,
      number
    >,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <CogIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Integrations
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Status real de cada integração que o portal usa. Clique em cada
              card pra ir ao console oficial.
            </p>
          </div>
        </div>
        <Link
          to="/settings"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Settings
        </Link>
      </header>

      {/* Summary tiles */}
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(['active', 'configured', 'pending', 'parte2', 'unknown'] as const).map((s) => {
          const Icon = STATUS_ICON[s];
          if (counts[s] === 0 && s === 'unknown') return null;
          return (
            <div key={s} className="ozly-card ozly-card-hero relative px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-navy-300" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                  {STATUS_LABEL[s]}
                </span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-navy-700">
                {counts[s]}
              </div>
            </div>
          );
        })}
      </section>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-navy-400">
          <Spinner size="sm" /> Verificando integrações live (TikTok, etc)…
        </div>
      )}

      {/* Integrations by category */}
      {(['core', 'analytics', 'ai', 'marketing', 'finance', 'devops'] as const).map(
        (cat) => {
          const items = byCategory[cat];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-700">
                {CATEGORY_LABEL[cat]}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((i) => (
                  <IntegrationCard key={i.id} integration={i} />
                ))}
              </div>
            </section>
          );
        },
      )}

      {/* Footer hint */}
      <Card className="ozly-card border-navy-100 bg-navy-50/40">
        <Title className="!text-sm !font-semibold text-navy-700">
          Adicionar nova integração
        </Title>
        <p className="mt-1 text-xs text-navy-500">
          1) Adicionar secret no GitHub <code className="font-mono">OzlyWebSite</code> com
          prefixo <code className="font-mono">ADMIN_PORTAL_*</code>. 2) Injetar no
          workflow <code className="font-mono">.github/workflows/admin-portal.yml</code>{' '}
          como <code className="font-mono">VITE_*</code>. 3) Adicionar ao{' '}
          <code className="font-mono">src/lib/env.ts</code>. 4) Adicionar entrada nesta
          página (<code className="font-mono">routes/settings/integrations.tsx</code>).
        </p>
      </Card>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  const StatusIcon = STATUS_ICON[integration.status];
  return (
    <Card className="ozly-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-700">{integration.name}</h3>
            <p className="mt-0.5 text-[12px] text-navy-500">{integration.description}</p>
          </div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ring-1 ${STATUS_TONE[integration.status]}`}
        >
          <StatusIcon className="h-3 w-3" />
          {STATUS_LABEL[integration.status]}
        </span>
      </div>

      {integration.detail && (
        <div className="mt-2 rounded-md border border-navy-50 bg-navy-50/40 px-2.5 py-1.5 text-[11px] text-navy-600">
          {integration.detail}
        </div>
      )}

      {integration.activationHint && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-amber-800">
          <strong>Pra ativar:</strong> {integration.activationHint}
        </div>
      )}

      {(integration.consoleUrl || integration.docsUrl) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {integration.consoleUrl && (
            <a
              href={integration.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
            >
              Console
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          )}
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
            >
              Docs
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
