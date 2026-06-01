import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { ThreadPanel } from '@/components/ThreadPanel';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { EmptyState } from '@/components/EmptyState';
import { BriefcaseIcon } from '@/components/Icons';
import { formatDate, formatMoney } from '@/lib/format';
import { fetchPayState, isUnpaid } from '@/lib/payments';
import { recentPeriods, relativeLabel } from '@/lib/period';
import type { BillingConfig, Period } from '@/lib/period';
import type { JobRow, JobStatus, OrgMembership, PayState } from '@/lib/types';
import { friendlyError } from '@/lib/errors';
import { ColumnFilter, DateColumnFilter, type DateRange, type Option, type SortDir } from '@/components/ColumnFilter';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dayAfterIso = (d: string) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toISOString();
};

// Column key → distinct-values field (RPC) + the DB column it sorts/filters on.
const COLS = {
  sub: { field: 'sub', sort: 'user_id' },
  title: { field: 'title', sort: 'title' },
  when: { field: 'start_date', sort: 'start_datetime' },
  status: { field: 'status', sort: 'status' },
} as const;
type ColKey = keyof typeof COLS;
type SetCol = 'sub' | 'title' | 'status'; // columns using the checklist filter (When uses a date range)

const JOB_SELECT =
  'id, user_id, title, start_datetime, end_datetime, status, location, hourly_rate, unpaid_break_minutes, pending_changes, change_status, change_comment, issuer:profiles!jobs_user_id_fkey(full_name,email), contractors!inner(org_id)';
const PAGE_SIZES = [10, 20, 50, 100];

function netHours(j: JobRow): number {
  const gross = (new Date(j.end_datetime).getTime() - new Date(j.start_datetime).getTime()) / 3_600_000;
  return Math.max(0, gross - (j.unpaid_break_minutes ?? 0) / 60);
}

function jobValue(j: JobRow): number {
  return netHours(j) * (j.hourly_rate ?? 0);
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<JobStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-brand-50 text-brand-700',
  cancelled: 'bg-navy-50 text-navy-400',
};

interface MemberOption { user_id: string; label: string }

function issuerName(j: JobRow): string {
  return j.issuer?.full_name?.trim() || j.issuer?.email || '—';
}

