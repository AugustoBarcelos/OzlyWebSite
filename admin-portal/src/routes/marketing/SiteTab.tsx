import { useEffect, useState } from 'react';
import { BadgeDelta, Card, Grid, Metric, Text } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { ExternalLinkIcon } from '@/components/Icons';
import { Collapsible } from '@/components/Collapsible';
import { callEdge } from '@/lib/edge';
import { formatNumber } from '@/lib/format';

/**
 * Site tab — GA4 (analytics) + Search Console (SEO) for ozly.au.
 *
 * Backend: ga4-stats edge function. Auth model is OAuth refresh-token with
 * admin-owned credentials, so a single token covers both APIs.
 *
 *   ?op=summary       → KPIs (last 30d for GA4, last 28d ending 3d ago for GSC,
 *                       each with delta vs previous equal window)
 *   ?op=ga4_pages     → top 15 pages by pageviews
 *   ?op=gsc_queries   → top 25 search queries
 */

interface Range { start: string; end: string }

interface Ga4Summary {
  range: Range;
  sessions: number;
  users: number;
  pageviews: number;
  engagement_rate: number;
  prev: { sessions: number; users: number; pageviews: number; engagement_rate: number };
  error?: string;
}

interface GscSummary {
  range: Range;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prev: { clicks: number; impressions: number; ctr: number; position: number };
  error?: string;
}

interface SummaryPayload {
  ga4: Ga4Summary | { error: string };
  gsc: GscSummary | { error: string };
}

interface PagesPayload {
  range: Range;
  pages: { path: string; pageviews: number; sessions: number }[];
}

interface QueriesPayload {
  range: Range;
  queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
}

function hasError<T extends { error?: string }>(x: T | { error: string }): x is { error: string } {
  return 'error' in x && typeof x.error === 'string' && !!x.error && !('sessions' in x) && !('clicks' in x);
}

function deltaFraction(current: number, previous: number): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return undefined;
  return (current - previous) / previous;
}

