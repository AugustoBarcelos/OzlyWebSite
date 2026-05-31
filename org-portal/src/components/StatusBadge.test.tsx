import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoiceStatusBadge, MemberStatusBadge, StatusBadge } from './StatusBadge';

describe('InvoiceStatusBadge', () => {
  it('renders each known status label', () => {
    (['draft', 'sent', 'overdue', 'paid'] as const).forEach((s) => {
      const { container, unmount } = render(<InvoiceStatusBadge status={s} />);
      expect(container.textContent).toContain(s);
      unmount();
    });
  });
});

describe('MemberStatusBadge', () => {
  it('renders pending / accepted / declined / removed', () => {
    (['pending', 'accepted', 'declined', 'removed'] as const).forEach((s) => {
      const { container, unmount } = render(<MemberStatusBadge status={s} />);
      expect(container.textContent).toContain(s);
      unmount();
    });
  });
});

describe('StatusBadge (generic, tone-based)', () => {
  it('renders the supplied label', () => {
    render(<StatusBadge tone="positive" label="Delivered" />);
    expect(screen.getByText('Delivered')).toBeDefined();
  });

  it('applies the tone class', () => {
    const { container } = render(<StatusBadge tone="danger" label="Failed" />);
    expect(container.innerHTML).toContain('rose');
  });

  it('handles all 5 tones without crashing', () => {
    (['positive', 'warning', 'danger', 'neutral', 'info'] as const).forEach((tone) => {
      expect(() => render(<StatusBadge tone={tone} label={tone} />)).not.toThrow();
    });
  });
});
