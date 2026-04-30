import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title,
  Text,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { CreateAffiliateModal } from './CreateAffiliateModal';
import { AffiliateDetailPanel } from './AffiliateDetailPanel';
import { PendingPayoutsCard } from './PendingPayoutsCard';
import type { BonusTier, BonusPeriod } from './tierMath';

/**
 * /ops/affiliates — vendor / sales partner management.
 *
 * Two stacked sections:
 *   1. Affiliates table: every affiliate, lifetime conversion counts, payable
 *      amount waiting on a manual payout.
 *   2. Conversions table: per-affiliate drill-down (when an affiliate row is
 *      clicked) showing each referred user, status, and a "Mark paid" button
 *      for commission_ready rows.
 *
 * Backed by:
 *   - admin_affiliates_list()
 *   - admin_affiliate_conversions(affiliate_id, status?)
 *   - admin_mark_conversion_paid(conversion_id, note?)
 *
 * The actual money movement happens outside this UI (manual PIX/transfer);
 * this surface just records that the payment was made.
 */

interface AffiliateRow {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  pay_id: string | null;
  commission_cents: number | null;
  currency: string;
  active: boolean;
  notes: string | null;
  bonus_tiers: BonusTier[];
  bonus_period: BonusPeriod;
  signups: number;
  signups_30d: number;
  purchases: number;
  renewals: number;
  commission_ready: number;
  paid_count: number;
  pending_count: number;
  payable_cents: number;
  has_pending_payout: boolean;
  total_paid_cents: number;
  last_signup_at: string | null;
  last_paid_at: string | null;
  current_period_count: number;
  created_at: string;
}

interface ConversionRow {
  id: string;
  affiliate_id: string;
  affiliate_code: string | null;
  referred_user_id: string;
  signup_at: string;
  first_purchase_at: string | null;
  first_renewal_at: string | null;
  commission_cents: number | null;
  currency: string | null;
  status: string;
}

const STATUS_TONE: Record<string, 'emerald' | 'amber' | 'slate' | 'sky'> = {
  signup: 'slate',
  subscribed: 'sky',
  commission_ready: 'amber',
  paid: 'emerald',
};

