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

import { marked } from 'marked';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // Blog AI-authoring:
  AI: { run: (model: string, inputs: unknown) => Promise<unknown> }; // Workers AI binding (free tier)
  GITHUB_TOKEN: string; // fine-grained PAT, repo Contents: Read and write (wrangler secret)
  TAVILY_API_KEY?: string; // optional — web search for the fact-check (wrangler secret)
}

const GITHUB_REPO = "AugustoBarcelos/OzlyWebSite";
const GITHUB_BRANCH = "main";
// Free Workers AI model. Strong instruct model on the free tier.
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// Bump on each meaningful worker change so /admin/api/health proves what's live.
const WORKER_BUILD = "2026-06-20-blog-ssr-v9";

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

    // Public blog JSON API (consumed by the React app).
    if (url.pathname.startsWith('/blog-api/')) {
      return handleBlogApi(request, env, url);
    }

    // Blog pages — SSR from Supabase with full SEO. Any failure falls through
    // to the origin (GitHub Pages) so the blog can never go dark on a worker bug.
    const blogRoute = matchBlogRoute(url.pathname);
    if (blogRoute) {
      try {
        const ssr = await handleBlogSsr(env, blogRoute);
        if (ssr) return ssr;
      } catch {
        /* fall through to origin */
      }
      return fetch(request);
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
   PUBLIC BLOG — served from Supabase (source of truth) with SSR + SEO.
   - GET /blog-api/index         → listing JSON (for the React app)
   - GET /blog-api/post?slug&lang → one post JSON (rendered HTML)
   - SSR for /blog, /blog/:slug (+ /pt, /es) → full HTML with meta/OG/JSON-LD
   ════════════════════════════════════════════════════════════════════ */
const ORIGIN = 'https://ozly.au';
const BLOG_LANGS: Record<'en' | 'pt' | 'es', { prefix: string; hreflang: string; og: string; html: string }> = {
  en: { prefix: '', hreflang: 'en-AU', og: 'en_AU', html: 'en-AU' },
  pt: { prefix: '/pt', hreflang: 'pt-BR', og: 'pt_BR', html: 'pt-BR' },
  es: { prefix: '/es', hreflang: 'es', og: 'es_ES', html: 'es' },
};
const BLOG_LISTING_META: Record<'en' | 'pt' | 'es', { title: string; description: string; intro: string }> = {
  en: { title: 'Ozly Blog — Tax, ABN & visa guides for Australian sole traders', description: 'Plain-English guides on ABN, tax, GST, invoicing and visa work rules for sole traders and migrants working in Australia.', intro: 'Plain-English guides on tax, ABN, GST and visas — for people working for themselves in Australia.' },
  pt: { title: 'Blog da Ozly — Guias de imposto, ABN e visto na Austrália', description: 'Guias diretos sobre ABN, imposto, GST, invoices e regras de trabalho por visto para quem trabalha por conta própria na Austrália.', intro: 'Guias diretos sobre imposto, ABN, GST e vistos — para quem trabalha por conta própria na Austrália.' },
  es: { title: 'Blog de Ozly — Guías de impuestos, ABN y visa en Australia', description: 'Guías claras sobre ABN, impuestos, GST, facturas y reglas de trabajo por visa para quienes trabajan por su cuenta en Australia.', intro: 'Guías claras sobre impuestos, ABN, GST y visas — para quienes trabajan por su cuenta en Australia.' },
};
type BlogLangCode = 'en' | 'pt' | 'es';
interface DbPost { slug: string; date: string; author: string; tags: string[]; en?: GenLang | null; pt?: GenLang | null; es?: GenLang | null; }
interface BlogRoute { lang: BlogLangCode; slug: string | null; }

function matchBlogRoute(pathname: string): BlogRoute | null {
  const m = pathname.match(/^\/(?:(pt|es)\/)?blog(?:\/([a-z0-9][a-z0-9-]*))?\/?$/i);
  if (!m) return null;
  const lang = (m[1]?.toLowerCase() as BlogLangCode) || 'en';
  return { lang, slug: m[2] ? m[2].toLowerCase() : null };
}

async function dbQuery(env: Env, qs: string): Promise<DbPost[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/blog_posts?${qs}`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return (await res.json()) as DbPost[];
}
const dbListPosts = (env: Env) =>
  dbQuery(env, 'select=slug,date,author,tags,en,pt,es&draft=eq.false&order=date.desc');
const dbGetPost = async (env: Env, slug: string): Promise<DbPost | null> => {
  const rows = await dbQuery(env, `select=slug,date,author,tags,en,pt,es&draft=eq.false&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] ?? null;
};

const blogLangsOf = (p: DbPost): BlogLangCode[] =>
  (['en', 'pt', 'es'] as const).filter((c) => p[c] && (p[c] as GenLang).title);
function readingTimeOf(body: string): number {
  return Math.max(1, Math.round((body || '').trim().split(/\s+/).filter(Boolean).length / 200));
}

