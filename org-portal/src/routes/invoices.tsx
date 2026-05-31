import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { Link, useSearchParams } from 'react-router-dom';
import { Spinner } from '@/components/Spinner';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { FileTextIcon } from '@/components/Icons';
import { InvoiceStatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { KpiCard, type KpiTone } from '@/components/KpiCard';
import { formatMoney, formatDate, formatPeriod } from '@/lib/format';
import { logOrgEvent } from '@/lib/telemetry';
import { fetchPayState, isUnpaid } from '@/lib/payments';
import { recentPeriods, relativeLabel } from '@/lib/period';
import type { BillingConfig, Period } from '@/lib/period';
import type { InvoiceRow, PayState } from '@/lib/types';
import { friendlyError } from '@/lib/errors';
import { ColumnFilter, DateColumnFilter, type DateRange, type Option, type SortDir } from '@/components/ColumnFilter';
import { GettingStarted } from '@/components/GettingStarted';
import { toCsv, downloadCsv, timestampSuffix, toXeroBillsCsv, type XeroBillRow } from '@/lib/csv';
import { generateAbaFile, downloadAbaFile, type AbaPaymentRow } from '@/lib/aba';
import { openInvoiceReceipt } from '@/lib/invoice-receipt';
import { listPresets, savePreset, deletePreset, type Preset } from '@/lib/filter-presets';

const INVOICE_SELECT =
  'id, invoice_number, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, notes, sent_at, paid_at, payment_confirmed_at, user_id, org_visible_id, issuer:profiles!invoices_user_id_fkey(full_name,email)';

const PAGE_SIZES = [10, 20, 50, 100];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dayAfter = (d: string) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toISOString().slice(0, 10);
};

// Column key → distinct-values field (RPC) + the DB column it sorts/filters on.
const COLS = {
  sub: { field: 'sub', sort: 'user_id' },
  invoice_number: { field: 'invoice_number', sort: 'invoice_number' },
  issue_date: { field: 'issue_date', sort: 'issue_date' },
  total: { field: 'total', sort: 'total' },
  status: { field: 'status', sort: 'status' },
  due_date: { field: 'due_date', sort: 'due_date' },
} as const;
type ColKey = keyof typeof COLS;
type SetCol = 'sub' | 'invoice_number' | 'total' | 'status'; // checklist columns (dates use ranges)

// Each KPI card maps to a status bucket; clicking it filters the list to match.
const KPI_SIGS = {
  outstanding: { statuses: ['sent', 'overdue'], awaiting: false },
  overdue: { statuses: ['overdue'], awaiting: false },
  paid: { statuses: ['paid'], awaiting: false },
  awaiting: { statuses: ['paid'], awaiting: true },
} as const;
type KpiKey = keyof typeof KPI_SIGS;
const sameSet = (s: Set<string>, arr: readonly string[]) => s.size === arr.length && arr.every((a) => s.has(a));

interface LineItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

function issuerName(r: InvoiceRow): string {
  return r.issuer?.full_name?.trim() || r.issuer?.email || '—';
}

interface Kpis {
  outstanding: number;
  overdue: number;
  paid: number;
  awaiting: number;
}
function mapTotals(tot: unknown): Kpis {
  const arr = (tot ?? []) as { outstanding: number; overdue: number; paid: number; awaiting: number }[];
  const t = arr[0];
  return {
    outstanding: Number(t?.outstanding ?? 0),
    overdue: Number(t?.overdue ?? 0),
    paid: Number(t?.paid ?? 0),
    awaiting: Number(t?.awaiting ?? 0),
  };
}

