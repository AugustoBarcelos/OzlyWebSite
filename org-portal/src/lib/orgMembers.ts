import { supabase } from '@/lib/supabase';
import type { BillingConfig } from '@/lib/period';

// Per-member billing cycle (frequency + anchor), keyed by user_id. Used to group
// the Work and Invoices screens by member → period. Missing members fall back to
// the default cycle inside periodFor().
export async function fetchBillingConfigs(orgId: string): Promise<Record<string, BillingConfig>> {
  const { data } = await supabase
    .from('org_memberships')
    .select('user_id, billing_frequency, billing_anchor')
    .eq('org_id', orgId)
    .eq('status', 'accepted');
  const map: Record<string, BillingConfig> = {};
  for (const r of (data ?? []) as {
    user_id: string;
    billing_frequency: BillingConfig['frequency'];
    billing_anchor: string | null;
  }[]) {
    map[r.user_id] = { frequency: r.billing_frequency, anchor: r.billing_anchor };
  }
  return map;
}

export function configFor(map: Record<string, BillingConfig>, userId: string): BillingConfig {
  return map[userId] ?? { frequency: 'fortnightly', anchor: null };
}
