// Sub-contractor compliance state — derived client-side from existing fields
// for now (no ABR API call yet). When the real verification edge function
// lands, swap `mockComplianceFor` for an async fetch + cache. Keeps the call
// sites stable.
//
// Mock logic:
//   - ABN field empty/length<11   → 'missing'
//   - Stable hash of email → 70% verified, 20% pending, 10% expiring
//   - Insurance status derived from same hash, different bucket
// Deterministic so it doesn't flicker between renders.

export type AbnStatus = 'verified' | 'pending' | 'missing' | 'invalid';
export type InsuranceStatus = 'current' | 'expiring' | 'missing';
export type AgreementStatus = 'signed' | 'pending';

export interface ComplianceState {
  abn: AbnStatus;
  abnNumber?: string;          // formatted "12 345 678 901"
  insurance: InsuranceStatus;
  insuranceExpiresAt?: string; // ISO
  agreement: AgreementStatus;
  /** Overall flag for at-a-glance badge — green if all good, amber if pending, red if blocking. */
  overall: 'ok' | 'warn' | 'blocked';
}

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return Math.abs(h);
}

function formatAbn(s: string): string {
  // "12345678901" → "12 345 678 901"
  if (s.length !== 11) return s;
  return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 8)} ${s.slice(8, 11)}`;
}

export function mockComplianceFor(opts: {
  email?: string | null;
  rawAbn?: string | null;
}): ComplianceState {
  const seed = (opts.email ?? 'anon').toLowerCase();
  const h = hash(seed);

  // ABN — empty wins. Otherwise deterministic by hash.
  const abnDigits = (opts.rawAbn ?? '').replace(/\D/g, '');
  let abn: AbnStatus;
  let abnNumber: string | undefined;
  if (!abnDigits) {
    abn = 'missing';
  } else if (abnDigits.length !== 11) {
    abn = 'invalid';
    abnNumber = abnDigits;
  } else {
    const bucket = h % 10;
    abn = bucket < 7 ? 'verified' : bucket < 9 ? 'pending' : 'verified';
    abnNumber = formatAbn(abnDigits);
  }

  // If no real ABN, generate a deterministic one for display only (so the
  // mock shows a plausible state instead of dashes everywhere).
  if (!abnNumber && abn === 'missing' && opts.email) {
    const fake = String(h).padStart(11, '0').slice(-11);
    abnNumber = formatAbn(fake);
    abn = (h % 10) < 6 ? 'verified' : (h % 10) < 8 ? 'pending' : 'missing';
  }

  // Insurance — different hash bucket
  const insBucket = (h >> 4) % 10;
  let insurance: InsuranceStatus;
  let insuranceExpiresAt: string | undefined;
  if (insBucket < 6) {
    insurance = 'current';
    // Random-ish expiry 4-11 months out
    const days = 120 + (insBucket * 40);
    insuranceExpiresAt = new Date(Date.now() + days * 86400_000).toISOString();
  } else if (insBucket < 8) {
    insurance = 'expiring';
    const days = 5 + (insBucket * 2); // 5..19 days
    insuranceExpiresAt = new Date(Date.now() + days * 86400_000).toISOString();
  } else {
    insurance = 'missing';
  }

  // Agreement — 90% signed
  const agreement: AgreementStatus = (h >> 8) % 10 < 9 ? 'signed' : 'pending';

  const overall: ComplianceState['overall'] =
    abn === 'verified' && insurance === 'current' && agreement === 'signed'
      ? 'ok'
      : abn === 'missing' || abn === 'invalid' || insurance === 'missing' || agreement === 'pending'
        ? 'blocked'
        : 'warn';

  const result: ComplianceState = { abn, insurance, agreement, overall };
  if (abnNumber !== undefined) result.abnNumber = abnNumber;
  if (insuranceExpiresAt !== undefined) result.insuranceExpiresAt = insuranceExpiresAt;
  return result;
}

export function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400_000);
}
