// Reports page — BAS quarterly export + P&L summary for the current org.
//
// Two cards:
//   1. BAS export: pick FY year + quarter → table preview + CSV download
//   2. P&L: pick date range (default: current FY) → totals dashboard

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { CollapsibleSection } from '@/components/CollapsibleSection';
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

// AU FY quarter → [from, to) date range. FY label year = calendar year that
// contains the END of the FY (Jun), so FY2026 Q1 = Jul–Sep 2025.
function quarterRange(fyYear: number, quarter: number): { from: string; to: string } {
  const y = fyYear - 1;
  switch (quarter) {
    case 1:  return { from: `${y}-07-01`,     to: `${y}-10-01` };
    case 2:  return { from: `${y}-10-01`,     to: `${y + 1}-01-01` };
    case 3:  return { from: `${y + 1}-01-01`, to: `${y + 1}-04-01` };
    default: return { from: `${y + 1}-04-01`, to: `${y + 1}-07-01` };
  }
}

// Shared row shape of the direct-table fallback queries below.
interface FallbackInvoiceRow {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  paid_at: string | null;
  status: string;
  user_id: string;
  issuer: { email: string } | null;
}

const FALLBACK_SELECT =
  'id, invoice_number, issue_date, subtotal, tax_amount, total, paid_at, status, user_id, issuer:profiles!invoices_user_id_fkey(email)';

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
  // True when the dedicated RPCs aren't deployed and we computed the report
  // directly from the invoices table instead. Always-works guarantee: the
  // export must never depend on a pending migration.
  const [fallbackMode, setFallbackMode] = useState(false);
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
        // RPC not deployed yet → compute the same rows directly from the
        // invoices table (RLS already scopes it to this org). ABN per member
        // isn't readable client-side, so that column stays blank in fallback.
        const range = quarterRange(fyYear, quarter);
        const fb = await supabase
          .from('invoices')
          .select(FALLBACK_SELECT)
          .eq('org_visible_id', orgId)
          .gte('issue_date', range.from)
          .lt('issue_date', range.to)
          .order('issue_date', { ascending: true })
          .limit(5000);
        if (!basSeq.isCurrent(token)) return;
        if (fb.error) {
          setReportsMissing(true);
          setBasRows([]);
          return;
        }
        const rows = (fb.data ?? []) as unknown as FallbackInvoiceRow[];
        setFallbackMode(true);
        setReportsMissing(false);
        setBasRows(rows.map((r) => ({
          invoice_id: r.id,
          invoice_number: r.invoice_number ?? '—',
          issue_date: r.issue_date,
          member_email: r.issuer?.email ?? '—',
          member_abn: null,
          subtotal: Number(r.subtotal) || 0,
          gst_amount: Number(r.tax_amount) || 0,
          total: Number(r.total) || 0,
          paid_at: r.paid_at,
          status: r.status,
        })));
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
    // Catch the most common slip: typing the end date before the start.
    // RPC silently returns no rows for inverted ranges; we'd rather toast
    // the actual cause than have the admin think there were no invoices.
    if (new Date(pnlRange.to) < new Date(pnlRange.from)) {
      notify('"To" date must be on or after the "From" date.', 'error');
      setPnl(null);
      setLoadingPnl(false);
      return;
    }
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
      if (isMissingRpc) {
        // Same always-works fallback as BAS: aggregate straight from the
        // invoices table client-side.
        const fb = await supabase
          .from('invoices')
          .select(FALLBACK_SELECT)
          .eq('org_visible_id', orgId)
          .gte('issue_date', pnlRange.from)
          .lt('issue_date', pnlRange.to)
          .limit(5000);
        if (!pnlSeq.isCurrent(token)) return;
        if (fb.error) {
          setReportsMissing(true);
          setPnl(null);
          return;
        }
        const rows = (fb.data ?? []) as unknown as FallbackInvoiceRow[];
        setFallbackMode(true);
        setReportsMissing(false);
        if (rows.length === 0) { setPnl(null); return; }
        const byMember = new Map<string, { email: string; total: number }>();
        let revenue = 0, gst = 0, paid = 0, paidCount = 0;
        for (const r of rows) {
          const total = Number(r.total) || 0;
          revenue += total;
          gst += Number(r.tax_amount) || 0;
          const isPaid = r.status === 'paid' || r.paid_at !== null;
          if (isPaid) { paid += total; paidCount += 1; }
          const m = byMember.get(r.user_id) ?? { email: r.issuer?.email ?? '—', total: 0 };
          m.total += total;
          byMember.set(r.user_id, m);
        }
        const largest = [...byMember.values()].sort((a, b) => b.total - a.total)[0] ?? null;
        setPnl({
          total_revenue: revenue,
          total_gst: gst,
          total_paid: paid,
          total_outstanding: revenue - paid,
          invoice_count: rows.length,
          paid_invoice_count: paidCount,
          members_invoiced: byMember.size,
          largest_member_email: largest?.email ?? null,
          largest_member_total: largest?.total ?? null,
        });
        return;
      }
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
      <PageHeader kicker="Reports" title="Reports" subtitle="BAS quarterly export, P&L summaries and accounting exports" />

      {reportsMissing && (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
          Reports aren't available yet — contact support.
        </div>
      )}
      {fallbackMode && !reportsMissing && (
        <p className="mb-4 text-[11px] text-navy-400">
          Computed directly from your invoices — member ABN column unavailable in this mode.
        </p>
      )}

      {/* BAS */}
      <CollapsibleSection
        id="reports-bas"
        title="BAS — quarterly"
        subtitle="Australian fiscal year (Jul→Jun). Columns map directly to ATO portal fields."
        defaultOpen={true}
      >
        <div className="flex flex-wrap items-end gap-3">
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
            {/* Invoice rows folded away by default — totals above answer the
                BAS question; the row-level detail is for spot checks only.
                Styled to match the invoices page audit trail. */}
            <details className="mt-4 rounded-lg border border-navy-100 bg-navy-50/30">
              <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-navy-500">
                Show invoices · {basRows.length}
                <span className="ml-2 text-navy-300">▾</span>
              </summary>
              <div className="max-h-80 overflow-auto border-t border-navy-100">
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
            </details>
          </>
        )}
      </CollapsibleSection>

      {/* P&L */}
      <CollapsibleSection
        id="reports-pnl"
        title="Money in & out (P&L)"
        subtitle="Default range = current fiscal year. Adjust to drill down."
        defaultOpen={false}
      >
        <div className="flex flex-wrap items-end gap-3">
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
      </CollapsibleSection>

      {/* Exports & integrations — an export is a report with a destination,
          so it lives here (Integrations left the sidebar in the flat-nav
          redesign). Each row deep-links to where the export actually runs. */}
      <CollapsibleSection
        id="reports-exports"
        title="Exports & integrations"
        subtitle="Xero · CSV · ABA bank file"
        defaultOpen={false}
      >
        <ul className="divide-y divide-navy-50">
          <ExportRow
            to="/invoices"
            title="Xero (Bills import)"
            sub="On Invoices, use Export ▾ → For Xero — respects your active filters."
          />
          <ExportRow
            to="/invoices"
            title="CSV (spreadsheet)"
            sub="On Invoices, use Export ▾ → As CSV. The BAS table above also exports CSV."
          />
          <ExportRow
            to="/invoices?status=sent,overdue"
            title="ABA bank file (pay your subs in one batch)"
            sub="On Invoices, Select rows → pick unpaid invoices → Generate ABA file, then upload it to your bank."
          />
          <ExportRow
            to="/settings/integrations"
            title="Connected apps"
            sub="ServiceM8, Google Calendar and other connections."
          />
        </ul>
      </CollapsibleSection>
    </>
  );
}

function ExportRow({ to, title, sub }: { to: string; title: string; sub: string }) {
  return (
    <li>
      <Link to={to} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-navy-50/60">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-navy-800">{title}</div>
          <div className="mt-0.5 text-[11.5px] text-navy-400">{sub}</div>
        </div>
        <span className="shrink-0 text-[11.5px] font-semibold text-brand-700">Open →</span>
      </Link>
    </li>
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
