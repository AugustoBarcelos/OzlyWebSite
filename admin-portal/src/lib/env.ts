/**
 * Type-safe accessor for build-time env vars.
 *
 * BRIEFING § 7-L7: secrets are injected at build time via Cloudflare Pages
 * env vars (or .env.local for local dev). This helper centralises lookups
 * and throws loudly in development if a required value is missing — so we
 * notice misconfiguration before shipping.
 *
 * Public values only (everything is shipped to the client). Service-role
 * keys MUST NOT be referenced here (BRIEFING § 4 banned list, audited in CI).
 */

const isDev = import.meta.env.DEV;

// Subset of env keys we read here. Kept narrow on purpose — service-role
// keys must never be referenced from `src/`.
type EnvKey =
  | 'VITE_SUPABASE_URL'
  | 'VITE_SUPABASE_ANON_KEY'
  | 'VITE_POSTHOG_API_KEY'
  | 'VITE_POSTHOG_HOST'
  | 'VITE_SENTRY_DSN'
  | 'VITE_SENTRY_API_TOKEN'
  | 'VITE_SENTRY_ORG'
  | 'VITE_SENTRY_PROJECT'
  | 'VITE_YT_API_KEY'
  | 'VITE_YT_CHANNEL_ID'
  | 'VITE_APP_URL';

function read(name: EnvKey): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function required(name: EnvKey): string {
  const v = read(name);
  if (!v) {
    const msg = `[env] Missing required env var: ${String(name)}`;
    if (isDev) {
      throw new Error(msg);
    }
    // In prod we don't crash boot — surface a clearer error at first use.
    console.warn(msg);
    return '';
  }
  return v;
}

/**
 * Base URL of the running app. Used to build the magic-link redirect.
 * Falls back to `window.location.origin` so the value is correct in
 * every environment (localhost, preview deploys, prod) without needing
 * an explicit env var.
 */
export function appUrl(): string {
  const explicit = read('VITE_APP_URL');
  if (explicit) return explicit.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5174';
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  posthogApiKey: read('VITE_POSTHOG_API_KEY'),
  posthogHost: read('VITE_POSTHOG_HOST') ?? 'https://eu.posthog.com',
  sentryDsn: read('VITE_SENTRY_DSN'),
  /**
   * Sentry REST API personal auth token — optional.
   * When set together with `sentryOrg` and `sentryProject`, the /errors page
   * fetches event counts and top issues directly. When absent, the page
   * renders quick-link cards to the Sentry web UI instead.
   */
  sentryApiToken: read('VITE_SENTRY_API_TOKEN'),
  /** Sentry organization slug (e.g. `ozly`). */
  sentryOrg: read('VITE_SENTRY_ORG'),
  /** Sentry project slug (e.g. `ozly-mobile`). */
  sentryProject: read('VITE_SENTRY_PROJECT'),
  /** YouTube Data API v3 key — read-only, restricted server-side ideally. */
  ytApiKey: read('VITE_YT_API_KEY'),
  /** YouTube channel id (UCxxxxx) we care about. */
  ytChannelId: read('VITE_YT_CHANNEL_ID'),
  appUrl,
} as const;
