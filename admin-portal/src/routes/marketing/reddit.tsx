import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, Text, Title } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { ExternalLinkIcon } from '@/components/Icons';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  archetypeMeta,
  listThreads,
  refreshThreads,
  setThreadStatus,
  type RedditThread,
} from '@/lib/reddit';

/**
 * /marketing/reddit — radar de divulgação orgânica no Reddit.
 *
 * Acha threads frescas onde a Ozly encaixa e sugere um comentário JÁ dentro das
 * regras (sem link; Ozly só quando o thread pede app). NÃO posta: você abre o
 * link, copia o comentário sugerido, ajusta se quiser e cola no Reddit na mão.
 *
 * Toda a busca/OAuth vive na edge function `reddit-radar`. Ao abrir a página ela
 * lista o que já foi descoberto; se estiver velho (>12h) ou vazio, atualiza sozinha.
 */

const STALE_MS = 12 * 60 * 60 * 1000;

export function MarketingRedditPage() {
  const { toast } = useToast();
  const [threads, setThreads] = useState<RedditThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [lastDiscovered, setLastDiscovered] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { threads: rows, last_discovered_at } = await listThreads();
      setThreads(rows);
      setLastDiscovered(last_discovered_at);
      return { rows, last_discovered_at };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar');
      return { rows: [] as RedditThread[], last_discovered_at: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await refreshThreads();
      if (!res.configured) {
        setNotConfigured(true);
        return;
      }
      setNotConfigured(false);
      toast({
        title:
          res.inserted > 0
            ? `${res.inserted} thread(s) nova(s)`
            : 'Nada novo agora',
        variant: 'success',
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao atualizar');
    } finally {
      setRefreshing(false);
    }
  }, [load, toast]);

  // Ao abrir: lista o guardado; se vazio ou velho, atualiza sozinho uma vez.
  useEffect(() => {
    let done = false;
    void (async () => {
      const { rows, last_discovered_at } = await load();
      if (done) return;
      const stale =
        !last_discovered_at ||
        Date.now() - new Date(last_discovered_at).getTime() > STALE_MS;
      if (rows.length === 0 || stale) void refresh();
    })();
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mark = useCallback(
    async (t: RedditThread, status: 'commented' | 'dismissed') => {
      setThreads((prev) => prev.filter((x) => x.reddit_id !== t.reddit_id));
      try {
        await setThreadStatus(t.reddit_id, status);
        toast({
          title: status === 'commented' ? 'Marcado: comentei' : 'Ignorado',
          variant: 'success',
        });
      } catch (e) {
        const description = e instanceof Error ? e.message : undefined;
        toast({
          title: 'Não deu pra salvar',
          ...(description ? { description } : {}),
          variant: 'error',
        });
        void load();
      }
    },
    [load, toast],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Comentário copiado', variant: 'success' });
      } catch {
        toast({ title: 'Não consegui copiar', variant: 'error' });
      }
    },
    [toast],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title>Reddit — radar orgânico</Title>
          <Text className="text-xs text-navy-400">
            Threads onde a Ozly encaixa + comentário sugerido. Abre, copia,
            ajusta e cola no Reddit — o radar não posta nada.
            {lastDiscovered && (
              <> {' · '}atualizado {formatRelativeTime(lastDiscovered)}</>
            )}
          </Text>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 shadow-sm transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          {refreshing ? <Spinner size="sm" /> : null}
          Atualizar agora
        </button>
      </div>

      {/* Setup banner — faltam os secrets do Reddit */}
      {notConfigured && (
        <div
          role="status"
          className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p>
            <strong className="font-semibold">Falta plugar a API do Reddit.</strong>{' '}
            O Reddit exige app oficial pra ler sem login. É grátis, ~2 min:
          </p>
          <ol className="ml-4 list-decimal space-y-1 text-xs">
            <li>
              <a
                href="https://www.reddit.com/prefs/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                reddit.com/prefs/apps
              </a>{' '}
              → <em>create another app</em> → tipo <strong>script</strong> ·
              redirect uri <code className="rounded bg-amber-100 px-1">http://localhost:8080</code>
            </li>
            <li>Copia o <strong>client_id</strong> (embaixo do nome) e o <strong>secret</strong></li>
            <li>
              No projeto Supabase, seta os secrets e faz redeploy da function:
              <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-[11px] leading-relaxed">
{`supabase secrets set REDDIT_CLIENT_ID=xxxx REDDIT_CLIENT_SECRET=yyyy \\
  REDDIT_USER_AGENT="cloud:ozly-radar:1.0 (by /u/SEU_USER)"`}
              </pre>
            </li>
          </ol>
        </div>
      )}

      {/* Lembrete das regras */}
      <div className="rounded-md border border-navy-100 bg-navy-50/60 px-4 py-2 text-xs text-navy-500">
        <strong className="text-navy-600">Regra 9:1</strong> — a maioria dos
        comentários é <span className="text-navy-600">valor puro (não cite Ozly)</span>.
        Só cite em thread marcada <Badge color="emerald" size="xs">Pediram app</Badge>,
        com disclosure e <strong>sem link</strong>. Chegue cedo (thread nova, poucos comentários).
      </div>

      {/* Erro */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {/* Lista */}
      {loading && threads.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 w-full animate-pulse rounded-lg bg-navy-50" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-navy-100 bg-navy-50 text-sm text-navy-400">
          <span>Nada novo agora.</span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="rounded-md border border-navy-200 bg-white px-3 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-60"
          >
            Atualizar agora
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((t) => {
            const meta = archetypeMeta(t.archetype);
            return (
              <Card key={t.reddit_id} className="space-y-3">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={meta.color} size="xs">{meta.label}</Badge>
                  {t.mention_ozly ? (
                    <Badge color="emerald" size="xs">✅ Pode citar Ozly (sem link)</Badge>
                  ) : (
                    <Badge color="amber" size="xs">🚫 Valor puro — não cite Ozly</Badge>
                  )}
                  <span className="ml-auto text-xs text-navy-400 tabular-nums">
                    relevância {t.relevance}
                  </span>
                </div>

                {/* Título + link */}
                <a
                  href={t.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-1.5 font-medium text-navy-800 hover:text-brand-600"
                >
                  <span>{t.title}</span>
                  <ExternalLinkIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-navy-300 group-hover:text-brand-500" />
                </a>

                <Text className="text-xs text-navy-400">
                  r/{t.subreddit} · {formatRelativeTime(t.created_utc)} ·{' '}
                  {t.num_comments} comentário{t.num_comments === 1 ? '' : 's'}
                </Text>

                {t.selftext && (
                  <Text className="line-clamp-3 text-sm text-navy-500">
                    {t.selftext}
                  </Text>
                )}

                {/* Comentário sugerido */}
                <div className="rounded-md border border-navy-100 bg-navy-50/60 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                      Comentário sugerido
                    </span>
                    <button
                      type="button"
                      onClick={() => void copy(t.suggested_comment)}
                      className="rounded border border-brand-200 bg-white px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-navy-700">
                    {t.suggested_comment}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={t.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-navy-200 bg-white px-3 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50"
                  >
                    Abrir no Reddit
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void mark(t, 'commented')}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    Comentei ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => void mark(t, 'dismissed')}
                    className="rounded-md border border-navy-200 bg-white px-3 py-1 text-xs font-medium text-navy-500 hover:bg-navy-50"
                  >
                    Ignorar ✕
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
