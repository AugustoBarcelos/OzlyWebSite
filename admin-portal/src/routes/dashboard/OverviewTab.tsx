import { Card, DonutChart, Grid, Text, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import {
  formatCurrencyAUD,
  formatNumber,
  formatPercent,
} from '@/lib/format';
import type { DashboardData } from './useDashboardData';
import type { Period } from './types';

interface Props {
  data: DashboardData;
  loading: boolean;
  period: Period;
}

export function OverviewTab({ data, loading, period }: Props) {
  const { kpi, revenue, timeseries } = data;

  const activationRate =
    kpi && kpi.activations_period !== null && kpi.signups_period !== null
      ? formatPercent(kpi.activations_period, kpi.signups_period)
      : '—';

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

  // Sparkline data — last 14 entries from timeseries if available
  const sparkSignups = timeseries?.series.slice(-14).map((p) => ({
    date: p.date,
    value: p.count,
  }));

  return (
    <div className="space-y-6">
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiHero
          label={`Signups · ${period}d`}
          value={kpi?.signups_period ?? null}
          hint="New accounts in period"
          loading={loading && !kpi}
          series={sparkSignups}
          tone="brand"
        />
        <KpiHero
          label={`Activation · ${period}d`}
          value={
            kpi && kpi.signups_period && kpi.signups_period > 0
              ? (kpi.activations_period ?? 0) / kpi.signups_period
              : null
          }
          formatter={(v) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)}
          hint={
            kpi
              ? `${activationRate} created a job within 48h`
              : 'Job within 48h of signup'
          }
          loading={loading && !kpi}
          tone="lime"
        />
        <KpiHero
          label="MRR estimate"
          value={kpi?.mrr_estimate_aud ?? revenue?.mrr_total ?? null}
          formatter={formatCurrencyAUD}
          hint={
            (kpi?.mrr_estimate_aud ?? revenue?.mrr_total) === null
              ? 'Pending RevenueCat sync'
              : 'Monthly recurring (AUD)'
          }
          loading={loading && !kpi}
          tone="brand"
        />
        <KpiHero
          label={`Churn · ${period}d`}
          value={kpi?.churn_period ?? revenue?.churn_period ?? null}
          hint={
            (kpi?.churn_period ?? revenue?.churn_period) === null
              ? 'Pending RevenueCat sync'
              : 'Cancellations in period'
          }
          loading={loading && !kpi}
          tone="warning"
          isIncreasePositive={false}
        />
      </Grid>

      <Grid numItemsLg={3} className="gap-4">
        <div className="lg:col-span-2">
          <TimeSeriesChart
            title="Signups over time"
            subtitle={`Last ${period}d`}
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
          <Title>Paid subs by plan</Title>
          <Text className="mt-1 text-xs text-navy-300">
            {paidActiveTotal === null
              ? 'Pending RevenueCat sync'
              : `${formatNumber(paidActiveTotal)} active subscribers`}
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
    </div>
  );
}
