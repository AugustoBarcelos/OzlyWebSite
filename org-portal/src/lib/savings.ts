// Savings estimator — turns the org's real activity on Ozly into an
// estimated dollar figure of admin time saved + billing discrepancies caught.
//
// The model is deliberately simple and transparent (every line of the maths
// is shown in the dashboard popup): each automated activity replaces a chunk
// of manual admin minutes, priced at the org's admin hourly rate. The one
// non-assumption line is "discrepancies caught" — that's the real dollar gap
// Ozly's divergence check flagged on edited invoices.
//
// Assumptions are editable per-org in Settings → "Savings assumptions" and
// persist in localStorage (client-side preference, not a security surface —
// the figure is an estimate for the admin's own eyes, never billed on).

export interface SavingsAssumptions {
  /** What an hour of admin time costs the org (AUD). */
  hourlyRate: number;
  /** Manual minutes replaced per invoice that arrives through Ozly (data entry, filing, matching). */
  minutesPerInvoice: number;
  /** Back-and-forth minutes avoided per invoice that needed no correction or edit. */
  minutesPerCleanInvoice: number;
  /** Minutes of manual chasing replaced per automated invoice reminder. */
  minutesPerReminder: number;
}

export const DEFAULT_ASSUMPTIONS: SavingsAssumptions = {
  hourlyRate: 45,
  minutesPerInvoice: 6,
  minutesPerCleanInvoice: 12,
  minutesPerReminder: 8,
};

/** Real activity counted from the org's data for a period. */
export interface SavingsActivity {
  /** Invoices that arrived through Ozly in the period. */
  invoicesReceived: number;
  /** Of those, invoices that needed no edit / had no amount divergence. */
  cleanInvoices: number;
  /** Automated reminders sent (org_invoice_requests rows) in the period. */
  remindersSent: number;
  /** Sum of |stated total − (subtotal + tax)| across divergence-flagged invoices. Real dollars. */
  discrepancyDollars: number;
  /** How many invoices had a flagged discrepancy. */
  discrepancyCount: number;
}

export interface SavingsLine {
  key: 'processed' | 'clean' | 'reminders' | 'discrepancies';
  /** e.g. "37 invoices processed automatically" */
  label: string;
  /** e.g. "6 min each" — null for the real-dollars line. */
  detail: string | null;
  dollars: number;
}

export interface SavingsBreakdown {
  lines: SavingsLine[];
  /** Total estimated dollars saved (time value + discrepancies). */
  total: number;
  /** Total admin minutes the time-based lines represent. */
  minutes: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function computeSavings(a: SavingsActivity, s: SavingsAssumptions): SavingsBreakdown {
  const perMinute = s.hourlyRate / 60;
  const lines: SavingsLine[] = [];

  const procMin = a.invoicesReceived * s.minutesPerInvoice;
  if (a.invoicesReceived > 0) {
    lines.push({
      key: 'processed',
      label: `${plural(a.invoicesReceived, 'invoice', 'invoices')} received & filed automatically`,
      detail: `${s.minutesPerInvoice} min each`,
      dollars: procMin * perMinute,
    });
  }

  const cleanMin = a.cleanInvoices * s.minutesPerCleanInvoice;
  if (a.cleanInvoices > 0) {
    lines.push({
      key: 'clean',
      label: `${plural(a.cleanInvoices, 'invoice', 'invoices')} needed no rework or correction`,
      detail: `${s.minutesPerCleanInvoice} min each`,
      dollars: cleanMin * perMinute,
    });
  }

  const remindMin = a.remindersSent * s.minutesPerReminder;
  if (a.remindersSent > 0) {
    lines.push({
      key: 'reminders',
      label: `${plural(a.remindersSent, 'automated reminder', 'automated reminders')} sent for you`,
      detail: `${s.minutesPerReminder} min each`,
      dollars: remindMin * perMinute,
    });
  }

  if (a.discrepancyCount > 0 && a.discrepancyDollars > 0) {
    lines.push({
      key: 'discrepancies',
      label: `${plural(a.discrepancyCount, 'billing discrepancy', 'billing discrepancies')} caught before payment`,
      detail: null, // real dollars, not a time assumption
      dollars: a.discrepancyDollars,
    });
  }

  const minutes = procMin + cleanMin + remindMin;
  const total = lines.reduce((sum, l) => sum + l.dollars, 0);
  return { lines, total, minutes };
}

// ── Persistence ──────────────────────────────────────────────────────────────

const KEY_PREFIX = 'ozly:savings-assumptions:';

/** Clamp user input to sane, non-negative bounds so a typo can't produce a $4M banner. */
export function clampAssumptions(s: SavingsAssumptions): SavingsAssumptions {
  const num = (v: number, max: number) =>
    Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0;
  return {
    hourlyRate:             num(s.hourlyRate, 500),
    minutesPerInvoice:      num(s.minutesPerInvoice, 120),
    minutesPerCleanInvoice: num(s.minutesPerCleanInvoice, 120),
    minutesPerReminder:     num(s.minutesPerReminder, 120),
  };
}

export function loadAssumptions(orgId: string): SavingsAssumptions {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + orgId);
    if (!raw) return DEFAULT_ASSUMPTIONS;
    const parsed = JSON.parse(raw) as Partial<SavingsAssumptions>;
    return clampAssumptions({ ...DEFAULT_ASSUMPTIONS, ...parsed });
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}