/** Listing summary shape — mirrors the old public/blog-data/index.json. */
function postSummaries(p: DbPost) {
  const langs = blogLangsOf(p);
  const summaries: Record<string, unknown> = {};
  for (const c of langs) {
    const tr = p[c] as GenLang;
    summaries[c] = {
      slug: p.slug, lang: c, langs, date: p.date, author: p.author, cover: null,
      tags: p.tags || [], readingTime: readingTimeOf(tr.body), title: tr.title, description: tr.description,
    };
  }
  return { slug: p.slug, date: p.date, author: p.author, cover: null, tags: p.tags || [], langs, summaries };
}

async function handleBlogApi(_request: Request, env: Env, url: URL): Promise<Response> {
  try {
    if (url.pathname === '/blog-api/index') {
      const posts = await dbListPosts(env);
      return json(posts.filter((p) => blogLangsOf(p).length > 0).map(postSummaries));
    }
    if (url.pathname === '/blog-api/post') {
      const slug = url.searchParams.get('slug') || '';
      const lang = (url.searchParams.get('lang') as BlogLangCode) || 'en';
      const p = await dbGetPost(env, slug);
      if (!p) return json({ error: 'Not found' }, 404);
      const langs = blogLangsOf(p);
      const code = langs.includes(lang) ? lang : langs[0];
      const tr = p[code] as GenLang;
      return json({
        slug: p.slug, lang: code, langs, title: tr.title, description: tr.description,
        date: p.date, author: p.author, cover: null, tags: p.tags || [],
        readingTime: readingTimeOf(tr.body), html: marked.parse(tr.body),
      });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: `Blog API failed: ${(e as Error).message}` }, 502);
  }
}

/** Cache the origin SPA shell (asset tags) — warm across requests. */
let _shellCache: { at: number; html: string } | null = null;
async function getShell(): Promise<string> {
  if (_shellCache && Date.now() - _shellCache.at < 300_000) return _shellCache.html;
  const res = await fetch(`${ORIGIN}/`, { cf: { cacheTtl: 300 } } as RequestInit);
  if (!res.ok) throw new Error(`shell ${res.status}`);
  const html = await res.text();
  _shellCache = { at: Date.now(), html };
  return html;
}

function metaTags(opts: {
  title: string; description: string; canonical: string; htmlLang: string;
  ogLocale: string; alternates: Array<{ hreflang: string; href: string }>; jsonLd: unknown[];
}): string {
  const alts = opts.alternates
    .map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`)
    .join('');
  const ld = opts.jsonLd
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)
    .join('');
  return (
    `<meta name="description" content="${escapeHtml(opts.description)}">` +
    `<link rel="canonical" href="${opts.canonical}">` +
    alts +
    `<meta property="og:type" content="article">` +
    `<meta property="og:site_name" content="Ozly">` +
    `<meta property="og:title" content="${escapeHtml(opts.title)}">` +
    `<meta property="og:description" content="${escapeHtml(opts.description)}">` +
    `<meta property="og:url" content="${opts.canonical}">` +
    `<meta property="og:image" content="${ORIGIN}/OSLY.svg">` +
    `<meta property="og:locale" content="${opts.ogLocale}">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${escapeHtml(opts.title)}">` +
    `<meta name="twitter:description" content="${escapeHtml(opts.description)}">` +
    ld
  );
}

/** Inject head meta + #root prerender + optional inline data into the shell. */
function injectShell(shell: string, head: { title: string; tags: string }, rootInner: string, inlineScript: string): string {
  let out = shell;
  // Replace <title> (first occurrence).
  out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${head.title}</title>`);
  // Strip the origin home shell's own SEO tags so ours win (otherwise the blog
  // page would carry the home page's description / hreflang / OG).
  out = out
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<link\s+rel="alternate"\s+hreflang=[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
  out = out.replace(/<\/head>/i, `${head.tags}</head>`);
  // Paint content inside #root so crawlers + no-JS users see it; React hydrates.
  out = out.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${rootInner}</div>${inlineScript}`);
  return out;
}

