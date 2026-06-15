// Ozly — Cloudflare Worker for dynamic OG tags on /v/:code
//
// Why: ozly.au is hosted on GitHub Pages, which serves static HTML —
// every URL gets the same `<meta og:*>` tags. When an affiliate shares
// `https://ozly.au/v/JOAO123` in WhatsApp, the preview shows generic
// "Ozly — Free Invoicing..." instead of "João te indicou pro Ozly".
// That kills CTR.
//
// What: this Worker sits in front of GH Pages. It intercepts /v/* and
// /me/*, sniffs the User-Agent, and:
//   - For social media crawlers (FB, WhatsApp, Twitter, etc.) → returns
//     a tiny HTML with personalized OG tags built from the affiliate
//     name fetched via the Supabase RPC `validate_referral_code`.
//   - For real browsers → transparently passes to the origin (GH Pages).
//
// The user-facing UX is unchanged. Only crawlers see the personalized
// HTML, which is exactly what they need to render the link preview.
//
// Deploy: see ../README.md.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // Blog AI-authoring:
  AI: { run: (model: string, inputs: unknown) => Promise<unknown> }; // Workers AI binding (free tier)
  GITHUB_TOKEN: string; // fine-grained PAT, repo Contents: Read and write (wrangler secret)
}

const GITHUB_REPO = "AugustoBarcelos/OzlyWebSite";
const GITHUB_BRANCH = "main";
// Free Workers AI model. Strong instruct model on the free tier.
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const CRAWLER_UA_RE =
  /facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|linkedinbot|discordbot|slackbot|googlebot|bingbot|pinterest|skypeuripreview|redditbot|applebot|yahoobot|duckduckbot/i;

const STORE_LINKS = {
  ios: 'https://apps.apple.com/au/app/ozly/id6760398649',
  android: 'https://play.google.com/store/apps/details?id=com.augusto.ozly',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Blog AI-authoring API (the /admin wizard calls these). The static
    // /admin page itself is served by GitHub Pages — only /admin/api/* is us.
    if (url.pathname.startsWith('/admin/api/')) {
      return handleAdminApi(request, env, url);
    }

    // Only intercept /v/:code (affiliate landing). /me/:code is the dashboard
    // for the affiliate — needs auth, no OG sense to personalize.
    if (!url.pathname.startsWith('/v/')) {
      return fetch(request);
    }

    const code = url.pathname.split('/')[2];
    if (!code || !/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
      return fetch(request);
    }

    // Sniff UA. Real browsers fall through to origin.
    const ua = request.headers.get('User-Agent') ?? '';
    if (!CRAWLER_UA_RE.test(ua)) {
      return fetch(request);
    }

    // Crawler — fetch affiliate name and render personalized HTML.
    const affiliate = await fetchAffiliate(code, env);

    // If code is invalid/inactive, let the origin show its normal
    // "Invalid code" page (the SPA already handles this case).
    if (!affiliate || !affiliate.found) {
      return fetch(request);
    }

    const html = renderOgHtml(code.toUpperCase(), affiliate.name);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        // Cache 5min on edges — affiliate names rarely change. Still
        // re-validates often enough that name updates propagate quickly.
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-OG-Generated-By': 'ozly-og-worker',
      },
    });
  },
};

