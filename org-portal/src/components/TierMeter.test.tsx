import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierMeter } from './TierMeter';

describe('TierMeter', () => {
  it('shows Crew label + per-seat price for small orgs', () => {
    render(<TierMeter seats={3} lookupKey={null} />);
    expect(screen.getByText('Crew')).toBeDefined();
    expect(screen.getByText(/\$14\.99/)).toBeDefined();
  });

  it('shows Squad for 6-15 seats', () => {
    render(<TierMeter seats={10} lookupKey="org_t2_monthly" />);
    expect(screen.getByText('Squad')).toBeDefined();
    expect(screen.getByText(/\$12\.99/)).toBeDefined();
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
    // 5 × 14.99 = 74.95
    expect(screen.getByText(/\$74\.95/)).toBeDefined();
  });

  it('shows next-tier upgrade hint when under the boundary', () => {
    const { container } = render(<TierMeter seats={3} lookupKey="org_t1_monthly" />);
    // Text is split across nodes ("Add <strong>3</strong> more seats") so
    // we match the rendered textContent rather than a single element.
    expect(container.textContent).toMatch(/Add\s*3\s*more seat/);
  });

  it('shows Talk to sales for Custom tier (101+ seats)', () => {
    render(<TierMeter seats={120} lookupKey={null} />);
    expect(screen.getByText('Custom')).toBeDefined();
    expect(screen.getByText(/Talk to sales/i)).toBeDefined();
  });

  it('renders without crashing for seats=0 (degrades to Tier 1)', () => {
    expect(() => render(<TierMeter seats={0} lookupKey={null} />)).not.toThrow();
  });
});