async function handleBlogSsr(env: Env, route: BlogRoute): Promise<Response | null> {
  const L = BLOG_LANGS[route.lang];

  // ── Post page ──
  if (route.slug) {
    const p = await dbGetPost(env, route.slug);
    if (!p) return null; // fall through to origin (404/SPA)
    const langs = blogLangsOf(p);
    const code = langs.includes(route.lang) ? route.lang : langs[0];
    const tr = p[code] as GenLang;
    const canonical = `${ORIGIN}${BLOG_LANGS[code].prefix}/blog/${p.slug}/`;
    const html = marked.parse(tr.body) as string;
    const alternates = langs.map((c) => ({ hreflang: BLOG_LANGS[c].hreflang, href: `${ORIGIN}${BLOG_LANGS[c].prefix}/blog/${p.slug}/` }));
    const postLd = {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: tr.title, description: tr.description, datePublished: p.date, dateModified: p.date,
      inLanguage: BLOG_LANGS[code].html,
      author: { '@type': 'Organization', name: p.author || 'Ozly', url: `${ORIGIN}/` },
      publisher: { '@type': 'Organization', name: 'Ozly Pty Ltd', url: `${ORIGIN}/`, logo: `${ORIGIN}/OSLY.svg` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    };
    const head = {
      title: escapeHtml(`${tr.title} — Ozly`),
      tags: metaTags({ title: `${tr.title} — Ozly`, description: tr.description, canonical, htmlLang: BLOG_LANGS[code].html, ogLocale: BLOG_LANGS[code].og, alternates, jsonLd: [postLd] }),
    };
    const rootInner = `<article><h1>${escapeHtml(tr.title)}</h1><p>${escapeHtml(tr.description)}</p>${html}</article>`;
    const payload = {
      slug: p.slug, lang: code, langs, title: tr.title, description: tr.description,
      date: p.date, author: p.author, cover: null, tags: p.tags || [],
      readingTime: readingTimeOf(tr.body), html,
    };
    const inline = `<script id="blog-post-data" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
    const shell = await getShell();
    return new Response(injectShell(shell, head, rootInner, inline), {
      headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=120, s-maxage=120', 'X-Blog-SSR': 'post' },
    });
  }

  // ── Listing page ──
  const posts = (await dbListPosts(env)).filter((p) => blogLangsOf(p).length > 0);
  const m = BLOG_LISTING_META[route.lang];
  const canonical = `${ORIGIN}${L.prefix}/blog/`;
  const items = posts.map((p) => {
    const langs = blogLangsOf(p);
    const code = langs.includes(route.lang) ? route.lang : langs[0];
    const tr = p[code] as GenLang;
    return `<h2><a href="${ORIGIN}${L.prefix}/blog/${p.slug}/">${escapeHtml(tr.title)}</a></h2><p>${escapeHtml(tr.description)}</p>`;
  }).join('');
  const blogLd = {
    '@context': 'https://schema.org', '@type': 'Blog', name: m.title, description: m.description,
    url: canonical, inLanguage: L.html, publisher: { '@type': 'Organization', name: 'Ozly Pty Ltd', url: `${ORIGIN}/` },
  };
  const alternates = (['en', 'pt', 'es'] as const).map((c) => ({ hreflang: BLOG_LANGS[c].hreflang, href: `${ORIGIN}${BLOG_LANGS[c].prefix}/blog/` }));
  const head = {
    title: escapeHtml(m.title),
    tags: metaTags({ title: m.title, description: m.description, canonical, htmlLang: L.html, ogLocale: L.og, alternates, jsonLd: [blogLd] }),
  };
  const rootInner = `<h1>${escapeHtml(m.title)}</h1><p>${escapeHtml(m.intro)}</p>${items}`;
  const shell = await getShell();
  return new Response(injectShell(shell, head, rootInner, ''), {
    headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=120, s-maxage=120', 'X-Blog-SSR': 'listing' },
  });
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

// Curated editorial backlog. B2C (sole traders / migrants) and B2B (Ozly for
// Companies) are INTERLEAVED — the wizard renders them in order, so a flat
// block of B2C made the list look consumer-only.
// RULE: every angle must position Ozly as the solution. Never give away a free
// alternative to our own product (no invoice templates, no "do it in Excel") —
// that's anti-product. `slug` is the post's cross-language identity; `done` is
// filled in from the repo at request time.
const TOPICS = [
  { slug: 'abn-vs-tfn', title: 'ABN vs TFN: which one do you need', angle: 'Define both, the 47% no-ABN trap, bust the $75k myth.' },
  { slug: 'contractor-or-employee-ato-test', title: 'Are your contractors actually employees? (ATO test)', angle: 'Sham-contracting risk, the multi-factor test, penalties, how to stay clean.', audience: 'business' },
  { slug: 'sole-trader-tax-how-much', title: 'How much tax does a sole trader pay', angle: 'Real numbers by income, the July bill shock, deductions.' },
  { slug: 'onboard-abn-contractors-fast', title: 'How to onboard ABN contractors without the paperwork chaos', angle: 'Checklist: valid ABN, GST status, insurance, invoicing — done in minutes.', audience: 'business' },
  { slug: 'july-tax-shock', title: 'The July tax shock nobody warns sole traders about', angle: 'ABN has no withholding; how to set money aside (Ozly tracks it for you).' },
  { slug: 'contractor-tax-bill-business-problem', title: "When a contractor's tax bill becomes your business's problem", angle: 'Retention, admin load and compliance risk of a disorganised contractor base.', audience: 'business' },
  { slug: 'gst-register-75000', title: 'Do I need to register for GST? ($75k explained)', angle: 'Rolling 12-month turnover, 21-day rule, backdating risk.' },
  { slug: 'reduce-contractor-churn', title: 'Why your best contractors leave (and how to keep them)', angle: 'Financial stress as the hidden churn driver; what operators can do.', audience: 'business' },
  { slug: 'cleaner-tax-deductions', title: 'Tax deductions cleaners forget', angle: 'Specific claimable items for cleaners with real examples.' },
  { slug: 'cleaning-business-payroll-vs-contractors', title: 'Employees vs contractors for your cleaning business', angle: 'Cost, control, compliance trade-offs; when each model makes sense.', audience: 'business' },
  { slug: 'student-visa-work-hours', title: 'Student visa: how many hours can you work (2026)', angle: '48h/fortnight rule, what counts, the 60h proposal is NOT law.' },
  { slug: 'valid-tax-invoice-australia', title: 'What makes a tax invoice valid in Australia', angle: 'Required fields, the "tax invoice" wording, GST line, and the errors that delay payment — Ozly builds a compliant invoice for you.' },
  { slug: 'working-holiday-tax', title: 'Working holiday tax: why 15% from $1', angle: '417/462 rates, no tax-free threshold, employer registration.' },
  { slug: 'free-abn-is-it-free', title: 'Is it free to get an ABN in Australia?', angle: 'Bust the paid-registration myth; how to apply on ABR.' },
  { slug: 'tax-return-step-by-step', title: 'How to do your tax return (step by step)', angle: 'Seasonal — publish before June. Deadlines, myGov, deductions.' },
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

  // Public health/version marker so a deploy can be verified from a browser
  // (no secrets, no auth). Bump WORKER_BUILD on each meaningful change.
  if (path === '/admin/api/health') {
    return json({
      ok: true,
      build: WORKER_BUILD,
      features: {
        b2bTopics: true,
        audienceAwareGeneration: true,
        factCheckApplyEdits: true, // temperature 0.4 + directive prompt
      },
    });
  }

  // Everything below requires admin auth (password or portal session).
  if (!(await authed(request, env))) return json({ error: 'Unauthorized' }, 401);

  if (path === '/admin/api/topics' && request.method === 'GET') {
    const done = await listExistingSlugs(env);
    const titleBySlug = new Map(TOPICS.map((t) => [t.slug, t.title]));
    return json({
      topics: TOPICS.map((t) => ({
        ...t,
        audience: (t as { audience?: string }).audience === 'business' ? 'business' : 'consumer',
        done: done.includes(t.slug),
      })),
      // Everything actually published (incl. custom posts not in the curated
      // list) so the wizard can show what's already live.
      published: done.map((slug) => ({ slug, title: titleBySlug.get(slug) ?? humanizeSlug(slug) })),
    });
  }

  // Fresh AI-generated topic ideas (excludes ones already written/curated).
  // Optional body { audience: 'business' | 'consumer' } to ask for one side only.
  if (path === '/admin/api/suggest-topics' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { audience?: 'business' | 'consumer' };
    const audience = body.audience === 'business' || body.audience === 'consumer' ? body.audience : undefined;
    try {
      return json({ topics: await suggestTopics(env, audience) });
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

  // Apply a single fact-check finding to one language's draft (AI edit).
  if (path === '/admin/api/apply-fix' && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as {
      lang?: string; title?: string; description?: string; body?: string; finding?: string;
    };
    if (!b.body || !b.finding) return json({ error: 'Missing body or finding' }, 400);
    try {
      return json(await applyFix(b, env));
    } catch (e) {
      return json({ error: `Apply failed: ${(e as Error).message}` }, 502);
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
/** "contractor-or-employee-ato-test" → "Contractor or employee ato test" */
function humanizeSlug(slug: string): string {
  const s = slug.replace(/-/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
async function suggestTopics(
  env: Env,
  audience?: 'business' | 'consumer',
): Promise<Array<{ slug: string; title: string; angle: string; audience: 'business' | 'consumer'; done: boolean }>> {
  const publishedSlugs = await listExistingSlugs(env);
  const existing = new Set<string>([...publishedSlugs, ...TOPICS.map((t) => t.slug)]);
  // Avoid list = curated titles + the subjects of everything already published
  // (humanised from the slug for posts not in the curated list), so the model
  // doesn't propose a topic on a subject we've already covered.
  const titleBySlug = new Map(TOPICS.map((t) => [t.slug, t.title]));
  const avoid = [
    ...new Set([
      ...TOPICS.map((t) => t.title),
      ...publishedSlugs.map((s) => titleBySlug.get(s) ?? humanizeSlug(s)),
    ]),
  ].join('; ');

  const CONSUMER = `CONSUMER — Australian sole traders (cleaners, tradies, contractors) and migrants on student / working-holiday visas. They Google about ABN, income tax, GST, deductions, invoicing, visa work rules.`;
  const BUSINESS = `BUSINESS ("Ozly for Companies") — operators & owners of businesses that run on ABN contractors (cleaning companies, trades, labour-hire, delivery fleets). They care about contractor onboarding, retention, sham-contracting / misclassification risk, compliance, and reducing admin load.`;

  let audienceBlock: string;
  let mixRule: string;
  if (audience === 'business') {
    audienceBlock = `Audience: ${BUSINESS}`;
    mixRule = 'Propose 6 FRESH, specific, high-search-intent BUSINESS topics (all for the operator/owner audience above). Prefix every title with [B2B].';
  } else if (audience === 'consumer') {
    audienceBlock = `Audience: ${CONSUMER}`;
    mixRule = 'Propose 6 FRESH, specific, high-search-intent CONSUMER topics (all for the sole-trader/migrant audience above). Prefix every title with [B2C].';
  } else {
    audienceBlock = `Ozly serves TWO distinct audiences:\nA) ${CONSUMER}\nB) ${BUSINESS}`;
    mixRule = 'Propose 6 FRESH, specific, high-search-intent topics — a MIX of both audiences (aim for ~3 consumer + ~3 business). Prefix each title with [B2B] for business topics and [B2C] for consumer.';
  }

  const system = `You suggest blog topic ideas for Ozly. ${audienceBlock}

${mixRule} Each must be a specific question/angle (not generic). Australia-specific.

ALREADY COVERED — do NOT propose any topic on the same SUBJECT as any of these (not even a different angle, wording or sub-question). If your idea overlaps with one of them, drop it and pick a genuinely new subject:
${avoid}.

ANTI-CANNIBALISATION (critical): Ozly IS an invoicing, expense and tax-tracking app. NEVER suggest topics that give away a free alternative to Ozly's own product — no "free invoice template", "invoice generator", "spreadsheet/Excel templates", "track expenses in a spreadsheet", "DIY bookkeeping template". Every topic must make Ozly the natural solution, not replace it. Educational/explainer angles are great; "here's a free tool that does what our app does" is banned.

Output EXACTLY this, one block per idea, nothing else. Prefix each title with [B2B] or [B2C]:
@@@TOPIC@@@
[B2C] <title up to 70 chars> | <one-line angle>`;

  const result = (await env.AI.run(AI_MODEL, {
    max_tokens: 700,
    temperature: 0.9, // fresh ideas each click
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: 'Give me 6 fresh topic ideas now. Output only the @@@TOPIC@@@ blocks.' },
    ],
  })) as { response?: unknown };

  const text = String(result.response ?? '');
  const out: Array<{ slug: string; title: string; angle: string; audience: 'business' | 'consumer'; done: boolean }> = [];

  // Accept the @@@TOPIC@@@ format OR a plain list — pull "title | angle" /
  // "title - angle" / "title: angle" from each candidate line.
  const candidates = text.includes('@@@TOPIC@@@')
    ? text.split('@@@TOPIC@@@').map((s) => s.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '')
    : text.split('\n');

  for (const raw of candidates) {
    const cleaned = raw.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
    // Detect the audience tag, then strip it.
    const tag = cleaned.match(/^\[(B2[BC])\]/i);
    const lineAudience: 'business' | 'consumer' =
      audience ?? (tag && tag[1].toUpperCase() === 'B2B' ? 'business' : 'consumer');
    let line = cleaned.replace(/^\[B2[BC]\]\s*/i, '');
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
    out.push({ slug, title, angle, audience: lineAudience, done: false });
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

/** Heuristic: is this topic aimed at the BUSINESS audience (Ozly for Companies)
 *  rather than the individual sole trader/migrant? Used to switch voice + CTA. */
function isBusinessTopic(topic: string): boolean {
  return /\b(business(es)?|company|companies|for companies|workforce|employer|operators?|onboard(ing)?|hir(e|ing)|payroll|sham[- ]?contracting|misclassif|retention|churn|labour[- ]?hire|your (contractors|team|cleaners|staff)|employees? vs|vs employees?|b2b)\b/i.test(
    topic,
  );
}

async function aiGenerateLang(topic: string, code: 'en' | 'pt' | 'es', env: Env): Promise<GenLang> {
  const langName = LANG_NAMES[code];
  const business = isBusinessTopic(topic);

  const audienceLine = business
    ? 'operators and owners of Australian businesses that run on ABN contractors (cleaning companies, trades, labour-hire, delivery fleets) — the "Ozly for Companies" audience'
    : 'Australian sole traders (cleaners, tradies, contractors) and migrants on student/working-holiday visas';
  const specificRule = business
    ? 'Write to the business operator (e.g. "if you run a cleaning company with 15 contractors"). Frame everything as the operator\'s cost: retention, admin load, and compliance / sham-contracting risk. Never generic.'
    : 'Be specific to the audience (e.g. "cleaner with an ABN"), never generic.';
  const experienceRule = business
    ? 'Include ONE line of real, lived experience ("the #1 thing operators tell us is…").'
    : 'Include ONE line of real, lived experience ("the #1 thing we see in the app is…").';
  const ctaRule = business
    ? 'End with a CTA for Ozly for Companies — give your contractor workforce one app to invoice right, stay compliant and reduce your admin. Link the org portal: https://app.ozly.au . Do NOT link the consumer App Store / Google Play here.'
    : 'End with a CTA tied to the pain, linking the app: App Store https://apps.apple.com/au/app/ozly/id6760398649 and Google Play https://play.google.com/store/apps/details?id=com.augusto.ozly .';

  const system = `You write blog posts for Ozly. This post targets: ${audienceLine}.

Write ONE blog post in ${langName} — native, idiomatic writing (NOT a translation).

Rules (follow strictly):
1. Answer the core number/question in the FIRST line. No preamble.
2. ${specificRule}
3. ${experienceRule}
4. For any tax/visa fact, add an inline markdown link to the official source: ATO https://www.ato.gov.au/ or Home Affairs https://immi.homeaffairs.gov.au/ .
5. ${ctaRule}
6. MANDATORY — always end with a clear disclaimer (in ${langName}): Ozly is a record-keeping tool, NOT an accountant or registered tax agent, and this article is general information, not tax or accounting advice — consult a registered tax agent for your own situation. Every post must include this.
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
    // Higher temperature so regenerating the same topic yields a fresh draft
    // (the model is near-deterministic at low temp → "always the same text").
    temperature: 0.85,
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

// Web search (Tavily) → authoritative current context for the fact-check.
// Returns '' if no key is set, so review still works (ungrounded) without it.
async function webContext(query: string, env: Env): Promise<string> {
  if (!env.TAVILY_API_KEY) return '';
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
        include_domains: ['ato.gov.au', 'immi.homeaffairs.gov.au', 'abr.gov.au', 'business.gov.au'],
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { answer?: string; results?: Array<{ title?: string; url?: string; content?: string }> };
    const parts: string[] = [];
    if (data.answer) parts.push(`Summary: ${data.answer}`);
    for (const r of (data.results ?? []).slice(0, 5)) {
      parts.push(`[${r.title ?? ''}] ${r.url ?? ''}\n${(r.content ?? '').slice(0, 600)}`);
    }
    return parts.join('\n\n').slice(0, 4000);
  } catch {
    return '';
  }
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[“”„]/g, '"').replace(/\s+/g, ' ').trim();
}

