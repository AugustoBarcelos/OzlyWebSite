// Edge Function: compliance-overview-proxy
//
// Admin-only proxy for the /reliability/compliance page in the admin portal.
// Same security model as github-actions-proxy — verifies the calling user is
// an admin via JWT + profiles.role, then dispatches to one of:
//
//   ?op=overview                          — admin_compliance_overview() RPC
//   ?op=cohort_detail&fy=FY25-26          — admin_archive_cohort_detail(fy) RPC
//   ?op=deletion_log&days=30              — admin_deletion_log_recent(days) RPC
//   ?op=run_drill                         — admin_run_drill() RPC
//   ?op=archive_cohort_dry_run&fy=FY25-26 — invokes archive-fy-cohort edge fn
//                                            (in the AusClean Supabase project,
//                                            reachable via env vars below).
//
// Required env (Supabase secrets):
//   AUSCLEAN_SUPABASE_URL          — only required for archive_cohort_dry_run
//   AUSCLEAN_SUPABASE_SERVICE_KEY  — same; used as bearer for the dispatch
//
// If AUSCLEAN env vars are missing, archive_cohort_dry_run returns a 503 with
// a clear message; the other ops keep working since they only call local RPCs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAdmin(authHeader: string): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin";
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function callRpc(name: string, args: Record<string, unknown> = {}) {
  const sb = adminClient();
  const { data, error } = await sb.rpc(name, args);
  if (error) {
    return { ok: false as const, status: 500, error: error.message ?? "rpc_failed" };
  }
  return { ok: true as const, data };
}

async function dispatchArchiveDryRun(fy: string) {
  const url = Deno.env.get("AUSCLEAN_SUPABASE_URL");
  const key = Deno.env.get("AUSCLEAN_SUPABASE_SERVICE_KEY");
  if (!url || !key) {
    return {
      ok: false as const,
      status: 503,
      error: "AusClean project credentials not configured",
    };
  }
  const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/archive-fy-cohort`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fy, dry_run: true }),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { ok: res.ok, status: res.status, data: parsed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    if (!(await isAdmin(authHeader))) return json({ error: "Forbidden: admin only" }, 403);

    const url = new URL(req.url);
    const op = url.searchParams.get("op") ?? "overview";

    if (op === "overview") {
      const r = await callRpc("admin_compliance_overview");
      return r.ok ? json({ ok: true, data: r.data }) : json({ error: r.error }, r.status);
    }

    if (op === "cohort_list") {
      const sb = adminClient();
      const [cohortsRes, historyRes, drillsRes] = await Promise.all([
        sb.from("archive_cohorts")
          .select("fy_label,fy_start_date,fy_end_date,hot_until_date,cold_until_date,delete_after_date,status,file_count,total_bytes")
          .order("fy_start_date", { ascending: true }),
        sb.from("backup_audit_log")
          .select("id,job_name,started_at,finished_at,status,artifacts,errors")
          .in("job_name", ["daily_db_backup", "monthly_dr_backup"])
          .order("started_at", { ascending: false })
          .limit(30),
        sb.from("backup_audit_log")
          .select("id,job_name,started_at,finished_at,status,artifacts,errors")
          .eq("job_name", "verify_cold_tier")
          .order("started_at", { ascending: false })
          .limit(10),
      ]);
      if (cohortsRes.error || historyRes.error || drillsRes.error) {
        return json({ error: "cohort_list failed" }, 500);
      }
      // Inject job_name into artifacts for the UI which displays it from artifacts.
      const decorate = (rows: Array<Record<string, unknown>>) =>
        rows.map((r) => ({
          ...r,
          artifacts: { ...(r.artifacts as Record<string, unknown> ?? {}), job_name: r.job_name },
        }));
      return json({
        ok: true,
        data: {
          cohorts: cohortsRes.data ?? [],
          history: decorate(historyRes.data ?? []),
          drills: drillsRes.data ?? [],
        },
      });
    }

    if (op === "cohort_detail") {
      const fy = url.searchParams.get("fy");
      if (!fy) return json({ error: "fy required" }, 400);
      const r = await callRpc("admin_archive_cohort_detail", { p_fy: fy });
      return r.ok ? json({ ok: true, data: r.data }) : json({ error: r.error }, r.status);
    }

    if (op === "deletion_log") {
      const days = Number(url.searchParams.get("days") ?? "30");
      const r = await callRpc("admin_deletion_log_recent", { p_days: Number.isFinite(days) ? days : 30 });
      return r.ok ? json({ ok: true, data: r.data }) : json({ error: r.error }, r.status);
    }

    if (op === "run_drill") {
      const r = await callRpc("admin_run_drill");
      return r.ok ? json({ ok: true, data: r.data }) : json({ error: r.error }, r.status);
    }

    if (op === "archive_cohort_dry_run") {
      const fy = url.searchParams.get("fy");
      if (!fy) return json({ error: "fy required" }, 400);
      const r = await dispatchArchiveDryRun(fy);
      return json({ ok: r.ok, data: r.ok ? r.data : null, error: r.ok ? null : r.error }, r.status);
    }

    return json({ error: `unknown op: ${op}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500);
  }
});
