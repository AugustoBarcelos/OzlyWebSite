import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, BarList, Card, Title } from '@tremor/react';
import { PackageIcon, TrendingUpIcon } from '@/components/Icons';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatNumber } from '@/lib/format';
import type {
  ActiveUsersTimeseriesResponse,
  FeatureUsageResponse,
  JobsTimeseriesResponse,
} from '@/routes/dashboard/types';

/**
 * /product/engagement — DAU/WAU/MAU + jobs timeseries + feature usage.
 *
 * Engagement signals from existing RPCs:
 *   - admin_active_users_timeseries (daily uniques)
 *   - admin_jobs_timeseries (jobs per day)
 *   - admin_feature_usage_top (top screens by views/users)
 */
export function ProductEngagementPage() {
  const { periodDays } = useGlobalFilters();
  const [activeUsers, setActiveUsers] = useState<ActiveUsersTimeseriesResponse | null>(null);
  const [jobs, setJobs] = useState<JobsTimeseriesResponse | null>(null);
  const [features, setFeatures] = useState<FeatureUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cap to 90d (server enforces)
  const period = Math.min(periodDays, 90);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<ActiveUsersTimeseriesResponse>('admin_active_users_timeseries', {
        p_period_days: period,
      }),
      callRpc<JobsTimeseriesResponse>('admin_jobs_timeseries', {
        p_period_days: period,
      }),
      callRpc<FeatureUsageResponse>('admin_feature_usage_top', {
        p_period_days: period,
        p_limit: 12,
      }),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1, r2] = results;
      if (r0.status === 'fulfilled') setActiveUsers(r0.value);
      else if (r0.reason instanceof RpcError) setError(r0.reason.message);
      if (r1.status === 'fulfilled') setJobs(r1.value);
      if (r2.status === 'fulfilled') setFeatures(r2.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [period]);

  const auSeries = useMemo(
    () => activeUsers?.series.map((p) => ({ date: p.date, users: p.count })) ?? [],
    [activeUsers],
  );
  const jobsSeries = useMemo(
    () => jobs?.series.map((p) => ({ date: p.date, jobs: p.count })) ?? [],
    [jobs],
  );

  // Quick aggregate: avg active users over period
  const avgDau = useMemo(() => {
    if (auSeries.length === 0) return null;
    const sum = auSeries.reduce((s, p) => s + p.users, 0);
    return Math.round(sum / auSeries.length);
  }, [auSeries]);

  const totalJobs = useMemo(
    () => jobsSeries.reduce((s, p) => s + p.jobs, 0),
    [jobsSeries],
  );

  const featureBars = useMemo(() => {
    if (!features) return [];
    return features.rows.map((r) => ({
      name: r.screen,
      value: r.views,
    }));
  }, [features]);

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
            <TrendingUpIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Engagement
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              DAU, jobs por dia, telas mais usadas.
            </p>
          </div>
        </div>
        <Link
          to="/product"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Product Hub
        </Link>
      </header>

      <GlobalFilterBar show={['period']} />

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* KPI tiles */}
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiTile
          label="DAU médio"
          value={avgDau}
          loading={loading}
          tone="brand"
          hint={`média ${period}d`}
        />
        <KpiTile
          label="Jobs criados"
          value={totalJobs || null}
          loading={loading}
          tone="lime"
          hint={`total ${period}d`}
        />
        <KpiTile
          label="Telas analisadas"
          value={features?.rows.length ?? null}
          loading={loading}
          tone="neutral"
          hint={`top ${features?.rows.length ?? 0} screens`}
        />
      </section>

      {/* Active users chart */}
      {auSeries.length > 1 && (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Active users por dia
          </Title>
          <AreaChart
            data={auSeries}
            index="date"
            categories={['users']}
            colors={['emerald']}
            valueFormatter={(v: number) => formatNumber(v)}
            showLegend={false}
            className="mt-3 h-56"
          />
        </Card>
      )}

      {/* Jobs chart */}
      {jobsSeries.length > 1 && (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Jobs criados por dia
          </Title>
          <AreaChart
            data={jobsSeries}
            index="date"
            categories={['jobs']}
            colors={['lime']}
            valueFormatter={(v: number) => formatNumber(v)}
            showLegend={false}
            className="mt-3 h-48"
          />
        </Card>
      )}

      {/* Feature usage */}
      {featureBars.length > 0 && (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Top screens (por views)
          </Title>
          <p className="mt-0.5 text-[11px] text-navy-400">
            {features?.total_views ? `${formatNumber(features.total_views)} views totais` : ''}
          </p>
          <BarList
            data={featureBars}
            color="emerald"
            valueFormatter={(v: number) => formatNumber(v)}
            className="mt-3"
          />
        </Card>
      )}

      <div className="flex items-center justify-end">
        <Link
          to="/product"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          <PackageIcon className="h-3.5 w-3.5" />
          Voltar pro Product Hub
        </Link>
      </div>

      <RawDataPanel
        page="product-engagement"
        sources={[
          { rpc: 'admin_active_users_timeseries', params: { p_period_days: period }, data: activeUsers },
          { rpc: 'admin_jobs_timeseries', params: { p_period_days: period }, data: jobs },
          { rpc: 'admin_feature_usage_top', params: { p_period_days: period, p_limit: 12 }, data: features },
        ]}
      />
    </div>
  );
}

function KpiTile({
  label,
  value,
  loading,
  tone,
  hint,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  tone: 'brand' | 'lime' | 'neutral';
  hint?: string;
}) {
  const TONE_CLASS: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    lime: 'text-lime-600',
    neutral: 'text-navy-700',
  };
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-navy-50" />
      ) : (
        <div className={`mt-1 text-2xl font-semibold ${TONE_CLASS[tone]}`}>
          {formatNumber(value)}
        </div>
      )}
      {hint && !loading && <div className="mt-1 text-[11px] text-navy-400">{hint}</div>}
    </div>
  );
}
