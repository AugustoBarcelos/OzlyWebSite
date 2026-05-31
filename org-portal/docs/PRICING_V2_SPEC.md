# Org Pricing V2 — Sponsorship-Based Tiers

**Status:** Draft / handoff ready — UI preview merged in `routes/billing.tsx`; backend/Stripe wiring pending.
**Author:** PM session 2026-05-30
**Predecessor:** V1 (this codebase HEAD) = $9.99 AUD per `accepted` member, tiers Free/Starter (≤5) / Growth (>5), no annual, no PRO sponsorship, no thin seat.

---

## 1. TL;DR

Switch from "pay per member" to **"dashboard is free, pay per sponsored seat with auto volume break"**. The worker stays the owner of their ABN/PRO subscription; the org optionally covers it. Multi-org workers naturally generate revenue from each org that sponsors (only one can at a time) or each org that views (free dashboard).

| Tier (auto) | Sponsored seats | ABN /seat/mo | PRO /seat/mo |
|---|---|---|---|
| Free | 0 | — | — |
| Crew | 1–4 | $14.99 | $19.99 |
| Squad | 5–14 | $11.99 | $15.99 |
| Fleet | 15–29 | $9.99 | $12.99 |
| Enterprise | 30+ | $7.99 | $9.99 |

Annual = ×10 monthly (≈17% off, 2 months free). All AUD.

**Rule of unicidade:** a given worker can be sponsored by **at most one** org at a time. Other orgs that have the worker accepted simply pay $0 for that worker (dashboard-only access). No "thin seat" SKU yet (deferred to V3 if data shows demand).

---

## 2. Problem with V1 (today)

1. **Tiers don't differentiate features.** Starter and Growth differ only by `seat_quantity` cap; the user gets the same product. No reason to "upgrade" except hitting the cap.
2. **All `accepted` members count toward billing**, even those who self-pay Solo elsewhere. Boss is paying for visibility they should get for free.
3. **No annual** → 100% of LTV is at monthly churn risk.
4. **No PRO sponsorship** → migrants doing both ABN + TFN (delivery + bar shift) can't be covered by an org.
5. **Public site has no `/empresas` page** → no acquisition funnel for B2B.

---

## 3. Target schema changes

### 3.1 Extend `org_entitlement_grants.entitlement`

Today the column defaults to `'abn_access'`. No CHECK constraint exists (verified migration `20260528130000_org_portal_v0.sql:95`), so PRO can be added without DDL. **But** add a constraint to lock the allowed values:

```sql
ALTER TABLE org_entitlement_grants
  ADD CONSTRAINT org_entitlement_grants_entitlement_chk
  CHECK (entitlement IN ('abn_access', 'pro_access'));
```

### 3.2 Add `mode` param to `org_set_member_subsidy`

Current signature (`20260528200000_org_set_member_subsidy.sql`): `(p_org_id, p_user_id, p_active boolean)` — implicitly grants `abn_access`. Extend:

```sql
CREATE OR REPLACE FUNCTION public.org_set_member_subsidy(
  p_org_id   uuid,
  p_user_id  uuid,
  p_active   boolean,
  p_mode     text DEFAULT 'abn'  -- 'abn' | 'pro'
) RETURNS jsonb ...
```

Map `p_mode='abn' → entitlement='abn_access'`, `p_mode='pro' → entitlement='pro_access'`.

### 3.3 Single-sponsor invariant

Add a partial unique index so a given `(user_id, entitlement)` can only have ONE active sponsorship across all orgs:

```sql
CREATE UNIQUE INDEX uniq_active_sponsor_per_user_entitlement
  ON org_entitlement_grants (user_id, entitlement)
  WHERE status = 'active';
```

The RPC must detect the conflict and return a friendly error (`{ ok:false, error:'already_sponsored_by_other_org', other_org_id:... }`) so the portal can render "Worker is currently sponsored by [Org X]. Ask them to release sponsorship first."

### 3.4 `org_subscriptions` no longer maps to plan from `seat_quantity`

Remove the `apply_org_subscription` mapping (lines 64-84 of `20260530180000_org_subscriptions.sql`). Tier is now **derived at read time** from `count(active grants)` per org. `organizations.billing_plan` becomes legacy — recommend marking deprecated and stop reading it from the UI. Drop the CHECK constraint or extend it to include the new tier labels (`'free' | 'crew' | 'squad' | 'fleet' | 'enterprise'`).

A helper view fits well:

