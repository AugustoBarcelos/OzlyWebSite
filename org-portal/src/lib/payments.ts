import { supabase } from '@/lib/supabase';
import type { PayState } from '@/lib/types';

// Per-member payment coverage for an org (company subsidy OR self-pay), keyed
// by user_id. Backed by the org_member_payment_status RPC. On any error (e.g.
// the migration not applied yet) returns {} so the UI greys NOTHING rather than
// greying everything — we only dim members we KNOW are 'none'.
export async function fetchPayState(orgId: string): Promise<Record<string, PayState>> {
  const { data, error } = await supabase.rpc('org_member_payment_status', { p_org_id: orgId });
  if (error || !data) return {};
  const map: Record<string, PayState> = {};
  for (const row of data as { user_id: string; source: PayState }[]) map[row.user_id] = row.source;
  return map;
}

/** True only when we positively know the member is not being paid for. */
export function isUnpaid(map: Record<string, PayState>, userId: string | null | undefined): boolean {
  return !!userId && map[userId] === 'none';
}
