// Sentry init wrapper. The module dynamically imports `@sentry/react` only
// when `VITE_SENTRY_DSN` is set so the SDK isn't bundled into builds where
// monitoring is off — keeps the baseline bundle smaller. The package IS
// installed (^10.55.0); the dynamic import is purely for bundle-size hygiene.
//
// To enable monitoring in a given environment:
//   1. Set `VITE_SENTRY_DSN` in the host's build env (Cloudflare Pages /
//      Vercel / Netlify), or in `.env.local` for dev-time captures.
//   2. Deploy. Without a DSN, this module is a complete no-op.
//
// `captureException` is exported as a safe no-op when Sentry isn't loaded
// — call it from ErrorBoundary / friendlyError without conditional checks.
//
// PII scrubber: mirrors admin-portal/src/lib/sentry.ts. We ship error
// reports to a shared Sentry project, so ABN, email, phone, TFN must
// never appear in event messages, breadcrumbs, extras, or user records.
// Anything that smells like one is replaced with `[redacted]` BEFORE the
// SDK sends the event.

// ── PII scrubbing ───────────────────────────────────────────────────────
const PII_PATTERNS: Array<RegExp> = [
  /\b\d{3}[- ]?\d{3}[- ]?\d{3}\b/g, // TFN (9 digits)
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // email
  /\+?\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g, // phone
  /\b\d{11}\b/g, // ABN (11 digits)
];

function scrubString(s: string): string {
  let out = s;
  for (const p of PII_PATTERNS) {
    out = out.replace(p, '[redacted]');
  }
  return out;
}

function scrubAny(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map(scrubAny);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/email|phone|tfn|abn|address|name|password|token/i.test(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = scrubAny(v);
      }
    }
    return out;
  }
  return value;
}

// Minimal subset of the Sentry event shape we touch. The SDK accepts any
// extra fields, so this is intentionally narrow — it just types the
// scrubber without pulling in the full @sentry/react types.
interface SentryEventLike {
  message?: string;
  exception?: { values?: Array<{ value?: string }> };
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  user?: { id?: string | number; email?: string; ip_address?: string } | null;
}

function beforeSend(event: SentryEventLike): SentryEventLike {
  if (event.message) {
    event.message = scrubString(event.message);
  }
  if (event.exception?.values) {
    for (const v of event.exception.values) {
      if (v.value) v.value = scrubString(v.value);
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      ...(b.message ? { message: scrubString(b.message) } : {}),
      ...(b.data ? { data: scrubAny(b.data) as Record<string, unknown> } : {}),
    }));
  }
  if (event.extra) {
    event.extra = scrubAny(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = scrubAny(event.contexts) as Record<string, unknown>;
  }
  // User: keep id only, drop email / ip — these classes of PII have no
  // value in a triage context that the Supabase user_id doesn't already
  // give us, and they're a Privacy Act 1988 liability on AU data.
  if (event.user && event.user.id !== undefined) {
    event.user = { id: event.user.id };
  } else if (event.user) {
    event.user = null;
  }
  return event;
}

type SentryLike = {
  init: (cfg: Record<string, unknown>) => void;
  captureException: (e: unknown, ctx?: Record<string, unknown>) => void;
  setUser: (u: { id?: string; email?: string } | null) => void;
};

let sentry: SentryLike | null = null;

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    // Dynamic import so the SDK isn't pulled into the bundle when DSN absent.
    // The package isn't a hard dep — install it before flipping the DSN on.
    // `@vite-ignore` keeps Rollup happy; the variable string keeps TS from
    // statically resolving the module before it's installed.
    const pkg = '@sentry/react';
    const mod = (await import(/* @vite-ignore */ pkg)) as unknown as SentryLike;
    mod.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      // Newer Sentry SDKs default sendDefaultPii to false, but pinning
      // explicit defends against a future bump flipping the default and
      // documents the intent in code.
      sendDefaultPii: false,
      // Stamp every event with portal=org so the shared Sentry project can
      // separate org-portal errors from admin-portal errors at the dashboard
      // level (filter / saved search / issue alert). The admin-portal sets
      // its own initialScope.tags.portal='admin' for the same reason.
      initialScope: {
        tags: { portal: 'org' },
      },
      beforeSend,
    });
    sentry = mod;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[sentry] init failed (is @sentry/react installed?)', e);
  }
}

export function captureException(e: unknown, ctx?: Record<string, unknown>): void {
  if (sentry) sentry.captureException(e, ctx);
}

export function setUser(u: { id?: string; email?: string } | null): void {
  // Don't ship email even if a caller hands us one — strip before calling
  // the SDK. ID is enough to correlate with Supabase. If id is absent,
  // pass null (clear the user) rather than {id: undefined}.
  if (!sentry) return;
  if (!u || !u.id) {
    sentry.setUser(null);
    return;
  }
  sentry.setUser({ id: u.id });
}