export function WorkPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [payState, setPayState] = useState<Record<string, PayState>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [jobDetail, setJobDetail] = useState<JobRow | null>(null);
  const [filters, setFilters] = useState<Record<SetCol, Set<string>>>({
    sub: new Set(),
    title: new Set(),
    status: new Set(),
  });
  const [whenRange, setWhenRange] = useState<DateRange>({ from: '', to: '' });
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'start_datetime', dir: 'desc' });
  const [colOpts, setColOpts] = useState<Partial<Record<ColKey, Option[]>>>({});
  const [kpis, setKpis] = useState({ value: 0, hours: 0, jobs: 0, completed: 0 });
  const [periodKey, setPeriodKey] = useState('');
  const seq = useRef(0);

  const periodCfg = useMemo<BillingConfig>(
    () => ({ frequency: currentOrg?.period_frequency ?? 'fortnightly', anchor: currentOrg?.period_anchor ?? null }),
    [currentOrg?.period_frequency, currentOrg?.period_anchor],
  );
  const periodOptions = useMemo(() => recentPeriods(periodCfg, 8), [periodCfg]);
  const effectiveKey = periodKey || periodOptions[0]?.key || 'all';
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const selectedPeriod: Period | null = (() => {
    if (effectiveKey === 'all') return null;
    if (effectiveKey === 'custom') {
      if (!customRange.from || !customRange.to) return null;
      const start = new Date(`${customRange.from}T00:00:00`).getTime();
      const endDay = new Date(`${customRange.to}T00:00:00`);
      endDay.setDate(endDay.getDate() + 1);
      return { key: 'custom', label: `${customRange.from} → ${customRange.to}`, startMs: start, endMs: endDay.getTime() };
    }
    return periodOptions.find((p) => p.key === effectiveKey) ?? null;
  })();

  // Members + payment status — fetched once per org (not per page).
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    (async () => {
      const { data: mem } = await supabase
        .from('org_memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('status', 'accepted');
      const ids = (mem ?? []).map((m) => (m as OrgMembership).user_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
        if (!active) return;
        setMembers(
          (profs ?? []).map((p) => {
            const r = p as { id: string; full_name: string; email: string };
            return { user_id: r.id, label: r.full_name?.trim() || r.email };
          }),
        );
      } else if (active) {
        setMembers([]);
      }
      const pay = await fetchPayState(orgId);
      if (active) setPayState(pay);
    })();
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
            p_entity: 'jobs',
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

  // Totals strip — scoped to the selected period (not the column filters),
  // mirroring the Invoices KPIs. Recomputes only when the period changes.
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    (async () => {
      const { data } = await supabase.rpc('org_work_totals', {
        p_org_id: orgId,
        p_from: selectedPeriod ? new Date(selectedPeriod.startMs).toISOString() : null,
        p_to: selectedPeriod ? new Date(selectedPeriod.endMs).toISOString() : null,
      });
      if (!active) return;
      const t = ((data ?? []) as {
        total_value: number;
        total_hours: number;
        job_count: number;
        completed_count: number;
      }[])[0];
      setKpis({
        value: Number(t?.total_value ?? 0),
        hours: Number(t?.total_hours ?? 0),
        jobs: Number(t?.job_count ?? 0),
        completed: Number(t?.completed_count ?? 0),
      });
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, effectiveKey]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const id = ++seq.current;
    let q = supabase.from('jobs').select(JOB_SELECT, { count: 'exact' }).eq('contractors.org_id', orgId);
    if (selectedPeriod) {
      q = q
        .gte('start_datetime', new Date(selectedPeriod.startMs).toISOString())
        .lt('start_datetime', new Date(selectedPeriod.endMs).toISOString());
    }
    if (filters.sub.size > 0) q = q.in('user_id', [...filters.sub]);
    if (filters.title.size > 0) q = q.in('title', [...filters.title]);
    if (filters.status.size > 0) q = q.in('status', [...filters.status]);
    // When: start_datetime is a timestamp; match the chosen calendar interval.
    if (whenRange.from) q = q.gte('start_datetime', new Date(`${whenRange.from}T00:00:00`).toISOString());
    if (whenRange.to) q = q.lt('start_datetime', dayAfterIso(whenRange.to));
    const { data, count } = await q
      .order(sort.field, { ascending: sort.dir === 'asc' })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (id !== seq.current) return; // a newer request superseded this one
    setJobs((data ?? []) as unknown as JobRow[]);
    setTotal(count ?? 0);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, effectiveKey, filters, whenRange, sort, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to the first page whenever any filter, sort or the page size changes.
  useEffect(() => {
    setPage(0);
  }, [effectiveKey, filters, whenRange, sort, pageSize]);

  // ── Bulk select state — mirrors the Invoices pattern. Single-table action
  // for now: "Export selected to CSV", since jobs.UPDATE isn't allowed under
  // org-admin RLS and we don't want to ship a write RPC for this without
  // explicit user request.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection(): void {
    setSelectedIds(new Set());
    setSelectMode(false);
  }
  function selectAllOnPage(): void {
    setSelectedIds(new Set(jobs.map((j) => j.id)));
  }

  async function bulkExportSelected(): Promise<void> {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const selected = jobs.filter((j) => selectedIds.has(j.id));
      const headers = [
        'Sub-contractor', 'Email', 'Title',
        'Start', 'End', 'Hours (net)',
        'Hourly rate', 'Value', 'Location', 'Status',
      ];
      const csvRows = selected.map((j) => [
        j.issuer?.full_name?.trim() ?? '',
        j.issuer?.email ?? '',
        j.title ?? '',
        j.start_datetime,
        j.end_datetime,
        netHours(j).toFixed(2),
        j.hourly_rate ?? 0,
        jobValue(j).toFixed(2),
        j.location ?? '',
        j.status,
      ]);
      const csv = toCsv(headers, csvRows);
      downloadCsv(`ozly-work-selected-${timestampSuffix()}.csv`, csv);
      notify(`Exported ${selected.length} job${selected.length === 1 ? '' : 's'}`, 'success');
      clearSelection();
    } catch (e) {
      notify(friendlyError(e, 'Could not export selection.'), 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  const setColFilter = (k: SetCol) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [k]: next }));
  const onSort = (k: ColKey) => (dir: 'asc' | 'desc') => setSort({ field: COLS[k].sort, dir });
  const sortDirFor = (k: ColKey): SortDir => (sort.field === COLS[k].sort ? sort.dir : null);
  const filtersActive =
    (Object.keys(filters) as SetCol[]).some((k) => filters[k].size > 0) || !!whenRange.from || !!whenRange.to;

  function clearFilters() {
    setFilters({ sub: new Set(), title: new Set(), status: new Set() });
    setWhenRange({ from: '', to: '' });
  }

  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    if (!orgId) return;
    setExporting(true);
    try {
      let q = supabase.from('jobs').select(JOB_SELECT).eq('contractors.org_id', orgId);
      if (selectedPeriod) {
        q = q
          .gte('start_datetime', new Date(selectedPeriod.startMs).toISOString())
          .lt('start_datetime', new Date(selectedPeriod.endMs).toISOString());
      }
      if (filters.sub.size > 0) q = q.in('user_id', [...filters.sub]);
      if (filters.title.size > 0) q = q.in('title', [...filters.title]);
      if (filters.status.size > 0) q = q.in('status', [...filters.status]);
      if (whenRange.from) q = q.gte('start_datetime', new Date(`${whenRange.from}T00:00:00`).toISOString());
      if (whenRange.to) q = q.lt('start_datetime', dayAfterIso(whenRange.to));
      const { data } = await q.order('start_datetime', { ascending: false }).limit(10_000);
      const rows = (data ?? []) as unknown as JobRow[];

      const headers = [
        'Sub-contractor', 'Email', 'Title',
        'Start', 'End', 'Hours (net)',
        'Hourly rate', 'Value',
        'Location', 'Status',
      ];
      const csvRows = rows.map((j) => [
        j.issuer?.full_name?.trim() ?? '',
        j.issuer?.email ?? '',
        j.title ?? '',
        j.start_datetime,
        j.end_datetime,
        netHours(j).toFixed(2),
        j.hourly_rate ?? 0,
        jobValue(j).toFixed(2),
        j.location ?? '',
        j.status,
      ]);
      const csv = toCsv(headers, csvRows);
      const fn = `ozly-work-${timestampSuffix()}.csv`;
      downloadCsv(fn, csv);
      if (rows.length >= 10_000) {
        notify('Export capped at 10,000 rows. Refine filters for a narrower export.', 'info');
      } else {
        notify(`Exported ${rows.length} jobs to ${fn}`, 'success');
      }
    } catch (e) {
      notify(friendlyError(e, 'Could not export — try again.'), 'error');
    } finally {
      setExporting(false);
    }
  }

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div>
      <PageHeader
        kicker="Operations"
        title="Work"
        subtitle={`Work confirmed for ${currentOrg?.name ?? ''} — offers are accepted in the Ozly app`}
        action={
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setSeriesModalOpen(true)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50"
              title="View and cancel recurring offer series"
            >
              Recurring series
            </button>
            <button
              onClick={() => setModalOpen(true)}
              disabled={members.length === 0}
              title={members.length === 0 ? 'Invite and have a member accept first' : undefined}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              Offer work
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-navy-300">Period</span>
        <select
          value={effectiveKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All time</option>
          {periodOptions.map((p, i) => (
            <option key={p.key} value={p.key}>
              {relativeLabel(p, periodCfg, i)}
            </option>
          ))}
          <option value="custom">Custom range…</option>
        </select>
        {effectiveKey === 'custom' && (
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
        <span className="text-xs text-navy-400">Filter any column from its header ▾</span>
        <div className="ml-auto flex items-center gap-2">
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              selectMode
                ? 'bg-brand-600 text-white hover:bg-brand-500'
                : 'text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50'
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
        </div>
      </div>

      {selectMode && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-brand-700">
              {selectedIds.size === 0
                ? 'Nothing selected'
                : `${selectedIds.size} job${selectedIds.size === 1 ? '' : 's'} selected`}
            </span>
            {jobs.length > 0 && selectedIds.size < jobs.length && (
              <button
                onClick={selectAllOnPage}
                className="text-[11px] font-semibold text-brand-700 hover:text-brand-600"
              >
                Select all on page ({jobs.length})
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void bulkExportSelected()}
              disabled={bulkBusy || selectedIds.size === 0}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              {bulkBusy ? 'Exporting…' : `Export ${selectedIds.size || ''} to CSV`}
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
        <KpiCard tone="brand" label="Total value" value={formatMoney(kpis.value)} />
        <KpiCard tone="lime"  label="Hours"       value={`${Math.round(kpis.hours).toLocaleString('en-AU')}h`} />
        <KpiCard tone="navy"  label="Jobs"        value={kpis.jobs.toLocaleString('en-AU')} />
        <KpiCard tone="brand" label="Completed"   value={kpis.completed.toLocaleString('en-AU')} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon />}
          title={filtersActive ? 'No work matches your filters' : 'No work in this period'}
          description={
            filtersActive
              ? 'Try clearing a column filter or picking another period.'
              : 'Pick another period, or offer work to a member — it shows here once they confirm.'
          }
          action={
            members.length > 0 && !filtersActive ? (
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
              >
                Offer work
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="ozly-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
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
                      label="Work"
                      options={colOpts.title}
                      selected={filters.title}
                      onChange={setColFilter('title')}
                      sortDir={sortDirFor('title')}
                      onSort={onSort('title')}
                      searchPlaceholder="Search work…"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <DateColumnFilter
                      label="When"
                      dates={colOpts.when?.map((o) => o.value)}
                      range={whenRange}
                      onChange={setWhenRange}
                      sortDir={sortDirFor('when')}
                      onSort={onSort('when')}
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-navy-400">Value</th>
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
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr
                    key={j.id}
                    onClick={() => selectMode ? toggleSelected(j.id) : setJobDetail(j)}
                    className={`cursor-pointer border-b border-navy-50 last:border-0 hover:bg-navy-50/40 ${
                      isUnpaid(payState, j.user_id) ? 'opacity-50' : ''
                    } ${selectMode && selectedIds.has(j.id) ? 'bg-brand-50/60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(j.id)}
                            onChange={() => toggleSelected(j.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 rounded border-navy-200 text-brand-600 focus:ring-brand-200"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-navy-700">{issuerName(j)}</div>
                          {isUnpaid(payState, j.user_id) && (
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
                    <td className="px-4 py-3 text-navy-600">{j.title || '—'}</td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(j.start_datetime)}</td>
                    <td className="px-4 py-3 text-right font-medium text-navy-700">
                      {j.hourly_rate > 0 ? formatMoney(jobValue(j)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[j.status] ?? 'bg-navy-50 text-navy-400'}`}
                      >
                        {j.status}
                      </span>
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

      {modalOpen && orgId && (
        <OfferWorkModal
          orgId={orgId}
          members={members}
          defaultRate={currentOrg?.default_hourly_rate ?? 0}
          onClose={() => setModalOpen(false)}
          onSent={() => {
            setModalOpen(false);
            void load();
          }}
          notify={notify}
        />
      )}

      {jobDetail && (
        <JobDetailModal
          job={jobDetail}
          notify={notify}
          onClose={() => setJobDetail(null)}
          onEdited={() => {
            setJobDetail(null);
            void load();
          }}
        />
      )}

      {seriesModalOpen && orgId && (
        <RecurringSeriesModal
          orgId={orgId}
          onClose={() => setSeriesModalOpen(false)}
          onChanged={() => void load()}
          notify={notify}
        />
      )}
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function JobDetailModal(props: {
  job: JobRow;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
  onClose: () => void;
  onEdited: () => void;
}) {
  const { job, notify, onClose, onEdited } = props;
  const [invoice, setInvoice] = useState<{ number: string; status: string } | null>(null);
  const [checkedInvoice, setCheckedInvoice] = useState(false);
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState(job.title);
  const [start, setStart] = useState(toLocalInput(job.start_datetime));
  const [end, setEnd] = useState(toLocalInput(job.end_datetime));
  const [location, setLocation] = useState(job.location ?? '');
  const [rate, setRate] = useState(job.hourly_rate ? String(job.hourly_rate) : '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('invoice_items')
        .select('invoices(invoice_number, status)')
        .eq('job_id', job.id)
        .limit(1);
      if (!active) return;
      const inv = (data?.[0] as { invoices?: { invoice_number: string; status: string } } | undefined)?.invoices;
      if (inv) setInvoice({ number: inv.invoice_number, status: inv.status });
      setCheckedInvoice(true);
    })();
    return () => {
      active = false;
    };
  }, [job.id]);

  const field =
    'mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !start || !end || new Date(end) <= new Date(start)) return;
    setSaving(true);
    const rateNum = rate.trim() === '' ? null : Number(rate);
    const { data, error } = await supabase.rpc('org_update_job', {
      p_job_id: job.id,
      p_title: title.trim(),
      p_start: new Date(start).toISOString(),
      p_end: new Date(end).toISOString(),
      p_location: location.trim() || null,
      p_notes: notes.trim() || null,
      p_hourly_rate: rateNum != null && !Number.isNaN(rateNum) ? rateNum : null,
      p_comment: notes.trim() || null,
    });
    if (error) {
      notify(friendlyError(error), 'error');
      setSaving(false);
      return;
    }
    // org_update_job returns 'pending_confirmation' when the change was staged
    // and awaits the member's confirmation in the app (it does NOT apply yet).
    if (data === 'pending_confirmation') {
      notify(`Change sent to ${issuerName(job)} to confirm in the app`, 'info');
    } else {
      notify('Work updated', 'success');
    }
    onEdited();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-semibold text-navy-700">{editing ? 'Edit work' : job.title || 'Work'}</div>
            <div className="mt-0.5 text-sm text-navy-500">{issuerName(job)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[job.status] ?? 'bg-navy-50 text-navy-400'}`}
            >
              {job.status}
            </span>
            <button onClick={onClose} className="text-navy-300 hover:text-navy-500" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={onSave} className="mt-4">
            <label className="block text-xs font-medium text-navy-600">
              Work
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-navy-600">
                Start
                <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
              </label>
              <label className="block text-xs font-medium text-navy-600">
                End
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-navy-600">
                Location <span className="text-navy-300">(optional)</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} />
              </label>
              <label className="block text-xs font-medium text-navy-600">
                Rate $/h <span className="text-navy-300">(optional)</span>
                <input type="number" min="0" step="0.50" value={rate} onChange={(e) => setRate(e.target.value)} className={field} />
              </label>
            </div>
            <label className="mt-3 block text-xs font-medium text-navy-600">
              Note about the change <span className="text-navy-300">(optional)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={field} />
            </label>
            {(job.status === 'confirmed' || job.status === 'completed') && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
                {issuerName(job)} already confirmed this. The change won't take effect until they
                confirm it in the app — nothing is changed on their side without their OK.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 hover:bg-navy-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
              >
                {saving && <Spinner size="sm" label="Saving" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-navy-400">Starts</div>
                <div className="text-navy-700">
                  {formatDate(job.start_datetime)} · {timeOf(job.start_datetime)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-navy-400">Ends</div>
                <div className="text-navy-700">
                  {formatDate(job.end_datetime)} · {timeOf(job.end_datetime)}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-navy-400">Work details</div>
              <div className="divide-y divide-navy-50 rounded-lg border border-navy-50">
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-navy-500">Hours worked</span>
                  <span className="font-medium text-navy-700">{netHours(job).toFixed(1)}h</span>
                </div>
                {job.hourly_rate > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-navy-500">Rate</span>
                    <span className="font-medium text-navy-700">{formatMoney(job.hourly_rate)}/h</span>
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-navy-500">Location</span>
                    <span className="font-medium text-navy-700">{job.location}</span>
                  </div>
                )}
              </div>
            </div>

            {job.hourly_rate > 0 && (
              <div className="mt-4 space-y-1 border-t border-navy-50 pt-3 text-sm">
                <div className="flex justify-between text-navy-500">
                  <span>
                    {netHours(job).toFixed(1)}h × {formatMoney(job.hourly_rate)}/h
                  </span>
                  <span>{formatMoney(jobValue(job))}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-navy-700">
                  <span>Total</span>
                  <span>{formatMoney(jobValue(job))}</span>
                </div>
              </div>
            )}

            {job.change_status === 'pending' && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
                A change is waiting for {issuerName(job)} to confirm in the app. It won't take effect
                until they accept it.
              </p>
            )}

            <ThreadPanel subjectType="job" subjectId={job.id} memberName={issuerName(job)} notify={notify} />

            <div className="mt-5 flex items-center justify-between border-t border-navy-50 pt-4">
              <div className="text-xs">
                {!checkedInvoice ? (
                  <span className="text-navy-400">…</span>
                ) : invoice ? (
                  <>
                    <div className="text-navy-500">Invoice {invoice.number}</div>
                    <div className="capitalize text-navy-400">{invoice.status}</div>
                  </>
                ) : (
                  <span className="text-navy-400">Not invoiced yet</span>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
              >
                Edit work
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OfferWorkModal(props: {
  orgId: string;
  members: MemberOption[];
  defaultRate: number;
  onClose: () => void;
  onSent: () => void;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
}) {
  const { orgId, members, defaultRate, onClose, onSent, notify } = props;
  const [member, setMember] = useState(members[0]?.user_id ?? '');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Recurrence state ────────────────────────────────────────────────
  // Default: single offer ('none'). When the admin picks weekly/fortnightly
  // we seed the day-of-week from the start date and end-date to +4 weeks.
  type Recurrence = 'none' | 'weekly' | 'fortnightly' | 'monthly';
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);  // ISO 1=Mon..7=Sun
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>('');       // yyyy-mm-dd

  // When the user picks a start date AND switches to a weekly/fortnightly
  // recurrence with no day selected yet, seed the day from the start.
  useEffect(() => {
    if (!start) return;
    if (recurrence === 'weekly' || recurrence === 'fortnightly') {
      const d = new Date(start);
      const iso = d.getDay() === 0 ? 7 : d.getDay(); // JS Sun=0 → ISO 7
      if (recurrenceDays.length === 0) setRecurrenceDays([iso]);
      if (!recurrenceEnd) {
        const ed = new Date(d);
        ed.setDate(ed.getDate() + 28);
        setRecurrenceEnd(ed.toISOString().slice(0, 10));
      }
    } else if (recurrence === 'monthly') {
      if (!recurrenceEnd) {
        const d = new Date(start);
        const ed = new Date(d);
        ed.setMonth(ed.getMonth() + 6);
        setRecurrenceEnd(ed.toISOString().slice(0, 10));
      }
    } else {
      setRecurrenceDays([]);
      setRecurrenceEnd('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrence, start]);

  // Compute date list for the preview ("14 offers · Aug 5 → Aug 31 · ~$1,470").
  // Mirrors the server-side generator in 20260612120000_org_offer_work_recurring.
  const preview = useMemo(() => {
    if (!start || !end || new Date(end) <= new Date(start)) return null;
    const startD = new Date(start);
    const durationMs = new Date(end).getTime() - startD.getTime();
    const hours = durationMs / 3_600_000;
    const rateNum = rate.trim() === '' ? defaultRate : Number(rate);
    const perOfferValue = hours * (Number.isFinite(rateNum) && rateNum > 0 ? rateNum : 0);
    if (recurrence === 'none') {
      return { count: 1, first: startD, last: startD, totalValue: perOfferValue };
    }
    const endD = recurrenceEnd ? new Date(recurrenceEnd + 'T23:59:59') : null;
    if (!endD || endD < startD) return null;
    const dates: Date[] = [];
    if (recurrence === 'monthly') {
      const cursor = new Date(startD);
      while (cursor <= endD && dates.length < 100) {
        dates.push(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      if (recurrenceDays.length === 0) return null;
      const cursor = new Date(startD);
      while (cursor <= endD && dates.length < 100) {
        const iso = cursor.getDay() === 0 ? 7 : cursor.getDay();
        const weeksSince = Math.floor((cursor.getTime() - startD.getTime()) / (7 * 86_400_000));
        const inRightWeek = recurrence === 'weekly' ? true : weeksSince % 2 === 0;
        if (inRightWeek && recurrenceDays.includes(iso)) {
          const d = new Date(cursor);
          d.setHours(startD.getHours(), startD.getMinutes(), 0, 0);
          dates.push(d);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    if (dates.length === 0) return null;
    return {
      count: dates.length,
      first: dates[0]!,
      last: dates[dates.length - 1]!,
      totalValue: perOfferValue * dates.length,
    };
  }, [start, end, rate, defaultRate, recurrence, recurrenceDays, recurrenceEnd]);

  const valid = useMemo(() => {
    if (!member || !title.trim() || !start || !end) return false;
    if (new Date(end) <= new Date(start)) return false;
    if (recurrence === 'none') return true;
    if (!recurrenceEnd) return false;
    if ((recurrence === 'weekly' || recurrence === 'fortnightly') && recurrenceDays.length === 0) return false;
    return preview !== null && preview.count > 0;
  }, [member, title, start, end, recurrence, recurrenceEnd, recurrenceDays, preview]);

  function toggleDay(iso: number) {
    setRecurrenceDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    const rateNum = rate.trim() === '' ? null : Number(rate);
    const { data, error } = await supabase.rpc('org_offer_work', {
      p_org_id: orgId,
      p_member: member,
      p_title: title.trim(),
      p_start: new Date(start).toISOString(),
      p_end: new Date(end).toISOString(),
      p_location: location.trim() || null,
      p_notes: notes.trim() || null,
      p_hourly_rate: rateNum != null && !Number.isNaN(rateNum) ? rateNum : null,
      p_recurrence: recurrence,
      p_recurrence_end: recurrence === 'none' ? null : recurrenceEnd || null,
      p_recurrence_days: recurrence === 'weekly' || recurrence === 'fortnightly' ? recurrenceDays : null,
    });
    if (error) {
      notify(friendlyError(error), 'error');
      setSubmitting(false);
    } else {
      const count = (data as { count?: number } | null)?.count ?? 1;
      notify(
        count === 1
          ? 'Work offered — the member confirms it in the app'
          : `${count} offers sent — the member confirms each one in the app`,
        'success',
      );
      onSent();
    }
  }

  const field =
    'mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-700">Offer work</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-navy-400">
          This sends an offer the sub-contractor accepts (or declines) in the Ozly app. Leave the
          rate blank to use their agreed rate (or your org default); set one to suggest it.
        </p>

        <form onSubmit={onSubmit} className="mt-4">
          <label className="block text-xs font-medium text-navy-600">
            Member
            <select value={member} onChange={(e) => setMember(e.target.value)} className={field}>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-xs font-medium text-navy-600">
            Work
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Office clean — Level 3" className={field} />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-navy-600">
              Start
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              End
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-navy-600">
              Location <span className="text-navy-300">(optional)</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Rate $/h <span className="text-navy-300">(optional)</span>
              <input
                type="number"
                min="0"
                step="0.50"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={defaultRate > 0 ? defaultRate.toFixed(2) : 'agreed rate'}
                className={field}
              />
            </label>
          </div>

          <label className="mt-3 block text-xs font-medium text-navy-600">
            Brief / notes <span className="text-navy-300">(optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What needs doing, access details, anything the sub-contractor should know."
              className={field}
            />
          </label>

          {/* ── Recurrence ───────────────────────────────────────────── */}
          <fieldset className="mt-5 rounded-lg border border-navy-100 bg-navy-50/40 p-3">
            <legend className="px-1 text-[10.5px] font-semibold uppercase tracking-wider text-navy-500">
              Repeat
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'none',        label: 'Once' },
                  { key: 'weekly',      label: 'Weekly' },
                  { key: 'fortnightly', label: 'Fortnightly' },
                  { key: 'monthly',     label: 'Monthly' },
                ] as const
              ).map((opt) => {
                const active = recurrence === opt.key;
                return (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setRecurrence(opt.key)}
                    className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {(recurrence === 'weekly' || recurrence === 'fortnightly') && (
              <div className="mt-3">
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-navy-400">
                  Days
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { iso: 1, label: 'Mon' },
                    { iso: 2, label: 'Tue' },
                    { iso: 3, label: 'Wed' },
                    { iso: 4, label: 'Thu' },
                    { iso: 5, label: 'Fri' },
                    { iso: 6, label: 'Sat' },
                    { iso: 7, label: 'Sun' },
                  ] as const).map((d) => {
                    const on = recurrenceDays.includes(d.iso);
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => toggleDay(d.iso)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          on
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recurrence !== 'none' && (
              <label className="mt-3 block text-[11px] font-medium text-navy-600">
                Until
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  min={start ? start.slice(0, 10) : undefined}
                  className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-1.5 text-[13px] text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            )}

            {preview && recurrence !== 'none' && (
              <div className="mt-3 rounded-md bg-white p-2.5 ring-1 ring-navy-100">
                <div className="text-[12px] font-semibold text-navy-700">
                  {preview.count} offer{preview.count === 1 ? '' : 's'}
                  {preview.totalValue > 0 && (
                    <span className="ml-1 font-normal text-navy-400">
                      · ~${preview.totalValue.toFixed(0)} total
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10.5px] text-navy-400">
                  {preview.first.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  {' → '}
                  {preview.last.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </div>
                {preview.count >= 100 && (
                  <div className="mt-1 text-[10.5px] font-semibold text-amber-600">
                    Capped at 100 — pick a closer end date if you need more.
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={submitting || !valid}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
          >
            {submitting && <Spinner size="sm" label="Sending" />}
            {submitting
              ? 'Sending…'
              : preview && preview.count > 1
                ? `Send ${preview.count} offers`
                : 'Send offer'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════ RecurringSeriesModal ═══════════════════════════
// Lists active recurring series for an org and lets the admin cancel future
// (still-pending) occurrences. Server-side, cancel only deletes occurrences
// whose start is in the future AND not yet reviewed — accepted/declined ones
// are immutable history. Empty state encourages creating one from "Offer work".

interface SeriesRow {
  series_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  title: string;
  recurrence_kind: 'weekly' | 'fortnightly' | 'monthly';
  hourly_rate: number;
  first_start: string;
  last_start: string;
  total_count: number;
  pending_count: number;
  accepted_count: number;
  declined_count: number;
}

function RecurringSeriesModal(props: {
  orgId: string;
  onClose: () => void;
  onChanged: () => void;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
}) {
  const { orgId, onClose, onChanged, notify } = props;
  const [rows, setRows] = useState<SeriesRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('org_list_recurring_series', { p_org_id: orgId });
    if (error) {
      notify(friendlyError(error, 'Could not load series.'), 'error');
      setRows([]);
      return;
    }
    setRows((data ?? []) as SeriesRow[]);
  }, [orgId, notify]);

  useEffect(() => { void reload(); }, [reload]);

  async function cancel(s: SeriesRow) {
    const ok = window.confirm(
      `Cancel ${s.pending_count} upcoming offer${s.pending_count === 1 ? '' : 's'} in this series? ` +
      `Already-accepted jobs stay — only future pending offers are removed.`,
    );
    if (!ok) return;
    setBusyId(s.series_id);
    const { data, error } = await supabase.rpc('org_cancel_recurring_series', {
      p_org_id:    orgId,
      p_series_id: s.series_id,
    });
    setBusyId(null);
    if (error) {
      notify(friendlyError(error, 'Could not cancel.'), 'error');
      return;
    }
    const n = typeof data === 'number' ? data : 0;
    notify(
      n === 0
        ? 'Nothing to cancel — no pending future offers.'
        : `Cancelled ${n} pending offer${n === 1 ? '' : 's'}.`,
      n === 0 ? 'info' : 'success',
    );
    await reload();
    onChanged();
  }

  function describeRecurrence(k: SeriesRow['recurrence_kind']): string {
    return k === 'weekly' ? 'Weekly' : k === 'fortnightly' ? 'Fortnightly' : 'Monthly';
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-navy-700">Recurring series</h2>
            <p className="mt-0.5 text-xs text-navy-400">
              Series you offered to members. Cancel future offers without touching accepted jobs.
            </p>
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500" aria-label="Close">✕</button>
        </div>

        {rows === null && (
          <div className="mt-6 flex items-center justify-center py-8 text-sm text-navy-400">
            <Spinner size="sm" label="Loading series" />
            <span className="ml-2">Loading…</span>
          </div>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-navy-100 bg-navy-50/40 p-6 text-center text-sm text-navy-500">
            <div className="font-semibold text-navy-700">No recurring series yet</div>
            <p className="mt-1 text-xs text-navy-400">
              Use <strong>Offer work</strong> and pick a repeat schedule to create one.
            </p>
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <ul className="mt-4 space-y-2">
            {rows.map((s) => {
              const fmt = (iso: string) =>
                new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <li key={s.series_id} className="rounded-xl border border-navy-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-navy-800">{s.title}</div>
                      <div className="mt-0.5 truncate text-[12px] text-navy-500">
                        {s.member_name}
                        {Number.isFinite(s.hourly_rate) && s.hourly_rate > 0 && (
                          <> · ${Number(s.hourly_rate).toFixed(2)}/h</>
                        )}
                        {' · '}{describeRecurrence(s.recurrence_kind)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-navy-400">
                        {fmt(s.first_start)} → {fmt(s.last_start)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10.5px] font-semibold">
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-navy-600">
                          {s.total_count} total
                        </span>
                        {s.accepted_count > 0 && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                            {s.accepted_count} accepted
                          </span>
                        )}
                        {s.pending_count > 0 && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                            {s.pending_count} pending
                          </span>
                        )}
                        {s.declined_count > 0 && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                            {s.declined_count} declined
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => void cancel(s)}
                      disabled={busyId === s.series_id || s.pending_count === 0}
                      title={s.pending_count === 0 ? 'No pending future offers to cancel' : 'Cancel future pending offers'}
                      className="shrink-0 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === s.series_id ? 'Cancelling…' : 'Cancel future'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
