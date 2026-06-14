import { afterEach, describe, expect, it } from 'vitest';
import { rememberEmail, recallEmail } from './last-email';

describe('last-email', () => {
  afterEach(() => sessionStorage.clear());

  it('returns empty string when nothing remembered', () => {
    expect(recallEmail()).toBe('');
  });

  it('round-trips a remembered email', () => {
    rememberEmail('you@company.com.au');
    expect(recallEmail()).toBe('you@company.com.au');
  });

  it('trims surrounding whitespace', () => {
    rememberEmail('  you@company.com.au  ');
    expect(recallEmail()).toBe('you@company.com.au');
  });

  it('ignores empty / whitespace-only input', () => {
    rememberEmail('first@x.com');
    rememberEmail('   ');
    expect(recallEmail()).toBe('first@x.com');
  });
});
