import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Trigger({ msg, kind = 'info' as const }: { msg: string; kind?: 'success' | 'error' | 'info' }) {
  const { notify } = useToast();
  return <button onClick={() => notify(msg, kind)}>fire</button>;
}

describe('ToastProvider', () => {
  it('renders a notified message', async () => {
    render(
      <ToastProvider>
        <Trigger msg="Hello world" />
      </ToastProvider>,
    );
    act(() => { screen.getByText('fire').click(); });
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('handles two simultaneous notifications without key collision', async () => {
    render(
      <ToastProvider>
        <Trigger msg="alpha" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText('fire').click();
      screen.getByText('fire').click();
    });
    const all = screen.getAllByText('alpha');
    expect(all).toHaveLength(2);
  });

  it('dismisses after the timeout (auto-clear)', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger msg="ephemeral" />
      </ToastProvider>,
    );
    act(() => { screen.getByText('fire').click(); });
    expect(screen.getByText('ephemeral')).toBeDefined();
    act(() => { vi.advanceTimersByTime(4001); });
    expect(screen.queryByText('ephemeral')).toBeNull();
    vi.useRealTimers();
  });

  it('throws when useToast is used outside the provider', () => {
    // Suppress the expected error.
    const orig = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Trigger msg="x" />)).toThrow();
    } finally {
      console.error = orig;
    }
  });
});

import { vi } from 'vitest';
