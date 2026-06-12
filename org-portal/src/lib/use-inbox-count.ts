// Sidebar badge for the Action Inbox — counts everything waiting on the
// admin: pending stragglers + invoices edited after visibility (divergence)
// + overdue invoices. Cheap by design: two head-count queries + one RPC,
// fired once per org per Layout mount. Pages that resolve items dispatch
// `notifyInboxCountChanged()` so the badge updates without a route reload.
//
// Errors (e.g. RPC migration not applied) degrade to 0 — the badge must
// never break navigation.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const REFRESH_EVENT = 'ozly:inbox-count-refresh';
const STRAGGLER_PERIOD_DAYS = 30;

export function notifyInboxCountChanged(): void {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

export function useInboxCount(orgId: string | null): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!orgId) { setCount(0); return; }
    const from = new Date(Date.now() - STRAGGLER_PERIOD_DAYS * 86_400_000).toISOString();
    const to = new Date().toISOString();
    const [divergentRes, overdueRes, stragglersRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('org_visible_id', orgId)
        .eq('divergence_status', 'pending'),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('org_visible_id', orgId)
        .eq('status', 'overdue'),
      supabase.rpc('org_invoice_stragglers', {
        p_org_id: orgId,
        p_period_from: from,
        p_period_to: to,
      }),
    ]);
    const divergent = divergentRes.error ? 0 : (divergentRes.count ?? 0);
    const overdue = overdueRes.error ? 0 : (overdueRes.count ?? 0);
    const stragglers = stragglersRes.error
      ? 0
      : ((stragglersRes.data ?? []) as Array<{ uninvoiced_count: number }>)
          .filter((r) => r.uninvoiced_count > 0).length;
    setCount(divergent + overdue + stragglers);
  }, [orgId]);

  useEffect(() => {
    void load();
    const onRefresh = () => void load();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [load]);

  return count;
}