```sql
CREATE OR REPLACE VIEW public.org_pricing_state AS
SELECT
  o.id AS org_id,
  COALESCE(COUNT(g.id) FILTER (WHERE g.entitlement='abn_access' AND g.status='active'), 0) AS sponsored_abn,
  COALESCE(COUNT(g.id) FILTER (WHERE g.entitlement='pro_access' AND g.status='active'), 0) AS sponsored_pro,
  CASE
    WHEN COUNT(g.id) FILTER (WHERE g.status='active') = 0 THEN 'free'
    WHEN COUNT(g.id) FILTER (WHERE g.status='active') BETWEEN 1 AND 4 THEN 'crew'
    WHEN COUNT(g.id) FILTER (WHERE g.status='active') BETWEEN 5 AND 14 THEN 'squad'
    WHEN COUNT(g.id) FILTER (WHERE g.status='active') BETWEEN 15 AND 29 THEN 'fleet'
    ELSE 'enterprise'
  END AS tier
FROM organizations o
LEFT JOIN org_entitlement_grants g ON g.org_id = o.id
GROUP BY o.id;
```

`billing.tsx` then reads this view instead of computing in JS (single source of truth).

### 3.5 Add `billing_cycle` to `org_subscriptions`

```sql
ALTER TABLE org_subscriptions
  ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual'));
```

---

## 4. Stripe configuration

8 prices total (or use Stripe **tiered pricing** to collapse to 2 products):

### Option A — flat: 8 prices

| Product | Price | Recurrence | Lookup key |
|---|---|---|---|
| Sponsored ABN | $14.99 | month | `abn_crew_monthly` |
| Sponsored ABN | $11.99 | month | `abn_squad_monthly` |
| Sponsored ABN | $9.99 | month | `abn_fleet_monthly` |
| Sponsored ABN | $7.99 | month | `abn_enterprise_monthly` |
| Sponsored ABN | $149 (×10) | year | `abn_crew_annual` |
| ...etc for Squad/Fleet/Enterprise annual | | | |
| Sponsored PRO | mirror of above | | `pro_*_monthly` / `pro_*_annual` |

Webhook reassigns the price ID per subscription when the org crosses a tier boundary. Complex but transparent in Stripe Dashboard.

### Option B (recommended) — tiered pricing: 4 prices

