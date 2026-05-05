import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Title } from '@tremor/react';
import { callRpc } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';

interface GrantRecent {
  id: string;
  created_at: string;
  entitlement: string | null;
  days: number | null;
  rc_status: number | null;
  target_user_id: string | null;
  target_email: string | null;
}

interface ReferralRecent {
  id: string;
  referred_user_id: string;
  referrer_user_id: string;
  referrer_status: number | null;
  referred_status: number | null;
  created_at: string;
}

interface QrTop {
  slug: string;
  click_count: number;
  last_click_at: string | null;
}

interface HealthPayload {
  generated_at: string;
  grants: {
    last_24h_buckets: { success?: number; failed?: number; pending?: number };
    recent: GrantRecent[];
  };
  rc_sync: {
    last_synced_at: string | null;
    stale_active_count: number;
    fresh_count: number;
  };
  referrals: {
    last_24h: number;
    recent: ReferralRecent[];
  };
  signups: {
    last_24h: number;
    last_7d: number;
    trials_24h: number;
  };
  qr_codes: {
    clicks_24h: number;
    top_7d: QrTop[];
  };
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function rcStatusBadge(s: number | null) {
  if (s == null) return { label: 'pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (s >= 200 && s < 300) return { label: `${s}`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: `${s}`, cls: 'bg-rose-50 text-rose-700 border-rose-200' };
}

function HealthBadge({ tone, label }: { tone: 'green' | 'amber' | 'red'; label: string }) {
  const cls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export function SystemHealthPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await callRpc<HealthPayload>('admin_system_health', {});
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return <div className="flex items-center justify-center py-12"><Spinner /></div>;
  }
  if (error) {
    return <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>;
  }
  if (!data) return null;

  // ─── Health rollups ──────────────────────────────────────────────────────
  const grantsBuckets = data.grants.last_24h_buckets;
  const grantsTotal = (grantsBuckets.success ?? 0) + (grantsBuckets.failed ?? 0) + (grantsBuckets.pending ?? 0);
  const grantsHealth: 'green' | 'amber' | 'red' = (grantsBuckets.failed ?? 0) > 0
    ? 'red'
    : (grantsBuckets.pending ?? 0) > 0 ? 'amber' : 'green';

  const rcLastMs = data.rc_sync.last_synced_at ? Date.now() - new Date(data.rc_sync.last_synced_at).getTime() : Infinity;
  const rcHealth: 'green' | 'amber' | 'red' = rcLastMs > 6 * 3600_000
    ? 'red'
    : rcLastMs > 3600_000 ? 'amber' : 'green';

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Title className="!text-navy-700">System Health</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Pipelines críticos: grants, RC sync, referrals, signups, QR. Refresh a cada 30s.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {/* ─── Grants pipeline ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-navy-100 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-700">Grants pipeline (24h)</h2>
          <HealthBadge
            tone={grantsHealth}
            label={
              grantsHealth === 'green' ? 'healthy'
                : grantsHealth === 'amber' ? `${grantsBuckets.pending} pending` : `${grantsBuckets.failed} failed`
            }
          />
        </header>
        <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
          <div className="rounded border border-navy-50 bg-navy-50/40 p-2">
            <div className="text-[10px] uppercase text-navy-400">Total 24h</div>
            <div className="text-lg font-semibold text-navy-700">{grantsTotal}</div>
          </div>
          <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
            <div className="text-[10px] uppercase text-emerald-600">Success</div>
            <div className="text-lg font-semibold text-emerald-700">{grantsBuckets.success ?? 0}</div>
          </div>
          <div className="rounded border border-amber-100 bg-amber-50/40 p-2">
            <div className="text-[10px] uppercase text-amber-600">Pending</div>
            <div className="text-lg font-semibold text-amber-700">{grantsBuckets.pending ?? 0}</div>
          </div>
          <div className="rounded border border-rose-100 bg-rose-50/40 p-2">
            <div className="text-[10px] uppercase text-rose-600">Failed</div>
            <div className="text-lg font-semibold text-rose-700">{grantsBuckets.failed ?? 0}</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] uppercase text-navy-400">Recent 10</div>
          {data.grants.recent.length === 0 ? (
            <p className="text-xs text-navy-400">Nenhum grant registrado.</p>
          ) : data.grants.recent.map((g) => {
            const b = rcStatusBadge(g.rc_status);
            return (
              <div key={g.id} className="flex items-center justify-between rounded border border-navy-50 px-2 py-1.5 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${b.cls}`}>
                    {b.label}
                  </span>
                  <span className="font-medium text-navy-700">
                    {(g.entitlement ?? 'pro').toUpperCase()} · {g.days}d
                  </span>
                  <Link to={`/users/${g.target_user_id}`} className="truncate text-navy-500 hover:underline">
                    {g.target_email ?? g.target_user_id?.slice(0, 8)}
                  </Link>
                </div>
                <span className="text-navy-300">{relativeTime(g.created_at)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── RC sync ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-navy-100 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-700">RevenueCat sync</h2>
          <HealthBadge
            tone={rcHealth}
            label={rcHealth === 'green' ? 'live' : rcHealth === 'amber' ? 'lagging' : 'stale'}
          />
        </header>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border border-navy-50 bg-navy-50/40 p-2">
            <div className="text-[10px] uppercase text-navy-400">Last sync</div>
            <div className="text-lg font-semibold text-navy-700">
              {data.rc_sync.last_synced_at ? relativeTime(data.rc_sync.last_synced_at) : '—'}
            </div>
          </div>
          <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
            <div className="text-[10px] uppercase text-emerald-600">Fresh (1h)</div>
            <div className="text-lg font-semibold text-emerald-700">{data.rc_sync.fresh_count}</div>
          </div>
          <div className="rounded border border-rose-100 bg-rose-50/40 p-2">
            <div className="text-[10px] uppercase text-rose-600">Stale active</div>
            <div className="text-lg font-semibold text-rose-700">{data.rc_sync.stale_active_count}</div>
          </div>
        </div>
        {rcHealth === 'red' && (
          <p className="mt-2 text-xs text-rose-600">
            Webhook não está processando. Confere RC dashboard → Integrations → Ozly Supabase webhook.
          </p>
        )}
      </section>

      {/* ─── Referrals ───────────────────────────────────────────────── */}
      <section className="rounded-lg border border-navy-100 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-700">Referrals (auto-grants)</h2>
          <HealthBadge
            tone={data.referrals.last_24h > 0 ? 'green' : 'amber'}
            label={`${data.referrals.last_24h} in 24h`}
          />
        </header>
        <div className="space-y-1">
          {data.referrals.recent.length === 0 ? (
            <p className="text-xs text-navy-400">Sem referrals registrados ainda.</p>
          ) : data.referrals.recent.map((r) => {
            const b = rcStatusBadge(r.referrer_status);
            return (
              <div key={r.id} className="flex items-center justify-between rounded border border-navy-50 px-2 py-1.5 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${b.cls}`}>
                    {b.label}
                  </span>
                  <Link to={`/users/${r.referrer_user_id}`} className="truncate text-navy-700 hover:underline">
                    referrer {r.referrer_user_id.slice(0, 8)}
                  </Link>
                  <span className="text-navy-400">→</span>
                  <Link to={`/users/${r.referred_user_id}`} className="truncate text-navy-500 hover:underline">
                    referred {r.referred_user_id.slice(0, 8)}
                  </Link>
                </div>
                <span className="text-navy-300">{relativeTime(r.created_at)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Signups + trials ────────────────────────────────────────── */}
      <section className="rounded-lg border border-navy-100 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-700">Signups + trials</h2>
          <HealthBadge
            tone={data.signups.last_24h > 0 ? 'green' : 'amber'}
            label={`${data.signups.last_24h} new today`}
          />
        </header>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border border-navy-50 bg-navy-50/40 p-2">
            <div className="text-[10px] uppercase text-navy-400">Signups 24h</div>
            <div className="text-lg font-semibold text-navy-700">{data.signups.last_24h}</div>
          </div>
          <div className="rounded border border-navy-50 bg-navy-50/40 p-2">
            <div className="text-[10px] uppercase text-navy-400">Signups 7d</div>
            <div className="text-lg font-semibold text-navy-700">{data.signups.last_7d}</div>
          </div>
          <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
            <div className="text-[10px] uppercase text-emerald-600">Trials 24h</div>
            <div className="text-lg font-semibold text-emerald-700">{data.signups.trials_24h}</div>
          </div>
        </div>
      </section>

      {/* ─── QR codes / deep links ───────────────────────────────────── */}
      <section className="rounded-lg border border-navy-100 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-700">QR / deep links</h2>
          <HealthBadge
            tone={data.qr_codes.clicks_24h > 0 ? 'green' : 'amber'}
            label={`${data.qr_codes.clicks_24h} active link(s) clicked 24h`}
          />
        </header>
        <div className="space-y-1">
          <div className="text-[10px] uppercase text-navy-400">Top clicks (last 7d)</div>
          {data.qr_codes.top_7d.length === 0 ? (
            <p className="text-xs text-navy-400">Sem cliques registrados nos últimos 7d.</p>
          ) : data.qr_codes.top_7d.map((q) => (
            <div key={q.slug} className="flex items-center justify-between rounded border border-navy-50 px-2 py-1.5 text-xs">
              <span className="font-mono text-navy-700">/go/{q.slug}</span>
              <div className="flex items-center gap-3 text-navy-500">
                <span>{q.click_count} clicks</span>
                <span className="text-navy-300">{relativeTime(q.last_click_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[10px] text-navy-300">
        Generated: {new Date(data.generated_at).toLocaleString()}
      </p>
    </div>
  );
}
