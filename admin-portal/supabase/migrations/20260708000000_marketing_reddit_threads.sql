-- Migration: marketing_reddit_threads
--
-- Guarda as threads do Reddit descobertas pelo radar (feature de marketing orgânico).
-- Só a edge function `reddit-radar` (service role) lê/grava aqui — a UI passa por ela,
-- nunca toca a tabela direto. Por isso RLS ligado SEM policies: nega tudo por padrão,
-- e o service role (usado só dentro da edge function, atrás do gate is_admin) bypassa RLS.
-- Mesmo padrão das tabelas de auditoria do portal.

create table if not exists public.marketing_reddit_threads (
  reddit_id         text primary key,          -- id do post no Reddit (ex: "t3_abc123")
  subreddit         text not null,
  title             text not null,
  selftext          text default '',
  permalink         text not null,             -- URL completa pro thread
  num_comments      int  not null default 0,
  created_utc       timestamptz not null,      -- quando o post foi criado no Reddit
  archetype         text not null default 'general',
  mention_ozly      boolean not null default false,
  suggested_comment text not null default '',
  relevance         int  not null default 0,
  status            text not null default 'new'
                    check (status in ('new', 'commented', 'dismissed')),
  discovered_at     timestamptz not null default now(),  -- quando o radar achou
  updated_at        timestamptz not null default now()
);

-- Listagem: fresco primeiro, tool-request no topo.
create index if not exists idx_reddit_threads_feed
  on public.marketing_reddit_threads (status, created_utc desc);

alter table public.marketing_reddit_threads enable row level security;
-- Sem policies de propósito: só service role (dentro da edge function) acessa.
