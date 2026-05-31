import { describe, it, expect } from 'vitest';
import { resolveBillingSource, configFor } from './orgMembers';

describe('resolveBillingSource', () => {
  it('returns none when nothing is set', () => {
    expect(resolveBillingSource({
      hasOrgSubsidy: false, topupAbn: false, topupPro: false, selfAbn: false, selfPro: false,
    })).toBe('none');
  });

  it('returns org_only when subsidy is the sole source', () => {
    expect(resolveBillingSource({
      hasOrgSubsidy: true, topupAbn: false, topupPro: false, selfAbn: false, selfPro: false,
    })).toBe('org_only');
  });

  it('returns topup_abn when subsidy + ABN top-up', () => {
    expect(resolveBillingSource({
      hasOrgSubsidy: true, topupAbn: true, topupPro: false, selfAbn: false, selfPro: false,
    })).toBe('topup_abn');
  });

  it('returns topup_pro when subsidy + PRO top-up (PRO beats ABN)', () => {
    expect(resolveBillingSource({
      hasOrgSubsidy: true, topupAbn: true, topupPro: true, selfAbn: false, selfPro: false,
    })).toBe('topup_pro');
  });

  it('self-paid PRO outranks everything', () => {
    expect(resolveBillingSource({
      hasOrgSubsidy: true, topupAbn: true, topupPro: true, selfAbn: true, selfPro: true,
    })).toBe('self_paid_pro');
  });

  it('self-paid ABN outranks subsidy + topups', () => {
    expect(resolveBillingSource({
      hasOrgSubsidy: true, topupAbn: true, topupPro: false, selfAbn: true, selfPro: false,
    })).toBe('self_paid_abn');
  });

  it('topup without subsidy stays "none" (topup alone is invalid)', () => {
    // The store SKU is invisible to users without an active org cover, so this
    // shouldn't happen — but if it does, we don't claim "topup_abn" on its own.
    expect(resolveBillingSource({
      hasOrgSubsidy: false, topupAbn: true, topupPro: false, selfAbn: false, selfPro: false,
    })).toBe('none');
  });
});

describe('configFor', () => {
  it('returns the per-user config when present', () => {
    const map = { u1: { frequency: 'weekly' as const, anchor: '2026-01-01' } };
    expect(configFor(map, 'u1').frequency).toBe('weekly');
  });

  it('falls back to default fortnightly when user not in map', () => {
    expect(configFor({}, 'nobody')).toEqual({ frequency: 'fortnightly', anchor: null });
  });
});
