import { useCallback, useEffect, useState } from 'react';
import { Card, Grid, Text, Title } from '@tremor/react';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { Collapsible } from '@/components/Collapsible';
import { useToast } from '@/components/Toast';
import {
  clearTiktokStatsCache,
  fetchTiktokStats,
  type TiktokProfileStats,
  type TiktokVideo,
} from '@/lib/tiktok';
import { startTiktokConnect, subscribeOauthEvents } from '@/lib/tiktokConnect';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * Self-contained TikTok card for Growth → Organic.
 *
 * Owns the full lifecycle: connect / reconnect (popup OAuth), stats fetch,
 * scope-degradation warnings, recent videos. All inline so the admin never
 * has to leave this dropdown to wire up TikTok.
 *
 * States rendered:
 *   - not connected → big "Conectar TikTok" CTA
 *   - connected, stale scopes → KPIs + amber "Reconectar" badge
 *   - connected fully → KPIs + bio + 6 recent videos
 */
export function TiktokCard() {
  return (
    <Collapsible
      icon="🎵"
      title="TikTok"
      subtitle="Profile KPIs · followers, likes, recent videos"
    >
      <TiktokCardContent />
    </Collapsible>
  );
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'connected'; data: TiktokProfileStats }
  | { kind: 'not_connected' }
  | { kind: 'error'; message: string };

function TiktokCardContent() {
  const { toast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) clearTiktokStatsCache();
    setState({ kind: 'loading' });
    const r = await fetchTiktokStats({ force });
    if (r.kind === 'connected') setState({ kind: 'connected', data: r.data });
    else if (r.kind === 'not_connected') setState({ kind: 'not_connected' });
    else setState({ kind: 'error', message: r.message });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh when the OAuth popup signals success.
  useEffect(() => {
    return subscribeOauthEvents((e) => {
      if (e.provider !== 'tiktok') return;
      if (e.type === 'oauth_connected') {
        toast({
          variant: 'success',
          title: 'TikTok conectado',
          description: 'Carregando KPIs…',
        });
        void load(true);
      } else {
        toast({
          variant: 'error',
          title: 'Falha ao conectar TikTok',
          description: e.desc ?? 'Tente de novo.',
        });
      }
    });
  }, [load, toast]);

  async function onConnect() {
    setConnecting(true);
    try {
      const r = await startTiktokConnect({ redirectAfter: '/ops/growth' });
      if (!r.ok) {
        toast({
          variant: 'error',
          title: 'Não consegui abrir o OAuth',
          description: r.error ?? 'Unknown',
        });
      }
    } finally {
      setConnecting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-navy-400">
        <Spinner size="sm" />
        Carregando TikTok…
      </div>
    );
  }

  if (state.kind === 'not_connected') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="text-4xl">🎵</div>
          <div>
            <Title className="!text-base">Conecte o TikTok</Title>
            <Text className="mt-1 text-xs text-navy-300">
              Autorize a app pra puxar followers, likes, vídeos recentes e
              publicar pelo Ozly. Em sandbox, só users cadastrados como
              testers conseguem conectar.
            </Text>
          </div>
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={connecting}
            className="mt-1 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {connecting ? 'Abrindo…' : '🎵 Conectar TikTok'}
          </button>
        </div>
      </Card>
    );
  }

  if (state.kind === 'error') {
    return (
      <Card>
        <Text className="text-sm text-rose-500">Erro: {state.message}</Text>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:border-brand-300"
          >
            Tentar de novo
          </button>
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={connecting}
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:border-brand-300 disabled:opacity-50"
          >
            {connecting ? 'Abrindo…' : 'Reconectar'}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <ConnectedView
      data={state.data}
      onReconnect={() => void onConnect()}
      onRefresh={() => void load(true)}
      connecting={connecting}
    />
  );
}