export function saveAssumptions(orgId: string, s: SavingsAssumptions): void {
  try {
    localStorage.setItem(KEY_PREFIX + orgId, JSON.stringify(clampAssumptions(s)));
  } catch {
    // localStorage unavailable — session-only is fine, defaults next load.
  }
}

// Settings + dashboard listen for this so an edit in Settings repaints the
// dashboard card without a reload (same pattern as use-inbox-count).
export const ASSUMPTIONS_CHANGED_EVENT = 'ozly:savings-assumptions-changed';
export function notifyAssumptionsChanged(): void {
  window.dispatchEvent(new Event(ASSUMPTIONS_CHANGED_EVENT));
}

// ── Bucketing for the mini chart ────────────────────────────────────────────

export interface SavingsBucket {
  /** Short axis label, e.g. "Mar" or "3 Jun". */
  label: string;
  total: number;
}

export interface DatedActivity {
  /** ISO timestamp of when the activity happened. */
  at: string;
  kind: 'invoice' | 'clean' | 'reminder' | 'discrepancy';
  /** Only for kind=discrepancy: the dollar gap caught. */
  dollars?: number;
}

/**
 * Group dated activity into chart buckets — monthly when the period spans
 * more than ~10 weeks, weekly otherwise — and price each bucket with the
 * same assumptions as the headline figure.
 */
export function bucketSavings(
  events: DatedActivity[],
  fromMs: number,
  toMs: number,
  s: SavingsAssumptions,
): SavingsBucket[] {
  const spanDays = Math.max(1, (toMs - fromMs) / 86_400_000);
  const monthly = spanDays > 70;
  const bucketMs = monthly ? 0 : 7 * 86_400_000; // 0 = calendar months

  const keys: string[] = [];
  const byKey = new Map<string, { label: string; activity: SavingsActivity }>();

  const keyFor = (ms: number): { key: string; label: string } => {
    const d = new Date(ms);
    if (monthly) {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return { key, label: d.toLocaleDateString('en-AU', { month: 'short' }) };
    }
    const idx = Math.floor((ms - fromMs) / bucketMs);
    const start = new Date(fromMs + idx * bucketMs);
    return {
      key: String(idx),
      label: start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    };
  };

  // Seed every bucket in range so quiet weeks/months still show as zero bars.
  for (let ms = fromMs; ms <= toMs; ms += monthly ? 86_400_000 : bucketMs) {
    const { key, label } = keyFor(ms);
    if (!byKey.has(key)) {
      keys.push(key);
      byKey.set(key, {
        label,
        activity: { invoicesReceived: 0, cleanInvoices: 0, remindersSent: 0, discrepancyDollars: 0, discrepancyCount: 0 },
      });
    }
  }

  for (const e of events) {
    const ms = new Date(e.at).getTime();
    if (Number.isNaN(ms) || ms < fromMs || ms > toMs) continue;
    const { key } = keyFor(ms);
    const bucket = byKey.get(key);
    if (!bucket) continue;
    if (e.kind === 'invoice')     bucket.activity.invoicesReceived += 1;
    if (e.kind === 'clean')       bucket.activity.cleanInvoices += 1;
    if (e.kind === 'reminder')    bucket.activity.remindersSent += 1;
    if (e.kind === 'discrepancy') {
      bucket.activity.discrepancyCount += 1;
      bucket.activity.discrepancyDollars += e.dollars ?? 0;
    }
  }

  return keys.map((k) => {
    const b = byKey.get(k)!;
    return { label: b.label, total: computeSavings(b.activity, s).total };
  });
}
