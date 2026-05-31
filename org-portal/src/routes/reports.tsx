// Reports page — BAS quarterly export + P&L summary for the current org.
//
// Two cards:
//   1. BAS export: pick FY year + quarter → table preview + CSV download
//   2. P&L: pick date range (default: current FY) → totals dashboard

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { formatMoney, formatDate } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';
import { useSeqGuard } from '@/lib/use-seq-guard';

interface BasRow {
  invoice_id: string;
  invoice_number: string;
  issue_date: string;
  member_email: string;
  member_abn: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  paid_at: string | null;
  status: string;
}

interface PnlSummary {
  total_revenue: number;
  total_gst: number;
  total_paid: number;
  total_outstanding: number;
  invoice_count: number;
  paid_invoice_count: number;
  members_invoiced: number;
  largest_member_email: string | null;
  largest_member_total: number | null;
}

const QUARTERS = [
  { value: 1, label: 'Q1 · Jul–Sep' },
  { value: 2, label: 'Q2 · Oct–Dec' },
  { value: 3, label: 'Q3 · Jan–Mar' },
  { value: 4, label: 'Q4 · Apr–Jun' },
];

function defaultFyYear(): number {
  const now = new Date();
  // FY 2025-26 = year 2026 (the calendar year that contains the END of the FY).
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

function defaultPnlRange(): { from: string; to: string } {
  const today = new Date();
  const fyStartYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    from: `${fyStartYear}-07-01`,
    to: `${fyStartYear + 1}-07-01`,
  };
}

