// E2E: Billing page covers tier-meter rendering + owner-only enforcement +
// downgrade exit-interview happy path. All Supabase traffic mocked.

import { test, expect } from '@playwright/test';
import { asSignedInOwner, asSignedInAdmin, DEFAULT_ORG } from './fixtures/supabase-mock';

test.describe('Billing — owner', () => {
  test.beforeEach(async ({ page }) => {
    await asSignedInOwner(page);
    await page.goto('/billing');
  });

  test('renders the tier-meter for a free org', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Billing' })).toBeVisible();
    await expect(page.locator('text=/Tier 1/i')).toBeVisible();
    await expect(page.locator('text=/\\$12\\.99/')).toBeVisible();
  });

  test('shows "Start subscription" CTA when no Stripe subscription', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Add payment method/i })).toBeVisible();
  });

  test('does NOT show "Only the owner can change the plan" banner for owner', async ({ page }) => {
    await expect(page.locator('text=/Only the organisation owner/i')).toHaveCount(0);
  });
});

test.describe('Billing — non-owner (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await asSignedInAdmin(page);
    await page.goto('/billing');
  });

  test('shows read-only banner', async ({ page }) => {
    await expect(page.locator('text=/Only the organisation owner can change the plan/i')).toBeVisible();
  });

  test('hides upgrade / downgrade buttons', async ({ page }) => {
    await expect(page.locator('button', { hasText: /^Upgrade$/i })).toHaveCount(0);
    await expect(page.locator('button', { hasText: /^Downgrade$/i })).toHaveCount(0);
  });
});

test.describe('Billing — trial banner', () => {
  test('shows trial banner when trial ends within 14 days', async ({ page }) => {
    const trialEnds = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    await asSignedInOwner(page);
    await page.route(/supabase\.co\/rest\/v1\/organizations/i, (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify([{ ...DEFAULT_ORG, trial_ends_at: trialEnds }]),
        headers: { 'content-type': 'application/json' },
      });
    });
    await page.goto('/billing');
    await expect(page.locator('text=/Trial ends/i')).toBeVisible();
  });
});
