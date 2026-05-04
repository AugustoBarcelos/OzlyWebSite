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

interface SecretField {
  key_name: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  placeholder?: string;
  helpUrl?: string;
  helpText?: string;
}

interface IntegrationSecretSpec {
  /** integration_id used in admin_integration_secrets table */
  integration_id: string;
  fields: SecretField[];
}

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
  /** Editable secrets for this integration (DB-stored). Adds Edit form. */
  secrets?: IntegrationSecretSpec | undefined;
}

interface SecretRow {
  integration_id: string;
  key_name: string;
  value_length: number;
  value_preview: string;
  updated_at: string;
  created_at: string;
  updated_by_email: string | null;
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
  const [secretsByIntegration, setSecretsByIntegration] = useState<Record<string, Record<string, SecretRow>>>({});
  const [secretsTableMissing, setSecretsTableMissing] = useState(false);

  const reloadSecrets = () => {
    void callRpc<{ rows: SecretRow[] }>('admin_integration_secrets_list', {})
      .then((r) => {
        const grouped: Record<string, Record<string, SecretRow>> = {};
        for (const row of r.rows) {
          (grouped[row.integration_id] ??= {})[row.key_name] = row;
        }
        setSecretsByIntegration(grouped);
      })
      .catch((e: unknown) => {
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setSecretsTableMissing(true);
        }
      });
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.allSettled([
      callRpc<{ rows: TiktokRow[] }>('admin_oauth_connections_list', {
        p_provider: 'tiktok',
      }).catch((e) => {
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
    reloadSecrets();
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
        : 'VITE_GEMINI_API_KEY não configurado (build-time)',
      consoleUrl: 'https://aistudio.google.com/app/apikey',
      icon: SparklesIcon,
      activationHint: !isGeminiConfigured()
        ? 'Build-time secret: rodar `gh secret set ADMIN_PORTAL_GEMINI_KEY --repo AugustoBarcelos/OzlyWebSite --body "..."` e re-trigger o workflow'
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
      secrets: {
        integration_id: 'resend',
        fields: [
          {
            key_name: 'api_key',
            label: 'Resend API Key',
            type: 'password',
            placeholder: 're_xxxxxxxxxxxxxxxxxxxxx',
            helpUrl: 'https://resend.com/api-keys',
            helpText: 'Cria/copia em resend.com/api-keys (tipo: Full Access pra send broadcasts).',
          },
        ],
      },
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
      status: 'configured',
      detail: 'Edge fn appstore-connect-proxy ACTIVE — JWT ES256 server-side',
      consoleUrl: 'https://appstoreconnect.apple.com/access/integrations/api',
      icon: DollarSignIcon,
      secrets: {
        integration_id: 'appstore_connect',
        fields: [
          {
            key_name: 'issuer_id',
            label: 'Issuer ID',
            type: 'text',
            placeholder: 'aa4c3c0f-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            helpUrl: 'https://appstoreconnect.apple.com/access/integrations/api',
            helpText: 'UUID no topo da página Team Keys.',
          },
          {
            key_name: 'key_id',
            label: 'Key ID',
            type: 'text',
            placeholder: 'H4Z2CDJ6DH',
            helpText: '10 chars, aparece na linha da key gerada.',
          },
          {
            key_name: 'private_key',
            label: 'Private Key (.p8 content)',
            type: 'textarea',
            placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
            helpText: 'Cole o conteúdo inteiro do arquivo .p8 baixado da Apple (incluindo BEGIN/END).',
          },
          {
            key_name: 'app_id',
            label: 'App ID (numeric)',
            type: 'text',
            placeholder: '6760398649',
            helpText: 'Numeric App ID — encontra em App Store Connect → My Apps → Ozly → App Information.',
          },
        ],
      },
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
      name: 'GitHub PAT (Tech → CI/CD page)',
      category: 'devops',
      description:
        'Personal Access Token pra a página /tech/cicd mostrar runs + logs.',
      status: 'configured',
      detail: 'Edge fn github-actions-proxy ACTIVE — read-only via PAT server-side',
      consoleUrl: 'https://github.com/settings/personal-access-tokens',
      icon: HandshakeIcon,
      secrets: {
        integration_id: 'github',
        fields: [
          {
            key_name: 'pat',
            label: 'GitHub PAT (fine-grained)',
            type: 'password',
            placeholder: 'github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            helpUrl: 'https://github.com/settings/personal-access-tokens',
            helpText: 'Permissions read-only: Actions, Contents, Metadata. Scope: AugustoBarcelos/OzlyWebSite + AusClean.',
          },
          {
            key_name: 'repo',
            label: 'Default repo (owner/name)',
            type: 'text',
            placeholder: 'AugustoBarcelos/OzlyWebSite',
            helpText: 'Repo padrão consultado em /tech/cicd quando ?repo= não é passado.',
          },
        ],
      },
    },
    {
      id: 'play-developer-api',
      name: 'Google Play Developer API',
      category: 'finance',
      description: 'Reviews Android + sales reports + listing experiments.',
      status: 'parte2',
      detail: 'Aguardando service account JSON do Play Console',
      consoleUrl: 'https://play.google.com/console/u/0/developers/api-access',
      icon: DollarSignIcon,
      secrets: {
        integration_id: 'play_developer',
        fields: [
          {
            key_name: 'service_account_json',
            label: 'Service Account JSON',
            type: 'textarea',
            placeholder: '{"type":"service_account","project_id":"..."}',
            helpUrl: 'https://play.google.com/console/u/0/developers/api-access',
            helpText: 'Cola o conteúdo inteiro do .json baixado do Play Console → API access.',
          },
        ],
      },
    },
  ];

  // Override status based on what's actually saved in admin_integration_secrets.
  // If all required keys are present → 'configured' (or keep 'active' if already so).
  const integrationsWithDbStatus = integrations.map((i) => {
    if (!i.secrets) return i;
    const saved = secretsByIntegration[i.secrets.integration_id] ?? {};
    const allPresent = i.secrets.fields.every((f) => saved[f.key_name]);
    if (allPresent) {
      return { ...i, status: 'configured' as IntegrationStatus };
    }
    if (Object.keys(saved).length > 0) {
      return { ...i, status: 'pending' as IntegrationStatus };
    }
    return i;
  });

  // Group by category
  const byCategory = integrationsWithDbStatus.reduce<Record<Integration['category'], Integration[]>>(
    (acc, i) => {
      const arr = acc[i.category] ?? [];
      arr.push(i);
      acc[i.category] = arr;
      return acc;
    },
    { core: [], analytics: [], ai: [], marketing: [], finance: [], devops: [] },
  );

  const counts = integrationsWithDbStatus.reduce(
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
                  <IntegrationCard
                    key={i.id}
                    integration={i}
                    savedSecrets={i.secrets ? (secretsByIntegration[i.secrets.integration_id] ?? {}) : {}}
                    onSecretsChange={reloadSecrets}
                  />
                ))}
              </div>
            </section>
          );
        },
      )}

      {secretsTableMissing && (
        <Card className="ozly-card border-amber-200 bg-amber-50/60">
          <Title className="!text-sm !font-semibold text-amber-800">
            Self-service migration pendente
          </Title>
          <p className="mt-1 text-xs text-amber-700">
            Aplicar <code className="font-mono">20260504090000_admin_integration_secrets.sql</code>{' '}
            em prod. Sem isso, os botões "Edit credentials" não conseguem ler/salvar.
          </p>
        </Card>
      )}

      {/* Footer hint */}
      <Card className="ozly-card border-navy-100 bg-navy-50/40">
        <Title className="!text-sm !font-semibold text-navy-700">
          Como funciona o self-service
        </Title>
        <p className="mt-1 text-xs text-navy-500">
          Cada card com <strong>Edit credentials</strong> grava na tabela{' '}
          <code className="font-mono">admin_integration_secrets</code> (RLS admin-only). Edge
          functions leem com fallback pro env, então rotação não precisa redeploy.{' '}
          <strong>Build-time secrets</strong> (Gemini, Sentry, PostHog, YouTube) ainda precisam
          de <code className="font-mono">gh secret set</code> + re-trigger workflow porque vão
          baked no JS bundle.
        </p>
      </Card>
    </div>
  );
}

