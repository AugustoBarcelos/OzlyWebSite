// E2E: Settings page — billing_email field validation + save flow,
// reporting period section, ABN validation.

import { test, expect } from '@playwright/test';
import { asSignedInOwner } from './fixtures/supabase-mock';

test('Settings — billing_email input rejects invalid format', async ({ page }) => {
  await asSignedInOwner(page);
  await page.goto('/settings');
  // Section is rendered
  await expect(page.locator('text=Inbox email')).toBeVisible();
  // Type an invalid email
  const input = page.locator('input[type="email"]').first();
  await input.fill('not-an-email');
  const saveBtn = page.locator('button', { hasText: /Save inbox email/i });
  await saveBtn.click();
  await expect(page.locator('text=/Enter a valid email or leave blank/i')).toBeVisible();
});

test('Settings — ABN field rejects non-11-digit values', async ({ page }) => {
  await asSignedInOwner(page);
  await page.goto('/settings');
  const abnInput = page.locator('input[placeholder*="12 345 678 901"]');
  await abnInput.fill('12345');
  await page.locator('button', { hasText: /Save changes/i }).click();
  await expect(page.locator('text=/ABN must be 11 digits/i')).toBeVisible();
});

test('Settings — page header + reporting period section visible', async ({ page }) => {
  await asSignedInOwner(page);
  await page.goto('/settings');
  await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible();
  await expect(page.locator('text=/Reporting period/i')).toBeVisible();
});