function ConnectedView({
  data,
  onReconnect,
  onRefresh,
  connecting,
}: {
  data: TiktokProfileStats;
  onReconnect: () => void;
  onRefresh: () => void;
  connecting: boolean;
}) {
  const profileUrl =
    data.profile_deep_link ??
    (data.username ? `https://www.tiktok.com/@${data.username}` : 'https://www.tiktok.com');

  const missingProfileScope =
    data.follower_count === null && data.likes_count === null;
  const missingVideoListScope = data.videos === null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {data.avatar_url && (
            <img
              src={data.avatar_url}
              alt={data.display_name ?? 'TikTok profile'}
              className="h-12 w-12 rounded-full border border-navy-50"
            />
          )}
          <div>
            <Title>
              <span className="mr-1.5 text-xl">🎵</span>
              {data.display_name ?? 'TikTok'}
              {data.is_verified && (
                <span className="ml-1.5 text-sm text-brand-600" title="Verified">
                  ✔
                </span>
              )}
            </Title>
            <Text className="text-xs text-navy-300">
              {data.username ? `@${data.username}` : 'Profile'}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
            title="Atualizar"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onReconnect}
            disabled={connecting}
            className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            {connecting ? 'Abrindo…' : 'Reconectar'}
          </button>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
          >
            Open
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </div>

      {(missingProfileScope || missingVideoListScope) && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/40 p-2.5 text-xs text-amber-800">
          ⚠️ Conexão tem scopes limitados.
          {missingProfileScope && ' KPIs (followers, likes) indisponíveis.'}
          {missingVideoListScope && ' Lista de vídeos indisponível.'}
          {' '}
          <button
            type="button"
            onClick={onReconnect}
            disabled={connecting}
            className="font-semibold underline disabled:opacity-50"
          >
            Reconectar
          </button>{' '}
          autorizando todos os scopes.
        </div>
      )}

      <Grid numItemsSm={2} numItemsMd={4} className="mt-4 gap-3">
        <KpiTile label="Followers" value={data.follower_count} primary />
        <KpiTile label="Following" value={data.following_count} />
        <KpiTile label="Total likes" value={data.likes_count} />
        <KpiTile label="Videos" value={data.video_count} />
      </Grid>

      {data.bio_description && (
        <Text className="mt-4 text-xs text-navy-400">
          <span className="font-medium uppercase tracking-wide text-navy-300">Bio</span> ·{' '}
          {data.bio_description}
        </Text>
      )}

      <div className="mt-5">
        <Text className="text-xs font-medium uppercase tracking-wide text-navy-400">
          Recent videos
        </Text>
        {missingVideoListScope ? (
          <div className="mt-2 rounded-md border border-dashed border-amber-200 bg-amber-50/30 p-3 text-xs text-amber-800">
            Reconecte autorizando <code>video.list</code> pra listar os vídeos
            aqui{data.videos_error ? ` (last error: ${data.videos_error})` : ''}.
          </div>
        ) : (data.videos ?? []).length === 0 ? (
          <div className="mt-2 flex h-28 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
            Nenhum vídeo público ainda.
          </div>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(data.videos ?? []).map((v, i) => (
              <VideoTile key={v.id ?? i} v={v} />
            ))}
          </ul>
        )}
      </div>

      <Text className="mt-4 text-[11px] text-navy-300">
        💡 Em sandbox, a TikTok API só retorna dados do próprio dono da app +
        testers cadastrados. Após App Review, qualquer conta conecta normal.
      </Text>
    </Card>
  );
}

function VideoTile({ v }: { v: TiktokVideo }) {
  const url = v.share_url ?? v.embed_link ?? '#';
  const published = v.create_time ? new Date(v.create_time * 1000).toISOString() : null;
  const dur = v.duration ? formatDuration(v.duration) : null;
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col rounded-md border border-navy-50 bg-white p-2 transition-colors hover:border-brand-300"
      >
        {v.cover_image_url ? (
          <div className="relative">
            <img
              src={v.cover_image_url}
              alt=""
              className="h-20 w-full rounded object-cover"
            />
            {dur && (
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                {dur}
              </span>
            )}
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded bg-navy-50/60 text-2xl">
            🎵
          </div>
        )}
        <div className="mt-1.5 line-clamp-2 text-xs font-medium text-navy-700 group-hover:text-brand-700">
          {v.title || v.video_description || '(sem título)'}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-navy-300">
          <span>{formatNumber(v.view_count ?? 0)} views</span>
          <span>{published ? formatRelativeTime(published) : '—'}</span>
        </div>
      </a>
    </li>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function KpiTile({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: number | null | undefined;
  primary?: boolean;
}) {
  return (
    <div className="rounded-md border border-navy-50 bg-navy-50/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold ${primary ? 'text-brand-700' : 'text-navy-700'}`}
      >
        {value === null || value === undefined ? '—' : formatNumber(value)}
      </div>
    </div>
  );
}
