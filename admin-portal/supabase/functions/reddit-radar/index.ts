// Edge Function: reddit-radar
//
// Descobre threads frescas e relevantes do Reddit (ABN, sole trader, invoice, WHV,
// imposto) e sugere um comentário JÁ dentro das regras de engajamento — sem link,
// e só cita a Ozly quando o thread pede app. NÃO posta nada: só popula a tabela
// `marketing_reddit_threads` pro admin revisar em /marketing/reddit e comentar na mão.
//
// Mesmo modelo de segurança do compliance-overview-proxy: gate is_admin via JWT,
// depois service role pra ler/gravar a tabela.
//
//   ?op=list        — devolve as threads guardadas (fresco/tool-request primeiro)
//   ?op=refresh     — autentica no Reddit, busca, classifica e grava as novas
//   ?op=set_status  — body { reddit_id, status } → marca commented/dismissed
//
// Secrets (supabase secrets set):
//   REDDIT_CLIENT_ID       — app tipo "script" em reddit.com/prefs/apps
//   REDDIT_CLIENT_SECRET   — o secret do mesmo app
//   REDDIT_USER_AGENT      — opcional, ex: "macos:ozly-radar:1.0 (by /u/seu_user)"
//
// Se os secrets do Reddit faltarem, op=refresh devolve { configured:false } (200)
// pra UI mostrar o passo-a-passo em vez de estourar erro.

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

const TABLE = "marketing_reddit_threads";
const MAX_COMMENTS = 25; // ignora thread já lotada (você chega tarde)
const MAX_AGE_HOURS = 72;

// ─────────────────────────────────────────────────────────── auth
async function isAdmin(authHeader: string): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = adminClient();
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

// ─────────────────────────────────────────────────────────── config do radar
const SEARCHES: Array<{ sub: string; q: string }> = [
  { sub: "AusFinance", q: "ABN sole trader tax" },
  { sub: "AusFinance", q: "new to ABN contractor" },
  { sub: "AusFinance", q: "how much tax set aside" },
  { sub: "PersonalFinanceAu", q: "ABN invoice GST" },
  { sub: "PersonalFinanceAu", q: "first invoice sole trader" },
  { sub: "AusSmallBusiness", q: "ABN invoice app" },
  { sub: "AusLegal", q: "contractor ABN employee" },
  { sub: "UberEatsDrivers", q: "ABN tax australia" },
  { sub: "backpackingaustralia", q: "tax return working holiday" },
  { sub: "WorkingHolidays", q: "australia tax refund" },
  { sub: "brasileirosnomundo", q: "australia ABN imposto" },
  { sub: "", q: "australia ABN first invoice GST" },
  { sub: "", q: "australia sole trader how much tax to put aside" },
];

const INCLUDE = [
  "abn", "sole trader", "sole-trader", "invoice", "gst", "contractor",
  "working holiday", "whv", "backpacker tax", "tax return", "set aside",
  "put aside", "self employed", "self-employed", "uber", "deliveroo", "menulog",
  "student visa", "tax refund",
];
const EXCLUDE = ["usa", "u.s.", "irs", "401k", "canada", "uk tax", "nz ", "crypto tax"];

interface Archetype { key: string; mentionOzly: boolean; test: RegExp }
const ARCHETYPES: Archetype[] = [
  {
    key: "tool-request",
    mentionOzly: true,
    test:
      /\b(what|which|any|recommend|best|good)\b.{0,40}\b(app|apps|software|tool|tools|spreadsheet|program)\b|\b(app|tool|software)\b.{0,25}\b(recommend|suggestion|use to|for (tracking|invoic))/i,
  },
  {
    key: "tax-set-aside",
    mentionOzly: false,
    test: /\b(how much|set aside|put aside|save (up )?for tax|percentage.*tax|tax.*percentage)\b/i,
  },
  {
    key: "first-invoice",
    mentionOzly: false,
    test: /\b(first invoice|invoice template|what.*on.*invoice|do i (charge|add) gst|need an? invoice)\b/i,
  },
  {
    key: "whv-tax",
    mentionOzly: false,
    test: /\b(working holiday|whv|417|462|backpacker|student visa)\b.{0,60}\b(tax|refund|return|taxed)\b/i,
  },
  {
    key: "new-abn",
    mentionOzly: false,
    test: /\b(new to abn|just got (an? )?abn|started (working )?on abn|new sole trader|where do i (start|begin)|first year)\b/i,
  },
];

