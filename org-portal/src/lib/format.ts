export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
}

/** "12 Mar – 26 Mar" style period from issue → due date. */
export function formatPeriod(issue: string, due: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const fmt = new Intl.DateTimeFormat('en-AU', opts);
  return `${fmt.format(new Date(issue))} – ${fmt.format(new Date(due))}`;
}
