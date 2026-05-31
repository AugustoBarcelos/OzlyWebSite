import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DowngradeReasonModal } from './DowngradeReasonModal';
import { TIERS } from '@/lib/tier-pricing';

const fromTier = TIERS[1]!; // Tier 2
const toTier = TIERS[0]!;   // Tier 1

describe('DowngradeReasonModal', () => {
  it('renders title + tier transition + pricing delta', () => {
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={() => {}} onConfirm={async () => {}}
      />,
    );
    expect(screen.getByText(/Before you go/i)).toBeDefined();
    // Tier 1 = Crew, Tier 2 = Squad after the V2 rename.
    expect(screen.getByText(/Squad/i)).toBeDefined();
    expect(screen.getByText(/Crew/i)).toBeDefined();
  });

  it('disables Confirm button until a reason is picked', () => {
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={() => {}} onConfirm={async () => {}}
      />,
    );
    const confirmBtn = screen.getByRole('button', { name: /Confirm downgrade/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables Confirm once a reason is selected', async () => {
    const user = userEvent.setup();
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={() => {}} onConfirm={async () => {}}
      />,
    );
    await user.click(screen.getByLabelText(/Cost is too high/i));
    const confirmBtn = screen.getByRole('button', { name: /Confirm downgrade/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the "other reason" textarea only when "Other" is picked', async () => {
    const user = userEvent.setup();
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={() => {}} onConfirm={async () => {}}
      />,
    );
    expect(screen.queryByPlaceholderText(/Tell us briefly/i)).toBeNull();
    await user.click(screen.getByLabelText(/Other/i));
    expect(screen.getByPlaceholderText(/Tell us briefly/i)).toBeDefined();
  });

  it('passes selected reason + contact flag to onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => {});
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={() => {}} onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByLabelText(/Our team shrunk/i));
    await user.click(screen.getByText(/Contact me/i));
    await user.click(screen.getByRole('button', { name: /Confirm downgrade/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({
      reason: 'team_shrunk',
      reasonOther: null,
      contactRequested: true,
    }));
  });

  it('passes reason_other when Other selected', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => {});
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={() => {}} onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByLabelText(/Other/i));
    const textarea = screen.getByPlaceholderText(/Tell us briefly/i);
    fireEvent.change(textarea, { target: { value: 'Found a competitor' } });
    await user.click(screen.getByRole('button', { name: /Confirm downgrade/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({
      reason: 'other',
      reasonOther: 'Found a competitor',
      contactRequested: false,
    }));
  });

  it('invokes onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <DowngradeReasonModal
        fromTier={fromTier} toTier={toTier} interval="month" seats={10}
        onCancel={onCancel} onConfirm={async () => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