/** Pull the quoted offending snippet out of a finding line (« », " ", ' '). */
function extractQuote(text: string): string | null {
  const m = text.match(/[«"“']([^«»"“”']{3,})[»"”']/);
  return m ? m[1].trim() : null;
}

/** Is the mandatory "not an accountant / general info" disclaimer present? */
function hasDisclaimer(body: string): boolean {
  return /not an accountant|registered tax agent|not (tax|accounting|legal) advice|general information|n[ãa]o (somos|é|substitui)|contabilidade|agente fiscal|orienta[çc][ãa]o (fiscal|profissional)|informa[çc][ãa]o geral|no (somos|reemplaza)|asesoramiento|informaci[oó]n general/i.test(
    body,
  );
}

async function aiReviewLang(tr: GenLang, code: 'en' | 'pt' | 'es', env: Env, context: string): Promise<ReviewLang> {
  const langName = LANG_NAMES[code];
  const grounding = context
    ? `\n\nAUTHORITATIVE WEB CONTEXT (from ato.gov.au / Home Affairs — treat as current truth; compare the draft's numbers/rules against it and flag mismatches):\n${context}\n`
    : '';
  const system = `You are an Australian tax/visa fact-checker for Ozly's blog. Review this draft (written in ${langName}).

STRICT RULES — follow exactly:
1. Only flag problems that are ACTUALLY present in the BODY below. For EVERY problem you list, quote the exact offending text VERBATIM inside «guillemets». If you cannot copy the exact words from the body, DO NOT list it.
2. Do NOT give generic advice ("add more detail", "consider adding a source", "make it clearer"). Do NOT flag a missing disclaimer, CTA or source link — those are checked separately by code, not by you.
3. Focus only on: wrong/outdated Australian tax or visa numbers & rules (e.g. an old 32.5% marginal rate, a wrong tax-free threshold, a wrong student-visa hour limit), clear factual errors, and real grammar/spelling mistakes.
${context ? 'Use the WEB CONTEXT below as the source of truth — flag HIGH where the draft disagrees and give the correct value.' : 'Use accurate Australian 2025–26 values.'}

Severity HIGH = wrong/risky fact; MED = should fix; LOW = minor.${grounding}

Output EXACTLY this, copied literally:
@@@VERDICT@@@
PASS or NEEDS_WORK
@@@FINDINGS@@@
[HIGH] «exact quote from the body» — what is wrong and the correct value
[MED] «exact quote» — ...
(write "none" if there are genuinely no problems)`;

  const user = `BODY:\n${tr.body}`;
  const result = (await env.AI.run(AI_MODEL, {
    max_tokens: 1500,
    temperature: 0.2, // stable re-checks
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })) as { response?: unknown };
  const parsed = parseReview(result.response ?? result);

  // Keep ONLY findings that quote text actually present in the draft. This kills
  // the generic / hallucinated findings that otherwise reappear on every
  // re-check — once you fix the text, the quoted snippet is gone, so the finding
  // can't come back.
  const haystack = normalizeForMatch(`${tr.title}\n${tr.description}\n${tr.body}`);
  const grounded: Finding[] = parsed.findings.filter((f) => {
    const q = extractQuote(f.text);
    if (!q) return false; // drop quote-less generic advice
    return haystack.includes(normalizeForMatch(q));
  });

  // Reliable, deterministic check for the one thing that legitimately has no
  // quote: the mandatory disclaimer. Won't reappear once it's added.
  if (!hasDisclaimer(tr.body)) {
    grounded.unshift({
      severity: 'HIGH',
      text: 'Falta o disclaimer obrigatório: Ozly não é contador/agente fiscal e isto é informação geral, não orientação fiscal.',
    });
  }

  return { verdict: grounded.length > 0 ? 'NEEDS_WORK' : 'PASS', findings: grounded };
}

