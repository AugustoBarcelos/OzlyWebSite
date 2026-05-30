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

type SupabaseShaped = { code?: string; message?: string; details?: string };

function asShaped(e: unknown): SupabaseShaped | null {
  if (e && typeof e === 'object' && ('message' in e || 'code' in e)) {
    return e as SupabaseShaped;
  }
  return null;
}

/** Map any thrown value (RPC error, fetch error, exception, plain string)
 *  to a short user-friendly message. */
export function friendlyError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  // Always log the original so we can debug from the browser console.
  if (typeof console !== 'undefined') console.error('[friendlyError]', e);

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
