import { supabase } from './supabase';

// BRIEFING § 9: typed wrapper for admin RPCs. Sanitizes errors so DB internals
// (column names, constraint names, schema paths) don't leak to the UI.

export class RpcError extends Error {
  public readonly code: string | undefined;
  public readonly rpcName: string;

  constructor(rpcName: string, message: string, code?: string) {
    super(message);
    this.name = 'RpcError';
    this.rpcName = rpcName;
    if (code !== undefined) {
      this.code = code;
    }
  }
}

/**
 * Map raw Postgres / PostgREST errors to user-safe messages.
 * Never echo the raw `message` to UI — could expose schema details.
 */
function sanitizeError(rpcName: string, err: unknown): RpcError {
  // Best-effort PostgrestError shape
  const e = err as { message?: string; code?: string; details?: string };
  const code = e?.code;

  // Application-level errors we control
  if (code === '42501') {
    return new RpcError(rpcName, 'Forbidden', code);
  }
  if (code === 'P0001') {
    // Custom raise from RPC — message is curated by us, safe to surface
    return new RpcError(rpcName, e.message ?? 'Operation rejected', code);
  }
  if (code === '22023') {
    return new RpcError(rpcName, 'Invalid input', code);
  }
  if (code === '23505') {
    return new RpcError(rpcName, 'Duplicate', code);
  }
  if (code === '23503') {
    return new RpcError(rpcName, 'Reference not found', code);
  }

  // Anything else → generic. Real details are in Sentry (server-side only).
  return new RpcError(rpcName, 'Request failed', code);
}

export async function callRpc<T>(
  name: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args ?? {});
  if (error) {
    throw sanitizeError(name, error);
  }
  return data as T;
}
