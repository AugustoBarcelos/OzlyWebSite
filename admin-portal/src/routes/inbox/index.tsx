import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@tremor/react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BellIcon,
  HandshakeIcon,
  InboxIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * Inbox (W4) — unified attention queue.
 *
 * Aggregates "things that need your attention":
 *   - Affiliate payouts pending (real, via admin_affiliate_payout_planning)
 *   - Top errors last 7d (real, via admin_top_errors)
 *   - Recent admin actions / audit (real, via admin_recent_admin_actions)
 *   - Refunds / App Store reviews / Affiliate approvals (V2 placeholders)
 *
 * Each section silently degrades if its RPC isn't deployed in this env.
 *
 * Design: single-pane vertical sections so every category is visible without
 * clicking. Counts in headers; "Open in source" links per item; drill-down
 * via Link.
 */

interface PendingSummary {
  currency: string;
  count: number;
  cents: number;
}
interface PendingByAff {
  id: string;
  code: string;
  name: string | null;
  currency: string;
  count: number;
  cents: number;
  oldest_ready_at: string | null;
}
interface PayoutPlanning {
  pending_summary: PendingSummary[];
  pending_by_affiliate: PendingByAff[];
}

interface ErrorRow {
  message: string;
  count: number;
  users: number;
  last_seen: string;
}
interface ErrorsResponse {
  rows: ErrorRow[];
}

interface ActionRow {
  occurred_at: string;
  actor_email: string | null;
  action: string;
  context: Record<string, unknown> | null;
  result: string | null;
}
interface ActionsResponse {
  rows: ActionRow[];
}

