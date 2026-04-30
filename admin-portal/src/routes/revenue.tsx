import { useEffect, useState } from 'react';
import {
  Card,
  DonutChart,
  Legend,
  Tab,
  TabGroup,
  TabList,
  Text,
  Title,
} from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { callRpc, RpcError } from '@/lib/rpc';
import {
  formatCurrencyAUD,
  formatNumber,
  formatRelativeTime,
} from '@/lib/format';
import type {
  KpiDashboardResponse,
  RevenueSummaryResponse,
} from './dashboard/types';
import { PERIODS, type Period } from './dashboard/types';

/**
 * BRIEFING § 11.8 — Revenue snapshot. Calls both admin_revenue_summary
 * and admin_kpi_dashboard so we get plan mix + trial counts in one place.
 *
 * Numbers are the local snapshot — RevenueCat is the source of truth for
 * entitlements/payments and blocks iframe embedding, so we link out at the
 * bottom for the full picture.
 */

const PLAN_LABEL: Record<'tfn' | 'abn' | 'pro', string> = {
  tfn: 'TFN',
  abn: 'ABN',
  pro: 'PRO',
};

interface RevenueData {
  revenue: RevenueSummaryResponse;
  kpi: KpiDashboardResponse;
}

export function RevenuePage() {
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [revenue, kpi] = await Promise.all([
          callRpc<RevenueSummaryResponse>('admin_revenue_summary', {
            p_period_days: period,
          }),
          callRpc<KpiDashboardResponse>('admin_kpi_dashboard', {
            p_period_days: period,
          }),
        ]);
        if (!alive) return;
        setData({ revenue, kpi });
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof RpcError ? `${err.rpcName}: ${err.message}` : 'Failed to load revenue'
        );
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [period]);

  // mrr_by_plan is an OBJECT { tfn, abn, pro } — not an array.
  // Until RC sync materializes per-plan MRR, we use the headcount in
  // kpi.paid_active as a structural placeholder so the donut renders.
  const planRows = (() => {
    if (!data) return [];
    const breakdown = data.revenue.mrr_by_plan ?? data.kpi.paid_active;
    if (!breakdown) return [];
    return (['tfn', 'abn', 'pro'] as const)
      .map((k) => ({
        name: PLAN_LABEL[k],
        value: breakdown[k] ?? 0,
      }))
      .filter((r) => r.value > 0);
  })();

  const periodIndex = PERIODS.findIndex((p) => p.days === period);
  const mrr = data?.revenue.mrr_total ?? data?.kpi.mrr_estimate_aud ?? null;
  const churn = data?.revenue.churn_period ?? data?.kpi.churn_period ?? null;
  const ltv = data?.revenue.ltv_estimate_aud ?? null;
  const conversion = data?.revenue.conversion_trial_to_paid_period ?? null;
  const paidActiveTotal = data?.kpi.paid_active
    ? (data.kpi.paid_active.tfn ?? 0) +
      (data.kpi.paid_active.abn ?? 0) +
      (data.kpi.paid_active.pro ?? 0)
    : null;
  const trialsStarted = data?.kpi.trials_started_period ?? null;
  const trialsActive = data?.kpi.trials_active ?? null;
  const snapshotAt = data?.revenue.snapshot_at ?? data?.kpi.snapshot_at ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title className="!text-navy-700">Revenue</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Local snapshot — RevenueCat is source of truth for entitlements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TabGroup
            index={periodIndex === -1 ? 1 : periodIndex}
            onIndexChange={(i) => {
              const next = PERIODS[i];
              if (next) setPeriod(next.days);
            }}
          >
            <TabList variant="solid">
              {PERIODS.map((p) => (
                <Tab key={p.days}>{p.label}</Tab>
              ))}
            </TabList>
          </TabGroup>
          <span className="text-xs text-navy-300">
            {snapshotAt
              ? `Updated ${formatRelativeTime(snapshotAt)}`
              : loading
                ? 'Loading…'
                : ''}
          </span>
          {loading && <Spinner size="sm" />}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong className="font-semibold">Failed to load revenue.</strong>{' '}
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiHero
          label="MRR"
          value={mrr}
          formatter={formatCurrencyAUD}
          hint={mrr === null ? 'Pending RevenueCat sync' : 'Monthly recurring (AUD)'}
          loading={loading && !data}
          tone="brand"
        />
        <KpiHero
          label="Active subscribers"
          value={paidActiveTotal}
          hint={paidActiveTotal === null ? 'Pending RC sync' : 'Across all plans'}
          loading={loading && !data}
          tone="lime"
        />
        <KpiHero
          label={`Churn · ${period}d`}
          value={churn}
          hint={churn === null ? 'Pending RC sync' : 'Cancellations in period'}
          loading={loading && !data}
          tone="warning"
          isIncreasePositive={false}
        />
        <KpiHero
          label="LTV estimate"
          value={ltv}
          formatter={formatCurrencyAUD}
          hint="Pending RevenueCat sync"
          loading={loading && !data}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Title>Plan mix</Title>
          <Text className="mt-1 text-xs text-navy-300">
            {paidActiveTotal === null
              ? 'Pending RevenueCat sync'
              : `${formatNumber(paidActiveTotal)} active subs`}
          </Text>
          {loading ? (
            <div className="mt-4 h-48 animate-pulse rounded bg-navy-50/60" />
          ) : planRows.length === 0 ? (
            <div className="mt-4 flex h-48 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
              Pending RevenueCat sync
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-around">
              <DonutChart
                data={planRows}
                category="value"
                index="name"
                valueFormatter={formatNumber}
                colors={['emerald', 'lime', 'amber']}
                className="h-48 w-48"
                showAnimation={false}
              />
              <Legend
                categories={planRows.map((p) => p.name)}
                colors={['emerald', 'lime', 'amber']}
              />
            </div>
          )}
        </Card>

        <Card>
          <Title>Trial → paid</Title>
          <Text className="mt-1 text-xs text-navy-300">
            Conversion ({period}d)
          </Text>
          <div className="mt-3 text-3xl font-semibold text-brand-600">
            {loading
              ? '—'
              : conversion === null
                ? '—'
                : `${(conversion * 100).toFixed(1)}%`}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-navy-50 bg-white p-2.5">
              <div className="text-navy-300">Trials started</div>
              <div className="mt-1 text-base font-medium text-navy-700">
                {formatNumber(trialsStarted)}
              </div>
            </div>
            <div className="rounded-md border border-navy-50 bg-white p-2.5">
              <div className="text-navy-300">Active now</div>
              <div className="mt-1 text-base font-medium text-navy-700">
                {formatNumber(trialsActive)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-navy-700">
              RevenueCat dashboard
            </div>
            <p className="mt-0.5 text-xs text-navy-300">
              Numbers above are the local snapshot. RC blocks iframes, so we link out.
            </p>
          </div>
          <a
            href="https://app.revenuecat.com/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700"
          >
            Open RevenueCat
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </Card>
    </div>
  );
}
