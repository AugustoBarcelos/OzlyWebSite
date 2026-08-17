import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber } from '@/lib/format';

/**
 * Drill-down de uma etapa do funil de ativação.
 *
 * Backed por `admin_funnel_stage_users(stage, days, limit, offset)`, que reusa
 * os mesmos predicados de `admin_lifecycle_funnel` — o total daqui bate com o
 * número do card por construção, não por coincidência.
 */

export type FunnelStage =
  | 'signed_up'
  | 'created_job'
  | 'sent_first_invoice'
  | 'saw_paywall'
  | 'started_trial'
  | 'converted_paying';

interface StageUserRow {
  id: string;
  full_name: string | null;
  email_masked: string | null;
  signup_date: string;
  did_job: boolean;
  did_invoice: boolean;
  did_paywall: boolean;
  did_trial: boolean;
  is_paying: boolean;
}

interface StageUsersResponse {
  stage: FunnelStage;
  period_days: number;
  total: number;
  limit: number;
  offset: number;
  rows: StageUserRow[];
}

const PAGE_SIZE = 100;

interface Props {
  stage: FunnelStage;
  stageLabel: string;
  periodDays: number;
  /** Valor mostrado no card — serve de conferência contra o total do RPC. */
  expectedCount: number;
  onClose: () => void;
}

export function FunnelStageUsers({
  stage,
  stageLabel,
  periodDays,
  expectedCount,
  onClose,
}: Props) {
  const [data, setData] = useState<StageUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [stage, periodDays]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<StageUsersResponse>('admin_funnel_stage_users', {
      p_stage: stage,
      p_days: periodDays,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof RpcError ? e.message : 'Falha ao carregar');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [stage, periodDays, page]);

  // Se o total do RPC divergir do card, algo saiu de sincronia entre as duas
  // definições. Melhor gritar do que deixar o admin comparar números errados.
  const mismatch = data !== null && data.total !== expectedCount;
  const maxPage = data ? Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1) : 0;

  return (
    <Card className="ozly-card border-brand-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title className="!text-sm !font-semibold text-navy-700">
            {stageLabel} — {formatNumber(data?.total ?? expectedCount)} usuário(s)
          </Title>
          <p className="mt-0.5 text-xs text-navy-400">
            Últimos {periodDays} dias. Exclui contas de teste e deletadas.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          Fechar
        </button>
      </div>

      {mismatch && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ O card mostra {formatNumber(expectedCount)} e o drill-down{' '}
          {formatNumber(data?.total ?? 0)}. As duas definições saíram de sincronia
          — vale abrir um bug antes de confiar em qualquer um dos dois.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="mt-3 text-xs text-navy-300">Nenhum usuário nessa etapa.</div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                <tr className="border-b border-navy-50">
                  <th className="py-2 text-left">Usuário</th>
                  <th className="py-2 text-left">Cadastro</th>
                  <th className="py-2 text-left">Chegou até</th>
                </tr>
              </thead>
              <tbody className="text-navy-700">
                {data.rows.map((u) => (
                  <tr key={u.id} className="border-b border-navy-50/60 last:border-0">
                    <td className="py-1.5">
                      <Link
                        to={`/users/${u.id}`}
                        className="font-medium text-navy-700 hover:text-brand-700 hover:underline"
                      >
                        {u.full_name ?? 'sem nome'}
                      </Link>
                      <div className="text-[11px] text-navy-400">
                        {u.email_masked ?? '—'}
                      </div>
                    </td>
                    <td className="py-1.5 text-xs text-navy-500">
                      {new Date(u.signup_date).toLocaleDateString('en-AU', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="py-1.5">
                      <div className="flex flex-wrap gap-1">
                        <StageChip on={u.did_job} label="job" />
                        <StageChip on={u.did_invoice} label="invoice" />
                        <StageChip on={u.did_paywall} label="paywall" />
                        <StageChip on={u.did_trial} label="trial" />
                        <StageChip on={u.is_paying} label="pagante" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between text-xs text-navy-500">
              <span>
                {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + data.rows.length} de{' '}
                {formatNumber(data.total)}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md border border-navy-100 bg-white px-2 py-1 font-medium disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= maxPage}
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  className="rounded-md border border-navy-100 bg-white px-2 py-1 font-medium disabled:opacity-40"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function StageChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={[
        'rounded px-1.5 py-0.5 text-[10px] font-medium',
        on ? 'bg-brand-50 text-brand-700' : 'bg-navy-50 text-navy-300',
      ].join(' ')}
    >
      {label}
    </span>
  );
}
