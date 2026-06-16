/**
 * Gemini (Google AI) client — used by /marketing/ai-composer.
 *
 * Calls the public generateContent endpoint with the API key from
 * VITE_GEMINI_API_KEY. Logs every call to ai_inference_log via
 * logAiInference() so /finance/cost-monitor sees the spend in real time.
 *
 * Pricing reference (2026-05-04, USD per 1M tokens):
 *   - gemini-1.5-flash:  $0.075 in / $0.30 out  (default — cheap + fast)
 *   - gemini-1.5-pro:    $1.25 in / $5.00 out   (heavy tasks)
 *   - gemini-2.0-flash:  $0.10 in / $0.40 out
 */
import { supabase } from './supabase';
import { logAiInference } from './aiInferenceLog';

export type GeminiModel = 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash';

const DEFAULT_MODEL: GeminiModel = 'gemini-1.5-flash';

export interface GenerateContentOptions {
  /** Free-form text prompt. */
  prompt: string;
  /** Optional system instruction (used as systemInstruction.parts[0].text). */
  system?: string;
  /** Optional images / videos as base64 (MIME → data). */
  inlineData?: Array<{ mimeType: string; data: string }>;
  /** Model override; defaults to gemini-1.5-flash. */
  model?: GeminiModel;
  /** Source identifier for ai_inference_log (e.g. 'admin_composer'). */
  source: string;
  /** Generation config — passed through to Gemini API. */
  config?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

export interface GenerateContentResult {
  text: string;
  tokens_in: number;
  tokens_out: number;
  model: GeminiModel;
  duration_ms: number;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * The Gemini key now lives server-side (Pages Function /api/gemini). The client
 * can't see it, so we assume it's available and let the proxy surface a clear
 * 503 if the server key is missing.
 */
export function isGeminiConfigured(): boolean {
  return true;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; code?: number };
}

/**
 * Calls Gemini generateContent. Logs to ai_inference_log on every outcome
 * (ok / error / timeout). Throws GeminiError on failure.
 */
export async function generateContent(
  opts: GenerateContentOptions,
): Promise<GenerateContentResult> {
  const model = opts.model ?? DEFAULT_MODEL;
  // Same-origin proxy — the key is injected server-side, never in the bundle.
  const url = `/api/gemini/${model}:generateContent`;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new GeminiError('Sessão expirada — entre de novo.', 401, 'no_session');
  }

  const parts: Array<Record<string, unknown>> = [{ text: opts.prompt }];
  if (opts.inlineData) {
    for (const data of opts.inlineData) {
      parts.push({ inlineData: { mimeType: data.mimeType, data: data.data } });
    }
  }

  const body: Record<string, unknown> = {
    contents: [{ parts, role: 'user' }],
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }
  if (opts.config) {
    body.generationConfig = opts.config;
  }

  const t0 = window.performance.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const duration = Math.round(window.performance.now() - t0);
    void logAiInference({
      source: opts.source,
      model,
      tokens_in: 0,
      tokens_out: 0,
      duration_ms: duration,
      status: 'error',
      error: e instanceof Error ? e.message : 'network error',
    });
    throw new GeminiError(e instanceof Error ? e.message : 'Network error', 0, 'network');
  }

  const duration = Math.round(window.performance.now() - t0);
  let data: GeminiResponse;
  try {
    data = (await response.json()) as GeminiResponse;
  } catch {
    void logAiInference({
      source: opts.source,
      model,
      tokens_in: 0,
      tokens_out: 0,
      duration_ms: duration,
      status: 'error',
      error: `HTTP ${response.status} non-JSON body`,
    });
    throw new GeminiError(`Non-JSON response (HTTP ${response.status})`, response.status);
  }

  if (!response.ok || data.error) {
    const msg = data.error?.message ?? `HTTP ${response.status}`;
    const code = data.error?.status ?? `http_${response.status}`;
    void logAiInference({
      source: opts.source,
      model,
      tokens_in: data.usageMetadata?.promptTokenCount ?? 0,
      tokens_out: 0,
      duration_ms: duration,
      status: response.status === 429 ? 'rate_limited' : 'error',
      error: msg,
    });
    throw new GeminiError(msg, response.status, code);
  }

  if (data.promptFeedback?.blockReason) {
    const reason = data.promptFeedback.blockReason;
    void logAiInference({
      source: opts.source,
      model,
      tokens_in: data.usageMetadata?.promptTokenCount ?? 0,
      tokens_out: 0,
      duration_ms: duration,
      status: 'error',
      error: `Blocked: ${reason}`,
    });
    throw new GeminiError(`Prompt blocked by Gemini: ${reason}`, 400, 'blocked');
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .filter(Boolean)
      .join('\n') ?? '';

  const tokens_in = data.usageMetadata?.promptTokenCount ?? 0;
  const tokens_out = data.usageMetadata?.candidatesTokenCount ?? 0;

  void logAiInference({
    source: opts.source,
    model,
    tokens_in,
    tokens_out,
    duration_ms: duration,
    status: 'ok',
  });

  return { text, tokens_in, tokens_out, model, duration_ms: duration };
}
