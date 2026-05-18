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
 * /data — Data Hub (iter 2)
 *
 * Operational dashboard for data analysts and management. Iteration 2 adds:
 *   - Data freshness banner (RC sync + KPI snapshot + cron status)
 *   - Period-over-period delta on every KPI tile
 *   - MRR movement waterfall
 *   - Retention cohort heatmap (D1/D7/D30)
 *   - Funnel breakdown (impressions → paid)
 *   - CAC + LTV:CAC by channel
 *   - Top affiliates by ROI individual
 *   - Signups + DAU segmented by plan
 *
 * Each card has CSV download. Period switcher driven by GlobalFilterBar.
 */

// ─── Response shapes ─────────────────────────────────────────────────────────
interface KpiResp {
  signups_period?: number | null;
  signups_total?: number | null;
  trials_active?: number | null;
  paid_active?: { tfn?: number | null; abn?: number | null; pro?: number | null } | null;
}
interface RevenueResp {
  mrr_total?: number | null;
  mrr_by_plan?: { tfn?: number | null; abn?: number | null; pro?: number | null } | null;
  churn_period?: number | null;
}
interface TimePoint { date: string; count: number; [k: string]: unknown }
interface JobsTsResp { series?: TimePoint[] }
interface ActiveUsersTsResp { series?: TimePoint[] }

interface PlanTimeSeriesPoint {
  date: string;
  free: number; tfn: number; abn: number; pro: number; total: number;
  [k: string]: unknown;
}
interface SignupsByPlanResp { series?: PlanTimeSeriesPoint[] }
interface DauByPlanResp { series?: PlanTimeSeriesPoint[] }

interface TopErrorsResp {
  rows?: Array<{ message: string; count: number; users_affected?: number | null; last_seen?: string | null }>;
}
interface FeatureUsageResp {
  rows?: Array<{ feature: string; events: number; users: number }>;
}

interface DownloadsByPlatformResp { ios: number; android: number; unknown: number; total: number }
interface AppVersionResp {
  total: number;
  rows: Array<{ app_version: string; platform: string; count: number }>;
}

interface AffiliateRoiResp {
  period: { payouts_cents: number; revenue_cents: number; conversions: number; roi_pct: number | null };
  lifetime: { payouts_cents: number; revenue_cents: number; conversions: number; roi_pct: number | null };
}
interface TopAffiliateRow {
  affiliate_id: string; code: string; name: string;
  revenue_cents: number; paid_cents: number; conversions: number; roi_pct: number | null;
}
interface TopAffiliatesResp { rows?: TopAffiliateRow[] }

interface MrrMovementResp {
  current_mrr_aud: number;
  new_mrr_aud: number;
  churn_mrr_aud: number;
  expansion_mrr_aud: number | null;
  downgrade_mrr_aud: number | null;
  net_mrr_delta_aud: number;
  new_count: number;
  churn_count: number;
  quick_ratio: number | null;
}

interface CohortRow { cohort: string; size: number; d1: number | null; d7: number | null; d14: number | null; d30: number | null; d60: number | null }
interface CohortResp { cohorts?: CohortRow[] }

interface FunnelResp {
  signups: number | null;
  activations: number | null;
  trials: number | null;
  paid: number | null;
}

interface AcquisitionResp {
  cac_blended?: number | null;
  total_spend_aud?: number | null;
  new_paying?: number | null;
  cac_by_channel?: Array<{ channel: string; spend: number; conversions: number; cpa: number | null }>;
}

interface FreshnessResp {
  rc_sync_last_at: string | null;
  rc_sync_lag_minutes: number | null;
  rc_sync_status: 'never' | 'fresh' | 'stale' | 'broken';
  kpi_snapshot_last_at: string | null;
  kpi_snapshot_lag_minutes: number | null;
  kpi_snapshot_status: 'never' | 'fresh' | 'stale' | 'broken';
  cron_jobs: Array<{ jobname: string; schedule: string; last_run: string | null; last_status: string | null }>;
}

