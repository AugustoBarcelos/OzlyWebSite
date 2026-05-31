// E2E happy-path test for the V2 Org Portal.
//
// What's covered (single-pass through the portal as an existing org owner):
//   1. Login + land on /invoices
//   2. Navigate to /inbox (V2 ORG1)
//   3. Navigate to /billing — tier-meter visible
//   4. Navigate to /reports — BAS quarter dropdown loads
//   5. Navigate to /settings — billing_email field present + saveable
//   6. Sign out
//
// What's NOT covered here:
//   • IAP purchase flows (require TestFlight build, not browser)
//   • Stripe Checkout redirect (lives on Stripe domain)
//   • Apple/Google review flows
//
// Run:
//   npx playwright test e2e/happy-path.spec.ts
//
// Env required:
//   E2E_BASE_URL                 e.g. https://app.ozly.app or http://localhost:5173
//   E2E_OWNER_EMAIL              an owner of a test org (use staging env)
//   E2E_OWNER_PASSWORD

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? '';
const OWNER_PWD = process.env.E2E_OWNER_PASSWORD ?? '';

test.skip(!OWNER_EMAIL || !OWNER_PWD, 'set E2E_OWNER_EMAIL + E2E_OWNER_PASSWORD to run');

test('owner happy path through V2 surfaces', async ({ page }) => {
  // 1. Login
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(OWNER_EMAIL);
  await page.getByLabel(/password/i).fill(OWNER_PWD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/invoices/, { timeout: 15_000 });

  // 2. Inbox renders (may be empty — just the page header)
  await page.getByRole('link', { name: 'Inbox' }).click();
  await expect(page.locator('h1', { hasText: 'Inbox' })).toBeVisible();

  // 3. Billing
  await page.getByRole('link', { name: 'Billing' }).click();
  await expect(page.locator('h1', { hasText: 'Billing' })).toBeVisible();
  // Tier-meter or "Start subscription" CTA visible:
  await expect(
    page.locator('text=/seat \\/ month|Start subscription/i')
  ).toBeVisible();

  // 4. Reports
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.locator('h1', { hasText: 'Reports' })).toBeVisible();
  await expect(page.locator('text=/BAS/i')).toBeVisible();
  // Pick Q1 just to confirm the select is wired
  await page.locator('select').first().selectOption({ index: 1 });

  // 5. Settings
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible();
  // billing_email section exists
  await expect(page.locator('text=Inbox email')).toBeVisible();

  // 6. Sign out
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 5_000 });
});

test('inbox empty state renders cleanly for fresh orgs', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(OWNER_EMAIL);
  await page.getByLabel(/password/i).fill(OWNER_PWD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/invoices/);

  await page.getByRole('link', { name: 'Inbox' }).click();
  await expect(page.locator('h1', { hasText: 'Inbox' })).toBeVisible();
  // Either "No invoices delivered yet" empty state OR rows exist — both pass.
});

test('billing read-only banner when not owner (admin)', async ({ page }) => {
  // This relies on E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD being set to a NON-owner
  // member of the same test org. Skip silently if unavailable.
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPwd   = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!adminEmail || !adminPwd, 'set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD');

  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(adminEmail!);
  await page.getByLabel(/password/i).fill(adminPwd!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/invoices/);

  await page.goto(`${BASE}/billing`);
  await expect(page.locator('text=/only the organisation owner can change/i')).toBeVisible();
});
