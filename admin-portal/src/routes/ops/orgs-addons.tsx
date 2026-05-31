// ADM3 — Add-ons catalog overview.
// 5 launch add-ons (Visa Shield / Xero / MYOB / SLA / White-label).
// Per-org toggle lives at /ops/orgs/:id/addons.

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Title, Text, Badge,
} from '@tremor/react';
import { callRpc } from '@/lib/rpc';

interface Row {
  key: string;
  label: string;
  price_type: 'per_seat' | 'flat';
  unit_amount: number;
  currency: string;
  stripe_price_id: string | null;
  min_seats: number | null;
  active_orgs: number;
  mrr_cents: number;
}

function priceLabel(r: Row): string {
  const aud = (r.unit_amount / 100).toFixed(2);
  return r.price_type === 'per_seat' ? `$${aud}/seat/mo` : `$${aud}/mo flat`;
}

export function AddonsCatalogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callRpc<Row[]>('admin_addons_catalog_overview');
      setRows(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalMrr = rows.reduce((s, r) => s + Number(r.mrr_cents), 0);
  const totalActive = rows.reduce((s, r) => s + r.active_orgs, 0);

  return (
    <div className="space-y-4">
      <div>
        <Title>Add-ons catalog</Title>
        <Text>
          Phase 3 catalogue. Set the Stripe price_id (in addon_catalog) and add-ons become
          activatable per-org from /ops/orgs/:id/addons.
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card><Text>Total add-on MRR</Text><Title>${(totalMrr / 100).toFixed(2)}</Title></Card>
        <Card><Text>Active subscriptions</Text><Title>{totalActive}</Title></Card>
        <Card><Text>Catalog items</Text><Title>{rows.length}</Title></Card>
      </div>

      <Card>
        {loading && <Text>Loading…</Text>}
        {error && <Text className="text-rose-600">{error}</Text>}

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Add-on</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Gating</TableHeaderCell>
              <TableHeaderCell>Stripe</TableHeaderCell>
              <TableHeaderCell className="text-right">Active orgs</TableHeaderCell>
              <TableHeaderCell className="text-right">MRR</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>
                  <div className="font-medium">{r.label}</div>
                  <Text className="text-[11px]">{r.key}</Text>
                </TableCell>
                <TableCell><Text>{priceLabel(r)}</Text></TableCell>
                <TableCell>
                  {r.min_seats ? <Badge color="amber">≥ {r.min_seats} seats</Badge> : <Text className="text-navy-300">none</Text>}
                </TableCell>
                <TableCell>
                  {r.stripe_price_id
                    ? <Badge color="emerald">Ready</Badge>
                    : <Badge color="red">Setup needed</Badge>}
                </TableCell>
                <TableCell className="text-right">{r.active_orgs}</TableCell>
                <TableCell className="text-right font-medium">${(Number(r.mrr_cents) / 100).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow><TableCell colSpan={6}><Text>Catalog is empty.</Text></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
