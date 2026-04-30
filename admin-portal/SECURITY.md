# Admin Portal — Security Runbook

> Operational companion to `BRIEFING.md`. When an incident is happening,
> read **this file**. When designing a feature, read the briefing.

**Owner:** Augusto Oliveira (Privacy Officer + on-call)
**Last reviewed:** 2026-04-28
**Next review:** 2026-07-28 (quarterly — rotate keys + revisit runbook)

---

## 1. Security model overview

Ozly's admin portal is built on **Zero Trust + Defense in Depth**. We assume
every layer can be breached and rely on the next one to contain damage. The
nine layers are defined in `BRIEFING.md` § 7; in summary:

| # | Layer | Primary control |
|---|---|---|
| L1 | Edge / Cloudflare | Access (Google Workspace), WAF, rate limit, country block |
| L2 | HTTP headers | CSP strict, HSTS preload, COOP/COEP/CORP, Permissions-Policy |
| L3 | Authentication | Supabase Auth + WebAuthn/TOTP (no SMS) |
| L4 | Authorization | `is_admin()` check as first statement of every admin RPC |
| L5 | Application | Zod validation, no `dangerouslySetInnerHTML`, JWT in header (no CSRF) |
| L6 | Database | RLS on every table, SECURITY DEFINER RPCs, soft-delete, rate-limit table |
| L7 | Secrets | Cloudflare env vars + Supabase Vault; service_role server-side only |
| L8 | Audit & monitoring | `admin_audit_log` (hash-chain), Sentry, Logpush, Resend alerts |
| L9 | Incident response | Kill switch, runbooks (this file), 1-click rollback |

**Threat model & ground truth:** see `BRIEFING.md` § 2 and § 3.

---

## 2. Incident response runbooks

> **Rule zero:** assume every incident is real until proven otherwise.
> **Rule one:** preserve evidence before remediating (snapshot logs, do not
> truncate `admin_audit_log`).
> **Rule two:** communicate. Open a thread in `#ozly-incidents` (or the agreed
> private channel) and tag the on-call.

### 2.1 Account takeover suspected (admin or user account)

Trigger: unexpected login from new geo, password reset they didn't request,
audit log entries the user denies, RevenueCat events not matching their
behaviour.

1. **Contain (≤ 5 min)**
   - Edge Function: invoke `admin-revoke-sessions` for the affected `user_id`
     (revokes Supabase refresh tokens). RPC: `admin_ban_user` also calls it.
   - In Supabase Dashboard → Authentication → Users → select user → "Send
     password recovery". This forces a fresh password before next login.
   - If the compromised account is an **admin**, additionally:
     - Demote: `update profiles set role='user' where id='<uuid>';`
     - Rotate that admin's WebAuthn / TOTP enrolment (force re-enrol).
2. **Investigate (≤ 30 min)**
   - Pull the last 7 days of `admin_audit_log` for the account.
     `select * from admin_audit_log where admin_id='<uuid>' or target_user_id='<uuid>' order by created_at desc;`
   - Cross-check `auth.audit_log_entries` (Supabase) for IPs and user-agents.
   - Check Cloudflare Access logs (Logpush → R2) for SSO entries.
3. **Notify**
   - Email the user from a real human address (not no-reply) within 24 h.
   - If PII was accessed: see § 4 (OAIC NDB threshold).
4. **Close out**
   - Add a row to `incidents/` (private repo TBD) with timeline, evidence
     pointers, root cause, fix.
   - If pattern repeats, raise WAF rule severity for the source ASN.

### 2.2 Service-role key leak suspected

Trigger: key appears in a commit, paste-bin, logs, screenshot, third-party
breach, or a curl from an unknown IP shows up in Supabase logs using it.

**Treat as P0. Rotate everything that could have been touched, in this order:**

1. **Supabase service_role**
   - Dashboard → Project Settings → API → "Reset service_role JWT".
   - Update Edge Functions secrets (Deno deploy / Supabase secrets manager).
   - Update CI secret if any workflow uses it server-side (it should not be in
     `admin-portal.yml` — confirm via `gh secret list`).
2. **Supabase anon key** (only if you suspect broader exposure — anon key is
   public-ish but rotating invalidates cached tokens, which is sometimes
   desirable).
3. **RevenueCat secret API key (V1 secret)**
   - RC Dashboard → Project settings → API keys → revoke and reissue.
   - Lives in: Supabase Vault (`revenuecat_secret`) + Edge Function
     `admin-grant-promo`.
4. **Resend API key**
   - Resend Dashboard → API Keys → revoke and reissue.
   - Lives in: Supabase Vault (`resend_api_key`) + Edge Function
     `notify-admin-action`.
