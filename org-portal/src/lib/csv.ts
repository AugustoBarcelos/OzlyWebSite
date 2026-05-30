// Minimal CSV helpers — RFC 4180 quoting (escape `"` and wrap any cell that
// contains commas, quotes or newlines) and a browser-side download trigger.
// Excel-friendly: writes a UTF-8 BOM so accents survive when opened in Excel
// on Windows.

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: unknown): string => {
    if (v == null) return '';
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];
  return '﻿' + lines.join('\r\n'); // BOM + CRLF for Excel compatibility
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Builds a yyyymmdd-hhmm timestamp suffix for filenames. UTC so it's stable
 * across the team regardless of locale.
 */
export function timestampSuffix(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

/**
 * Xero "Bills" CSV format. Pasted into Xero via Business → Bills to pay →
 * Import. Minimum-required column set that Xero accepts — accountant adjusts
 * AccountCode + TrackingOptions on their side.
 *
 * Each line item becomes one row (a single bill with N line items takes N
 * rows that share InvoiceNumber + ContactName + dates; Xero merges them on
 * import). For the org portal each invoice is currently one bill, so we emit
 * one row per invoice.
 *
 * TaxType:
 *   - "GST on Expenses"  when the invoice has GST (tax_amount > 0)
 *   - "BAS Excluded"     otherwise (sub-contractor is GST-free / below
 *                        threshold). Accountant may need to override.
 */
export interface XeroBillRow {
  contactName: string;
  email?: string | null;
  invoiceNumber: string;
  invoiceDate: string;   // YYYY-MM-DD
  dueDate: string;       // YYYY-MM-DD
  description: string;
  unitAmount: number;    // tax-exclusive subtotal
  hasGst: boolean;
}

export function toXeroBillsCsv(rows: XeroBillRow[]): string {
  // Column order Xero documents for the Bills template.
  const headers = [
    'ContactName',
    'EmailAddress',
    'InvoiceNumber',
    'Reference',
    'InvoiceDate',
    'DueDate',
    'InventoryItemCode',
    'Description',
    'Quantity',
    'UnitAmount',
    'AccountCode',
    'TaxType',
    'Currency',
  ];
  const csvRows: (string | number)[][] = rows.map((r) => [
    r.contactName,
    r.email ?? '',
    r.invoiceNumber,
    '',                          // Reference (free-text in Xero) — leave blank
    r.invoiceDate,
    r.dueDate,
    '',                          // InventoryItemCode — none
    r.description,
    1,                           // Quantity
    r.unitAmount.toFixed(2),     // UnitAmount = tax-exclusive
    '',                          // AccountCode — accountant fills (e.g. 400)
    r.hasGst ? 'GST on Expenses' : 'BAS Excluded',
    'AUD',
  ]);
  return toCsv(headers, csvRows);
}