interface HubData {
  // Current period
  kpi: KpiResp | null;
  revenue: RevenueResp | null;
  jobs: JobsTsResp | null;
  activeUsers: ActiveUsersTsResp | null;
  signupsByPlan: SignupsByPlanResp | null;
  dauByPlan: DauByPlanResp | null;
  topErrors: TopErrorsResp | null;
  featureUsage: FeatureUsageResp | null;
  downloadsPlatform: DownloadsByPlatformResp | null;
  appVersions: AppVersionResp | null;
  affiliateRoi: AffiliateRoiResp | null;
  topAffiliates: TopAffiliatesResp | null;
  mrrMovement: MrrMovementResp | null;
  cohort: CohortResp | null;
  funnel: FunnelResp | null;
  acquisition: AcquisitionResp | null;
  freshness: FreshnessResp | null;
  // Previous period (for deltas) — minimal subset
  prevKpi: KpiResp | null;
  prevRevenue: RevenueResp | null;
  prevMrrMovement: MrrMovementResp | null;
}

const EMPTY: HubData = {
  kpi: null, revenue: null, jobs: null, activeUsers: null,
  signupsByPlan: null, dauByPlan: null,
  topErrors: null, featureUsage: null,
  downloadsPlatform: null, appVersions: null,
  affiliateRoi: null, topAffiliates: null,
  mrrMovement: null, cohort: null, funnel: null, acquisition: null,
  freshness: null,
  prevKpi: null, prevRevenue: null, prevMrrMovement: null,
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
      const dauPeriod = Math.min(periodDays, 90);
      const prevPeriod = periodDays; // prev window of equal length, just offset

      const [
        kpi, revenue, jobs, activeUsers,
        signupsByPlan, dauByPlan,
        topErrors, featureUsage,
        downloadsPlatform, appVersions,
        affiliateRoi, topAffiliates,
        mrrMovement, cohort, funnel, acquisition,
        freshness,
        // prev period (length = periodDays, offset by periodDays days back)
        // We approximate by passing p_period_days = 2*periodDays and subtracting current values.
        // For RPCs that don't support offset, we use 2x window and compute delta.
        prevKpi, prevRevenue, prevMrrMovement,
      ] = await Promise.all([
        safeCall<KpiResp>('admin_kpi_dashboard', { p_period_days: periodDays }),
        safeCall<RevenueResp>('admin_revenue_summary', { p_period_days: periodDays }),
        safeCall<JobsTsResp>('admin_jobs_timeseries', { p_period_days: periodDays }),
        safeCall<ActiveUsersTsResp>('admin_active_users_timeseries', { p_period_days: techPeriod }),
        safeCall<SignupsByPlanResp>('admin_signups_by_plan_timeseries', { p_period_days: periodDays }),
        safeCall<DauByPlanResp>('admin_dau_by_plan_timeseries', { p_period_days: dauPeriod }),
        safeCall<TopErrorsResp>('admin_top_errors', { p_period_days: techPeriod, p_limit: 10 }),
        safeCall<FeatureUsageResp>('admin_feature_usage_top', { p_period_days: techPeriod, p_limit: 10 }),
        safeCall<DownloadsByPlatformResp>('admin_downloads_by_platform', { p_period_days: periodDays }),
        safeCall<AppVersionResp>('admin_downloads_by_app_version', { p_period_days: periodDays, p_limit: 10 }),
        safeCall<AffiliateRoiResp>('admin_affiliate_roi_summary', { p_period_days: periodDays }),
        safeCall<TopAffiliatesResp>('admin_top_affiliates_roi', { p_period_days: periodDays, p_limit: 10 }),
        safeCall<MrrMovementResp>('admin_mrr_movement', { p_period_days: periodDays }),
        safeCall<CohortResp>('admin_cohort_retention', {}),
        safeCall<FunnelResp>('admin_funnel', { p_period_days: periodDays }),
        safeCall<AcquisitionResp>('admin_acquisition_overview', {}),
        safeCall<FreshnessResp>('admin_data_freshness', {}),
        // Prev period — same RPC with doubled window. We'll subtract on render.
        safeCall<KpiResp>('admin_kpi_dashboard', { p_period_days: prevPeriod * 2 }),
        safeCall<RevenueResp>('admin_revenue_summary', { p_period_days: prevPeriod * 2 }),
        safeCall<MrrMovementResp>('admin_mrr_movement', { p_period_days: prevPeriod * 2 }),
      ]);

      setData({
        kpi, revenue, jobs, activeUsers,
        signupsByPlan, dauByPlan,
        topErrors, featureUsage,
        downloadsPlatform, appVersions,
        affiliateRoi, topAffiliates,
        mrrMovement, cohort, funnel, acquisition,
        freshness,
        prevKpi, prevRevenue, prevMrrMovement,
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

// ─── Delta utilities ─────────────────────────────────────────────────────────
function computeDelta(current: number | null | undefined, prev: number | null | undefined): {
  pct: number | null;
  arrow: '↑' | '↓' | '→' | '—';
  cls: string;
} {
  if (current == null || prev == null) return { pct: null, arrow: '—', cls: 'text-navy-300' };
  if (prev === 0 && current === 0) return { pct: 0, arrow: '→', cls: 'text-navy-400' };
  if (prev === 0) return { pct: null, arrow: '↑', cls: 'text-emerald-600' };
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 1) return { pct, arrow: '→', cls: 'text-navy-400' };
  if (pct > 0) return { pct, arrow: '↑', cls: 'text-emerald-600' };
  return { pct, arrow: '↓', cls: 'text-rose-600' };
}

// ─── Reusable widgets ────────────────────────────────────────────────────────
interface DataCardProps {
  title: string;
  subtitle?: string;
  drillTo?: string;
  drillLabel?: string;
  csvRows: ReadonlyArray<Record<string, unknown>>;
  csvFilename: string;
  className?: string;
  children: React.ReactNode;
}

function DataCard({
  title, subtitle, drillTo, drillLabel = 'Ver detalhes',
  csvRows, csvFilename, className, children,
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
            <Link to={drillTo} className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700">
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

interface KpiTileProps {
  label: string;
  value: string;
  delta?: { pct: number | null; arrow: string; cls: string };
}
function KpiTile({ label, value, delta }: KpiTileProps) {
  return (
    <div className="rounded-md bg-navy-50/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-navy-400">{label}</div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-semibold text-navy-700">{value}</span>
        {delta && delta.pct != null && (
          <span className={`text-[10px] font-medium ${delta.cls}`}>
            {delta.arrow} {Math.abs(delta.pct).toFixed(1)}%
          </span>
        )}
        {delta && delta.pct == null && (
          <span className="text-[10px] text-navy-300">{delta.arrow}</span>
        )}
      </div>
    </div>
  );
}

function FreshnessBadge({ status, label, value }: { status: 'fresh' | 'stale' | 'broken' | 'never'; label: string; value: string }) {
  const cls = status === 'fresh'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : status === 'stale'  ? 'bg-amber-50 text-amber-700 border-amber-200'
            : status === 'broken' ? 'bg-rose-50 text-rose-700 border-rose-200'
            :                       'bg-navy-50 text-navy-600 border-navy-200';
  const icon = status === 'fresh' ? '✓' : status === 'stale' ? '⚠' : status === 'broken' ? '✕' : '—';
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${cls}`}>
      <span className="font-bold">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

function lagText(minutes: number | null): string {
  if (minutes == null) return 'nunca';
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${Math.round(minutes)}min`;
  if (minutes < 60 * 24) return `há ${Math.round(minutes / 60)}h`;
  return `há ${Math.round(minutes / 60 / 24)}d`;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function DataHubPage() {
  const { filters, periodDays } = useGlobalFilters();
  const { data, loading, error, refetch } = useDataHub(periodDays);

  const periodLabel = filters.period === 'custom' ? 'custom' : `últimos ${periodDays} dias`;

  // ── Derived: deltas (current vs prev) ──────────────────────────────────────
  // Prev period values are computed by subtracting current from 2x window.
  const deltas = useMemo(() => {
    const curSignups = data.kpi?.signups_period ?? 0;
    const window2x = data.prevKpi?.signups_period ?? 0;
    const prevSignups = Math.max(0, window2x - curSignups);

    const curMrr = data.revenue?.mrr_total ?? 0;
    const prevMrr = data.prevRevenue?.mrr_total ?? curMrr; // MRR is point-in-time, snapshot comparison is approximate
    const curNewMrr = data.mrrMovement?.new_mrr_aud ?? 0;
    const window2xNew = data.prevMrrMovement?.new_mrr_aud ?? 0;
    const prevNewMrr = Math.max(0, window2xNew - curNewMrr);

    return {
      signups: computeDelta(curSignups, prevSignups),
      mrr: computeDelta(curMrr, prevMrr),
      newMrr: computeDelta(curNewMrr, prevNewMrr),
    };
  }, [data]);

  // ── Derived: CSV rows ───────────────────────────────────────────────────────
  const userHealthRows = useMemo(() => {
    const k = data.kpi;
    if (!k) return [];
    const p = k.paid_active ?? {};
    return [
      { metric: 'signups_total',   value: k.signups_total ?? 0 },
      { metric: 'signups_period',  value: k.signups_period ?? 0 },
      { metric: 'trials_active',   value: k.trials_active ?? 0 },
      { metric: 'paid_active_tfn', value: p.tfn ?? 0 },
      { metric: 'paid_active_abn', value: p.abn ?? 0 },
      { metric: 'paid_active_pro', value: p.pro ?? 0 },
    ];
  }, [data.kpi]);

  const revenueRows = useMemo(() => {
    const r = data.revenue;
    if (!r) return [];
    const bp = r.mrr_by_plan ?? {};
    return [
      { metric: 'mrr_total_aud',  value: (r.mrr_total ?? 0).toFixed(2) },
      { metric: 'mrr_tfn_aud',    value: (bp.tfn ?? 0).toFixed(2) },
      { metric: 'mrr_abn_aud',    value: (bp.abn ?? 0).toFixed(2) },
      { metric: 'mrr_pro_aud',    value: (bp.pro ?? 0).toFixed(2) },
      { metric: 'churn_count',    value: r.churn_period ?? 0 },
    ];
  }, [data.revenue]);

  const mrrMovementRows = useMemo(() => {
    const m = data.mrrMovement;
    if (!m) return [];
    return [
      { metric: 'current_mrr_aud',     value: m.current_mrr_aud.toFixed(2) },
      { metric: 'new_mrr_aud',          value: m.new_mrr_aud.toFixed(2) },
      { metric: 'churn_mrr_aud',        value: m.churn_mrr_aud.toFixed(2) },
      { metric: 'net_mrr_delta_aud',    value: m.net_mrr_delta_aud.toFixed(2) },
      { metric: 'quick_ratio',          value: m.quick_ratio ?? '' },
      { metric: 'new_count',            value: m.new_count },
      { metric: 'churn_count',          value: m.churn_count },
    ];
  }, [data.mrrMovement]);

  const cohortRows = useMemo(() => data.cohort?.cohorts ?? [], [data.cohort]);
  const funnelRows = useMemo(() => {
    const f = data.funnel; if (!f) return [];
    return [
      { step: 'signups',     count: f.signups ?? 0 },
      { step: 'activations', count: f.activations ?? 0 },
      { step: 'trials',      count: f.trials ?? 0 },
      { step: 'paid',        count: f.paid ?? 0 },
    ];
  }, [data.funnel]);

  const cacRows = useMemo(() => {
    const a = data.acquisition;
    if (!a?.cac_by_channel) return [];
    // Estimate LTV = ARPU * (1/churn_rate_approx). ARPU = mrr_total / paid_active_total.
    const mrrTotal = data.revenue?.mrr_total ?? 0;
    const pa = data.kpi?.paid_active ?? {};
    const paidTotal = (pa.tfn ?? 0) + (pa.abn ?? 0) + (pa.pro ?? 0);
    const arpu = paidTotal > 0 ? mrrTotal / paidTotal : 0;
    const churnCount = data.revenue?.churn_period ?? 0;
    const churnRate = paidTotal > 0 ? churnCount / (paidTotal + churnCount) : 0;
    const avgLifetimeMonths = churnRate > 0 ? 1 / churnRate : null;
    const ltv = avgLifetimeMonths != null ? arpu * avgLifetimeMonths : null;
    return a.cac_by_channel.map((c) => ({
      channel: c.channel,
      spend: c.spend.toFixed(2),
      conversions: c.conversions,
      cpa: c.cpa != null ? c.cpa.toFixed(2) : '',
      ltv_estimate: ltv != null ? ltv.toFixed(2) : '',
      ltv_cac: ltv != null && c.cpa != null && c.cpa > 0 ? (ltv / c.cpa).toFixed(2) : '',
    }));
  }, [data.acquisition, data.revenue, data.kpi]);

  const jobsSeries = useMemo(() => data.jobs?.series ?? [], [data.jobs]);
  const activeUsersSeries = useMemo(() => data.activeUsers?.series ?? [], [data.activeUsers]);
  const signupsByPlanSeries = useMemo(() => data.signupsByPlan?.series ?? [], [data.signupsByPlan]);
  const dauByPlanSeries = useMemo(() => data.dauByPlan?.series ?? [], [data.dauByPlan]);
  const topErrorsRows = useMemo(() => data.topErrors?.rows ?? [], [data.topErrors]);
  const featureRows = useMemo(() => data.featureUsage?.rows ?? [], [data.featureUsage]);
  const appVersionRows = useMemo(() => data.appVersions?.rows ?? [], [data.appVersions]);
  const downloadsPlatformRows = useMemo(() => {
    const d = data.downloadsPlatform; if (!d) return [];
    return [{ platform: 'ios', count: d.ios }, { platform: 'android', count: d.android }, { platform: 'unknown', count: d.unknown }];
  }, [data.downloadsPlatform]);
  const affiliateRoiRows = useMemo(() => {
    const a = data.affiliateRoi; if (!a) return [];
    return [
      { scope: 'period',   payouts_aud: (a.period.payouts_cents / 100).toFixed(2),   revenue_aud: (a.period.revenue_cents / 100).toFixed(2),   conversions: a.period.conversions,   roi_pct: a.period.roi_pct ?? '' },
      { scope: 'lifetime', payouts_aud: (a.lifetime.payouts_cents / 100).toFixed(2), revenue_aud: (a.lifetime.revenue_cents / 100).toFixed(2), conversions: a.lifetime.conversions, roi_pct: a.lifetime.roi_pct ?? '' },
    ];
  }, [data.affiliateRoi]);
  const topAffiliateRows = useMemo(() => {
    return (data.topAffiliates?.rows ?? []).map((r) => ({
      code: r.code,
      name: r.name,
      revenue_aud: (r.revenue_cents / 100).toFixed(2),
      paid_aud: (r.paid_cents / 100).toFixed(2),
      conversions: r.conversions,
      roi_pct: r.roi_pct ?? '',
    }));
  }, [data.topAffiliates]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }
  if (error) {
    return (
      <div className="ozly-card bg-rose-50/60 p-4 text-sm text-rose-700">
        Erro ao carregar Data Hub: {error}
        <button type="button" onClick={refetch} className="ml-2 underline">Tentar de novo</button>
      </div>
    );
  }

  const f = data.freshness;
  const today = todayIso();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="ozly-card flex items-start justify-between bg-white p-4">
        <div className="flex items-start gap-3">
          <LayoutDashboardIcon className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <h1 className="text-lg font-semibold text-navy-800">Data Hub</h1>
            <p className="text-xs text-navy-400">
              Decision-grade aggregation: deltas, segmentation, pipeline freshness. Tudo com export CSV.
            </p>
          </div>
        </div>
        <button type="button" onClick={refetch} className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700">↻ Refresh</button>
      </div>

      {/* Data freshness banner */}
      {f && (
        <div className="ozly-card flex flex-wrap items-center gap-2 bg-white p-3">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-navy-400">Pipeline</span>
          <FreshnessBadge status={f.rc_sync_status}        label="RC sync"        value={lagText(f.rc_sync_lag_minutes)} />
          <FreshnessBadge status={f.kpi_snapshot_status}   label="KPI snapshot"   value={lagText(f.kpi_snapshot_lag_minutes)} />
          {f.cron_jobs.slice(0, 4).map((c) => (
            <FreshnessBadge
              key={c.jobname}
              status={c.last_status === 'succeeded' ? 'fresh' : c.last_status == null ? 'never' : 'broken'}
              label={c.jobname.replace(/^admin-|^revenuecat-|-dispatch$|^marketing-/, '')}
              value={c.last_run ? lagText((Date.now() - new Date(c.last_run).getTime()) / 60000) : 'nunca'}
            />
          ))}
        </div>
      )}

      <GlobalFilterBar show={['period']} />

      {/* A. Users & Engagement (com deltas) */}
      <section className="grid gap-4 lg:grid-cols-3">
        <DataCard
          title="User health snapshot"
          subtitle={`${periodLabel} · Δ vs período anterior`}
          drillTo="/users"
          drillLabel="Ver users"
          csvRows={userHealthRows}
          csvFilename={`user_health_${periodDays}d_${today}`}
        >
          {userHealthRows.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <KpiTile label="signups (total)"  value={formatNumber(data.kpi?.signups_total ?? 0)} />
              <KpiTile label="signups (período)" value={formatNumber(data.kpi?.signups_period ?? 0)} delta={deltas.signups} />
              <KpiTile label="trials active"    value={formatNumber(data.kpi?.trials_active ?? 0)} />
              <KpiTile label="paid TFN"         value={formatNumber(data.kpi?.paid_active?.tfn ?? 0)} />
              <KpiTile label="paid ABN"         value={formatNumber(data.kpi?.paid_active?.abn ?? 0)} />
              <KpiTile label="paid PRO"         value={formatNumber(data.kpi?.paid_active?.pro ?? 0)} />
            </div>
          ) : <p className="text-xs text-navy-300">Sem dados ainda.</p>}
        </DataCard>

        <DataCard
          title="Signups por plano"
          subtitle={periodLabel}
          drillTo="/users"
          csvRows={signupsByPlanSeries}
          csvFilename={`signups_by_plan_${periodDays}d_${today}`}
        >
          {signupsByPlanSeries.length > 0 ? (
            <AreaChart
              data={signupsByPlanSeries}
              index="date"
              categories={['free', 'tfn', 'abn', 'pro']}
              colors={['navy', 'sky', 'emerald', 'amber']}
              showLegend
              valueFormatter={formatNumber}
              className="h-40"
              stack
            />
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>

        <DataCard
          title="DAU por plano"
          subtitle={periodLabel}
          drillTo="/insights"
          csvRows={dauByPlanSeries}
          csvFilename={`dau_by_plan_${periodDays}d_${today}`}
        >
          {dauByPlanSeries.length > 0 ? (
            <AreaChart
              data={dauByPlanSeries}
              index="date"
              categories={['free', 'tfn', 'abn', 'pro']}
              colors={['navy', 'sky', 'emerald', 'amber']}
              showLegend
              valueFormatter={formatNumber}
              className="h-40"
              stack
            />
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>
      </section>

      {/* B. Funnel + Cohort retention */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="Funnel completo"
          subtitle={`${periodLabel} · signup → activation → trial → paid`}
          drillTo="/growth/funnel"
          csvRows={funnelRows}
          csvFilename={`funnel_${periodDays}d_${today}`}
        >
          {funnelRows.length > 0 && funnelRows.some((r) => r.count > 0) ? (
            <BarList
              data={funnelRows.map((r) => ({ name: r.step, value: r.count }))}
              color="emerald"
              valueFormatter={formatNumber}
              className="mt-1"
            />
          ) : <p className="text-xs text-navy-300">Sem dados (RC sync ainda pode não ter populado trials/paid).</p>}
        </DataCard>

        <DataCard
          title="Retention cohort"
          subtitle="Coortes semanais · D1 / D7 / D14 / D30 / D60"
          drillTo="/product/retention"
          csvRows={cohortRows.map((c) => ({
            cohort: c.cohort, size: c.size,
            d1: c.d1, d7: c.d7, d14: c.d14, d30: c.d30, d60: c.d60,
          }))}
          csvFilename={`cohort_retention_${today}`}
        >
          {cohortRows.length > 0 ? <CohortHeatmap rows={cohortRows} /> : <p className="text-xs text-navy-300">Sem coortes ainda.</p>}
        </DataCard>
      </section>

      {/* C. Revenue + MRR movement */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="Revenue snapshot"
          subtitle={`MRR atual · breakdown por plano · ${periodLabel}`}
          drillTo="/finance"
          csvRows={revenueRows}
          csvFilename={`revenue_${periodDays}d_${today}`}
        >
          {data.revenue ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <KpiTile label="MRR total"  value={formatCurrencyAUD(data.revenue.mrr_total ?? 0)} delta={deltas.mrr} />
              <KpiTile label="MRR TFN"    value={formatCurrencyAUD(data.revenue.mrr_by_plan?.tfn ?? 0)} />
              <KpiTile label="MRR ABN"    value={formatCurrencyAUD(data.revenue.mrr_by_plan?.abn ?? 0)} />
              <KpiTile label="MRR PRO"    value={formatCurrencyAUD(data.revenue.mrr_by_plan?.pro ?? 0)} />
            </div>
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>

        <DataCard
          title="MRR movement"
          subtitle={`${periodLabel} · new · churn · net delta`}
          drillTo="/finance/pnl"
          csvRows={mrrMovementRows}
          csvFilename={`mrr_movement_${periodDays}d_${today}`}
        >
          {data.mrrMovement ? (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <KpiTile label="New MRR" value={formatCurrencyAUD(data.mrrMovement.new_mrr_aud)} delta={deltas.newMrr} />
                <KpiTile label="Churn MRR" value={`-${formatCurrencyAUD(data.mrrMovement.churn_mrr_aud)}`} />
                <KpiTile label="Net Δ" value={formatCurrencyAUD(data.mrrMovement.net_mrr_delta_aud)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <KpiTile label="Quick Ratio" value={data.mrrMovement.quick_ratio != null ? `${data.mrrMovement.quick_ratio}x` : '—'} />
                <KpiTile label="New / Churn (users)" value={`${data.mrrMovement.new_count} / ${data.mrrMovement.churn_count}`} />
              </div>
              <p className="text-[10px] text-navy-300">expansion / downgrade MRR pendente (sem histórico de plan)</p>
            </div>
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>
      </section>

      {/* D. Acquisition (CAC + LTV) + Affiliate ROI */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="CAC + LTV por canal"
          subtitle="LTV estimado = ARPU / churn rate (proxy)"
          drillTo="/growth"
          csvRows={cacRows}
          csvFilename={`cac_ltv_${periodDays}d_${today}`}
        >
          {cacRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-navy-400">
                    <th className="py-1">Canal</th>
                    <th className="text-right">Spend</th>
                    <th className="text-right">Conv</th>
                    <th className="text-right">CPA</th>
                    <th className="text-right">LTV</th>
                    <th className="text-right">LTV:CAC</th>
                  </tr>
                </thead>
                <tbody>
                  {cacRows.map((r) => {
                    const ratio = r.ltv_cac ? parseFloat(r.ltv_cac) : null;
                    const cls = ratio == null ? 'text-navy-400' : ratio >= 3 ? 'text-emerald-700' : ratio >= 1 ? 'text-amber-700' : 'text-rose-700';
                    return (
                      <tr key={r.channel} className="border-t border-navy-50">
                        <td className="py-1 font-medium text-navy-700">{r.channel}</td>
                        <td className="text-right font-mono text-navy-600">{formatCurrencyAUD(parseFloat(r.spend))}</td>
                        <td className="text-right font-mono text-navy-600">{r.conversions}</td>
                        <td className="text-right font-mono text-navy-600">{r.cpa ? formatCurrencyAUD(parseFloat(r.cpa)) : '—'}</td>
                        <td className="text-right font-mono text-navy-600">{r.ltv_estimate ? formatCurrencyAUD(parseFloat(r.ltv_estimate)) : '—'}</td>
                        <td className={`text-right font-mono font-semibold ${cls}`}>{r.ltv_cac ? `${r.ltv_cac}x` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-navy-300">Sem dados de attribution ainda.</p>}
        </DataCard>

        <DataCard
          title="Affiliate ROI — agregado"
          subtitle={`Pago vs revenue gerado · ${periodLabel}`}
          drillTo="/affiliates"
          csvRows={affiliateRoiRows}
          csvFilename={`affiliate_roi_${periodDays}d_${today}`}
        >
          {data.affiliateRoi ? (
            <div className="space-y-2 text-xs">
              <RoiRow scope="Período" data={data.affiliateRoi.period} />
              <RoiRow scope="Lifetime" data={data.affiliateRoi.lifetime} />
            </div>
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>
      </section>

      {/* E. Top affiliates individual */}
      <DataCard
        title="Top 10 affiliates por ROI individual"
        subtitle={`${periodLabel} · ranked desc · cortar quem está abaixo de 100%`}
        drillTo="/affiliates"
        csvRows={topAffiliateRows}
        csvFilename={`top_affiliates_roi_${periodDays}d_${today}`}
      >
        {topAffiliateRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-navy-400">
                  <th className="py-1">Code</th>
                  <th>Nome</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Payouts</th>
                  <th className="text-right">Conv</th>
                  <th className="text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {topAffiliateRows.map((r) => {
                  const roi = typeof r.roi_pct === 'number' ? r.roi_pct : null;
                  const cls = roi == null ? 'text-navy-400' : roi >= 200 ? 'text-emerald-700' : roi >= 100 ? 'text-amber-700' : 'text-rose-700';
                  return (
                    <tr key={r.code} className="border-t border-navy-50">
                      <td className="py-1 font-mono text-navy-700">{r.code}</td>
                      <td className="text-navy-600">{r.name}</td>
                      <td className="text-right font-mono text-emerald-700">{formatCurrencyAUD(parseFloat(r.revenue_aud))}</td>
                      <td className="text-right font-mono text-navy-600">{formatCurrencyAUD(parseFloat(r.paid_aud))}</td>
                      <td className="text-right font-mono text-navy-600">{r.conversions}</td>
                      <td className={`text-right font-mono font-semibold ${cls}`}>{roi != null ? `${roi}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs text-navy-300">Sem affiliates com tráfego no período.</p>}
      </DataCard>

      {/* F. Operations (jobs + features) */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DataCard
          title="Jobs criados / dia"
          subtitle={periodLabel}
          drillTo="/dashboard"
          csvRows={jobsSeries}
          csvFilename={`jobs_${periodDays}d_${today}`}
        >
          {jobsSeries.length > 0 ? (
            <AreaChart data={jobsSeries} index="date" categories={['count']} colors={['lime']} showLegend={false} valueFormatter={formatNumber} className="h-32" />
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>

        <DataCard
          title="Feature adoption — top 10"
          subtitle={periodLabel}
          drillTo="/product/engagement"
          csvRows={featureRows}
          csvFilename={`features_${periodDays}d_${today}`}
        >
          {featureRows.length > 0 ? (
            <BarList data={featureRows.map((r) => ({ name: r.feature, value: r.events }))} color="emerald" valueFormatter={formatNumber} className="mt-1" />
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>
      </section>

      {/* G. Platform + DAU */}
      <section className="grid gap-4 lg:grid-cols-3">
        <DataCard
          title="Platform split (signups)"
          subtitle={periodLabel}
          drillTo="/cockpit"
          csvRows={downloadsPlatformRows}
          csvFilename={`platform_split_${periodDays}d_${today}`}
        >
          {data.downloadsPlatform && data.downloadsPlatform.total > 0 ? (
            <DonutChart
              data={downloadsPlatformRows.filter((r) => r.count > 0).map((r) => ({ name: r.platform, value: r.count }))}
              category="value" index="name"
              colors={['sky', 'emerald', 'navy']}
              valueFormatter={formatNumber}
              className="h-32"
            />
          ) : <p className="text-xs text-navy-300">Sem signups no período.</p>}
        </DataCard>

        <DataCard
          title="Active users (DAU total)"
          subtitle={periodLabel}
          drillTo="/insights"
          csvRows={activeUsersSeries}
          csvFilename={`active_users_${periodDays}d_${today}`}
        >
          {activeUsersSeries.length > 0 ? (
            <AreaChart data={activeUsersSeries} index="date" categories={['count']} colors={['emerald']} showLegend={false} valueFormatter={formatNumber} className="h-32" />
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>

        <DataCard
          title="App versions in flight"
          subtitle={`Top 10 · ${periodLabel}`}
          drillTo="/tech/database"
          csvRows={appVersionRows}
          csvFilename={`app_versions_${periodDays}d_${today}`}
        >
          {appVersionRows.length > 0 ? (
            <BarList
              data={appVersionRows.map((r) => ({ name: `${r.app_version} · ${r.platform}`, value: r.count }))}
              color="sky" valueFormatter={formatNumber} className="mt-1"
            />
          ) : <p className="text-xs text-navy-300">Sem dados.</p>}
        </DataCard>
      </section>

      {/* H. Errors */}
      <DataCard
        title="Erros recentes — top 10"
        subtitle={periodLabel}
        drillTo="/tech/errors"
        csvRows={topErrorsRows}
        csvFilename={`top_errors_${periodDays}d_${today}`}
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
        ) : <p className="text-xs text-navy-300">Sem erros no período. 🎉</p>}
      </DataCard>
    </div>
  );
}

function RoiRow({
  scope, data,
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

function CohortHeatmap({ rows }: { rows: CohortRow[] }) {
  const cell = (v: number | null) => {
    if (v == null) return <span className="text-navy-200">—</span>;
    const pct = Math.round(v * 100);
    const bg = pct >= 60 ? 'bg-emerald-200' : pct >= 40 ? 'bg-emerald-100' : pct >= 20 ? 'bg-amber-100' : 'bg-rose-100';
    return <span className={`inline-flex h-6 w-10 items-center justify-center rounded ${bg} font-mono text-[11px] text-navy-700`}>{pct}%</span>;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-navy-400">
            <th className="py-1">Coorte</th>
            <th className="text-right">Size</th>
            <th className="text-center">D1</th>
            <th className="text-center">D7</th>
            <th className="text-center">D14</th>
            <th className="text-center">D30</th>
            <th className="text-center">D60</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.cohort} className="border-t border-navy-50">
              <td className="py-1 font-mono text-navy-700">{c.cohort}</td>
              <td className="text-right font-mono text-navy-600">{c.size}</td>
              <td className="text-center">{cell(c.d1)}</td>
              <td className="text-center">{cell(c.d7)}</td>
              <td className="text-center">{cell(c.d14)}</td>
              <td className="text-center">{cell(c.d30)}</td>
              <td className="text-center">{cell(c.d60)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
