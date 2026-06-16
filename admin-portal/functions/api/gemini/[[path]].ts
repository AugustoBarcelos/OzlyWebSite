/**
 * Cloudflare Pages Function — server-side proxy to the Gemini (Google AI) API.
 *
 * Why: the Gemini key must never ship in the browser bundle. The client hits
 * same-origin `/api/gemini/<model>:generateContent`; this function injects the
 * key from `GEMINI_API_KEY_SERVER` (no VITE_ prefix → server-only) and forwards
 * to generativelanguage.googleapis.com.
 *
 * Auth: requires a valid Supabase session (Bearer token) so the proxy can't be
 * abused as an open, billable relay. Validated against /auth/v1/user.
 */

interface Env {
  GEMINI_API_KEY_SERVER?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function authed(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!(await authed(ctx.request, ctx.env))) return json({ error: 'Unauthorized' }, 401);

  const key = ctx.env.GEMINI_API_KEY_SERVER;
  if (!key) return json({ error: 'GEMINI_API_KEY_SERVER not configured on the Pages project' }, 503);

  // /api/gemini/<model>:generateContent → models/<model>:generateContent
  const inUrl = new URL(ctx.request.url);
  const path = inUrl.pathname.replace(/^\/api\/gemini\//, '').replace(/^\/+/, '');
  if (!/^[A-Za-z0-9._:-]+$/.test(path)) return json({ error: 'Bad model path' }, 400);

  const target = `https://generativelanguage.googleapis.com/v1beta/models/${path}?key=${encodeURIComponent(key)}`;
  const body = await ctx.request.text();
  const upstream = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
