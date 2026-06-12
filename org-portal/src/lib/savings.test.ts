import { describe, it, expect } from 'vitest';
import {
  computeSavings,
  clampAssumptions,
  bucketSavings,
  loadAssumptions,
  saveAssumptions,
  DEFAULT_ASSUMPTIONS,
  type SavingsActivity,
  type DatedActivity,
} from './savings';

const ACTIVITY: SavingsActivity = {
  invoicesReceived: 10,
  cleanInvoices: 8,
  remindersSent: 5,
  discrepancyDollars: 120.5,
  discrepancyCount: 2,
};

describe('computeSavings', () => {
  it('prices each line at hourlyRate/60 and adds real discrepancy dollars', () => {
    const s = { hourlyRate: 60, minutesPerInvoice: 6, minutesPerCleanInvoice: 12, minutesPerReminder: 8 };
    const b = computeSavings(ACTIVITY, s);
    // 10×6 + 8×12 + 5×8 = 196 min @ $1/min = $196, + $120.50 caught
    expect(b.minutes).toBe(196);
    expect(b.total).toBeCloseTo(316.5, 2);
    expect(b.lines).toHaveLength(4);
    expect(b.lines.find((l) => l.key === 'discrepancies')?.dollars).toBeCloseTo(120.5, 2);
  });

  it('omits zero-activity lines entirely', () => {
    const b = computeSavings(
      { invoicesReceived: 3, cleanInvoices: 0, remindersSent: 0, discrepancyDollars: 0, discrepancyCount: 0 },
      DEFAULT_ASSUMPTIONS,
    );
    expect(b.lines.map((l) => l.key)).toEqual(['processed']);
  });

  it('returns zero total for an empty period', () => {
    const b = computeSavings(
      { invoicesReceived: 0, cleanInvoices: 0, remindersSent: 0, discrepancyDollars: 0, discrepancyCount: 0 },
      DEFAULT_ASSUMPTIONS,
    );
    expect(b.total).toBe(0);
    expect(b.lines).toHaveLength(0);
  });

  it('uses singular/plural labels correctly', () => {
    const b = computeSavings(
      { invoicesReceived: 1, cleanInvoices: 0, remindersSent: 1, discrepancyDollars: 50, discrepancyCount: 1 },
      DEFAULT_ASSUMPTIONS,
    );
    expect(b.lines.find((l) => l.key === 'processed')?.label).toMatch(/^1 invoice /);
    expect(b.lines.find((l) => l.key === 'reminders')?.label).toMatch(/^1 automated reminder /);
    expect(b.lines.find((l) => l.key === 'discrepancies')?.label).toMatch(/^1 billing discrepancy /);
  });
});

describe('clampAssumptions', () => {
  it('clamps negatives to zero and caps runaway values', () => {
    const c = clampAssumptions({ hourlyRate: -5, minutesPerInvoice: 9999, minutesPerCleanInvoice: 12, minutesPerReminder: NaN });
    expect(c.hourlyRate).toBe(0);
    expect(c.minutesPerInvoice).toBe(120);
    expect(c.minutesPerCleanInvoice).toBe(12);
    expect(c.minutesPerReminder).toBe(0);
  });
});

describe('load/saveAssumptions', () => {
  it('round-trips through localStorage with clamping and falls back to defaults', () => {
    expect(loadAssumptions('org-x')).toEqual(DEFAULT_ASSUMPTIONS);
    saveAssumptions('org-x', { hourlyRate: 80, minutesPerInvoice: 4, minutesPerCleanInvoice: 20, minutesPerReminder: 5 });
    expect(loadAssumptions('org-x')).toEqual({ hourlyRate: 80, minutesPerInvoice: 4, minutesPerCleanInvoice: 20, minutesPerReminder: 5 });
    // Partial/corrupt payloads merge over defaults instead of crashing.
    localStorage.setItem('ozly:savings-assumptions:org-y', JSON.stringify({ hourlyRate: 100 }));
    expect(loadAssumptions('org-y')).toEqual({ ...DEFAULT_ASSUMPTIONS, hourlyRate: 100 });
    localStorage.setItem('ozly:savings-assumptions:org-z', 'not-json');
    expect(loadAssumptions('org-z')).toEqual(DEFAULT_ASSUMPTIONS);
  });
});

describe('bucketSavings', () => {
  const s = { hourlyRate: 60, minutesPerInvoice: 6, minutesPerCleanInvoice: 12, minutesPerReminder: 8 };

  it('buckets weekly for short spans and seeds quiet weeks as zero', () => {
    const from = new Date('2026-05-01T00:00:00Z').getTime();
    const to = new Date('2026-05-28T00:00:00Z').getTime();
    const events: DatedActivity[] = [
      { at: '2026-05-02T10:00:00Z', kind: 'invoice' },
      { at: '2026-05-02T11:00:00Z', kind: 'clean' },
      { at: '2026-05-20T09:00:00Z', kind: 'discrepancy', dollars: 30 },
    ];
    const buckets = bucketSavings(events, from, to, s);
    expect(buckets.length).toBeGreaterThanOrEqual(4);
    // Week 1: 1 invoice (6 min) + 1 clean (12 min) = 18 min @ $1/min
    expect(buckets[0]!.total).toBeCloseTo(18, 2);
    // Some middle week has the $30 discrepancy; quiet weeks are zero.
    expect(buckets.some((b) => Math.abs(b.total - 30) < 0.01)).toBe(true);
    expect(buckets.some((b) => b.total === 0)).toBe(true);
  });

  it('buckets monthly for long spans', () => {
    const from = new Date('2026-01-01T00:00:00Z').getTime();
    const to = new Date('2026-06-01T00:00:00Z').getTime();
    const buckets = bucketSavings([{ at: '2026-03-15T00:00:00Z', kind: 'reminder' }], from, to, s);
    expect(buckets.length).toBeGreaterThanOrEqual(5); // Jan..Jun calendar months
    const mar = buckets.find((b) => b.label === 'Mar');
    expect(mar?.total).toBeCloseTo(8, 2); // 8 min @ $1/min
  });

  it('ignores events outside the range and invalid dates', () => {
    const from = new Date('2026-05-01T00:00:00Z').getTime();
    const to = new Date('2026-05-15T00:00:00Z').getTime();
    const buckets = bucketSavings(
      [
        { at: '2026-04-01T00:00:00Z', kind: 'invoice' },
        { at: 'garbage', kind: 'invoice' },
      ],
      from, to, s,
    );
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });
});
