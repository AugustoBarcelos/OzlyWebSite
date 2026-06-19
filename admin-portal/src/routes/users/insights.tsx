// User insights — granular lifecycle sub-stage, app-install status, and churn
// reasons. Enriches the Users list per page via admin_user_insights (so the big
// admin_list_users RPC stays untouched), plus a churn-reasons panel backed by
// admin_churn_reasons.

import { useEffect, useState } from 'react';
import { callRpc } from '@/lib/rpc';

// ── Types ───────────────────────────────────────────────────────────────────
export type FineStage =
  | 'paying_active'
  | 'paying_at_risk'
  | 'cancel_winback'
  | 'trial_active'
  | 'trial_idle'
  | 'churned'
  | 'trial_expired'
  | 'activated_no_convert'
  | 'signed_up_inactive';

export type InstallStatus = 'installed' | 'uninstalled' | 'recent_no_push' | 'unknown';

export interface UserInsight {
  user_id: string;
  activated: boolean;
  active_devices: number | null;
  any_devices: number | null;
  device_last_used_at: string | null;
  last_seen_at: string | null;
  last_seen_app_version: string | null;
  last_cancel_reason: string | null;
  last_cancel_at: string | null;
  install_status: InstallStatus;
  fine_stage: FineStage;
}

export async function fetchUserInsights(ids: string[]): Promise<Record<string, UserInsight>> {
  if (ids.length === 0) return {};
  const res = await callRpc<{ insights: UserInsight[] }>('admin_user_insights', { p_user_ids: ids });
  const map: Record<string, UserInsight> = {};
  for (const i of res.insights) map[i.user_id] = i;
  return map;
}

// ── Fine-stage badge ─────────────────────────────────────────────────────────
const FINE_STAGE_LABEL: Record<FineStage, string> = {
  paying_active: 'Pagante ativo',
  paying_at_risk: 'Em risco',
  cancel_winback: 'Cancelou · winback',
  trial_active: 'Trial engajado',
  trial_idle: 'Trial parado',
  churned: 'Churn',
  trial_expired: 'Trial expirou',
  activated_no_convert: 'Ativou, não converteu',
  signed_up_inactive: 'Não ativou',
};

const FINE_STAGE_HINT: Record<FineStage, string> = {
  paying_active: 'Assinatura ativa e abrindo o app.',
  paying_at_risk: 'Pagante, mas auto-renovação off, em grace, ou sumido > 21d. Churn iminente.',
  cancel_winback: 'Cancelou mas ainda tem acesso até o fim do período — janela de resgate.',
  trial_active: 'Em trial e usando.',
  trial_idle: 'Em trial mas não abre há > 5d — provável não-conversão.',
  churned: 'Era pagante e o período acabou. Alvo de reativação.',
  trial_expired: 'Trial expirou sem pagar.',
  activated_no_convert: 'Mandou a 1ª invoice (viu valor) mas nunca assinou.',
  signed_up_inactive: 'Cadastrou e nunca mandou invoice — não ativou.',
};

const FINE_STAGE_STYLE: Record<FineStage, string> = {
  paying_active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  paying_at_risk: 'bg-orange-50 text-orange-700 ring-orange-200',
  cancel_winback: 'bg-rose-50 text-rose-700 ring-rose-200',
  trial_active: 'bg-amber-50 text-amber-700 ring-amber-100',
  trial_idle: 'bg-orange-50 text-orange-700 ring-orange-200',
  churned: 'bg-rose-50 text-rose-700 ring-rose-100',
  trial_expired: 'bg-orange-50 text-orange-700 ring-orange-100',
  activated_no_convert: 'bg-violet-50 text-violet-700 ring-violet-100',
  signed_up_inactive: 'bg-navy-50 text-navy-500 ring-navy-100',
};

// Only the sub-stages that ADD info beyond the coarse lifecycle badge are worth
// rendering inline (the rest just mirror it and would be noise).
const REFINEMENTS: ReadonlySet<FineStage> = new Set<FineStage>([
  'paying_at_risk',
  'cancel_winback',
  'trial_idle',
  'activated_no_convert',
  'signed_up_inactive',
]);