const TEMPLATES: Record<string, string> = {
  "tool-request":
    `Depends how much you're juggling. Spreadsheet's fine until ~10 invoices/month, then reconciling GST by hand gets painful. Honest disclosure — I'm one of the people behind Ozly, an app built specifically for Aussie ABN sole traders (invoices, expense tracking, tax set-aside, and a visa-hours tracker if you're on a student/WHV). Not pretending it's the only option — Hnry and Rounded are solid too depending on whether you want to DIY or hand it off. Happy to answer anything either way.`,
  "tax-set-aside":
    `As a sole trader nothing's withheld for you, so the rule of thumb is park 25–30% of every payment in a separate account the second it lands. Year one it hits as a lump sum, and right after your first return the ATO usually puts you on quarterly PAYG instalments — so the buffer matters. If you cross $75k turnover you also register for GST and add 10% (that 10% isn't yours, it's the ATO's). Keep every receipt — tools, fuel, phone %, home office all come off the top.`,
  "first-invoice":
    `A valid invoice needs: your name/business name, your ABN, the date, a description, and the total. If you're NOT GST-registered (under $75k) you do NOT charge GST — it's just a "Tax Invoice" with no GST line, don't add 10% you're not registered for. If you are registered, show the GST amount separately. Number them sequentially so your BAS/return reconciles later.`,
  "whv-tax":
    `WHM rate is 15% up to $45k, then normal marginal rates above. If your employer taxed you higher they probably didn't register as an employer of working holiday makers — you claim the difference back in your tax return after June 30. Watch the 6-month-per-employer limit, and keep receipts for anything work-related (uniform, tools). Super you can claim when you leave for good.`,
  "new-abn":
    `Three things that trip everyone up: (1) nobody withholds tax — set aside 25–30% yourself into a separate account; (2) $75k turnover = mandatory GST (rideshare it's from dollar one); (3) track expenses religiously — every km, tool and phone % is deductible and it's the difference between owing and getting a refund. A separate bank account for the business side makes tax time trivial.`,
  "general":
    `(Sem arquétipo claro — leia o post e escreva valor puro. Regra: responda a dúvida real, SEM citar Ozly a não ser que peçam app.)`,
};

function classify(text: string): Archetype {
  for (const a of ARCHETYPES) if (a.test.test(text)) return a;
  return { key: "general", mentionOzly: false, test: /$^/ };
}
function relevanceScore(text: string): number {
  const t = text.toLowerCase();
  return INCLUDE.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────── Reddit OAuth
function userAgent(): string {
  return Deno.env.get("REDDIT_USER_AGENT") ?? "cloud:ozly-radar:1.0 (by /u/ozly)";
}

async function getRedditToken(): Promise<string | null> {
  const id = Deno.env.get("REDDIT_CLIENT_ID");
  const secret = Deno.env.get("REDDIT_CLIENT_SECRET");
  if (!id || !secret) return null;
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`reddit_auth_${res.status}`);
  const j = await res.json();
  return j.access_token ?? null;
}

interface RedditPost {
  id: string; name: string; title: string; selftext: string;
  subreddit: string; permalink: string; num_comments: number; created_utc: number;
}

async function searchReddit(token: string, sub: string, q: string): Promise<RedditPost[]> {
  const base = sub
    ? `https://oauth.reddit.com/r/${sub}/search`
    : `https://oauth.reddit.com/search`;
  const params = new URLSearchParams({ q, sort: "new", limit: "25", t: "week", raw_json: "1" });
  if (sub) params.set("restrict_sr", "1");
  const res = await fetch(`${base}?${params}`, {
    headers: { Authorization: `bearer ${token}`, "User-Agent": userAgent() },
  });
  if (res.status === 429) {
    await sleep(4000);
    return searchReddit(token, sub, q);
  }
  if (!res.ok) return [];
  const j = await res.json();
  return (j?.data?.children ?? []).map((c: { data: RedditPost }) => c.data);
}

