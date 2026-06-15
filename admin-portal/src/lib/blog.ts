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
}

export type LangCode = 'en' | 'pt' | 'es';

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

export function fetchTopics() {
  return blogApi<{ topics: BlogTopic[] }>('topics');
}

export function suggestMoreTopics() {
  return blogApi<{ topics: BlogTopic[] }>('suggest-topics', { method: 'POST', timeoutMs: 90000 });
}

export function generatePost(topic: string, slug?: string) {
  return blogApi<BlogPost>('generate', {
    method: 'POST',
    body: { topic, slug },
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

export function publishPost(post: BlogPost, draft: boolean) {
  return blogApi<{ ok: true; committed: string[] }>('publish', {
    method: 'POST',
    body: { slug: post.slug, draft, en: post.en, pt: post.pt, es: post.es },
    timeoutMs: 60000,
  });
}
