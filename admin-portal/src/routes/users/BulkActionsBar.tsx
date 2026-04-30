import { useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { GiftIcon, XIcon } from '@/components/Icons';
import type { UserListRow } from './types';

interface Props {
  selected: Set<string>;
  rowsOnPage: UserListRow[];
  onClear: () => void;
  /** Caller exports the selected slice (or filtered set if empty). */
  onExportSelected: () => void;
}

const ENTITLEMENTS = [
  { value: 'tfn_access', label: 'TFN access' },
  { value: 'abn_access', label: 'ABN access' },
  { value: 'pro', label: 'PRO' },
] as const;

/**
 * Bulk actions toolbar — appears when ≥1 user is selected.
 * Sticky at the bottom so the action stays in view while scrolling the table.
 */
export function BulkActionsBar({
  selected,
  rowsOnPage,
  onClear,
  onExportSelected,
}: Props) {
  const { toast } = useToast();
  const [showGrant, setShowGrant] = useState(false);
  const [granting, setGranting] = useState(false);
  const [entitlement, setEntitlement] = useState<string>('pro');
  const [days, setDays] = useState<number>(14);

  const selectedRows = rowsOnPage.filter((r) => selected.has(r.id));
  const count = selected.size;
  if (count === 0) return null;

  const grantBulk = async () => {
    if (count > 100) {
      toast({
        title: 'Batch grande demais',
        description: 'Bulk grant é capado em 100 usuários por chamada.',
        variant: 'error',
      });
      return;
    }
    setGranting(true);
    try {
      await callRpc<{ success: boolean; granted: number }>(
        'admin_bulk_grant_promo',
        {
          p_targets: Array.from(selected),
          p_entitlement: entitlement,
          p_days: days,
        },
      );
      toast({
        title: `Promo concedida a ${count} usuário${count === 1 ? '' : 's'}`,
        description: `${entitlement} · ${days} dias. Edge fn vai propagar pra RC.`,
        variant: 'success',
      });
      setShowGrant(false);
      onClear();
    } catch (err) {
      const msg =
        err instanceof RpcError ? err.message : 'Falha ao conceder promo.';
      toast({
        title: 'Bulk grant falhou',
        description: msg,
        variant: 'error',
      });
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="sticky bottom-3 z-20 mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-brand-500 px-2 font-semibold text-white">
            {count}
          </span>
          <span className="text-navy-600">
            usuário{count === 1 ? '' : 's'} selecionado{count === 1 ? '' : 's'}
          </span>
          {count > rowsOnPage.length ? null : (
            <span className="text-xs text-navy-300">(nesta página)</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportSelected}
            disabled={selectedRows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar selecionados (CSV)
          </button>

          <button
            type="button"
            onClick={() => setShowGrant((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
          >
            <GiftIcon className="h-3.5 w-3.5" />
            Conceder promo em massa
          </button>

          <button
            type="button"
            onClick={onClear}
            aria-label="Limpar seleção"
            className="rounded-md border border-navy-100 bg-white p-1.5 text-navy-400 hover:border-rose-200 hover:text-rose-700"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showGrant && (
        <div className="mt-2 rounded-xl border border-brand-200 bg-white p-3 shadow-lg">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-navy-600">Entitlement</span>
              <select
                value={entitlement}
                onChange={(e) => setEntitlement(e.target.value)}
                className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs"
              >
                {ENTITLEMENTS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-navy-600">Dias</span>
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-20 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs"
              />
            </label>

            <p className="flex-1 text-xs text-navy-500">
              Vai conceder <strong>{entitlement}</strong> por{' '}
              <strong>{days} dias</strong> a <strong>{count}</strong> usuário
              {count === 1 ? '' : 's'}. Cada concessão gera 1 linha de audit.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowGrant(false)}
                disabled={granting}
                className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-500 hover:bg-navy-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void grantBulk();
                }}
                disabled={granting}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {granting ? <Spinner size="sm" /> : null}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
