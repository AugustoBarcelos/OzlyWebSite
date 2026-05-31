import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MixedBillingBadge } from './MixedBillingBadge';

describe('MixedBillingBadge', () => {
  it('renders the org_only label', () => {
    render(<MixedBillingBadge source="org_only" />);
    expect(screen.getByText(/On org plan/)).toBeDefined();
  });

  it('renders the topup_abn label', () => {
    render(<MixedBillingBadge source="topup_abn" />);
    expect(screen.getByText(/ABN top-up/)).toBeDefined();
  });

  it('renders the topup_pro label', () => {
    render(<MixedBillingBadge source="topup_pro" />);
    expect(screen.getByText(/PRO top-up/)).toBeDefined();
  });

  it('renders the self_paid_abn label', () => {
    render(<MixedBillingBadge source="self_paid_abn" />);
    expect(screen.getByText(/Self-paid ABN/)).toBeDefined();
  });

  it('renders the self_paid_pro label', () => {
    render(<MixedBillingBadge source="self_paid_pro" />);
    expect(screen.getByText(/Self-paid PRO/)).toBeDefined();
  });

  it('surfaces description as title attr (a11y for tooltips)', () => {
    const { container } = render(<MixedBillingBadge source="topup_abn" />);
    const span = container.querySelector('[title]');
    expect(span?.getAttribute('title')).toContain('$5');
  });
});