async function fetchAffiliate(
  code: string,
  env: Env,
): Promise<{ found: true; name: string } | { found: false } | null> {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rpc/validate_referral_code`,
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_code: code }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      valid?: boolean;
      kind?: string;
      owner_name?: string;
    };
    if (!data.valid || !data.owner_name) return { found: false };
    return { found: true, name: data.owner_name };
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(full: string): string {
  return (full.split(/\s+/)[0] ?? full).trim();
}

function renderOgHtml(code: string, ownerName: string): string {
  const first = firstName(ownerName);
  const title = `🎁 ${first} te indicou pro Ozly`;
  const description = `Use o código ${code} e baixe grátis. Ozly: invoicing, expenses e tax tracker pra Australian sole traders.`;
  const url = `https://ozly.au/v/${code}`;
  const image = 'https://ozly.au/OSLY.svg';

  // Body still has the title + store links so even if a crawler is dumb
  // and renders the body (e.g. some chat apps inline preview), the user
  // gets useful info. Real users hit the origin and see the full landing.
  return `<!DOCTYPE html>
<html lang="en-AU" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ozly">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="Ozly logo">
<meta property="og:locale" content="en_AU">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">

<!-- Mobile app links (smart redirect on FB / Twitter) -->
<meta property="al:ios:url" content="${url}">
<meta property="al:ios:app_store_id" content="6760398649">
<meta property="al:ios:app_name" content="Ozly">
<meta property="al:android:url" content="${url}">
<meta property="al:android:package" content="com.augusto.ozly">
<meta property="al:android:app_name" content="Ozly">
<meta property="al:web:url" content="${url}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p>
  <a href="${STORE_LINKS.ios}">Download iOS</a> ·
  <a href="${STORE_LINKS.android}">Download Android</a> ·
  <a href="${url}">${url}</a>
</p>
</body>
</html>`;
}

/* ════════════════════════════════════════════════════════════════════
   BLOG AI-AUTHORING API  (called by the admin-portal Blog page)
   - GET  /admin/api/topics          → curated topics + which slugs exist
   - POST /admin/api/suggest-topics  → fresh AI-generated topic ideas
   - POST /admin/api/generate        → draft a post (EN/PT/ES) with Workers AI
   - POST /admin/api/review          → AI fact-check / editorial review
   - POST /admin/api/publish         → commit markdown to GitHub (triggers deploy)
   Auth: a valid admin-portal Supabase session (Bearer token). No password.
   ════════════════════════════════════════════════════════════════════ */

// Curated editorial backlog (from the keyword research). `slug` is the post's
// cross-language identity; `done` is filled in from the repo at request time.
const TOPICS = [
  { slug: 'abn-vs-tfn', title: 'ABN vs TFN: which one do you need', angle: 'Define both, the 47% no-ABN trap, bust the $75k myth.' },
  { slug: 'sole-trader-tax-how-much', title: 'How much tax does a sole trader pay', angle: 'Real numbers by income, the July bill shock, deductions.' },
  { slug: 'free-abn-is-it-free', title: 'Is it free to get an ABN in Australia?', angle: 'Bust the paid-registration myth; how to apply on ABR.' },
  { slug: 'cleaner-tax-deductions', title: 'Tax deductions cleaners forget', angle: 'Specific claimable items for cleaners with real examples.' },
  { slug: 'student-visa-work-hours', title: 'Student visa: how many hours can you work (2026)', angle: '48h/fortnight rule, what counts, the 60h proposal is NOT law.' },
  { slug: 'how-to-invoice-with-abn', title: 'How to invoice with an ABN (+ template)', angle: 'Required fields, the "tax invoice" wording, GST line.' },
  { slug: 'working-holiday-tax', title: 'Working holiday tax: why 15% from $1', angle: '417/462 rates, no tax-free threshold, employer registration.' },
  { slug: 'july-tax-shock', title: 'The July tax shock nobody warns sole traders about', angle: 'ABN has no withholding; how to set money aside.' },
  { slug: 'tax-return-step-by-step', title: 'How to do your tax return (step by step)', angle: 'Seasonal — publish before June. Deadlines, myGov, deductions.' },
  { slug: 'gst-register-75000', title: 'Do I need to register for GST? ($75k explained)', angle: 'Rolling 12-month turnover, 21-day rule, backdating risk.' },
  { slug: 'work-over-visa-hours', title: 'What happens if you work over your visa hours', angle: 'Real consequences, how the limit is tracked.' },
  { slug: 'cleaning-rates-per-hour', title: 'How much to charge per hour for cleaning', angle: 'Real 2026 ranges, employee vs ABN, what to factor in.' },
];

