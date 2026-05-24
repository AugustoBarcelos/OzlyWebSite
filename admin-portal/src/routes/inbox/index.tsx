import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@tremor/react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowDownRightIcon,
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
 *   - Refund queue (real, via admin_pending_refunds — proxy via trials expirados)
 *   - App Store reviews / Anomalies / Affiliate approvals (V2 placeholders)
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

interface RefundRowPreview {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  trial_ends_at: string | null;
}
interface RefundsResponse {
  period_days: number;
  count: number;
  rows: RefundRowPreview[];
}

interface AppStoreLowRatingRow {
  review_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_nickname: string | null;
  territory: string | null;
  created_at_apple: string;
}
interface AppStoreLowRatingResp {
  count: number;
  rows: AppStoreLowRatingRow[];
  last_sync_at: string | null;
  note: string | null;
}

interface PendingCancellationRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  store: string | null;
  period_type: string | null;
  monthly_price_aud: number | null;
  current_period_end: string;
  days_until_end: number;
  last_seen_at: string | null;
}
interface PendingCancellationsResp {
  window_days: number;
  count: number;
  potential_mrr_loss_aud: number;
  rows: PendingCancellationRow[];
}

export function InboxPage() {
  const [payouts, setPayouts] = useState<PayoutPlanning | null>(null);
  const [payoutsErr, setPayoutsErr] = useState<string | null>(null);

  const [errors, setErrors] = useState<ErrorRow[] | null>(null);
  const [errorsErr, setErrorsErr] = useState<string | null>(null);

  const [actions, setActions] = useState<ActionRow[] | null>(null);
  const [actionsErr, setActionsErr] = useState<string | null>(null);

  const [refunds, setRefunds] = useState<RefundsResponse | null>(null);
  const [refundsErr, setRefundsErr] = useState<string | null>(null);

  const [lowRatingReviews, setLowRatingReviews] = useState<AppStoreLowRatingResp | null>(null);
  const [lowRatingErr, setLowRatingErr] = useState<string | null>(null);

  const [cancellations, setCancellations] = useState<PendingCancellationsResp | null>(null);
  const [cancellationsErr, setCancellationsErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.allSettled([
      callRpc<PayoutPlanning>('admin_affiliate_payout_planning', {}),
      callRpc<ErrorsResponse>('admin_top_errors', { p_period_days: 7, p_limit: 10 }),
      callRpc<ActionsResponse>('admin_recent_admin_actions', { p_limit: 25 }),
      callRpc<RefundsResponse>('admin_pending_refunds', { p_period_days: 30 }),
      callRpc<AppStoreLowRatingResp>('admin_app_store_recent_low_rating', { p_days: 30, p_max_rating: 3 }),
      callRpc<PendingCancellationsResp>('admin_pending_cancellations', { p_window_days: 30 }),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1, r2, r3, r4, r5] = results;
      if (r0.status === 'fulfilled') setPayouts(r0.value);
      else setPayoutsErr(messageFor(r0.reason));
      if (r1.status === 'fulfilled') setErrors(r1.value.rows ?? []);
      else setErrorsErr(messageFor(r1.reason));
      if (r2.status === 'fulfilled') setActions(r2.value.rows ?? []);
      else setActionsErr(messageFor(r2.reason));
      if (r3.status === 'fulfilled') setRefunds(r3.value);
      else setRefundsErr(messageFor(r3.reason));
      if (r4.status === 'fulfilled') setLowRatingReviews(r4.value);
      else setLowRatingErr(messageFor(r4.reason));
      if (r5.status === 'fulfilled') setCancellations(r5.value);
      else setCancellationsErr(messageFor(r5.reason));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totalPending = payouts?.pending_summary.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const totalErrors = errors?.reduce((sum, e) => sum + e.count, 0) ?? 0;
  const totalActions = actions?.length ?? 0;
  const totalRefunds = refunds?.count ?? 0;
  const totalCancellations = cancellations?.count ?? 0;
  const mrrAtRisk = cancellations?.potential_mrr_loss_aud ?? 0;

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
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CounterTile
          icon={ArrowDownRightIcon}
          label="Cancelando (30d)"
          count={totalCancellations}
          tone={totalCancellations > 0 ? 'warning' : 'lime'}
          to="#cancellations-pending"
        />
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
          icon={ShieldCheckIcon}
          label="Refunds (30d)"
          count={totalRefunds}
          tone={totalRefunds > 0 ? 'warning' : 'lime'}
          to="/inbox/refunds"
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

      {/* ─── Quick links to specialist queues ──────────────────────────── */}
      <Section
        icon={BellIcon}
        title="Anomalias detectadas"
        subtitle="Regras client-side sobre KPIs (payouts, churn, error rate, conv)"
        rightSlot={
          <Link
            to="/inbox/alerts"
            className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
          >
            Abrir alerts →
          </Link>
        }
      >
        <EmptyHint variant="info">
          Avaliação completa em <Link to="/inbox/alerts" className="text-brand-600 underline">/inbox/alerts</Link>. AI adaptive (W7.5) entra depois.
        </EmptyHint>
      </Section>

      <Section
        icon={SparklesIcon}
        title="App Store reviews ≤ 3★ (30d)"
        subtitle="Cache atualizado a cada 6h pelo cron appstore-reviews-cache"
        rightSlot={
          <Link
            to="/inbox/reviews"
            className={
              (lowRatingReviews?.count ?? 0) > 0
                ? 'rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50'
                : 'rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700'
            }
          >
            Ver reviews →
          </Link>
        }
      >
        {lowRatingErr ? (
          <EmptyHint variant="warning">{lowRatingErr}</EmptyHint>
        ) : !lowRatingReviews ? (
          <SectionLoading />
        ) : lowRatingReviews.note ? (
          <EmptyHint variant="info">{lowRatingReviews.note}</EmptyHint>
        ) : lowRatingReviews.rows.length === 0 ? (
          <EmptyHint variant="ok">
            Nenhum review ≤ 3★ nos últimos 30 dias.
            {lowRatingReviews.last_sync_at && (
              <> Última sync {formatRelativeTime(lowRatingReviews.last_sync_at)}.</>
            )}
          </EmptyHint>
        ) : (
          <ul className="divide-y divide-navy-50">
            {lowRatingReviews.rows.slice(0, 5).map((r) => (
              <li key={r.review_id} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-amber-600">
                    {'★'.repeat(r.rating)}
                    <span className="text-navy-200">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                  <span className="text-[11px] text-navy-400">
                    {r.reviewer_nickname ?? '—'} · {r.territory ?? '—'} ·{' '}
                    {formatRelativeTime(r.created_at_apple)}
                  </span>
                </div>
                {r.title && (
                  <div className="mt-0.5 truncate font-medium text-navy-700" title={r.title}>
                    {r.title}
                  </div>
                )}
                {r.body && (
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-navy-500">{r.body}</p>
                )}
              </li>
            ))}
            {lowRatingReviews.rows.length > 5 && (
              <li className="pt-2 text-center text-[11px] text-navy-400">
                +{lowRatingReviews.rows.length - 5} mais —{' '}
                <Link to="/inbox/reviews" className="text-brand-600 hover:underline">
                  ver todos
                </Link>
              </li>
            )}
          </ul>
        )}
      </Section>

      {/* ─── Cancellations pending (save-me queue) ──────────────────────── */}
      <Section
        icon={ArrowDownRightIcon}
        title="Cancelando — janela de save (30d)"
        subtitle={
          totalCancellations > 0
            ? `${totalCancellations} pagante${totalCancellations === 1 ? '' : 's'} desligou auto-renew · A$${mrrAtRisk.toFixed(2)} de MRR em risco`
            : 'Pagantes que desligaram auto-renew mas ainda têm acesso até o fim do período.'
        }
        rightSlot={
          totalCancellations > 0 ? (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
              MRR em risco: A${mrrAtRisk.toFixed(2)}
            </span>
          ) : null
        }
      >
        {cancellationsErr ? (
          <EmptyHint variant="warning">{cancellationsErr}</EmptyHint>
        ) : !cancellations ? (
          <SectionLoading />
        ) : cancellations.rows.length === 0 ? (
          <EmptyHint variant="ok">
            Ninguém desligando renovação nos próximos 30d. Bom sinal.
          </EmptyHint>
        ) : (
          <ul id="cancellations-pending" className="divide-y divide-navy-50">
            {cancellations.rows.slice(0, 8).map((r) => {
              const days = Math.max(0, Math.round(r.days_until_end));
              const urgency =
                days <= 3 ? 'critical' : days <= 7 ? 'warning' : 'soft';
              return (
                <li
                  key={r.user_id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-navy-700">
                        {r.full_name || r.email || r.user_id.slice(0, 8)}
                      </span>
                      {r.plan && (
                        <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-navy-500">
                          {r.plan}
                        </span>
                      )}
                      <span
                        className={
                          urgency === 'critical'
                            ? 'rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800'
                            : urgency === 'warning'
                              ? 'rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800'
                              : 'rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium text-navy-500'
                        }
                      >
                        {days === 0
                          ? 'vence hoje'
                          : days === 1
                            ? 'vence amanhã'
                            : `vence em ${days}d`}
                      </span>
                    </div>
                    <div className="text-[11px] text-navy-400">
                      {r.email ?? '—'}
                      {r.monthly_price_aud != null && (
                        <> · A${r.monthly_price_aud.toFixed(2)}/mo</>
                      )}
                      {r.store && <> · {r.store.replace('_', ' ')}</>}
                    </div>
                  </div>
                  <Link
                    to={`/users/${r.user_id}`}
                    className="rounded bg-navy-50 px-2 py-0.5 text-xs text-navy-600 hover:bg-navy-100"
                  >
                    save →
                  </Link>
                </li>
              );
            })}
            {cancellations.rows.length > 8 && (
              <li className="pt-2 text-center text-[11px] text-navy-400">
                +{cancellations.rows.length - 8} mais —{' '}
                <Link
                  to="/users?lifecycle=paying"
                  className="text-brand-600 hover:underline"
                >
                  ver na lista
                </Link>
              </li>
            )}
          </ul>
        )}
      </Section>

      {/* ─── Refund queue (real — MVP via trials expirados) ────────────── */}
      <Section
        icon={ShieldCheckIcon}
        title="Refund queue"
        subtitle="Trials expirados últimos 30d — candidatos a win-back ou refund"
        rightSlot={
          totalRefunds > 0 ? (
            <Link
              to="/inbox/refunds"
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              Ver Refunds →
            </Link>
          ) : (
            <Link
              to="/inbox/refunds"
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
            >
              Abrir queue →
            </Link>
          )
        }
      >
        {refundsErr ? (
          <EmptyHint variant="warning">{refundsErr}</EmptyHint>
        ) : !refunds ? (
          <SectionLoading />
        ) : refunds.rows.length === 0 ? (
          <EmptyHint variant="ok">Nenhum trial expirou nos últimos 30 dias.</EmptyHint>
        ) : (
          <ul className="divide-y divide-navy-50">
            {refunds.rows.slice(0, 6).map((r) => (
              <li
                key={r.user_id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-navy-700">
                      {r.full_name || r.email || r.user_id.slice(0, 8)}
                    </span>
                    {r.plan && (
                      <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-navy-500">
                        {r.plan}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {r.email ?? '—'}
                    {r.trial_ends_at && (
                      <> · expirou {formatRelativeTime(r.trial_ends_at)}</>
                    )}
                  </div>
                </div>
                <Link
                  to={`/users/${r.user_id}`}
                  className="rounded bg-navy-50 px-2 py-0.5 text-xs text-navy-600 hover:bg-navy-100"
                >
                  ver
                </Link>
              </li>
            ))}
            {refunds.rows.length > 6 && (
              <li className="pt-2 text-center text-[11px] text-navy-400">
                +{refunds.rows.length - 6} mais —{' '}
                <Link to="/inbox/refunds" className="text-brand-600 hover:underline">
                  ver todos
                </Link>
              </li>
            )}
          </ul>
        )}
      </Section>

      <Section
        icon={HandshakeIcon}
        title="Aplicações de afiliado"
        subtitle="Afiliados com status=pending aguardando aprovação"
        rightSlot={
          <Link
            to="/inbox/affiliates"
            className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
          >
            Abrir queue →
          </Link>
        }
      >
        <EmptyHint variant="info">
          Triage em <Link to="/inbox/affiliates" className="text-brand-600 underline">/inbox/affiliates</Link>. Fica vazio até o form público de signup ser ativado.
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
          {
            rpc: 'admin_pending_refunds',
            params: { p_period_days: 30 },
            data: refunds,
            ...(refundsErr ? { note: refundsErr } : {}),
          },
          {
            rpc: 'admin_app_store_recent_low_rating',
            params: { p_days: 30, p_max_rating: 3 },
            data: lowRatingReviews,
            ...(lowRatingErr ? { note: lowRatingErr } : {}),
          },
          {
            rpc: 'admin_pending_cancellations',
            params: { p_window_days: 30 },
            data: cancellations,
            ...(cancellationsErr ? { note: cancellationsErr } : {}),
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
