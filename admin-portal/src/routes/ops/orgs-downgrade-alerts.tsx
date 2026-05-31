// ADM2 — Downgrade alerts inbox.
// When an org downgrades AND ticks "contact me", a row appears here. You
// mark it as contacted when you follow up — that hides it from the default
// "open" view.

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Title, Text, Badge, Button, TextInput,
} from '@tremor/react';
import { callRpc } from '@/lib/rpc';

interface Row {
  id: string;
  org_id: string;
  org_name: string;
  from_price_key: string | null;
  to_price_key: string;
  reason: string;
  reason_other: string | null;
  contact_requested: boolean;
  contacted_at: string | null;
  resolved: boolean;
  initiated_by: string;
  initiator_email: string;
  created_at: string;
  total_rows: number;
}

const REASON_LABEL: Record<string, string> = {
  team_shrunk: 'Team shrunk',
  cost: 'Cost too high',
  underused: 'Not using enough',
  missing_feature: 'Missing feature',
  other: 'Other',
};

export function OrgsDowngradeAlertsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteByRow, setNoteByRow] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callRpc<Row[]>('admin_downgrade_alerts_list', {
        p_resolved: showResolved,
        p_limit: 200,
        p_offset: 0,
      });
      setRows(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => { void load(); }, [load]);

  async function markContacted(id: string) {
    setSavingId(id);
    try {
      await callRpc('admin_downgrade_mark_contacted', { p_log_id: id, p_note: noteByRow[id] ?? null });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Title>Downgrade alerts</Title>
          <Text>Orgs that downgraded and asked to be contacted. 24h SLA on your reply.</Text>
        </div>
        <Button variant="secondary" onClick={() => setShowResolved((v) => !v)}>
          {showResolved ? 'Show open' : 'Show resolved'}
        </Button>
      </div>

      <Card>
        {loading && <Text>Loading…</Text>}
        {error && <Text className="text-rose-600">{error}</Text>}

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell>Org</TableHeaderCell>
              <TableHeaderCell>From → To</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell>Contact?</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Text className="text-[12px]">{new Date(r.created_at).toLocaleString('en-AU')}</Text>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.org_name}</div>
                  <Text className="text-[11px]">{r.initiator_email}</Text>
                </TableCell>
                <TableCell>
                  <Text className="text-[12px]">{r.from_price_key ?? '—'}</Text>
                  <Text className="text-[12px]">→ {r.to_price_key}</Text>
                </TableCell>
                <TableCell>
                  <Text>{REASON_LABEL[r.reason] ?? r.reason}</Text>
                  {r.reason_other && <Text className="text-[11px] mt-1">"{r.reason_other}"</Text>}
                </TableCell>
                <TableCell>
                  {r.contact_requested ? <Badge color="red">YES — call them</Badge> : <Badge color="gray">no</Badge>}
                </TableCell>
                <TableCell>
                  {r.resolved ? (
                    <Text className="text-[11px]">
                      Resolved {r.contacted_at ? new Date(r.contacted_at).toLocaleDateString('en-AU') : ''}
                    </Text>
                  ) : (
                    <div className="space-y-1">
                      <TextInput
                        placeholder="note (optional)"
                        value={noteByRow[r.id] ?? ''}
                        onChange={(e) => setNoteByRow({ ...noteByRow, [r.id]: e.target.value })}
                      />
                      <Button
                        size="xs"
                        onClick={() => void markContacted(r.id)}
                        loading={savingId === r.id}
                      >
                        Mark contacted
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow><TableCell colSpan={6}><Text>Inbox is clear.</Text></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
