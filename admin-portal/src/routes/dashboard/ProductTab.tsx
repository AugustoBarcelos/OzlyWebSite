import { Card, Grid, Text, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { CohortHeatmap } from '@/components/charts/CohortHeatmap';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { HistogramChart } from '@/components/charts/HistogramChart';
import { formatNumber, formatPercent } from '@/lib/format';
import type { DashboardData } from './useDashboardData';
import type { Period } from './types';

interface Props {
  data: DashboardData;
  loading: boolean;
  period: Period;
}

const COHORT_CELLS = ['D1', 'D7', 'D14', 'D30', 'D60'];

export function ProductTab({ data, loading, period }: Props) {
  const {
    kpi,
    funnel,
    cohort,
    loginRetention,
    revenue,
    featureUsage,
    activeUsers,
    trialStatus,
    activationFunnel,
    timeToActivation,
  } = data;
  const techPeriod = Math.min(period, 90);

  // Prefer login-based retention (more accurate signal than jobs).
  const retentionSource = loginRetention ?? cohort;
  const retentionLabel = loginRetention
    ? 'Login retention by signup week'
    : 'Retention by signup week';

  const trialsActive = kpi?.trials_active ?? trialStatus?.trials_active ?? null;
  const trialsExpiring =
    kpi?.trials_expiring_7d ?? trialStatus?.trials_expiring_7d ?? null;
  const trialsSource = kpi?.trials_active !== null
    ? 'RC sync'
    : trialStatus
      ? 'app_events proxy'
      : null;

  const activationRate =
    kpi && kpi.signups_period && kpi.signups_period > 0
      ? formatPercent(kpi.activations_period, kpi.signups_period)
      : '—';

  const trialToPaid = revenue?.conversion_trial_to_paid_period ?? null;

  const funnelSteps = activationFunnel
    ? [
        { name: 'Signed up', value: activationFunnel.signed_up },
        {
          name: 'Onboarded',
          value: activationFunnel.onboarded,
          hint: 'onboarding_complete',
        },
        {
          name: 'Trial picked',
          value: activationFunnel.trial_picked,
          hint: 'welcome_trial_plan_selected',
        },
        {
          name: 'First session',
          value: activationFunnel.first_session,
          hint: 'session_start ≥ signup',
        },
        {
          name: 'First job',
          value: activationFunnel.first_job,
          hint: 'job_created event',
        },
      ]
    : [
        {
          name: 'Signups',
          value: funnel?.signups ?? kpi?.signups_period ?? null,
        },
        {
          name: 'Activated',
          value: funnel?.activations ?? kpi?.activations_period ?? null,
          hint: '1+ job in 48h',
        },
        {
          name: 'Trial',
          value:
            trialStatus?.trials_started_period ??
            funnel?.trials ??
            kpi?.trials_started_period ??
            null,
          hint: trialStatus ? 'from app_events' : 'Pending RC sync',
        },
        {
          name: 'Paid',
          value: funnel?.paid ?? null,
          hint: 'Pending RC sync',
        },
      ];

  const cohortRows =
    retentionSource?.cohorts.map((c) => ({
      cohort: c.cohort,
      size: c.size,
      retention: [c.d1, c.d7, c.d14, c.d30, c.d60],
    })) ?? [];

  return (
    <div className="space-y-6">
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiHero
          label={`Activation · ${period}d`}
          value={
            kpi && kpi.signups_period && kpi.signups_period > 0
              ? (kpi.activations_period ?? 0) / kpi.signups_period
              : null
          }
          formatter={(v) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)}
          hint={`${activationRate} created a job in 48h`}
          loading={loading && !kpi}
          tone="brand"
        />
        <KpiHero
          label="Trial → Paid"
          value={trialToPaid}
          formatter={(v) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)}
          hint="Pending RevenueCat sync"
          loading={loading && !revenue}
          tone="lime"
        />
        <KpiHero
          label="Trials active"
          value={trialsActive}
          hint={
            trialsSource
              ? `In free trial · ${trialsSource}`
              : 'Pending data'
          }
          loading={loading && !kpi && !trialStatus}
          tone="brand"
        />
        <KpiHero
          label="Trials expiring · 7d"
          value={trialsExpiring}
          hint={
            trialsSource
              ? `Ending in 7 days · ${trialsSource}`
              : 'Pending data'
          }
          loading={loading && !kpi && !trialStatus}
          tone="warning"
          isIncreasePositive={false}
        />
      </Grid>

      <Grid numItemsLg={2} className="gap-4">
        <FunnelChart
          title="Conversion funnel"
          steps={funnelSteps}
          loading={loading && !kpi && !funnel}
        />
        <Card>
          <Title>Top features · {techPeriod}d</Title>
          <Text className="mt-1 text-xs text-navy-300">
            {featureUsage
              ? `${formatNumber(featureUsage.total_views)} screen views · ${featureUsage.rows.length} unique screens`
              : 'Loading…'}
          </Text>
          {loading && !featureUsage ? (
            <div className="mt-4 h-48 animate-pulse rounded bg-navy-50/60" />
          ) : !featureUsage || featureUsage.rows.length === 0 ? (
            <div className="mt-4 flex h-48 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
              No screen views in period
            </div>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {featureUsage.rows.slice(0, 8).map((r) => {
                const pct =
                  featureUsage.total_views > 0
                    ? (r.views / featureUsage.total_views) * 100
                    : 0;
                return (
                  <li key={r.screen}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-mono text-navy-700">
                        {r.screen}
                      </span>
                      <span className="whitespace-nowrap text-navy-300">
                        {formatNumber(r.views)} views · {r.users} users
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-50">
                      <div
                        className="h-full bg-brand-400"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Grid>

      <Grid numItemsLg={2} className="gap-4">
        <TimeSeriesChart
          title="Daily active users"
          subtitle={`Distinct users with any event · last ${techPeriod}d`}
          data={
            activeUsers?.series.map((p) => ({
              date: p.date,
              DAU: p.count,
            })) ?? null
          }
          categories={['DAU']}
          colors={['emerald']}
          variant="area"
          loading={loading && !activeUsers}
          emptyMessage="No active-user data"
        />
        <HistogramChart
          title="Time-to-activation"
          subtitle="Hours from signup to first job · last 90d cohort"
          buckets={timeToActivation?.buckets ?? null}
          footnote={
            timeToActivation
              ? `${formatNumber(timeToActivation.never_activated)} not yet activated`
              : undefined
          }
          loading={loading && !timeToActivation}
        />
      </Grid>

      <CohortHeatmap
        title={retentionLabel}
        cells={COHORT_CELLS}
        rows={cohortRows}
        loading={loading && !retentionSource}
      />
    </div>
  );
}
