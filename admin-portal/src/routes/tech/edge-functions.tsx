import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ExternalLinkIcon, ServerIcon, WorkflowIcon } from '@/components/Icons';

/**
 * /tech/edge-functions — list of deployed edge functions with quick links
 * to their Supabase Studio pages (logs + invocations).
 *
 * Static catalogue today; future: hit the Supabase Management API to pull
 * real-time invocation count + error rate per function.
 */

interface EdgeFn {
  name: string;
  description: string;
  category: 'auth' | 'sync' | 'admin' | 'oauth' | 'webhooks' | 'misc';
  invokedBy?: string;
}

const FUNCTIONS: ReadonlyArray<EdgeFn> = [
  // RevenueCat / RC sync
  { name: 'revenuecat-sync', description: 'On-demand RC snapshot refresh — invocado pelo botão Sync RC no admin', category: 'sync', invokedBy: 'admin (button)' },
  { name: 'revenuecat-webhook', description: 'Webhook RC pra eventos em tempo real (subscription created, expired, refunded)', category: 'webhooks', invokedBy: 'RevenueCat' },

  // OAuth flows
  { name: 'tiktok-oauth-init', description: 'Inicia OAuth flow do TikTok (gera state + URL)', category: 'oauth', invokedBy: 'admin' },
  { name: 'tiktok-oauth-callback', description: 'Callback OAuth TikTok — exchange code por access_token', category: 'oauth', invokedBy: 'TikTok redirect' },
  { name: 'tiktok-stats', description: 'Read proxy pra TikTok user info + recent videos', category: 'oauth', invokedBy: 'admin (Marketing/Channels)' },

  // Admin / referral
  { name: 'referral-test', description: 'E2E diagnostic do flow de referral signup (magiclink)', category: 'admin', invokedBy: 'admin' },

  // Apple Search Ads / paid snapshots
  { name: 'paid-snapshot-dispatch', description: 'Cron dispatch dos snapshots de ad spend (ASA, Google, Meta, TikTok Ads)', category: 'sync', invokedBy: 'pg_cron' },
];

const CATEGORY_LABEL: Record<EdgeFn['category'], string> = {
  auth: 'Auth',
  sync: 'Sync / Cron',
  admin: 'Admin',
  oauth: 'OAuth',
  webhooks: 'Webhooks',
  misc: 'Misc',
};

const CATEGORY_TONE: Record<EdgeFn['category'], string> = {
  auth: 'bg-sky-50 text-sky-700 ring-sky-200',
  sync: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  admin: 'bg-brand-50 text-brand-700 ring-brand-200',
  oauth: 'bg-amber-50 text-amber-700 ring-amber-200',
  webhooks: 'bg-lime-50 text-lime-700 ring-lime-200',
  misc: 'bg-navy-50 text-navy-600 ring-navy-200',
};

export function TechEdgeFunctionsPage() {
  const grouped = FUNCTIONS.reduce<Record<string, EdgeFn[]>>((acc, fn) => {
    const arr = acc[fn.category] ?? [];
    arr.push(fn);
    acc[fn.category] = arr;
    return acc;
  }, {});
  const categories = Object.keys(grouped) as Array<EdgeFn['category']>;

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
            <WorkflowIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Edge Functions
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Catálogo de Supabase Edge Functions com links pros logs.
            </p>
          </div>
        </div>
        <Link
          to="/tech"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Tech Hub
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Tile label="Total functions" value={FUNCTIONS.length} />
        <Tile label="Categorias" value={categories.length} />
        <Tile label="Webhooks" value={grouped.webhooks?.length ?? 0} />
      </section>

      <div className="ozly-card border-navy-100 bg-navy-50/40 p-3 text-[12px] text-navy-500">
        Catálogo estático por enquanto — invocation count + error rate em tempo real
        precisa Management API. Click em &ldquo;Logs&rdquo; pra abrir Supabase Studio.
      </div>

      {categories.map((cat) => {
        const fns = grouped[cat] ?? [];
        return (
        <Card key={cat} className="ozly-card">
          <div className="flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              {CATEGORY_LABEL[cat]}
            </Title>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${CATEGORY_TONE[cat]}`}>
              {fns.length} fn
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {fns.map((fn) => (
              <li
                key={fn.name}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-navy-50 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-navy-700">
                      {fn.name}
                    </code>
                    {fn.invokedBy && (
                      <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] text-navy-500">
                        invoked by {fn.invokedBy}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-navy-500">{fn.description}</p>
                </div>
                <a
                  href={`https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/functions/${fn.name}/logs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
                >
                  Logs <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
        );
      })}

      <div className="flex items-center justify-end">
        <a
          href="https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/functions"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          <ServerIcon className="h-3.5 w-3.5" /> Supabase Functions Dashboard
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-brand-600">{value}</div>
    </div>
  );
}