function corsHeaders(): Record<string, string> {
  // Same-origin (ozly.au/admin → ozly.au/admin/api) so CORS isn't strictly
  // needed, but these keep local testing painless.
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key, Authorization',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// Auth = a logged-in admin-portal session ONLY (Authorization: Bearer
// <supabase access token>). Validated against Supabase /auth/v1/user. No
// password — the only way in is the portal login.
async function authed(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return res.ok; // 200 = valid current session
  } catch {
    return false;
  }
}

async function handleAdminApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const path = url.pathname;

  // Everything below requires admin auth (password or portal session).
  if (!(await authed(request, env))) return json({ error: 'Unauthorized' }, 401);

  if (path === '/admin/api/topics' && request.method === 'GET') {
    const done = await listExistingSlugs(env);
    return json({ topics: TOPICS.map((t) => ({ ...t, done: done.includes(t.slug) })) });
  }

  // Fresh AI-generated topic ideas (excludes ones already written/curated).
  if (path === '/admin/api/suggest-topics' && request.method === 'POST') {
    try {
      return json({ topics: await suggestTopics(env) });
    } catch (e) {
      return json({ error: `Suggest failed: ${(e as Error).message}` }, 502);
    }
  }

  if (path === '/admin/api/generate' && request.method === 'POST') {
    const { topic, slug } = (await request.json().catch(() => ({}))) as { topic?: string; slug?: string };
    if (!topic) return json({ error: 'Missing topic' }, 400);
    try {
      const post = await generatePost(topic, slug, env);
      return json(post);
    } catch (e) {
      return json({ error: `Generation failed: ${(e as Error).message}` }, 502);
    }
  }

  // Fact-check / editorial review of a draft (grammar + ATO accuracy flags +
  // suggestions) before publishing. Returns findings per language.
  if (path === '/admin/api/review' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as PublishBody;
    if (!body.en && !body.pt && !body.es) return json({ error: 'Nothing to review' }, 400);
    try {
      return json(await reviewPost(body, env));
    } catch (e) {
      return json({ error: `Review failed: ${(e as Error).message}` }, 502);
    }
  }

  if (path === '/admin/api/publish' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as PublishBody;
    if (!body.slug || !body.en) return json({ error: 'Missing slug or content' }, 400);
    try {
      const result = await publishPost(body, env);
      return json(result);
    } catch (e) {
      return json({ error: `Publish failed: ${(e as Error).message}` }, 502);
    }
  }

  return json({ error: 'Not found' }, 404);
}

/* ── List which post slugs already exist (content/blog/en) ── */
async function listExistingSlugs(env: Env): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/content/blog/en?ref=${GITHUB_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ozly-blog-admin',
      },
    },
  );
  if (!res.ok) return []; // folder may not exist yet
  const files = (await res.json()) as Array<{ name: string }>;
  return files.filter((f) => f.name.endsWith('.md')).map((f) => f.name.replace(/\.md$/, ''));
}

