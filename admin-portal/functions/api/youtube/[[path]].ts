/**
 * Cloudflare Pages Function — server-side proxy to the YouTube Data API v3.
 *
 * Why: keep the YouTube API key out of the browser bundle. The client hits
 * same-origin `/api/youtube/<endpoint>?<query>`; this function appends the key
 * from `YT_API_KEY_SERVER` (server-only) and forwards to googleapis.com.
 *
 * Auth: requires a valid Supabase session (Bearer token). Read-only (GET).
 */

interface Env {
  YT_API_KEY_SERVER?: string;
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

const ALLOWED = new Set(['channels', 'search', 'videos', 'playlistItems']);

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!(await authed(ctx.request, ctx.env))) return json({ error: 'Unauthorized' }, 401);

  const key = ctx.env.YT_API_KEY_SERVER;
  if (!key) return json({ error: 'YT_API_KEY_SERVER not configured on the Pages project' }, 503);

  const inUrl = new URL(ctx.request.url);
  const endpoint = inUrl.pathname.replace(/^\/api\/youtube\//, '').replace(/^\/+|\/+$/g, '');
  if (!ALLOWED.has(endpoint)) return json({ error: 'Endpoint not allowed' }, 400);

  const params = new URLSearchParams(inUrl.search);
  params.set('key', key);
  const target = `https://www.googleapis.com/youtube/v3/${endpoint}?${params.toString()}`;
  const upstream = await fetch(target);
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