// ─────────────────────────────────────────────────────────── ops
async function opRefresh() {
  const token = await getRedditToken();
  if (!token) return { configured: false, inserted: 0 };

  const nowSec = Date.now() / 1000;
  const found = new Map<string, Record<string, unknown>>();

  for (const s of SEARCHES) {
    let posts: RedditPost[] = [];
    try { posts = await searchReddit(token, s.sub, s.q); } catch { /* segue */ }
    for (const p of posts) {
      if (!p?.id || found.has(p.id)) continue;
      const text = `${p.title ?? ""}\n${p.selftext ?? ""}`;
      const lower = text.toLowerCase();
      if (!INCLUDE.some((k) => lower.includes(k))) continue;
      if (EXCLUDE.some((k) => lower.includes(k))) continue;
      const ageH = (nowSec - p.created_utc) / 3600;
      if (ageH > MAX_AGE_HOURS) continue;
      if ((p.num_comments ?? 0) > MAX_COMMENTS) continue;

      const arch = classify(text);
      found.set(p.id, {
        reddit_id: p.id,
        subreddit: p.subreddit,
        title: p.title,
        selftext: (p.selftext ?? "").slice(0, 600),
        permalink: `https://www.reddit.com${p.permalink}`,
        num_comments: p.num_comments ?? 0,
        created_utc: new Date(p.created_utc * 1000).toISOString(),
        archetype: arch.key,
        mention_ozly: arch.mentionOzly,
        suggested_comment: TEMPLATES[arch.key] ?? TEMPLATES.general,
        relevance: relevanceScore(text),
        status: "new",
      });
    }
    await sleep(400); // educado com o Reddit
  }

  const rows = [...found.values()];
  if (!rows.length) return { configured: true, inserted: 0 };

  const sb = adminClient();
  // insere só o que é novo — preserva status ('commented'/'dismissed') das já vistas.
  const ids = rows.map((r) => r.reddit_id as string);
  const { data: existing } = await sb.from(TABLE).select("reddit_id").in("reddit_id", ids);
  const seen = new Set((existing ?? []).map((e: { reddit_id: string }) => e.reddit_id));
  const fresh = rows.filter((r) => !seen.has(r.reddit_id as string));
  if (fresh.length) {
    const { error } = await sb.from(TABLE).insert(fresh);
    if (error) throw new Error(error.message);
  }
  return { configured: true, inserted: fresh.length };
}

async function opList() {
  const sb = adminClient();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .neq("status", "dismissed")
    .order("mention_ozly", { ascending: false })
    .order("relevance", { ascending: false })
    .order("created_utc", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const threads = data ?? [];
  const lastDiscovered = threads.reduce(
    (max: string | null, t: { discovered_at: string }) =>
      !max || t.discovered_at > max ? t.discovered_at : max,
    null as string | null,
  );
  return { threads, last_discovered_at: lastDiscovered };
}

async function opSetStatus(reddit_id: string, status: string) {
  if (!["new", "commented", "dismissed"].includes(status)) {
    throw new Error("bad_status");
  }
  const sb = adminClient();
  const { error } = await sb
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("reddit_id", reddit_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────── handler
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    if (!(await isAdmin(authHeader))) return json({ error: "Forbidden: admin only" }, 403);

    const url = new URL(req.url);
    const op = url.searchParams.get("op") ?? "list";

    if (op === "list") return json(await opList());
    if (op === "refresh") return json(await opRefresh());
    if (op === "set_status") {
      const body = await req.json().catch(() => ({}));
      const { reddit_id, status } = body ?? {};
      if (!reddit_id || !status) return json({ error: "reddit_id and status required" }, 400);
      return json(await opSetStatus(reddit_id, status));
    }
    return json({ error: `unknown op: ${op}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500);
  }
});
