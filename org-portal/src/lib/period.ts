// Billing-period maths for grouping work & invoices by a member's cycle.

export type Frequency = 'weekly' | 'fortnightly' | 'monthly';

export interface BillingConfig {
  frequency: Frequency;
  anchor: string | null; // any date on the cycle boundary; its weekday = cycle day
}

// Fallback cycle boundary when a member has no anchor set. 2026-01-02 is a Friday.
const DEFAULT_ANCHOR = '2026-01-02';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const DAY_MS = 86_400_000;

// Parse a 'YYYY-MM-DD' or ISO string as a local date at midnight (date-only).
function parseDate(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00`);
}

function fmtDay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
}

export interface Period {
  key: string;
  label: string;
  startMs: number;
  endMs: number; // exclusive upper bound (start of the next period)
}

export function periodFor(dateISO: string, cfg: BillingConfig): Period {
  const d = parseDate(dateISO);

  if (cfg.frequency === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      key: `m-${start.getFullYear()}-${start.getMonth()}`,
      label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`,
      startMs: start.getTime(),
      endMs: next.getTime(),
    };
  }

  const len = cfg.frequency === 'weekly' ? 7 : 14;
  const anchor = parseDate(cfg.anchor ?? DEFAULT_ANCHOR);
  const diffDays = Math.floor((d.getTime() - anchor.getTime()) / DAY_MS);
  const p = Math.floor(diffDays / len);
  const start = new Date(anchor.getTime() + p * len * DAY_MS);
  const end = new Date(start.getTime() + (len - 1) * DAY_MS);
  return {
    key: `p-${start.getTime()}`,
    label: `${fmtDay(start)} – ${fmtDay(end)}`,
    startMs: start.getTime(),
    endMs: start.getTime() + len * DAY_MS,
  };
}

/** True if a date (ISO/date string) falls inside a period [start, end). */
export function inPeriod(dateISO: string, p: Period): boolean {
  const t = parseDate(dateISO).getTime();
  return t >= p.startMs && t < p.endMs;
}

/** Current period + the previous (count-1) periods, newest first. */
export function recentPeriods(cfg: BillingConfig, count = 8): Period[] {
  const out: Period[] = [periodFor(new Date().toISOString(), cfg)];
  for (let i = 1; i < count; i++) {
    const prevSeed = new Date(out[out.length - 1]!.startMs - DAY_MS).toISOString();
    out.push(periodFor(prevSeed, cfg));
  }
  return out;
}

/** "This fortnight" / "Last fortnight" / range — relative to today. */
export function relativeLabel(p: Period, cfg: BillingConfig, index: number): string {
  const unit = cfg.frequency === 'monthly' ? 'month' : cfg.frequency === 'weekly' ? 'week' : 'fortnight';
  if (index === 0) return `This ${unit} · ${p.label}`;
  if (index === 1) return `Last ${unit} · ${p.label}`;
  return p.label;
}

export function freqLabel(f: Frequency): string {
  return f === 'weekly' ? 'Weekly' : f === 'fortnightly' ? 'Fortnightly' : 'Monthly';
}

/** Human cycle summary, e.g. "Fortnightly · Fridays" (monthly omits the day). */
export function cycleSummary(cfg: BillingConfig): string {
  if (cfg.frequency === 'monthly') return 'Monthly';
  const wd = WEEKDAYS[parseDate(cfg.anchor ?? DEFAULT_ANCHOR).getDay()];
  return `${freqLabel(cfg.frequency)} · ${wd}`;
}
