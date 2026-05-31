// Shared test helpers for component tests. Centralised so individual specs
// don't re-mock the same providers.

import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/Toast';
import type { ReactNode } from 'react';

export function renderWithProviders(ui: ReactNode) {
  return (
    <BrowserRouter>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>
  );
}

// Test fixtures matching the V2 Organization shape.
export const mockOrg = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Acme Cleaning',
  abn: '12345678901',
  admin_email: 'owner@acme.test',
  billing_email: 'billing@acme.test',
  billing_plan: 'free' as const,
  trial_ends_at: null as string | null,
  created_at: '2026-05-01T00:00:00Z',
  period_frequency: 'fortnightly' as const,
  period_anchor: null as string | null,
};
