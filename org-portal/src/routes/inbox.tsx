// Inbox page — invoices delivered to the org by members via the app's
// "Send directly to org" flow. Listing + filter + detail drawer.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatMoney } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';
import { useSeqGuard } from '@/lib/use-seq-guard';
import type { InboxRow, InboxStatus } from '@/lib/types';

const PAGE_SIZE = 50;
const STATUS_FILTERS: Array<{ value: '' | InboxStatus; label: string }> = [
  { value: '',        label: 'All' },
  { value: 'sent',    label: 'Delivered' },
  { value: 'queued',  label: 'Queued' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'failed',  label: 'Failed' },
];

function statusTone(s: InboxStatus): 'positive' | 'warning' | 'danger' | 'neutral' {
  switch (s) {
    case 'sent':    return 'positive';
    case 'queued':  return 'neutral';
    case 'bounced': return 'warning';
    case 'failed':  return 'danger';
  }
}

function statusLabel(s: InboxStatus): string {
  return s === 'sent' ? 'Delivered'
       : s === 'queued' ? 'Queued'
       : s === 'bounced' ? 'Bounced'
       : 'Failed';
}

export function InboxPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [rows, setRows] = useState<InboxRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<'' | InboxStatus>('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const seq = useSeqGuard();

  const searchDebounceRef = useRef<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => { if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current); };
  }, [search]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const token = seq.start();
    // Inbox date inputs are typed as YYYY-MM-DD; new Date(s).toISOString()
    // treats them as UTC midnight which loses ~10h for AU admins. Append
    // local-time markers so the range covers the user's actual day.
    const isoFrom = dateFrom ? new Date(dateFrom + 'T00:00:00').toISOString() : null;
    const isoTo   = dateTo   ? new Date(dateTo   + 'T23:59:59.999').toISOString() : null;
    const { data, error } = await supabase.rpc('org_inbox_list', {
      p_org_id:    orgId,
      p_status:    status || null,
      p_date_from: isoFrom,
      p_date_to:   isoTo,
      p_search:    debouncedSearch || null,
      p_limit:     PAGE_SIZE,
      p_offset:    page * PAGE_SIZE,
    });
    if (!seq.isCurrent(token)) return; // newer call superseded us — abort writes
    if (error) {
      // PGRST202 / 42883 / 404 = RPC not found = migration 20260602100000
      // hasn't been applied to this Supabase project. Don't spam toast.
      const code = (error as { code?: string }).code;
      const isMissingRpc = code === 'PGRST202' || code === '42883'
        || (error.message ?? '').includes('Could not find the function');
      if (isMissingRpc) {
        setMigrationMissing(true);
      } else {
        notify(friendlyError(error), 'error');
      }
      setRows([]);
      setTotalRows(0);
    } else {
      setMigrationMissing(false);
      const list = (data ?? []) as InboxRow[];
      setRows(list);
      const first = list[0];
      setTotalRows(first ? Number(first.total_rows ?? 0) : 0);
    }
    setLoading(false);
  }, [orgId, status, debouncedSearch, dateFrom, dateTo, page, notify, seq]);

  useEffect(() => { void load(); }, [load]);

  // Reset to page 0 when filters change so the user doesn't end up on an
  // empty later page.
  useEffect(() => { setPage(0); }, [status, debouncedSearch, dateFrom, dateTo]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  function exportCsv() {
    const csv = toCsv(
      ['Sent at', 'Invoice #', 'Sender', 'Email', 'Total', 'Status', 'Delivered to', 'CC sender'],
      rows.map((r) => [
        r.created_at,
        r.invoice_number,
        r.sender_name ?? '',
        r.sender_email,
        String(r.invoice_total),
        statusLabel(r.status),
        r.delivered_to,
        r.cc_sender ? 'yes' : 'no',
      ]),
    );
    downloadCsv(`ozly-inbox-${timestampSuffix()}.csv`, csv);
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const showingFrom = totalRows === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo   = Math.min(totalRows, (page + 1) * PAGE_SIZE);

  if (!currentOrg) return null;

  const noBillingEmail = !currentOrg.billing_email;

  return (
    <>
      <PageHeader
        kicker="Operations"
        title="Inbox"
        subtitle="Invoices sent directly to this organisation by members"
        action={rows.length > 0 ? (
          <button
            onClick={exportCsv}
            className="rounded-md bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-100"
          >
            Export CSV
          </button>
        ) : undefined}
      />

      {migrationMissing && (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
          <strong className="font-semibold">Inbox not enabled yet.</strong>{' '}
          Apply Supabase migration <code className="rounded bg-blue-100 px-1">20260602100000_org_inbox.sql</code>{' '}
          to enable receiving direct-sent invoices. Until then this page stays empty.
        </div>
      )}

      {!migrationMissing && noBillingEmail && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">No billing email configured yet.</strong>{' '}
          Members can't send invoices directly until you set an inbox email.{' '}
          <a className="font-semibold underline" href="/settings#billing-email">Set it now →</a>
        </div>
      )}

      {/* Filters */}
      <section className="ozly-card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="block text-[11px] font-medium text-navy-600">
            Search
            <input
              type="search"
              placeholder="Invoice # or sender email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-navy-600">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | InboxStatus)}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-navy-600">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-navy-600">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>
        {(status || search || dateFrom || dateTo) && (
          <button
            onClick={() => { setStatus(''); setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="rounded-md px-3 py-2 text-xs font-medium text-navy-500 hover:bg-navy-50"
          >
            Clear
          </button>
        )}
      </section>

      {/* Table */}
      <section className="ozly-card overflow-hidden p-0">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No invoices delivered yet"
            description="When a member emits an invoice and selects 'Send directly to org', it'll appear here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-navy-100 bg-navy-50/40 text-[11px] uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Invoice #</th>
                    <th className="px-4 py-2.5 font-medium">From</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`cursor-pointer border-b border-navy-50 hover:bg-brand-50/30 ${selectedId === r.id ? 'bg-brand-50/40' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-navy-500">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-2.5 font-medium text-navy-700">{r.invoice_number}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm text-navy-700">{r.sender_name || r.sender_email}</div>
                        {r.sender_name && r.sender_name !== r.sender_email && (
                          <div className="text-[11px] text-navy-400">{r.sender_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-navy-700">{formatMoney(r.invoice_total)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={statusTone(r.status)} label={statusLabel(r.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-navy-100 bg-navy-50/30 px-4 py-2.5 text-xs text-navy-500">
              <div>
                Showing {showingFrom}–{showingTo} of {totalRows}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="rounded-md px-2 py-1 hover:bg-navy-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages || loading}
                  className="rounded-md px-2 py-1 hover:bg-navy-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selected && (
        <InboxDetailDrawer row={selected} onClose={() => setSelectedId(null)} onRefresh={() => void load()} />
      )}
    </>
  );
}

interface DrawerProps {
  row: InboxRow;
  onClose: () => void;
  onRefresh: () => void;
}

function InboxDetailDrawer({ row, onClose }: DrawerProps) {
  // Re-deliver is intentionally NOT exposed here in V0 — Resend has its own
  // retry semantics for transient failures, and a permanent bounce signals
  // the org needs to fix billing_email. We log only.
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-navy-900/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-navy-100 px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-navy-400">Invoice</div>
            <div className="font-display text-lg font-bold text-navy-800">{row.invoice_number}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-navy-500 hover:bg-navy-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-5 py-4">
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="col-span-1 text-xs text-navy-400">Sent</dt>
            <dd className="col-span-2 text-navy-700">{formatDate(row.created_at)}</dd>

            <dt className="col-span-1 text-xs text-navy-400">From</dt>
            <dd className="col-span-2 text-navy-700">
              {row.sender_name && <div>{row.sender_name}</div>}
              <a className="text-xs text-brand-600 hover:underline" href={`mailto:${row.sender_email}`}>{row.sender_email}</a>
            </dd>

            <dt className="col-span-1 text-xs text-navy-400">Delivered to</dt>
            <dd className="col-span-2 text-navy-700 break-all">{row.delivered_to}</dd>

            <dt className="col-span-1 text-xs text-navy-400">CC sender</dt>
            <dd className="col-span-2 text-navy-700">{row.cc_sender ? 'Yes' : 'No'}</dd>

            <dt className="col-span-1 text-xs text-navy-400">Issued</dt>
            <dd className="col-span-2 text-navy-700">{formatDate(row.invoice_issue)}</dd>

            <dt className="col-span-1 text-xs text-navy-400">Total</dt>
            <dd className="col-span-2 font-semibold text-navy-800">{formatMoney(row.invoice_total)}</dd>

            <dt className="col-span-1 text-xs text-navy-400">Status</dt>
            <dd className="col-span-2">
              <StatusBadge tone={statusTone(row.status)} label={statusLabel(row.status)} />
              {row.status_detail && (
                <div className="mt-1 text-[11px] text-navy-400">{row.status_detail}</div>
              )}
            </dd>

            {row.sent_at && (
              <>
                <dt className="col-span-1 text-xs text-navy-400">Delivered at</dt>
                <dd className="col-span-2 text-navy-700">{formatDate(row.sent_at)}</dd>
              </>
            )}
          </dl>

          <div className="mt-6 rounded-lg bg-navy-50 p-3 text-[11px] leading-relaxed text-navy-500">
            The full invoice was sent as HTML email to{' '}
            <span className="break-all text-navy-700">{row.delivered_to}</span>. You can also reply
            directly to that email to reach the sender.
          </div>
        </div>

        <div className="border-t border-navy-100 px-5 py-3">
          <a
            href={`/invoices?invoice=${row.invoice_id}`}
            className="block rounded-md bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-500"
          >
            View in Invoices
          </a>
        </div>
      </aside>
    </div>
  );
}