Stripe supports [graduated/volume tiered pricing](https://docs.stripe.com/products-prices/pricing-models#tiered-pricing) natively. Create:

- `price_abn_monthly` — graduated tiers 1-4/5-14/15-29/30+
- `price_abn_annual` — same tiers, ×10
- `price_pro_monthly` — same
- `price_pro_annual` — same

Then webhook only updates `seat_quantity` per metered SKU; Stripe computes the right amount with auto-discount. Simpler, but tier display in Customer Portal is less explicit.

**Decision: go Option B.** Less surface area for bugs and aligns Stripe billing math with the in-app math (one place to update price points).

### Webhook update

`stripe-webhook` edge function (in `supabase/functions/stripe-webhook/` — verify location) currently mirrors `seat_quantity → billing_plan` via `apply_org_subscription`. Rewrite to:

1. Upsert `org_subscriptions` row (no plan mapping).
2. Update `seat_quantity` for `abn_metered_sub` AND `pro_metered_sub` from the active grant counts.
3. Read tier from `org_pricing_state` view if needed.

---

## 5. Edge function `sync-org-entitlement` updates

Reference: trigger wiring in `20260530120000_org_entitlement_dispatch.sql`.

1. **Accept `entitlement` (abn_access / pro_access)** when granting to RevenueCat. Today it hardcodes `abn_access`. Pass it through from the grant row.
2. **Use RevenueCat's `pro_access` entitlement** for PRO sponsorship. The mobile app already gates by RC entitlement — no app change needed if the entitlement key exists in RC dashboard.
3. **Process_due_revocations** stays the same (7-day grace).

---

## 6. UI changes (FE)

### 6.1 Billing page — DONE (preview)
Tier table and sponsored seat counters already merged in `src/routes/billing.tsx`. The preview reads `org_pricing_state` via `org_entitlement_grants` count today; switch to the view once §3.4 lands.

### 6.2 Billing page — REMAINING

- **Mode toggle (monthly / annual)** at the top of the page. Persist choice in `org_subscriptions.billing_cycle`. Pass to checkout session.
- **Cancel/manage** flow updates: when annual, communicate non-refundable behaviour clearly.
- Remove SEAT_LIMIT references and the "X / Y members" capping UI once V2 is live.

### 6.3 Members page (`src/routes/members.tsx`)

Today the sponsorship toggle is binary (subsidy on/off). Extend to a **mode selector**:

- **Off** — worker self-pays (or is sponsored by another org). No charge to this org.
- **ABN sponsor** — covers worker's ABN access ($14.99–$7.99/mo per tier).
- **PRO sponsor** — covers worker's PRO access ($19.99–$9.99/mo per tier).

If worker is already sponsored by another org (caught by RPC error per §3.3), show a modal:

> João is currently sponsored by **CleanCo Pty Ltd**. Ask him to release the sponsorship from his Ozly app (Settings → Sponsorship → Release).

### 6.4 Mobile app — sponsorship badge

`/Users/augustoeamanda/Documents/GitHub/AusClean/lib/screens/settings/` (verify path) — add badge to Subscription screen:

> **Sponsored by [Org Name]** — They cover your $14.99 Ozly subscription. If you leave the org or they cancel, you'll need to subscribe directly. [Release sponsorship]

Plus a **Release sponsorship** action that calls a new RPC `release_my_sponsorship(p_entitlement text)` which marks the grant as `revoke_scheduled` with same 7-day grace. Required to unblock the worker switching to a different sponsoring org.

#### 6.4.x Legal / compliance copy on the mobile app (REQUIRED with this feature)

> Reviewed by legal pass 2026-05-31. The current app (`organisations_screen.dart`, `invite_accept_screen.dart`) ships **no** risky wording today — these items are only needed when the sponsorship/cover UX below goes live. They are the app-side of the corrected /terms-of-service position (Ozly = sole-trader business, ABN 72 203 548 158; cover is NOT a restraint on the worker).

- [ ] **Invite-accept microcopy** — `lib/screens/invite_accept_screen.dart`, `_Phase.ready`, above the Accept button: *"By accepting, you join [Org] as an independent sub-contractor under your own ABN. You're not their employee and stay free to work for others."* + link to `https://ozly.au/terms-of-service`. This is the worker-side consent backing the non-employment position.
- [ ] **Sponsorship badge** — see 6.4 above (already specced).
- [ ] **Cover / exclusivity copy must match the ToS** — when "Ozly invoicing directed to org" ships, phrase it as *"while covered, your Ozly invoicing goes to [Org]; you stay free to bill others — add the $5 top-up to also bill other clients via Ozly."* **Never** use "blocked", "restricted", "exclusive", or "only [Org]". (Mirrors `/terms-of-service` §7.)
- [ ] **Sponsor-ended state — never a bare paywall.** Guide the worker: *"Your sponsor ([Org]) ended cover. You have 7 days of access. Subscribe for \$X/mo, or ask another org to cover you."* (See §9.1.)
- [ ] **PRO sponsorship + Apple** — confirm with App Review (Guideline 3.1.1) before submitting the build that surfaces sponsored PRO; no "buy on web for in-app value" language. (See §12.5.)

### 6.5 Public site — `/empresas` landing

Net new page in `/Users/augustoeamanda/Documents/OzlyWebSite/src/pages/Empresas.jsx` (or `Business.jsx`). Sections:

1. Hero: "Cover your sub-contractors' Ozly. Take control of invoices."
2. Calculator widget: input # workers, output "Solo cost $X/yr vs Ozly Crew $Y/yr → save $Z".
3. Tier table (mirror the one in billing.tsx).
4. Multi-org section: "If your worker is also in another org's plan, you don't pay for them — but you still see their work for you."
5. Sign-up CTA → org-portal signup.

Trad keys needed in `src/i18n/{en,pt,es}.json` under `empresas.*`.

---

## 7. Migration of existing pilots

Per the PM session: there are "a few" pilots currently. Action:

1. **Inventory:** export from `organizations` where `billing_plan != 'free'` and join `org_subscriptions` to see who's actively billing. Email the list to the PM before migration.
2. **Grandfather offer:** "You'll move to V2 pricing on [date]. Your first 3 months are free as a thank-you for being early." Captures goodwill.
3. **Migration script:** for each pilot, infer their sponsored seats from current `accepted` members and create `org_entitlement_grants` rows accordingly (treating all current paid members as sponsored). Stripe subscription gets switched to the new tiered SKU with proration.
4. **No silent reprice.** Send email 14 days before, in-app banner 7 days before, transactional email day-of.

---

## 8. Rollout plan

**T-30 days** — Schema work (§3) on staging. Migrate seed_org_portal_demo.sql to validate the view.

**T-21** — Stripe products configured in test mode. Webhook updated and verified.

**T-14** — Members page UI (mode selector). Billing page completes (annual toggle).

**T-7** — Mobile sponsorship badge ships in app store build.

**T-3** — `/empresas` landing live behind feature flag.

**T-0** — Pilot migration runs. Public flag flips. Site shows /empresas in nav.

**T+14** — First metrics review (see §10).

---

## 9. Pre-mortem

1. **Worker rage when sponsor disappears.** App must guide them clearly — never just paywall. Tested copy: "Your sponsor (CleanCo) ended their plan. You have 7 days of access. Subscribe Solo for $14.99/mo, or ask another org to cover you."
2. **Boss gaming "release at end of month" to skip charge.** Stripe metered usage charges based on the high-water mark of the period. Document this clearly so boss can't argue.
3. **Tier downgrade mid-cycle.** If boss had 6 sponsorships (Squad tier $11.99×6=$71.94) and drops 2 to 4 (Crew $14.99×4=$59.96), pro-rate fairly. Stripe handles this if Option B graduated tiering is used.
4. **PRO sponsorship + worker already has Solo PRO.** Decide: refund worker's RC subscription pro-rata? Or just pause RC until they leave the org? **Recommended:** pause RC, no refund (the value is delivered; double-charge is the bug). Implement in `sync-org-entitlement`.
5. **Multi-org race on sponsorship.** Two orgs toggle ON in the same second for the same worker. The partial unique index (§3.3) guarantees only one wins; the other gets the error. Test this.
6. **Stripe webhook lag.** Boss toggles sponsor ON, RC entitlement granted immediately, but Stripe seat_quantity update is async. If webhook fails, Ozly is giving away free entitlements. Add a daily reconciliation cron.
7. **Compliance copy ships with the feature, not after.** The mobile-app legal checklist in §6.4.x (non-employment microcopy, non-restraint cover wording, sponsor-ended guidance, Apple 3.1.1) is REQUIRED with this release — it's what keeps the sponsorship model defensible. Don't ship the cover UX without it.

---

## 10. Success metrics

**Primary:**
- **Org-driven ARPU per worker (ARPW)** ≥ $180 AUD/yr (target by T+90). Sum of org-paid sponsorship revenue ÷ total workers in orgs.

**Secondary:**
- Trial → paid conversion on `/empresas` ≥ 25% in 60d.
- % of accepted members that are sponsored ≥ 40% by T+90 (today: pilots only).
- Annual mix on org plans ≥ 30% by T+180.

**Counter-metrics (must NOT regress):**
- Solo (B2C) ABN/PRO conversion (Solo cannibalisation < 5% sustained).
- Monthly churn on orgs ≤ Solo churn baseline.
- Member-leaves-org rate (don't make it traumatic; if this spikes, sponsorship UX is wrong).

---

## 11. Out of scope (explicit)

- **Thin seat** ($4.99/mo for "I want this worker on my dashboard even though I don't sponsor"). Deferred until data shows orgs asking for it. Today the dashboard is free for all accepted members regardless of sponsorship; that's enough.
- **Per-org team feature flags** (audit log, advanced reports, API). Tier in this spec is purely pricing — no feature-gating by tier. Add later if needed; don't conflate "pay more" with "get more features" until product story justifies.
- **Multi-currency.** AUD-only at launch.
- **Mid-cycle cycle change** (monthly → annual). Forces re-subscribe today. Add upgrade-only path in V2.1 if friction shows.
- **Invoice-based billing** (NET-30 for Enterprise). Stripe-only for V1 of V2.

---

## 12. Open questions

- [ ] **Who owns the migration of pilots — PM, eng, ops?**
- [ ] **`pro_access` key in RevenueCat — exists or needs creation?** (Verify in RC dashboard before §5 work.)
- [ ] **Should Free tier have a member cap?** (Today unlimited. Risk: free-rider orgs that never sponsor. Suggest soft cap: 50 free accepted members per org, paywall after.)
- [ ] **Do we want to incentivise annual at signup with a 7-day free trial?** (Stripe supports this on annual prices.)
- [ ] **Does Apple care?** PRO sponsorship moves a B2C entitlement to B2B billing — Apple 3.1.1 historically frowns on "buy on web for in-app value". Reading: org buys on web, worker consumes in app. Likely fine because the BUYER (org) is the contractor's employer, not the in-app user. **Confirm with App Review before submitting next build with the sponsorship UX surfaced.**

---

## 13. File index

| Path | Purpose | Status |
|---|---|---|
| `org-portal/src/routes/billing.tsx` | Pricing preview UI | **Done (preview merged)** |
| `org-portal/src/lib/types.ts` | SEAT_LIMIT, BillingPlan | Update once §3.4 lands |
| `org-portal/src/routes/members.tsx` | Mode selector for sponsorship | TODO |
| `AusClean/supabase/migrations/20260601_pricing_v2.sql` | Schema for §3 | TODO |
| `AusClean/supabase/functions/sync-org-entitlement/index.ts` | Honor `entitlement` field | TODO |
| `AusClean/supabase/functions/stripe-webhook/index.ts` | Tiered SKU + seat_quantity update | TODO |
| `AusClean/lib/screens/settings/subscription.dart` | Sponsorship badge + Release flow | TODO (verify path) |
| `OzlyWebSite/src/pages/Empresas.jsx` | Landing page | TODO |
| `OzlyWebSite/src/i18n/{en,pt,es}.json` | `empresas.*` keys | TODO |

---

**Next action for whoever picks this up:** read §3 + §4 first, then sketch the migration SQL in a draft PR. UI work (§6) can run in parallel since the preview is already in main. Coordinate with PM on §7 timing before merging anything that touches Stripe.
