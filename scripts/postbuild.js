/**
 * Post-build: emit per-route × per-language index.html files with unique SEO
 * metadata (title, description, canonical, hreflang, Open Graph, JSON-LD)
 * and pre-rendered H1 + body content. React replaces #root on mount;
 * crawlers see the static content — in the right language.
 *
 * EN lives at the root (/, /support, /guide, /business); PT and ES under
 * /pt/ and /es/ prefixes. Every variant cross-links the others via
 * hreflang, and sitemap.xml is generated here with the full language
 * cluster — so Google can rank the PT/ES content for PT/ES queries.
 *
 * Sources of truth:
 *  - titles/descriptions: src/i18n/<lang>.json → seo.<page>  (shared with
 *    the client-side useSeoMeta hook)
 *  - prerendered H1/body: scripts/seo-content.mjs
 *  - FAQ JSON-LD: src/i18n/<lang>.json → faq.q1..q6 (+ visa/subscription
 *    questions on /support)
 *
 * Static HTML files already shipped in public/ (privacy-policy,
 * terms-of-use, delete-account, refer) are preserved.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { content as prerenderContent } from "./seo-content.mjs";
import { loadPosts } from "./blog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

// Discover the hashed CSS asset so we can preload it (HTTP/2 fetches the
// stylesheet in parallel with HTML parse, minus the round-trip penalty of
// waiting for the <link rel="stylesheet"> tag to be discovered).
const assetsDir = join(dist, "assets");
const cssFile = readdirSync(assetsDir).find((f) => f.endsWith(".css"));

const ORIGIN = "https://ozly.au";
const OG_IMAGE = `${ORIGIN}/og-image.png`;

const LANGS = [
  { code: "en", prefix: "", html: "en-AU", og: "en_AU", hreflang: "en" },
  { code: "pt", prefix: "/pt", html: "pt-BR", og: "pt_BR", hreflang: "pt-BR" },
  { code: "es", prefix: "/es", html: "es", og: "es_LA", hreflang: "es" },
];

// path → i18n seo.* key
const PAGES = [
  { path: "/", key: "home" },
  { path: "/support", key: "support" },
  { path: "/guide", key: "guide" },
  { path: "/guide/business", key: "businessGuide" },
  { path: "/business", key: "business" },
];

// Localized strings straight from the app bundles — no duplication.
const i18n = Object.fromEntries(
  ["en", "pt", "es"].map((l) => [
    l,
    JSON.parse(readFileSync(join(__dirname, "..", "src", "i18n", `${l}.json`), "utf8")),
  ])
);

/** Canonical URL for a page in a language: trailing slash, prefix-aware. */
function urlFor(langPrefix, path) {
  const p = path === "/" ? "" : path;
  return `${ORIGIN}${langPrefix}${p}/`;
}

function escapeAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ───────────────────────────── JSON-LD ───────────────────────────── */

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ozly Pty Ltd",
  url: `${ORIGIN}/`,
  logo: `${ORIGIN}/OSLY.svg`,
  email: "contact@ozly.com.au",
  address: { "@type": "PostalAddress", addressCountry: "AU" },
};

function appLd(lang) {
  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "Ozly",
    operatingSystem: "iOS, Android",
    applicationCategory: "BusinessApplication",
    description: i18n[lang].seo.home.description,
    inLanguage: ["en-AU", "pt-BR", "es"],
    url: urlFor(LANGS.find((l) => l.code === lang).prefix, "/"),
    image: OG_IMAGE,
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    publisher: { "@type": "Organization", name: "Ozly Pty Ltd", url: `${ORIGIN}/` },
  };
}

// FAQ rich data: the home shows q1–q6; support also answers the visa and
// subscription questions people actually google.
const FAQ_KEYS = { "/": ["q1", "q2", "q3", "q4", "q5", "q6"], "/support": ["q1", "q2", "q3", "q4", "q5", "q6", "q8", "q22", "q23", "q28"] };

function faqLd(lang, path) {
  const keys = FAQ_KEYS[path];
  if (!keys) return null;
  const faq = i18n[lang].faq;
  const entries = keys
    .filter((q) => faq[q] && faq[q.replace("q", "a")])
    .map((q) => ({
      "@type": "Question",
      name: faq[q],
      acceptedAnswer: { "@type": "Answer", text: faq[q.replace("q", "a")] },
    }));
  if (!entries.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entries };
}

function jsonLdArray(lang, path) {
  const blocks = [appLd(lang), ORGANIZATION_LD];
  const faq = faqLd(lang, path);
  if (faq) blocks.push(faq);
  return blocks;
}

/* ──────────────────────────── rendering ──────────────────────────── */

const srcHtml = readFileSync(join(dist, "index.html"), "utf8");

