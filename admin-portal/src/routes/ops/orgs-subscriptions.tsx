// ADM1 — Org subscriptions health.
// All B2B orgs with their Stripe status, tier, MRR contribution and
// next renewal date. Filterable by status.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Title, Text, Badge, Select, SelectItem,
} from '@tremor/react';
import { callRpc } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';

interface Row {
  org_id: string;
  org_name: string;
  admin_email: string;
  billing_plan: string;
  sub_status: string;
  price_lookup_key: string | null;
  billing_interval: string | null;
  seat_quantity: number;
  accepted_members: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  mrr_cents: number;
  stripe_customer_id: string | null;
  created_at: string;
  total_rows: number;
}

const STATUS_OPTIONS = ['all', 'trialing', 'active', 'past_due', 'canceled', 'unconfigured'];

function tierLabel(key: string | null): string {
  if (!key) return '—';
  const tier = key.startsWith('org_t1') ? 'Tier 1 (1–5)'
             : key.startsWith('org_t2') ? 'Tier 2 (6–15)'
             : key.startsWith('org_t3') ? 'Tier 3 (16–30)'
             : key.startsWith('org_t4') ? 'Tier 4 (31–100)'
             : key;
  return `${tier} · ${key.endsWith('_annual') ? 'annual' : 'monthly'}`;
}

function statusBadge(status: string) {
  const map: Record<string, 'red' | 'amber' | 'emerald' | 'gray' | 'blue'> = {
    past_due: 'red',
    trialing: 'amber',
    active: 'emerald',
    canceled: 'gray',
    unconfigured: 'gray',
    incomplete: 'blue',
    incomplete_expired: 'red',
  };
  return <Badge color={map[status] ?? 'gray'}>{status}</Badge>;
}

export function OrgsSubscriptionsHealthPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callRpc<Row[]>('admin_org_subscriptions_health', {
        p_status: status === 'all' ? null : status,
        p_limit: 200,
        p_offset: 0,
      });
      setRows(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.mrrCents += Number(r.mrr_cents) || 0;
        acc.seats += r.seat_quantity || 0;
        if (r.sub_status === 'active') acc.active++;
        else if (r.sub_status === 'trialing') acc.trialing++;
        else if (r.sub_status === 'past_due') acc.pastDue++;
        else if (r.sub_status === 'canceled') acc.canceled++;
        return acc;
      },
      { mrrCents: 0, seats: 0, active: 0, trialing: 0, pastDue: 0, canceled: 0 },
    );
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <Title>Org subscriptions health</Title>
        <Text>Stripe-backed B2B subscriptions, sorted by status urgency + MRR.</Text>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card><Text>MRR (this page)</Text><Title>${(totals.mrrCents / 100).toFixed(2)}</Title></Card>
        <Card><Text>Active</Text><Title>{totals.active}</Title></Card>
        <Card><Text>Trialing</Text><Title>{totals.trialing}</Title></Card>
        <Card><Text>Past due</Text><Title className="text-rose-600">{totals.pastDue}</Title></Card>
        <Card><Text>Canceled</Text><Title>{totals.canceled}</Title></Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Select value={status} onValueChange={setStatus} className="max-w-xs">
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </Select>
          {loading && <Text>Loading…</Text>}
          {error && <Text className="text-rose-600">{error}</Text>}
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Org</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Tier</TableHeaderCell>
              <TableHeaderCell className="text-right">Seats</TableHeaderCell>
              <TableHeaderCell className="text-right">MRR</TableHeaderCell>
              <TableHeaderCell>Next renewal</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.org_id}>
                <TableCell>
                  <div className="font-medium text-navy-700">{r.org_name}</div>
                  <Text className="text-[11px]">created {formatRelativeTime(r.created_at)}</Text>
                </TableCell>
                <TableCell>{statusBadge(r.sub_status)}</TableCell>
                <TableCell><Text>{tierLabel(r.price_lookup_key)}</Text></TableCell>
                <TableCell className="text-right">
                  {r.seat_quantity}{r.accepted_members !== r.seat_quantity && (
                    <Text className="text-[11px]">({r.accepted_members} accepted)</Text>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">${(Number(r.mrr_cents) / 100).toFixed(2)}</TableCell>
                <TableCell>
                  {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString('en-AU') : '—'}
                </TableCell>
                <TableCell><Text className="truncate max-w-[200px]">{r.admin_email}</Text></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow><TableCell colSpan={7}><Text>No orgs match this filter.</Text></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
