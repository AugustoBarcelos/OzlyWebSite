import { useCallback, useEffect, useMemo, useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { AlertTriangleIcon } from '@/components/Icons';
import { formatRelativeTime } from '@/lib/format';

/**
 * /marketing/winback — communication center.
 *
 * Two levels:
 *   1. Campaign list — one card per offer campaign (win-back, PRO trial, …) with
 *      sent / claimed / conversion / unsubscribe. New campaigns appear here on
 *      their own (grouped from the data), so this scales past win-back.
 *   2. Drill-in — per-user table for the picked campaign (sent, tapped, status,
 *      unsubscribe).
 *
 * Read-only; data from admin_winback_list().
 */

type WinbackStatus = 'claimed' | 'grant_failed' | 'sent' | 'queued';

interface WinbackRow {
  user_id: string;
  campaign: string;
  grant_days: number;
  full_name: string | null;
  email: string;
  sent_at: string | null;
  claimed_at: string | null;
  grant_status: number | null;
  status: WinbackStatus;
  lifecycle_opt_out: boolean;
  marketing_opt_in: boolean;
}

interface WinbackResponse {
  rows: WinbackRow[];
  stats: { total: number; sent: number; claimed: number; grant_failed: number };
}

interface CampaignAgg {
  campaign: string;
  total: number;
  sent: number;
  claimed: number;
  unsub: number;
}

interface LifecycleAgg {
  rule_key: string;
  sent: number;
  last_at: string | null;
}

interface BroadcastRow {
  id: string;
  channel: string;
  title: string | null;
  segment: string | null;
  status: string | null;
  sent: number;
  opened: number;
  clicked: number;
  sent_at: string | null;
}

interface CommsOverview {
  lifecycle: LifecycleAgg[];
  broadcasts: BroadcastRow[];
}

const LIFECYCLE_LABEL: Record<string, string> = {
  signup_no_invoice: 'Cadastrou, sem invoice',
  activated_welcome: 'Boas-vindas (1ª invoice)',
  trial_ending: 'Trial acabando',
  reactivation: 'Reativação (sumiu)',
};

const CAMPAIGN_META: Record<string, { label: string; desc: string }> = {
  winback_trial_30d: { label: 'Win-back', desc: 'Trial + auto-renew off · 30 dias PRO' },
  pro_trial_7d: { label: 'PRO trial', desc: 'Base consentida · 7 dias PRO' },
};
const meta = (c: string) => CAMPAIGN_META[c] ?? { label: c, desc: 'Campanha de oferta' };

const STATUS_META: Record<WinbackStatus, { label: string; cls: string }> = {
  claimed: { label: '✅ Apertou', cls: 'bg-emerald-50 text-emerald-700' },
  grant_failed: { label: '⚠️ Grant falhou', cls: 'bg-rose-50 text-rose-700' },
  sent: { label: '📨 Enviado', cls: 'bg-amber-50 text-amber-700' },
  queued: { label: '⏳ Na fila', cls: 'bg-navy-100 text-navy-500' },
};

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-navy-700 tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-navy-400">{hint}</div>}
    </div>
  );
}

function pct(n: number, d: number): string {
  return d > 0 ? `${((n / d) * 100).toFixed(0)}%` : '—';
}