5. **PostHog project key**
   - PostHog EU → Project Settings → reset project API key.
   - Lives in: Cloudflare Pages env var `VITE_POSTHOG_KEY` (rebuild needed).
6. **Sentry DSN**
   - Sentry → Settings → Client Keys (DSN) → revoke + create new.
   - Lives in: Cloudflare Pages env var `VITE_SENTRY_DSN`.
7. **Cloudflare API token used by GitHub Actions** (`CF_API_TOKEN`)
   - Cloudflare → My Profile → API Tokens → roll the token.
   - Update GitHub repo secret.

After rotation:
- **Audit review:** dump the last 24 h of `admin_audit_log`,
  `auth.audit_log_entries`, RevenueCat events, Edge Function logs. Look for
  any action you cannot attribute to a known admin.
- **User impact assessment:** if any record was read or mutated outside an
  authenticated admin's session, treat as a data breach (§ 4).
- **Post-mortem within 7 days.** Document where the key leaked from and add a
  control to prevent that vector (CI gate, pre-commit hook, training).

### 2.3 Portal flooding (DDoS / scraper / brute-force)

Trigger: Cloudflare alert fires, error rate spikes, or login rate-limit emails
flood in.

1. Cloudflare → `peixes.ozly.au` → Security → **enable "Under Attack Mode"**.
2. Confirm the **app's** Supabase project is unaffected (different host —
   should be). If it is affected, scale the Supabase project up and open a
   ticket.
3. In WAF → Tools → block the offending IP / ASN / country. If the source is
   a residential botnet, prefer JS challenge or Turnstile over hard block.
4. If the attack targets `/login` specifically, temporarily disable email
   sign-in (Supabase Auth → Providers) and rely on Cloudflare Access SSO only.
5. After the wave passes, leave Under Attack Mode on for 24 h, then return to
   "High". File a Cloudflare abuse report with logs.

### 2.4 Insider abuse (admin acting maliciously)

Trigger: anomalous bulk action, after-hours `admin_get_user_360` storm, audit
trail showing access to users unrelated to support tickets.

1. **Preserve evidence first.**
   - `pg_dump --table=admin_audit_log` to encrypted storage.
   - Snapshot Cloudflare Access logs from R2.
   - Do not delete anything; do not confront the admin yet.
2. **Revoke access.**
   - `update profiles set role='user' where id='<uuid>';`
   - Revoke their sessions: `admin_ban_user(<uuid>, 'pending investigation')`
     (sets `is_banned=true` and triggers `admin-revoke-sessions`).
   - Remove from the Cloudflare Access Google group.
   - Disable their GitHub access to this repo (Settings → Access).
3. **Audit review.**
   - Build a CSV of every action they performed in the last 90 days.
   - Diff against support tickets / known approvals.
4. **Legal / HR.**
   - Consult counsel before any communication with the individual. In AU,
     unauthorised access to data may be a Privacy Act and Criminal Code issue
     (Cth s 478.1 — unauthorised access).
5. **Notify users** if their PII was accessed without basis (see § 4).

### 2.5 Kill switch — take the portal offline immediately

Use when: an unknown vulnerability is being exploited, a compromised admin
key is in the wild, or you simply need a maintenance window.

1. Cloudflare Pages → `ozly-admin-portal` → Settings → **Environment
   variables** → set `PORTAL_ENABLED=false` (production env).
2. Trigger a redeploy (Deployments → "Retry deployment" on the latest, or
   push an empty commit to `main`). Build serves `/maintenance`.
3. Verify: `curl -I https://peixes.ozly.au` returns 200 with the maintenance
   HTML. Login is gated upstream by Cloudflare Access — also disable the
   Access app temporarily if you want full lockout.
4. To restore: set `PORTAL_ENABLED=true`, redeploy. If the cause was a bad
   release, use **Cloudflare Pages → Deployments → "Rollback"** to the last
   known-good build (one click).

---

## 3. Key rotation policy

**Cadence:** every quarter (Jan / Apr / Jul / Oct, first Monday). Calendar
reminder owned by the Privacy Officer. **Immediate** rotation on any incident
in § 2.2.

