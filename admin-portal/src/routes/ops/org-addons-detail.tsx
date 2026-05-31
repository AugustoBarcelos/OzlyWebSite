// ADM3 — Per-org add-on toggle.
// Lives at /ops/orgs/:id/addons. Activate/deactivate add-ons for a single
// org via admin_org_addon_toggle RPC (which fires Stripe via edge fn).

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Title, Text, Badge, Button, TextInput,
} from '@tremor/react';
import { callRpc } from '@/lib/rpc';

interface Row {
  addon_key: string;
  label: string;
  price_type: 'per_seat' | 'flat';
  unit_amount: number;
  min_seats: number | null;
  status: 'inactive' | 'pending' | 'active' | 'canceled' | 'failed';
  activated_at: string | null;
  activated_by: string | null;
  notes: string | null;
  status_detail: string | null;
  stripe_ready: boolean;
}

function statusBadge(s: string) {
  const map: Record<string, 'gray' | 'emerald' | 'amber' | 'red' | 'blue'> = {
    inactive: 'gray',
    pending: 'amber',
    active: 'emerald',
    canceled: 'gray',
    failed: 'red',
  };
  return <Badge color={map[s] ?? 'gray'}>{s}</Badge>;
}

export function OrgAddonsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [noteByKey, setNoteByKey] = useState<Record<string, string>>({});
  const [forceByKey, setForceByKey] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callRpc<Row[]>('admin_org_addons', { p_org_id: id });
      setRows(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(key: string, enabled: boolean) {
    if (!id) return;
    setSavingKey(key);
    try {
      await callRpc('admin_org_addon_toggle', {
        p_org_id: id,
        p_addon_key: key,
        p_enabled: enabled,
        p_notes: noteByKey[key] ?? null,
        p_force: forceByKey[key] ?? false,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Title>Add-ons for org {id?.slice(0, 8)}…</Title>
        <Text>Activate / deactivate add-ons via Stripe Subscription Items. Proration is automatic.</Text>
      </div>

      <Card>
        {loading && <Text>Loading…</Text>}
        {error && <Text className="text-rose-600">{error}</Text>}

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Add-on</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const isActive = r.status === 'active' || r.status === 'pending';
              return (
                <TableRow key={r.addon_key}>
                  <TableCell>
                    <div className="font-medium">{r.label}</div>
                    <Text className="text-[11px]">
                      {r.price_type === 'per_seat' ? 'per seat' : 'flat'}
                      {r.min_seats ? ` · requires ≥${r.min_seats} seats` : ''}
                    </Text>
                  </TableCell>
                  <TableCell>${(r.unit_amount / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    {statusBadge(r.status)}
                    {!r.stripe_ready && <Badge color="red" className="ml-2">no_stripe_price</Badge>}
                    {r.status_detail && <Text className="mt-1 text-[10px] text-rose-600">{r.status_detail}</Text>}
                  </TableCell>
                  <TableCell>
                    {isActive ? (
                      <Button
                        size="xs"
                        variant="secondary"
                        color="red"
                        onClick={() => void toggle(r.addon_key, false)}
                        loading={savingKey === r.addon_key}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <div className="space-y-1">
                        <TextInput
                          placeholder="note"
                          value={noteByKey[r.addon_key] ?? ''}
                          onChange={(e) => setNoteByKey({ ...noteByKey, [r.addon_key]: e.target.value })}
                        />
                        {r.min_seats && (
                          <label className="flex items-center gap-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={!!forceByKey[r.addon_key]}
                              onChange={(e) => setForceByKey({ ...forceByKey, [r.addon_key]: e.target.checked })}
                            />
                            Force (skip min seats)
                          </label>
                        )}
                        <Button
                          size="xs"
                          onClick={() => void toggle(r.addon_key, true)}
                          loading={savingKey === r.addon_key}
                          disabled={!r.stripe_ready}
                        >
                          Activate
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
