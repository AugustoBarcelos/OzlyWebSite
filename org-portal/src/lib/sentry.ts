// Sentry init wrapper. The module dynamically imports `@sentry/react` only
// when `VITE_SENTRY_DSN` is set so the SDK isn't bundled when monitoring is
// off — keeps the baseline bundle smaller.
//
// To enable:
//   1. `npm i -S @sentry/react`
//   2. Set `VITE_SENTRY_DSN` in the Cloudflare Pages env (and locally in
//      `.env.local` if you want dev-time captures).
//   3. Re-deploy.
//
// `captureException` is exported as a safe no-op when Sentry isn't loaded
// — call it from ErrorBoundary / friendlyError without conditional checks.

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
  if (sentry) sentry.setUser(u);
}
