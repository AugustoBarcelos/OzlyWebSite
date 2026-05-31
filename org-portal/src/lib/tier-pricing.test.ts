import { describe, it, expect } from 'vitest';
import {
  TIERS, DOWNGRADE_REASONS,
  tierForSeats, tierByLookupKey, isAnnual, intervalFromKey,
  unitMonthlyPrice, totalAmount, nextTier, savingsAtNextTier,
} from './tier-pricing';

describe('TIERS catalog', () => {
  it('has 5 tiers with strictly increasing ranks (4 self-serve + 1 custom)', () => {
    expect(TIERS).toHaveLength(5);
    TIERS.forEach((t, i) => expect(t.rank).toBe(i + 1));
  });

  it('has no seat-range overlap', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]!.minSeats).toBe((TIERS[i - 1]!.maxSeats ?? 0) + 1);
    }
  });

  it('annual is monthly × 10 (≈17% off) for self-serve tiers', () => {
    TIERS.filter((t) => !t.contactSales).forEach((t) => {
      expect(t.unitAnnualPerYear).toBeCloseTo(t.unitMonthly * 10, 1);
    });
  });

  it('custom tier has zero price + contactSales flag', () => {
    const custom = TIERS[4]!;
    expect(custom.key).toBe('org_custom');
    expect(custom.unitMonthly).toBe(0);
    expect(custom.unitAnnualPerYear).toBe(0);
    expect(custom.contactSales).toBe(true);
    expect(custom.monthlyLookupKey).toBeNull();
    expect(custom.annualLookupKey).toBeNull();
  });

  it('confirmed V2 prices (middle-ground self-serve)', () => {
    expect(TIERS.map((t) => t.unitMonthly)).toEqual([14.99, 12.99, 9.99, 7.99, 0]);
  });
});

describe('tierForSeats', () => {
  it('maps small orgs to Tier 1 (Crew)', () => {
    [1, 2, 3, 4, 5].forEach((n) => expect(tierForSeats(n).key).toBe('org_t1'));
  });
  it('Tier 2 (Squad) covers 6–15', () => {
    [6, 10, 15].forEach((n) => expect(tierForSeats(n).key).toBe('org_t2'));
  });
  it('Tier 3 (Fleet) covers 16–30', () => {
    [16, 25, 30].forEach((n) => expect(tierForSeats(n).key).toBe('org_t3'));
  });
  it('Tier 4 (Operation) covers 31–100', () => {
    [31, 75, 100].forEach((n) => expect(tierForSeats(n).key).toBe('org_t4'));
  });
  it('zero or negative seats fall to Tier 1 (least surprise)', () => {
    expect(tierForSeats(0).key).toBe('org_t1');
    expect(tierForSeats(-5).key).toBe('org_t1');
  });
  it('>100 seats land on Custom (sales-led)', () => {
    expect(tierForSeats(101).key).toBe('org_custom');
    expect(tierForSeats(500).key).toBe('org_custom');
  });
});

describe('tierByLookupKey', () => {
  it('resolves monthly key to its tier', () => {
    expect(tierByLookupKey('org_t2_monthly')?.key).toBe('org_t2');
  });
  it('resolves annual key to the same tier', () => {
    expect(tierByLookupKey('org_t2_annual')?.key).toBe('org_t2');
  });
  it('returns null for unknown / undefined', () => {
    expect(tierByLookupKey(undefined)).toBeNull();
    expect(tierByLookupKey(null)).toBeNull();
    expect(tierByLookupKey('bogus')).toBeNull();
  });
});

describe('isAnnual / intervalFromKey', () => {
  it('returns true for annual keys', () => {
    expect(isAnnual('org_t1_annual')).toBe(true);
    expect(isAnnual('org_t4_annual')).toBe(true);
  });
  it('returns false for monthly + null', () => {
    expect(isAnnual('org_t1_monthly')).toBe(false);
    expect(isAnnual(null)).toBe(false);
    expect(isAnnual(undefined)).toBe(false);
  });
  it('intervalFromKey returns year/month accordingly', () => {
    expect(intervalFromKey('org_t1_annual')).toBe('year');
    expect(intervalFromKey('org_t1_monthly')).toBe('month');
    expect(intervalFromKey(null)).toBe('month');
  });
});

describe('unitMonthlyPrice', () => {
  it('returns unitMonthly for monthly interval', () => {
    expect(unitMonthlyPrice(TIERS[0]!, 'month')).toBe(14.99);
  });
  it('returns annual / 12 for annual interval', () => {
    expect(unitMonthlyPrice(TIERS[0]!, 'year')).toBeCloseTo(149.90 / 12, 2);
  });
});

describe('totalAmount', () => {
  it('rounds to 2dp', () => {
    expect(totalAmount(5, TIERS[0]!, 'month')).toBe(74.95);
  });
  it('matches per-seat math at boundaries', () => {
    expect(totalAmount(6, TIERS[1]!, 'month')).toBeCloseTo(77.94, 2);
  });
});

describe('nextTier', () => {
  it('returns the next higher tier', () => {
    expect(nextTier(TIERS[0]!)?.key).toBe('org_t2');
    expect(nextTier(TIERS[2]!)?.key).toBe('org_t4');
  });
  it('returns Custom from Tier 4', () => {
    expect(nextTier(TIERS[3]!)?.key).toBe('org_custom');
  });
  it('returns null at the top (Custom)', () => {
    expect(nextTier(TIERS[4]!)).toBeNull();
  });
});

describe('savingsAtNextTier', () => {
  it('reports seatsNeeded for under-tier seat counts', () => {
    const r = savingsAtNextTier(3, TIERS[0]!, 'month');
    expect(r?.next.key).toBe('org_t2');
    expect(r?.seatsNeeded).toBe(3); // 3 → need 3 more to hit 6
  });
  it('reports zero seatsNeeded when already at next-tier threshold', () => {
    const r = savingsAtNextTier(6, TIERS[0]!, 'month');
    expect(r?.seatsNeeded).toBe(0);
  });
  it('returns null when next tier is Custom (sales-led, no price math)', () => {
    expect(savingsAtNextTier(75, TIERS[3]!, 'month')).toBeNull();
  });
  it('returns null at Custom (already top)', () => {
    expect(savingsAtNextTier(200, TIERS[4]!, 'month')).toBeNull();
  });
});

describe('DOWNGRADE_REASONS', () => {
  it('lists all canonical reasons (must match SQL CHECK)', () => {
    expect(DOWNGRADE_REASONS.map((r) => r.key)).toEqual(
      ['team_shrunk', 'cost', 'underused', 'missing_feature', 'other'],
    );
  });
});
