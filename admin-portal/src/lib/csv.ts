/**
 * CSV download helper for admin data exports.
 *
 * Generates a CSV blob from rows of plain objects, lets the browser save
 * it as a file. Used by Data Hub cards to let analysts grab any visible
 * dataset without clicking through to its source page.
 */

type CsvRow = Record<string, unknown>;

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Triggers a CSV download with the given rows.
 *
 * @param rows  Array of plain objects. The union of keys becomes the header.
 * @param filename  Suggested filename. ".csv" is appended if missing.
 */
export function downloadCsv(rows: ReadonlyArray<CsvRow>, filename: string): void {
  if (rows.length === 0) {
    // Still emit a file so the operator sees "yes, exported, but empty".
    const blob = new Blob(['(no rows)\n'], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, ensureCsv(filename));
    return;
  }

  const headerSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) headerSet.add(k);
  const headers = Array.from(headerSet);

  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(','));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h])).join(','));
  }

  const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, ensureCsv(filename));
}

function ensureCsv(filename: string): string {
  return filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
