import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  BarList,
  Card,
  DonutChart,
  Title,
} from '@tremor/react';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { Spinner } from '@/components/Spinner';
import { ArrowUpRightIcon, LayoutDashboardIcon } from '@/components/Icons';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { callRpc, RpcError } from '@/lib/rpc';
import { downloadCsv } from '@/lib/csv';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';

/**
 * /data — Data Hub
 *
 * Single page aggregating the operational picture for data analysts and
 * management. Reuses existing RPCs where possible + 2 new ones added in
 * migration 20260518100000_admin_data_hub_rpcs.sql.
 *
 * Each card has a CSV download button so analysts can pull any dataset
 * without drilling into the source page.
 */

// ─── Response shapes (subset — only what we render here) ─────────────────────
interface KpiResp {
  signups_period?: number | null;
  signups_total?: number | null;
  trials_active?: number | null;
  paid_active?: { tfn?: number | null; abn?: number | null; pro?: number | null } | null;
}
interface RevenueResp {
  mrr_cents?: number | null;
  arr_cents?: number | null;
  revenue_period_cents?: number | null;
  conversion_trial_to_paid_period?: number | null;
}
interface JobsTsResp {
  series?: Array<{ date: string; count: number }>;
}
interface ActiveUsersTsResp {
  series?: Array<{ date: string; dau: number; mau?: number | null }>;
}
interface TopErrorsResp {
  rows?: Array<{ message: string; count: number; users_affected?: number | null; last_seen?: string | null }>;
}
interface FeatureUsageResp {
  rows?: Array<{ feature: string; events: number; users: number }>;
}
interface DownloadsByPlatformResp {
  ios: number;
  android: number;
  unknown: number;
  total: number;
}
interface AppVersionResp {
  total: number;
  rows: Array<{ app_version: string; platform: string; count: number }>;
}
interface AffiliateRoiResp {
  period: { payouts_cents: number; revenue_cents: number; conversions: number; roi_pct: number | null };
  lifetime: { payouts_cents: number; revenue_cents: number; conversions: number; roi_pct: number | null };
}

interface HubData {
  kpi: KpiResp | null;
  revenue: RevenueResp | null;
  jobs: JobsTsResp | null;
  activeUsers: ActiveUsersTsResp | null;
  topErrors: TopErrorsResp | null;
  featureUsage: FeatureUsageResp | null;
  downloadsPlatform: DownloadsByPlatformResp | null;
  appVersions: AppVersionResp | null;
  affiliateRoi: AffiliateRoiResp | null;
}

const EMPTY: HubData = {
  kpi: null,
  revenue: null,
  jobs: null,
  activeUsers: null,
  topErrors: null,
  featureUsage: null,
  downloadsPlatform: null,
  appVersions: null,
  affiliateRoi: null,
};

async function safeCall<T>(rpc: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    return await callRpc<T>(rpc, args);
  } catch (e) {
    if (e instanceof RpcError && (e.code === '42883' || e.message.includes('does not exist'))) {
      return null;
    }
    throw e;
  }
}

