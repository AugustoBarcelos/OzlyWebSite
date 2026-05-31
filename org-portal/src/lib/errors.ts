// Centralised error → user-facing message mapping.
//
// Why: surfacing `error.message` directly from PostgREST/RPCs leaks schema
// internals to end users ("Org seat limit reached for plan starter",
// "permission denied for table organizations", etc.). This helper keeps the
// full detail in the console for debugging but renders a friendly, generic
// message in the UI.
//
// Add new branches sparingly — only when a specific server error is reached
// often enough that the generic fallback feels unhelpful.

import { captureException } from './sentry';

type SupabaseShaped = { code?: string; message?: string; details?: string };

function asShaped(e: unknown): SupabaseShaped | null {
  if (e && typeof e === 'object' && ('message' in e || 'code' in e)) {
    return e as SupabaseShaped;
  }
  return null;
}

// PG error codes that represent user-actionable input mistakes — not bugs.
// We don't ship these to Sentry to keep noise low.
const USER_INPUT_CODES = new Set([
  '23505',   // unique violation (duplicate)
  '23514',   // check violation
  '42501',   // permission denied / RLS denial
  'pgrst204',// no rows
]);

function shouldCapture(e: unknown): boolean {
  const shaped = asShaped(e);
  if (!shaped) return e instanceof Error; // capture exceptions, skip strings
  const code = (shaped.code ?? '').toLowerCase();
  if (USER_INPUT_CODES.has(code)) return false;
  const msg = (shaped.message ?? '').toLowerCase();
  // Network / offline — user's problem, not ours.
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) return false;
  // Auth surface — user typed wrong password etc.
  if (msg.includes('invalid login') || msg.includes('already registered') || msg.includes('rate')) return false;
  return true;
}

/** Map any thrown value (RPC error, fetch error, exception, plain string)
 *  to a short user-friendly message. Also surfaces the error to Sentry
 *  (skipping noise like user-input violations). */
export function friendlyError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  // Always log the original so we can debug from the browser console.
  if (typeof console !== 'undefined') console.error('[friendlyError]', e);
  // Ship the real exception to Sentry for monitoring (filtered noise).
  if (shouldCapture(e)) {
    try { captureException(e, { source: 'friendlyError' }); } catch { /* no-op */ }
  }

  if (typeof e === 'string') return e.length > 0 ? e : fallback;

  const shaped = asShaped(e);
  if (!shaped) return fallback;
  const code = (shaped.code ?? '').toLowerCase();
  const msg = (shaped.message ?? '').toLowerCase();

  // ── Network / offline ────────────────────────────────────────────────────
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return "Can't reach the server. Check your connection and try again.";
  }

  // ── Supabase / PostgREST error codes ─────────────────────────────────────
  // 42501 = insufficient_privilege (RLS or definer-gated function denial).
  if (code === '42501' || msg.includes('permission denied') || msg.includes('forbidden')) {
    return "You don't have permission to do that.";
  }
  // 23505 = unique violation (duplicate invite, duplicate row).
  if (code === '23505' || msg.includes('duplicate key')) {
    return 'That already exists. Refresh and try again.';
  }
  // check_violation / 23514 — seat-limit + custom guards.
  if (code === '23514' || code === 'check_violation' || msg.includes('seat limit')) {
    return 'This organisation is full. Upgrade your plan to add more members.';
  }
  // ── Org-portal-specific RPC messages worth keeping recognisable ─────────
  // Checked BEFORE the generic "not found" branch so an "Invitation not
  // found" raise from org_get_invitation maps to the specific copy instead
  // of the generic one.
  if (msg.includes('invitation expired') || msg.includes('invitation not found')) {
    return "That invitation isn't valid anymore.";
  }
  if (msg.includes('not authenticated')) return 'Please sign in again.';

  // PGRST204 = no rows (PostgREST .single() on empty result).
  if (code === 'pgrst204' || msg.includes('not found') || msg.includes('no rows')) {
    return 'Not found.';
  }

  // ── Auth / Supabase Auth surface ─────────────────────────────────────────
  if (msg.includes('invalid login')) return 'Wrong email or password.';
  if (msg.includes('already registered')) return 'That email is already in use. Try signing in.';
  if (msg.includes('rate')) return 'Too many attempts. Wait a minute and try again.';

  return fallback;
}
