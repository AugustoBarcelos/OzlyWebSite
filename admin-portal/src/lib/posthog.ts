import posthog from 'posthog-js';

// BRIEFING D1 + § 13: PostHog Cloud EU. Trackeia ações do admin (não eventos
// de produto — esses ficam no app mobile).

const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.posthog.com';

const PII_KEY_REGEX = /email|phone|tfn|abn|address|name/i;

let initialized = false;

/**
 * Removes any property whose key matches PII regex.
 * Defense-in-depth: even if a caller forgets, sanitize at the edge.
 */
function sanitizeProps(
  props: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEY_REGEX.test(k)) continue;
    out[k] = v;
  }
  return out;
}

export function initPostHog(): void {
  if (initialized) return;
  if (!apiKey) {
    console.warn('[posthog] VITE_POSTHOG_API_KEY not set; analytics disabled.');
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'memory', // BRIEFING § 4 — no localStorage for sensitive data
    autocapture: false, // explicit-only events
    disable_session_recording: true, // PII risk in admin console
    sanitize_properties: (properties: Record<string, unknown> | undefined) =>
      sanitizeProps(properties),
  });

  // Single PostHog project shared with mobile app — tag every admin event
  // with source='admin' so dashboards can filter app vs admin cleanly.
  posthog.register({ source: 'admin' });

  initialized = true;
}

export function track(name: string, props?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(name, sanitizeProps(props));
}

export function identify(userId: string): void {
  if (!initialized) return;
  // We pass userId only — never email/name. Admin role context is added by
  // server-side enrichment if needed.
  posthog.identify(userId);
}

export function reset(): void {
  if (!initialized) return;
  posthog.reset();
}
