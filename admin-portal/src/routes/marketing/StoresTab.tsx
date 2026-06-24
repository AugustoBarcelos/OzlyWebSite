import { useEffect, useState } from 'react';
import { Card, Grid, Text, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { fetchAppInfo, fetchReviews, type ItunesAppInfo, type ItunesReview } from '@/lib/itunes';
import { callRpc } from '@/lib/rpc';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * Stores tab — App Store (Apple) e Google Play (Android), SEPARADOS, com todos
 * os números disponíveis por loja.
 *
 * Apple: iTunes Search + Reviews RSS (rating/reviews reais, sem downloads —
 *   a Apple não expõe downloads em API pública).
 * Android: Play não tem API pública de rating/downloads sem Play Console API,
 *   então mostramos os números PRÓPRIOS (usuários/installs por plataforma e
 *   versão, do nosso banco) e linkamos a listagem.
 *
 * "Downloads" do nosso lado = perfis novos no período por last_seen_platform
 *   (proxy de installs — não é o número bruto da loja).
 */

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.augusto.ozly';
const APPLE_APP_ID = '6760398649';

const PERIODS = [
  { d: 1, label: '24h' },
  { d: 7, label: '7d' },
  { d: 30, label: '30d' },
  { d: 90, label: '90d' },
  { d: 365, label: '365d' },
] as const;

interface PlatformDownloads {
  period_days: number;
  ios: number;
  android: number;
  unknown: number;
  total: number;
  generated_at: string;
}

interface VersionRow {
  app_version: string;
  platform: string;
  count: number;
}
interface VersionResp {
  period_days: number;
  rows: VersionRow[];
  total: number;
}

const IOS_PLATFORMS = new Set(['ios', 'app_store']);
const ANDROID_PLATFORMS = new Set(['android', 'play_store']);

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-navy-300">—</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('★');
    else if (i === full && half) stars.push('⯨');
    else stars.push('☆');
  }
  return (
    <span className="font-mono text-sm text-amber-500" title={`${rating.toFixed(2)} of 5`}>
      {stars.join('')}
    </span>
  );
}