function IntegrationCard({
  integration,
  savedSecrets,
  onSecretsChange,
}: {
  integration: Integration;
  savedSecrets: Record<string, SecretRow>;
  onSecretsChange: () => void;
}) {
  const Icon = integration.icon;
  const StatusIcon = STATUS_ICON[integration.status];
  const [editing, setEditing] = useState(false);
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
        {integration.secrets && (
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
          >
            {editing ? 'Cancelar' : 'Edit credentials'}
          </button>
        )}
      </div>

      {integration.secrets && editing && (
        <SecretsEditor
          spec={integration.secrets}
          savedSecrets={savedSecrets}
          onSave={() => {
            setEditing(false);
            onSecretsChange();
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </Card>
  );
}

function SecretsEditor({
  spec,
  savedSecrets,
  onSave,
  onCancel,
}: {
  spec: IntegrationSecretSpec;
  savedSecrets: Record<string, SecretRow>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Save only fields the user actually edited (non-empty)
      const dirty = Object.entries(values).filter(([, v]) => v.trim() !== '');
      if (dirty.length === 0) {
        setError('Nada pra salvar — preencha pelo menos um campo.');
        setSaving(false);
        return;
      }
      for (const [key_name, value] of dirty) {
        await callRpc('admin_integration_secret_set', {
          p_integration_id: spec.integration_id,
          p_key_name: key_name,
          p_value: value,
        });
      }
      setValues({});
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
      onSave();
    } catch (e: unknown) {
      setError(e instanceof RpcError ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteKey(key_name: string) {
    if (!window.confirm(`Apagar ${spec.integration_id}.${key_name}?`)) return;
    try {
      await callRpc('admin_integration_secret_delete', {
        p_integration_id: spec.integration_id,
        p_key_name: key_name,
      });
      onSave();
    } catch (e: unknown) {
      setError(e instanceof RpcError ? e.message : 'Erro ao apagar');
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-md border border-brand-200 bg-brand-50/30 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
        Edit credentials — {spec.integration_id}
      </div>
      {spec.fields.map((field) => {
        const saved = savedSecrets[field.key_name];
        return (
          <div key={field.key_name} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-navy-700">
                {field.label}
              </label>
              {saved && (
                <button
                  type="button"
                  onClick={() => deleteKey(field.key_name)}
                  className="text-[10px] text-rose-600 hover:underline"
                  disabled={saving}
                >
                  Apagar
                </button>
              )}
            </div>
            {saved && (
              <div className="rounded-sm bg-white px-2 py-1 text-[11px] text-navy-500">
                <span className="font-mono">{saved.value_preview}</span>
                <span className="ml-2 text-navy-300">
                  ({saved.value_length} chars · atualizado{' '}
                  {new Date(saved.updated_at).toLocaleDateString('en-AU')})
                </span>
              </div>
            )}
            {field.type === 'textarea' ? (
              <textarea
                rows={4}
                value={values[field.key_name] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key_name]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 font-mono text-[11px] text-navy-700"
              />
            ) : (
              <input
                type={field.type === 'password' ? 'password' : 'text'}
                value={values[field.key_name] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key_name]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-[12px] text-navy-700"
              />
            )}
            {(field.helpText || field.helpUrl) && (
              <div className="text-[10px] text-navy-400">
                {field.helpText}
                {field.helpUrl && (
                  <>
                    {' '}
                    <a
                      href={field.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      Como obter →
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      {savedFlash && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
          ✓ Salvo. Novas chamadas vão usar a key nova (cache 60s).
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-navy-100 bg-white px-3 py-1 text-[11px] text-navy-600 hover:border-navy-200"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-brand-700 disabled:bg-navy-200"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
