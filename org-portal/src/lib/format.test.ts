import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, formatPeriod } from './format';

describe('formatMoney', () => {
  it('produces AUD currency with 2dp', () => {
    expect(formatMoney(10)).toMatch(/A?\$10\.00/);
    expect(formatMoney(0)).toMatch(/A?\$0\.00/);
  });

  it('handles thousands separator', () => {
    expect(formatMoney(1234.56)).toMatch(/A?\$1,234\.56/);
  });

  it('formats negatives', () => {
    expect(formatMoney(-50)).toMatch(/-A?\$50\.00/);
  });
});

describe('formatDate', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formats a valid ISO date as DD MMM YYYY (en-AU)', () => {
    expect(formatDate('2026-05-30')).toMatch(/30 May 2026/);
  });

  it('throws on malformed input (documents behaviour — callers must validate)', () => {
    // Intl.DateTimeFormat.format() throws RangeError on Invalid Date. This is
    // an existing behaviour; callers (formatDate users) currently only ever
    // pass server-returned ISO strings or null, so this hasn't been a
    // problem in practice.
    expect(() => formatDate('not-a-date')).toThrow();
  });
});

describe('formatPeriod', () => {
  it('joins two short dates with an en-dash', () => {
    expect(formatPeriod('2026-03-12', '2026-03-26')).toMatch(/12 Mar.*26 Mar/);
  });
});
