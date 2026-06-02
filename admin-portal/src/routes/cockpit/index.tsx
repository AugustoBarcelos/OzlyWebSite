import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, BarList, Card, DonutChart, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { HubPlaceholder } from '@/components/HubPlaceholder';
import { PendingPayoutsAlert } from '@/components/PendingPayoutsAlert';
import { RawDataPanel } from '@/components/RawDataPanel';
import {
  ArrowUpRightIcon,
  BellIcon,
  DollarSignIcon,
  FunnelIcon,
  HandshakeIcon,
  HomeIcon,
  InboxIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/Icons';
import { formatCurrencyAUD, formatNumber, formatPercent } from '@/lib/format';
import { callRpc, RpcError } from '@/lib/rpc';
import { callEdge } from '@/lib/edge';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { useDashboardData } from '@/routes/dashboard/useDashboardData';
import type { Period } from '@/routes/dashboard/types';

interface AcquisitionOverview {
  cac_blended: number | null;
  total_spend_aud: number;
  new_paying: number | null;
  top_sources: Array<{ source: string; signups: number }>;
}

// ── Site traffic (GA4 + GSC) — mirrors the ga4-stats `op=summary` payload that
// powers Marketing › Site. Surfaced here so the founder sees the website numbers
// without leaving the Cockpit.
interface Ga4Summary {
  sessions: number;
  users: number;
  pageviews: number;
  engagement_rate: number;
  prev: { sessions: number; users: number; pageviews: number; engagement_rate: number };
}
interface GscSummary {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prev: { clicks: number; impressions: number; ctr: number; position: number };
}
interface SiteSummary {
  ga4: Ga4Summary | { error: string };
  gsc: GscSummary | { error: string };
}

/**
 * Builds the optional `delta` prop for KpiHero from a current/previous pair.
 * Returns `{}` (not `{ delta: undefined }`) when not computable, so it satisfies
 * `exactOptionalPropertyTypes`. Delta is a fraction (0.123 = +12.3%).
 */
function deltaProp(
  current: number | undefined,
  previous: number | undefined,
): { delta: number } | Record<string, never> {
  if (
    current === undefined ||
    previous === undefined ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return {};
  }
  return { delta: (current - previous) / previous };
}

/**
 * Cockpit (W2) — north star landing page for Ozly admin.
 *
 * Renders 6 headline KPIs from the founder spec:
 *   1. Signups WoW
 *   2. Trial→Paid %
 *   3. MRR
 *   4. CAC blended (real, via admin_acquisition_overview — null when no spend)
 *   5. Top 3 sources (real, via admin_acquisition_overview top_sources)
 *   6. Churn 30d
 *
 * + a signups timeseries chart, a compact funnel preview, a plan-mix donut,
 * and shortcut cards to drill into Inbox / Affiliates / Funnel.
 *
 * Read-only: every number drills down to its source page via card-level <Link>.
 */
export function CockpitPage() {
  const { filters, periodDays } = useGlobalFilters();
  const period = periodDays as Period;
  const { data, loading, error, refetch } = useDashboardData(period);

  const [acquisition, setAcquisition] = useState<AcquisitionOverview | null>(null);
  const [acquisitionLoading, setAcquisitionLoading] = useState(true);
  const [acquisitionError, setAcquisitionError] = useState<string | null>(null);

  // Site traffic (GA4/GSC). Window is fixed by the edge function (GA4 30d, GSC
  // 28d w/ 3-day lag), so it does NOT react to the global period filter.
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAcquisitionLoading(true);
    setAcquisitionError(null);
    callRpc<AcquisitionOverview>('admin_acquisition_overview', {
      p_period_days: periodDays,
      p_channel: null,
    })
      .then((result) => {
        if (cancelled) return;
        setAcquisition(result);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setAcquisition(null);
          setAcquisitionError(
            'RPC admin_acquisition_overview não aplicada neste ambiente.',
          );
        } else {
          setAcquisitionError(
            e instanceof RpcError ? e.message : e instanceof Error ? e.message : 'Falha',
          );
        }
      })
      .finally(() => {
        if (cancelled) return;
        setAcquisitionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  useEffect(() => {
    let cancelled = false;
    setSiteLoading(true);
    setSiteError(null);
    callEdge<SiteSummary>('ga4-stats', { query: { op: 'summary' } })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setSite(r.data);
        } else {
          setSiteError(r.error);
        }
      })
      .finally(() => {
        if (!cancelled) setSiteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ga4 = site && 'sessions' in site.ga4 ? site.ga4 : null;
  const gsc = site && 'clicks' in site.gsc ? site.gsc : null;

  const signupsSeries = useMemo(
    () =>
      data.timeseries?.series.map((p) => ({ date: p.date, value: p.count })) ??
      [],
    [data.timeseries],
  );

  const paidActiveTotal = useMemo(() => {
    const p = data.kpi?.paid_active;
    if (!p) return null;
    return (p.tfn ?? 0) + (p.abn ?? 0) + (p.pro ?? 0);
  }, [data.kpi]);

  const planMixData = useMemo(() => {
    const p = data.kpi?.paid_active;
    if (!p) return [];
    return [
      { name: 'TFN', value: p.tfn ?? 0 },
      { name: 'ABN', value: p.abn ?? 0 },
      { name: 'PRO', value: p.pro ?? 0 },
    ].filter((r) => r.value > 0);
  }, [data.kpi]);

  // Trial→Paid conversion rate from revenue summary
  const trialToPaidPct = data.revenue?.conversion_trial_to_paid_period ?? null;

  // Funnel preview values
  const funnelRows = useMemo(() => {
    const f = data.funnel;
    if (!f) return [];
    const rows: { name: string; value: number; color: string }[] = [];
    if (f.signups !== null) rows.push({ name: 'Signups', value: f.signups, color: 'emerald' });
    if (f.activations !== null) rows.push({ name: 'Activations', value: f.activations, color: 'lime' });
    if (f.trials !== null) rows.push({ name: 'Trials', value: f.trials, color: 'amber' });
    if (f.paid !== null) rows.push({ name: 'Paid', value: f.paid, color: 'emerald' });
    return rows;
  }, [data.funnel]);

  const topSourcesRows = useMemo(() => {
    if (!acquisition?.top_sources?.length) return [];
    return acquisition.top_sources.map((s) => ({
      name: s.source || 'unknown',
      value: s.signups,
    }));
  }, [acquisition]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <HomeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Cockpit
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Os 6 KPIs que importam — em 30 segundos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
          >
            {loading ? 'Atualizando…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <GlobalFilterBar show={['period']} />

      {/* Pending affiliate payouts — shown only when there's something to pay */}
      <PendingPayoutsAlert />

      {/* Error banner */}
      {error && (
        <div className="ozly-card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {/* North-star KPIs (6 cards) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiHero
          label="Signups (período)"
          value={data.kpi?.signups_period ?? null}
          loading={loading}
          tone="brand"
          hint={`últimos ${period} dias`}
          series={signupsSeries.length > 1 ? signupsSeries : undefined}
          href="/users"
        />
        <KpiHero
          label="Trial → Paid %"
          value={trialToPaidPct}
          formatter={(v) =>
            v === null ? '—' : `${(v * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%`
          }
          loading={loading}
          tone="lime"
          hint="target ≥ 15%"
          href="/revenue"
        />
        <KpiHero
          label="MRR"
          value={data.kpi?.mrr_estimate_aud ?? null}
          formatter={formatCurrencyAUD}
          loading={loading}
          tone="brand"
          {...(data.revenue?.mrr_by_plan
            ? {
                hint: `TFN ${formatCurrencyAUD(data.revenue.mrr_by_plan.tfn)} · ABN ${formatCurrencyAUD(data.revenue.mrr_by_plan.abn)} · PRO ${formatCurrencyAUD(data.revenue.mrr_by_plan.pro)}`,
              }
            : {})}
          href="/revenue"
        />
        <KpiHero
          label="CAC blended"
          value={acquisition?.cac_blended ?? null}
          formatter={formatCurrencyAUD}
          loading={acquisitionLoading}
          tone="neutral"
          hint={
            acquisition?.total_spend_aud
              ? `Spend ${formatCurrencyAUD(acquisition.total_spend_aud)} ÷ ${formatNumber(acquisition.new_paying)} novos paid`
              : 'Sem spend agregado no período'
          }
          href="/growth/funnel"
        />
        <KpiHero
          label="Churn (período)"
          value={data.kpi?.churn_period ?? null}
          loading={loading}
          tone="warning"
          hint="target < 5%/mês"
          isIncreasePositive={false}
          href="/revenue"
        />
        <KpiHero
          label="Paid subscribers"
          value={paidActiveTotal}
          loading={loading}
          tone="lime"
          {...(data.kpi?.paid_active
            ? {
                hint: `TFN ${formatNumber(data.kpi.paid_active.tfn)} · ABN ${formatNumber(data.kpi.paid_active.abn)} · PRO ${formatNumber(data.kpi.paid_active.pro)}`,
              }
            : {})}
          href="/users"
        />
      </section>

      {/* Site traffic (ozly.au) — GA4 + Search Console */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">
              Tráfego do site — ozly.au
            </h2>
            <p className="mt-0.5 text-xs text-navy-300">
              GA4 últimos 30d · Search Console últimos 28d (lag de 3 dias)
            </p>
          </div>
          <Link
            to="/marketing/seo"
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
          >
            Detalhe + top pages <ArrowUpRightIcon className="h-3 w-3" />
          </Link>
        </div>

        {siteError ? (
          <div className="ozly-card border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700">
            <strong>Heads up:</strong> não deu pra carregar o tráfego do site (
            <code className="font-mono">ga4-stats</code>): {siteError}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiHero
              label="Sessions (GA4)"
              value={ga4?.sessions ?? null}
              loading={siteLoading}
              tone="brand"
              href="/marketing/seo"
              {...deltaProp(ga4?.sessions, ga4?.prev.sessions)}
            />
            <KpiHero
              label="Users (GA4)"
              value={ga4?.users ?? null}
              loading={siteLoading}
              tone="brand"
              href="/marketing/seo"
              {...deltaProp(ga4?.users, ga4?.prev.users)}
            />
            <KpiHero
              label="Pageviews (GA4)"
              value={ga4?.pageviews ?? null}
              loading={siteLoading}
              tone="lime"
              href="/marketing/seo"
              {...deltaProp(ga4?.pageviews, ga4?.prev.pageviews)}
            />
            <KpiHero
              label="Clicks (Search)"
              value={gsc?.clicks ?? null}
              loading={siteLoading}
              tone="brand"
              href="/marketing/seo"
              {...deltaProp(gsc?.clicks, gsc?.prev.clicks)}
            />
            <KpiHero
              label="Impressions (Search)"
              value={gsc?.impressions ?? null}
              loading={siteLoading}
              tone="neutral"
              href="/marketing/seo"
              {...deltaProp(gsc?.impressions, gsc?.prev.impressions)}
            />
            <KpiHero
              label="Posição média (Search)"
              value={gsc?.position ?? null}
              formatter={(v) => (v === null || !Number.isFinite(v) ? '—' : v.toFixed(1))}
              loading={siteLoading}
              tone="neutral"
              hint="menor = melhor"
              isIncreasePositive={false}
              href="/marketing/seo"
              {...deltaProp(gsc?.position, gsc?.prev.position)}
            />
          </div>
        )}
      </section>

      {/* Top sources placeholder + Plan mix */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="ozly-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              Top 3 sources de signup
            </Title>
            <Link
              to="/growth"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Ver Growth Hub <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {acquisitionError && (
            <div className="rounded-md border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700">
              <strong>Heads up:</strong> {acquisitionError}
            </div>
          )}
          {acquisitionLoading ? (
            <div className="mt-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-7 animate-pulse rounded-md bg-navy-50" />
              ))}
            </div>
          ) : topSourcesRows.length > 0 ? (
            <BarList
              data={topSourcesRows}
              color="emerald"
              valueFormatter={formatNumber}
              className="mt-3"
            />
          ) : (
            <div className="mt-3 text-xs text-navy-300">
              Sem signups com first-touch UTM no período — depende de{' '}
              <code className="font-mono">marketing_utm_links_signups</code>.
            </div>
          )}
        </Card>

        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">Plan mix</Title>
          {planMixData.length > 0 ? (
            <DonutChart
              data={planMixData}
              category="value"
              index="name"
              colors={['emerald', 'lime', 'amber']}
              valueFormatter={formatNumber}
              className="mt-2 h-48"
            />
          ) : (
            <div className="mt-4 text-xs text-navy-300">Sem dados ainda.</div>
          )}
        </Card>
      </section>

      {/* Downloads por plataforma (iOS / Android / Unknown) */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="ozly-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              Downloads por plataforma
            </Title>
            <span className="text-xs text-navy-400">
              {filters.period === 'custom' ? 'custom' : `últimos ${period} dias`}
            </span>
          </div>
          {data.downloadsByPlatform && data.downloadsByPlatform.total > 0 ? (
            <BarList
              data={[
                { name: 'iOS (App Store)', value: data.downloadsByPlatform.ios, color: 'sky' },
                { name: 'Android (Play Store)', value: data.downloadsByPlatform.android, color: 'emerald' },
                { name: 'Outros / desconhecido', value: data.downloadsByPlatform.unknown, color: 'navy' },
              ]}
              valueFormatter={formatNumber}
              className="mt-1"
            />
          ) : (
            <div className="mt-4 text-xs text-navy-300">
              Sem signups no período (ou pipeline RC ainda não populou last_seen_platform).
            </div>
          )}
        </Card>

        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">Split iOS×Android</Title>
          {data.downloadsByPlatform && (data.downloadsByPlatform.ios + data.downloadsByPlatform.android) > 0 ? (
            <DonutChart
              data={[
                { name: 'iOS', value: data.downloadsByPlatform.ios },
                { name: 'Android', value: data.downloadsByPlatform.android },
              ].filter((r) => r.value > 0)}
              category="value"
              index="name"
              colors={['sky', 'emerald']}
              valueFormatter={formatNumber}
              className="mt-2 h-40"
            />
          ) : (
            <div className="mt-4 text-xs text-navy-300">Sem dados ainda.</div>
          )}
        </Card>
      </section>

      {/* Signups timeseries */}
      {signupsSeries.length > 1 && (
        <Card className="ozly-card">
          <div className="mb-2 flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              Signups por dia
            </Title>
            <span className="text-xs text-navy-400">
              {filters.period === 'custom' ? 'custom' : `últimos ${period} dias`}
            </span>
          </div>
          <AreaChart
            data={signupsSeries}
            categories={['value']}
            index="date"
            colors={['emerald']}
            showLegend={false}
            valueFormatter={formatNumber}
            className="h-56"
          />
        </Card>
      )}

      {/* Funnel preview */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="ozly-card">
          <div className="mb-3 flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              Funil resumido
            </Title>
            <Link
              to="/growth/funnel"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Funnel completo <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {funnelRows.length > 0 ? (
            <ul className="space-y-2">
              {funnelRows.map((row, i) => {
                const prev = i > 0 ? funnelRows[i - 1]?.value : null;
                const conv = prev !== null && prev !== undefined && prev > 0 ? row.value / prev : null;
                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-navy-700">{row.name}</span>
                      {conv !== null && (
                        <span className="text-[11px] text-navy-400">
                          ({formatPercent(row.value, prev ?? 0)} do anterior)
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-navy-700">
                      {formatNumber(row.value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-xs text-navy-300">Sem dados de funil ainda.</div>
          )}
        </Card>

        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">Trials</Title>
          {data.kpi ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Active trials" value={data.kpi.trials_active} />
              <Stat label="Started (período)" value={data.kpi.trials_started_period} />
              <Stat label="Expirando 7d" value={data.kpi.trials_expiring_7d} />
              <Stat label="Lapsed (período)" value={data.kpi.trials_lapsed_period} />
            </div>
          ) : (
            <div className="text-xs text-navy-300">Sem dados ainda.</div>
          )}
        </Card>
      </section>

      {/* Quick links — drill-down */}
      <HubPlaceholder
        title="Próximas ações"
        subtitle="Atalhos pros lugares onde você costuma agir."
        links={[
          {
            label: 'Inbox',
            to: '/inbox',
            description: 'Alerts, support tickets, refunds, system events.',
            icon: InboxIcon,
          },
          {
            label: 'Affiliates',
            to: '/affiliates',
            description: 'Veja afiliados pendentes de pagamento.',
            icon: HandshakeIcon,
          },
          {
            label: 'Sales Funnel',
            to: '/growth/funnel',
            description: 'Visão completa Impression → Retained.',
            icon: FunnelIcon,
          },
          {
            label: 'Revenue',
            to: '/revenue',
            description: 'MRR, trials, plan mix, cohorts.',
            icon: DollarSignIcon,
          },
          {
            label: 'Users',
            to: '/users',
            description: 'CRM — buscar, inspecionar, segmentar.',
            icon: UsersIcon,
          },
          {
            label: 'Growth',
            to: '/growth',
            description: 'Aquisição + canais + atribuição.',
            icon: TrendingUpIcon,
          },
          {
            label: 'Bell — Alerts (V2)',
            to: '/inbox/alerts',
            description: 'Anomalias detectadas por IA — em construção.',
            icon: BellIcon,
            status: 'parte2',
          },
        ]}
      />

      {/* Engineer mode raw data — only visible when toggled on */}
      <RawDataPanel
        page="cockpit"
        sources={[
          { rpc: 'admin_kpi_dashboard', params: { p_period_days: period }, data: data.kpi },
          { rpc: 'admin_revenue_summary', params: { p_period_days: period }, data: data.revenue },
          { rpc: 'admin_signups_timeseries', params: { p_period_days: period }, data: data.timeseries },
          { rpc: 'admin_funnel', params: { p_period_days: period }, data: data.funnel },
          {
            rpc: 'admin_acquisition_overview',
            params: { p_period_days: period, p_channel: null },
            data: acquisition,
            ...(acquisitionError ? { note: acquisitionError } : {}),
          },
        ]}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md border border-navy-50 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-navy-700">{formatNumber(value)}</div>
    </div>
  );
}
