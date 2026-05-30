import { describe, it, expect } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  const ORIGIN = 'https://ozly.app';

  it('returns fallback when input is null/undefined/empty', () => {
    expect(safeRedirect(null, ORIGIN)).toBe('/invoices');
    expect(safeRedirect(undefined, ORIGIN)).toBe('/invoices');
    expect(safeRedirect('', ORIGIN)).toBe('/invoices');
  });

  it('returns fallback when input does not start with /', () => {
    expect(safeRedirect('invoices', ORIGIN)).toBe('/invoices');
    expect(safeRedirect('https://evil.com', ORIGIN)).toBe('/invoices');
    expect(safeRedirect('javascript:alert(1)', ORIGIN)).toBe('/invoices');
  });

  it('blocks protocol-relative URLs (//host)', () => {
    expect(safeRedirect('//evil.com/x', ORIGIN)).toBe('/invoices');
    expect(safeRedirect('//ozly.app.attacker.com', ORIGIN)).toBe('/invoices');
  });

  it('blocks backslash-and-dot tricks the URL parser normalises', () => {
    // Some attackers smuggle hostnames via `/\evil.com` — modern browsers
    // normalise the backslash to a slash, which `new URL()` also does. Our
    // origin check still catches it.
    const got = safeRedirect('/\\evil.com/path', ORIGIN);
    expect(got).toBe('/invoices');
  });

  it('blocks Unicode-encoded protocol-relative tricks', () => {
    expect(safeRedirect('/%2F%2Fevil.com/path', ORIGIN)).toBe('/%2F%2Fevil.com/path');
    // ^ percent-encoded slashes are NOT decoded by URL → they stay as path
    // segments, which still resolves to the same origin (safe).
    expect(safeRedirect('///evil.com', ORIGIN)).toBe('/invoices');
  });

  it('preserves a legitimate same-origin path with query + hash', () => {
    expect(safeRedirect('/work?period=this&filter=open#sec', ORIGIN))
      .toBe('/work?period=this&filter=open#sec');
  });

  it('preserves a bare path', () => {
    expect(safeRedirect('/invoices', ORIGIN)).toBe('/invoices');
    expect(safeRedirect('/billing', ORIGIN)).toBe('/billing');
  });

  it('respects the custom fallback param', () => {
    expect(safeRedirect(null, ORIGIN, '/dashboard')).toBe('/dashboard');
    expect(safeRedirect('//evil.com', ORIGIN, '/safe')).toBe('/safe');
  });

  it('preserves a same-origin path even when query contains weird chars', () => {
    // `new URL(rel, base)` accepts a wide range of inputs as long as it
    // stays same-origin — that's safe. Document the behaviour so it doesn't
    // surprise anyone reading the test later.
    expect(safeRedirect('/work?from=%E0%A4%A', ORIGIN)).toBe('/work?from=%E0%A4%A');
  });
});
