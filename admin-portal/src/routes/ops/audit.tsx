import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextInput,
  Title,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { useToast } from '@/components/Toast';

/**
 * BRIEFING § 11.6 — paginated audit log viewer with filters and CSV export.
 *
 * - All reads go through `admin_audit_list` (rate-limited 60/min server-side).
 *   That RPC also logs the read itself, so any export click is implicitly
 *   meta-audited.
 * - CSV export is capped at 10k rows (anti-exfiltration) and uses a payload
 *   *summary* (the keys joined by comma) — never the raw payload values.
 */

const PAGE_SIZE = 50;
const CSV_MAX_ROWS = 10_000;

const KNOWN_ACTIONS = [
  'admin_grant_promo',
  'admin_force_resync',
  'admin_soft_delete_user',
  'admin_ban_user',
  'admin_search_users',
  'admin_view_user_360',
  'admin_export_user_data',
  'admin_revoke_sessions',
  'admin_audit_list',
  'admin_revenue_summary',
];

interface AuditRow {
  id?: string;
  created_at?: string;
  action?: string;
  admin_id?: string | null;
  admin_email_masked?: string | null;
  target_user_id?: string | null;
  payload?: Record<string, unknown> | null;
  result?: string | null;
}

interface AuditList {
  total?: number;
  limit?: number;
  offset?: number;
  rows?: AuditRow[];
}

