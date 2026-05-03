/**
 * Minimal CSV/JSON export helpers — no deps.
 *
 * `toCsv` accepts an array of records + ordered columns spec (header label
 * + value getter). Escaping follows RFC 4180 (commas, quotes, newlines).
 *
 * `download(filename, content, mime)` triggers a browser download via
 * Blob + anchor.
 */

export interface CsvColumn<T> {
  header: string;
  get: (row: T) => string | number | boolean | null | undefined;
}

export function toCsv<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<CsvColumn<T>>): string {
  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(c.get(r))).join(','))
    .join('\r\n');
  return `${header}\r\n${body}`;
}

function escape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function trigger(filename: string, content: string, mime: string): void {
  if (typeof window === 'undefined' || !window.document) return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, csv: string): void {
  trigger(filename, csv, 'text/csv');
}

export function downloadJson(filename: string, data: unknown): void {
  trigger(filename, JSON.stringify(data, null, 2), 'application/json');
}