/* ── Fresh AI-generated topic ideas (the "suggest more" button) ── */
async function suggestTopics(env: Env): Promise<Array<{ slug: string; title: string; angle: string; done: boolean }>> {
  const existing = new Set<string>([...(await listExistingSlugs(env)), ...TOPICS.map((t) => t.slug)]);
  const avoid = TOPICS.map((t) => t.title).join('; ');
  const system = `You suggest blog topic ideas for Ozly — a free invoicing & tax app for Australian sole traders (cleaners, tradies, contractors) and migrants on student / working-holiday visas.

Propose 6 FRESH, specific, high-search-intent topics people actually Google about: ABN, income tax, GST, deductions, invoicing, and visa work rules in Australia. Each must be a specific question/angle (not generic). Australia-specific.

Do NOT repeat any of these existing topics: ${avoid}.

Output EXACTLY this, one block per idea, nothing else:
@@@TOPIC@@@
<title up to 70 chars> | <one-line angle>`;

  const result = (await env.AI.run(AI_MODEL, {
    max_tokens: 700,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: 'Give me 6 fresh topic ideas now. Output only the @@@TOPIC@@@ blocks.' },
    ],
  })) as { response?: unknown };

  const text = String(result.response ?? '');
  const out: Array<{ slug: string; title: string; angle: string; done: boolean }> = [];

  // Accept the @@@TOPIC@@@ format OR a plain list — pull "title | angle" /
  // "title - angle" / "title: angle" from each candidate line.
  const candidates = text.includes('@@@TOPIC@@@')
    ? text.split('@@@TOPIC@@@').map((s) => s.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '')
    : text.split('\n');

  for (const raw of candidates) {
    let line = raw.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
    if (line.length < 8) continue;
    if (/^(here|sure|below|topic ideas|ideas?:)/i.test(line)) continue;
    let title = line;
    let angle = '';
    const sep = line.match(/\s[|–—-]\s|:\s/);
    if (sep && sep.index !== undefined) {
      title = line.slice(0, sep.index).trim();
      angle = line.slice(sep.index + sep[0].length).trim();
    }
    title = title.replace(/^["'*]+|["'*]+$/g, '').trim();
    if (title.length < 8 || title.length > 90) continue;
    const slug = slugify(title);
    if (existing.has(slug)) continue;
    existing.add(slug);
    out.push({ slug, title, angle, done: false });
    if (out.length >= 6) break;
  }
  return out;
}

/* ── Generate a post with Cloudflare Workers AI (free tier) ──
   One call per language (keeps each response small and reliable), then
   assemble. A human reviews/edits before publishing, so the model just
   needs to produce a solid first draft in native phrasing. */
interface GenLang { title: string; description: string; body: string }
interface GenResult { slug: string; en: GenLang; pt: GenLang; es: GenLang }

const LANG_NAMES: Record<'en' | 'pt' | 'es', string> = {
  en: 'Australian English',
  pt: 'Brazilian Portuguese',
  es: 'Latin-American Spanish',
};

function slugify(s: string): string {
  return (s || 'untitled').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled';
}

// We ask the model for a delimited format (not JSON) because markdown bodies
// have newlines/quotes that LLMs routinely fail to escape in JSON. Markers use
// @@@ (not ###, which models treat as markdown headings).
function section(text: string, name: string): string {
  const re = new RegExp(`@@@${name}@@@\\s*([\\s\\S]*?)\\s*(?=@@@[A-Z]+@@@|$)`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function parseDelimited(raw: unknown): GenLang {
  if (raw && typeof raw === 'object' && 'title' in (raw as object)) return raw as GenLang;
  const text = String(raw ?? '').trim();
  let title = section(text, 'TITLE');
  let description = section(text, 'DESC') || section(text, 'DESCRIPTION');
  let body = section(text, 'BODY');

  // Salvage: model ignored the markers. Take the first usable line as the
  // title and the rest as the body — a human reviews/edits anyway.
  if (!title || !body) {
    const lines = text.split('\n').map((l) => l.replace(/^#+\s*/, '').trim());
    const idx = lines.findIndex((l) => l.length > 0);
    if (idx === -1) throw new Error('AI returned empty output — try again');
    title = title || lines[idx].slice(0, 80);
    body = body || lines.slice(idx + 1).join('\n').trim() || lines[idx];
  }
  if (!description) description = body.replace(/[#*>`\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 155);
  return { title, description, body };
}

async function aiGenerateLang(topic: string, code: 'en' | 'pt' | 'es', env: Env): Promise<GenLang> {
  const langName = LANG_NAMES[code];
  const system = `You write blog posts for Ozly — a free invoicing & tax app for Australian sole traders (cleaners, tradies, contractors) and migrants on student/working-holiday visas.

Write ONE blog post in ${langName} — native, idiomatic writing (NOT a translation).

Rules (follow strictly):
1. Answer the core number/question in the FIRST line. No preamble.
2. Be specific to the audience (e.g. "cleaner with an ABN"), never generic.
3. Include ONE line of real, lived experience ("the #1 thing we see in the app is…").
4. For any tax/visa fact, add an inline markdown link to the official source: ATO https://www.ato.gov.au/ or Home Affairs https://immi.homeaffairs.gov.au/ .
5. End with a CTA tied to the pain, linking the app: App Store https://apps.apple.com/au/app/ozly/id6760398649 and Google Play https://play.google.com/store/apps/details?id=com.augusto.ozly .
6. Close with a one-line disclaimer: general info, not tax advice, verify with the ATO / a registered agent.
7. Numbers must be correct for the 2025–26 year and phrased so a human can verify them. A human reviews before publishing.

Body = GitHub-flavoured Markdown (## headings, tables, **bold**, lists, > quotes). Do NOT put the H1 title in the body. 600–900 words.

Output using these exact separator lines, copied literally character-for-character. Do NOT replace them with markdown headings:
@@@TITLE@@@
(title here, <=70 chars, include the year if relevant)
@@@DESC@@@
(meta description here, <=160 chars)
@@@BODY@@@
(the markdown body here)`;

  // No response_format / json_schema: some Workers AI models stall on it. We
  // ask for JSON in the prompt and parse defensively. 2048 tokens is plenty for
  // a ~700-word post and keeps each call fast.
  const result = (await env.AI.run(AI_MODEL, {
    max_tokens: 2048,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Topic: ${topic}\n\nWrite the post in ${langName} now. Output ONLY the ###-delimited format, nothing else.` },
    ],
  })) as { response?: unknown };

  return parseDelimited(result.response ?? result);
}

async function generatePost(topic: string, slug: string | undefined, env: Env): Promise<GenResult> {
  // Parallel — the 3 languages run at once so we stay under the Worker time
  // limit (sequential 70B calls overran it and left the request hanging).
  const [en, pt, es] = await Promise.all([
    aiGenerateLang(topic, 'en', env),
    aiGenerateLang(topic, 'pt', env),
    aiGenerateLang(topic, 'es', env),
  ]);
  return { slug: slug ? slugify(slug) : slugify(en.title), en, pt, es };
}

/* ── Fact-check / editorial review (a second AI pass) ── */
type Severity = 'HIGH' | 'MED' | 'LOW';
interface Finding { severity: Severity; text: string }
interface ReviewLang { verdict: 'PASS' | 'NEEDS_WORK'; findings: Finding[] }

function parseReview(raw: unknown): ReviewLang {
  const text = String(raw ?? '');
  const verdictRaw = section(text, 'VERDICT');
  const verdict: ReviewLang['verdict'] =
    /pass/i.test(verdictRaw) && !/needs/i.test(verdictRaw) ? 'PASS' : 'NEEDS_WORK';
  const block = section(text, 'FINDINGS');
  const findings: Finding[] = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^none\.?$/i.test(l))
    .map((line) => {
      const m = line.match(/^[-*]?\s*\[?(HIGH|MED(?:IUM)?|LOW)\]?\s*[:\-]?\s*(.+)$/i);
      if (m) {
        const sev = m[1].toUpperCase().startsWith('MED') ? 'MED' : (m[1].toUpperCase() as Severity);
        return { severity: sev, text: m[2].trim() };
      }
      return { severity: 'MED' as Severity, text: line.replace(/^[-*]\s*/, '') };
    })
    .filter((f) => f.text.length > 1);
  return { verdict, findings };
}

async function aiReviewLang(tr: GenLang, code: 'en' | 'pt' | 'es', env: Env): Promise<ReviewLang> {
  const langName = LANG_NAMES[code];
  const system = `You are a meticulous editor AND an Australian tax/visa fact-checker for Ozly's blog. Review the draft below (written in ${langName}) and list problems a human MUST fix before publishing.

Check for:
- GRAMMAR / spelling / clarity / awkward phrasing.
- TAX & VISA ACCURACY: flag every rate, threshold, number or rule that must be verified against the ATO/Home Affairs. Call out anything that looks outdated or wrong for the 2025–26 year (e.g. an old marginal rate like 32.5%, a wrong tax-free threshold, a wrong student-visa hour limit). Quote the exact text.
- MISSING SOURCES: a factual claim with no official ATO/Home Affairs link.
- BRAND/CTA: missing app download CTA or missing "not tax advice" disclaimer.

Be specific and quote the offending text. Severity HIGH = wrong/risky fact; MED = should fix; LOW = minor.

Output EXACTLY this, copied literally:
@@@VERDICT@@@
PASS or NEEDS_WORK
@@@FINDINGS@@@
[HIGH] one problem per line
[MED] ...
(write "none" if there are genuinely no problems)`;

  const user = `TITLE: ${tr.title}\nDESCRIPTION: ${tr.description}\n\nBODY:\n${tr.body}`;
  const result = (await env.AI.run(AI_MODEL, {
    max_tokens: 1500,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })) as { response?: unknown };
  return parseReview(result.response ?? result);
}

async function reviewPost(body: PublishBody, env: Env): Promise<Record<string, ReviewLang>> {
  const codes = (['en', 'pt', 'es'] as const).filter((c) => body[c] && body[c]!.title);
  const entries = await Promise.all(
    codes.map((c) => aiReviewLang(body[c] as GenLang, c, env).then((r) => [c, r] as const)),
  );
  return Object.fromEntries(entries);
}

/* ── Publish: commit content/blog/<lang>/<slug>.md for each language ── */
interface PublishBody {
  slug: string;
  draft?: boolean;
  date?: string;
  en?: GenLang;
  pt?: GenLang;
  es?: GenLang;
}

function frontmatter(tr: GenLang, date: string, draft: boolean): string {
  const esc = (s: string) => String(s).replace(/"/g, '\\"');
  return `---\ntitle: "${esc(tr.title)}"\ndescription: "${esc(tr.description)}"\ndate: ${date}\nauthor: "Ozly"\ndraft: ${draft ? 'true' : 'false'}\n---\n\n${tr.body.trim()}\n`;
}

async function publishPost(body: PublishBody, env: Env): Promise<{ ok: true; committed: string[] }> {
  const date = body.date || isoDate();
  const draft = body.draft !== false; // default true — review gate
  const langs: Array<['en' | 'pt' | 'es', GenLang | undefined]> = [
    ['en', body.en],
    ['pt', body.pt],
    ['es', body.es],
  ];
  const committed: string[] = [];
  for (const [lang, tr] of langs) {
    if (!tr || !tr.title) continue;
    const path = `content/blog/${lang}/${body.slug}.md`;
    const content = frontmatter(tr, date, draft);
    await githubPutFile(path, content, `blog: ${draft ? 'draft' : 'publish'} ${body.slug} (${lang})`, env);
    committed.push(path);
  }
  return { ok: true, committed };
}

function isoDate(): string {
  // Workers have Date; this runs per-request so it's fine here (not in a
  // resumable workflow). Format YYYY-MM-DD.
  return new Date().toISOString().slice(0, 10);
}

async function githubPutFile(path: string, content: string, message: string, env: Env): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const ghHeaders = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ozly-blog-admin',
    'Content-Type': 'application/json',
  };
  // Need the existing sha to update an existing file.
  let sha: string | undefined;
  const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, { headers: ghHeaders });
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  }
  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: ghHeaders,
    body: JSON.stringify({
      message,
      content: base64Utf8(content),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`GitHub ${putRes.status} on ${path}: ${txt.slice(0, 200)}`);
  }
}

// btoa() only handles latin1; encode UTF-8 first so accents/emoji survive.
function base64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
