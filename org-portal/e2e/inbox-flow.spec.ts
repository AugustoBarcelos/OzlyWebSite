// E2E: Inbox page — empty state, populated state, missing-migration banner,
// search debounce, status filter.

import { test, expect } from '@playwright/test';
import { asSignedInOwner } from './fixtures/supabase-mock';

const sampleRows = [
  {
    id: 'r1',
    invoice_id: 'i1',
    invoice_number: 'INV-2001',
    invoice_total: 1240,
    invoice_issue: '2026-05-27',
    sender_user_id: 'u1',
    sender_name: 'Maria Cleaner',
    sender_email: 'demo.maria@example.com',
    delivered_to: 'billing@acme.test',
    cc_sender: false,
    status: 'sent',
    status_detail: null,
    sent_at: '2026-05-30T10:00:00Z',
    created_at: '2026-05-30T09:55:00Z',
    total_rows: 1,
  },
];

test('Inbox — empty state', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_inbox_list/i, (route) =>
    route.fulfill({ status: 200, body: '[]', headers: { 'content-type': 'application/json' } }),
  );
  await page.goto('/inbox');
  await expect(page.locator('h1', { hasText: 'Inbox' })).toBeVisible();
  await expect(page.locator('text=/No invoices delivered yet/i')).toBeVisible();
});

test('Inbox — populated state renders rows', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_inbox_list/i, (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify(sampleRows),
      headers: { 'content-type': 'application/json' },
    }),
  );
  await page.goto('/inbox');
  await expect(page.locator('text=INV-2001')).toBeVisible();
  await expect(page.locator('text=Maria Cleaner')).toBeVisible();
  await expect(page.locator('text=Delivered')).toBeVisible();
});

test('Inbox — shows migration-missing banner if RPC absent (PGRST202)', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_inbox_list/i, (route) =>
    route.fulfill({
      status: 404,
      body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }),
      headers: { 'content-type': 'application/json' },
    }),
  );
  await page.goto('/inbox');
  await expect(page.locator('text=/Inbox not enabled yet/i')).toBeVisible();
});

test('Inbox — shows billing_email warning when org has no inbox set', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/organizations/i, (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify([{
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Acme', abn: null, admin_email: 'a@b.test',
        billing_email: null,            // ← unset
        billing_plan: 'free', trial_ends_at: null,
        created_at: '2026-05-01T00:00:00Z',
        period_frequency: 'fortnightly', period_anchor: null,
      }]),
      headers: { 'content-type': 'application/json' },
    }),
  );
  await page.route(/supabase\.co\/rest\/v1\/rpc\/org_inbox_list/i, (route) =>
    route.fulfill({ status: 200, body: '[]', headers: { 'content-type': 'application/json' } }),
  );
  await page.goto('/inbox');
  await expect(page.locator('text=/No billing email configured yet/i')).toBeVisible();
});
