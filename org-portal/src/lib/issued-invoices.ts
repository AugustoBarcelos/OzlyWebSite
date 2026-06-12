// Issued invoices — the org issuing ITS OWN invoices to ITS clients (the
// mirror of what the Ozly app does for sole traders). The document is
// print-ready HTML (browser "Save as PDF", same proven pattern as
// invoice-receipt.ts).
//
// Storage is auto-detecting: when the org_issued_invoices table exists
// (RLS: is_org_admin), history syncs to Supabase — and any localStorage
// history from before the migration is uploaded once, transparently. When
// the table isn't deployed yet, everything falls back to per-org
// localStorage so the module still works end-to-end.

import { supabase } from '@/lib/supabase';

export interface IssuedLineItem {
  description: string;
  /** Quantity (hours, units…). */
  qty: number;
  /** Unit price ex-GST, AUD. */
  unitPrice: number;
}

export interface IssuedInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;        // YYYY-MM-DD
  dueDate: string;          // YYYY-MM-DD
  clientName: string;
  clientEmail: string;
  clientAbn: string;
  clientAddress: string;
  items: IssuedLineItem[];
  /** Apply 10% GST on top of the ex-GST subtotal. */
  gstEnabled: boolean;
  notes: string;
  /** Bank details printed in the "Pay to" box (optional). */
  payTo: string;
  createdAt: string;        // ISO
}