function useDataHub(periodDays: number) {
  const [data, setData] = useState<HubData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const techPeriod = Math.min(periodDays, 90);
      const [
        kpi,
        revenue,
        jobs,
        activeUsers,
        topErrors,
        featureUsage,
        downloadsPlatform,
        appVersions,
        affiliateRoi,
      ] = await Promise.all([
        safeCall<KpiResp>('admin_kpi_dashboard', { p_period_days: periodDays }),
        safeCall<RevenueResp>('admin_revenue_summary', { p_period_days: periodDays }),
        safeCall<JobsTsResp>('admin_jobs_timeseries', { p_period_days: periodDays }),
        safeCall<ActiveUsersTsResp>('admin_active_users_timeseries', { p_period_days: techPeriod }),
        safeCall<TopErrorsResp>('admin_top_errors', { p_period_days: techPeriod, p_limit: 10 }),
        safeCall<FeatureUsageResp>('admin_feature_usage_top', { p_period_days: techPeriod, p_limit: 10 }),
        safeCall<DownloadsByPlatformResp>('admin_downloads_by_platform', { p_period_days: periodDays }),
        safeCall<AppVersionResp>('admin_downloads_by_app_version', { p_period_days: periodDays, p_limit: 10 }),
        safeCall<AffiliateRoiResp>('admin_affiliate_roi_summary', { p_period_days: periodDays }),
      ]);
      setData({
        kpi,
        revenue,
        jobs,
        activeUsers,
        topErrors,
        featureUsage,
        downloadsPlatform,
        appVersions,
        affiliateRoi,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}

// ─── Card wrapper with CSV download ──────────────────────────────────────────
interface DataCardProps {
  title: string;
  subtitle?: string;
  drillTo?: string;
  drillLabel?: string;
  csvRows: ReadonlyArray<Record<string, string | number | null | undefined>>;
  csvFilename: string;
  className?: string;
  children: React.ReactNode;
}

function DataCard({
  title,
  subtitle,
  drillTo,
  drillLabel = 'Ver detalhes',
  csvRows,
  csvFilename,
  className,
  children,
}: DataCardProps) {
  return (
    <Card className={`ozly-card ${className ?? ''}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <Title className="!text-sm !font-semibold text-navy-700">{title}</Title>
          {subtitle && <p className="mt-0.5 text-xs text-navy-300">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {drillTo && (
            <Link
              to={drillTo}
              className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
            >
              {drillLabel} <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => downloadCsv(csvRows, csvFilename)}
            disabled={csvRows.length === 0}
            title={csvRows.length === 0 ? 'Sem dados pra exportar' : 'Baixar CSV'}
            className="rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⬇ CSV
          </button>
        </div>
      </div>
      {children}
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function DataHubPage() {
  const { filters, periodDays } = useGlobalFilters();
  const { data, loading, error, refetch } = useDataHub(periodDays);

  // Memoize derived rows (CSV and chart inputs)
  const userHealthRows = useMemo(() => {
    const k = data.kpi;
    if (!k) return [];
    const p = k.paid_active ?? {};
    return [
      { metric: 'signups_total',         value: k.signups_total ?? 0 },
      { metric: 'signups_period',        value: k.signups_period ?? 0 },
      { metric: 'trials_active',         value: k.trials_active ?? 0 },
      { metric: 'paid_active_tfn',       value: p.tfn ?? 0 },
      { metric: 'paid_active_abn',       value: p.abn ?? 0 },
      { metric: 'paid_active_pro',       value: p.pro ?? 0 },
    ];
  }, [data.kpi]);

  const revenueRows = useMemo(() => {
    const r = data.revenue;
    if (!r) return [];
    return [
      { metric: 'mrr_aud',                       value: ((r.mrr_cents ?? 0) / 100).toFixed(2) },
      { metric: 'arr_aud',                       value: ((r.arr_cents ?? 0) / 100).toFixed(2) },
      { metric: 'revenue_period_aud',            value: ((r.revenue_period_cents ?? 0) / 100).toFixed(2) },
      { metric: 'conversion_trial_to_paid_pct',  value: r.conversion_trial_to_paid_period ?? 0 },
    ];
  }, [data.revenue]);

  const jobsSeries = useMemo(() => data.jobs?.series ?? [], [data.jobs]);
  const activeUsersSeries = useMemo(() => data.activeUsers?.series ?? [], [data.activeUsers]);
  const topErrorsRows = useMemo(() => data.topErrors?.rows ?? [], [data.topErrors]);
  const featureRows = useMemo(() => data.featureUsage?.rows ?? [], [data.featureUsage]);
  const appVersionRows = useMemo(() => data.appVersions?.rows ?? [], [data.appVersions]);

  const downloadsPlatformRows = useMemo(() => {
    const d = data.downloadsPlatform;
    if (!d) return [];
    return [
      { platform: 'ios',     count: d.ios },
      { platform: 'android', count: d.android },
      { platform: 'unknown', count: d.unknown },
    ];
  }, [data.downloadsPlatform]);

  const affiliateRoiRows = useMemo(() => {
    const a = data.affiliateRoi;
    if (!a) return [];
    return [
      { scope: 'period',   payouts_aud: (a.period.payouts_cents / 100).toFixed(2),   revenue_aud: (a.period.revenue_cents / 100).toFixed(2),   conversions: a.period.conversions,   roi_pct: a.period.roi_pct ?? '' },
      { scope: 'lifetime', payouts_aud: (a.lifetime.payouts_cents / 100).toFixed(2), revenue_aud: (a.lifetime.revenue_cents / 100).toFixed(2), conversions: a.lifetime.conversions, roi_pct: a.lifetime.roi_pct ?? '' },
    ];
  }, [data.affiliateRoi]);

  const periodLabel = filters.period === 'custom' ? 'custom' : `últimos ${periodDays} dias`;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ozly-card bg-rose-50/60 p-4 text-sm text-rose-700">
        Erro ao carregar Data Hub: {error}
        <button type="button" onClick={refetch} className="ml-2 underline">Tentar de novo</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="ozly-card flex items-start justify-between bg-white p-4">
        <div className="flex items-start gap-3">
          <LayoutDashboardIcon className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <h1 className="text-lg font-semibold text-navy-800">Data Hub</h1>
            <p className="text-xs text-navy-400">
              Visão única pra time de data e gerência. Tudo agregado, com export CSV em cada card.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          ↻ Refresh
        </button>
      </div>

      <GlobalFilterBar show={['period']} />

      {/* A. Users & Engagement */}
      <section className="grid gap-4 lg:grid-cols-3">
        <DataCard
          title="User health snapshot"
          subtitle={periodLabel}
          drillTo="/users"
          drillLabel="Ver users"
          csvRows={userHealthRows}
          csvFilename={`user_health_${periodDays}d_${todayIso()}`}
        >
          {userHealthRows.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {userHealthRows.map((r) => (
                <div key={r.metric} className="rounded-md bg-navy-50/40 px-2.5 py-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-navy-400">{r.metric.replace(/_/g, ' ')}</div>
                  <div className="font-semibold text-navy-700">{formatNumber(Number(r.value))}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-navy-300">Sem dados ainda.</p>
          )}
        </DataCard>

        <DataCard
          title="Active users (DAU)"
          subtitle={periodLabel}
          drillTo="/insights"
          drillLabel="Ver insights"
          csvRows={activeUsersSeries}
          csvFilename={`active_users_${periodDays}d_${todayIso()}`}
        >
          {activeUsersSeries.length > 0 ? (
            <AreaChart
              data={activeUsersSeries}
              index="date"
              categories={['dau']}
              colors={['emerald']}
              showLegend={false}
              valueFormatter={formatNumber}
              className="h-32"
            />
          ) : (
            <p className="text-xs text-navy-300">Sem dados.</p>
          )}
        </DataCard>

        <DataCard
          title="Platform split (signups)"
          subtitle={periodLabel}
          drillTo="/cockpit"
          drillLabel="Ver cockpit"
          csvRows={downloadsPlatformRows}
          csvFilename={`platform_split_${periodDays}d_${todayIso()}`}
        >
          {data.downloadsPlatform && data.downloadsPlatform.total > 0 ? (
            <DonutChart
              data={downloadsPlatformRows.filter((r) => r.count > 0).map((r) => ({ name: r.platform, value: r.count }))}
              category="value"
              index="name"
              colors={['sky', 'emerald', 'navy']}
              valueFormatter={formatNumber}
              className="h-32"
            />
          ) : (
            <p className="text-xs text-navy-300">Sem signups no período.</p>
          )}
        </DataCard>
      </section>

      {/* B. Operations */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="Jobs criados / dia"
          subtitle={periodLabel}
          drillTo="/dashboard"
          drillLabel="Ver dashboard"
          csvRows={jobsSeries}
          csvFilename={`jobs_${periodDays}d_${todayIso()}`}
        >
          {jobsSeries.length > 0 ? (
            <AreaChart
              data={jobsSeries}
              index="date"
              categories={['count']}
              colors={['lime']}
              showLegend={false}
              valueFormatter={formatNumber}
              className="h-32"
            />
          ) : (
            <p className="text-xs text-navy-300">Sem dados.</p>
          )}
        </DataCard>

        <DataCard
          title="Feature adoption — top 10"
          subtitle={periodLabel}
          drillTo="/product/engagement"
          drillLabel="Ver engagement"
          csvRows={featureRows}
          csvFilename={`features_${periodDays}d_${todayIso()}`}
        >
          {featureRows.length > 0 ? (
            <BarList
              data={featureRows.map((r) => ({ name: r.feature, value: r.events }))}
              color="emerald"
              valueFormatter={formatNumber}
              className="mt-1"
            />
          ) : (
            <p className="text-xs text-navy-300">Sem dados.</p>
          )}
        </DataCard>
      </section>

      {/* C. Revenue & Affiliate */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="Revenue snapshot"
          subtitle="MRR · ARR · conversão trial→paid"
          drillTo="/finance"
          drillLabel="Ver finance"
          csvRows={revenueRows}
          csvFilename={`revenue_${periodDays}d_${todayIso()}`}
        >
          {data.revenue ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <KpiTile label="MRR" value={formatCurrencyAUD((data.revenue.mrr_cents ?? 0) / 100)} />
              <KpiTile label="ARR" value={formatCurrencyAUD((data.revenue.arr_cents ?? 0) / 100)} />
              <KpiTile label="Revenue (período)" value={formatCurrencyAUD((data.revenue.revenue_period_cents ?? 0) / 100)} />
              <KpiTile label="Trial → Paid" value={data.revenue.conversion_trial_to_paid_period != null ? `${data.revenue.conversion_trial_to_paid_period.toFixed(1)}%` : '—'} />
            </div>
          ) : (
            <p className="text-xs text-navy-300">Sem dados.</p>
          )}
        </DataCard>

        <DataCard
          title="Affiliate ROI"
          subtitle={`Pago vs revenue gerado · ${periodLabel}`}
          drillTo="/affiliates"
          drillLabel="Ver affiliates"
          csvRows={affiliateRoiRows}
          csvFilename={`affiliate_roi_${periodDays}d_${todayIso()}`}
        >
          {data.affiliateRoi ? (
            <div className="space-y-2 text-xs">
              <RoiRow scope="Período" data={data.affiliateRoi.period} />
              <RoiRow scope="Lifetime" data={data.affiliateRoi.lifetime} />
            </div>
          ) : (
            <p className="text-xs text-navy-300">Sem dados.</p>
          )}
        </DataCard>
      </section>

      {/* D. Tech / Reliability */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="App versions in flight"
          subtitle="Top 10 por novos signups"
          drillTo="/tech/database"
          drillLabel="Ver tech"
          csvRows={appVersionRows}
          csvFilename={`app_versions_${periodDays}d_${todayIso()}`}
        >
          {appVersionRows.length > 0 ? (
            <BarList
              data={appVersionRows.map((r) => ({
                name: `${r.app_version} · ${r.platform}`,
                value: r.count,
              }))}
              color="sky"
              valueFormatter={formatNumber}
              className="mt-1"
            />
          ) : (
            <p className="text-xs text-navy-300">Sem dados.</p>
          )}
        </DataCard>

        <DataCard
          title="Erros recentes — top 10"
          subtitle={periodLabel}
          drillTo="/tech/errors"
          drillLabel="Ver errors"
          csvRows={topErrorsRows}
          csvFilename={`top_errors_${periodDays}d_${todayIso()}`}
        >
          {topErrorsRows.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {topErrorsRows.slice(0, 10).map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-2 rounded-md bg-rose-50/40 px-2 py-1">
                  <span className="truncate text-navy-700">{e.message}</span>
                  <span className="shrink-0 font-mono text-rose-600">{formatNumber(e.count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-navy-300">Sem erros no período. 🎉</p>
          )}
        </DataCard>
      </section>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-navy-50/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-navy-400">{label}</div>
      <div className="font-semibold text-navy-700">{value}</div>
    </div>
  );
}

function RoiRow({
  scope,
  data,
}: {
  scope: string;
  data: { payouts_cents: number; revenue_cents: number; conversions: number; roi_pct: number | null };
}) {
  return (
    <div className="rounded-md border border-navy-50 bg-white px-2.5 py-2">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-navy-400">{scope}</div>
      <div className="grid grid-cols-4 gap-2 text-[11px]">
        <span>Payouts <strong className="block text-navy-700">{formatCurrencyAUD(data.payouts_cents / 100)}</strong></span>
        <span>Revenue <strong className="block text-emerald-700">{formatCurrencyAUD(data.revenue_cents / 100)}</strong></span>
        <span>Conv. <strong className="block text-navy-700">{formatNumber(data.conversions)}</strong></span>
        <span>ROI <strong className={`block ${data.roi_pct && data.roi_pct >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>{data.roi_pct != null ? `${data.roi_pct}%` : '—'}</strong></span>
      </div>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