interface Filters {
  action: string;
  adminId: string;
  targetUserId: string;
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

const EMPTY_FILTERS: Filters = {
  action: '',
  adminId: '',
  targetUserId: '',
  since: '',
  until: '',
};

function buildRpcFilter(f: Filters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f.action.trim()) out.action = f.action.trim();
  if (f.adminId.trim()) out.admin_id = f.adminId.trim();
  if (f.targetUserId.trim()) out.target_user_id = f.targetUserId.trim();
  if (f.since) out.since = new Date(`${f.since}T00:00:00Z`).toISOString();
  if (f.until) out.until = new Date(`${f.until}T23:59:59Z`).toISOString();
  return out;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function payloadSummary(p: Record<string, unknown> | null | undefined): string {
  if (!p || typeof p !== 'object') return '';
  return Object.keys(p).join(',');
}

function resultBadgeColor(r: string | null | undefined): 'emerald' | 'rose' | 'amber' | 'slate' {
  if (!r) return 'slate';
  const v = r.toLowerCase();
  if (v === 'success' || v === 'ok') return 'emerald';
  if (v === 'forbidden' || v === 'denied') return 'amber';
  if (v.includes('fail') || v === 'error') return 'rose';
  return 'slate';
}

export function AuditPage() {
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Reset to page 0 whenever filters change.
  useEffect(() => {
    setPage(0);
  }, [appliedFilters]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await callRpc<AuditList>('admin_audit_list', {
          p_limit: PAGE_SIZE,
          p_offset: page * PAGE_SIZE,
          p_filter: buildRpcFilter(appliedFilters),
        });
        if (!alive) return;
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof RpcError ? err.message : 'Failed to load audit log'
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleApply = () => setAppliedFilters(draftFilters);
  const handleReset = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      // Pull up to CSV_MAX_ROWS in pages of PAGE_SIZE. Server already rate-
      // limits admin_audit_list (60/min); if we hit it we surface the error
      // via the standard sanitized message.
      const collected: AuditRow[] = [];
      let offset = 0;
      while (collected.length < CSV_MAX_ROWS) {
        const remaining = CSV_MAX_ROWS - collected.length;
        const limit = Math.min(PAGE_SIZE, remaining);
        const data = await callRpc<AuditList>('admin_audit_list', {
          p_limit: limit,
          p_offset: offset,
          p_filter: buildRpcFilter(appliedFilters),
        });
        const batch = data.rows ?? [];
        if (batch.length === 0) break;
        collected.push(...batch);
        offset += batch.length;
        if (batch.length < limit) break;
      }

      const header = [
        'id',
        'created_at',
        'action',
        'admin_id',
        'target_user_id',
        'result',
        'payload_summary',
      ];
      const lines = [header.join(',')];
      for (const r of collected) {
        lines.push(
          [
            csvEscape(r.id ?? ''),
            csvEscape(r.created_at ?? ''),
            csvEscape(r.action ?? ''),
            csvEscape(r.admin_id ?? ''),
            csvEscape(r.target_user_id ?? ''),
            csvEscape(r.result ?? ''),
            csvEscape(payloadSummary(r.payload)),
          ].join(',')
        );
      }

      const blob = new Blob([lines.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `audit-log-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'CSV exported',
        description: `${collected.length} row${collected.length === 1 ? '' : 's'}${
          collected.length === CSV_MAX_ROWS ? ' (capped at 10k)' : ''
        }`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Export failed',
        description:
          err instanceof RpcError ? err.message : 'Could not export CSV',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  }, [appliedFilters, toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Title>Audit Log</Title>
        <span className="text-xs text-navy-400">
          {loading ? 'Loading…' : `${total.toLocaleString('en-AU')} entries`}
        </span>
      </div>

      <FiltersPanel
        draft={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApply}
        onReset={handleReset}
        onExport={() => {
          void handleExportCsv();
        }}
        exporting={exporting}
      />

      <Card>
        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-navy-400">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-navy-400">
            No entries match the current filters.
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>When</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Admin</TableHeaderCell>
                  <TableHeaderCell>Target</TableHeaderCell>
                  <TableHeaderCell>Result</TableHeaderCell>
                  <TableHeaderCell>Payload</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, idx) => {
                  const id = r.id ?? `row-${idx}`;
                  const isOpen = expanded.has(id);
                  return (
                    <TableRow key={id}>
                      <TableCell className="whitespace-nowrap text-xs text-navy-500">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString('en-AU')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge color="indigo" size="xs">
                          {r.action ?? 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.admin_email_masked ??
                          (r.admin_id ? r.admin_id.slice(0, 8) : '—')}
                      </TableCell>
                      <TableCell>
                        {r.target_user_id ? (
                          <Link
                            to={`/users/${r.target_user_id}`}
                            className="font-mono text-xs text-brand-600 hover:underline"
                          >
                            {r.target_user_id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-xs text-navy-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge color={resultBadgeColor(r.result)} size="xs">
                          {r.result ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.payload && Object.keys(r.payload).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(id)}
                            className="text-left font-mono text-[11px] text-navy-500 hover:text-navy-700"
                          >
                            {isOpen ? (
                              <pre className="whitespace-pre-wrap break-all rounded bg-navy-50 p-2">
                                {JSON.stringify(r.payload, null, 2)}
                              </pre>
                            ) : (
                              <span className="line-clamp-1 max-w-xs truncate">
                                {payloadSummary(r.payload) || '{}'}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-navy-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-navy-400">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function FiltersPanel({
  draft,
  onChange,
  onApply,
  onReset,
  onExport,
  exporting,
}: {
  draft: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
  onReset: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const [open, setOpen] = useState(true);
  const datalistId = useMemo(
    () => `audit-actions-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm font-semibold text-navy-600 hover:text-navy-700"
        >
          Filters {open ? '▾' : '▸'}
        </button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={exporting}
            loading={exporting}
            onClick={onExport}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-navy-500">
              Action
            </label>
            <TextInput
              placeholder="admin_grant_promo"
              value={draft.action}
              onChange={(e) =>
                onChange({ ...draft, action: e.target.value })
              }
              list={datalistId}
            />
            <datalist id={datalistId}>
              {KNOWN_ACTIONS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy-500">
              Admin ID
            </label>
            <TextInput
              placeholder="uuid"
              value={draft.adminId}
              onChange={(e) =>
                onChange({ ...draft, adminId: e.target.value })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy-500">
              Target user ID
            </label>
            <TextInput
              placeholder="uuid"
              value={draft.targetUserId}
              onChange={(e) =>
                onChange({ ...draft, targetUserId: e.target.value })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy-500">
              Since
            </label>
            <input
              type="date"
              value={draft.since}
              onChange={(e) =>
                onChange({ ...draft, since: e.target.value })
              }
              className="block w-full rounded-md border border-navy-100 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy-500">
              Until
            </label>
            <input
              type="date"
              value={draft.until}
              onChange={(e) =>
                onChange({ ...draft, until: e.target.value })
              }
              className="block w-full rounded-md border border-navy-100 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="primary" onClick={onApply}>
              Apply
            </Button>
            <Button variant="secondary" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
