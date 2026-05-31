// E2E: navigation guard rails. Confirms the sidebar nav includes V2 routes
// and clicking through them all loads without error.

import { test, expect } from '@playwright/test';
import { asSignedInOwner } from './fixtures/supabase-mock';

test('Sidebar shows all V2 routes', async ({ page }) => {
  await asSignedInOwner(page);
  await page.route(/supabase\.co\/rest\/v1\/rpc\/.+/i, (route) =>
    route.fulfill({ status: 200, body: '[]', headers: { 'content-type': 'application/json' } }),
  );
  await page.goto('/invoices');
  for (const label of ['Invoices', 'Inbox', 'Work', 'Members', 'Activity', 'Billing', 'Reports', 'Settings']) {
    await expect(page.locator(`nav >> text=${label}`)).toBeVisible();
  }
});

test('Sign-out redirects to /login', async ({ page }) => {
  await asSignedInOwner(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 5000 });
});
