import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const BLOG = join(process.cwd(), 'content', 'blog');
const LANGS = ['en', 'pt', 'es'];
const bySlug = new Map();
for (const lang of LANGS) {
  const dir = join(BLOG, lang);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    if (f === 'onboard-abn-contractors-fast.md') continue; // broken AI draft — exclude
    const slug = f.replace(/\.md$/, '');
    const { data, content } = matter(readFileSync(join(dir, f), 'utf8'));
    if (!bySlug.has(slug)) bySlug.set(slug, { meta: data, tr: {} });
    bySlug.get(slug).tr[lang] = {
      title: (data.title || '').trim(),
      description: (data.description || '').trim(),
      body: content.trim(),
    };
    if (lang === 'en') bySlug.get(slug).meta = data;
  }
}
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
const dq = (s) => `$ob$${String(s)}$ob$`;          // dollar-quoted (readable)
const tags = (t) => `ARRAY[${(Array.isArray(t) ? t : []).map(sq).join(',')}]::text[]`;
const lang = (o) => o ? `jsonb_build_object('title', ${dq(o.title)}, 'description', ${dq(o.description)}, 'body', ${dq(o.body)})` : 'null';
const out = [];
for (const [slug, { meta, tr }] of bySlug) {
  const date = meta.date ? new Date(meta.date).toISOString().slice(0, 10) : '2026-01-01';
  out.push(
`insert into public.blog_posts (slug, date, author, tags, draft, en, pt, es) values (
  ${sq(slug)}, '${date}', ${sq(meta.author || 'Ozly')}, ${tags(meta.tags)}, ${meta.draft ? 'true' : 'false'},
  ${lang(tr.en)},
  ${lang(tr.pt)},
  ${lang(tr.es)}
) on conflict (slug) do update set
  date=excluded.date, author=excluded.author, tags=excluded.tags, draft=excluded.draft,
  en=excluded.en, pt=excluded.pt, es=excluded.es;`
  );
}
console.log(out.join('\n\n'));
