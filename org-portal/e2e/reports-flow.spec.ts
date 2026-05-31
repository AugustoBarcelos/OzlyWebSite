// E2E: Reports page — BAS quarterly + P&L. Tests the missing-RPC banner and
// the happy-path render with sample data.

import { test, expect } from '@playwright/test';
import { asSignedInOwner } from './fixtures/supabase-mock';

const sampleBas = [
  {
    invoice_id: 'i1',
    invoice_number: 'INV-2001',
    issue_date: '2026-08-15',
    member_email: 'demo.maria@example.com',
    member_abn: '12345678901',
    subtotal: 1100,
    gst_amount: 110,
    total: 1210,
    paid_at: '2026-08-20T00:00:00Z',
    status: 'paid',
  },
];

const samplePnl = [{
  total_revenue: 5000,
  total_gst: 500,
  total_paid: 4500,
  total_outstanding: 1000,
  invoice_count: 8,
  paid_invoice_count: 6,
  members_invoiced: 3,
  largest_member_email: 'demo.maria@example.com',
  largest_member_total: 2200,
}];

test('Reports — renders BAS table from RPC', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_bas_quarterly/i, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify(sampleBas), headers: { 'content-type': 'application/json' } }),
  );
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_pnl/i, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify(samplePnl), headers: { 'content-type': 'application/json' } }),
  );
  await page.goto('/reports');
  await expect(page.locator('h1', { hasText: 'Reports' })).toBeVisible();
  await expect(page.locator('text=INV-2001')).toBeVisible();
  await expect(page.locator('text=/GST collected/i')).toBeVisible();
});

test('Reports — shows missing migration banner when RPC absent', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_bas_quarterly/i, (route) =>
    route.fulfill({
      status: 404,
      body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }),
      headers: { 'content-type': 'application/json' },
    }),
  );
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_pnl/i, (route) =>
    route.fulfill({
      status: 404,
      body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }),
      headers: { 'content-type': 'application/json' },
    }),
  );
  await page.goto('/reports');
  await expect(page.locator('text=/Reports not enabled yet/i')).toBeVisible();
});

test('Reports — exports CSV button visible when rows present', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_bas_quarterly/i, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify(sampleBas), headers: { 'content-type': 'application/json' } }),
  );
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_pnl/i, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify(samplePnl), headers: { 'content-type': 'application/json' } }),
  );
  await page.goto('/reports');
  await expect(page.locator('button', { hasText: /Export CSV/i })).toBeVisible();
});
