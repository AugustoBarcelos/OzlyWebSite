import { Card, Grid, Text, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { TopErrorsList } from '@/components/charts/TopErrorsList';
import { RecentActionsList } from '@/components/charts/RecentActionsList';
import { ExternalLinkIcon } from '@/components/Icons';
import { formatNumber } from '@/lib/format';
import type { DashboardData } from './useDashboardData';
import type { Period } from './types';

interface Props {
  data: DashboardData;
  loading: boolean;
  period: Period;
}

export function TechTab({ data, loading, period }: Props) {
  const {
    jobsTimeseries,
    activeUsers,
    errorRate,
    topErrors,
    featureUsage,
    dbHealth,
    recentActions,
  } = data;

  // Tech RPCs cap at 90d server-side; we displayed `period` up to 90 here.
  const techPeriod = Math.min(period, 90);

  // Delta vs previous matching window for the error-rate KPI.
  const errorDelta =
    errorRate && errorRate.previous > 0
      ? (errorRate.current - errorRate.previous) / errorRate.previous
      : undefined;

  // Average DAU over the period (simple mean — handy as a quick summary).
  const avgDau = activeUsers
    ? Math.round(
        activeUsers.series.reduce((acc, p) => acc + p.count, 0) /
          Math.max(1, activeUsers.series.length),
      )
    : null;

  // Sparkline for active users
  const dauSpark = activeUsers?.series.slice(-14).map((p) => ({
    date: p.date,
    value: p.count,
  }));
  const errorsSpark = jobsTimeseries
    ? // No daily error series in current schema — re-use jobs timeseries shape
      // for visual continuity. Real per-day errors would need a 4th RPC.
      undefined
    : undefined;

  // Latest job count today (last entry of jobs series)
  const jobsTodayCount = jobsTimeseries
    ? jobsTimeseries.series[jobsTimeseries.series.length - 1]?.count ?? null
    : null;

  return (
    <div className="space-y-6">
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiHero
          label={`App errors · ${techPeriod}d`}
          value={errorRate?.current ?? null}
          {...(errorDelta !== undefined ? { delta: errorDelta } : {})}
          isIncreasePositive={false}
          hint={
            errorRate
              ? `vs ${formatNumber(errorRate.previous)} previous ${techPeriod}d`
              : 'Loading…'
          }
          loading={loading && !errorRate}
          tone="warning"
          series={errorsSpark}
        />
        <KpiHero
          label={`Avg DAU · ${techPeriod}d`}
          value={avgDau}
          hint={
            activeUsers
              ? 'Distinct users with any event'
              : 'Loading…'
          }
          loading={loading && !activeUsers}
          tone="brand"
          series={dauSpark}
        />
        <KpiHero
          label="Jobs today"
          value={jobsTodayCount}
          hint="System throughput signal"
          loading={loading && !jobsTimeseries}
          tone="lime"
        />
        <KpiHero
          label="DB size"
          value={dbHealth?.db_size_bytes ?? null}
          formatter={(v) =>
            v === null ? '—' : (dbHealth?.db_size_pretty ?? `${v}`)
          }
          hint={
            dbHealth
              ? `${dbHealth.top_tables.length} largest tables tracked`
              : 'Loading…'
          }
          loading={loading && !dbHealth}
          tone="neutral"
        />
      </Grid>

      <Grid numItemsLg={3} className="gap-4">
        <div className="lg:col-span-2">
          <TimeSeriesChart
            title="Daily activity"
            subtitle={`Jobs created · DAU · last ${techPeriod}d`}
            data={(() => {
              if (!jobsTimeseries && !activeUsers) return null;
              const byDate = new Map<
                string,
                { date: string; Jobs?: number; DAU?: number }
              >();
              for (const p of jobsTimeseries?.series ?? []) {
                byDate.set(p.date, { date: p.date, Jobs: p.count });
              }
              for (const p of activeUsers?.series ?? []) {
                const existing = byDate.get(p.date) ?? { date: p.date };
                existing.DAU = p.count;
                byDate.set(p.date, existing);
              }
              return Array.from(byDate.values())
                .sort((a, b) => (a.date < b.date ? -1 : 1))
                .map((row) => ({
                  date: row.date,
                  Jobs: row.Jobs ?? 0,
                  DAU: row.DAU ?? 0,
                }));
            })()}
            categories={['Jobs', 'DAU']}
            colors={['emerald', 'sky']}
            variant="line"
            loading={loading && !jobsTimeseries && !activeUsers}
            emptyMessage="No daily activity data"
          />
        </div>
        <Card>
          <Title>Top tables</Title>
          <Text className="mt-1 text-xs text-navy-300">
            By total relation size · live row count
          </Text>
          {loading && !dbHealth ? (
            <div className="mt-4 h-48 animate-pulse rounded bg-navy-50/60" />
          ) : !dbHealth || dbHealth.top_tables.length === 0 ? (
            <div className="mt-4 flex h-48 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
              No DB data
            </div>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {dbHealth.top_tables.slice(0, 6).map((t) => (
                <li
                  key={t.table}
                  className="flex items-center justify-between gap-3 rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
                >
                  <span className="truncate font-mono text-navy-700">
                    {t.table}
                  </span>
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-navy-300">
                      {formatNumber(t.rows)} rows
                    </span>
                    <span className="font-medium text-navy-700">
                      {t.size_pretty}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Grid>

      <Grid numItemsLg={2} className="gap-4">
        <TopErrorsList
          title={`Top errors · ${techPeriod}d`}
          rows={topErrors?.rows ?? null}
          loading={loading && !topErrors}
        />
        <RecentActionsList
          title="Recent admin actions"
          rows={recentActions?.rows ?? null}
          loading={loading && !recentActions}
        />
      </Grid>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text className="font-medium text-navy-700">External tools</Text>
            <Text className="mt-0.5 text-xs text-navy-300">
              Cross-reference Sentry traces / Supabase logs / RevenueCat
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Sentry', href: 'https://ozly.sentry.io/issues/' },
              {
                label: 'Supabase logs',
                href: 'https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/logs/explorer',
              },
              {
                label: 'Edge fn metrics',
                href: 'https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/functions',
              },
              { label: 'RevenueCat', href: 'https://app.revenuecat.com/' },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {s.label}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </Card>

      {/* feature usage shown on Product tab — also surface here for tech ops
          who care about which screens drive the most app_events writes */}
      {featureUsage && featureUsage.rows.length > 0 && (
        <Card>
          <Title>Most-viewed screens · {techPeriod}d</Title>
          <Text className="mt-1 text-xs text-navy-300">
            Hot paths in the mobile app · proxy for write load
          </Text>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featureUsage.rows.slice(0, 9).map((r) => {
              const pct =
                featureUsage.total_views > 0
                  ? (r.views / featureUsage.total_views) * 100
                  : 0;
              return (
                <li
                  key={r.screen}
                  className="rounded-md border border-navy-50 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-mono text-xs text-navy-700">
                      {r.screen}
                    </span>
                    <span className="text-xs font-medium text-brand-700">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-50">
                    <div
                      className="h-full bg-brand-400"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-navy-300">
                    {formatNumber(r.views)} views · {r.users} users
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
