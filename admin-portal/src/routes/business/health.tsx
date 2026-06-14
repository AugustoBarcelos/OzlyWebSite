import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  Title,
} from '@tremor/react';
import { KpiCard } from '@/components/KpiCard';
import { Spinner } from '@/components/Spinner';
import { callRpc } from '@/lib/rpc';
import { formatCurrencyAUD, formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * /business — Ozly for Business monitor.
 * Single read of admin_org_subscriptions_health (one row per org): plan, seats,
 * accepted members, MRR, trial/renewal, status. KPIs are derived client-side.
 */

interface OrgHealthRow {
  org_id: string;
  org_name: string;
  admin_email: string | null;
  billing_plan: string | null;
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

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trial' },
  { value: 'past_due', label: 'Past due' },
  { value: 'canceled', label: 'Cancelled' },
  { value: 'unconfigured', label: 'No payment' },
] as const;

function statusColor(s: string): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (s === 'active') return 'emerald';
  if (s === 'trialing') return 'amber';
  if (s === 'past_due' || s === 'canceled') return 'rose';
  return 'slate';
}

export function BusinessHealthPage() {
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<OrgHealthRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await callRpc<OrgHealthRow[]>('admin_org_subscriptions_health', {
          p_status: status || null,
          p_limit: 500,
          p_offset: 0,
        });
        if (alive) setRows(data ?? []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.org_name?.toLowerCase().includes(q) ||
        (r.admin_email ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const kpis = useMemo(() => {
    const r = rows ?? [];
    return {
      activeOrgs: r.filter((x) => x.sub_status === 'active' || x.sub_status === 'trialing').length,
      mrr: r.reduce((s, x) => s + (x.mrr_cents || 0), 0) / 100,
      seats: r.reduce((s, x) => s + (x.seat_quantity || 0), 0),
      members: r.reduce((s, x) => s + (x.accepted_members || 0), 0),
      trials: r.filter((x) => x.sub_status === 'trialing').length,
      pastDue: r.filter((x) => x.sub_status === 'past_due').length,
    };
  }, [rows]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Title>Ozly for Business</Title>
        <Text>Every organisation on the B2B portal — plan, seats, members, MRR and billing health.</Text>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard title="Active orgs" value={kpis.activeOrgs} formatter={formatNumber} loading={loading} />
        <KpiCard title="Org MRR" value={kpis.mrr} formatter={formatCurrencyAUD} loading={loading} />
        <KpiCard title="Seats" value={kpis.seats} formatter={formatNumber} loading={loading} />
        <KpiCard title="Covered members" value={kpis.members} formatter={formatNumber} loading={loading} />
        <KpiCard title="On trial" value={kpis.trials} formatter={formatNumber} loading={loading} />
        <KpiCard title="Past due" value={kpis.pastDue} formatter={formatNumber} loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              status === t.value
                ? 'bg-navy-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto w-64">
          <TextInput placeholder="Search org or admin email…" value={search} onValueChange={setSearch} />
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : error ? (
          <Text className="py-8 text-center text-rose-600">{error}</Text>
        ) : filtered.length === 0 ? (
          <Text className="py-8 text-center text-slate-500">No organisations match.</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Organisation</TableHeaderCell>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Seats</TableHeaderCell>
                <TableHeaderCell className="text-right">Members</TableHeaderCell>
                <TableHeaderCell className="text-right">MRR</TableHeaderCell>
                <TableHeaderCell>Trial / renews</TableHeaderCell>
                <TableHeaderCell>Joined</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.org_id}>
                  <TableCell>
                    <div className="font-medium text-navy-800">{r.org_name || '—'}</div>
                    <div className="text-xs text-slate-500">{r.admin_email || '—'}</div>
                  </TableCell>
                  <TableCell>
                    <span className="uppercase">{r.billing_plan || '—'}</span>
                    {r.billing_interval ? (
                      <span className="ml-1 text-xs text-slate-400">/ {r.billing_interval}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge color={statusColor(r.sub_status)}>{r.sub_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(r.seat_quantity)}</TableCell>
                  <TableCell className="text-right">{formatNumber(r.accepted_members)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrencyAUD(r.mrr_cents / 100)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {r.sub_status === 'trialing' && r.trial_ends_at
                      ? `Trial ends ${formatRelativeTime(r.trial_ends_at)}`
                      : r.current_period_end
                        ? `Renews ${formatRelativeTime(r.current_period_end)}`
                        : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatRelativeTime(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
