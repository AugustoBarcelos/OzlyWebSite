/**
 * Blog content loader — the single source of truth for both the React app
 * (via scripts/gen-blog.mjs → public/blog-data/*.json) and the static
 * prerender (scripts/postbuild.js). Parse the markdown once, in one place,
 * so the SPA and the crawler-facing HTML can never drift.
 *
 * Layout (Decap/Sveltia "multiple_folders" i18n convention, so the CMS can
 * read/write the same files without translation):
 *
 *   content/blog/
 *     en/abn-vs-tfn.md
 *     pt/abn-vs-tfn.md
 *     es/abn-vs-tfn.md
 *
 * The filename (without .md) is the slug and the post's cross-language
 * identity. A post needs at least one language; missing languages just drop
 * out of that post's hreflang cluster.
 *
 * Frontmatter (per file):
 *   title:       (required) <h1> + <title>
 *   description: (required) meta description + listing excerpt
 *   date:        (required) ISO date, e.g. 2026-06-15
 *   author:      (optional) defaults to "Ozly"
 *   cover:       (optional) absolute path under /, e.g. /blog/covers/x.png
 *   tags:        (optional) array of strings
 *   draft:       (optional) true → excluded unless ALLOW_DRAFTS=1
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const BLOG_DIR = join(__dirname, "..", "content", "blog");
export const LANG_CODES = ["en", "pt", "es"];

marked.setOptions({ gfm: true, breaks: false });

const ALLOW_DRAFTS = process.env.ALLOW_DRAFTS === "1";

function readingTime(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Parse one markdown file into a translation record, or null if it's a draft. */
function parseFile(absPath) {
  const raw = readFileSync(absPath, "utf8");
  const { data, content } = matter(raw);
  if (data.draft && !ALLOW_DRAFTS) return null;
  const body = content.trim();
  return {
    title: (data.title || "").trim(),
    description: (data.description || "").trim(),
    date: data.date ? new Date(data.date).toISOString().slice(0, 10) : null,
    author: (data.author || "Ozly").trim(),
    cover: data.cover || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    readingTime: readingTime(body),
    html: marked.parse(body),
  };
}

/**
 * Load all posts, newest first. Each post:
 *   { slug, date, author, cover, tags, langs: ["en",...],
 *     translations: { en: {title, description, date, author, cover, tags,
 *                          readingTime, html}, ... } }
 */
export function loadPosts() {
  if (!existsSync(BLOG_DIR)) return [];

  const bySlug = new Map();

  for (const lang of LANG_CODES) {
    const dir = join(BLOG_DIR, lang);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      const tr = parseFile(join(dir, file));
      if (!tr) continue; // draft
      if (!bySlug.has(slug)) bySlug.set(slug, { slug, translations: {} });
      bySlug.get(slug).translations[lang] = tr;
    }
  }

  const posts = [];
  for (const post of bySlug.values()) {
    const langs = LANG_CODES.filter((l) => post.translations[l]);
    if (!langs.length) continue;
    // Shared metadata is taken from the first available language (EN-first).
    const primary = post.translations[langs[0]];
    posts.push({
      slug: post.slug,
      date: primary.date,
      author: primary.author,
      cover: primary.cover,
      tags: primary.tags,
      langs,
      translations: post.translations,
    });
  }

  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return posts;
}

/** Lightweight metadata (no HTML body) for the listing page, per language. */
export function postSummary(post, lang) {
  const tr = post.translations[lang] || post.translations[post.langs[0]];
  return {
    slug: post.slug,
    lang,
    langs: post.langs,
    date: tr.date,
    author: tr.author,
    cover: tr.cover,
    tags: tr.tags,
    readingTime: tr.readingTime,
    title: tr.title,
    description: tr.description,
  };
}
