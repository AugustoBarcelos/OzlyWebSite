/**
 * Helper for calling Supabase Edge Functions with the admin's JWT.
 *
 * Distinct from `callRpc` (which hits PostgREST + the SECURITY DEFINER RPCs);
 * this is for our admin-only HTTP edge functions that proxy 3rd-party APIs
 * (Resend, GA4, etc) on the server side.
 *
 * Returns a discriminated union so the caller can pattern-match on success
 * vs error without throwing.
 */

import { supabase } from './supabase';
import { env } from './env';

export type EdgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export async function callEdge<T>(
  functionName: string,
  init: { method?: 'GET' | 'POST'; query?: Record<string, string>; body?: unknown } = {},
): Promise<EdgeResult<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  const url = new URL(`${env.supabaseUrl}/functions/v1/${functionName}`);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    url.searchParams.set(k, v);
  }

  try {
    const reqInit: RequestInit = {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    };
    if (init.body !== undefined) {
      reqInit.body = JSON.stringify(init.body);
    }
    const res = await fetch(url.toString(), reqInit);
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (_e) {
      parsed = null;
    }
    if (!res.ok) {
      const errMsg =
        (parsed as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errMsg };
    }
    return { ok: true, data: parsed as T };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}