| Key | Rotates in | Used by | Notes |
|---|---|---|---|
| Supabase `service_role` JWT | Supabase Dashboard → API | Edge Functions only | Never in client. CI gate enforces. |
| Supabase `anon` key | Supabase Dashboard → API | Mobile app + admin portal client | Rotation invalidates cached sessions; coordinate. |
| Supabase Vault entries | Supabase Dashboard → Vault | Edge Functions | Houses RevenueCat + Resend secrets. |
| RevenueCat V1 secret | RC Dashboard → API keys | Edge Function `admin-grant-promo` | |
| Resend API key | Resend Dashboard → API keys | Edge Function `notify-admin-action` | |
| PostHog project key | PostHog EU → Project | Admin portal client (build-time) | Requires CF Pages rebuild. |
| Sentry DSN | Sentry → Client Keys | Admin portal client (build-time) | Requires CF Pages rebuild. |
| Cloudflare API token (`CF_API_TOKEN`) | Cloudflare → API Tokens | GitHub Actions deploy | Update repo secret. |
| Cloudflare Access service tokens | Cloudflare Zero Trust | Any service-to-service calls | None today; placeholder. |
| GitHub repo secrets | GitHub → Settings → Secrets | CI | Audit list every quarter. |

After every rotation: log the action in `admin_audit_log`
(`action='key_rotation'`, payload includes which key + new fingerprint, never
the secret itself).

---

## 4. Compliance contacts

### Privacy Officer
- **Augusto Oliveira** — `augusto0102@gmail.com`
  (Add a second contact when the team grows.)

### Australia — OAIC (Office of the Australian Information Commissioner)
- Reference: **Notifiable Data Breaches scheme** (Privacy Act 1988, Part IIIC).
- Threshold: a breach is notifiable if it is **likely to result in serious
  harm** to one or more individuals and remediation cannot prevent that harm.
- Action: notify OAIC **and** affected individuals **as soon as practicable**
  (target: ≤ 72 h from confirmation of serious-harm assessment).
- Form: <https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach>
- Phone (general): `1300 363 992`.

### Brazil — LGPD (Lei Geral de Proteção de Dados)
- Even though our primary market is AU, Ozly serves a Brazilian migrant
  audience and processes PII originating from BR residents — LGPD applies.
- Authority: **ANPD** (Autoridade Nacional de Proteção de Dados),
  <https://www.gov.br/anpd>.
- Threshold: notify ANPD and the data subject when there is **risk or
  relevant damage** to data subjects. Target window per ANPD Resolução CD/ANPD
  nº 15/2024: **3 business days** from awareness.

### Other
- **Cloudflare abuse / takedown:** `abuse@cloudflare.com` (include zone +
  timestamp + sample logs).
- **Supabase support (paid plan):** dashboard ticket queue.
- **Apple / Google store contacts:** managed from the AusClean repo, not from
  the portal — out of scope here.

---

## 5. Annual security review checklist

Run every April (anniversary of go-live). Owner: Privacy Officer.

- [ ] Re-read `BRIEFING.md` end to end; flag any divergence from production.
- [ ] Verify CI gates still pass (service_role grep, console.log, source
      maps, CSP) — push a deliberate red PR to confirm they fail.
- [ ] Rotate **all** keys listed in § 3 (even if quarterly rotation already
      happened).
- [ ] Audit `profiles.role='admin'` — remove anyone no longer active.
- [ ] Review last 12 months of `admin_audit_log` for outliers (top 1% of
      actions per admin, after-hours patterns, bulk operations).
- [ ] Verify Cloudflare Access policy still pinned to the right Google
      Workspace group; check session lifetime is 8 h.
- [ ] Verify Supabase RLS is on for every public table:
      `select tablename from pg_tables where schemaname='public' and rowsecurity=false;`
      should return zero rows.
- [ ] Test the kill switch (§ 2.5) end to end and document recovery time.
- [ ] Test backup restore from Supabase to a staging project.
- [ ] If budget allows, commission an external **penetration test** (per
      `BRIEFING.md` D5 decision). Capture findings + remediation in this file.
- [ ] Update the runbooks in § 2 with anything learned in real incidents.
- [ ] Confirm `dependabot.yml` and `admin-portal.yml` workflows are still
      green and not silently disabled.

---

## 6. Emergency contact list

| Role | Name | Primary | Backup |
|---|---|---|---|
| Incident commander / Privacy Officer | Augusto Oliveira | `augusto0102@gmail.com` | TBD |
| On-call engineer | Augusto Oliveira | (same) | TBD |
| Legal counsel (AU) | TBD | — | — |
| Cloudflare account owner | Augusto Oliveira | (same) | TBD |
| Supabase account owner | Augusto Oliveira | (same) | TBD |

> **Add a second on-call when the team grows.** Until then every contact above
> is a single point of failure; mitigate by keeping this runbook current and
> by ensuring the kill switch (§ 2.5) is something Augusto can trigger from a
> phone.
