// Lightweight Supabase mock for E2E tests. Intercepts all /rest + /auth +
// /rpc requests, returning canned responses. Tests stay deterministic
// without spinning up a real Supabase instance.

import type { Page, Route } from '@playwright/test';

export interface SupabaseMockOptions {
  /** Override the org list returned to OrgProvider. */
  orgs?: Array<Record<string, unknown>>;
  /** Override the memberships returned to OrgProvider (role hydration). */
  memberships?: Array<{ org_id: string; role: string }>;
  /** Customise RPC responses by name. */
  rpcs?: Record<string, (body: unknown) => { status?: number; body: unknown }>;
  /** Customise table SELECT responses by table name. */
  tables?: Record<string, (req: { url: string }) => { status?: number; body: unknown }>;
  /** Session present? When false, /auth/v1/user returns 401. */
  signedIn?: boolean;
  /** User id of the signed-in session. */
  userId?: string;
}

const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111';
const DEFAULT_ORG_ID  = '22222222-2222-2222-2222-222222222222';

export const DEFAULT_ORG = {
  id: DEFAULT_ORG_ID,
  name: 'Acme Cleaning',
  abn: '12345678901',
  admin_email: 'owner@acme.test',
  billing_email: 'billing@acme.test',
  billing_plan: 'free',
  trial_ends_at: null,
  created_at: '2026-05-01T00:00:00Z',
  period_frequency: 'fortnightly',
  period_anchor: null,
};

export async function installSupabaseMock(page: Page, opts: SupabaseMockOptions = {}): Promise<void> {
  const userId = opts.userId ?? DEFAULT_USER_ID;
  const orgs = opts.orgs ?? [DEFAULT_ORG];
  const memberships = opts.memberships ?? [{ org_id: DEFAULT_ORG_ID, role: 'owner' }];
  const signedIn = opts.signedIn ?? true;

  await page.route(/supabase\.co\/auth\/v1\/user/i, (route: Route) => {
    if (!signedIn) return route.fulfill({ status: 401, body: '{"msg":"not authenticated"}' });
    return route.fulfill({
      status: 200,
      body: JSON.stringify({ id: userId, email: 'owner@acme.test', user_metadata: {} }),
      headers: { 'content-type': 'application/json' },
    });
  });

  await page.route(/supabase\.co\/auth\/v1\/token/i, (route: Route) => {
    return route.fulfill({
      status: 200,
      body: JSON.stringify({
        access_token: 'fake.jwt.token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake.refresh',
        user: { id: userId, email: 'owner@acme.test' },
      }),
      headers: { 'content-type': 'application/json' },
    });
  });

  await page.route(/supabase\.co\/rest\/v1\/rpc\/(.+)/i, async (route: Route, request) => {
    const name = new URL(request.url()).pathname.split('/').pop()!;
    const handler = opts.rpcs?.[name];
    const body = handler ? handler(await request.postDataJSON?.()) : { body: [] };
    return route.fulfill({
      status: body.status ?? 200,
      body: JSON.stringify(body.body),
      headers: { 'content-type': 'application/json' },
    });
  });

  await page.route(/supabase\.co\/rest\/v1\/([^?]+)/i, async (route: Route, request) => {
    const url = request.url();
    const table = new URL(url).pathname.split('/').pop()!;
    if (table === 'organizations') {
      return route.fulfill({
        status: 200,
        body: JSON.stringify(orgs),
        headers: { 'content-type': 'application/json' },
      });
    }
    if (table === 'org_memberships') {
      return route.fulfill({
        status: 200,
        body: JSON.stringify(memberships),
        headers: { 'content-type': 'application/json' },
      });
    }
    const handler = opts.tables?.[table];
    const body = handler ? handler({ url }) : { body: [] };
    return route.fulfill({
      status: body.status ?? 200,
      body: JSON.stringify(body.body),
      headers: { 'content-type': 'application/json' },
    });
  });
}

export function asSignedInOwner(page: Page) {
  return installSupabaseMock(page, {
    signedIn: true,
    memberships: [{ org_id: DEFAULT_ORG_ID, role: 'owner' }],
  });
}

export function asSignedInAdmin(page: Page) {
  return installSupabaseMock(page, {
    signedIn: true,
    memberships: [{ org_id: DEFAULT_ORG_ID, role: 'admin' }],
  });
}
