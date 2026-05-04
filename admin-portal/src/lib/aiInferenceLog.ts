/**
 * AI inference logging helper.
 *
 * Whenever the admin portal (or the app via shared backend) calls Gemini,
 * Anthropic, OpenAI etc, call `logAiInference()` after the response so the
 * finance/cost-monitor page can track costs in real time.
 *
 * Pricing references (USD per 1M tokens, 2026-05-04):
 *   - gemini-1.5-flash:  $0.075 in / $0.30 out  (default for Composer)
 *   - gemini-1.5-pro:    $1.25 in / $5.00 out   (heavier tasks)
 *   - gemini-2.0-flash:  $0.10 in / $0.40 out
 *   - claude-haiku-4.5:  $0.80 in / $4.00 out
 *   - claude-sonnet-4.6: $3.00 in / $15.00 out
 *
 * Adjust PRICES below as Google/Anthropic update their tables.
 */
import { callRpc } from './rpc';

interface PriceRow {
  in_per_1m_usd: number;
  out_per_1m_usd: number;
}

const PRICES: Record<string, PriceRow> = {
  'gemini-1.5-flash': { in_per_1m_usd: 0.075, out_per_1m_usd: 0.3 },
  'gemini-1.5-pro': { in_per_1m_usd: 1.25, out_per_1m_usd: 5.0 },
  'gemini-2.0-flash': { in_per_1m_usd: 0.1, out_per_1m_usd: 0.4 },
  'claude-haiku-4.5': { in_per_1m_usd: 0.8, out_per_1m_usd: 4.0 },
  'claude-sonnet-4.6': { in_per_1m_usd: 3.0, out_per_1m_usd: 15.0 },
  'claude-opus-4.7': { in_per_1m_usd: 15.0, out_per_1m_usd: 75.0 },
};

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICES[model];
  if (!p) return 0;
  return (tokensIn * p.in_per_1m_usd + tokensOut * p.out_per_1m_usd) / 1_000_000;
}

export interface LogAiInferenceArgs {
  /** Where the call originated (e.g. 'admin_composer', 'app_chat', 'app_compose'). */
  source: string;
  /** Model identifier — must match a key in PRICES for cost to be computed. */
  model: string;
  tokens_in: number;
  tokens_out: number;
  /** Optional override; otherwise computed from PRICES table. */
  cost_usd?: number;
  /** First 1k chars of prompt hashed (sha256) — for dedup analytics, no PII stored. */
  prompt_hash?: string;
  duration_ms?: number;
  status?: 'ok' | 'error' | 'timeout' | 'rate_limited';
  error?: string;
}

/**
 * Fire-and-forget log of an AI call. Failures are silent — never break the
 * caller's UX because of a logging issue.
 *
 * Routes via admin_log_ai_inference RPC (SECURITY DEFINER) instead of direct
 * INSERT — safer + no GRANT INSERT needed on base table.
 */
export async function logAiInference(args: LogAiInferenceArgs): Promise<void> {
  try {
    const cost =
      args.cost_usd ?? estimateCostUsd(args.model, args.tokens_in, args.tokens_out);
    await callRpc('admin_log_ai_inference', {
      p_source: args.source,
      p_model: args.model,
      p_tokens_in: Math.max(0, Math.floor(args.tokens_in)),
      p_tokens_out: Math.max(0, Math.floor(args.tokens_out)),
      p_cost_usd: Number(cost.toFixed(6)),
      p_status: args.status ?? 'ok',
      p_duration_ms: args.duration_ms ?? null,
      p_prompt_hash: args.prompt_hash ?? null,
      p_error: args.error ?? null,
    });
  } catch {
    /* silent — never throw from logging */
  }
}