export interface IssuedTotals {
  subtotal: number;
  gst: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotals(items: IssuedLineItem[], gstEnabled: boolean): IssuedTotals {
  const subtotal = round2(
    items.reduce((sum, it) => {
      const qty = Number.isFinite(it.qty) ? it.qty : 0;
      const price = Number.isFinite(it.unitPrice) ? it.unitPrice : 0;
      return sum + qty * price;
    }, 0),
  );
  const gst = gstEnabled ? round2(subtotal * 0.1) : 0;
  return { subtotal, gst, total: round2(subtotal + gst) };
}

/** Suggest the next number from history: INV-0001, INV-0002… */
export function suggestInvoiceNumber(history: IssuedInvoice[]): string {
  let max = 0;
  for (const inv of history) {
    const m = /(\d+)\s*$/.exec(inv.invoiceNumber);
    if (m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return `INV-${String(max + 1).padStart(4, '0')}`;
}

// ── Persistence (localStorage, per org) ─────────────────────────────────────

const KEY_PREFIX = 'ozly:issued-invoices:';

export function loadIssuedInvoices(orgId: string): IssuedInvoice[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + orgId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IssuedInvoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIssuedInvoice(orgId: string, invoice: IssuedInvoice): IssuedInvoice[] {
  const list = loadIssuedInvoices(orgId);
  const idx = list.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) list[idx] = invoice;
  else list.unshift(invoice);
  try {
    localStorage.setItem(KEY_PREFIX + orgId, JSON.stringify(list));
  } catch { /* storage full/unavailable — history is best-effort */ }
  return list;
}

export function deleteIssuedInvoice(orgId: string, id: string): IssuedInvoice[] {
  const list = loadIssuedInvoices(orgId).filter((i) => i.id !== id);
  try {
    localStorage.setItem(KEY_PREFIX + orgId, JSON.stringify(list));
  } catch { /* no-op */ }
  return list;
}

// ── Cloud sync (auto-detected) ───────────────────────────────────────────────

interface IssuedRowDb {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  client_name: string;
  client_email: string;
  client_abn: string;
  client_address: string;
  items: IssuedLineItem[];
  gst_enabled: boolean;
  notes: string;
  pay_to: string;
  created_at: string;
}

const fromDb = (r: IssuedRowDb): IssuedInvoice => ({
  id: r.id,
  invoiceNumber: r.invoice_number,
  issueDate: r.issue_date,
  dueDate: r.due_date,
  clientName: r.client_name,
  clientEmail: r.client_email ?? '',
  clientAbn: r.client_abn ?? '',
  clientAddress: r.client_address ?? '',
  items: Array.isArray(r.items) ? r.items : [],
  gstEnabled: Boolean(r.gst_enabled),
  notes: r.notes ?? '',
  payTo: r.pay_to ?? '',
  createdAt: r.created_at,
});

const toDb = (orgId: string, inv: IssuedInvoice) => ({
  id: inv.id,
  org_id: orgId,
  invoice_number: inv.invoiceNumber,
  issue_date: inv.issueDate,
  due_date: inv.dueDate,
  client_name: inv.clientName,
  client_email: inv.clientEmail,
  client_abn: inv.clientAbn,
  client_address: inv.clientAddress,
  items: inv.items,
  gst_enabled: inv.gstEnabled,
  notes: inv.notes,
  pay_to: inv.payTo,
});

/** PostgREST "relation does not exist" → table not deployed yet. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205'
    || (error.message ?? '').includes('does not exist')
    || (error.message ?? '').includes('schema cache');
}

export interface IssuedStore {
  rows: IssuedInvoice[];
  /** true = synced with Supabase; false = this-browser localStorage only. */
  cloud: boolean;
}

/**
 * Load history. Cloud-first; on first successful cloud read, any local-only
 * rows (pre-migration history) are uploaded once and the local cache cleared.
 */
export async function fetchIssuedInvoices(orgId: string): Promise<IssuedStore> {
  const { data, error } = await supabase
    .from('org_issued_invoices')
    .select('id, invoice_number, issue_date, due_date, client_name, client_email, client_abn, client_address, items, gst_enabled, notes, pay_to, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    // Table missing (or any read failure) → local fallback keeps working.
    if (!isMissingTable(error)) console.warn('issued-invoices cloud read failed', error.code);
    return { rows: loadIssuedInvoices(orgId), cloud: false };
  }
  let rows = ((data ?? []) as unknown as IssuedRowDb[]).map(fromDb);

  // One-time migration: push pre-cloud local history up, then clear it.
  const local = loadIssuedInvoices(orgId);
  const cloudIds = new Set(rows.map((r) => r.id));
  const toUpload = local.filter((l) => !cloudIds.has(l.id));
  if (toUpload.length > 0) {
    const { error: upErr } = await supabase
      .from('org_issued_invoices')
      .upsert(toUpload.map((inv) => toDb(orgId, inv)));
    if (!upErr) {
      rows = [...toUpload, ...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      try { localStorage.removeItem(KEY_PREFIX + orgId); } catch { /* no-op */ }
    }
  } else if (local.length > 0) {
    try { localStorage.removeItem(KEY_PREFIX + orgId); } catch { /* no-op */ }
  }
  return { rows, cloud: true };
}

/** Persist (insert or update). Falls back to localStorage when offline/no table. */
export async function persistIssuedInvoice(orgId: string, inv: IssuedInvoice, cloud: boolean): Promise<IssuedStore> {
  if (cloud) {
    const { error } = await supabase.from('org_issued_invoices').upsert(toDb(orgId, inv));
    if (!error) return fetchIssuedInvoices(orgId);
    console.warn('issued-invoices cloud write failed', error.code);
  }
  return { rows: saveIssuedInvoice(orgId, inv), cloud: false };
}

export async function removeIssuedInvoice(orgId: string, id: string, cloud: boolean): Promise<IssuedStore> {
  if (cloud) {
    const { error } = await supabase.from('org_issued_invoices').delete().eq('org_id', orgId).eq('id', id);
    if (!error) return fetchIssuedInvoices(orgId);
    console.warn('issued-invoices cloud delete failed', error.code);
  }
  return { rows: deleteIssuedInvoice(orgId, id), cloud: false };
}

// ── Print document ───────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

function fmtDate(s: string): string {
  try {
    return new Date(`${s}T00:00:00`).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

export interface IssuerDetails {
  orgName: string;
  orgAbn: string | null;
  orgEmail: string | null;
}

export function buildIssuedInvoiceHtml(inv: IssuedInvoice, issuer: IssuerDetails): string {
  const totals = computeTotals(inv.items, inv.gstEnabled);
  const itemRows = inv.items
    .filter((it) => it.description.trim() || it.qty * it.unitPrice !== 0)
    .map((it) => `
    <tr>
      <td>${esc(it.description || 'Work')}</td>
      <td style="text-align:right">${esc(String(it.qty))}</td>
      <td style="text-align:right">${esc(fmtMoney(it.unitPrice))}</td>
      <td style="text-align:right">${esc(fmtMoney(round2(it.qty * it.unitPrice)))}</td>
    </tr>`)
    .join('');

  // Same A4 shell as invoice-receipt.ts so all Ozly paperwork matches.
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Tax invoice — ${esc(inv.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 24mm; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2a44; margin: 0; }
  .doc { max-width: 720px; margin: 0 auto; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #162431; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-weight: 800; font-size: 22px; letter-spacing: -0.01em; color: #162431; }
  .head .meta { text-align: right; font-size: 12px; color: #778591; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 13px; }
  .label { text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; color: #778591; }
  .value { font-weight: 600; color: #162431; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
  th { text-align: left; padding: 8px; border-bottom: 1px solid #e7eaee; color: #778591; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 8px; border-bottom: 1px solid #f0f2f5; }
  .totals { margin-top: 16px; border-top: 2px solid #162431; padding-top: 10px; max-width: 320px; margin-left: auto; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .total { font-size: 16px; font-weight: 800; padding-top: 6px; }
  .paybox { margin-top: 26px; padding: 12px 14px; background: #f3f5f7; border-radius: 8px; font-size: 12px; color: #444b5a; white-space: pre-line; }
  .footer { margin-top: 32px; font-size: 10px; color: #99a3ad; border-top: 1px solid #f0f2f5; padding-top: 10px; line-height: 1.5; }
  @media print { .doc { padding: 0; } }
</style>
</head>
<body>
<div class="doc">
  <div class="head">
    <div>
      <div class="brand">${esc(issuer.orgName)}</div>
      <div style="margin-top:6px;font-size:12px;color:#778591">
        ${inv.gstEnabled ? 'Tax invoice' : 'Invoice'}
        ${issuer.orgAbn ? ` · ABN ${esc(issuer.orgAbn)}` : ''}
      </div>
      ${issuer.orgEmail ? `<div style="font-size:12px;color:#778591">${esc(issuer.orgEmail)}</div>` : ''}
    </div>
    <div class="meta">
      <div class="value" style="font-size:14px">${esc(inv.invoiceNumber)}</div>
      <div>Issued ${esc(fmtDate(inv.issueDate))}</div>
      <div>Due ${esc(fmtDate(inv.dueDate))}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Bill to</div>
      <div class="value">${esc(inv.clientName || '—')}</div>
      ${inv.clientAbn ? `<div style="font-size:12px;color:#778591">ABN ${esc(inv.clientAbn)}</div>` : ''}
      ${inv.clientEmail ? `<div style="font-size:12px;color:#778591">${esc(inv.clientEmail)}</div>` : ''}
      ${inv.clientAddress ? `<div style="font-size:12px;color:#778591;white-space:pre-line">${esc(inv.clientAddress)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Description</th>
      <th style="text-align:right">Qty</th>
      <th style="text-align:right">Unit price</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${esc(fmtMoney(totals.subtotal))}</span></div>
    ${inv.gstEnabled ? `<div class="row"><span>GST (10%)</span><span>${esc(fmtMoney(totals.gst))}</span></div>` : ''}
    <div class="row total"><span>Total due</span><span>${esc(fmtMoney(totals.total))}</span></div>
  </div>

  ${inv.payTo ? `<div class="paybox"><strong>Pay to</strong>\n${esc(inv.payTo)}</div>` : ''}
  ${inv.notes ? `<div class="paybox">${esc(inv.notes)}</div>` : ''}

  <div class="footer">
    ${inv.gstEnabled
      ? `Tax invoice issued by ${esc(issuer.orgName)}${issuer.orgAbn ? ` (ABN ${esc(issuer.orgAbn)})` : ''}. GST shown is 10% of the subtotal.`
      : `Invoice issued by ${esc(issuer.orgName)}${issuer.orgAbn ? ` (ABN ${esc(issuer.orgAbn)})` : ''}. No GST has been charged.`}
    Generated with Ozly for Organisations.
  </div>
</div>
<script>window.onload = () => { setTimeout(() => window.print(), 100); };</script>
</body></html>`;
}

/** Open the print window. Returns false when blocked by a popup blocker. */
export function openIssuedInvoicePrint(inv: IssuedInvoice, issuer: IssuerDetails): boolean {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return false;
  win.document.open();
  win.document.write(buildIssuedInvoiceHtml(inv, issuer));
  win.document.close();
  return true;
}
