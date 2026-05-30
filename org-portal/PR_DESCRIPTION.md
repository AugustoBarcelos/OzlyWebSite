# Ozly Org Portal v0 (B2B)

New B2B web portal letting Australian companies (cleaning, trades, agencies) see
the invoices their engaged Ozly sub-contractors send them, manage members, and
(later) subsidise the sub-contractor ABN subscription.

**Three coordinated deliverables:**
1. **org-portal** — new React app at `OzlyWebSite/org-portal/` (this PR).
2. **Migration + edge functions** — `AusClean/supabase/…` (this PR / can split).
3. **Flutter companion** — separate PR via `/flutter-dev`. Spec:
   `AusClean/docs/ORG_PORTAL_FLUTTER_HANDOFF.md`.

---

## Pre-flight answers

1. **Admin-portal Angular version / standalone / signals?** — N/A. The
   admin-portal is **React 19** (Vite 7, Tailwind 4, react-router 7,
   supabase-js 2.46), located at `OzlyWebSite/admin-portal/` (not in `AusClean/`
   as the spec assumed). **Decision (confirmed): org-portal built in React 19**
   to match, not Angular.
2. **B2C ABN tier price?** — **$14.99/mo AUD** (annual $149.99 ≈ $12.50/mo).
   Source: `AusClean/FINANCIAL_ROADMAP.md` + `financial_roadmap.csv`. Not in
   `revenuecat_service.dart` (only entitlement IDs; price comes from the store
   at runtime). Confirms the spec's $15 Connected rate ≈ B2C parity.
3. **Email provider?** — **Resend** (`RESEND_API_KEY` already in prod). Pattern:
   `getSecret('resend','api_key','RESEND_API_KEY')` + `POST api.resend.com/emails`.
   `send-org-invite` clones it.
4. **Schema conflicts?** — Several; the spec's raw SQL does **not** run as-is.
   Resolved as C1–C7 (below), approved before coding.

### Schema conflicts found & resolved
- **C1** — `invoices` had no `paid_at`/`sent_at`. Added both (mark-as-paid +
  `days_from_sent_to_paid` telemetry need them).
- **C2** — spec's seat-limit trigger selected TEXT `billing_plan` into an INT
  var → `invalid input syntax for integer: "free"`. Rewritten with a `text`
  plan var; also fires on INSERT (memberships are created directly as
  `accepted`, so an UPDATE-only trigger never blocked the first acceptance).
- **C3** — `org_invitations.delivery_status` was only in the edge-function
  prose; added to the DDL.
- **C4** — org "mark as paid" goes through `org_mark_invoice_paid()` RPC, not a
  broad UPDATE RLS policy (RLS can't restrict columns → would let an org edit
  invoice totals).
- **C5** — `invoices` + `org_memberships` added to `supabase_realtime` +
  `REPLICA IDENTITY FULL` (filtered realtime needs the filter column).
