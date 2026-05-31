import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./sentry', () => ({
  captureException: vi.fn(),
}));

import { friendlyError } from './errors';
import { captureException } from './sentry';

beforeEach(() => {
  // Silence the console.error log the helper emits for visibility.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.clearAllMocks();
});

describe('friendlyError', () => {
  it('returns the fallback when given non-error junk', () => {
    expect(friendlyError(null)).toMatch(/Something went wrong/);
    expect(friendlyError(undefined)).toMatch(/Something went wrong/);
    expect(friendlyError({})).toMatch(/Something went wrong/);
    expect(friendlyError(123)).toMatch(/Something went wrong/);
  });

  it('passes through a non-empty string verbatim', () => {
    expect(friendlyError('Custom message')).toBe('Custom message');
  });

  it('falls back when given an empty string', () => {
    expect(friendlyError('')).toMatch(/Something went wrong/);
  });

  it('maps Postgres 42501 (permission denied)', () => {
    expect(friendlyError({ code: '42501', message: 'permission denied' }))
      .toMatch(/don't have permission/);
    expect(friendlyError({ code: '', message: 'permission denied for table x' }))
      .toMatch(/don't have permission/);
    expect(friendlyError({ code: '', message: 'forbidden' }))
      .toMatch(/don't have permission/);
  });

  it('maps unique violation 23505', () => {
    expect(friendlyError({ code: '23505', message: 'duplicate key value' }))
      .toMatch(/already exists/);
  });

  it('maps check_violation / seat-limit', () => {
    expect(friendlyError({ code: '23514', message: 'check_violation' }))
      .toMatch(/organisation is full/);
    expect(friendlyError({ code: 'check_violation', message: 'Org seat limit reached' }))
      .toMatch(/organisation is full/);
    expect(friendlyError({ message: 'Org seat limit reached for plan starter' }))
      .toMatch(/organisation is full/);
  });

  it('maps network / fetch errors', () => {
    expect(friendlyError({ message: 'Failed to fetch' })).toMatch(/connection/);
    expect(friendlyError({ message: 'NetworkError when attempting' })).toMatch(/connection/);
  });

  it('maps Supabase auth surface errors', () => {
    expect(friendlyError({ message: 'Invalid login credentials' })).toMatch(/Wrong email or password/);
    expect(friendlyError({ message: 'User already registered' })).toMatch(/already in use/);
    expect(friendlyError({ message: 'For security purposes, you can only request this once every… rate-limited' }))
      .toMatch(/Too many attempts/);
  });

  it('maps org-portal-specific RPC errors', () => {
    expect(friendlyError({ message: 'Invitation expired' })).toMatch(/isn't valid/);
    expect(friendlyError({ message: 'Invitation not found' })).toMatch(/isn't valid/);
    expect(friendlyError({ message: 'Not authenticated' })).toMatch(/sign in again/i);
  });

  it('uses the custom fallback when provided', () => {
    expect(friendlyError({}, 'Custom fallback')).toBe('Custom fallback');
  });

  it('logs the original error to console for debugging', () => {
    const spy = vi.spyOn(console, 'error');
    friendlyError({ code: '42501', message: 'permission denied for schema public' });
    expect(spy).toHaveBeenCalled();
  });

  describe('Sentry forwarding', () => {
    it('forwards Error instances', () => {
      const e = new Error('boom');
      friendlyError(e);
      expect(captureException).toHaveBeenCalledWith(e, expect.any(Object));
    });

    it('forwards unknown PG errors (e.g. server-class)', () => {
      friendlyError({ code: '53300', message: 'too many connections' });
      expect(captureException).toHaveBeenCalled();
    });

    it('skips user-input violations (23505/23514/42501/pgrst204)', () => {
      friendlyError({ code: '23505', message: 'duplicate' });
      friendlyError({ code: '23514', message: 'check' });
      friendlyError({ code: '42501', message: 'denied' });
      friendlyError({ code: 'PGRST204' });
      expect(captureException).not.toHaveBeenCalled();
    });

    it('skips network failures', () => {
      friendlyError({ message: 'Failed to fetch' });
      friendlyError({ message: 'NetworkError when attempting' });
      expect(captureException).not.toHaveBeenCalled();
    });

    it('skips auth-surface errors', () => {
      friendlyError({ message: 'Invalid login' });
      friendlyError({ message: 'User already registered' });
      friendlyError({ message: 'rate limit' });
      expect(captureException).not.toHaveBeenCalled();
    });

    it('skips plain strings', () => {
      friendlyError('just text');
      expect(captureException).not.toHaveBeenCalled();
    });
  });
});
