import { useEffect, useState } from 'react';
import { Card, Grid, Text, Title } from '@tremor/react';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { Collapsible } from '@/components/Collapsible';
import { fetchTiktokStats, type TiktokProfileStats, type TiktokVideo } from '@/lib/tiktok';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * TikTok profile summary — KPIs for the connected admin's TikTok account.
 *
 * Source: `tiktok-stats` edge fn → /v2/user/info/. We render four KPIs
 * (followers, following, total likes, video count). Recent-videos list is
 * intentionally omitted: our OAuth scope set doesn't include `video.list`,
 * so /v2/video/list/ would 403. Adding it later means re-auth.
 *
 * Lazy fetch (Collapsible only mounts content on open) so the card doesn't
 * hit the edge fn unless the admin actually expands it.
 */
export function TiktokCard() {
  return (
    <Collapsible
      icon="🎵"
      title="TikTok"
      subtitle="Profile KPIs · followers, likes, videos"
    >
      <TiktokCardContent />
    </Collapsible>
  );
}

function TiktokCardContent() {
  const [stats, setStats] = useState<TiktokProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const r = await fetchTiktokStats();
      if (!alive) return;
      if (r.kind === 'connected') {
        setStats(r.data);
        setErrMsg(null);
      } else if (r.kind === 'not_connected') {
        setErrMsg('not_connected');
      } else {
        setErrMsg(r.message);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (errMsg === 'not_connected') {
    return (
      <Card>
        <Text className="text-sm text-navy-400">
          TikTok não está conectado. Vá em{' '}
          <a href="/ops/marketing" className="text-brand-700 underline">
            Marketing → Connections
          </a>{' '}
          e clique em "Conectar TikTok".
        </Text>
      </Card>
    );
  }

  const profileUrl =
    stats?.profile_deep_link ??
    (stats?.username ? `https://www.tiktok.com/@${stats.username}` : 'https://www.tiktok.com');

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {stats?.avatar_url && (
            <img
              src={stats.avatar_url}
              alt={stats.display_name ?? 'TikTok profile'}
              className="h-12 w-12 rounded-full border border-navy-50"
            />
          )}
          <div>
            <Title>
              <span className="mr-1.5 text-xl">🎵</span>
              {stats?.display_name ?? 'TikTok'}
              {stats?.is_verified && (
                <span className="ml-1.5 text-sm text-brand-600" title="Verified">
                  ✔
                </span>
              )}
            </Title>
            <Text className="text-xs text-navy-300">
              {stats?.username ? `@${stats.username}` : 'Profile'}
              {stats?.scope && (
                <>
                  {' '}· scopes: <span className="font-mono text-[10px]">{stats.scope}</span>
                </>
              )}
            </Text>
          </div>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          Open profile
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>

      <Grid numItemsSm={2} numItemsMd={4} className="mt-4 gap-3">
        <KpiTile label="Followers" value={stats?.follower_count} loading={loading && !stats} primary />
        <KpiTile label="Following" value={stats?.following_count} loading={loading && !stats} />
        <KpiTile label="Total likes" value={stats?.likes_count} loading={loading && !stats} />
        <KpiTile label="Videos" value={stats?.video_count} loading={loading && !stats} />
      </Grid>

      {stats?.bio_description && (
        <Text className="mt-4 text-xs text-navy-400">
          <span className="font-medium uppercase tracking-wide text-navy-300">Bio</span> ·{' '}
          {stats.bio_description}
        </Text>
      )}

      <div className="mt-5">
        <Text className="text-xs font-medium uppercase tracking-wide text-navy-400">
          Recent videos
        </Text>
        {loading && !stats ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-md bg-navy-50/60" />
            ))}
          </div>
        ) : stats?.videos === null ? (
          <div className="mt-2 rounded-md border border-dashed border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-800">
            ⚠️ Lista de vídeos indisponível
            {stats?.videos_error ? ` (${stats.videos_error})` : ''}. Reconecte
            o TikTok pra autorizar o scope <code>video.list</code>.
          </div>
        ) : (stats?.videos ?? []).length === 0 ? (
          <div className="mt-2 flex h-28 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
            Nenhum vídeo público ainda.
          </div>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(stats?.videos ?? []).map((v) => (
              <VideoTile key={v.id ?? Math.random()} v={v} />
            ))}
          </ul>
        )}
      </div>

      {errMsg && errMsg !== 'not_connected' && (
        <Text className="mt-3 text-xs text-rose-500">Erro: {errMsg}</Text>
      )}

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-navy-400">
          <Spinner size="sm" />
          Loading TikTok…
        </div>
      )}

      <Text className="mt-4 text-[11px] text-navy-300">
        💡 Em sandbox, a TikTok API só retorna dados do próprio dono da app +
        testers cadastrados. Em produção (após App Review) os dados de
        qualquer usuário conectado aparecem.
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
  loading,
  primary = false,
}: {
  label: string;
  value: number | null | undefined;
  loading: boolean;
  primary?: boolean;
}) {
  return (
    <div className="rounded-md border border-navy-50 bg-navy-50/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
        {label}
      </div>
      {loading ? (
        <div className="mt-1 h-7 w-20 animate-pulse rounded bg-navy-100/60" />
      ) : (
        <div
          className={`mt-1 text-2xl font-semibold ${primary ? 'text-brand-700' : 'text-navy-700'}`}
        >
          {value === null || value === undefined ? '—' : formatNumber(value)}
        </div>
      )}
    </div>
  );
}