export function SiteTab() {
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await callEdge<SummaryPayload>('ga4-stats', { query: { op: 'summary' } });
    if (!r.ok) {
      setError(r.error);
    } else {
      setData(r.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await callEdge<SummaryPayload>('ga4-stats', { query: { op: 'summary' } });
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
      } else {
        setData(r.data);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-navy-400">
        <Spinner size="sm" />
        Loading site analytics…
      </div>
    );
  }

  if (error) {
    return <SetupHelper error={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <Ga4Section summary={data?.ga4 ?? { error: 'No data' }} />
      <GscSection summary={data?.gsc ?? { error: 'No data' }} />
    </div>
  );
}

// ── GA4 ────────────────────────────────────────────────────────────────────

function Ga4Section({ summary }: { summary: Ga4Summary | { error: string } }) {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon="🌐"
        title="Google Analytics 4"
        subtitle={
          'sessions' in summary
            ? `Last 30 days · ${summary.range.start} → ${summary.range.end}`
            : 'Site traffic for ozly.au'
        }
        ctaLabel="Open GA4"
        ctaHref="https://analytics.google.com"
      />

      {hasError(summary) ? (
        <ApiErrorBox label="GA4 API" message={summary.error} />
      ) : (
        <>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-3">
            <KpiCard
              title="Sessions"
              value={summary.sessions}
              delta={deltaFraction(summary.sessions, summary.prev.sessions)}
            />
            <KpiCard
              title="Users"
              value={summary.users}
              delta={deltaFraction(summary.users, summary.prev.users)}
            />
            <KpiCard
              title="Pageviews"
              value={summary.pageviews}
              delta={deltaFraction(summary.pageviews, summary.prev.pageviews)}
            />
            <KpiCard
              title="Engagement"
              value={summary.engagement_rate}
              delta={deltaFraction(summary.engagement_rate, summary.prev.engagement_rate)}
              formatter={(n) =>
                n === null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(1)}%`
              }
            />
          </Grid>

          <Collapsible
            icon="📄"
            title="Top pages (last 30 days)"
            subtitle="By pageviews. Click to load."
          >
            <Ga4TopPages />
          </Collapsible>
        </>
      )}
    </section>
  );
}

function Ga4TopPages() {
  const [data, setData] = useState<PagesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await callEdge<PagesPayload>('ga4-stats', { query: { op: 'ga4_pages' } });
      if (!alive) return;
      if (!r.ok) setError(r.error);
      else setData(r.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-navy-400">
        <Spinner size="sm" /> Loading top pages…
      </div>
    );
  }
  if (error) return <ApiErrorBox label="GA4 API" message={error} />;
  if (!data || data.pages.length === 0) {
    return <Text className="text-xs text-navy-300">No pageviews in this window.</Text>;
  }
  return (
    <ul className="space-y-1">
      {data.pages.map((p) => (
        <li
          key={p.path}
          className="flex items-center gap-3 rounded-md border border-navy-50 bg-white px-3 py-1.5 text-xs"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-navy-700">{p.path || '/'}</span>
          <span className="shrink-0 tabular-nums text-navy-500">
            {formatNumber(p.pageviews)} views
          </span>
          <span className="shrink-0 tabular-nums text-navy-300">
            {formatNumber(p.sessions)} sess
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── GSC ────────────────────────────────────────────────────────────────────

function GscSection({ summary }: { summary: GscSummary | { error: string } }) {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon="🔍"
        title="Google Search Console"
        subtitle={
          'clicks' in summary
            ? `Last 28 days · ${summary.range.start} → ${summary.range.end} (3-day GSC lag)`
            : 'Search visibility for ozly.au'
        }
        ctaLabel="Open Search Console"
        ctaHref="https://search.google.com/search-console"
      />

      {hasError(summary) ? (
        <ApiErrorBox label="GSC API" message={summary.error} />
      ) : (
        <>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-3">
            <KpiCard
              title="Clicks"
              value={summary.clicks}
              delta={deltaFraction(summary.clicks, summary.prev.clicks)}
            />
            <KpiCard
              title="Impressions"
              value={summary.impressions}
              delta={deltaFraction(summary.impressions, summary.prev.impressions)}
            />
            <KpiCard
              title="CTR"
              value={summary.ctr}
              delta={deltaFraction(summary.ctr, summary.prev.ctr)}
              formatter={(n) =>
                n === null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(2)}%`
              }
            />
            <KpiCard
              title="Avg position"
              value={summary.position}
              // Lower position is better — invert delta semantics.
              delta={deltaFraction(summary.position, summary.prev.position)}
              isIncreasePositive={false}
              formatter={(n) =>
                n === null || !Number.isFinite(n) ? '—' : n.toFixed(1)
              }
            />
          </Grid>

          <Collapsible
            icon="🔎"
            title="Top search queries (last 28 days)"
            subtitle="By clicks. Click to load."
          >
            <GscTopQueries />
          </Collapsible>
        </>
      )}
    </section>
  );
}

