// Edge Function: import-map
//
// AI-assisted job import. The org portal uploads the raw rows of a spreadsheet
// (CSV / XLSX exported from some other rostering platform) and this function
// asks Claude to map the messy, arbitrary columns into the structured shape the
// org_offer_work RPC expects. Claude returns STRICT JSON (an array) which the
// portal then matches to real members, previews, edits and bulk-creates.
//
// Security model: this is gated by Supabase JWT verification (the default for
// functions invoked via supabase.functions.invoke, which forwards the caller's
// access token). We additionally require an Authorization header to be present.
// No org-admin RPC is called here — the actual job creation happens client-side
// under the caller's own RLS via org_offer_work, so a leaked mapping cannot
// create jobs by itself.
//
// Required env (Supabase secrets — set with `supabase secrets set ...`):
//   ANTHROPIC_API_KEY  — Anthropic API key (REQUIRED). Without it the function
//                        returns 503 and the portal falls back to a manual
//                        column-mapping UI.
//   ANTHROPIC_MODEL    — optional; defaults to "claude-sonnet-4-6".
//
// Request body:  { rows: Array<Record<string, unknown>>, headers?: string[] }
// Response:      { ok: true, mapped: MappedRow[], truncated: boolean }
//             or { error: string } with a 4xx/5xx status.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_ROWS = 200;

// The target shape Claude maps each spreadsheet row into. Kept in lock-step with
// the client's MappedRow type in src/routes/import.tsx.
interface MappedRow {
  member_hint: string | null; // a name or email to match against an org member
  title: string | null;
  start: string | null; // ISO 8601
  end: string | null; // ISO 8601
  location: string | null;
  notes: string | null;
  hourly_rate: number | null;
}

// System prompt is static across requests → mark it cache-eligible so repeated
// imports in a session reuse the cached prefix and cut latency / cost.
const SYSTEM_PROMPT = `You convert messy spreadsheet rows exported from rostering / job-scheduling platforms into a strict, structured job-offer shape.

You are given a JSON array of row objects (raw headers as keys, cell values as values). Map EACH input row to EXACTLY ONE output object with these keys:

- "member_hint": string | null — the worker's name OR email, whatever the row identifies the assigned person by. Prefer email if present. null if the row names no person.
- "title": string | null — a short description of the work (job title, service, task). Synthesize a sensible one from available columns if there's no explicit title.
- "start": string | null — the job start as ISO 8601 (e.g. "2026-03-14T09:00:00"). Combine separate date + time columns. Interpret ambiguous numeric dates as DAY/MONTH/YEAR (Australian convention). null if no start is derivable.
- "end": string | null — the job end as ISO 8601. If only a duration or shift length is given, add it to start. null if not derivable.
- "location": string | null — site / address / suburb. null if absent.
- "notes": string | null — any extra instructions, brief, or remarks. null if absent.
- "hourly_rate": number | null — numeric pay rate per hour. Strip currency symbols. null if absent or if it's a total (not hourly).

RULES:
- Output MUST be a single JSON array, one object per input row, in the SAME ORDER. No prose, no markdown, no code fences.
- Use null (not "" or "N/A") for anything you cannot derive.
- Never invent a member_hint, location or rate that isn't supported by the row.
- Preserve every input row even if mostly empty (emit an object with nulls).`;

function buildUserPrompt(rows: Array<Record<string, unknown>>): string {
  return `Map the following ${rows.length} row(s) to the structured array. Return ONLY the JSON array.\n\n${JSON.stringify(rows)}`;
}

// Pull the first balanced JSON array out of the model text — defends against a
// stray prose preamble or accidental code fence despite the instructions.
function extractJsonArray(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return JSON");
  }
}

function coerceRow(raw: unknown): MappedRow {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  return {
    member_hint: str(o.member_hint),
    title: str(o.title),
    start: str(o.start),
    end: str(o.end),
    location: str(o.location),
    notes: str(o.notes),
    hourly_rate: num(o.hourly_rate),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing auth" }, 401);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    // No key configured → tell the client so it can fall back to manual mapping.
    return json({ error: "AI mapping is not configured (ANTHROPIC_API_KEY missing)." }, 503);
  }

  let body: { rows?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const allRows = body.rows;
  if (!Array.isArray(allRows) || allRows.length === 0) {
    return json({ error: "`rows` must be a non-empty array" }, 400);
  }
  const truncated = allRows.length > MAX_ROWS;
  const rows = (truncated ? allRows.slice(0, MAX_ROWS) : allRows) as Array<Record<string, unknown>>;

  const model = Deno.env.get("ANTHROPIC_MODEL") ?? DEFAULT_MODEL;

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            // Prompt caching on the static system prompt.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          { role: "user", content: buildUserPrompt(rows) },
        ],
      }),
    });
  } catch (e) {
    return json({ error: `Could not reach Anthropic: ${e instanceof Error ? e.message : "network error"}` }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    // Surface auth/quota problems as a 502 with a readable message; the client
    // degrades to manual mapping on any non-2xx.
    return json({ error: `Anthropic API error (${resp.status})`, detail: detail.slice(0, 500) }, 502);
  }

  let payload: { content?: Array<{ type: string; text?: string }> };
  try {
    payload = await resp.json();
  } catch {
    return json({ error: "Anthropic returned a non-JSON response" }, 502);
  }

  const text = (payload.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");

  if (!text) return json({ error: "Anthropic returned an empty response" }, 502);

  let parsed: unknown;
  try {
    parsed = extractJsonArray(text);
  } catch {
    return json({ error: "AI returned malformed JSON — try the manual mapping instead." }, 502);
  }
  if (!Array.isArray(parsed)) {
    return json({ error: "AI did not return a JSON array." }, 502);
  }

  const mapped = parsed.map(coerceRow);
  return json({ ok: true, mapped, truncated });
});
