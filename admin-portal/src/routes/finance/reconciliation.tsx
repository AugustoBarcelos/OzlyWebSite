import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ShieldCheckIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber, formatRelativeTime } from '@/lib/format';

interface SourceRow {
  name: string;
  paying_total?: number | null;
  paying_excl_promo_family?: number | null;
  promo_active?: number | null;
  family_shared_active?: number | null;
  trial_active?: number | null;
  paid_tfn?: number | null;
  paid_abn?: number | null;
  paid_pro?: number | null;
  note?: string;
}

interface DiscrepancyRow {
  kind: string;
  rc_live: number;
  snapshot: number;
  diff: number;
}

interface ReconciliationResponse {
  snapshot_at: string;
  snapshot_refreshed_at: string;
  sources: SourceRow[];
  discrepancies: DiscrepancyRow[];
}

const DISCREPANCY_LABEL: Record<string, string> = {
  live_vs_snapshot_paying: 'Paying users (RC live × snapshot)',
  live_vs_snapshot_promo: 'Promo grants (RC live × snapshot)',
};

export function FinanceReconciliationPage() {
  const [data, setData] = useState<ReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<ReconciliationResponse>('admin_finance_reconciliation', {})
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Reconciliation
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Diff de paying users entre RevenueCat × snapshot × App Store × Play.
            </p>
          </div>
        </div>
        <Link
          to="/finance"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Finance Hub
        </Link>
      </header>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">20260504020000_admin_misc_rpcs.sql</code>.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data ? null : (
        <>
          {/* Snapshot freshness */}
          <Card className="ozly-card border-navy-100 bg-navy-50/40">
            <div className="text-[12px] text-navy-600">
              <strong>Snapshot atualizado</strong>{' '}
              {formatRelativeTime(data.snapshot_refreshed_at)}. Reconciliation rodada{' '}
              {formatRelativeTime(data.snapshot_at)}.
            </div>
          </Card>

          {/* Discrepancies — main view */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Discrepâncias detectadas
            </Title>
            {data.discrepancies.length === 0 ? (
              <div className="mt-3 text-xs text-navy-300">Sem comparações.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.discrepancies.map((d) => {
                  const matched = d.diff === 0;
                  return (
                    <li
                      key={d.kind}
                      className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                        matched
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-amber-200 bg-amber-50/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${matched ? 'text-emerald-900' : 'text-amber-900'}`}>
                          {DISCREPANCY_LABEL[d.kind] ?? d.kind}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-navy-500">
                          RC live: {formatNumber(d.rc_live)} · snapshot:{' '}
                          {formatNumber(d.snapshot)}
                        </div>
                      </div>
                      <span
                        className={`rounded-md px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
                          matched
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {matched ? 'match' : `${d.diff > 0 ? '+' : ''}${d.diff}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 text-[11px] text-navy-400">
              Diferenças pequenas (1-3) são esperadas pq o snapshot é refrescado 1×/h.
              Diferenças maiores ou persistentes valem investigar (sync stuck, edge
              function falhando, sandbox vazando pra prod).
            </div>
          </Card>

          {/* Sources side-by-side */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Sources of truth
            </Title>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {data.sources.map((src) => (
                <div
                  key={src.name}
                  className="rounded-md border border-navy-100 bg-white p-3"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-navy-700">{src.name}</h3>
                    {src.note && (
                      <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] text-navy-500">
                        Parte 2
                      </span>
                    )}
                  </div>
                  {src.note ? (
                    <p className="mt-2 text-[11px] text-navy-400">{src.note}</p>
                  ) : (
                    <dl className="mt-2 space-y-1 text-[12px]">
                      {src.paying_excl_promo_family !== undefined && src.paying_excl_promo_family !== null && (
                        <Row label="Paying (excl. promo/family)" value={formatNumber(src.paying_excl_promo_family)} />
                      )}
                      {src.paying_total !== undefined && src.paying_total !== null && (
                        <Row label="Paying total" value={formatNumber(src.paying_total)} />
                      )}
                      {src.paid_tfn !== undefined && src.paid_tfn !== null && (
                        <Row label="TFN" value={formatNumber(src.paid_tfn)} />
                      )}
                      {src.paid_abn !== undefined && src.paid_abn !== null && (
                        <Row label="ABN" value={formatNumber(src.paid_abn)} />
                      )}
                      {src.paid_pro !== undefined && src.paid_pro !== null && (
                        <Row label="PRO" value={formatNumber(src.paid_pro)} />
                      )}
                      {src.promo_active !== undefined && src.promo_active !== null && (
                        <Row label="Promo grants" value={formatNumber(src.promo_active)} />
                      )}
                      {src.family_shared_active !== undefined && src.family_shared_active !== null && (
                        <Row label="Family shared" value={formatNumber(src.family_shared_active)} />
                      )}
                      {src.trial_active !== undefined && src.trial_active !== null && (
                        <Row label="Active trials" value={formatNumber(src.trial_active)} />
                      )}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <RawDataPanel
        page="finance-reconciliation"
        sources={[{ rpc: 'admin_finance_reconciliation', params: {}, data }]}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-navy-50 pb-0.5 last:border-0">
      <dt className="text-navy-500">{label}</dt>
      <dd className="font-mono font-semibold tabular-nums text-navy-700">{value}</dd>
    </div>
  );
}
