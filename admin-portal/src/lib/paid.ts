import { callRpc } from './rpc';
import type { ChannelKind } from './auth';

export type PaidChannel = Extract<ChannelKind, `paid_${string}`>;

export interface PaidCampaignSnapshot {
  campaign_external_id: string;
  campaign_label: string | null;
  currency: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa_cents: number | null;
  ctr_pct: number | null;
  last_status: 'active' | 'paused' | 'removed' | 'unknown' | null;
}

export interface PaidChannelTotals {
  total_spend_cents: number;
  total_conversions: number;
  total_impressions: number;
  total_clicks: number;
  avg_cpa_cents: number | null;
  campaigns_count: number;
}

export interface PaidChannelDetail {
  channel: PaidChannel;
  period_days: number;
  totals: PaidChannelTotals;
  campaigns: PaidCampaignSnapshot[];
}

export interface PaidOverview {
  period_days: number;
  totals: {
    total_spend_cents: number;
    total_conversions: number;
    avg_cpa_cents: number | null;
  };
  channels: Array<{
    channel: PaidChannel;
    spend_cents: number;
    conversions: number;
    cpa_cents: number | null;
    campaigns_count: number;
  }>;
}

export async function fetchPaidChannel(channel: PaidChannel, periodDays = 30) {
  return callRpc<PaidChannelDetail>('admin_paid_snapshot_list', {
    p_channel: channel,
    p_period_days: periodDays,
  });
}

export async function fetchPaidOverview(periodDays = 30) {
  return callRpc<PaidOverview>('admin_paid_snapshot_overview', {
    p_period_days: periodDays,
  });
}

export function formatCents(cents: number, currency = 'AUD'): string {
  return `${currency} ${(cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