async function reviewPost(body: PublishBody, env: Env): Promise<Record<string, ReviewLang>> {
  // Review any language that has a title OR a real body — so a draft you paste
  // in (even without a perfect title) still gets fact-checked.
  const hasContent = (g?: GenLang): boolean =>
    !!g && ((g.title?.trim().length ?? 0) > 0 || (g.body?.trim().length ?? 0) > 20);
  const codes = (['en', 'pt', 'es'] as const).filter((c) => hasContent(body[c]));
  // One web search (in English — ATO content is English), reused for all langs.
  const seed = body.en?.title || body.pt?.title || body.es?.title || '';
  const context = await webContext(`${seed} Australia ATO 2025-26 tax rules`, env);
  const entries = await Promise.all(
    codes.map((c) => aiReviewLang(body[c] as GenLang, c, env, context).then((r) => [c, r] as const)),
  );
  return Object.fromEntries(entries);
}

/* ── Apply one fact-check finding to a single-language draft ── */

/** Locate a quoted snippet inside the body, tolerant of case/whitespace.
 *  Returns the exact matched range so we can string-replace it precisely. */
function locateSnippet(body: string, quote: string): { index: number; length: number } | null {
  const exact = body.indexOf(quote);
  if (exact >= 0) return { index: exact, length: quote.length };
  const pattern = quote
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  try {
    const m = body.match(new RegExp(pattern, 'i'));
    if (m && m.index !== undefined) return { index: m.index, length: m[0].length };
  } catch {
    /* bad regex — ignore */
  }
  return null;
}

