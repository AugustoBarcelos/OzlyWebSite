# Admin Portal — Monitoring & Alerting

Companion to `BRIEFING.md` §§ 8, 13 and `SECURITY.md`. This file lists where
each signal lives, how to query it, and the alert thresholds we wired up.

---

## 1. Sentry (frontend errors)

- **Project:** `ozly-admin-portal` (separate from the mobile app project).
- **DSN:** stored in Cloudflare Pages env var `VITE_SENTRY_DSN` and as the
  GitHub Actions secret `ADMIN_PORTAL_SENTRY_DSN` for build-time injection.
- **Source maps:** uploaded to Sentry server-side via the build step
  (`@sentry/vite-plugin`). They must **never** be published to the CDN —
  CI gate `Verify no source maps in dist` enforces this.
- **PII filtering — `beforeSend` strips these keys before send:**
  - `email`, `phone`, `phone_number`
  - `tfn`, `tax_file_number`, `abn`
  - `password`, `password_hash`
  - `access_token`, `refresh_token`, `id_token`, `authorization`
  - `service_role`, `apikey`, `api_key`
  - `address`, `street`, `postcode`, `dob`, `date_of_birth`
  - `visa`, `visa_number`, `passport`
  - any key matching `/secret|token|cookie|credential/i`
- **Tags we set:** `role` (only after `is_admin()` returns true), `env`
  (`production` | `preview`), `release` (git SHA).
- **Retention:** Sentry default. Augusto reviews unresolved issues weekly.

---

## 2. PostHog (admin behaviour analytics)

- **Project:** dedicated PostHog project, **separate from the app's PostHog
  project**. Goal: detect anomalous *admin* usage (off-hours, bulk reads).
- **Region:** **EU host** (`eu.posthog.com`) — required by CSP `connect-src`
  and consistent with `BRIEFING.md` D1.
- **Identify:** call `posthog.identify(userId, ...)` **only after** the
  client has verified `is_admin() === true` via RPC. Never identify on the
  login screen.
- **Properties:** `role`, `session_started_at`. Never send PII (TFN/email/
  phone/etc.).
- **API key:** Cloudflare Pages env var `VITE_POSTHOG_KEY` + GitHub secret
  `ADMIN_PORTAL_POSTHOG_KEY`.
- **Migration plan:** move to self-hosted AU PostHog when monthly events
  exceed the free tier (1M/month).

---

## 3. Cloudflare Logpush

- **Source:** the `peixes.ozly.au` zone — HTTP request logs and Cloudflare
  Access auth events.
- **Sink:** R2 bucket `ozly-admin-portal-logs` (**TBD by Augusto** — placeholder
  name; pin the actual name once the bucket is provisioned and update this
  doc).
- **Retention:** **90 days** in R2 (lifecycle rule), then aged out. Anything
  needed long-term is exported to cold storage during the annual review.
- **What to grep:**
  - `cf_access` events for who logged in when and from where.
  - WAF block events (`action=block`) for forensics during DDoS / abuse.

---

## 4. Supabase logs

- **Edge Function logs:** Supabase Dashboard → Edge Functions → select
  function → "Logs" tab. Live tail + 7 days of history.
- **Postgres logs:** Supabase Dashboard → Database → Logs. Useful for
  spotting slow / failing queries.
- **Auth logs:** Dashboard → Authentication → "Logs" (login attempts, MFA
  events, password resets).
- **Direct SQL audit:** the source of truth for our own actions is
  `admin_audit_log`. Always cross-check with this table:
  ```sql
  select created_at, admin_id, action, target_user_id, result
    from admin_audit_log
   order by created_at desc
   limit 200;
  ```

---

## 5. Alert thresholds

Routed to Resend → email (Privacy Officer + on-call). Thresholds match
`BRIEFING.md` § 13. **If you change a threshold below, also change it in the
briefing — they must stay in sync.**

| # | Event | Threshold / condition | Severity |
|---|---|---|---|
| 1 | Failed logins, same IP | > 5 attempts in 5 min | Medium |
| 2 | `grant_promo` duration | > 30 days granted in a single call | Medium |
| 3 | `refund` action | Any value, any user | High |
| 4 | `ban_user` or `soft_delete_user` | Any invocation | High |
| 5 | `bulk_action` | ≥ 10 users affected in one call | High |
| 6 | `profiles.role` change | Any update (someone became admin or demoted) | **Critical** |
| 7 | RPC returned `Forbidden` | Any occurrence (privilege-escalation attempt) | High |
| 8 | WAF blocks from a single IP | > 100 blocks/hour | Medium |
| 9 | Edge Function error rate | > 5% over 15 min | Medium |
| 10 | Daily Supabase backup | Failed (no successful backup row in last 30 h) | High |

**Wiring:** events 1–7 are emitted from `admin_audit_log` triggers and
`notify-admin-action` Edge Function. Events 8–10 come from Cloudflare
Notifications (8) and Supabase status webhooks (9–10) routed via the same
Resend transport.

**On-call expectation:**
- **Critical** — acknowledge within 15 min, action within 1 h.
- **High** — acknowledge within 1 h, action within 4 h (business hours +/-).
- **Medium** — review within 24 h.
