import { callRpc, RpcError } from './rpc';
import { callEdge } from './edge';

/**
 * Pure async wrappers around the four operational admin RPCs.
 *
 * Every function returns a discriminated result `{ success, ... }` so the
 * UI doesn't have to try/catch. Errors are sanitized — only RpcError messages
 * (which are already curated by lib/rpc.ts) bubble up. Anything unexpected
 * collapses to a generic "Request failed" string so DB internals don't reach
 * the UI (BRIEFING § 7-L7 + § 11.4 hardening).
 *
 * Backend RPCs (already deployed):
 *  - admin_grant_promo(p_target uuid, p_entitlement text, p_days int)
 *  - admin_force_resync(p_target uuid)
 *  - admin_soft_delete_user(p_target uuid, p_reason text)
 *  - admin_ban_user(p_target uuid, p_reason text)
 *
 * Each RPC writes to admin_audit_log server-side and is rate-limited per admin.
 */

export type Entitlement = 'tfn_access' | 'abn_access' | 'pro';

export interface ActionResult {
  success: boolean;
  /** Audit log row id when the RPC returns one (newer SECURITY DEFINER fns). */
  audit_id?: string;
  /** Sanitized error string. Never contains raw DB output. */
  error?: string;
}

/** Server returns either a uuid (audit id) or a row { audit_id }. Normalize. */
function pickAuditId(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (raw && typeof raw === 'object' && 'audit_id' in raw) {
    const v = (raw as { audit_id?: unknown }).audit_id;
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof RpcError) return err.message;
  if (err instanceof Error && err.message) {
    // Last-resort generic — never propagate raw error.
    return 'Request failed';
  }
  return 'Request failed';
}

const VALID_ENTITLEMENTS: ReadonlySet<Entitlement> = new Set([
  'tfn_access',
  'abn_access',
  'pro',
]);

/**
 * Grant a promo entitlement to a user for N days (1–365).
 * Rate-limited 10/min per admin server-side.
 */
export async function grantPromo(
  targetUserId: string,
  entitlement: Entitlement,
  days: number
): Promise<ActionResult> {
  if (!targetUserId) return { success: false, error: 'Missing user id' };
  if (!VALID_ENTITLEMENTS.has(entitlement)) {
    return { success: false, error: 'Invalid entitlement' };
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return { success: false, error: 'Days must be 1–365' };
  }

  try {
    const data = await callRpc<unknown>('admin_grant_promo', {
      p_target: targetUserId,
      p_entitlement: entitlement,
      p_days: days,
    });
    const auditId = pickAuditId(data);
    return auditId ? { success: true, audit_id: auditId } : { success: true };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
}

/**
 * Mark the user's profile so the mobile client triggers a full local sync
 * on next foreground. Rate-limited 30/min.
 */
export async function forceResync(
  targetUserId: string
): Promise<ActionResult> {
  if (!targetUserId) return { success: false, error: 'Missing user id' };
  try {
    const data = await callRpc<unknown>('admin_force_resync', {
      p_target: targetUserId,
    });
    const auditId = pickAuditId(data);
    return auditId ? { success: true, audit_id: auditId } : { success: true };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
}

/**
 * Soft-delete (anonymize + flag) a user. Reason 5–1000 chars, rate 5/min.
 * Reversible by Augusto via SQL — no hard delete from this UI.
 */
export async function softDeleteUser(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  if (!targetUserId) return { success: false, error: 'Missing user id' };
  const trimmed = reason.trim();
  if (trimmed.length < 5 || trimmed.length > 1000) {
    return { success: false, error: 'Reason must be 5–1000 characters' };
  }
  try {
    const data = await callRpc<unknown>('admin_soft_delete_user', {
      p_target: targetUserId,
      p_reason: trimmed,
    });
    const auditId = pickAuditId(data);
    return auditId ? { success: true, audit_id: auditId } : { success: true };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
}

/**
 * GDPR / Privacy Act 1988 (AU APP 12) export. Returns a complete bundle of
 * everything Ozly stores about the target user. The browser saves it to a
 * local file; the server records the export in admin_audit_log.
 *
 * Uses callEdge so the response (which can be large) streams straight into
 * a Blob without going through the RPC layer.
 */
export async function exportUserData(
  targetUserId: string
): Promise<{ success: true; bundle: unknown } | { success: false; error: string }> {
  if (!targetUserId) return { success: false, error: 'Missing user id' };
  const r = await callEdge<unknown>('admin-export-user-data', {
    method: 'POST',
    body: { target_user_id: targetUserId },
  });
  if (!r.ok) return { success: false, error: r.error };
  return { success: true, bundle: r.data };
}

/**
 * Trigger a JSON file download in the browser for a given object. Pure
 * client-side; never touches the network. Used by the Export Data button.
 */
export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ban a user. Reason 5–1000 chars, rate 5/min. Server invalidates sessions
 * via the admin-revoke-sessions edge function.
 */
export async function banUser(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  if (!targetUserId) return { success: false, error: 'Missing user id' };
  const trimmed = reason.trim();
  if (trimmed.length < 5 || trimmed.length > 1000) {
    return { success: false, error: 'Reason must be 5–1000 characters' };
  }
  try {
    const data = await callRpc<unknown>('admin_ban_user', {
      p_target: targetUserId,
      p_reason: trimmed,
    });
    const auditId = pickAuditId(data);
    return auditId ? { success: true, audit_id: auditId } : { success: true };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
}
