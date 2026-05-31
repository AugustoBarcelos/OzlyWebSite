import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import type { PayState } from '@/lib/types';

// Per-member payment coverage for an org (company subsidy OR self-pay), keyed
// by user_id. Backed by the org_member_payment_status RPC. On migration-not-
// applied (RPC missing) returns {} — the UI then dims nothing. On any OTHER
// error we report to Sentry so silent RLS / column-drift bugs surface.
export async function fetchPayState(orgId: string): Promise<Record<string, PayState>> {
  const { data, error } = await supabase.rpc('org_member_payment_status', { p_org_id: orgId });
  if (error) {
    const code = (error as { code?: string }).code;
    const msg = (error as { message?: string }).message ?? '';
    const isMissingRpc = code === 'PGRST202' || code === '42883' || msg.includes('Could not find the function');
    if (!isMissingRpc) {
      try { captureException(error, { source: 'fetchPayState' }); } catch { /* no-op */ }
    }
    return {};
  }
  if (!data) return {};
  const map: Record<string, PayState> = {};
  for (const row of data as { user_id: string; source: PayState }[]) map[row.user_id] = row.source;
  return map;
}

/** True only when we positively know the member is not being paid for. */
export function isUnpaid(map: Record<string, PayState>, userId: string | null | undefined): boolean {
  return !!userId && map[userId] === 'none';
}