function formatMoney(cents: number, currency: string): string {
  const amt = (cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${amt}`;
}

export function AffiliatesPage() {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [selected, setSelected] = useState<AffiliateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [convLoading, setConvLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending_payout'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAffiliates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callRpc<{ rows: AffiliateRow[] }>(
        'admin_affiliates_list',
        {},
      );
      setAffiliates(data.rows ?? []);
    } catch (e) {
      setError(e instanceof RpcError ? e.message : 'Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversions = useCallback(async (affiliateId: string) => {
    setConvLoading(true);
    try {
      const data = await callRpc<{ rows: ConversionRow[] }>(
        'admin_affiliate_conversions',
        { p_affiliate_id: affiliateId, p_limit: 200 },
      );
      setConversions(data.rows ?? []);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Failed to load conversions',
        description: e instanceof RpcError ? e.message : 'Unknown error',
      });
    } finally {
      setConvLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAffiliates();
  }, [loadAffiliates]);

  useEffect(() => {
    if (selected) {
      void loadConversions(selected.id);
    } else {
      setConversions([]);
    }
  }, [selected, loadConversions]);

  async function deleteAffiliate(row: AffiliateRow) {
    const msg =
      row.signups > 0
        ? `Afiliado "${row.code}" tem ${row.signups} conversão(ões). Vai ser DESATIVADO (soft-delete) — histórico preservado pra payouts. Confirma?`
        : `Afiliado "${row.code}" sem conversões. Vai ser REMOVIDO permanentemente. Confirma?`;
    if (!window.confirm(msg)) return;
    setDeleting(row.id);
    try {
      const r = await callRpc<{ success: boolean; mode: 'hard' | 'soft' }>(
        'admin_delete_affiliate',
        { p_id: row.id },
      );
      toast({
        variant: 'success',
        title: r.mode === 'hard' ? 'Afiliado removido' : 'Afiliado desativado',
        description:
          r.mode === 'hard'
            ? `${row.code} excluído (sem histórico).`
            : `${row.code} marcado inativo. Histórico preservado.`,
      });
      if (selected?.id === row.id) setSelected(null);
      void loadAffiliates();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao deletar',
        description: e instanceof RpcError ? e.message : 'Unknown error',
      });
    } finally {
      setDeleting(null);
    }
  }

  async function markPaid(conversionId: string) {
    setMarking(conversionId);
    try {
      await callRpc('admin_mark_conversion_paid', {
        p_conversion_id: conversionId,
        p_note: 'Marked paid via portal',
      });
      toast({ variant: 'success', title: 'Conversion marked as paid' });
      // Refresh both tables + payout planning
      void loadAffiliates();
      if (selected) void loadConversions(selected.id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Failed to mark paid',
        description: e instanceof RpcError ? e.message : 'Unknown error',
      });
    } finally {
      setMarking(null);
    }
  }

  const filteredAffiliates = affiliates.filter((a) => {
    if (filter === 'active') return a.active;
    if (filter === 'pending_payout') return a.has_pending_payout;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Title>Affiliates</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Vendor / partner program · payouts are manual (PIX or transfer)
          </Text>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          + Novo afiliado
        </button>
      </div>

      <CreateAffiliateModal
        open={createOpen || !!editing}
        editing={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          void loadAffiliates();
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Card de gestão de payouts (pagar agora + histórico 12m) */}
      <PendingPayoutsCard
        refreshKey={refreshKey}
        onSelectAffiliate={(id) => {
          const found = affiliates.find((a) => a.id === id);
          if (found) setSelected(found);
        }}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Text className="font-medium text-navy-700">Affiliates</Text>
            {loading && <Spinner size="sm" />}
            <span className="text-xs text-navy-400">
              ({filteredAffiliates.length} de {affiliates.length})
            </span>
          </div>
          {/* Filter */}
          <div className="inline-flex rounded-md border border-navy-100 bg-white p-0.5 text-xs">
            {(
              [
                { v: 'all', label: 'Todos' },
                { v: 'active', label: 'Ativos' },
                { v: 'pending_payout', label: '$ pendente' },
              ] as const
            ).map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setFilter(f.v)}
                className={
                  filter === f.v
                    ? 'rounded bg-brand-500 px-2.5 py-1 font-semibold text-white'
                    : 'rounded px-2.5 py-1 text-navy-500 hover:bg-navy-50'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        )}
        {!loading && filteredAffiliates.length === 0 ? (
          <div className="py-10 text-center text-sm text-navy-400">
            {affiliates.length === 0 ? 'Nenhum afiliado ainda — clique em "+ Novo afiliado".' : 'Nenhum afiliado bate com o filtro atual.'}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="text-right">Signups (30d)</TableHeaderCell>
                  <TableHeaderCell className="text-right">Pipeline</TableHeaderCell>
                  <TableHeaderCell className="text-right">Pagar agora</TableHeaderCell>
                  <TableHeaderCell className="text-right">Pago lifetime</TableHeaderCell>
                  <TableHeaderCell>Última atividade</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAffiliates.map((a) => (
                  <TableRow
                    key={a.id}
                    className={
                      selected?.id === a.id ? 'bg-brand-50/40' : ''
                    }
                  >
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-navy-700">
                        {a.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-navy-700">{a.name ?? '—'}</div>
                      <div className="text-[11px] text-navy-300">{a.email ?? a.pay_id ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      {a.active ? (
                        <Badge color="emerald" size="xs">active</Badge>
                      ) : (
                        <Badge color="slate" size="xs">inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="text-navy-700">{formatNumber(a.signups)}</div>
                      <div className="text-[10px] text-navy-300">
                        {a.signups_30d > 0 ? `+${a.signups_30d} em 30d` : 'sem 30d'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.pending_count > 0 ? (
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">
                          {a.pending_count}
                        </span>
                      ) : (
                        <span className="text-navy-300">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {a.payable_cents > 0 ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                          {formatMoney(a.payable_cents, a.currency)}
                        </span>
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.total_paid_cents > 0
                        ? formatMoney(a.total_paid_cents, a.currency)
                        : <span className="text-navy-300">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-navy-500">
                      {a.last_signup_at ? (
                        <>
                          <div>signup {formatRelativeTime(a.last_signup_at)}</div>
                          {a.last_paid_at && (
                            <div className="text-[10px] text-navy-300">
                              pago {formatRelativeTime(a.last_paid_at)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-navy-300">sem signups</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          aria-label={`Editar ${a.code}`}
                          title="Editar afiliado"
                          className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteAffiliate(a);
                          }}
                          disabled={deleting === a.id}
                          aria-label={`Deletar ${a.code}`}
                          title="Deletar afiliado"
                          className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deleting === a.id ? '…' : '🗑'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(selected?.id === a.id ? null : a);
                          }}
                          className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                        >
                          {selected?.id === a.id ? 'Hide' : 'View'}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {selected && (
        <AffiliateDetailPanel
          affiliateId={selected.id}
          code={selected.code}
          name={selected.name}
          email={selected.email}
          pay_id={selected.pay_id}
          currency={selected.currency}
          baseCents={selected.commission_cents ?? 500}
          bonusTiers={selected.bonus_tiers}
          bonusPeriod={selected.bonus_period}
          currentPeriodCount={selected.current_period_count}
          onEdit={() => setEditing(selected)}
          conversionsTable={
            <Card>
              <div className="flex items-center justify-between">
                <Text className="font-medium text-navy-700">Conversions</Text>
                {convLoading && <Spinner size="sm" />}
              </div>
              {!convLoading && conversions.length === 0 ? (
                <div className="py-10 text-center text-sm text-navy-400">
                  Nenhuma conversion ainda pra esse afiliado.
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Referred user</TableHeaderCell>
                        <TableHeaderCell>Signed up</TableHeaderCell>
                        <TableHeaderCell>First purchase</TableHeaderCell>
                        <TableHeaderCell>First renewal</TableHeaderCell>
                        <TableHeaderCell className="text-right">Commission</TableHeaderCell>
                        <TableHeaderCell></TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conversions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge color={STATUS_TONE[c.status] ?? 'slate'} size="xs">
                              {c.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {c.referred_user_id.slice(0, 8)}…
                          </TableCell>
                          <TableCell>{formatRelativeTime(c.signup_at)}</TableCell>
                          <TableCell>
                            {c.first_purchase_at ? formatRelativeTime(c.first_purchase_at) : '—'}
                          </TableCell>
                          <TableCell>
                            {c.first_renewal_at ? formatRelativeTime(c.first_renewal_at) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {c.commission_cents && c.currency
                              ? formatMoney(c.commission_cents, c.currency)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {c.status === 'commission_ready' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void markPaid(c.id);
                                }}
                                disabled={marking === c.id}
                                className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {marking === c.id ? 'Marking…' : 'Mark paid'}
                              </button>
                            ) : c.status === 'paid' ? (
                              <span className="text-[11px] text-navy-300">paid</span>
                            ) : (
                              <span className="text-[11px] text-navy-300">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          }
        />
      )}
    </div>
  );
}