export function StoresTab() {
  const [period, setPeriod] = useState<number>(90);
  const [info, setInfo] = useState<ItunesAppInfo | null>(null);
  const [reviews, setReviews] = useState<ItunesReview[] | null>(null);
  const [dl, setDl] = useState<PlatformDownloads | null>(null);
  const [versions, setVersions] = useState<VersionResp | null>(null);
  const [loading, setLoading] = useState(true);

  const appStoreUrl = info?.appStoreUrl ?? `https://apps.apple.com/au/app/id${APPLE_APP_ID}`;

  // Apple metadata is period-independent — fetch once.
  useEffect(() => {
    let alive = true;
    void Promise.all([fetchAppInfo(), fetchReviews()]).then(([i, r]) => {
      if (!alive) return;
      setInfo(i);
      setReviews(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Our own platform/version numbers depend on the period.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.all([
      callRpc<PlatformDownloads>('admin_downloads_by_platform', { p_period_days: period }).catch(() => null),
      callRpc<VersionResp>('admin_downloads_by_app_version', { p_period_days: period, p_limit: 30 }).catch(() => null),
    ]).then(([d, v]) => {
      if (!alive) return;
      setDl(d);
      setVersions(v);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [period]);

  const iosVersions = (versions?.rows ?? []).filter((r) => IOS_PLATFORMS.has(r.platform));
  const androidVersions = (versions?.rows ?? []).filter((r) => ANDROID_PLATFORMS.has(r.platform));
  const iosShare = dl && dl.total > 0 ? dl.ios / dl.total : null;
  const androidShare = dl && dl.total > 0 ? dl.android / dl.total : null;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-navy-400">Período (installs/usuários):</span>
        <div className="inline-flex rounded-md border border-navy-100 bg-white p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.d}
              type="button"
              onClick={() => setPeriod(p.d)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                period === p.d ? 'bg-brand-500 text-white' : 'text-navy-500 hover:bg-navy-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {loading && <Spinner size="sm" />}
      </div>

      {/* ── Comparativo de plataforma ────────────────────────────────────────── */}
      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">
          Installs por loja · últimos {period}d
        </Title>
        <Text className="!text-[11px] !text-navy-400">
          Perfis novos no período por plataforma (proxy de installs — não é o número bruto da loja).
        </Text>
        <Grid numItemsSm={2} numItemsLg={4} className="mt-3 gap-3">
          <StoreStat label="🍏 Apple (iOS)" value={dl?.ios} share={iosShare} tone="navy" />
          <StoreStat label="🤖 Google Play" value={dl?.android} share={androidShare} tone="emerald" />
          <StoreStat label="❓ Desconhecido" value={dl?.unknown} share={dl && dl.total > 0 ? dl.unknown / dl.total : null} tone="slate" />
          <StoreStat label="Σ Total" value={dl?.total} share={null} tone="brand" />
        </Grid>
      </Card>

      {/* ════════════ APPLE APP STORE ════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-navy-100 pb-1.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700">
            🍏 Apple App Store
          </h2>
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Abrir listagem <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>

        <Grid numItemsSm={2} numItemsMd={3} numItemsLg={4} className="gap-3">
          <KpiHero
            label="Rating (geral)"
            value={info?.rating ?? null}
            formatter={(v) => (v === null ? '—' : `${(v as number).toFixed(2)}★`)}
            hint={info?.ratingCount ? `${formatNumber(info.ratingCount)} avaliações no total` : 'Sem avaliações ainda'}
            loading={!info}
            tone="brand"
          />
          <KpiHero
            label="Total de avaliações"
            value={info?.ratingCount ?? null}
            hint="all-time · AU"
            loading={!info}
            tone="lime"
          />
          <KpiHero
            label="Rating (versão atual)"
            value={info?.ratingCurrentVersion ?? null}
            formatter={(v) => (v === null ? '—' : `${(v as number).toFixed(2)}★`)}
            hint={
              info?.ratingCurrentVersionCount
                ? `${formatNumber(info.ratingCurrentVersionCount)} nesta versão`
                : 'Sem avaliações nesta versão'
            }
            loading={!info}
            tone="brand"
          />
          <KpiHero
            label="Versão atual"
            value={info?.version ? 1 : null}
            formatter={() => info?.version ?? '—'}
            hint={info?.currentVersionDate ? `publicada ${formatRelativeTime(info.currentVersionDate)}` : '—'}
            loading={!info}
            tone="brand"
          />
          <KpiHero
            label={`Installs iOS · ${period}d`}
            value={dl?.ios ?? null}
            hint="perfis novos no período (proxy)"
            loading={loading && !dl}
            tone="lime"
          />
          <KpiHero
            label="Tamanho do app"
            value={info?.fileSizeBytes ?? null}
            formatter={(v) => (v === null ? '—' : `${((v as number) / 1024 / 1024).toFixed(0)} MB`)}
            hint="binário iOS"
            loading={!info}
            tone="brand"
          />
          <KpiHero
            label="Idiomas"
            value={info?.languages?.length ?? null}
            hint="línguas da listagem"
            loading={!info}
            tone="brand"
          />
          <KpiHero
            label="Lançado"
            value={info?.releaseDate ? 1 : null}
            formatter={() => (info?.releaseDate ? formatRelativeTime(info.releaseDate) : '—')}
            hint="1ª publicação na App Store"
            loading={!info}
            tone="brand"
          />
        </Grid>

        <VersionTable title="Usuários iOS por versão do app" rows={iosVersions} />

        {/* Reviews */}
        <Card className="ozly-card">
          <div className="flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">Reviews recentes · AU</Title>
            <a href="/inbox/reviews" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Ver todas
            </a>
          </div>
          {!reviews ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-navy-400">
              <Spinner size="sm" /> Carregando reviews…
            </div>
          ) : reviews.length === 0 ? (
            <div className="mt-3 text-xs text-navy-300">Sem reviews ainda nessa loja.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {reviews.slice(0, 8).map((r, i) => (
                <div key={i} className="rounded-md border border-navy-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy-700">{r.title}</span>
                    <StarRating rating={r.rating} />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{r.body}</p>
                  <div className="mt-1 text-[10px] text-navy-300">
                    por {r.author} · v{r.version ?? '?'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ════════════ GOOGLE PLAY ════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-navy-100 pb-1.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy-700">
            🤖 Google Play (Android)
          </h2>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Abrir listagem <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>

        <Grid numItemsSm={2} numItemsMd={3} className="gap-3">
          <KpiHero
            label={`Installs Android · ${period}d`}
            value={dl?.android ?? null}
            hint="perfis novos no período (proxy)"
            loading={loading && !dl}
            tone="lime"
          />
          <KpiHero
            label="Share Android"
            value={androidShare}
            formatter={(v) => (v === null ? '—' : `${((v as number) * 100).toFixed(0)}%`)}
            hint="do total de installs no período"
            loading={loading && !dl}
            tone="brand"
          />
          <KpiHero
            label="Versões Android ativas"
            value={androidVersions.length || null}
            hint="versões distintas em uso"
            loading={loading && !versions}
            tone="brand"
          />
        </Grid>

        <VersionTable title="Usuários Android por versão do app" rows={androidVersions} />

        <Card className="ozly-card border-amber-100 bg-amber-50/40">
          <Title className="!text-sm !font-semibold text-navy-700">
            Rating &amp; reviews da Play Store
          </Title>
          <Text className="!text-xs !text-navy-500">
            O Google Play não tem API pública de rating/reviews/downloads. Os números acima são
            os <strong>nossos</strong> (usuários/installs do nosso banco). Pra trazer rating,
            número de reviews e downloads brutos da Play, precisa integrar a <strong>Google Play
            Console API</strong> (service account) — caminho de upgrade, não está conectado.
          </Text>
        </Card>
      </section>
    </div>
  );
}

function StoreStat({
  label,
  value,
  share,
  tone,
}: {
  label: string;
  value: number | undefined;
  share: number | null;
  tone: 'navy' | 'emerald' | 'slate' | 'brand';
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'brand'
        ? 'text-brand-700'
        : tone === 'slate'
          ? 'text-navy-400'
          : 'text-navy-700';
  return (
    <div className="rounded-md border border-navy-50 bg-white p-3">
      <div className="text-[11px] font-medium text-navy-400">{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${color}`}>
        {value === undefined ? '—' : formatNumber(value)}
      </div>
      {share !== null && (
        <div className="text-[11px] text-navy-300">{(share * 100).toFixed(0)}% do total</div>
      )}
    </div>
  );
}

function VersionTable({ title, rows }: { title: string; rows: VersionRow[] }) {
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <Card className="ozly-card">
      <Title className="!text-sm !font-semibold text-navy-700">{title}</Title>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-navy-300">Sem dados no período.</div>
      ) : (
        <table className="mt-3 w-full text-xs">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
            <tr className="border-b border-navy-50">
              <th className="px-3 py-2 text-left">Versão</th>
              <th className="px-3 py-2 text-right">Usuários</th>
              <th className="px-3 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody className="text-navy-700">
            {rows.map((r) => (
              <tr key={`${r.platform}-${r.app_version}`} className="border-b border-navy-50/60 last:border-0">
                <td className="px-3 py-1.5 font-mono">{r.app_version}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.count)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-navy-400">
                  {total > 0 ? `${((r.count / total) * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
