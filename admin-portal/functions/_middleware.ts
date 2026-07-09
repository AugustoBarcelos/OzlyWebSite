/**
 * Root Pages middleware — canonical-host gate.
 *
 * Why: Cloudflare Pages ALWAYS publishes the project on its default
 * `<project>.pages.dev` domain (here `ozly-admin.pages.dev`) and there is no
 * dashboard toggle to delete it. Any WAF / rate-limit / Cloudflare Access rule
 * scoped to the `peixes.ozly.au` zone is bypassed when someone hits the
 * `.pages.dev` domain directly — the whole admin SPA + every /api/* proxy is
 * served there with zero edge protection.
 *
 * This middleware runs before EVERY request (static assets and functions) and
 * refuses anything whose Host isn't the canonical portal host. Effect:
 *   - `ozly-admin.pages.dev`  → 404 (SPA never boots, proxies never run)
 *   - preview deploys          → 404
 *   - `peixes.ozly.au`         → served normally (next())
 *
 * The canonical host can be overridden per-environment via the
 * `CANONICAL_HOST` Pages variable; defaults to prod. `localhost`/`127.0.0.1`
 * are allowed so `wrangler pages dev` still works locally.
 */

interface Env {
  CANONICAL_HOST?: string;
}

const DEFAULT_CANONICAL = 'peixes.ozly.au';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const host = new URL(ctx.request.url).hostname.toLowerCase();
  const canonical = (ctx.env.CANONICAL_HOST ?? DEFAULT_CANONICAL).toLowerCase();

  if (host === canonical || LOCAL_HOSTS.has(host)) {
    return ctx.next();
  }

  // Non-canonical host (pages.dev, preview URLs, raw IP). Do not serve the app,
  // do not run the /api proxies, and don't leak the real host in a redirect.
  return new Response('Not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};