export function InboxPage() {
  const [payouts, setPayouts] = useState<PayoutPlanning | null>(null);
  const [payoutsErr, setPayoutsErr] = useState<string | null>(null);

  const [errors, setErrors] = useState<ErrorRow[] | null>(null);
  const [errorsErr, setErrorsErr] = useState<string | null>(null);

  const [actions, setActions] = useState<ActionRow[] | null>(null);
  const [actionsErr, setActionsErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.allSettled([
      callRpc<PayoutPlanning>('admin_affiliate_payout_planning', {}),
      callRpc<ErrorsResponse>('admin_top_errors', { p_period_days: 7, p_limit: 10 }),
      callRpc<ActionsResponse>('admin_recent_admin_actions', { p_limit: 25 }),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1, r2] = results;
      if (r0.status === 'fulfilled') setPayouts(r0.value);
      else setPayoutsErr(messageFor(r0.reason));
      if (r1.status === 'fulfilled') setErrors(r1.value.rows ?? []);
      else setErrorsErr(messageFor(r1.reason));
      if (r2.status === 'fulfilled') setActions(r2.value.rows ?? []);
      else setActionsErr(messageFor(r2.reason));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totalPending = payouts?.pending_summary.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const totalErrors = errors?.reduce((sum, e) => sum + e.count, 0) ?? 0;
  const totalActions = actions?.length ?? 0;

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
            <InboxIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Inbox
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Tudo que precisa da sua atenção, num só lugar.
            </p>
          </div>
        </div>
        {loading && <Spinner size="sm" />}
      </header>

      {/* Quick-glance counters */}
      <section className="grid gap-3 sm:grid-cols-3">
        <CounterTile
          icon={HandshakeIcon}
          label="Payouts pendentes"
          count={totalPending}
          tone={totalPending > 0 ? 'warning' : 'lime'}
          to="/affiliates?tab=payouts"
        />
        <CounterTile
          icon={AlertTriangleIcon}
          label="Erros (7d)"
          count={totalErrors}
          tone={totalErrors > 0 ? 'warning' : 'lime'}
          to="/reliability"
        />
        <CounterTile
          icon={ActivityIcon}
          label="Ações recentes"
          count={totalActions}
          tone="neutral"
          to="/ops/audit"
        />
      </section>

      {/* ─── Affiliate payouts pending ─────────────────────────────────── */}
      <Section
        icon={HandshakeIcon}
        title="Payouts de afiliado pendentes"
        subtitle="Marque como pago após processar no banco/Wise"
        rightSlot={
          totalPending > 0 ? (
            <Link
              to="/affiliates?tab=payouts"
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              Ver Payouts →
            </Link>
          ) : null
        }
      >
        {payoutsErr ? (
          <EmptyHint variant="warning">{payoutsErr}</EmptyHint>
        ) : !payouts ? (
          <SectionLoading />
        ) : payouts.pending_by_affiliate.length === 0 ? (
          <EmptyHint variant="ok">Tudo em dia. Nenhum payout pendente.</EmptyHint>
        ) : (
          <ul className="divide-y divide-navy-50">
            {payouts.pending_by_affiliate.slice(0, 6).map((aff) => (
              <li
                key={aff.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-navy-700">{aff.code}</span>
                    {aff.name && (
                      <span className="truncate text-navy-500">{aff.name}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {aff.count} item{aff.count === 1 ? '' : 's'} ·{' '}
                    {aff.oldest_ready_at
                      ? `mais antigo: ${formatRelativeTime(aff.oldest_ready_at)}`
                      : 'sem timestamp'}
                  </div>
                </div>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
                  {aff.currency} {(aff.cents / 100).toFixed(2)}
                </span>
              </li>
            ))}
            {payouts.pending_by_affiliate.length > 6 && (
              <li className="pt-2 text-center text-[11px] text-navy-400">
                +{payouts.pending_by_affiliate.length - 6} mais —{' '}
                <Link
                  to="/affiliates?tab=payouts"
                  className="text-brand-600 hover:underline"
                >
                  ver todos
                </Link>
              </li>
            )}
          </ul>
        )}
      </Section>

      {/* ─── Top errors ────────────────────────────────────────────────── */}
      <Section
        icon={AlertTriangleIcon}
        title="Top erros (últimos 7 dias)"
        subtitle="Erros mais frequentes do app"
        rightSlot={
          <Link
            to="/reliability"
            className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
          >
            Reliability →
          </Link>
        }
      >
        {errorsErr ? (
          <EmptyHint variant="warning">{errorsErr}</EmptyHint>
        ) : !errors ? (
          <SectionLoading />
        ) : errors.length === 0 ? (
          <EmptyHint variant="ok">Sem erros recentes.</EmptyHint>
        ) : (
          <ul className="divide-y divide-navy-50">
            {errors.slice(0, 8).map((err, i) => (
              <li key={`${err.message}-${i}`} className="flex items-start gap-3 py-2 text-sm">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[12px] text-navy-700" title={err.message}>
                    {err.message}
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {formatNumber(err.count)} ocorrências · {formatNumber(err.users)} users · last seen{' '}
                    {formatRelativeTime(err.last_seen)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ─── Recent admin actions ──────────────────────────────────────── */}
      <Section
        icon={ScrollTextIcon}
        title="Ações administrativas recentes"
        subtitle="Audit log das últimas 25 ações"
        rightSlot={
          <Link
            to="/ops/audit"
            className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
          >
            Audit completo →
          </Link>
        }
      >
        {actionsErr ? (
          <EmptyHint variant="warning">{actionsErr}</EmptyHint>
        ) : !actions ? (
          <SectionLoading />
        ) : actions.length === 0 ? (
          <EmptyHint variant="ok">Sem ações recentes.</EmptyHint>
        ) : (
          <ul className="divide-y divide-navy-50">
            {actions.slice(0, 8).map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-2 text-sm">
                <span
                  className={[
                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                    a.result === 'forbidden' || a.result === 'error'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-brand-50 text-brand-600',
                  ].join(' ')}
                >
                  {a.result === 'forbidden' || a.result === 'error' ? (
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ActivityIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] text-navy-700">{a.action}</span>
                    {a.result && a.result !== 'ok' && (
                      <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-navy-500">
                        {a.result}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {a.actor_email ?? 'system'} · {formatRelativeTime(a.occurred_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ─── Coming-soon sections ──────────────────────────────────────── */}
      <Section
        icon={BellIcon}
        title="Anomalias detectadas (V2)"
        subtitle="IA monitora KPIs e cria alerts quando algo destoa"
      >
        <EmptyHint variant="info">
          Vai aparecer quando o W7.5 (AI anomaly detection) estiver ligado.
        </EmptyHint>
      </Section>

      <Section
        icon={SparklesIcon}
        title="App Store / Play reviews (V2)"
        subtitle="Reviews novas com sentiment + prioridade de resposta"
      >
        <EmptyHint variant="info">
          Precisa integração com App Store Connect API + Play Console.
        </EmptyHint>
      </Section>

      <Section
        icon={ShieldCheckIcon}
        title="Refund requests (V2)"
        subtitle="Pedidos de reembolso pendentes de aprovação"
      >
        <EmptyHint variant="info">
          Precisa pipeline de refunds (RPC nova `admin_pending_refunds`).
        </EmptyHint>
      </Section>

      <Section
        icon={HandshakeIcon}
        title="Aplicações de afiliado (V2)"
        subtitle="Novos afiliados aguardando aprovação (signup self-serve)"
      >
        <EmptyHint variant="info">
          Habilita quando o onboarding self-serve for ativado.
        </EmptyHint>
      </Section>

      <RawDataPanel
        page="inbox"
        sources={[
          {
            rpc: 'admin_affiliate_payout_planning',
            params: {},
            data: payouts,
            ...(payoutsErr ? { note: payoutsErr } : {}),
          },
          {
            rpc: 'admin_top_errors',
            params: { p_period_days: 7, p_limit: 10 },
            data: errors,
            ...(errorsErr ? { note: errorsErr } : {}),
          },
          {
            rpc: 'admin_recent_admin_actions',
            params: { p_limit: 25 },
            data: actions,
            ...(actionsErr ? { note: actionsErr } : {}),
          },
        ]}
      />
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────

function CounterTile({
  icon: Icon,
  label,
  count,
  tone,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
  to: string;
}) {
  const TONE: Record<typeof tone, { bg: string; text: string; ring: string }> = {
    brand: { bg: 'bg-brand-50', text: 'text-brand-600', ring: 'hover:ring-brand-200' },
    lime: { bg: 'bg-lime-50', text: 'text-lime-600', ring: 'hover:ring-lime-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'hover:ring-amber-200' },
    neutral: { bg: 'bg-navy-50', text: 'text-navy-600', ring: 'hover:ring-navy-200' },
  };
  const t = TONE[tone];
  return (
    <Link
      to={to}
      className={`ozly-card flex items-center gap-3 bg-white p-4 transition-shadow hover:shadow-md hover:ring-1 ${t.ring}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
          {label}
        </div>
        <div className={`mt-0.5 text-2xl font-semibold ${t.text}`}>
          {formatNumber(count)}
        </div>
      </div>
    </Link>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  rightSlot,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="ozly-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-navy-700">{title}</h2>
            {subtitle && <p className="text-[11px] text-navy-400">{subtitle}</p>}
          </div>
        </div>
        {rightSlot}
      </div>
      {children}
    </Card>
  );
}

function SectionLoading() {
  return (
    <div className="flex items-center gap-2 py-4 text-xs text-navy-400">
      <Spinner size="sm" />
      Carregando…
    </div>
  );
}

function EmptyHint({
  variant,
  children,
}: {
  variant: 'ok' | 'info' | 'warning';
  children: React.ReactNode;
}) {
  const cls =
    variant === 'ok'
      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
      : variant === 'warning'
        ? 'border-amber-200 bg-amber-50/60 text-amber-700'
        : 'border-navy-100 bg-navy-50/60 text-navy-500';
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${cls}`}>{children}</div>
  );
}

function messageFor(reason: unknown): string {
  if (reason instanceof RpcError) {
    if (reason.code === '42883' || reason.message.includes('does not exist')) {
      return 'RPC não disponível neste ambiente.';
    }
    if (reason.code === '42501') return 'Sem permissão pra acessar.';
    return reason.message;
  }
  if (reason instanceof Error) return reason.message;
  return 'Erro desconhecido';
}