const NOSCRIPT = {
  en: "Ozly requires JavaScript. Please enable JavaScript or download the app on iOS or Android.",
  pt: "O Ozly precisa de JavaScript. Ative o JavaScript ou baixe o app no iOS ou Android.",
  es: "Ozly necesita JavaScript. Activa JavaScript o descarga la app en iOS o Android.",
};

/**
 * Build one index.html from the SPA template, parameterised. Both the
 * marketing pages and the blog go through here, so the SEO treatment
 * (hreflang cluster, OG, JSON-LD, async CSS, prerendered <main>) is identical.
 *
 * opts:
 *   htmlLang        - <html lang> value
 *   title, description
 *   canonical       - absolute URL with trailing slash
 *   alternates      - [{ hreflang, href }]  (include x-default yourself)
 *   ogLocale        - og:locale
 *   ogAlternates    - [og locale strings] for og:locale:alternate
 *   jsonLd          - [object]  structured-data blocks
 *   prerenderInner  - HTML inside <main class="seo-prerender"> (incl. <h1>)
 *   noscript        - <noscript> text
 *   inlineData      - { id, json } | null  inline JSON for instant hydration
 */
function renderDoc(opts) {
  const titleAttr = escapeAttr(opts.title);
  const descAttr = escapeAttr(opts.description);
  let html = srcHtml;

  // <html lang> — crawlers take the static value; the SPA only refines it.
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${opts.htmlLang}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${titleAttr}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${descAttr}" />`
  );

  // Canonical + full hreflang cluster on EVERY page.
  const alternates = opts.alternates
    .map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
    .join("\n    ");
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${opts.canonical}" />\n    ${alternates}`
  );

  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${titleAttr}" />`
  );
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${descAttr}" />`
  );
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${opts.canonical}" />`
  );
  const ogAlternates = opts.ogAlternates
    .map((og) => `<meta property="og:locale:alternate" content="${og}" />`)
    .join("\n    ");
  html = html.replace(
    /<meta property="og:locale"[^>]*>/,
    `<meta property="og:locale" content="${opts.ogLocale}" />${ogAlternates ? "\n    " + ogAlternates : ""}`
  );
  html = html.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${titleAttr}" />`
  );
  html = html.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${descAttr}" />`
  );

  // Route + language-specific structured data replaces the generic block.
  const jsonLdStr = opts.jsonLd
    .map((b) => `    <script type="application/ld+json">\n    ${JSON.stringify(b)}\n    </script>`)
    .join("\n")
    .trimStart();
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLdStr);

  const prerender = `<main class="seo-prerender">${opts.prerenderInner}<noscript>${opts.noscript}</noscript></main>`;
  html = html.replace(/<main class="seo-prerender">[\s\S]*?<\/main>/, prerender);

  // Hand the post body to React on the first paint (direct landing) so it can
  // render without a fetch round-trip or a content flash.
  if (opts.inlineData) {
    html = html.replace(
      /<script type="module"/,
      `<script id="${opts.inlineData.id}" type="application/json">${opts.inlineData.json}</script>\n    <script type="module"`
    );
  }

  // Async-load the main stylesheet: preload (high priority, non-blocking),
  // then promote to stylesheet on load. The prerender above the fold has all
  // the CSS it needs inline in <style>, so React can hydrate after the real
  // stylesheet arrives without blocking first paint.
  if (cssFile) {
    const cssPath = `/assets/${cssFile}`;
    html = html.replace(
      /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>/,
      `<link rel="preload" href="${cssPath}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${cssPath}"></noscript>`
    );
  }

  return html;
}

function render(page, lang) {
  const meta = i18n[lang.code].seo[page.key];
  const pre = prerenderContent[page.path][lang.code];
  return renderDoc({
    htmlLang: lang.html,
    title: meta.title,
    description: meta.description,
    canonical: urlFor(lang.prefix, page.path),
    alternates: LANGS.map((l) => ({ hreflang: l.hreflang, href: urlFor(l.prefix, page.path) })).concat({
      hreflang: "x-default",
      href: urlFor("", page.path),
    }),
    ogLocale: lang.og,
    ogAlternates: LANGS.filter((l) => l.code !== lang.code).map((l) => l.og),
    jsonLd: jsonLdArray(lang.code, page.path),
    prerenderInner: `<h1>${pre.h1}</h1>${pre.body}`,
    noscript: NOSCRIPT[lang.code],
    inlineData: null,
  });
}

/* ─────────────────────────── write files ─────────────────────────── */

for (const lang of LANGS) {
  for (const page of PAGES) {
    const isRoot = lang.code === "en" && page.path === "/";
    const dir = isRoot ? dist : join(dist, `${lang.prefix}${page.path === "/" ? "" : page.path}`);
    const target = join(dir, "index.html");
    if (!isRoot && existsSync(target)) {
      console.log(`  ⏭ ${lang.prefix}${page.path}/index.html (static file exists)`);
      continue;
    }
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(target, render(page, lang), "utf8");
    console.log(`  ✓ ${lang.prefix}${page.path === "/" ? "" : page.path}/index.html`);
  }
}

