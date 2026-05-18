/**
 * Cloudflare Pages Function — server-side proxy to the Sentry REST API.
 *
 * Why this exists:
 *   Sentry rejects Personal Auth Tokens and Internal Integration tokens used
 *   from a browser `fetch` with a 400 "Invalid origin" (org-level enforcement
 *   we can't toggle from the dashboard). The fix is to keep the token off the
 *   wire client-side: the browser hits same-origin `/api/sentry/<path>`, this
 *   function injects `Authorization: Bearer <token>` and forwards to
 *   `https://sentry.io/api/0/<path>`.
 *
 * Token source:
 *   `SENTRY_API_TOKEN_SERVER` — note no `VITE_` prefix on purpose. Server-only
 *   env in Cloudflare Pages → it never ends up in the JS bundle. Set it under
 *   Settings → Variables and Secrets → Production for the `ozly-admin` Pages
 *   project. The existing `VITE_SENTRY_API_TOKEN` becomes dead weight; safe
 *   to delete it once this is live.
 *
 * Security:
 *   - Method restricted to GET (everything Sentry-read we use is GET).
 *   - Path is forwarded as-is; no command injection vector because we slot
 *     into a URL not a shell.
 *   - Errors from upstream are passed through with their original status so
 *     `sentry-api.ts` can surface them (e.g. 404 missing project).
 */

interface Env {
  SENTRY_API_TOKEN_SERVER?: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const token = ctx.env.SENTRY_API_TOKEN_SERVER;
  if (!token) {
    return json(
      { detail: 'SENTRY_API_TOKEN_SERVER not configured on the Pages project' },
      503,
    );
  }

  // Forward the path. Both Cloudflare Pages routing and the params helper
  // strip the trailing slash from the request URL, but Sentry's REST API
  // returns 404 "did you forget a trailing slash?" on collection endpoints
  // (/organizations/<org>/, /issues/, /stats_v2/, …). Every endpoint we hit
  // from sentry-api.ts is a collection, so we unconditionally add the slash.
  const inUrl = new URL(ctx.request.url);
  const stripped = inUrl.pathname.replace(/^\/api\/sentry/, '');
  if (!stripped || stripped === '/') {
    return json({ detail: 'Missing sentry path' }, 400);
  }
  const sentryPath = stripped.endsWith('/') ? stripped : `${stripped}/`;
  const upstream = `https://sentry.io/api/0${sentryPath}${inUrl.search}`;

  const upstreamRes = await fetch(upstream, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      // No `Origin` header forwarded — that's what triggers Sentry's reject.
    },
  });

  const body = await upstreamRes.text();
  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      'Content-Type':
        upstreamRes.headers.get('Content-Type') ?? 'application/json',
      // Surface paging metadata if Sentry sent it (used by some endpoints).
      ...(upstreamRes.headers.get('Link')
        ? { Link: upstreamRes.headers.get('Link') as string }
        : {}),
    },
  });
};

// Any non-GET → 405 (Sentry-read is GET only here).
export const onRequest: PagesFunction<Env> = (ctx) => {
  if (ctx.request.method === 'GET') return onRequestGet(ctx);
  return new Response('Method not allowed', { status: 405 });
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
