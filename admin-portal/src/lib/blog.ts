/**
 * Client for the blog AI-authoring Worker (ozly.au/admin/api/*).
 *
 * Auth = the admin's Supabase session JWT (no separate password). The Worker
 * validates it via the team_my_grants RPC and requires is_admin.
 */
import { supabase } from './supabase';

const BASE = 'https://ozly.au/admin/api';

export interface BlogTopic {
  slug: string;
  title: string;
  angle: string;
  /** 'business' = Ozly for Companies / organizations; 'consumer' = sole traders. */
  audience?: 'business' | 'consumer';
  done: boolean;
}

/**
 * A GUIDE topic (for the /guias funnel). Same shape as a BlogTopic but grouped
 * by `profession` instead of audience, and carries the funnel `feature` that
 * seeds the guide's angle + CTA.
 */
export interface GuideTopic {
  slug: string;
  title: string;
  angle: string;
  profession: Profession;
  feature: string;
  done: boolean;
}

export interface BlogLang {
  title: string;
  description: string;
  body: string;
}

export interface BlogPost {
  slug: string;
  en: BlogLang;
  pt: BlogLang;
  es: BlogLang;
  /** 'post' (default blog article) | 'guide' (/guias funnel content). */
  kind?: PostKind;
  /** Guide-only soft category. */
  profession?: Profession | null;
  /** Guide-only Ozly feature the CTA funnels toward (free text). */
  feature?: string | null;
}

export type LangCode = 'en' | 'pt' | 'es';

/** Blog article vs /guias guide — same table, discriminated by `kind`. */
export type PostKind = 'post' | 'guide';

/** Soft guide category. Free text on the DB side; these are the known values. */
export type Profession = 'cleaner' | 'delivery' | 'tradie' | 'geral';
export const PROFESSIONS: Profession[] = ['cleaner', 'delivery', 'tradie', 'geral'];
export const PROFESSION_LABEL: Record<Profession, string> = {
  cleaner: 'Cleaner',
  delivery: 'Entregador',
  tradie: 'Tradie',
  geral: 'Geral',
};

export interface ReviewFinding {
  severity: 'HIGH' | 'MED' | 'LOW';
  text: string;
}

export interface ReviewLang {
  verdict: 'PASS' | 'NEEDS_WORK';
  findings: ReviewFinding[];
}

async function blogApi<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada — entre de novo.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 60000);
  try {
    const reqInit: RequestInit = {
      method: init.method ?? 'GET',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    };
    if (init.body !== undefined) {
      reqInit.body = JSON.stringify(init.body);
    }
    const res = await fetch(`${BASE}/${path}`, reqInit);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Tempo esgotado — tenta de novo (a IA grátis às vezes está cheia).');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export interface PublishedPost {
  slug: string;
  title: string;
  /** 'post' → ozly.au/blog/… · 'guide' → ozly.au/guias/…. Defaults to 'post'. */
  kind?: PostKind;
}

export function fetchTopics() {
  return blogApi<{ topics: BlogTopic[]; published?: PublishedPost[] }>('topics');
}

/**
 * Ask the AI for fresh topic ideas. `avoid` = titles already on screen so
 * clicking "suggest more" repeatedly yields genuinely new subjects instead of
 * looping on the same popular ones.
 */
export function suggestMoreTopics(audience?: 'business' | 'consumer', avoid: string[] = []) {
  const body: { audience?: 'business' | 'consumer'; avoid?: string[] } = {};
  if (audience) body.audience = audience;
  if (avoid.length) body.avoid = avoid;
  return blogApi<{ topics: BlogTopic[] }>('suggest-topics', {
    method: 'POST',
    body,
    timeoutMs: 90000,
  });
}

/**
 * Generate a draft (EN/PT/ES) with Workers AI.
 *
 * Default (`kind` omitted / 'post') = the unchanged blog-post path. Pass
 * `kind: 'guide'` (+ optional profession/feature) to hit the worker's GUIDE
 * prompt instead — a practical step-by-step how-to for /guias. The response
 * shape is identical (slug + en/pt/es), so the editor handles both the same.
 */