export function InvoicesPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [kpis, setKpis] = useState<Kpis>({ outstanding: 0, overdue: 0, paid: 0, awaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [confirmingPay, setConfirmingPay] = useState<InvoiceRow | null>(null);
  const [detail, setDetail] = useState<InvoiceRow | null>(null);
  const [payState, setPayState] = useState<Record<string, PayState>>({});
  const [filters, setFilters] = useState<Record<SetCol, Set<string>>>({
    sub: new Set(),
    invoice_number: new Set(),
    total: new Set(),
    status: new Set(),
  });
  const [issueRange, setIssueRange] = useState<DateRange>({ from: '', to: '' });
  const [dueRange, setDueRange] = useState<DateRange>({ from: '', to: '' });
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'issue_date', dir: 'desc' });
  const [colOpts, setColOpts] = useState<Partial<Record<ColKey, Option[]>>>({});
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const [periodKey, setPeriodKey] = useState('all');
  const loggedView = useRef(false);
  const seq = useRef(0);

  const periodCfg = useMemo<BillingConfig>(
    () => ({ frequency: currentOrg?.period_frequency ?? 'fortnightly', anchor: currentOrg?.period_anchor ?? null }),
    [currentOrg?.period_frequency, currentOrg?.period_anchor],
  );
  const periodOptions = useMemo(() => recentPeriods(periodCfg, 8), [periodCfg]);
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const selectedPeriod: Period | null = useMemo(() => {
    if (periodKey === 'all') return null;
    if (periodKey === 'fy-current' || periodKey === 'fy-last') {
      // Australian fiscal year: 1 Jul → 30 Jun.
      const today = new Date();
      const fyStartYear = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
      const y = periodKey === 'fy-current' ? fyStartYear : fyStartYear - 1;
      const start = new Date(Date.UTC(y, 6, 1, 0, 0, 0));     // 1 Jul
      const end   = new Date(Date.UTC(y + 1, 6, 1, 0, 0, 0)); // 1 Jul next year (exclusive)
      return { key: periodKey, label: `FY${y}-${String(y + 1).slice(-2)}`, startMs: start.getTime(), endMs: end.getTime() };
    }
    if (periodKey === 'custom') {
      if (!customRange.from || !customRange.to) return null;
      const start = new Date(`${customRange.from}T00:00:00`).getTime();
      // endMs is exclusive (matches the `lt` semantic everywhere) → day-after of `to`.
      const endDay = new Date(`${customRange.to}T00:00:00`);
      endDay.setDate(endDay.getDate() + 1);
      return {
        key: 'custom',
        label: `${customRange.from} → ${customRange.to}`,
        startMs: start,
        endMs: endDay.getTime(),
      };
    }
    return periodOptions.find((p) => p.key === periodKey) ?? null;
  }, [periodKey, periodOptions, customRange]);
  const periodFrom = selectedPeriod ? new Date(selectedPeriod.startMs).toISOString().slice(0, 10) : null;
  const periodTo = selectedPeriod ? new Date(selectedPeriod.endMs).toISOString().slice(0, 10) : null;

  // Payment status — drives the "Needs ABN cover" greying.
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    void fetchPayState(orgId).then((m) => active && setPayState(m));
    return () => {
      active = false;
    };
  }, [orgId]);

  // Distinct values per column (the header dropdown options) — once per org.
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    (async () => {
      const keys = Object.keys(COLS) as ColKey[];
      const entries = await Promise.all(
        keys.map(async (k) => {
          const { data } = await supabase.rpc('org_distinct_values', {
            p_org_id: orgId,
            p_entity: 'invoices',
            p_field: COLS[k].field,
          });
          const opts = ((data ?? []) as { value: string; label: string }[]).map((d) => ({
            value: d.value,
            label: d.label,
          }));
          return [k, opts] as const;
        }),
      );
      if (active) setColOpts(Object.fromEntries(entries) as Record<ColKey, Option[]>);
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  // Hydrate the status filter from `?status=...` on first mount. Lets the
  // dashboard (and anywhere else) deep-link into a pre-filtered invoice view.
  // Strips the param after applying so a manual filter change doesn't fight
  // with the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const raw = searchParams.get('status');
    if (!raw) return;
    const valid = new Set(['draft', 'sent', 'overdue', 'paid']);
    const wanted = raw.split(',').map((s) => s.trim()).filter((s) => valid.has(s));
    if (wanted.length === 0) return;
    setFilters((prev) => ({ ...prev, status: new Set(wanted) }));
    // Remove the param so refresh doesn't re-apply on top of a user edit.
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshTotals() {
    if (!orgId) return;
    const { data } = await supabase.rpc('org_invoice_totals', { p_org_id: orgId, p_from: periodFrom, p_to: periodTo });
    setKpis(mapTotals(data));
  }

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: tot } = await supabase.rpc('org_invoice_totals', {
      p_org_id: orgId,
      p_from: periodFrom,
      p_to: periodTo,
    });
    setKpis(mapTotals(tot));

    const id = ++seq.current;
    let q = supabase.from('invoices').select(INVOICE_SELECT, { count: 'exact' }).eq('org_visible_id', orgId);
    if (periodFrom) q = q.gte('issue_date', periodFrom);
    if (periodTo) q = q.lt('issue_date', periodTo);
    if (filters.sub.size > 0) q = q.in('user_id', [...filters.sub]);
    if (filters.invoice_number.size > 0) q = q.in('invoice_number', [...filters.invoice_number]);
    if (filters.total.size > 0) q = q.in('total', [...filters.total].map(Number));
    if (filters.status.size > 0) q = q.in('status', [...filters.status]);
    if (issueRange.from) q = q.gte('issue_date', issueRange.from);
    if (issueRange.to) q = q.lt('issue_date', dayAfter(issueRange.to));
    if (dueRange.from) q = q.gte('due_date', dueRange.from);
    if (dueRange.to) q = q.lt('due_date', dayAfter(dueRange.to));
    if (awaitingOnly) q = q.is('payment_confirmed_at', null);
    const { data, count } = await q
      .order(sort.field, { ascending: sort.dir === 'asc' })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (id !== seq.current) return; // a newer request superseded this one
    setRows((data ?? []) as unknown as InvoiceRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [orgId, periodFrom, periodTo, filters, issueRange, dueRange, sort, awaitingOnly, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [periodKey, filters, issueRange, dueRange, sort, awaitingOnly, pageSize]);

  useEffect(() => {
    if (orgId && !loading && !loggedView.current) {
      loggedView.current = true;
      void logOrgEvent(orgId, 'org_invoice_viewed', { count: total });
    }
  }, [orgId, loading, total]);

  // Pin `load` in a ref so the realtime effect depends only on `orgId`.
  // Without this, every filter/sort/page change torn down + re-created the
  // channel — slow, race-prone, and could miss events during the reconnect
  // window. With the ref, the channel lives for the lifetime of the org
  // selection and just invokes the latest `load`.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (!orgId) return;
    // Debounce reload bursts (e.g. a bulk mark-paid fires N postgres_changes
    // events in rapid succession; we only need one reload).
    let pending: number | null = null;
    const scheduleReload = () => {
      if (bulkBusyRef.current) return; // skip — our own bulk is in flight
      if (pending !== null) window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        pending = null;
        void loadRef.current();
      }, 350);
    };
    const channel = supabase
      .channel(`org-invoices-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `org_visible_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && !bulkBusyRef.current) {
            notify('New invoice received', 'info');
          }
          scheduleReload();
        },
      )
      .subscribe();
    return () => {
      if (pending !== null) window.clearTimeout(pending);
      void supabase.removeChannel(channel);
    };
  }, [orgId, notify]);

  function patchInvoice(id: string, patch: Partial<InvoiceRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d));
  }

  async function markPaid(id: string) {
    setMarking(id);
    const { error } = await supabase.rpc('org_mark_invoice_paid', { p_invoice_id: id });
    if (error) notify(friendlyError(error), 'error');
    else {
      notify('Marked as paid', 'success');
      patchInvoice(id, { status: 'paid', paid_at: new Date().toISOString() });
      void refreshTotals();
    }
    setMarking(null);
  }

  async function unmarkPaid(id: string) {
    setMarking(id);
    const { error } = await supabase.rpc('org_unmark_invoice_paid', { p_invoice_id: id });
    if (error) notify(friendlyError(error), 'error');
    else {
      notify('Marked as unpaid', 'success');
      const today = new Date().toISOString().slice(0, 10);
      const row = rows.find((r) => r.id === id);
      patchInvoice(id, { status: row && row.due_date < today ? 'overdue' : 'sent', paid_at: null });
      void refreshTotals();
    }
    setMarking(null);
  }

  const setColFilter = (k: SetCol) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [k]: next }));
  const onSort = (k: ColKey) => (dir: 'asc' | 'desc') => setSort({ field: COLS[k].sort, dir });
  const sortDirFor = (k: ColKey): SortDir => (sort.field === COLS[k].sort ? sort.dir : null);
  const columnFiltersActive =
    awaitingOnly ||
    (Object.keys(filters) as SetCol[]).some((k) => filters[k].size > 0) ||
    !!issueRange.from ||
    !!issueRange.to ||
    !!dueRange.from ||
    !!dueRange.to;

  // Clicking a KPI card filters the list by that bucket (and reflects in the Status column).
  const kpiActive = (k: KpiKey) =>
    awaitingOnly === KPI_SIGS[k].awaiting && sameSet(filters.status, KPI_SIGS[k].statuses);
  function toggleKpi(k: KpiKey) {
    const sig = KPI_SIGS[k];
    if (kpiActive(k)) {
      setFilters((prev) => ({ ...prev, status: new Set() }));
      setAwaitingOnly(false);
    } else {
      setFilters((prev) => ({ ...prev, status: new Set<string>(sig.statuses) }));
      setAwaitingOnly(sig.awaiting);
    }
  }

  function clearFilters() {
    setFilters({ sub: new Set(), invoice_number: new Set(), total: new Set(), status: new Set() });
    setIssueRange({ from: '', to: '' });
    setDueRange({ from: '', to: '' });
    setAwaitingOnly(false);
  }

  const [exporting, setExporting] = useState(false);
  async function exportXero() {
    if (!orgId) return;
    setExporting(true);
    try {
      // Same filter pipeline as exportCsv — for FY-tax-time the user picks
      // "This fiscal year (AU)" in the period selector, then clicks this.
      let q = supabase.from('invoices').select(INVOICE_SELECT).eq('org_visible_id', orgId);
      if (periodFrom) q = q.gte('issue_date', periodFrom);
      if (periodTo) q = q.lt('issue_date', periodTo);
      if (filters.sub.size > 0) q = q.in('user_id', [...filters.sub]);
      if (filters.invoice_number.size > 0) q = q.in('invoice_number', [...filters.invoice_number]);
      if (filters.total.size > 0) q = q.in('total', [...filters.total].map(Number));
      if (filters.status.size > 0) q = q.in('status', [...filters.status]);
      if (issueRange.from) q = q.gte('issue_date', issueRange.from);
      if (issueRange.to) q = q.lt('issue_date', dayAfter(issueRange.to));
      if (dueRange.from) q = q.gte('due_date', dueRange.from);
      if (dueRange.to) q = q.lt('due_date', dayAfter(dueRange.to));
      if (awaitingOnly) q = q.is('payment_confirmed_at', null);
      const { data } = await q.order('issue_date', { ascending: false }).limit(10_000);
      const inv = (data ?? []) as unknown as InvoiceRow[];
      const xeroRows: XeroBillRow[] = inv.map((r) => ({
        contactName: (r.issuer?.full_name?.trim() || r.issuer?.email || 'Sub-contractor'),
        email: r.issuer?.email ?? null,
        invoiceNumber: r.invoice_number ?? r.id,
        invoiceDate: r.issue_date,
        dueDate: r.due_date ?? r.issue_date,
        description: `Sub-contractor services — invoice ${r.invoice_number ?? ''}`.trim(),
        unitAmount: r.subtotal > 0 ? r.subtotal : Number(r.total),
        hasGst: r.tax_amount > 0,
      }));
      const csv = toXeroBillsCsv(xeroRows);
      const fn = `ozly-xero-bills-${timestampSuffix()}.csv`;
      downloadCsv(fn, csv);
      notify(
        inv.length >= 10_000
          ? 'Export capped at 10,000 rows. Refine filters for a narrower export.'
          : `Exported ${inv.length} bills in Xero format — import in Bills to pay → Import.`,
        inv.length >= 10_000 ? 'info' : 'success',
      );
    } catch (e) {
      notify(friendlyError(e, 'Could not export — try again.'), 'error');
    } finally {
      setExporting(false);
    }
  }

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Mirror to a ref so the realtime channel callback (subscribed once per
  // orgId) can ignore events that fire DURING our own bulk mark-paid sweep,
  // avoiding a thundering-herd of reloads.
  const bulkBusyRef = useRef(false);
  useEffect(() => { bulkBusyRef.current = bulkBusy; }, [bulkBusy]);

  // Saved views — localStorage-backed presets of (period + filters + sort).
  interface InvoicePreset {
    periodKey: string;
    customRange: { from: string; to: string };
    filters: Record<string, string[]>;
    issueRange: { from: string; to: string };
    dueRange: { from: string; to: string };
    awaitingOnly: boolean;
    sort: { field: string; dir: 'asc' | 'desc' };
  }
  const [presets, setPresets] = useState<Preset<InvoicePreset>[]>(() => listPresets('invoices'));
  function captureCurrentView(): InvoicePreset {
    return {
      periodKey,
      customRange,
      filters: Object.fromEntries(
        (Object.keys(filters) as SetCol[]).map((k) => [k, [...filters[k]]]),
      ),
      issueRange,
      dueRange,
      awaitingOnly,
      sort,
    };
  }
  function applyPreset(p: InvoicePreset) {
    setPeriodKey(p.periodKey);
    setCustomRange(p.customRange);
    setFilters({
      sub: new Set(p.filters.sub ?? []),
      invoice_number: new Set(p.filters.invoice_number ?? []),
      total: new Set(p.filters.total ?? []),
      status: new Set(p.filters.status ?? []),
    });
    setIssueRange(p.issueRange);
    setDueRange(p.dueRange);
    setAwaitingOnly(p.awaitingOnly);
    setSort(p.sort);
  }
  function onSavePreset() {
    const name = window.prompt('Save this view as…');
    if (!name || !name.trim()) return;
    savePreset('invoices', name, captureCurrentView());
    setPresets(listPresets('invoices'));
  }
  function onDeletePreset(id: string) {
    setPresets(deletePreset('invoices', id));
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  /**
   * Build an ABA bank-batch file from the selected (unpaid) invoices.
   * The bank account info comes from each sub's `user_businesses` row.
   * If a sub is missing BSB or account, we skip them and notify which.
   */
  async function bulkExportAba(): Promise<void> {
    if (!orgId || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const selected = rows.filter((r) => selectedIds.has(r.id) && r.status !== 'paid');
      if (selected.length === 0) {
        notify('Pick at least one unpaid invoice.', 'info');
        return;
      }

      // Fetch each sub's business banking once. We could batch this in a
      // single .in() query — doing that for performance.
      const userIds = [...new Set(selected.map((r) => r.user_id))];
      const { data: businesses } = await supabase
        .from('user_businesses')
        .select('user_id, bsb, account_number, company_name')
        .in('user_id', userIds);
      const bankByUser = new Map<string, { bsb: string; account_number: string; company_name: string }>();
      ((businesses ?? []) as { user_id: string; bsb: string; account_number: string; company_name: string }[]).forEach((b) => {
        bankByUser.set(b.user_id, b);
      });

      // Build rows + collect missing.
      const skipped: string[] = [];
      const payments: AbaPaymentRow[] = [];
      for (const inv of selected) {
        const bank = bankByUser.get(inv.user_id);
        const issuerName = inv.issuer?.full_name?.trim() || inv.issuer?.email || 'Sub-contractor';
        if (!bank || !bank.bsb || !bank.account_number) {
          skipped.push(issuerName);
          continue;
        }
        payments.push({
          bsb: bank.bsb,
          accountNumber: bank.account_number,
          accountName: (bank.company_name?.trim() || issuerName),
          amountAud: Number(inv.total ?? 0),
          lodgementReference: (inv.invoice_number ?? inv.id.slice(0, 8)).slice(0, 18),
        });
      }

      if (payments.length === 0) {
        notify('None of the selected subs have BSB + account on file.', 'error');
        return;
      }

      const orgAbn = currentOrg?.abn?.replace(/\D/g, '').slice(0, 12) ?? '';
      const content = generateAbaFile(
        {
          // Sender details — placeholder. Org should fill these in Settings →
          // Bank details, then we'd read from there. For now we leave blank
          // and let the banking app fill on import.
          senderBsb: '000000',
          senderAccount: '000000000',
          senderName: (currentOrg?.name ?? 'Org').slice(0, 26),
          bankCode: 'ANZ',
          description: 'OZLYPAY',
          processingDate: new Date().toISOString().slice(0, 10),
        },
        payments,
      );
      const fn = `ozly-aba-${orgAbn || 'pay'}-${timestampSuffix()}.aba`;
      downloadAbaFile(fn, content);

      const totalCents = payments.reduce((s, p) => s + Math.round(p.amountAud * 100), 0);
      const totalAud = (totalCents / 100).toFixed(2);
      const skipMsg = skipped.length > 0 ? ` · Skipped ${skipped.length} (no BSB on file): ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''}` : '';
      notify(`ABA file ready — ${payments.length} payment${payments.length === 1 ? '' : 's'}, $${totalAud}.${skipMsg}`, payments.length > 0 && skipped.length > 0 ? 'info' : 'success');
    } catch (e) {
      notify(friendlyError(e, 'Could not generate ABA file.'), 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkMarkPaid() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      // Fire in parallel — `org_mark_invoice_paid` is idempotent and gated by
      // is_org_admin server-side, so worst case a non-payable row 4xx's and
      // the others still go through.
      const ids = [...selectedIds];
      const results = await Promise.allSettled(
        ids.map((id) => supabase.rpc('org_mark_invoice_paid', { p_invoice_id: id })),
      );
      // Build the set of FAILED ids so the optimistic patch only marks
      // genuinely-succeeded rows. Without this, the UI lies — "marked as paid"
      // for rows that the server rejected, until the next full reload.
      const failedIds = new Set<string>();
      results.forEach((r, i) => {
        const id = ids[i]!;
        if (r.status === 'rejected') failedIds.add(id);
        else if (r.status === 'fulfilled' && r.value.error) failedIds.add(id);
      });
      const ok = ids.length - failedIds.size;
      const nowIso = new Date().toISOString();
      setRows((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id) && !failedIds.has(r.id)
            ? { ...r, status: 'paid', paid_at: nowIso }
            : r,
        ),
      );
      void refreshTotals();
      clearSelection();
      if (failedIds.size === 0) {
        notify(`Marked ${ok} invoice${ok === 1 ? '' : 's'} as paid.`, 'success');
      } else if (ok === 0) {
        notify(`All ${failedIds.size} mark-paid attempts failed.`, 'error');
      } else {
        notify(`Marked ${ok} as paid · ${failedIds.size} failed.`, 'info');
      }
    } catch (e) {
      notify(friendlyError(e, 'Bulk mark-paid failed.'), 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  async function exportCsv() {
    if (!orgId) return;
    setExporting(true);
    try {
      // Re-apply every active filter EXCEPT pagination — fetch up to 10k
      // matching rows in one go. Anything bigger and the customer needs to
      // narrow filters first; we surface that as a banner if hit.
      let q = supabase.from('invoices').select(INVOICE_SELECT).eq('org_visible_id', orgId);
      if (periodFrom) q = q.gte('issue_date', periodFrom);
      if (periodTo) q = q.lt('issue_date', periodTo);
      if (filters.sub.size > 0) q = q.in('user_id', [...filters.sub]);
      if (filters.invoice_number.size > 0) q = q.in('invoice_number', [...filters.invoice_number]);
      if (filters.total.size > 0) q = q.in('total', [...filters.total].map(Number));
      if (filters.status.size > 0) q = q.in('status', [...filters.status]);
      if (issueRange.from) q = q.gte('issue_date', issueRange.from);
      if (issueRange.to) q = q.lt('issue_date', dayAfter(issueRange.to));
      if (dueRange.from) q = q.gte('due_date', dueRange.from);
      if (dueRange.to) q = q.lt('due_date', dayAfter(dueRange.to));
      if (awaitingOnly) q = q.is('payment_confirmed_at', null);
      const { data } = await q.order('issue_date', { ascending: false }).limit(10_000);
      const rows = (data ?? []) as unknown as InvoiceRow[];

      const headers = [
        'Invoice #', 'Issue date', 'Due date', 'Status',
        'Sub-contractor', 'Email',
        'Subtotal', 'Tax', 'Total',
        'Paid at', 'Member confirmed at',
      ];
      const csvRows = rows.map((r) => [
        r.invoice_number ?? '',
        r.issue_date,
        r.due_date ?? '',
        r.status,
        r.issuer?.full_name?.trim() ?? '',
        r.issuer?.email ?? '',
        r.subtotal,
        r.tax_amount,
        r.total,
        r.paid_at ?? '',
        r.payment_confirmed_at ?? '',
      ]);
      const csv = toCsv(headers, csvRows);
      const fn = `ozly-invoices-${timestampSuffix()}.csv`;
      downloadCsv(fn, csv);
      if (rows.length >= 10_000) {
        notify('Export capped at 10,000 rows. Refine filters for a narrower export.', 'info');
      } else {
        notify(`Exported ${rows.length} invoices to ${fn}`, 'success');
      }
    } catch (e) {
      notify(friendlyError(e, 'Could not export — try again.'), 'error');
    } finally {
      setExporting(false);
    }
  }

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  const renderAction = (r: InvoiceRow) =>
    r.status === 'paid' ? (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-navy-300">Paid {formatDate(r.paid_at)}</span>
          <button
            onClick={() => void unmarkPaid(r.id)}
            disabled={marking === r.id}
            className="rounded-md px-2 py-1 text-xs font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-50"
          >
            {marking === r.id ? '…' : 'Undo'}
          </button>
        </div>
        {r.payment_confirmed_at ? (
          <span className="text-[11px] text-brand-600">✓ confirmed by member</span>
        ) : (
          <span className="text-[11px] text-amber-600">awaiting member confirmation</span>
        )}
      </div>
    ) : (
      <button
        onClick={() => setConfirmingPay(r)}
        disabled={marking === r.id}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
      >
        {marking === r.id ? 'Marking…' : 'Mark as paid'}
      </button>
    );

  const filtersActive = columnFiltersActive || periodKey !== 'all';

  return (
    <div>
      <PageHeader
        kicker="Operations"
        title="Invoices"
        subtitle={`What your sub-contractors have billed ${currentOrg?.name ?? ''} — click a row to see the work`}
      />

      {orgId && <GettingStarted orgId={orgId} />}

      {/* Reporting period — scopes the totals + list. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-navy-300">Period</span>
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All time</option>
          {periodOptions.map((p, i) => (
            <option key={p.key} value={p.key}>
              {relativeLabel(p, periodCfg, i)}
            </option>
          ))}
          <option value="fy-current">This fiscal year (AU)</option>
          <option value="fy-last">Last fiscal year (AU)</option>
          <option value="custom">Custom range…</option>
        </select>
        {periodKey === 'custom' && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customRange.from}
              onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            />
            <span className="text-xs text-navy-400">→</span>
            <input
              type="date"
              value={customRange.to}
              onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            />
          </div>
        )}
        <span className="text-xs text-navy-400">totals reflect this period · filter any column from its header ▾</span>
        <div className="ml-auto flex items-center gap-2">
          {columnFiltersActive && (
            <button
              onClick={clearFilters}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50"
            >
              Clear filters
            </button>
          )}
          <select
            onChange={(e) => {
              const id = e.target.value;
              if (id === '__save__') { onSavePreset(); }
              else if (id.startsWith('__del__:')) { onDeletePreset(id.slice('__del__:'.length)); }
              else if (id) {
                const p = presets.find((x) => x.id === id);
                if (p) applyPreset(p.state);
              }
              e.target.value = '';
            }}
            value=""
            className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-700 focus:border-brand-500 focus:outline-none"
            title="Saved views"
          >
            <option value="">Views ▾</option>
            <option value="__save__">＋ Save current view…</option>
            {presets.length > 0 && (
              <optgroup label="Apply">
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
            {presets.length > 0 && (
              <optgroup label="Delete">
                {presets.map((p) => <option key={`d-${p.id}`} value={`__del__:${p.id}`}>Delete: {p.name}</option>)}
              </optgroup>
            )}
          </select>
          <button
            onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              selectMode ? 'bg-brand-600 text-white hover:bg-brand-500' : 'text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50'
            }`}
          >
            {selectMode ? 'Done' : 'Select'}
          </button>
          <button
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={() => void exportXero()}
            disabled={exporting}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-50"
            title="CSV in Xero's Bills import format"
          >
            Export for Xero
          </button>
        </div>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-2">
          <span className="text-sm font-medium text-brand-700">
            {selectedIds.size} invoice{selectedIds.size === 1 ? '' : 's'} selected
            {' · '}
            <span className="text-brand-600">
              {formatMoney(
                rows
                  .filter((r) => selectedIds.has(r.id) && r.status !== 'paid')
                  .reduce((sum, r) => sum + Number(r.total ?? 0), 0),
              )} payable
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void bulkExportAba()}
              disabled={bulkBusy}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-50"
              title="Generate an ABA bank-batch file to upload in your internet banking"
            >
              💸 Generate ABA file
            </button>
            <button
              onClick={() => void bulkMarkPaid()}
              disabled={bulkBusy}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              {bulkBusy ? 'Marking…' : `Mark ${selectedIds.size} as paid`}
            </button>
            <button
              onClick={clearSelection}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-500 hover:bg-navy-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ['outstanding', 'Outstanding',           formatMoney(kpis.outstanding), 'navy'  as KpiTone],
          ['overdue',     'Overdue',               formatMoney(kpis.overdue),     'rose'  as KpiTone],
          ['paid',        'Paid',                  formatMoney(kpis.paid),        'brand' as KpiTone],
          ['awaiting',    'Awaiting confirmation', String(kpis.awaiting),         'lime'  as KpiTone],
        ] as [KpiKey, string, string, KpiTone][]).map(([key, label, value, tone]) => {
          const valueColor = key === 'overdue' && kpis.overdue > 0 ? '#e11d48' : undefined;
          return (
            <KpiCard
              key={key}
              tone={tone}
              label={label}
              value={value}
              {...(valueColor ? { valueColor } : {})}
              onClick={() => toggleKpi(key)}
              active={kpiActive(key)}
            />
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : total === 0 ? (
        filtersActive ? (
          <EmptyState title="No invoices match your filters" />
        ) : (
          <EmptyState
            icon={<FileTextIcon />}
            title="No invoices yet"
            description="Invite your sub-contractors — the invoices they send you show up here automatically."
            action={
              <Link
                to="/members"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
              >
                Invite a sub-contractor
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="ozly-card overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-navy-50 text-left text-xs">
                  <th className="px-4 py-3">
                    <ColumnFilter
                      label="Sub-contractor"
                      options={colOpts.sub}
                      selected={filters.sub}
                      onChange={setColFilter('sub')}
                      sortDir={sortDirFor('sub')}
                      onSort={onSort('sub')}
                      searchPlaceholder="Search members…"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <ColumnFilter
                      label="Invoice #"
                      options={colOpts.invoice_number}
                      selected={filters.invoice_number}
                      onChange={setColFilter('invoice_number')}
                      sortDir={sortDirFor('invoice_number')}
                      onSort={onSort('invoice_number')}
                      searchPlaceholder="e.g. INV-3001"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <DateColumnFilter
                      label="Period"
                      dates={colOpts.issue_date?.map((o) => o.value)}
                      range={issueRange}
                      onChange={setIssueRange}
                      sortDir={sortDirFor('issue_date')}
                      onSort={onSort('issue_date')}
                    />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <ColumnFilter
                      label="Amount"
                      align="right"
                      options={colOpts.total}
                      selected={filters.total}
                      onChange={setColFilter('total')}
                      sortDir={sortDirFor('total')}
                      onSort={onSort('total')}
                      numericSort
                      formatLabel={(v) => formatMoney(Number(v))}
                      searchPlaceholder="Search amounts…"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <ColumnFilter
                      label="Status"
                      options={colOpts.status}
                      selected={filters.status}
                      onChange={setColFilter('status')}
                      sortDir={sortDirFor('status')}
                      onSort={onSort('status')}
                      formatLabel={cap}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <DateColumnFilter
                      label="Due"
                      dates={colOpts.due_date?.map((o) => o.value)}
                      range={dueRange}
                      onChange={setDueRange}
                      sortDir={sortDirFor('due_date')}
                      onSort={onSort('due_date')}
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-navy-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => selectMode ? toggleSelected(r.id) : setDetail(r)}
                    className={`cursor-pointer border-b border-navy-50 last:border-0 hover:bg-navy-50/40 ${
                      isUnpaid(payState, r.user_id) ? 'opacity-50' : ''
                    } ${selectMode && selectedIds.has(r.id) ? 'bg-brand-50/60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelected(r.id)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={r.status === 'paid'}
                            className="h-3.5 w-3.5 rounded border-navy-200 text-brand-600 focus:ring-brand-200"
                            title={r.status === 'paid' ? 'Already paid' : 'Select'}
                          />
                        )}
                        <Avatar
                          name={r.issuer?.full_name?.trim() ?? null}
                          email={r.issuer?.email ?? null}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-navy-800">{issuerName(r)}</div>
                          {isUnpaid(payState, r.user_id) && (
                            <div
                              className="text-[11px] italic text-amber-600"
                              title="No one is covering this sub-contractor's ABN plan, so their invoices won't include an ABN. Cover it for them or ask them to subscribe."
                            >
                              Needs ABN cover
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-500">{r.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-navy-500">{formatPeriod(r.issue_date, r.due_date)}</td>
                    <td className="px-4 py-3 text-right font-medium text-navy-700">{formatMoney(r.total)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(r.due_date)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {renderAction(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-navy-500">
            <div className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-navy-100 bg-white px-2 py-1 text-sm"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-navy-400">· Showing {from}–{to} of {total}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={to >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {detail && (
        <InvoiceDetailModal
          invoice={detail}
          marking={marking === detail.id}
          orgName={currentOrg?.name ?? 'Your organisation'}
          orgAbn={currentOrg?.abn ?? null}
          onClose={() => setDetail(null)}
          onMarkPaid={() => setConfirmingPay(detail)}
          onUnmark={() => void unmarkPaid(detail.id)}
        />
      )}

      {confirmingPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-navy-700">Mark as paid?</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-500">
              Confirm you've paid <span className="font-medium text-navy-700">{issuerName(confirmingPay)}</span>{' '}
              for invoice {confirmingPay.invoice_number || ''} ({formatMoney(confirmingPay.total)}). The
              sub-contractor will be asked to confirm they received it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingPay(null)}
                className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = confirmingPay.id;
                  setConfirmingPay(null);
                  void markPaid(id);
                }}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
              >
                Yes, mark as paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDetailModal(props: {
  invoice: InvoiceRow;
  marking: boolean;
  orgName: string;
  orgAbn: string | null;
  onClose: () => void;
  onMarkPaid: () => void;
  onUnmark: () => void;
}) {
  const { invoice, marking, orgName, orgAbn, onClose, onMarkPaid, onUnmark } = props;
  const [items, setItems] = useState<LineItem[] | null>(null);
  const onPrintReceipt = () => {
    const ok = openInvoiceReceipt({
      invoice,
      orgName,
      orgAbn,
      items: items ?? [],
    });
    if (!ok) alert('Allow popups for ozly.app to download the receipt PDF.');
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('invoice_items')
        .select('id, description, hours, rate, amount')
        .eq('invoice_id', invoice.id);
      if (active) setItems((data ?? []) as LineItem[]);
    })();
    return () => {
      active = false;
    };
  }, [invoice.id]);

  const itemsSubtotal = (items ?? []).reduce((s, it) => s + (it.amount ?? 0), 0);
  const subtotal = invoice.subtotal > 0 ? invoice.subtotal : itemsSubtotal;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-semibold text-navy-700">{invoice.invoice_number || 'Invoice'}</div>
            <div className="mt-0.5 text-sm text-navy-500">
              {invoice.issuer?.full_name?.trim() || invoice.issuer?.email || '—'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <button onClick={onClose} className="text-navy-300 hover:text-navy-500" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-navy-400">Issued</div>
            <div className="text-navy-700">{formatDate(invoice.issue_date)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-navy-400">Due</div>
            <div className="text-navy-700">{formatDate(invoice.due_date)}</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-navy-400">Work on this invoice</div>
          {items === null ? (
            <Spinner size="sm" />
          ) : items.length === 0 ? (
            <p className="text-sm text-navy-400">No itemised work — single-line invoice.</p>
          ) : (
            <div className="divide-y divide-navy-50 rounded-lg border border-navy-50">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-navy-700">{it.description || 'Work'}</span>
                  <span className="text-navy-400">
                    {it.hours > 0 ? `${it.hours}h × ${formatMoney(it.rate)} = ` : ''}
                    <span className="font-medium text-navy-700">{formatMoney(it.amount)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1 border-t border-navy-50 pt-3 text-sm">
          <div className="flex justify-between text-navy-500">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-navy-500">
              <span>GST</span>
              <span>{formatMoney(invoice.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-navy-700">
            <span>Total</span>
            <span>{formatMoney(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 rounded-md bg-navy-50 px-3 py-2 text-xs text-navy-500">{invoice.notes}</div>
        )}

        <InvoiceAuditTimeline invoice={invoice} />

        <div className="mt-5 flex items-center justify-between border-t border-navy-50 pt-4">
          <div className="text-xs">
            {invoice.status === 'paid' ? (
              <>
                <div className="text-navy-500">Paid {formatDate(invoice.paid_at)}</div>
                {invoice.payment_confirmed_at ? (
                  <div className="text-brand-600">✓ confirmed by member</div>
                ) : (
                  <div className="text-amber-600">awaiting member confirmation</div>
                )}
              </>
            ) : (
              <span className="text-navy-400">Not paid yet</span>
            )}
          </div>
          {invoice.status === 'paid' ? (
            <div className="flex gap-2">
              <button
                onClick={onPrintReceipt}
                className="rounded-md px-3 py-2 text-sm font-medium text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50"
                title="Open a printable PDF receipt"
              >
                Receipt PDF
              </button>
              <button
                onClick={onUnmark}
                disabled={marking}
                className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-50"
              >
                {marking ? '…' : 'Mark as unpaid'}
              </button>
            </div>
          ) : (
            <button
              onClick={onMarkPaid}
              disabled={marking}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              Mark as paid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit timeline for an invoice — chronological log of who did what when.
// Reads org_events filtered to this invoice. Always renders a synthetic
// 'created' entry so the timeline isn't empty for invoices issued before
// org_events captured every state change.
// ─────────────────────────────────────────────────────────────────────────────
interface AuditEntry {
  at: string;
  icon: string;
  label: string;
  detail?: string;
  tone: 'brand' | 'navy' | 'amber';
}

function InvoiceAuditTimeline({ invoice }: { invoice: InvoiceRow }) {
  const [events, setEvents] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('org_events')
        .select('event_name, metadata, created_at')
        .filter('metadata->>invoice_id', 'eq', invoice.id)
        .order('created_at', { ascending: true })
        .limit(20);

      const out: AuditEntry[] = [
        { at: invoice.issue_date,    icon: '✎', label: 'Invoice issued',  tone: 'navy',  detail: `by ${invoice.issuer?.full_name?.trim() || invoice.issuer?.email || 'Sub-contractor'}` },
      ];
      if (invoice.sent_at) {
        out.push({ at: invoice.sent_at, icon: '→', label: 'Sent to your inbox', tone: 'navy' });
      }
      (data ?? []).forEach((e: { event_name: string; created_at: string; metadata: unknown }) => {
        switch (e.event_name) {
          case 'org_invoice_marked_paid':
            out.push({ at: e.created_at, icon: '✓', label: 'Marked paid by admin', tone: 'brand' });
            break;
          case 'org_invoice_unmarked_paid':
            out.push({ at: e.created_at, icon: '↶', label: 'Mark-paid undone',     tone: 'amber' });
            break;
          case 'org_payment_confirmed_by_member':
            out.push({ at: e.created_at, icon: '✓', label: 'Member confirmed payment received', tone: 'brand' });
            break;
          default:
            out.push({ at: e.created_at, icon: '·', label: e.event_name.replace(/_/g, ' '), tone: 'navy' });
        }
      });

      // Fold in non-event state we know about
      if (invoice.paid_at && !out.some((e) => e.label === 'Marked paid by admin')) {
        out.push({ at: invoice.paid_at, icon: '✓', label: 'Marked paid', tone: 'brand' });
      }
      if (invoice.payment_confirmed_at && !out.some((e) => e.label.includes('confirmed payment'))) {
        out.push({ at: invoice.payment_confirmed_at, icon: '✓', label: 'Member confirmed payment received', tone: 'brand' });
      }

      out.sort((a, b) => a.at.localeCompare(b.at));
      if (active) setEvents(out);
    })();
    return () => { active = false; };
  }, [invoice.id, invoice.issue_date, invoice.sent_at, invoice.paid_at, invoice.payment_confirmed_at, invoice.issuer?.full_name, invoice.issuer?.email]);

  if (!events) return null;

  const TONES: Record<AuditEntry['tone'], { bg: string; ring: string; fg: string }> = {
    brand: { bg: 'rgba(43, 187, 151, 0.14)', ring: 'rgba(43, 187, 151, 0.36)', fg: 'var(--color-brand-700)' },
    navy:  { bg: 'rgba(20, 36, 47, 0.06)',  ring: 'rgba(20, 36, 47, 0.18)',   fg: 'var(--ink-secondary)' },
    amber: { bg: 'rgba(245, 158, 11, 0.16)', ring: 'rgba(245, 158, 11, 0.36)', fg: '#92400e' },
  };

  return (
    <details className="mt-5 rounded-lg border border-navy-100 bg-navy-50/30">
      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-navy-500">
        <span className="mr-1.5">📜</span>
        Audit trail · {events.length} event{events.length === 1 ? '' : 's'}
        <span className="ml-2 text-navy-300">▾</span>
      </summary>
      <ol className="space-y-2 px-3 pb-3 pt-1">
        {events.map((e, i) => {
          const t = TONES[e.tone];
          return (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
              >
                {e.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-navy-800">{e.label}</div>
                {e.detail && <div className="text-[11px] text-navy-400">{e.detail}</div>}
              </div>
              <div className="text-[10.5px] text-navy-400 shrink-0">
                {new Date(e.at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

