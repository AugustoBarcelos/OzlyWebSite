import { useState } from 'react';
import {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Title,
} from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import { callEdge } from '@/lib/edge';
import { OverviewTab } from './OverviewTab';
import { BoardTab } from './BoardTab';
import { ProductTab } from './ProductTab';
import { useDashboardData } from './useDashboardData';
import { PERIODS, type Period } from './types';

interface RcSyncResponse {
  success?: boolean;
  total?: number;
  synced?: number;
  duration_ms?: number;
  breakdown?: Record<string, number>;
}

/**
 * Dashboard hub — KPIs executivos consolidados:
 *
 *  - Overview  — at-a-glance KPIs for everyone
 *  - Board     — MRR, plan mix, churn, retention cohort
 *  - Product   — activation, trial→paid, feature usage, cohort
 *
 * Marketing tab moved to /growth (acquisition funnel + affiliates).
 * Tech tab moved to /reliability (errors + tech health).
 *
 * All tabs share a single dashboard fetch (useDashboardData) and
 * a global period filter (7d / 30d / 90d).
 */

const TABS = [
  { key: 'overview', label: 'Overview', component: OverviewTab },
  { key: 'board', label: 'Board', component: BoardTab },
  { key: 'product', label: 'Product', component: ProductTab },
] as const;

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>(30);
  const { data, loading, error, refetch } = useDashboardData(period);
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const periodIndex = PERIODS.findIndex((p) => p.days === period);
  const snapshotAt = data.kpi?.snapshot_at;

  const syncRevenueCat = async () => {
    setSyncing(true);
    const r = await callEdge<RcSyncResponse>('revenuecat-sync', {
      method: 'POST',
      body: {},
    });
    setSyncing(false);
    if (!r.ok) {
      toast({
        title: 'RC sync failed',
        description: r.error,
        variant: 'error',
      });
      return;
    }
    const synced = r.data.synced ?? 0;
    const ms = r.data.duration_ms ?? 0;
    const description = r.data.breakdown
      ? Object.entries(r.data.breakdown)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')
      : '';
    toast({
      title: `RC sync OK · ${synced} users in ${(ms / 1000).toFixed(1)}s`,
      description,
      variant: 'success',
    });
    await refetch();
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title className="!text-navy-700">Dashboard</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Audience tabs · refreshed every 5 min via pg_cron
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

          <span className="text-xs text-navy-300" aria-live="polite">
            {snapshotAt
              ? `Updated ${formatRelativeTime(snapshotAt)}`
              : loading
                ? 'Loading…'
                : ''}
          </span>

          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            disabled={loading}
            title="Re-fetch the cached snapshot (fast)"
            className="inline-flex items-center gap-2 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Spinner size="sm" /> : null}
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              void syncRevenueCat();
            }}
            disabled={syncing || loading}
            title="Pull fresh data from RevenueCat (~7s)"
            className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? <Spinner size="sm" /> : null}
            Sync RC
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <strong className="font-semibold">Failed to load metrics.</strong>{' '}
            {error}
          </span>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="inline-flex items-center self-start rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100 sm:self-auto"
          >
            Retry
          </button>
        </div>
      )}

      <TabGroup>
        <TabList className="!border-b !border-navy-50">
          {TABS.map((t) => (
            <Tab key={t.key}>{t.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {TABS.map((t) => {
            const C = t.component;
            return (
              <TabPanel key={t.key}>
                <div className="mt-6">
                  <C data={data} loading={loading} period={period} />
                </div>
              </TabPanel>
            );
          })}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