async function applyFix(
  input: { lang?: string; title?: string; description?: string; body?: string; finding?: string },
  env: Env,
): Promise<GenLang> {
  const langName = LANG_NAMES[(input.lang as 'en' | 'pt' | 'es')] ?? 'the original language';
  const body = input.body ?? '';
  const finding = input.finding ?? '';
  const keep = { title: input.title ?? '', description: input.description ?? '' };

  // ── SURGICAL path ──────────────────────────────────────────────────────
  // The finding quotes the exact offending snippet («…»). Ask the model to fix
  // ONLY that short snippet, then string-replace it in the body by code. Far
  // more reliable than asking it to regenerate the whole post (which echoes).
  const quote = extractQuote(finding);
  if (quote) {
    const loc = locateSnippet(body, quote);
    if (loc) {
      const original = body.slice(loc.index, loc.index + loc.length);
      const sys = `You fix one short snippet from an Australian tax/visa blog written in ${langName}.

THE PROBLEM: ${finding}

Output ONLY the corrected snippet that replaces the original — same language and style, GitHub-flavoured Markdown, no surrounding quotes, no explanation. If a number/threshold/rate is wrong, put the correct Australian 2025–26 value. Your output MUST differ from the original.`;
      const res = (await env.AI.run(AI_MODEL, {
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Original snippet:\n${original}` },
        ],
      })) as { response?: unknown };
      let fixed = String(res.response ?? '').trim();
      // Strip wrapping quotes / code fences the model sometimes adds.
      fixed = fixed.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^[«"'‘“]+|[»"'’”]+$/g, '').trim();
      if (fixed && fixed.length > 1 && fixed !== original) {
        const newBody = body.slice(0, loc.index) + fixed + body.slice(loc.index + loc.length);
        return { ...keep, body: newBody };
      }
    }
  }

  // ── FALLBACK path ──────────────────────────────────────────────────────
  // No quote (e.g. the disclaimer finding) or the snippet couldn't be located:
  // rewrite the whole body.
  const system = `You are an editor fixing a blog draft written in ${langName} for Ozly.

THE PROBLEM TO FIX (you MUST resolve this):
${finding}

Rewrite the draft so this problem is GONE. You MUST change the text — returning it unchanged is a failure. Make the smallest edit that fully resolves the problem and leave everything else as close to the original as possible: same language, tone, structure, links, headings, CTA and the mandatory disclaimer (Ozly is not an accountant/registered tax agent). Keep GitHub-flavoured Markdown. No commentary.

Output EXACTLY this, nothing else:
@@@TITLE@@@
(title — unchanged unless the fix is about the title)
@@@DESC@@@
(description — unchanged unless the fix is about it)
@@@BODY@@@
(the full corrected markdown body)`;
  const user = `Apply the fix and output the full corrected version.\n\nTITLE: ${keep.title}\nDESC: ${keep.description}\n\nBODY:\n${body}`;
  const result = (await env.AI.run(AI_MODEL, {
    max_tokens: 4096,
    temperature: 0.4,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })) as { response?: unknown };

  const rawText = String(result.response ?? '').trim();
  if (/@@@BODY@@@/i.test(rawText)) {
    const parsed = parseDelimited(rawText);
    return {
      title: parsed.title && parsed.title.length > 2 ? parsed.title : keep.title,
      description: parsed.description && parsed.description.length > 2 ? parsed.description : keep.description,
      body: parsed.body && parsed.body.length > 40 ? parsed.body : body,
    };
  }
  return {
    ...keep,
    body: rawText.length > 40 ? rawText : body,
  };
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

async function publishPost(
  body: PublishBody,
  env: Env,
): Promise<{ ok: true; committed: string[]; pr: number; merged: boolean }> {
  const date = body.date || isoDate();
  const draft = body.draft !== false; // default true — review gate
  const langs: Array<['en' | 'pt' | 'es', GenLang | undefined]> = [
    ['en', body.en],
    ['pt', body.pt],
    ['es', body.es],
  ];

  // `main` is a PROTECTED branch — direct commits return 409. So publish via a
  // pull request: branch off main → commit each language → open PR → merge it.
  const baseSha = await githubGetRefSha(GITHUB_BRANCH, env);
  const branch = `blog/${body.slug}-${Date.now().toString(36)}`;
  await githubCreateBranch(branch, baseSha, env);

  const committed: string[] = [];
  for (const [lang, tr] of langs) {
    if (!tr || !tr.title) continue;
    const path = `content/blog/${lang}/${body.slug}.md`;
    const content = frontmatter(tr, date, draft);
    await githubPutFile(path, content, `blog: ${draft ? 'draft' : 'publish'} ${body.slug} (${lang})`, env, branch);
    committed.push(path);
  }
  if (committed.length === 0) throw new Error('Nothing to publish — no language had a title.');

  const pr = await githubCreatePr(
    branch,
    `blog: ${draft ? 'draft' : 'publish'} ${body.slug}`,
    `Automated blog ${draft ? 'draft' : 'publish'} from the admin portal.\n\nFiles:\n${committed.map((p) => `- ${p}`).join('\n')}`,
    env,
  );

  // Merge it (squash). main requires a PR but 0 approvals, so this succeeds.
  let merged = false;
  try {
    await githubMergePr(pr, env);
    merged = true;
    await githubDeleteBranch(branch, env); // best-effort cleanup
  } catch (e) {
    // PR is open but couldn't auto-merge (e.g. a required check appeared).
    throw new Error(`Files committed and PR #${pr} opened, but auto-merge failed: ${(e as Error).message}. Merge PR #${pr} manually.`);
  }
  return { ok: true, committed, pr, merged };
}

function isoDate(): string {
  // Workers have Date; this runs per-request so it's fine here (not in a
  // resumable workflow). Format YYYY-MM-DD.
  return new Date().toISOString().slice(0, 10);
}

function githubHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ozly-blog-admin',
    'Content-Type': 'application/json',
  };
}

async function githubGetRefSha(branch: string, env: Env): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/ref/heads/${branch}`, {
    headers: githubHeaders(env),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} reading ref ${branch}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { object?: { sha?: string } };
  if (!data.object?.sha) throw new Error(`No sha for ref ${branch}`);
  return data.object.sha;
}

async function githubCreateBranch(branch: string, sha: string, env: Env): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs`, {
    method: 'POST',
    headers: githubHeaders(env),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} creating branch ${branch}: ${(await res.text()).slice(0, 160)}`);
}

async function githubCreatePr(head: string, title: string, prBody: string, env: Env): Promise<number> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls`, {
    method: 'POST',
    headers: githubHeaders(env),
    body: JSON.stringify({ title, head, base: GITHUB_BRANCH, body: prBody }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} creating PR: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { number?: number };
  if (!data.number) throw new Error('PR created but no number returned');
  return data.number;
}

async function githubMergePr(prNumber: number, env: Env): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers: githubHeaders(env),
    body: JSON.stringify({ merge_method: 'squash' }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

async function githubDeleteBranch(branch: string, env: Env): Promise<void> {
  await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${branch}`, {
    method: 'DELETE',
    headers: githubHeaders(env),
  }).catch(() => {}); // best-effort
}

async function githubPutFile(
  path: string,
  content: string,
  message: string,
  env: Env,
  branch: string,
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const ghHeaders = githubHeaders(env);
  // Need the existing sha (on THIS branch) to update an existing file.
  let sha: string | undefined;
  const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
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
      branch,
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
