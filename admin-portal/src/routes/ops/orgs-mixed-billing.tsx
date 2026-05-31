// ADM1 — Mixed-billing audit.
// Users whose effective billing has overlapping sources (subsidy + topup,
// subsidy + self-pay, multi-org subsidy). Pure debug view for support.

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Title, Text, Badge,
} from '@tremor/react';
import { callRpc } from '@/lib/rpc';

interface Row {
  user_id: string;
  user_email: string;
  subsidy_count: number;
  subsidy_org_ids: string[];
  subsidy_org_names: string[];
  has_self_pay: boolean;
  self_pay_plan: string | null;
  has_topup_abn: boolean;
  has_topup_pro: boolean;
  effective_level: string;
  total_rows: number;
}

function levelBadge(level: string) {
  const map: Record<string, 'emerald' | 'blue' | 'amber' | 'gray'> = {
    pro_full: 'emerald',
    abn_full: 'blue',
    abn_restricted: 'amber',
    none: 'gray',
  };
  return <Badge color={map[level] ?? 'gray'}>{level}</Badge>;
}

export function OrgsMixedBillingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callRpc<Row[]>('admin_mixed_billing_audit', { p_limit: 200, p_offset: 0 });
      setRows(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <Title>Mixed-billing audit</Title>
        <Text>
          Users with overlapping billing sources. Use this when a support ticket mentions invoice
          rejection or unexpected paywall — the row will show which combination is active.
        </Text>
      </div>

      <Card>
        {loading && <Text>Loading…</Text>}
        {error && <Text className="text-rose-600">{error}</Text>}

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Effective level</TableHeaderCell>
              <TableHeaderCell>Org subsidies</TableHeaderCell>
              <TableHeaderCell>Top-ups</TableHeaderCell>
              <TableHeaderCell>Self-pay</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell>
                  <Text className="font-medium truncate max-w-[260px]">{r.user_email}</Text>
                  <Text className="text-[10px] text-navy-400">{r.user_id.slice(0, 8)}…</Text>
                </TableCell>
                <TableCell>{levelBadge(r.effective_level)}</TableCell>
                <TableCell>
                  {r.subsidy_count > 0 ? (
                    <div>
                      <Badge color={r.subsidy_count > 1 ? 'red' : 'emerald'}>{r.subsidy_count}</Badge>
                      <Text className="mt-1 text-[11px]">{r.subsidy_org_names.join(', ')}</Text>
                    </div>
                  ) : (
                    <Text className="text-navy-300">—</Text>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {r.has_topup_abn && <Badge color="amber">+ABN $5</Badge>}
                    {r.has_topup_pro && <Badge color="purple">+PRO $9</Badge>}
                    {!r.has_topup_abn && !r.has_topup_pro && <Text className="text-navy-300">—</Text>}
                  </div>
                </TableCell>
                <TableCell>
                  {r.has_self_pay
                    ? <Badge color={r.self_pay_plan === 'pro' ? 'purple' : 'blue'}>{r.self_pay_plan}</Badge>
                    : <Text className="text-navy-300">—</Text>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow><TableCell colSpan={5}><Text>No conflicting users — everyone's billing is clean.</Text></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
