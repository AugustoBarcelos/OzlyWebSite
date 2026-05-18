import { callRpc } from './rpc';

// Mirrors the JSON shape returned by `admin_errors_with_status` in
// supabase/migrations/20260518130000_admin_error_signatures.sql.
export type TriageStatus = 'open' | 'fixed' | 'wontfix' | 'noise';
export type TriageCategory = 'bug' | 'config' | 'noise';

export interface AppErrorRow {
  signature: string;
  message: string;
  occurrences: number;
  users: number;
  occ_short: number;
  users_short: number;
  last_seen: string;
  first_seen: string;
  screens: string[] | null;
  operations: string[] | null;
  app_versions: string[] | null;
  platforms: string[] | null;
  status: TriageStatus;
  category: TriageCategory | null;
  fixed_in_build: number | null;
  fix_notes: string | null;
  resolved_at: string | null;
  reopened_at: string | null;
  requires_release: boolean;
}

export interface AppErrorsResponse {
  period_days: number;
  short_window: number;
  rows: AppErrorRow[];
}

export interface FetchAppErrorsArgs {
  periodDays?: number;
  shortWindow?: number;
  limit?: number;
  status?: TriageStatus[] | null;
}

export async function fetchAppErrors(
  args: FetchAppErrorsArgs = {},
): Promise<AppErrorsResponse> {
  return callRpc<AppErrorsResponse>('admin_errors_with_status', {
    p_period_days: args.periodDays ?? 7,
    p_short_window: args.shortWindow ?? 2,
    p_limit: args.limit ?? 100,
    p_status: args.status === undefined ? ['open', 'fixed'] : args.status,
  });
}

export interface MarkSignatureArgs {
  signature: string;
  status: TriageStatus;
  fixedInBuild?: number | null;
  category?: TriageCategory | null;
  fixNotes?: string | null;
}

export async function markErrorSignature(
  args: MarkSignatureArgs,
): Promise<unknown> {
  return callRpc('admin_mark_error_signature', {
    p_signature: args.signature,
    p_status: args.status,
    p_fixed_in_build: args.fixedInBuild ?? null,
    p_category: args.category ?? null,
    p_fix_notes: args.fixNotes ?? null,
  });
}
