import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TrialBanner } from './TrialBanner';

// Mock useOrg — TrialBanner only reads currentOrg.trial_ends_at
let mockTrialEndsAt: string | null = null;
vi.mock('@/lib/org', () => ({
  useOrg: () => ({
    currentOrg: mockTrialEndsAt === undefined
      ? null
      : { trial_ends_at: mockTrialEndsAt },
  }),
}));

function setup() {
  return render(
    <BrowserRouter>
      <TrialBanner />
    </BrowserRouter>,
  );
}

describe('TrialBanner', () => {
  it('renders nothing when there is no trial date', () => {
    mockTrialEndsAt = null;
    const { container } = setup();
    expect(container.textContent).toBe('');
  });

  it('renders nothing when trial already expired', () => {
    mockTrialEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { container } = setup();
    expect(container.textContent).toBe('');
  });

  it('renders nothing when more than threshold days remain', () => {
    mockTrialEndsAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = setup();
    expect(container.textContent).toBe('');
  });

  it('renders banner inside the 14-day window', () => {
    mockTrialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setup();
    expect(screen.getByText(/Trial ends/)).toBeDefined();
    expect(screen.getByText(/in 7 days|in 6 days/)).toBeDefined();
  });

  it('shows "today" when less than 24h remain', () => {
    mockTrialEndsAt = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
    setup();
    expect(screen.getByText(/Trial ends today/)).toBeDefined();
  });

  it('shows "in 1 day" for ~1.5 days', () => {
    mockTrialEndsAt = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
    setup();
    expect(screen.getByText(/Trial ends in 1 day/)).toBeDefined();
  });

  it('shows the urgent (rose) styling under 3 days', () => {
    mockTrialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = setup();
    expect(container.innerHTML).toContain('rose');
  });
});
