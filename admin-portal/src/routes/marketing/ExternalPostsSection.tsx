import { useEffect, useState } from 'react';
import { Card, Text, Title, Badge } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { ExternalLinkIcon } from '@/components/Icons';
import { fetchRecentVideos, isYoutubeConfigured, formatYtDuration, type YtVideoSummary } from '@/lib/youtube';
import type { MarketingChannel } from '@/lib/marketing';

/**
 * Mostra publicações REAIS já postadas em cada canal (independente do
 * marketing portal). Hoje só YT está plugado (key + channel ID); IG/FB/TT
 * vão chegar quando Meta token / TikTok aprovação saírem.
 *
 * Filtra pelo `channelFilter` da Publicações se selecionado.
 */
interface Props {
  /** Filtro vindo do controle pai. '' = todos. */
  channelFilter: '' | MarketingChannel;
}

interface ExternalRow {
  channel: MarketingChannel;
  channelLabel: string;
  channelIcon: string;
  id: string;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  url: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  duration: string | null;
}

function formatNumber(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

export function ExternalPostsSection({ channelFilter }: Props) {
  const [rows, setRows] = useState<ExternalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChannels, setPendingChannels] = useState<MarketingChannel[]>([]);

  // Skip fetch when filter excludes external-capable channels.
  const skipExternal =
    channelFilter !== '' && !['org_youtube', 'org_instagram', 'org_facebook', 'org_tiktok'].includes(channelFilter);

  useEffect(() => {
    if (skipExternal) {
      setRows([]);
      setPendingChannels([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const collected: ExternalRow[] = [];
    const pending: MarketingChannel[] = [];

    async function run() {
      // YouTube
      if (channelFilter === '' || channelFilter === 'org_youtube') {
        if (isYoutubeConfigured()) {
          const ytItems: YtVideoSummary[] = await fetchRecentVideos(15);
          for (const v of ytItems) {
            collected.push({
              channel: 'org_youtube',
              channelLabel: 'YouTube',
              channelIcon: '▶️',
              id: v.videoId,
              title: v.title,
              publishedAt: v.publishedAt,
              thumbnailUrl: v.thumbnailUrl,
              url: v.url,
              views: v.views,
              likes: v.likes,
              comments: v.comments,
              duration: v.duration ? formatYtDuration(v.duration) : null,
            });
          }
        } else {
          pending.push('org_youtube');
        }
      }

      // IG / FB / TT — Meta+TikTok APIs ainda não plugadas pra listar posts.
      // Quando os tokens chegarem, adicionar fetchers similares aqui.
      if (channelFilter === '' || channelFilter === 'org_instagram') pending.push('org_instagram');
      if (channelFilter === '' || channelFilter === 'org_facebook')  pending.push('org_facebook');
      if (channelFilter === '' || channelFilter === 'org_tiktok')    pending.push('org_tiktok');

      if (!alive) return;
      // Sort newest first.
      collected.sort((a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      });
      setRows(collected);
      setPendingChannels([...new Set(pending)]);
      setLoading(false);
    }
    void run();
    return () => {
      alive = false;
    };
  }, [channelFilter, skipExternal]);

  if (skipExternal) return null;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <Title>Publicações reais nos canais</Title>
          <Text className="mt-1 text-xs text-navy-300">
            O que já está no ar em cada rede — independente do marketing portal.
            Usado pra acompanhar performance pós-publicação.
          </Text>
        </div>
        {pendingChannels.length > 0 && (
          <Badge color="amber" size="xs">
            {pendingChannels.length} canal pendente
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-400">
          Nenhuma publicação encontrada nos canais conectados.
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li
              key={`${r.channel}:${r.id}`}
              className="rounded-lg border border-navy-100 bg-white overflow-hidden hover:border-brand-300 transition-colors"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {r.thumbnailUrl ? (
                  <div className="relative aspect-video bg-navy-50 overflow-hidden">
                    <img
                      src={r.thumbnailUrl}
                      alt={r.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                    {r.duration && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">
                        {r.duration}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-navy-50/40 flex items-center justify-center text-3xl">
                    {r.channelIcon}
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs">{r.channelIcon}</span>
                    <span className="text-[10px] uppercase tracking-wide text-navy-400">
                      {r.channelLabel}
                    </span>
                    <span className="ml-auto text-[10px] text-navy-400">
                      {relativeTime(r.publishedAt)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-navy-700 line-clamp-2">
                    {r.title}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-navy-500">
                    {r.views !== null && <span>👁 {formatNumber(r.views)}</span>}
                    {r.likes !== null && <span>👍 {formatNumber(r.likes)}</span>}
                    {r.comments !== null && <span>💬 {formatNumber(r.comments)}</span>}
                    <span className="ml-auto inline-flex items-center gap-0.5 text-brand-600">
                      Abrir <ExternalLinkIcon className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      {pendingChannels.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-800">
          <strong>Canais pendentes de integração:</strong>{' '}
          {pendingChannels.map((c) => c.replace('org_', '')).join(', ')}.
          Configure tokens em /team ou nas próprias páginas dos canais.
        </div>
      )}
    </Card>
  );
}
