/**
 * Generate the JSON the React app reads at runtime, from content/blog/*.md.
 *
 *   public/blog-data/index.json          → listing metadata (no bodies)
 *   public/blog-data/<slug>.<lang>.json  → one post body per language
 *
 * Written under public/ so Vite copies it into dist/ on build (and the dev
 * server serves it). The directory is generated, not hand-edited, so it's
 * gitignored. Runs before `vite` (dev) and `vite build` — see package.json.
 *
 * The crawler-facing static HTML is produced separately by postbuild.js;
 * both read the same loadPosts() so they stay in sync.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadPosts, postSummary, LANG_CODES } from "./blog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "blog-data");

const posts = loadPosts();

// Start clean so deleted/renamed posts don't leave stale JSON behind.
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Listing index — one entry per post, with a per-language summary map.
const index = posts.map((post) => ({
  slug: post.slug,
  date: post.date,
  author: post.author,
  cover: post.cover,
  tags: post.tags,
  langs: post.langs,
  summaries: Object.fromEntries(post.langs.map((l) => [l, postSummary(post, l)])),
}));
writeFileSync(join(OUT, "index.json"), JSON.stringify(index), "utf8");

// Per-post, per-language bodies.
let bodyCount = 0;
for (const post of posts) {
  for (const lang of post.langs) {
    const tr = post.translations[lang];
    const payload = {
      slug: post.slug,
      lang,
      langs: post.langs,
      title: tr.title,
      description: tr.description,
      date: tr.date,
      author: tr.author,
      cover: tr.cover,
      tags: tr.tags,
      readingTime: tr.readingTime,
      html: tr.html,
    };
    writeFileSync(join(OUT, `${post.slug}.${lang}.json`), JSON.stringify(payload), "utf8");
    bodyCount++;
  }
}

console.log(
  `blog: ${posts.length} post(s), ${bodyCount} translation(s) → public/blog-data/ (langs: ${LANG_CODES.join(", ")})`
);
