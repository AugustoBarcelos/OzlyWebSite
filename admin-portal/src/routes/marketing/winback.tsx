import { useCallback, useEffect, useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { AlertTriangleIcon } from '@/components/Icons';
import { formatRelativeTime } from '@/lib/format';

/**
 * /marketing/winback — trial win-back campaign monitor.
 *
 * The audience is "trial + auto-renew OFF" (decided not to pay, still in trial).
 * Each gets a personal email with a one-tap "claim 30 free days" link. This page
 * shows, per person, whether we sent it and whether they tapped/claimed — plus a
 * conversion summary. Read-only; data comes from admin_winback_list().
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

const CAMPAIGN_LABEL: Record<string, string> = {
  winback_trial_30d: 'Win-back · 30d',
  pro_trial_7d: 'PRO trial · 7d',
};

function campaignLabel(c: string): string {
  return CAMPAIGN_LABEL[c] ?? c;
}

interface WinbackResponse {
  rows: WinbackRow[];
  stats: { total: number; sent: number; claimed: number; grant_failed: number };
}

const STATUS_META: Record<WinbackStatus, { label: string; cls: string }> = {
  claimed: { label: '✅ Apertou — 30d concedidos', cls: 'bg-emerald-50 text-emerald-700' },
  grant_failed: { label: '⚠️ Apertou, grant falhou', cls: 'bg-rose-50 text-rose-700' },
  sent: { label: '📨 Enviado — aguardando', cls: 'bg-amber-50 text-amber-700' },
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

export function MarketingWinbackPage() {
  const [data, setData] = useState<WinbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await callRpc<WinbackResponse>('admin_winback_list', {}));
    } catch (err) {
      setError(err instanceof RpcError ? err.message : 'Falha ao carregar a campanha.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.rows ?? [];
  const stats = data?.stats ?? { total: 0, sent: 0, claimed: 0, grant_failed: 0 };
  const convRate = stats.sent > 0 ? `${((stats.claimed / stats.sent) * 100).toFixed(0)}%` : '—';

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-700">Central de comunicação</h1>
          <p className="text-sm text-navy-400">
            Todas as campanhas de oferta (win-back e PRO trial): quem recebeu, quem
            apertou, e quem se descadastrou.
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Enviados" value={stats.sent} hint={`${stats.total} na campanha`} />
        <StatTile label="Apertaram" value={stats.claimed} />
        <StatTile label="Conversão" value={convRate} hint="apertaram ÷ enviados" />
        <StatTile label="Falhas de grant" value={stats.grant_failed} hint="apertou, grant deu erro" />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1"><div className="font-medium">Falha</div><div className="text-xs">{error}</div></div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-navy-100 text-sm">
          <thead className="bg-navy-50 text-left text-[11px] font-medium uppercase tracking-wide text-navy-400">
            <tr>
              <th scope="col" className="px-3 py-2.5">Usuário</th>
              <th scope="col" className="px-3 py-2.5">Campanha</th>
              <th scope="col" className="px-3 py-2.5">Enviado</th>
              <th scope="col" className="px-3 py-2.5">Apertou</th>
              <th scope="col" className="px-3 py-2.5">Status</th>
              <th scope="col" className="px-3 py-2.5">Unsub</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50 bg-white">
            {loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center"><Spinner size="md" label="Carregando" /></td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-navy-400">Ninguém na campanha ainda.</td></tr>
            )}
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              const unsub = r.lifecycle_opt_out;
              return (
                <tr key={`${r.user_id}-${r.campaign}`} className="hover:bg-navy-50">
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-navy-700">{r.full_name ?? '—'}</span>
                      <span className="font-mono text-xs text-navy-500">{r.email}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {campaignLabel(r.campaign)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-navy-500">{r.sent_at ? formatRelativeTime(r.sent_at) : '—'}</td>
                  <td className="px-3 py-2.5 text-navy-500">{r.claimed_at ? formatRelativeTime(r.claimed_at) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {unsub ? (
                      <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">🚫 saiu</span>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
