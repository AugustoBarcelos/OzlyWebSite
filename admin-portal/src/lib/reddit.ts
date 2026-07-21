/**
 * Cliente do radar de Reddit (marketing orgânico).
 *
 * Toda a lógica pesada (OAuth no Reddit, busca, classificação) vive na edge
 * function `reddit-radar` — aqui só chamamos ela com o JWT do admin via callEdge.
 * A UI nunca toca a tabela direto.
 */

import { callEdge } from './edge';

export type RedditArchetype =
  | 'tool-request'
  | 'tax-set-aside'
  | 'first-invoice'
  | 'whv-tax'
  | 'new-abn'
  | 'general';

export type RedditThreadStatus = 'new' | 'commented' | 'dismissed';

export interface RedditThread {
  reddit_id: string;
  subreddit: string;
  title: string;
  selftext: string;
  permalink: string;
  num_comments: number;
  created_utc: string;
  archetype: RedditArchetype;
  mention_ozly: boolean;
  suggested_comment: string;
  relevance: number;
  status: RedditThreadStatus;
  discovered_at: string;
  updated_at: string;
}

export interface RedditListResult {
  threads: RedditThread[];
  last_discovered_at: string | null;
}

export interface RedditRefreshResult {
  configured: boolean; // false = faltam os secrets REDDIT_CLIENT_ID/SECRET
  inserted: number;
}

/** Threads guardadas (tool-request e mais relevantes primeiro). */
export async function listThreads(): Promise<RedditListResult> {
  const res = await callEdge<RedditListResult>('reddit-radar', {
    query: { op: 'list' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

/** Vai no Reddit, acha novas, grava. Devolve quantas entraram. */
export async function refreshThreads(): Promise<RedditRefreshResult> {
  const res = await callEdge<RedditRefreshResult>('reddit-radar', {
    method: 'POST',
    query: { op: 'refresh' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

/** Marca uma thread como comentada ou ignorada (some da lista). */
export async function setThreadStatus(
  reddit_id: string,
  status: RedditThreadStatus,
): Promise<void> {
  const res = await callEdge<{ ok: true }>('reddit-radar', {
    method: 'POST',
    query: { op: 'set_status' },
    body: { reddit_id, status },
  });
  if (!res.ok) throw new Error(res.error);
}

/** Label PT + cor do badge por arquétipo. */
export function archetypeMeta(a: RedditArchetype): { label: string; color: string } {
  switch (a) {
    case 'tool-request':
      return { label: 'Pediram app', color: 'emerald' };
    case 'tax-set-aside':
      return { label: 'Quanto guardar', color: 'blue' };
    case 'first-invoice':
      return { label: 'Primeira invoice', color: 'blue' };
    case 'whv-tax':
      return { label: 'WHV / imposto', color: 'blue' };
    case 'new-abn':
      return { label: 'Novo no ABN', color: 'blue' };
    default:
      return { label: 'Geral', color: 'gray' };
  }
}