/**
 * GUIDE topics for a profession (curated per-profession list + an AI variant),
 * for the /guias funnel. Mirrors suggestMoreTopics but on the guide path.
 * `avoid` = titles already on screen so repeats are filtered out.
 */
export function suggestGuideTopics(profession: Profession, avoid: string[] = []) {
  const body: { kind: 'guide'; profession: Profession; avoid?: string[] } = {
    kind: 'guide',
    profession,
  };
  if (avoid.length) body.avoid = avoid;
  return blogApi<{ topics: GuideTopic[] }>('suggest-topics', {
    method: 'POST',
    body,
    timeoutMs: 90000,
  });
}

export function generatePost(
  topic: string,
  slug?: string,
  opts: { kind?: PostKind; profession?: Profession; feature?: string | null } = {},
) {
  const body: {
    topic: string;
    slug?: string;
    kind?: PostKind;
    profession?: Profession;
    feature?: string;
  } = { topic };
  if (slug) body.slug = slug;
  if (opts.kind === 'guide') {
    body.kind = 'guide';
    body.profession = opts.profession ?? 'geral';
    const feature = opts.feature?.trim();
    if (feature) body.feature = feature;
  }
  return blogApi<BlogPost>('generate', {
    method: 'POST',
    body,
    timeoutMs: 115000,
  });
}

export function applyFix(lang: LangCode, draft: BlogLang, finding: string) {
  return blogApi<BlogLang>('apply-fix', {
    method: 'POST',
    body: { lang, title: draft.title, description: draft.description, body: draft.body, finding },
    timeoutMs: 90000,
  });
}

export function reviewPost(post: BlogPost) {
  return blogApi<Record<LangCode, ReviewLang>>('review', {
    method: 'POST',
    body: { en: post.en, pt: post.pt, es: post.es },
    timeoutMs: 115000,
  });
}

/**
 * Publish = upsert straight into the Supabase `blog_posts` table (source of
 * truth). The worker SSRs the blog from there, so the post is live instantly —
 * no PR, no build. RLS (is_admin) authorises the write via the admin session.
 */
export async function publishPost(post: BlogPost, draft: boolean) {
  const hasContent = (g?: BlogLang) => Boolean(g && g.title?.trim());
  const kind: PostKind = post.kind === 'guide' ? 'guide' : 'post';
  const row = {
    slug: post.slug,
    draft,
    en: hasContent(post.en) ? post.en : null,
    pt: hasContent(post.pt) ? post.pt : null,
    es: hasContent(post.es) ? post.es : null,
    // Discriminator + guide metadata. Posts always reset guide fields to null so
    // switching kind can't leave stale profession/feature behind.
    kind,
    profession: kind === 'guide' ? (post.profession ?? null) : null,
    feature: kind === 'guide' ? (post.feature?.trim() || null) : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('blog_posts').upsert(row, { onConflict: 'slug' });
  if (error) throw new Error(error.message);
  return { ok: true as const, committed: [post.slug] };
}

/**
 * Load an already-published post back into the editor so it can be revised and
 * re-published (upsert on the same slug). Reads the full row straight from
 * Supabase (RLS is_admin authorises it), same source of truth the worker SSRs.
 */
export async function fetchPost(slug: string): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, en, pt, es, kind, profession, feature')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Post não encontrado (pode ter sido removido).');

  const empty: BlogLang = { title: '', description: '', body: '' };
  const lang = (g: unknown): BlogLang => {
    const v = (g ?? {}) as Partial<BlogLang>;
    return {
      title: v.title ?? '',
      description: v.description ?? '',
      body: v.body ?? '',
    };
  };
  const kind: PostKind = data.kind === 'guide' ? 'guide' : 'post';
  return {
    slug: data.slug,
    en: data.en ? lang(data.en) : empty,
    pt: data.pt ? lang(data.pt) : empty,
    es: data.es ? lang(data.es) : empty,
    kind,
    profession: kind === 'guide' ? ((data.profession as Profession | null) ?? 'geral') : null,
    feature: kind === 'guide' ? ((data.feature as string | null) ?? null) : null,
  };
}

/** Delete a post from the blog (admin only, via RLS). */
export async function deletePost(slug: string) {
  const { error } = await supabase.from('blog_posts').delete().eq('slug', slug);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
