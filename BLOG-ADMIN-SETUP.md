# Blog + AI admin — setup

The blog is built. Authors create posts at **ozly.au/admin**: sign in → pick a
topic (it shows what's already written) → "Generate with AI" → edit → Publish.
Generation runs on **Cloudflare Workers AI (free tier)** and publishing commits
the markdown to GitHub — both inside the existing Cloudflare Worker
(`cloudflare-worker/`). **No paid API key.**

## One thing only you create (browser, ~3 min)

**GitHub fine-grained PAT** (so the worker can commit posts) —
https://github.com/settings/personal-access-tokens/new
- Repository access: **Only select repositories** → `AugustoBarcelos/OzlyWebSite`
- Permissions: **Contents → Read and write**
- Copy the `github_pat_...` value.

(The Cloudflare Workers AI used for generation is free and needs no key — it's
the `[ai]` binding in `wrangler.toml`.)

## Then (CLI — Claude can run these once you paste the token + pick a password)

```sh
cd cloudflare-worker

npx wrangler secret put GITHUB_TOKEN     # paste the github_pat_... token
npx wrangler secret put ADMIN_PASSWORD   # any password authors will type

npx wrangler deploy                       # adds /admin/api/* routes; /v/ OG keeps working
```

## Deploy the site (blog pages + /admin UI)

Ships with the normal GitHub Pages deploy — commit and push to `main`:

```sh
git add -A && git commit -m "Add blog + AI admin" && git push
```

After Actions finishes, **ozly.au/blog** and **ozly.au/admin** are live.

## How it works

- `content/blog/<lang>/<slug>.md` — the posts (markdown). Source of truth.
- `scripts/blog-lib.mjs` / `gen-blog.mjs` — parse markdown → JSON for React.
- `scripts/postbuild.js` — prerenders static HTML per post per language with
  full SEO (hreflang, sitemap, Open Graph, BlogPosting JSON-LD).
- `src/pages/Blog.jsx` / `BlogPost.jsx` — the React pages.
- `public/admin/` — the AI-authoring wizard (static page).
- `cloudflare-worker/src/index.ts` — `/admin/api/{login,topics,generate,publish}`.
  Generation uses `env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast")`.

## Approval gate

New posts default to **draft: true** — saved to the repo but **hidden from the
live site**. Click **Publish** (or flip `draft: false`) to go live. Nothing is
published without a human clicking publish.

## Costs

- Cloudflare Worker + Workers AI: **free tier** (10k neurons/day — plenty for
  ~1 post/week). If you ever blow the daily free quota, generation pauses till
  the next day; publishing is unaffected.
- GitHub / GitHub Pages: free.
- Quality note: Llama drafts are good but weaker than Claude on tax accuracy —
  **always verify numbers against the ATO before publishing** (the admin warns
  you in the editor).
