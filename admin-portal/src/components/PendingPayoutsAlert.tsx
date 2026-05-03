import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { callRpc, RpcError } from '@/lib/rpc';
import { HandshakeIcon } from './Icons';

interface PendingSummary {
  currency: string;
  count: number;
  cents: number;
}

interface PlanningResponse {
  pending_summary: PendingSummary[];
}

/**
 * Compact alert shown in Cockpit / Inbox when there are affiliate payouts
 * waiting to be marked paid. Click → goes to /affiliates?tab=payouts.
 *
 * Failure modes:
 *   - RPC missing: render nothing (silent — different env without affiliates pipeline)
 *   - RPC error: render nothing
 *   - No pending: render nothing (cockpit stays clean)
 */
export function PendingPayoutsAlert() {
  const [summary, setSummary] = useState<PendingSummary[]>([]);

  useEffect(() => {
    let alive = true;
    callRpc<PlanningResponse>('admin_affiliate_payout_planning', {})
      .then((d) => {
        if (alive) setSummary(d.pending_summary ?? []);
      })
      .catch((e: unknown) => {
        if (
          e instanceof RpcError &&
          (e.code === '42883' ||
            e.code === '42501' ||
            e.message.includes('does not exist'))
        ) {
          // RPC missing or forbidden — render nothing (silent).
          return;
        }
        // Any other error: also silent (cockpit shouldn't break on side data).
      });
    return () => {
      alive = false;
    };
  }, []);

  const totalCount = summary.reduce((sum, s) => sum + s.count, 0);
  if (totalCount === 0) return null;

  return (
    <Link
      to="/affiliates?tab=payouts"
      className="ozly-card flex w-full items-center gap-3 border-amber-200 bg-amber-50/80 p-3 transition-colors hover:bg-amber-100"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-700">
        <HandshakeIcon className="h-4 w-4" />
      </span>
      <div className="flex-1 text-sm">
        <div className="font-semibold text-amber-900">
          {totalCount} payout{totalCount === 1 ? '' : 's'} de afiliado pendente{totalCount === 1 ? '' : 's'}
        </div>
        <div className="text-[12px] text-amber-700">
          {summary
            .map((s) => `${s.currency} ${(s.cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            .join(' · ')}
        </div>
      </div>
      <span className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800">
        Pagar agora →
      </span>
    </Link>
  );
}