export function MarketingWinbackPage() {
  const [data, setData] = useState<WinbackResponse | null>(null);
  const [overview, setOverview] = useState<CommsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offers, ov] = await Promise.all([
        callRpc<WinbackResponse>('admin_winback_list', {}),
        callRpc<CommsOverview>('admin_comms_overview', {}).catch(() => null),
      ]);
      setData(offers);
      setOverview(ov);
    } catch (err) {
      setError(err instanceof RpcError ? err.message : 'Falha ao carregar as campanhas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.rows ?? [];

  const campaigns = useMemo<CampaignAgg[]>(() => {
    const m = new Map<string, CampaignAgg>();
    for (const r of rows) {
      const c = m.get(r.campaign) ?? { campaign: r.campaign, total: 0, sent: 0, claimed: 0, unsub: 0 };
      c.total += 1;
      if (r.sent_at) c.sent += 1;
      if (r.status === 'claimed') c.claimed += 1;
      if (r.lifecycle_opt_out) c.unsub += 1;
      m.set(r.campaign, c);
    }
    return [...m.values()].sort((a, b) => b.sent - a.sent);
  }, [rows]);

  const drillRows = useMemo(
    () => (selected ? rows.filter((r) => r.campaign === selected) : []),
    [rows, selected],
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-700">Central de comunicação</h1>
          <p className="text-sm text-navy-400">
            Todas as campanhas de oferta num lugar — clique numa pra ver quem recebeu,
            quem apertou e quem se descadastrou.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          ↻ Atualizar
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1"><div className="font-medium">Falha</div><div className="text-xs">{error}</div></div>
        </div>
      )}

      {loading && rows.length === 0 && (
        <div className="rounded-xl border border-navy-100 bg-white p-10 text-center shadow-sm">
          <Spinner size="md" label="Carregando" />
        </div>
      )}

      {/* LEVEL 1 — campaign list */}
      {!selected && !loading && (
        campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy-100 bg-navy-50 p-10 text-center text-sm text-navy-400">
            Nenhuma campanha ainda.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((c) => {
              const m = meta(c.campaign);
              return (
                <button
                  key={c.campaign}
                  type="button"
                  onClick={() => setSelected(c.campaign)}
                  className="rounded-xl border border-navy-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-navy-700">{m.label}</span>
                    <span className="text-xs text-brand-600">ver detalhes →</span>
                  </div>
                  <div className="mt-0.5 text-xs text-navy-400">{m.desc}</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold text-navy-700 tabular-nums">{c.sent}</div>
                      <div className="text-[10px] uppercase tracking-wide text-navy-400">enviados</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-emerald-600 tabular-nums">{c.claimed}</div>
                      <div className="text-[10px] uppercase tracking-wide text-navy-400">apertaram</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-brand-600 tabular-nums">{pct(c.claimed, c.sent)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-navy-400">conversão</div>
                    </div>
                  </div>
                  {c.unsub > 0 && (
                    <div className="mt-2 text-xs text-rose-600">🚫 {c.unsub} descadastro{c.unsub === 1 ? '' : 's'}</div>
                  )}
                </button>
              );
            })}
          </div>
        )
      )}

      {/* Lifecycle emails */}
      {!selected && !loading && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-navy-700">E-mails de ciclo</h2>
          <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-navy-100 text-sm">
              <thead className="bg-navy-50 text-left text-[11px] font-medium uppercase tracking-wide text-navy-400">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Regra</th>
                  <th scope="col" className="px-3 py-2.5">Enviados</th>
                  <th scope="col" className="px-3 py-2.5">Último</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 bg-white">
                {(overview?.lifecycle ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-navy-400">Nenhum e-mail de ciclo enviado.</td></tr>
                ) : (
                  overview!.lifecycle.map((l) => (
                    <tr key={l.rule_key} className="hover:bg-navy-50">
                      <td className="px-3 py-2.5 font-medium text-navy-700">{LIFECYCLE_LABEL[l.rule_key] ?? l.rule_key}</td>
                      <td className="px-3 py-2.5 tabular-nums text-navy-600">{l.sent}</td>
                      <td className="px-3 py-2.5 text-navy-500">{l.last_at ? formatRelativeTime(l.last_at) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Broadcasts */}
      {!selected && !loading && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-navy-700">Broadcasts</h2>
          <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-navy-100 text-sm">
              <thead className="bg-navy-50 text-left text-[11px] font-medium uppercase tracking-wide text-navy-400">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Canal</th>
                  <th scope="col" className="px-3 py-2.5">Assunto / segmento</th>
                  <th scope="col" className="px-3 py-2.5">Enviados</th>
                  <th scope="col" className="px-3 py-2.5">Abertos</th>
                  <th scope="col" className="px-3 py-2.5">Cliques</th>
                  <th scope="col" className="px-3 py-2.5">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 bg-white">
                {(overview?.broadcasts ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-navy-400">Nenhum broadcast enviado.</td></tr>
                ) : (
                  overview!.broadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50">
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center rounded-md bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">{b.channel}</span>
                      </td>
                      <td className="px-3 py-2.5 text-navy-700">{b.title || b.segment || '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums text-navy-600">{b.sent}</td>
                      <td className="px-3 py-2.5 tabular-nums text-navy-500">{b.opened || '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums text-navy-500">{b.channel === 'push' ? '—' : (b.clicked || '—')}</td>
                      <td className="px-3 py-2.5 text-navy-500">{b.sent_at ? formatRelativeTime(b.sent_at) : (b.status ?? '—')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEVEL 2 — per-user drill-in */}
      {selected && (() => {
        const c = campaigns.find((x) => x.campaign === selected);
        const m = meta(selected);
        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              ← Todas as campanhas
            </button>
            <div>
              <h2 className="text-lg font-semibold text-navy-700">{m.label}</h2>
              <p className="text-xs text-navy-400">{m.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Enviados" value={c?.sent ?? 0} />
              <StatTile label="Apertaram" value={c?.claimed ?? 0} />
              <StatTile label="Conversão" value={pct(c?.claimed ?? 0, c?.sent ?? 0)} />
              <StatTile label="Descadastros" value={c?.unsub ?? 0} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-navy-100 text-sm">
                <thead className="bg-navy-50 text-left text-[11px] font-medium uppercase tracking-wide text-navy-400">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">Usuário</th>
                    <th scope="col" className="px-3 py-2.5">Enviado</th>
                    <th scope="col" className="px-3 py-2.5">Apertou</th>
                    <th scope="col" className="px-3 py-2.5">Status</th>
                    <th scope="col" className="px-3 py-2.5">Unsub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50 bg-white">
                  {drillRows.map((r) => {
                    const sm = STATUS_META[r.status];
                    return (
                      <tr key={`${r.user_id}-${r.campaign}`} className="hover:bg-navy-50">
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-navy-700">{r.full_name ?? '—'}</span>
                            <span className="font-mono text-xs text-navy-500">{r.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-navy-500">{r.sent_at ? formatRelativeTime(r.sent_at) : '—'}</td>
                        <td className="px-3 py-2.5 text-navy-500">{r.claimed_at ? formatRelativeTime(r.claimed_at) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${sm.cls}`}>{sm.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.lifecycle_opt_out
                            ? <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">🚫 saiu</span>
                            : <span className="text-navy-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