function GscTopQueries() {
  const [data, setData] = useState<QueriesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await callEdge<QueriesPayload>('ga4-stats', { query: { op: 'gsc_queries' } });
      if (!alive) return;
      if (!r.ok) setError(r.error);
      else setData(r.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-navy-400">
        <Spinner size="sm" /> Loading queries…
      </div>
    );
  }
  if (error) return <ApiErrorBox label="GSC API" message={error} />;
  if (!data || data.queries.length === 0) {
    return <Text className="text-xs text-navy-300">No search queries in this window.</Text>;
  }
  return (
    <ul className="space-y-1">
      {data.queries.map((q) => (
        <li
          key={q.query}
          className="flex items-center gap-3 rounded-md border border-navy-50 bg-white px-3 py-1.5 text-xs"
        >
          <span className="min-w-0 flex-1 truncate text-navy-700">{q.query || '(empty)'}</span>
          <span className="shrink-0 tabular-nums text-navy-500">
            {formatNumber(q.clicks)} clk
          </span>
          <span className="shrink-0 tabular-nums text-navy-300">
            {formatNumber(q.impressions)} impr
          </span>
          <span className="shrink-0 tabular-nums text-navy-300">
            {(q.ctr * 100).toFixed(1)}%
          </span>
          <span className="shrink-0 tabular-nums text-navy-300">pos {q.position.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, subtitle, ctaLabel, ctaHref,
}: { icon: string; title: string; subtitle: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span aria-hidden>{icon}</span>
          <h3 className="text-sm font-semibold text-navy-700">{title}</h3>
        </div>
        <p className="mt-0.5 text-xs text-navy-300">{subtitle}</p>
      </div>
      <a
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
      >
        {ctaLabel}
        <ExternalLinkIcon className="h-3 w-3" />
      </a>
    </div>
  );
}

interface InlineKpiProps {
  title: string;
  value: number;
  delta?: number | undefined;
  isIncreasePositive?: boolean;
  formatter?: (n: number | null) => string;
}

function KpiCard({
  title, value, delta, isIncreasePositive = true, formatter = formatNumber,
}: InlineKpiProps) {
  const deltaType =
    delta === undefined
      ? 'unchanged'
      : delta > 0.005 ? 'increase' : delta < -0.005 ? 'decrease' : 'unchanged';
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <Text>{title}</Text>
        {delta !== undefined && Number.isFinite(delta) && (
          <BadgeDelta deltaType={deltaType} isIncreasePositive={isIncreasePositive} size="xs">
            {`${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
          </BadgeDelta>
        )}
      </div>
      <Metric className="mt-2">{formatter(value)}</Metric>
    </Card>
  );
}

function ApiErrorBox({ label, message }: { label: string; message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <strong>{label} error:</strong> {message}
    </div>
  );
}

function SetupHelper({ error, onRetry }: { error: string; onRetry: () => void }) {
  // Detect the "missing env vars" case so we can render setup steps instead
  // of a bare error banner.
  const isConfigError =
    error.includes('GA4_SERVICE_ACCOUNT_JSON') ||
    error.includes('GA4_PROPERTY_ID') ||
    error.includes('GSC_SITE_URL') ||
    error.includes('GOOGLE_OAUTH');

  if (!isConfigError) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <strong>Edge function failed:</strong> {error}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs text-navy-700 hover:bg-navy-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <strong>Setup pending:</strong> {error}
      </div>
      <Card>
        <Text className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Required Supabase secrets
        </Text>
        <ul className="mt-2 space-y-1 font-mono text-[11px] text-navy-700">
          <li>GA4_SERVICE_ACCOUNT_JSON — SA JSON for GA4</li>
          <li>GOOGLE_OAUTH_CLIENT_ID — admin's OAuth web client</li>
          <li>GOOGLE_OAUTH_CLIENT_SECRET</li>
          <li>GOOGLE_OAUTH_REFRESH_TOKEN — for GSC (UI rejects SA emails)</li>
        </ul>
        <Text className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
          Optional overrides (auto-discovered if omitted)
        </Text>
        <ul className="mt-2 space-y-1 font-mono text-[11px] text-navy-700">
          <li>GA4_PROPERTY_ID — pin to a specific 9-digit property id</li>
          <li>GSC_SITE_URL — pin to "sc-domain:ozly.au" or "https://ozly.au/"</li>
        </ul>
        <Text className="mt-3 text-[11px] text-navy-300">
          Set via <code>supabase secrets set</code>, then redeploy
          <code className="mx-1">ga4-stats</code>.
        </Text>
      </Card>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs text-navy-700 hover:bg-navy-50"
      >
        Retry
      </button>
    </div>
  );
}
