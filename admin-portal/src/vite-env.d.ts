/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_POSTHOG_API_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
  readonly VITE_SENTRY_DSN: string;
  /**
   * Optional override for the app's public URL. Used to build the magic-link
   * redirect target. Falls back to `window.location.origin` if unset, which
   * is fine for localhost + Cloudflare Pages preview/production deploys.
   */
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
