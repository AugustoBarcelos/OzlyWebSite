// Generates a printable HTML receipt for a paid invoice and opens it in a new
// window with print() auto-triggered. The user uses the browser's "Save as
// PDF" option to produce a PDF — no extra dependency needed and the layout
// stays in our control. Falls back gracefully on popup-blockers (caller can
// show the user a hint).

import type { InvoiceRow } from '@/lib/types';

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function fmtMoney(n: number | null | undefined): string {
  const num = typeof n === 'number' ? n : 0;
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(num);
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

interface ReceiptArgs {
  invoice: InvoiceRow;
  orgName: string;
  orgAbn?: string | null;
  items?: Array<{ description: string; hours: number; rate: number; amount: number }>;
}

export function openInvoiceReceipt({ invoice, orgName, orgAbn, items }: ReceiptArgs): boolean {
  const subName = invoice.issuer?.full_name?.trim() || invoice.issuer?.email || 'Sub-contractor';
  const itemRows = (items ?? []).map((it) => `
    <tr>
      <td>${esc(it.description || 'Work')}</td>
      <td style="text-align:right">${it.hours > 0 ? esc(it.hours.toFixed(2)) : '—'}</td>
      <td style="text-align:right">${it.rate > 0 ? esc(fmtMoney(it.rate)) : '—'}</td>
      <td style="text-align:right">${esc(fmtMoney(it.amount))}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Receipt — ${esc(invoice.invoice_number ?? 'Invoice')}</title>
<style>
  @page { size: A4; margin: 24mm; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2a44; margin: 0; }
  .doc { max-width: 720px; margin: 0 auto; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #162431; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-weight: 800; font-size: 22px; letter-spacing: -0.01em; color: #162431; }
  .head .meta { text-align: right; font-size: 12px; color: #778591; }
  h2 { font-size: 16px; margin: 18px 0 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 13px; }
  .label { text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; color: #778591; }
  .value { font-weight: 600; color: #162431; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; }
  th { text-align: left; padding: 8px; border-bottom: 1px solid #e7eaee; color: #778591; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 8px; border-bottom: 1px solid #f0f2f5; }
  .totals { margin-top: 16px; border-top: 2px solid #162431; padding-top: 10px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .total { font-size: 16px; font-weight: 800; padding-top: 6px; }
  .stamp { margin-top: 28px; padding: 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-weight: 600; }
  .footer { margin-top: 32px; font-size: 10px; color: #99a3ad; border-top: 1px solid #f0f2f5; padding-top: 10px; line-height: 1.5; }
  @media print { .doc { padding: 0; } }
</style>
</head>
<body>
<div class="doc">
  <div class="head">
    <div>
      <div class="brand">Ozly</div>
      <div style="margin-top:6px;font-size:12px;color:#778591">Payment receipt</div>
    </div>
    <div class="meta">
      <div class="value" style="font-size:14px">${esc(invoice.invoice_number ?? '—')}</div>
      <div>Issued ${esc(fmtDate(invoice.issue_date))}</div>
      <div>Due ${esc(fmtDate(invoice.due_date))}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">From (sub-contractor)</div>
      <div class="value">${esc(subName)}</div>
      ${invoice.issuer?.email ? `<div style="font-size:12px;color:#778591">${esc(invoice.issuer.email)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="label">To (organisation)</div>
      <div class="value">${esc(orgName)}</div>
      ${orgAbn ? `<div style="font-size:12px;color:#778591">ABN ${esc(orgAbn)}</div>` : ''}
    </div>
  </div>

  <h2>Work on this invoice</h2>
  ${itemRows ? `
  <table>
    <thead><tr>
      <th>Description</th>
      <th style="text-align:right">Hours</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>` : `<p style="font-size:13px;color:#778591">Single-line invoice — no itemised work.</p>`}

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${esc(fmtMoney(invoice.subtotal))}</span></div>
    ${invoice.tax_amount > 0 ? `<div class="row"><span>GST</span><span>${esc(fmtMoney(invoice.tax_amount))}</span></div>` : ''}
    <div class="row total"><span>Total</span><span>${esc(fmtMoney(invoice.total))}</span></div>
  </div>

  <div class="stamp">
    ✓ Marked paid ${invoice.paid_at ? `on ${esc(fmtDate(invoice.paid_at))}` : ''}.
    ${invoice.payment_confirmed_at ? `Sub-contractor confirmed receipt on ${esc(fmtDate(invoice.payment_confirmed_at))}.` : 'Awaiting sub-contractor confirmation.'}
  </div>

  ${invoice.notes ? `<div style="margin-top:20px;padding:10px 12px;background:#f3f5f7;border-radius:8px;font-size:12px;color:#444b5a">${esc(invoice.notes)}</div>` : ''}

  <div class="footer">
    Generated by Ozly for Organisations. This document is informational and
    reflects the data in your portal as of the moment of export. The original
    invoice was issued by the sub-contractor under their own ABN; Ozly does
    not create an employment relationship.
  </div>
</div>
<script>window.onload = () => { setTimeout(() => window.print(), 100); };</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return false; // popup blocked
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
