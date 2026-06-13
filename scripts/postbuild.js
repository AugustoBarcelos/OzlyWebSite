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

function jsonLdBlock(lang, path) {
  const blocks = [appLd(lang), ORGANIZATION_LD];
  const faq = faqLd(lang, path);
  if (faq) blocks.push(faq);
  return blocks
    .map((b) => `    <script type="application/ld+json">\n    ${JSON.stringify(b)}\n    </script>`)
    .join("\n");
}

/* ──────────────────────────── rendering ──────────────────────────── */

const srcHtml = readFileSync(join(dist, "index.html"), "utf8");

function render(page, lang) {
  const meta = i18n[lang.code].seo[page.key];
  const canonical = urlFor(lang.prefix, page.path);
  const titleAttr = escapeAttr(meta.title);
  const descAttr = escapeAttr(meta.description);
  const pre = prerenderContent[page.path][lang.code];

  let html = srcHtml;

  // <html lang> — crawlers take the static value; the SPA only refines it.
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang.html}">`);

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(meta.title)}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${descAttr}" />`
  );

  // Canonical + full hreflang cluster (every variant lists all three +
  // x-default → EN). Search engines need the cluster on EVERY page.
  const alternates = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlFor(l.prefix, page.path)}" />`
  )
    .concat(`<link rel="alternate" hreflang="x-default" href="${urlFor("", page.path)}" />`)
    .join("\n    ");
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${canonical}" />\n    ${alternates}`
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
    `<meta property="og:url" content="${canonical}" />`
  );
  const ogAlternates = LANGS.filter((l) => l.code !== lang.code)
    .map((l) => `<meta property="og:locale:alternate" content="${l.og}" />`)
    .join("\n    ");
  html = html.replace(
    /<meta property="og:locale"[^>]*>/,
    `<meta property="og:locale" content="${lang.og}" />\n    ${ogAlternates}`
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
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    jsonLdBlock(lang.code, page.path).trimStart()
  );

  // Rewrite the prerender block with this route's H1 + body
  const noscript = {
    en: "Ozly requires JavaScript. Please enable JavaScript or download the app on iOS or Android.",
    pt: "O Ozly precisa de JavaScript. Ative o JavaScript ou baixe o app no iOS ou Android.",
    es: "Ozly necesita JavaScript. Activa JavaScript o descarga la app en iOS o Android.",
  }[lang.code];
  const prerender = `<main class="seo-prerender"><h1>${pre.h1}</h1>${pre.body}<noscript>${noscript}</noscript></main>`;
  html = html.replace(/<main class="seo-prerender">[\s\S]*?<\/main>/, prerender);

  // Async-load the main stylesheet: preload (high priority, non-blocking),
  // then promote to stylesheet on load. The prerender above the fold has
  // all the CSS it needs inline in <style>, so React can hydrate after the
  // real stylesheet arrives without blocking first paint.
  if (cssFile) {
    const cssPath = `/assets/${cssFile}`;
    html = html.replace(
      /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>/,
      `<link rel="preload" href="${cssPath}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${cssPath}"></noscript>`
    );
  }

  return html;
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
console.log(`  ✓ sitemap.xml (${PAGES.length * LANGS.length + staticPages.length} URLs, hreflang cluster)`);

console.log("Post-build: done.");
