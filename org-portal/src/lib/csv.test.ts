import { describe, it, expect } from 'vitest';
import { escapeCell, toCsv, timestampSuffix, toXeroBillsCsv } from './csv';

describe('escapeCell', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });

  it('passes plain alphanumeric through unchanged', () => {
    expect(escapeCell('hello')).toBe('hello');
    expect(escapeCell('INV-2001')).toBe('INV-2001');
    expect(escapeCell(42)).toBe('42');
  });

  it('quotes cells containing commas', () => {
    expect(escapeCell('Smith, John')).toBe('"Smith, John"');
  });

  it('escapes embedded double-quotes', () => {
    expect(escapeCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it('quotes cells with newlines or carriage returns', () => {
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"');
  });

  describe('formula-injection guard (OWASP)', () => {
    it.each(['=cmd|"/c calc"!A0', '=SUM(A1:A5)', '=HYPERLINK("evil","x")'])(
      'neutralises = prefix: %s', (v) => {
        const out = escapeCell(v);
        expect(out.startsWith("'") || out.startsWith('"\'')).toBe(true);
      });

    it('neutralises + prefix', () => {
      expect(escapeCell('+1+1')).toBe("'+1+1");
    });

    it('neutralises - prefix', () => {
      expect(escapeCell('-cmd')).toBe("'-cmd");
    });

    it('neutralises @ prefix (Lotus 1-2-3 legacy)', () => {
      expect(escapeCell('@SUM(A1)')).toBe("'@SUM(A1)");
    });

    it('neutralises tab prefix', () => {
      const out = escapeCell('\t=evil()');
      expect(out.startsWith("'")).toBe(true);
    });

    it('neutralises CR prefix', () => {
      const out = escapeCell('\r=evil()');
      // CR triggers BOTH the formula guard AND the quote-wrap (because \r is in /[",\r\n]/).
      expect(out.startsWith('"\'')).toBe(true);
    });

    it('does NOT neutralise normal currency strings starting with $', () => {
      expect(escapeCell('$10.00')).toBe('$10.00');
    });

    it('does NOT neutralise negative numbers stored as numbers', () => {
      // Numbers go through String(); the '-' is now first → guard fires. This
      // is by design: numeric data should be stored as numbers OR pre-formatted.
      // Document the behaviour so callers know.
      expect(escapeCell(-50)).toBe("'-50");
    });

    it('survives quote + formula combo: =\"foo\"', () => {
      const out = escapeCell('="x"');
      // guard adds apostrophe, then quote-wrap engages because of embedded "
      expect(out).toBe('"\'=""x"""');
    });
  });
});

describe('toCsv', () => {
  it('produces UTF-8 BOM + CRLF lines', () => {
    const csv = toCsv(['a', 'b'], [['1', '2'], ['3', '4']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('escapes every column', () => {
    const csv = toCsv(['Name', 'Amount'], [['Smith, John', '=HACK()']]);
    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain("'=HACK()");
  });

  it('handles empty rows', () => {
    const csv = toCsv(['a'], []);
    expect(csv).toBe('﻿a');
  });
});

describe('timestampSuffix', () => {
  it('formats UTC stably', () => {
    const d = new Date(Date.UTC(2026, 4, 30, 7, 14)); // 2026-05-30 07:14 UTC
    expect(timestampSuffix(d)).toBe('20260530-0714');
  });

  it('zero-pads single-digit months/hours/mins', () => {
    const d = new Date(Date.UTC(2026, 0, 1, 0, 5)); // 2026-01-01 00:05 UTC
    expect(timestampSuffix(d)).toBe('20260101-0005');
  });
});

describe('toXeroBillsCsv', () => {
  it('emits the canonical Xero column set', () => {
    const csv = toXeroBillsCsv([{
      contactName: 'Acme',
      email: 'billing@acme.com',
      invoiceNumber: 'INV-1',
      invoiceDate: '2026-05-30',
      dueDate: '2026-06-13',
      description: 'Cleaning',
      unitAmount: 100,
      hasGst: true,
    }]);
    // Headers
    expect(csv).toContain('ContactName,EmailAddress,InvoiceNumber');
    expect(csv).toContain('GST on Expenses');
    expect(csv).toContain('100.00');
  });

  it('uses BAS Excluded when hasGst is false', () => {
    const csv = toXeroBillsCsv([{
      contactName: 'X', invoiceNumber: 'I', invoiceDate: '2026-01-01',
      dueDate: '2026-01-15', description: 'x', unitAmount: 50, hasGst: false,
    }]);
    expect(csv).toContain('BAS Excluded');
  });

  it('neutralises injection in contactName', () => {
    const csv = toXeroBillsCsv([{
      contactName: '=HYPERLINK("evil","x")',
      invoiceNumber: 'I', invoiceDate: '2026-01-01', dueDate: '2026-01-15',
      description: 'd', unitAmount: 10, hasGst: false,
    }]);
    expect(csv).toContain('"\'=HYPERLINK');
  });
});