export function FineStageBadge({ stage }: { stage: FineStage | undefined }) {
  if (!stage || !REFINEMENTS.has(stage)) return null;
  return (
    <span
      title={FINE_STAGE_HINT[stage]}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${FINE_STAGE_STYLE[stage]}`}
    >
      {FINE_STAGE_LABEL[stage]}
    </span>
  );
}

// ── Install badge ────────────────────────────────────────────────────────────
const INSTALL_STYLE: Record<InstallStatus, string> = {
  installed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  uninstalled: 'bg-rose-50 text-rose-600 ring-rose-100',
  recent_no_push: 'bg-amber-50 text-amber-700 ring-amber-100',
  unknown: '',
};
const INSTALL_LABEL: Record<InstallStatus, string> = {
  installed: 'Instalado',
  uninstalled: 'Desinstalou',
  recent_no_push: 'Sem push',
  unknown: '—',
};

export function InstallBadge({ insight }: { insight: UserInsight | undefined }) {
  if (!insight || insight.install_status === 'unknown') {
    return <span className="text-[11px] text-navy-300">—</span>;
  }
  const s = insight.install_status;
  const when = insight.device_last_used_at ?? insight.last_seen_at;
  const ver = insight.last_seen_app_version;
  const hint =
    (s === 'installed'
      ? 'Tem push ativo registrado.'
      : s === 'uninstalled'
        ? 'Token de push ficou inválido (desinstalou ou desligou push).'
        : 'Abriu o app recentemente mas sem token de push (negou push ou versão antiga).') +
    (when ? ` Últ.: ${new Date(when).toLocaleDateString('en-AU')}` : '') +
    (ver ? ` · v${ver}` : '');
  return (
    <span
      title={hint}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${INSTALL_STYLE[s]}`}
    >
      {INSTALL_LABEL[s]}
    </span>
  );
}

// ── Churn reasons panel ──────────────────────────────────────────────────────
const REASON_LABEL: Record<string, string> = {
  too_expensive: 'Muito caro',
  not_using_enough: 'Não usava o suficiente',
  missing_features: 'Faltava funcionalidade',
  found_alternative: 'Achou alternativa',
  temporary_break: 'Pausa temporária',
  other: 'Outro',
};

interface ChurnReasonsResponse {
  days: number;
  total: number;
  reasons: Array<{ reason_key: string; cnt: number }>;
}

export function ChurnReasonsPanel() {
  const [data, setData] = useState<ChurnReasonsResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    callRpc<ChurnReasonsResponse>('admin_churn_reasons', { p_days: 90 })
      .then(setData)
      .catch(() => setData({ days: 90, total: 0, reasons: [] }));
  }, [open, loaded]);

  const max = data?.reasons.reduce((m, r) => Math.max(m, r.cnt), 0) ?? 0;

  return (
    <div className="rounded-lg border border-navy-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-navy-700">
          Por que cancelam{' '}
          <span className="text-xs font-normal text-navy-400">· últimos 90 dias</span>
        </span>
        <span className="text-xs text-navy-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-navy-50 px-4 py-3">
          {!data ? (
            <p className="text-xs text-navy-400">Carregando…</p>
          ) : data.total === 0 ? (
            <p className="text-xs text-navy-400">
              Sem respostas ainda — a pesquisa começa a registrar conforme os usuários
              atualizam para a versão nova do app e passam pelo fluxo de cancelamento.
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.reasons.map((r) => (
                <div key={r.reason_key} className="flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 text-navy-600">
                    {REASON_LABEL[r.reason_key] ?? r.reason_key}
                  </span>
                  <div className="h-3 flex-1 rounded bg-navy-50">
                    <div
                      className="h-3 rounded bg-rose-300"
                      style={{ width: `${max > 0 ? (r.cnt / max) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-navy-500">
                    {r.cnt} · {Math.round((r.cnt / data.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
