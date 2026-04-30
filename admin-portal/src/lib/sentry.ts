import * as Sentry from '@sentry/react';

// BRIEFING § 13: Sentry com beforeSend filtrando PII (email, phone, TFN).

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

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    // No DSN configured — skip silently. BRIEFING allows gated init.
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Source maps are server-side only (BRIEFING § 4) — Sentry CLI uploads
    // them at deploy, never in the build artifact served to clients.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Scrub message
      if (event.message) {
        event.message = scrubString(event.message);
      }
      // Scrub exception values
      if (event.exception?.values) {
        for (const v of event.exception.values) {
          if (v.value) v.value = scrubString(v.value);
        }
      }
      // Scrub breadcrumbs / extra / contexts
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
        event.contexts = scrubAny(event.contexts) as typeof event.contexts;
      }
      // Strip user PII; keep id only.
      if (event.user && event.user.id !== undefined) {
        event.user = { id: event.user.id };
      } else if (event.user) {
        delete event.user;
      }
      return event;
    },
  });
}

export { Sentry };