- **C6** — org admins read member names via `can_admin_view_profile()` (the
  portal can't read `auth.users`; names live in `profiles`).
- **C7** — telemetry goes to a new `org_events` table (`app_events.user_id` is
  NOT NULL → profiles; cron/admin events have no natural user).
- **Security hardening** — all membership writes funnel through SECURITY DEFINER
  RPCs (`org_create_with_owner` / `org_accept_invitation` /
  `org_decline_invitation`). There is **no** direct INSERT policy on
  `org_memberships` — a self-insert policy would let any user insert themselves
  as `owner` of an arbitrary org.

---

## Migrations to run in prod

Single migration: `AusClean/supabase/migrations/20260528130000_org_portal_v0.sql`

```
# apply
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260528130000_org_portal_v0.sql
# RLS isolation test suite (transaction-wrapped, ROLLBACKs)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/org_portal_rls_test.sql
```

Creates: `organizations`, `org_memberships`, `org_invitations`, `org_events`,
`org_entitlement_grants`; adds `contractors.org_id`, `invoices.org_visible_id/
paid_at/sent_at`; helper fns (`is_org_member/admin/owner`,
`can_admin_view_profile`); triggers (`set_invoice_org_visible`,
`check_org_seat_limit`); RPCs (`org_create_with_owner`, `org_get_invitation`,
`org_accept_invitation`, `org_decline_invitation`, `org_mark_invoice_paid`,
`admin_list_organizations`, `admin_set_org_billing_plan`,
`org_snapshot_member_counts`); RLS for all new tables + the additive org-read
policies on invoices/contractors/profiles; realtime publication.

**Post-deploy wiring (manual, outside SQL):**
- Deploy edge functions `send-org-invite`, `sync-org-entitlement` (config.toml
  entries added; both `verify_jwt=false`).
- DB webhooks → `sync-org-entitlement` on `org_memberships` (INSERT/UPDATE) and
  `organizations` (UPDATE). *(Dormant in v0 — only fires for Starter/Growth.)*
- pg_cron: `org_snapshot_member_counts()` daily; `sync-org-entitlement`
  `{mode:"process_due_revocations"}` daily.
- Secrets: `ORG_INVITE_FROM_EMAIL`, `ORG_INVITE_BASE_URL` (optional; defaults
  fine). RevenueCat secrets already present.
- Supabase Auth: if "Confirm email" is ON, signup shows a confirm step and the
  org is created on first authenticated load (handled).

---

## New telemetry events
| Event | Fields | Emitted by |
|---|---|---|
| `org_signup` | org_id, abn_present | `org_create_with_owner` (RPC) |
| `org_invite_sent` | org_id, channel, role, delivery | `send-org-invite` (edge) |
| `org_invite_accepted` | org_id, user_id, days_to_accept | `org_accept_invitation` (RPC) |
| `org_invite_declined` | org_id | `org_decline_invitation` (RPC) |
| `org_invoice_viewed` | org_id, count | portal (client) |
| `org_invoice_marked_paid` | org_id, invoice_id, days_from_sent_to_paid | `org_mark_invoice_paid` (RPC) |
| `org_member_count_snapshot` | org_id, count | `org_snapshot_member_counts()` (cron) |
| `org_billing_plan_changed` | org_id, from, to | `admin_set_org_billing_plan` (RPC) |

All land in `org_events`.

---

## Admin-portal change
New `/ops/orgs` page (`routes/ops/orgs.tsx`) + nav entries (Layout + command
palette). Lists orgs and sets `billing_plan` manually via
`admin_set_org_billing_plan` (gated by `is_admin()`). Stripe is v1.

---

## Verification done
- **org-portal**: `tsc -b` clean ✓ · `vite build` clean ✓ (largest chunk 75 kB
  gzip).
- **admin-portal**: `tsc -b` clean ✓ (full vite build not re-run; change is a
  page + 2 nav lines following existing patterns).
- **Edge functions**: not type-checked locally (no Deno installed).
- **Migration + RLS tests**: **not executed** — no local Postgres/psql and the
  Docker daemon isn't running, so `supabase db reset` can't start. Written to
  run via the `psql` commands above. **Must be run against a Supabase branch
  before merge.**

## Screenshots — PENDING (manual capture)
Cannot capture without a configured Supabase backend (the app needs
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` + real auth). To capture:
`cd org-portal && cp .env.example .env.local` (fill in), `npm run dev` →
http://localhost:5175. Needed: signup · members (empty) · members (with
invites) · invoices (empty) · invoices (with data) · mark-paid · settings.

## Smoke test — UNCHECKED (needs a live Supabase env + the Flutter app)
The Flutter companion is a separate PR, so steps 2–7 can't be exercised until
both are deployed to a branch. None are truthfully checkable yet:
- [ ] 1. Signup org A → empty dashboard
- [ ] 2. Invite existing user X by email → email + in-app push
- [ ] 3. X accepts in app → contractor auto-created + linked
- [ ] 4. X issues invoice → appears in portal <3s (realtime)
- [ ] 5. Org clicks Mark as paid → app updates <3s + snackbar
- [ ] 6. Org B + user Y → org B sees NONE of org A (assert via SQL + UI)
- [ ] 7. X declines org C invite → org C sees `declined`, no access
- [ ] 8. Invite 6th member on Starter (manual UPDATE) → trigger blocks clearly

*(Item 6's isolation guarantee is asserted automatically in
`supabase/tests/org_portal_rls_test.sql` — run it to satisfy 6 + 8 at the DB
layer ahead of the manual UI pass.)*

## Compliance — REQUIRES HUMAN REVIEW BEFORE MERGE
Copy uses sub-contractor / engagement / invite / send invoice; never employee /
shift / schedule / roster. Signup carries the no-employment disclaimer; invite
email uses the spec template; the Flutter accept screen carries the revoke
notice (handoff doc). **All copy must be reviewed by a human (not a model)
before merge** — this box is intentionally left unticked.