/* ──────────────────────────── blog ──────────────────────────── */
// Posts live in content/blog/<lang>/<slug>.md (parsed by blog-lib). Each
// post + the /blog index is prerendered per language with the same SEO
// treatment as the marketing pages. The listing exists in all three langs;
// a post only lists the languages it was actually written in.

const BLOG_BASE = "/blog";
const langByCode = Object.fromEntries(LANGS.map((l) => [l.code, l]));

const BLOG_LISTING = {
  en: { title: "Ozly Blog — Tax, ABN & visa guides for Australian sole traders", description: "Plain-English guides on ABN, tax, GST, invoicing and visa work rules for sole traders and migrants working in Australia.", intro: "Plain-English guides on tax, ABN, GST and visas — for people working for themselves in Australia." },
  pt: { title: "Blog da Ozly — Guias de imposto, ABN e visto na Austrália", description: "Guias diretos sobre ABN, imposto, GST, invoices e regras de trabalho por visto para quem trabalha por conta própria na Austrália.", intro: "Guias diretos sobre imposto, ABN, GST e vistos — para quem trabalha por conta própria na Austrália." },
  es: { title: "Blog de Ozly — Guías de impuestos, ABN y visa en Australia", description: "Guías claras sobre ABN, impuestos, GST, facturas y reglas de trabajo por visa para quienes trabajan por su cuenta en Australia.", intro: "Guías claras sobre impuestos, ABN, GST y visas — para quienes trabajan por su cuenta en Australia." },
};

const BLOG_LABELS = {
  en: { read: "min read", back: "All articles", by: "By" },
  pt: { read: "min de leitura", back: "Todos os artigos", by: "Por" },
  es: { read: "min de lectura", back: "Todos los artículos", by: "Por" },
};

const blogUrl = (langPrefix, slug) => `${ORIGIN}${langPrefix}${BLOG_BASE}${slug ? `/${slug}` : ""}/`;

const posts = loadPosts();

/** hreflang cluster for a post: only the languages it exists in. */
function postAlternates(post, slug) {
  const alts = post.langs.map((code) => ({
    hreflang: langByCode[code].hreflang,
    href: blogUrl(langByCode[code].prefix, slug),
  }));
  const xdefault = post.langs.includes("en") ? "en" : post.langs[0];
  alts.push({ hreflang: "x-default", href: blogUrl(langByCode[xdefault].prefix, slug) });
  return alts;
}

function listingDoc(lang) {
  const m = BLOG_LISTING[lang.code];
  const items = posts
    .map((post) => {
      const code = post.langs.includes(lang.code) ? lang.code : post.langs[0];
      const tr = post.translations[code];
      const href = blogUrl(lang.prefix, post.slug);
      return `<h2><a href="${href}">${escapeHtml(tr.title)}</a></h2>\n<p>${escapeHtml(tr.description)}</p>`;
    })
    .join("\n");
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: m.title,
    description: m.description,
    url: blogUrl(lang.prefix),
    inLanguage: lang.html,
    publisher: { "@type": "Organization", name: "Ozly Pty Ltd", url: `${ORIGIN}/` },
  };
  return renderDoc({
    htmlLang: lang.html,
    title: m.title,
    description: m.description,
    canonical: blogUrl(lang.prefix),
    alternates: LANGS.map((l) => ({ hreflang: l.hreflang, href: blogUrl(l.prefix) })).concat({
      hreflang: "x-default",
      href: blogUrl(""),
    }),
    ogLocale: lang.og,
    ogAlternates: LANGS.filter((l) => l.code !== lang.code).map((l) => l.og),
    jsonLd: [blogLd, ORGANIZATION_LD],
    prerenderInner: `<h1>${escapeHtml(m.title)}</h1><p class="sub">${escapeHtml(m.intro)}</p>${items}`,
    noscript: NOSCRIPT[lang.code],
    inlineData: null,
  });
}

