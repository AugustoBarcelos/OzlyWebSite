// Issue invoice — the org creates its OWN invoice to one of ITS clients
// (the portal mirror of what the Ozly app does for sole traders).
//
// v1 is fully client-side and WORKS end-to-end today: fill the form → live
// totals → "Print / Save as PDF" opens the A4 document (same proven pattern
// as the paid-invoice receipt). Issued invoices persist per-org in
// localStorage and list below for reprint / duplicate / delete + CSV export.
// When a server table lands, only lib/issued-invoices.ts changes.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { formatMoney, formatDate } from '@/lib/format';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';
import {
  computeTotals,
  suggestInvoiceNumber,
  fetchIssuedInvoices,
  persistIssuedInvoice,
  removeIssuedInvoice,
  openIssuedInvoicePrint,
  type IssuedInvoice,
  type IssuedLineItem,
} from '@/lib/issued-invoices';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const EMPTY_ITEM: IssuedLineItem = { description: '', qty: 1, unitPrice: 0 };

export function IssueInvoicePage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? '';

  const [history, setHistory] = useState<IssuedInvoice[]>([]);
  // true once the org_issued_invoices table answered — history syncs to the
  // account; false = this-browser localStorage fallback.
  const [cloud, setCloud] = useState(false);

  // Form state — one draft at a time.
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0001');
  const numberTouchedRef = useRef(false);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    void fetchIssuedInvoices(orgId).then((store) => {
      if (!active) return;
      setHistory(store.rows);
      setCloud(store.cloud);
      // Don't clobber a number the admin already typed.
      if (!numberTouchedRef.current) setInvoiceNumber(suggestInvoiceNumber(store.rows));
    });
    return () => { active = false; };
  }, [orgId]);
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(14));
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAbn, setClientAbn] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [items, setItems] = useState<IssuedLineItem[]>([{ ...EMPTY_ITEM }]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [payTo, setPayTo] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const totals = useMemo(() => computeTotals(items, gstEnabled), [items, gstEnabled]);
  const canIssue = clientName.trim().length > 0 && totals.total > 0;

  function patchItem(idx: number, patch: Partial<IssuedLineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function buildInvoice(): IssuedInvoice {
    return {
      id: editingId ?? crypto.randomUUID(),
      invoiceNumber: invoiceNumber.trim() || 'INV-0001',
      issueDate,
      dueDate,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientAbn: clientAbn.trim(),
      clientAddress: clientAddress.trim(),
      items: items.filter((it) => it.description.trim() || it.qty * it.unitPrice !== 0),
      gstEnabled,
      notes: notes.trim(),
      payTo: payTo.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  function resetForm(nextHistory: IssuedInvoice[]) {
    setEditingId(null);
    setInvoiceNumber(suggestInvoiceNumber(nextHistory));
    setClientName(''); setClientEmail(''); setClientAbn(''); setClientAddress('');
    setItems([{ ...EMPTY_ITEM }]);
    setNotes('');
    setIssueDate(today());
    setDueDate(plusDays(14));
  }

  async function issueAndPrint() {
    if (!currentOrg || !canIssue) return;
    const inv = buildInvoice();
    const ok = openIssuedInvoicePrint(inv, {
      orgName: currentOrg.name,
      orgAbn: currentOrg.abn ?? null,
      orgEmail: currentOrg.admin_email ?? null,
    });
    if (!ok) {
      notify('Popup blocked — allow popups for this site to print the invoice.', 'error');
      return;
    }
    const store = await persistIssuedInvoice(orgId, inv, cloud);
    setHistory(store.rows);
    setCloud(store.cloud);
    notify(`Invoice ${inv.invoiceNumber} ready — use the print dialog's "Save as PDF".`, 'success');
    numberTouchedRef.current = false;
    resetForm(store.rows);
  }

  function loadIntoForm(inv: IssuedInvoice, { duplicate }: { duplicate: boolean }) {
    setEditingId(duplicate ? null : inv.id);
    setInvoiceNumber(duplicate ? suggestInvoiceNumber(history) : inv.invoiceNumber);
    setIssueDate(duplicate ? today() : inv.issueDate);
    setDueDate(duplicate ? plusDays(14) : inv.dueDate);
    setClientName(inv.clientName);
    setClientEmail(inv.clientEmail);
    setClientAbn(inv.clientAbn);
    setClientAddress(inv.clientAddress);
    setItems(inv.items.length > 0 ? inv.items.map((it) => ({ ...it })) : [{ ...EMPTY_ITEM }]);
    setGstEnabled(inv.gstEnabled);
    setPayTo(inv.payTo);
    setNotes(inv.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportHistoryCsv() {
    const csv = toCsv(
      ['Invoice #', 'Issue date', 'Due date', 'Client', 'Client email', 'Client ABN', 'Subtotal', 'GST', 'Total'],
      history.map((inv) => {
        const t = computeTotals(inv.items, inv.gstEnabled);
        return [
          inv.invoiceNumber, inv.issueDate, inv.dueDate, inv.clientName, inv.clientEmail,
          inv.clientAbn, t.subtotal.toFixed(2), t.gst.toFixed(2), t.total.toFixed(2),
        ];
      }),
    );
    downloadCsv(`ozly-issued-invoices-${timestampSuffix()}.csv`, csv);
  }

  if (!currentOrg) return null;

  const inputCls =
    'mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none';

  return (
    <div>
      <PageHeader
        kicker={<Link to="/invoices" className="transition-colors hover:text-brand-600">← Invoices</Link>}
        title="Issue an invoice"
        subtitle={`From ${currentOrg.name}${currentOrg.abn ? ` (ABN ${currentOrg.abn})` : ''} to one of your clients — print-ready, GST handled`}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <div className="ozly-card p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-navy-600">
              Invoice #
              <input
                value={invoiceNumber}
                onChange={(e) => { numberTouchedRef.current = true; setInvoiceNumber(e.target.value); }}
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Issue date
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </label>
          </div>

          <h2 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Bill to</h2>
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-navy-600">
              Client name *
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Pty Ltd"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Client email
              <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Client ABN
              <input value={clientAbn} onChange={(e) => setClientAbn(e.target.value)} placeholder="12 345 678 901" className={inputCls} />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Address
              <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputCls} />
            </label>
          </div>

          <h2 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Line items</h2>
          <div className="mt-1 space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <input
                  value={it.description}
                  onChange={(e) => patchItem(idx, { description: e.target.value })}
                  placeholder="Description (e.g. Commercial cleaning — June)"
                  aria-label={`Item ${idx + 1} description`}
                  className="min-w-0 flex-1 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="number" min={0} step="0.25"
                  value={Number.isFinite(it.qty) ? it.qty : ''}
                  onChange={(e) => patchItem(idx, { qty: parseFloat(e.target.value) })}
                  aria-label={`Item ${idx + 1} quantity`}
                  className="w-20 rounded-md border border-navy-100 bg-white px-2 py-2 text-right text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
                />
                <span className="text-xs text-navy-300">×</span>
                <input
                  type="number" min={0} step="0.01"
                  value={Number.isFinite(it.unitPrice) ? it.unitPrice : ''}
                  onChange={(e) => patchItem(idx, { unitPrice: parseFloat(e.target.value) })}
                  aria-label={`Item ${idx + 1} unit price`}
                  className="w-24 rounded-md border border-navy-100 bg-white px-2 py-2 text-right text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
                />
                <span className="w-20 text-right text-sm font-semibold text-navy-700">
                  {formatMoney(Math.round(((it.qty || 0) * (it.unitPrice || 0)) * 100) / 100)}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Remove item ${idx + 1}`}
                    className="rounded-md px-2 py-1 text-sm text-navy-300 hover:bg-rose-50 hover:text-rose-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
            className="mt-2 text-[12px] font-semibold text-brand-700 hover:text-brand-600"
          >
            + Add line
          </button>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-navy-600">
              Pay to (bank details on the invoice)
              <textarea
                value={payTo}
                onChange={(e) => setPayTo(e.target.value)}
                rows={2}
                placeholder={'BSB 062-000 · Account 1234 5678\nAccount name: ' + currentOrg.name}
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-medium text-navy-600">
              Notes (shown on the invoice)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
            </label>
          </div>
        </div>

        {/* ── Summary / actions ───────────────────────────────────────── */}
        <div className="ozly-card h-fit p-5 lg:sticky lg:top-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Summary</h2>
          <dl className="mt-2 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-navy-500">Subtotal</dt><dd className="font-semibold text-navy-800">{formatMoney(totals.subtotal)}</dd></div>
            <div className="flex items-center justify-between">
              <dt className="text-navy-500">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-navy-200 text-brand-600 focus:ring-brand-200"
                  />
                  GST (10%)
                </label>
              </dt>
              <dd className="font-semibold text-navy-800">{formatMoney(totals.gst)}</dd>
            </div>
            <div className="flex justify-between border-t border-navy-100 pt-1.5 text-[15px] font-bold text-navy-800">
              <dt>Total due</dt><dd>{formatMoney(totals.total)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => void issueAndPrint()}
            disabled={!canIssue}
            title={canIssue ? undefined : 'Add a client name and at least one line with a value'}
            className="btn-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingId ? 'Update & print' : 'Issue & print / Save PDF'}
          </button>
          <p className="mt-2 text-[10.5px] leading-relaxed text-navy-300">
            Opens the A4 document — pick “Save as PDF” in the print dialog to
            email it to your client. {cloud
              ? 'Issued invoices sync to your Ozly account.'
              : 'Issued invoices are kept in this browser and export to CSV.'}
          </p>
        </div>
      </div>

      {/* ── History ──────────────────────────────────────────────────── */}
      <div className="mt-4">
        <CollapsibleSection
          id="issued-history"
          title="Issued by you"
          badge={history.length > 0 ? history.length : undefined}
          subtitle={`Reprint, duplicate for the next period, or export as CSV · ${cloud ? 'synced to your account' : 'stored in this browser'}`}
          defaultOpen={history.length > 0}
          action={
            history.length > 0 ? (
              <button
                type="button"
                onClick={exportHistoryCsv}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
              >
                Export CSV
              </button>
            ) : undefined
          }
        >
          {history.length === 0 ? (
            <p className="text-[12.5px] text-navy-400">
              Nothing issued yet — your first invoice will appear here.
            </p>
          ) : (
            <ul className="space-y-1">
              {history.map((inv) => {
                const t = computeTotals(inv.items, inv.gstEnabled);
                return (
                  <li key={inv.id} className="-mx-2 flex flex-wrap items-center gap-3 rounded-lg px-2 py-2 hover:bg-navy-50/60">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-navy-800">
                        {inv.invoiceNumber} · {inv.clientName}
                      </div>
                      <div className="text-[11px] text-navy-400">
                        Issued {formatDate(inv.issueDate)} · due {formatDate(inv.dueDate)}
                      </div>
                    </div>
                    <span className="shrink-0 font-display text-sm font-bold text-navy-800">{formatMoney(t.total)}</span>
                    <span className="flex shrink-0 gap-1 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          const ok = openIssuedInvoicePrint(inv, {
                            orgName: currentOrg.name,
                            orgAbn: currentOrg.abn ?? null,
                            orgEmail: currentOrg.admin_email ?? null,
                          });
                          if (!ok) notify('Popup blocked — allow popups to print.', 'error');
                        }}
                        className="rounded-md px-2 py-1 text-brand-700 hover:bg-brand-50"
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => loadIntoForm(inv, { duplicate: true })}
                        className="rounded-md px-2 py-1 text-navy-600 hover:bg-navy-50"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => loadIntoForm(inv, { duplicate: false })}
                        className="rounded-md px-2 py-1 text-navy-600 hover:bg-navy-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void removeIssuedInvoice(orgId, inv.id, cloud).then((store) => {
                            setHistory(store.rows);
                            setCloud(store.cloud);
                          });
                        }}
                        className="rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