export function ReportsPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [fyYear, setFyYear] = useState(defaultFyYear());
  const [quarter, setQuarter] = useState(1);
  const [basRows, setBasRows] = useState<BasRow[]>([]);
  const [loadingBas, setLoadingBas] = useState(false);

  const [pnlRange, setPnlRange] = useState(defaultPnlRange());
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [loadingPnl, setLoadingPnl] = useState(false);
  const [reportsMissing, setReportsMissing] = useState(false);
  const basSeq = useSeqGuard();
  const pnlSeq = useSeqGuard();

  const loadBas = useCallback(async () => {
    if (!orgId) return;
    setLoadingBas(true);
    const token = basSeq.start();
    const { data, error } = await supabase.rpc('org_bas_quarterly', {
      p_org_id: orgId, p_year: fyYear, p_quarter: quarter,
    });
    if (!basSeq.isCurrent(token)) return;
    setLoadingBas(false);
    if (error) {
      const code = (error as { code?: string }).code;
      const isMissingRpc = code === 'PGRST202' || code === '42883'
        || (error.message ?? '').includes('Could not find the function');
      if (isMissingRpc) {
        setReportsMissing(true);
        setBasRows([]); // clear stale data from previous successful load
        return;
      }
      notify(friendlyError(error), 'error');
      setBasRows([]);
      return;
    }
    setReportsMissing(false);
    setBasRows((data ?? []) as BasRow[]);
  }, [orgId, fyYear, quarter, notify, basSeq]);

  const loadPnl = useCallback(async () => {
    if (!orgId) return;
    if (!pnlRange.from || !pnlRange.to) return; // require both dates
    setLoadingPnl(true);
    const token = pnlSeq.start();
    const { data, error } = await supabase.rpc('org_pnl', {
      p_org_id: orgId, p_from: pnlRange.from, p_to: pnlRange.to,
    });
    if (!pnlSeq.isCurrent(token)) return;
    setLoadingPnl(false);
    if (error) {
      const code = (error as { code?: string }).code;
      const isMissingRpc = code === 'PGRST202' || code === '42883'
        || (error.message ?? '').includes('Could not find the function');
      if (isMissingRpc) { setReportsMissing(true); setPnl(null); return; }
      notify(friendlyError(error), 'error');
      setPnl(null);
      return;
    }
    const row = (data ?? []) as PnlSummary[];
    setPnl(row[0] ?? null);
  }, [orgId, pnlRange.from, pnlRange.to, notify, pnlSeq]);

  useEffect(() => { void loadBas(); }, [loadBas]);
  useEffect(() => { void loadPnl(); }, [loadPnl]);

  const basTotals = useMemo(() => {
    return basRows.reduce(
      (acc, r) => {
        acc.subtotal += Number(r.subtotal) || 0;
        acc.gst += Number(r.gst_amount) || 0;
        acc.total += Number(r.total) || 0;
        return acc;
      },
      { subtotal: 0, gst: 0, total: 0 },
    );
  }, [basRows]);

  function exportBasCsv() {
    const csv = toCsv(
      ['Invoice #', 'Issue date', 'Member email', 'Member ABN', 'Subtotal', 'GST', 'Total', 'Paid at', 'Status'],
      basRows.map((r) => [
        r.invoice_number, r.issue_date, r.member_email, r.member_abn ?? '',
        r.subtotal.toString(), r.gst_amount.toString(), r.total.toString(),
        r.paid_at ?? '', r.status,
      ]),
    );
    downloadCsv(`ozly-bas-fy${fyYear}-q${quarter}-${timestampSuffix()}.csv`, csv);
  }

  if (!currentOrg) return null;

  return (
    <>
      <PageHeader kicker="Insights" title="Reports" subtitle="BAS quarterly export + P&L summaries" />

      {reportsMissing && (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
          <strong className="font-semibold">Reports not enabled yet.</strong>{' '}
          Apply Supabase migration <code className="rounded bg-blue-100 px-1">20260605200000_org_bas_pnl.sql</code>{' '}
          to enable BAS export + P&L summaries.
        </div>
      )}

      {/* BAS */}
      <section className="ozly-card mb-5 p-5">
        <h2 className="text-sm font-semibold text-navy-700">BAS — quarterly</h2>
        <p className="mt-1 text-xs text-navy-400">
          Australian fiscal year (Jul→Jun). Columns map directly to ATO portal fields.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-[11px] font-medium text-navy-600">
            Fiscal year
            <select
              value={fyYear}
              onChange={(e) => setFyYear(Number(e.target.value))}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            >
              {[fyYear - 1, fyYear, fyYear + 1].map((y) => (
                <option key={y} value={y}>FY {y - 1}–{y.toString().slice(2)}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-navy-600">
            Quarter
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            >
              {QUARTERS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </label>
          {basRows.length > 0 && (
            <button
              onClick={exportBasCsv}
              className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500"
            >
              Export CSV
            </button>
          )}
        </div>

        {loadingBas ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : basRows.length === 0 ? (
          <p className="mt-6 text-sm text-navy-400">No invoices in this quarter yet.</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat label="Subtotal" value={basTotals.subtotal} />
              <Stat label="GST collected" value={basTotals.gst} accent="text-brand-700" />
              <Stat label="Total invoiced" value={basTotals.total} />
            </div>
            <div className="mt-4 max-h-80 overflow-auto rounded-md border border-navy-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-navy-50 text-[10px] uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Member</th>
                    <th className="px-2 py-2 font-medium text-right">Subtotal</th>
                    <th className="px-2 py-2 font-medium text-right">GST</th>
                    <th className="px-2 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {basRows.map((r) => (
                    <tr key={r.invoice_id} className="border-t border-navy-50">
                      <td className="px-2 py-1.5 font-mono text-[11px]">{r.invoice_number}</td>
                      <td className="px-2 py-1.5">{formatDate(r.issue_date)}</td>
                      <td className="px-2 py-1.5 max-w-[180px] truncate">{r.member_email}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(r.subtotal)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(r.gst_amount)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatMoney(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* P&L */}
      <section className="ozly-card p-5">
        <h2 className="text-sm font-semibold text-navy-700">P&amp;L summary</h2>
        <p className="mt-1 text-xs text-navy-400">Default range = current fiscal year. Adjust to drill down.</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-[11px] font-medium text-navy-600">
            From
            <input
              type="date" value={pnlRange.from}
              onChange={(e) => setPnlRange({ ...pnlRange, from: e.target.value })}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block text-[11px] font-medium text-navy-600">
            To
            <input
              type="date" value={pnlRange.to}
              onChange={(e) => setPnlRange({ ...pnlRange, to: e.target.value })}
              className="mt-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>

        {loadingPnl ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !pnl ? (
          <p className="mt-6 text-sm text-navy-400">No data in this range.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total revenue" value={Number(pnl.total_revenue)} />
            <Stat label="GST" value={Number(pnl.total_gst)} />
            <Stat label="Paid" value={Number(pnl.total_paid)} accent="text-brand-700" />
            <Stat label="Outstanding" value={Number(pnl.total_outstanding)} accent="text-rose-600" />
            <Stat label="Invoices" raw={pnl.invoice_count} />
            <Stat label="Paid invoices" raw={pnl.paid_invoice_count} />
            <Stat label="Members invoiced" raw={pnl.members_invoiced} />
            {pnl.largest_member_email && (
              <div className="col-span-2 sm:col-span-1 rounded-lg bg-navy-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-navy-500">Top member</div>
                <div className="mt-1 truncate text-xs text-navy-700">{pnl.largest_member_email}</div>
                <div className="text-sm font-semibold text-navy-800">
                  {formatMoney(Number(pnl.largest_member_total))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, raw, accent }: { label: string; value?: number; raw?: number; accent?: string }) {
  return (
    <div className="rounded-lg bg-navy-50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-navy-500">{label}</div>
      <div className={`mt-1 text-base font-semibold ${accent ?? 'text-navy-800'}`}>
        {value !== undefined ? formatMoney(value) : raw}
      </div>
    </div>
  );
}
