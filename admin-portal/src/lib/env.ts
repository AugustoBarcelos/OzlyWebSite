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
  | 'VITE_SENTRY_ORG'
  | 'VITE_SENTRY_PROJECT'
  | 'VITE_YT_CHANNEL_ID'
  | 'VITE_APP_URL';

// IMPORTANT: access each var STATICALLY. A dynamic `import.meta.env[name]`
// makes Vite inline the ENTIRE env object into the bundle — including any
// secret VITE_* var that happens to be set at build time. Listing only the
// non-secret keys here guarantees secrets never reach the browser, even if
// they're still present in the build environment.
const RAW: Record<EnvKey, string | undefined> = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_POSTHOG_API_KEY: import.meta.env.VITE_POSTHOG_API_KEY,
  VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_SENTRY_ORG: import.meta.env.VITE_SENTRY_ORG,
  VITE_SENTRY_PROJECT: import.meta.env.VITE_SENTRY_PROJECT,
  VITE_YT_CHANNEL_ID: import.meta.env.VITE_YT_CHANNEL_ID,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
};

function read(name: EnvKey): string | undefined {
  const v = RAW[name];
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
  // NOTE: the Sentry API token, YouTube API key and Gemini API key are
  // intentionally NOT read here. They are secrets and must never reach the
  // browser bundle. The client calls same-origin Pages Functions
  // (/api/sentry, /api/youtube, /api/gemini) which inject the key server-side.
  /** Sentry organization slug (e.g. `ozly`). */
  sentryOrg: read('VITE_SENTRY_ORG'),
  /** Sentry project slug (e.g. `ozly-mobile`). */
  sentryProject: read('VITE_SENTRY_PROJECT'),
  /** YouTube channel id (UCxxxxx) we care about — not a secret. */
  ytChannelId: read('VITE_YT_CHANNEL_ID'),
  appUrl,
} as const;
