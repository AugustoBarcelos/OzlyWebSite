import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { HandshakeIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';

interface PendingApplication {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_cents: number | null;
  currency: string;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
}

interface ApplicationsResponse {
  count: number;
  rows: PendingApplication[];
}

/**
 * /inbox/affiliates — queue de aplicações de afiliado aguardando review.
 *
 * Hoje a queue só recebe rows quando um admin cria afiliado com status=pending
 * (via SQL direto). Quando o form público de signup self-service for ativado,
 * ele vai inserir aqui com status=pending automaticamente.
 *
 * Ações:
 *   - Aprovar: opcionalmente sobrescreve commission_cents, marca active=true
 *   - Rejeitar: requer reason (3-2000 chars), marca active=false
 *   - Ambas auditam em admin_audit_log
 */
export function InboxAffiliatesPage() {
  const [data, setData] = useState<ApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    callRpc<ApplicationsResponse>('admin_pending_affiliate_applications', {})
      .then((d) => setData(d))
      .catch((e: unknown) => {
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<ApplicationsResponse>('admin_pending_affiliate_applications', {})
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

  const approve = useCallback(
    async (id: string, code: string) => {
      const override = window.prompt(
        `Aprovar afiliado "${code}".\n\nComissão (cents AUD) — deixar em branco mantém o valor atual:`,
        '',
      );
      if (override === null) return;
      const trimmed = override.trim();
      const commission =
        trimmed === '' ? null : Number.parseInt(trimmed, 10);
      if (trimmed !== '' && (!Number.isFinite(commission) || (commission ?? -1) < 0)) {
        toast({ title: 'Comissão inválida.', variant: 'error' });
        return;
      }
      setPendingId(id);
      try {
        await callRpc('admin_approve_affiliate_application', {
          p_affiliate_id: id,
          p_commission_cents: commission,
        });
        toast({ title: `Afiliado ${code} aprovado.`, variant: 'success' });
        load();
      } catch (e: unknown) {
        toast({
          title: e instanceof RpcError ? e.message : 'Falha ao aprovar',
          variant: 'error',
        });
      } finally {
        setPendingId(null);
      }
    },
    [load, toast],
  );

  const reject = useCallback(
    async (id: string, code: string) => {
      const reason = window.prompt(
        `Rejeitar afiliado "${code}".\n\nMotivo (obrigatório, 3-2000 chars):`,
        '',
      );
      if (reason === null) return;
      if (reason.trim().length < 3) {
        toast({ title: 'Motivo precisa de pelo menos 3 caracteres.', variant: 'error' });
        return;
      }
      setPendingId(id);
      try {
        await callRpc('admin_reject_affiliate_application', {
          p_affiliate_id: id,
          p_reason: reason.trim(),
        });
        toast({ title: `Afiliado ${code} rejeitado.`, variant: 'success' });
        load();
      } catch (e: unknown) {
        toast({
          title: e instanceof RpcError ? e.message : 'Falha ao rejeitar',
          variant: 'error',
        });
      } finally {
        setPendingId(null);
      }
    },
    [load, toast],
  );

  const total = data?.count ?? 0;

  const banner = useMemo(() => {
    if (migrationPending) {
      return (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente:</strong> rode{' '}
          <code className="font-mono">supabase db push</code> para aplicar{' '}
          <code className="font-mono">admin_pending_affiliate_applications</code>.
        </div>
      );
    }
    if (error) {
      return (
        <div className="ozly-card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong className="font-semibold">Erro:</strong> {error}
        </div>
      );
    }
    return null;
  }, [migrationPending, error]);

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
            <HandshakeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Affiliate applications
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Queue de afiliados aguardando aprovação. Aprovar ativa o código;
              rejeitar registra motivo no audit log.
            </p>
          </div>
        </div>
        <Link
          to="/inbox"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Inbox
        </Link>
      </header>

      {banner}

      <Card className="ozly-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Title className="!text-sm !font-semibold text-navy-700">
            Pendentes ({total})
          </Title>
          {!migrationPending && (
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Atualizando…' : 'Refresh'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
            <Spinner size="sm" /> Carregando…
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-6 text-center text-sm text-emerald-700">
            <HandshakeIcon className="mx-auto mb-2 h-6 w-6" />
            <div className="font-semibold">Sem aplicações pendentes.</div>
            <div className="mt-1 text-xs">
              Quando o form público de signup self-service for ativado, novos
              candidatos vão cair aqui automaticamente.
            </div>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-navy-50">
            {data.rows.map((row) => {
              const busy = pendingId === row.id;
              return (
                <li key={row.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-navy-700">
                          {row.code}
                        </span>
                        <span className="text-sm font-medium text-navy-700">
                          {row.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-navy-400">
                        {row.email ?? '—'}
                        {row.phone && <> · {row.phone}</>}
                        {row.applied_at && (
                          <> · aplicou {formatRelativeTime(row.applied_at)}</>
                        )}
                      </div>
                      {row.notes && (
                        <p className="mt-1 max-w-xl text-[12px] text-navy-500">
                          {row.notes}
                        </p>
                      )}
                      {row.commission_cents !== null && (
                        <div className="mt-1 text-[11px] text-navy-500">
                          Comissão sugerida: {row.currency}{' '}
                          {(row.commission_cents / 100).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => approve(row.id, row.code)}
                        disabled={busy}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? '…' : 'Aprovar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => reject(row.id, row.code)}
                        disabled={busy}
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? '…' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <RawDataPanel
        page="inbox-affiliates"
        sources={[
          {
            rpc: 'admin_pending_affiliate_applications',
            params: {},
            data,
            ...(error ? { note: error } : {}),
          },
        ]}
      />
    </div>
  );
}
