import { Card, DonutChart, Grid, Text, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { CohortHeatmap } from '@/components/charts/CohortHeatmap';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';
import type { DashboardData } from './useDashboardData';
import type { Period } from './types';

interface Props {
  data: DashboardData;
  loading: boolean;
  period: Period;
}

const COHORT_CELLS = ['D1', 'D7', 'D14', 'D30', 'D60'];

export function BoardTab({ data, loading, period }: Props) {
  const { kpi, revenue, cohort, loginRetention, timeseries } = data;
  const retentionSource = loginRetention ?? cohort;
  const retentionLabel = loginRetention
    ? 'Login retention by signup cohort'
    : 'Retention by signup cohort';

  const mrr = kpi?.mrr_estimate_aud ?? revenue?.mrr_total ?? null;
  const ltv = revenue?.ltv_estimate_aud ?? null;
  const churn = kpi?.churn_period ?? revenue?.churn_period ?? null;

  const paidActiveTotal = kpi?.paid_active
    ? (kpi.paid_active.tfn ?? 0) +
      (kpi.paid_active.abn ?? 0) +
      (kpi.paid_active.pro ?? 0)
    : null;

  const paidDonut = kpi?.paid_active
    ? [
        { name: 'TFN', value: kpi.paid_active.tfn ?? 0 },
        { name: 'ABN', value: kpi.paid_active.abn ?? 0 },
        { name: 'PRO', value: kpi.paid_active.pro ?? 0 },
      ].filter((r) => r.value > 0)
    : [];

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
          label="MRR"
          value={mrr}
          formatter={formatCurrencyAUD}
          hint={mrr === null ? 'Pending RevenueCat sync' : 'Monthly recurring (AUD)'}
          loading={loading && !kpi}
          tone="brand"
        />
        <KpiHero
          label="Paid subscribers"
          value={paidActiveTotal}
          hint={paidActiveTotal === null ? 'Pending RC sync' : 'Active across all plans'}
          loading={loading && !kpi}
          tone="lime"
        />
        <KpiHero
          label={`Churn · ${period}d`}
          value={churn}
          hint={churn === null ? 'Pending RC sync' : 'Cancellations in period'}
          loading={loading && !kpi}
          tone="warning"
          isIncreasePositive={false}
        />
        <KpiHero
          label="LTV estimate"
          value={ltv}
          formatter={formatCurrencyAUD}
          hint="Pending RevenueCat sync"
          loading={loading && !kpi}
          tone="neutral"
        />
      </Grid>

      <Grid numItemsLg={3} className="gap-4">
        <div className="lg:col-span-2">
          <TimeSeriesChart
            title="Growth signal (signups proxy)"
            subtitle="Until MRR time series is wired"
            data={
              timeseries?.series.map((p) => ({
                date: p.date,
                Signups: p.count,
              })) ?? null
            }
            categories={['Signups']}
            colors={['emerald']}
            variant="area"
            loading={loading && !timeseries}
            emptyMessage="Pending admin_signups_timeseries RPC"
          />
        </div>
        <Card>
          <Title>Plan mix</Title>
          <Text className="mt-1 text-xs text-navy-300">
            {paidActiveTotal === null
              ? 'Pending RevenueCat sync'
              : `${formatNumber(paidActiveTotal)} active subs`}
          </Text>
          {loading && !kpi ? (
            <div className="mt-4 h-44 animate-pulse rounded bg-navy-50/60" />
          ) : paidDonut.length > 0 ? (
            <DonutChart
              className="mt-4 h-44"
              data={paidDonut}
              category="value"
              index="name"
              colors={['emerald', 'lime', 'amber']}
              valueFormatter={formatNumber}
              showAnimation={false}
            />
          ) : (
            <div className="mt-4 flex h-44 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
              Pending RevenueCat sync
            </div>
          )}
        </Card>
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
