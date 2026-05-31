import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierMeter } from './TierMeter';

describe('TierMeter', () => {
  it('shows Tier 1 label + per-seat price for small orgs', () => {
    render(<TierMeter seats={3} lookupKey={null} />);
    expect(screen.getByText(/Tier 1/)).toBeDefined();
    expect(screen.getByText(/\$12\.99/)).toBeDefined();
  });

  it('shows Tier 2 for 6-15 seats', () => {
    render(<TierMeter seats={10} lookupKey="org_t2_monthly" />);
    expect(screen.getByText(/Tier 2/)).toBeDefined();
    expect(screen.getByText(/\$10\.99/)).toBeDefined();
  });

  it('shows monthly cadence label for monthly key', () => {
    render(<TierMeter seats={3} lookupKey="org_t1_monthly" />);
    expect(screen.getByText(/Billed monthly/i)).toBeDefined();
  });

  it('shows annual cadence label for annual key', () => {
    render(<TierMeter seats={3} lookupKey="org_t1_annual" />);
    expect(screen.getByText(/Billed annually/i)).toBeDefined();
  });

  it('shows total /mo at current seats', () => {
    render(<TierMeter seats={5} lookupKey="org_t1_monthly" />);
    // 5 × 12.99 = 64.95
    expect(screen.getByText(/\$64\.95/)).toBeDefined();
  });

  it('shows next-tier upgrade hint when under the boundary', () => {
    render(<TierMeter seats={3} lookupKey="org_t1_monthly" />);
    expect(screen.getByText(/Add 3 more seat/)).toBeDefined();
  });

  it('does not show next-tier hint at top tier', () => {
    const { container } = render(<TierMeter seats={75} lookupKey="org_t4_monthly" />);
    expect(container.textContent ?? '').not.toContain('Add');
  });

  it('renders without crashing for seats=0 (degrades to Tier 1)', () => {
    expect(() => render(<TierMeter seats={0} lookupKey={null} />)).not.toThrow();
  });
});
