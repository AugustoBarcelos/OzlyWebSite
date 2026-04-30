/**
 * Shared response types used across dashboard tabs.
 * Anything that depends on the RevenueCat sync (paid_active / mrr / churn /
 * trials) can be null until that pipeline lands.
 */

export interface PaidActiveBreakdown {
  tfn: number | null;
  abn: number | null;
  pro: number | null;
}

export interface KpiDashboardResponse {
  snapshot_at: string | null;
  period_days: number;
  signups_total: number | null;
  signups_period: number | null;
  activations_period: number | null;
  trials_active: number | null;
  trials_started_period: number | null;
  trials_expiring_7d: number | null;
  paid_active: PaidActiveBreakdown | null;
  mrr_estimate_aud: number | null;
  churn_period: number | null;
  referral_signups_period: number | null;
  referral_rewards_paid_period: number | null;
}

export interface RevenueSummaryResponse {
  snapshot_at: string | null;
  period_days: number;
  mrr_total: number | null;
  mrr_by_plan: PaidActiveBreakdown | null;
  new_paying_period: number | null;
  churn_period: number | null;
  ltv_estimate_aud: number | null;
  conversion_trial_to_paid_period: number | null;
}

export interface TimeseriesPoint {
  date: string;
  count: number;
}

export interface SignupsTimeseriesResponse {
  period_days: number;
  series: TimeseriesPoint[];
}

export interface FunnelResponse {
  period_days: number;
  signups: number | null;
  activations: number | null;
  trials: number | null;
  paid: number | null;
}

export interface GeoSplitRow {
  state: string;
  count: number;
}

export interface GeoSplitResponse {
  total: number;
  states: GeoSplitRow[];
}

export interface CohortRow {
  cohort: string;
  size: number;
  d1: number | null;
  d7: number | null;
  d14: number | null;
  d30: number | null;
  d60: number | null;
}

export interface CohortRetentionResponse {
  generated_at: string;
  cohorts: CohortRow[];
}

export interface JobsTimeseriesResponse {
  period_days: number;
  series: TimeseriesPoint[];
}

export interface ActiveUsersTimeseriesResponse {
  period_days: number;
  series: TimeseriesPoint[];
}

export interface ErrorRateResponse {
  period_days: number;
  current: number;
  previous: number;
}

export interface TopErrorRow {
  message: string;
  count: number;
  users: number;
  last_seen: string;
  screens: string[] | null;
}

export interface TopErrorsResponse {
  period_days: number;
  rows: TopErrorRow[];
}

export interface FeatureUsageRow {
  screen: string;
  views: number;
  users: number;
}

export interface FeatureUsageResponse {
  period_days: number;
  total_views: number;
  rows: FeatureUsageRow[];
}

export interface DbTableRow {
  table: string;
  size_pretty: string;
  bytes: number;
  rows: number;
}

export interface DbHealthResponse {
  db_size_bytes: number;
  db_size_pretty: string;
  top_tables: DbTableRow[];
}

export interface RecentAdminActionRow {
  id: string;
  admin_id: string | null;
  action: string;
  target: string | null;
  result: string | null;
  created_at: string;
}

export interface RecentAdminActionsResponse {
  rows: RecentAdminActionRow[];
  generated_at: string;
}

export interface TrialStatusResponse {
  period_days: number;
  trials_started_period: number | null;
  trials_active: number | null;
  trials_expiring_7d: number | null;
}

export interface ActivationFunnelResponse {
  period_days: number;
  signed_up: number;
  onboarded: number;
  trial_picked: number;
  first_session: number;
  first_job: number;
}

export interface TimeToActivationBucket {
  bucket: string;
  count: number;
}

export interface TimeToActivationResponse {
  cohort_window_days: number;
  buckets: TimeToActivationBucket[];
  never_activated: number;
}

export type Period = 7 | 30 | 90;

export const PERIODS: ReadonlyArray<{ days: Period; label: string }> = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];