function postDoc(post, lang) {
  const tr = post.translations[lang.code];
  const labels = BLOG_LABELS[lang.code];
  const canonical = blogUrl(lang.prefix, post.slug);
  const metaLine = `<p class="sub">${escapeHtml(tr.description)}</p><p>${labels.by} ${escapeHtml(tr.author)} · ${tr.readingTime} ${labels.read}</p>`;
  const postLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: tr.title,
    description: tr.description,
    datePublished: tr.date,
    dateModified: tr.date,
    inLanguage: lang.html,
    author: { "@type": "Organization", name: tr.author || "Ozly", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Ozly Pty Ltd", url: `${ORIGIN}/`, logo: `${ORIGIN}/OSLY.svg` },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    ...(tr.cover ? { image: `${ORIGIN}${tr.cover}` } : {}),
  };
  // Inline payload mirrors public/blog-data/<slug>.<lang>.json so React can
  // paint the post on first load without a fetch. Escape "<" so a stray
  // "</script>" in the body can never break out of the JSON script tag.
  const payload = {
    slug: post.slug, lang: lang.code, langs: post.langs,
    title: tr.title, description: tr.description, date: tr.date,
    author: tr.author, cover: tr.cover, tags: tr.tags,
    readingTime: tr.readingTime, html: tr.html,
  };
  const inlineJson = JSON.stringify(payload).replace(/</g, "\\u003c");
  return renderDoc({
    htmlLang: lang.html,
    title: `${tr.title} — Ozly`,
    description: tr.description,
    canonical,
    alternates: postAlternates(post, post.slug),
    ogLocale: lang.og,
    ogAlternates: post.langs.filter((c) => c !== lang.code).map((c) => langByCode[c].og),
    jsonLd: [postLd, ORGANIZATION_LD],
    prerenderInner: `<h1>${escapeHtml(tr.title)}</h1>${metaLine}${tr.html}`,
    noscript: NOSCRIPT[lang.code],
    inlineData: { id: "blog-post-data", json: inlineJson },
  });
}

const blogSitemap = [];
const blogToday = new Date().toISOString().slice(0, 10);

for (const lang of LANGS) {
  // Listing page (all three languages).
  const listDir = join(dist, `${lang.prefix}${BLOG_BASE}`);
  if (!existsSync(listDir)) mkdirSync(listDir, { recursive: true });
  writeFileSync(join(listDir, "index.html"), listingDoc(lang), "utf8");
  console.log(`  ✓ ${lang.prefix}${BLOG_BASE}/index.html`);
}

// Listing sitemap entries (one per lang, full cluster).
for (const lang of LANGS) {
  const alts = LANGS.map(
    (l) => `    <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${blogUrl(l.prefix)}"/>`
  )
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${blogUrl("")}"/>`)
    .join("\n");
  blogSitemap.push(`  <url>
    <loc>${blogUrl(lang.prefix)}</loc>
${alts}
    <lastmod>${blogToday}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
}

// Each post, in each language it exists in.
for (const post of posts) {
  for (const code of post.langs) {
    const lang = langByCode[code];
    const dir = join(dist, `${lang.prefix}${BLOG_BASE}/${post.slug}`);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), postDoc(post, lang), "utf8");
    console.log(`  ✓ ${lang.prefix}${BLOG_BASE}/${post.slug}/index.html`);
    const alts = postAlternates(post, post.slug)
      .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
      .join("\n");
    blogSitemap.push(`  <url>
    <loc>${blogUrl(lang.prefix, post.slug)}</loc>
${alts}
    <lastmod>${post.translations[code].date || blogToday}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }
}

/* ─────────────────────────── sitemap.xml ─────────────────────────── */
// Generated here (not hand-maintained in public/) so the language cluster
// never drifts from what was actually prerendered.

const today = new Date().toISOString().slice(0, 10);

function sitemapEntry(page, lang, { priority, changefreq }) {
  const loc = urlFor(lang.prefix, page.path);
  const alternates = LANGS.map(
    (l) => `    <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${urlFor(l.prefix, page.path)}"/>`
  )
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor("", page.path)}"/>`)
    .join("\n");
  return `  <url>
    <loc>${loc}</loc>
${alternates}
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const PAGE_META = {
  "/": { priority: "1.0", changefreq: "weekly" },
  "/support": { priority: "0.8", changefreq: "monthly" },
  "/guide": { priority: "0.8", changefreq: "monthly" },
  "/business": { priority: "0.9", changefreq: "monthly" },
  "/guide/business": { priority: "0.7", changefreq: "monthly" },
};

const staticPages = [
  { loc: `${ORIGIN}/privacy-policy/`, priority: "0.5", changefreq: "yearly" },
  { loc: `${ORIGIN}/terms-of-use/`, priority: "0.5", changefreq: "yearly" },
  { loc: `${ORIGIN}/delete-account/`, priority: "0.3", changefreq: "yearly" },
  { loc: `${ORIGIN}/refer/`, priority: "0.4", changefreq: "monthly" },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.flatMap((page) => LANGS.map((lang) => sitemapEntry(page, lang, PAGE_META[page.path]))).join("\n")}
${blogSitemap.join("\n")}
${staticPages
  .map(
    (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(dist, "sitemap.xml"), sitemap, "utf8");
console.log(
  `  ✓ sitemap.xml (${PAGES.length * LANGS.length + blogSitemap.length + staticPages.length} URLs, hreflang cluster)`
);

console.log("Post-build: done.");
