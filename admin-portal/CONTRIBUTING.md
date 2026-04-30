# Contributing — Ozly Admin Portal

This portal touches TFNs, ABNs, financial data and visa info. The bar for
contributions is higher than the public site. Read `BRIEFING.md` and
`SECURITY.md` before opening a PR.

---

## Before you start

1. **2FA on Supabase is mandatory** for any GitHub account that ships code
   here. Enable WebAuthn/Passkey or TOTP — SMS is **not** accepted
   (`BRIEFING.md` § 7-L3).
2. **Cloudflare Access via Google Workspace** must be enabled on your account
   to even reach the deployed portal.
3. Use a **local `.env.local`** (gitignored) with the **anon key only**.
   Copy `.env.example` and fill in the values Augusto shares out-of-band.
   Never commit `.env*` files.
4. Confirm `git config user.signingkey` is set; we prefer signed commits.

---

## What you must never commit

- The Supabase **`service_role`** key (or any string matching
  `service_role` / `SUPABASE_SERVICE`). CI greps for this — it will fail
  your PR.
- RevenueCat secret keys, Resend keys, Sentry DSNs with auth tokens, PostHog
  personal API keys, Cloudflare API tokens.
- `.env`, `.env.local`, `.env.production` — all gitignored, do not force-add.
- Source maps, build artefacts, screenshots that contain real user PII.
- `console.log` statements in shipped code (CI checks `dist/` after build).

If you accidentally push a secret: **stop**, rotate the key immediately, and
follow `SECURITY.md` § 2.2.

---

## Code rules (non-negotiable)

- **Every admin RPC must call `is_admin()` as its first statement.**
  `BRIEFING.md` § 7-L4 + § 9. PR reviewers will reject any RPC without it.
- **Audit log writes go through SECURITY DEFINER functions only.** No
  direct `insert into admin_audit_log` from the client. The table has no
  insert RLS policy by design — direct inserts will fail and that is correct.
- **Inputs are validated with Zod** on the client *and* parametrised in the
  RPC on the server. Trust nothing from the network.
- **No `dangerouslySetInnerHTML`, `eval`, `new Function`, `setTimeout(string)`.**
  Banned by `BRIEFING.md` § 4.
- **No `localStorage` for tokens or PII.** Supabase auth handles its own
  storage; do not re-implement it.
- **TFN, email, phone are masked by default.** Use `<MaskedField>`. Revealing
  raw PII triggers an audit-log entry — design accordingly.
- **No new external CDN imports** without Subresource Integrity hashes. Pin
  versions; let Dependabot upgrade them.
- **Headers and CSP** live in `public/_headers`. If you need to relax CSP,
  document the trade-off in the PR description and ping Augusto first.

---

## PR checklist

Before requesting review, confirm each box:

- [ ] No secrets in the diff (`git diff main -- .` reads clean).
- [ ] `npm run lint` is green (zero warnings).
- [ ] `npx tsc --noEmit` is green.
- [ ] `npm test` passes (or "no tests" if the area has none yet).
- [ ] `npm run build` produces a `dist/` with no `*.map` files and no
      `console.log` references.
- [ ] Any new RPC starts with `if not is_admin() then raise exception ...;`.
- [ ] Any destructive UI action uses `<DangerZone>` with double-confirm.
- [ ] CSP / `_headers` is unchanged, or the change is documented in the PR
      body and reviewed by Augusto.
- [ ] You ran the change against a local build and verified it in the
      browser at least once. CI is a backstop, not a substitute.

The CI workflow `admin-portal.yml` enforces most of the above automatically
and **blocks deploy** if any gate fails. Treat a red CI as a real problem to
fix, not a flake to retry.

---

## Reporting a vulnerability

Email `augusto0102@gmail.com` with subject `[SECURITY] admin-portal: <short
description>`. Do **not** open a public issue. Expected first response:
within 48 h.
