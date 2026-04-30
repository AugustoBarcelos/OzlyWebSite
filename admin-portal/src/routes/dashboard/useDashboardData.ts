import { useCallback, useEffect, useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';
import type {
  ActivationFunnelResponse,
  ActiveUsersTimeseriesResponse,
  CohortRetentionResponse,
  DbHealthResponse,
  ErrorRateResponse,
  FeatureUsageResponse,
  FunnelResponse,
  GeoSplitResponse,
  JobsTimeseriesResponse,
  KpiDashboardResponse,
  Period,
  RecentAdminActionsResponse,
  RevenueSummaryResponse,
  SignupsTimeseriesResponse,
  TimeToActivationResponse,
  TopErrorsResponse,
  TrialStatusResponse,
} from './types';

/**
 * Single fetcher for all dashboard tabs.
 *
 * Calls in parallel and degrades gracefully — RPCs that don't exist yet in
 * this environment just resolve to null and the consumer renders an empty
 * state. We don't fail the whole page because one of the optional RPCs is
 * missing.
 */
export interface DashboardData {
  kpi: KpiDashboardResponse | null;
  revenue: RevenueSummaryResponse | null;
  timeseries: SignupsTimeseriesResponse | null;
  funnel: FunnelResponse | null;
  geo: GeoSplitResponse | null;
  cohort: CohortRetentionResponse | null;
  loginRetention: CohortRetentionResponse | null;
  jobsTimeseries: JobsTimeseriesResponse | null;
  activeUsers: ActiveUsersTimeseriesResponse | null;
  errorRate: ErrorRateResponse | null;
  topErrors: TopErrorsResponse | null;
  featureUsage: FeatureUsageResponse | null;
  dbHealth: DbHealthResponse | null;
  recentActions: RecentAdminActionsResponse | null;
  trialStatus: TrialStatusResponse | null;
  activationFunnel: ActivationFunnelResponse | null;
  timeToActivation: TimeToActivationResponse | null;
}

const EMPTY: DashboardData = {
  kpi: null,
  revenue: null,
  timeseries: null,
  funnel: null,
  geo: null,
  cohort: null,
  loginRetention: null,
  jobsTimeseries: null,
  activeUsers: null,
  errorRate: null,
  topErrors: null,
  featureUsage: null,
  dbHealth: null,
  recentActions: null,
  trialStatus: null,
  activationFunnel: null,
  timeToActivation: null,
};

async function safeCall<T>(
  rpc: string,
  args: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await callRpc<T>(rpc, args);
  } catch (e) {
    if (
      e instanceof RpcError &&
      (e.code === '42883' || e.message.includes('does not exist'))
    ) {
      // RPC not deployed in this env — treat as no-data, not an error.
      return null;
    }
    // For Forbidden / rate-limit / other errors, the existing behavior is
    // to surface the first one. We rethrow so the orchestrator can decide.
    throw e;
  }
}

export function useDashboardData(period: Period) {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Tech-tab RPCs cap at 90d period for the error rate / feature usage
      // / active users series — RPC enforces this server-side, but we cap
      // here too so we never trigger a 22023.
      const techPeriod = Math.min(period, 90);

      const [
        kpi,
        revenue,
        timeseries,
        funnel,
        geo,
        cohort,
        loginRetention,
        jobsTimeseries,
        activeUsers,
        errorRate,
        topErrors,
        featureUsage,
        dbHealth,
        recentActions,
        trialStatus,
        activationFunnel,
        timeToActivation,
      ] = await Promise.all([
        callRpc<KpiDashboardResponse>('admin_kpi_dashboard', {
          p_period_days: period,
        }),
        callRpc<RevenueSummaryResponse>('admin_revenue_summary', {
          p_period_days: period,
        }),
        safeCall<SignupsTimeseriesResponse>('admin_signups_timeseries', {
          p_period_days: period,
        }),
        safeCall<FunnelResponse>('admin_funnel', { p_period_days: period }),
        safeCall<GeoSplitResponse>('admin_geo_split', {}),
        safeCall<CohortRetentionResponse>('admin_cohort_retention', {}),
        safeCall<CohortRetentionResponse>('admin_login_retention', {}),
        safeCall<JobsTimeseriesResponse>('admin_jobs_timeseries', {
          p_period_days: period,
        }),
        safeCall<ActiveUsersTimeseriesResponse>('admin_active_users_timeseries', {
          p_period_days: techPeriod,
        }),
        safeCall<ErrorRateResponse>('admin_app_error_rate', {
          p_period_days: techPeriod,
        }),
        safeCall<TopErrorsResponse>('admin_top_errors', {
          p_period_days: techPeriod,
          p_limit: 10,
        }),
        safeCall<FeatureUsageResponse>('admin_feature_usage_top', {
          p_period_days: techPeriod,
          p_limit: 12,
        }),
        safeCall<DbHealthResponse>('admin_db_health', {}),
        safeCall<RecentAdminActionsResponse>('admin_recent_admin_actions', {
          p_limit: 15,
        }),
        safeCall<TrialStatusResponse>('admin_trial_status_via_events', {
          p_period_days: period,
        }),
        safeCall<ActivationFunnelResponse>('admin_activation_funnel', {
          p_period_days: period,
        }),
        safeCall<TimeToActivationResponse>('admin_time_to_activation', {}),
      ]);
      setData({
        kpi,
        revenue,
        timeseries,
        funnel,
        geo,
        cohort,
        loginRetention,
        jobsTimeseries,
        activeUsers,
        errorRate,
        topErrors,
        featureUsage,
        dbHealth,
        recentActions,
        trialStatus,
        activationFunnel,
        timeToActivation,
      });
    } catch (e) {
      const msg =
        e instanceof RpcError
          ? `${e.rpcName}: ${e.message}`
          : e instanceof Error
            ? e.message
            : 'Unknown error';
      setError(msg);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
