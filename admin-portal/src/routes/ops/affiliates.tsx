import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { ExternalLinkIcon, HandshakeIcon } from '@/components/Icons';
import { HubPlaceholder } from '@/components/HubPlaceholder';
import { CreateAffiliateModal } from './CreateAffiliateModal';
import { AffiliateDetailPanel } from './AffiliateDetailPanel';
import { AffiliateInsightsCard } from './AffiliateInsightsCard';
import { PendingPayoutsCard } from './PendingPayoutsCard';
import { PayoutsHistoryCard } from './PayoutsHistoryCard';
import type { BonusPeriod, RetentionBonus, VolumeTier } from './tierMath';

/**
 * /affiliates — Affiliates Hub (W3.5).
 *
 * Reorganized as URL-persisted tabs while preserving every existing component
 * and RPC contract:
 *   - Overview: AffiliateInsightsCard (KPIs + insights)
 *   - List:     full affiliates table with search/filter/sort + create + edit + delete
 *   - Payouts:  PendingPayoutsCard + PayoutsHistoryCard (alert + Mark-as-paid manual)
 *   - Approvals: placeholder for V2 (self-serve signup queue)
 *
 * Backed by:
 *   - admin_affiliates_list()
 *   - admin_affiliate_conversions(affiliate_id, status?)
 *   - admin_mark_conversion_paid(conversion_id, note?)
 *   - admin_delete_affiliate(id)
 *   - admin_affiliate_payout_planning() (via PendingPayoutsCard)
 *   - admin_bulk_pay_affiliate(...) (via PendingPayoutsCard)
 */

interface AffiliateRow {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  pay_id: string | null;
  commission_cents: number | null;
  currency: string;
  active: boolean;
  notes: string | null;
  bonus_tiers: VolumeTier[];
  bonus_period: BonusPeriod;
  retention_bonuses: RetentionBonus[];
  volume_awards_pending: number;
  volume_awards_cents: number;
  milestone_pending: number;
  milestone_cents: number;
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

type TabKey = 'overview' | 'list' | 'payouts' | 'approvals';
const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'list', label: 'Affiliates' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'approvals', label: 'Approvals' },
];

function isTabKey(v: string | null): v is TabKey {
  return v === 'overview' || v === 'list' || v === 'payouts' || v === 'approvals';
}

export function AffiliatesPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabKey = isTabKey(tabParam) ? tabParam : 'overview';

  const setTab = useCallback(
    (next: TabKey) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'overview') p.delete('tab');
          else p.set('tab', next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

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
  const [opening, setOpening] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending_payout'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<
    'code' | 'signups_30d' | 'payable_cents' | 'total_paid_cents' | 'last_signup_at'
  >('payable_cents');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
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

  const loadConversions = useCallback(
    async (affiliateId: string) => {
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
    },
    [toast],
  );

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

  async function openAsAffiliate(row: AffiliateRow) {
    setOpening(row.id);
    try {
      const result = await callRpc<{
        ok: boolean;
        reason?: string;
        magic_url?: string;
      }>('admin_open_affiliate_dashboard', { p_code: row.code });
      if (!result.ok || !result.magic_url) {
        toast({
          variant: 'error',
          title: 'Não consegui entrar',
          description: result.reason ?? 'unknown',
        });
        return;
      }
      window.open(result.magic_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Failed to open dashboard',
        description: e instanceof RpcError ? e.message : 'Unknown error',
      });
    } finally {
      setOpening(null);
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

  const filteredAffiliates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = affiliates.filter((a) => {
      if (filter === 'active' && !a.active) return false;
      if (filter === 'pending_payout' && !a.has_pending_payout) return false;
      if (q.length > 0) {
        const haystack = [a.code, a.name, a.email, a.pay_id]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const sign = sortDir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      let av: string | number | null;
      let bv: string | number | null;
      switch (sortKey) {
        case 'code':
          return sign * a.code.localeCompare(b.code);
        case 'signups_30d':
          av = a.signups_30d;
          bv = b.signups_30d;
          break;
        case 'payable_cents':
          av = a.payable_cents;
          bv = b.payable_cents;
          break;
        case 'total_paid_cents':
          av = a.total_paid_cents;
          bv = b.total_paid_cents;
          break;
        case 'last_signup_at':
          av = a.last_signup_at ? new Date(a.last_signup_at).getTime() : 0;
          bv = b.last_signup_at ? new Date(b.last_signup_at).getTime() : 0;
          break;
      }
      return sign * (((av as number) ?? 0) - ((bv as number) ?? 0));
    });
    return sorted;
  }, [affiliates, filter, search, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'code' ? 'asc' : 'desc');
    }
  }

  function sortIndicator(key: typeof sortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  // Aggregate KPIs for Overview banner
  const totals = useMemo(() => {
    let active = 0;
    let pendingPayouts = 0;
    let payableCents = 0;
    let totalPaidCents = 0;
    let signups30d = 0;
    let last30dActive = 0;
    for (const a of affiliates) {
      if (a.active) active += 1;
      if (a.has_pending_payout) pendingPayouts += 1;
      payableCents += a.payable_cents;
      totalPaidCents += a.total_paid_cents;
      signups30d += a.signups_30d;
      if (a.signups_30d > 0) last30dActive += 1;
    }
    return {
      active,
      pendingPayouts,
      payableCents,
      totalPaidCents,
      signups30d,
      last30dActive,
      totalCount: affiliates.length,
    };
  }, [affiliates]);

  const headerCurrency = affiliates[0]?.currency ?? 'AUD';

  return (
    <div className="space-y-6">
      {/* Header — consistent with Cockpit / other hubs */}
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
              Affiliates Hub
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Programa de partners — payouts manuais, comissões e bônus.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="self-start rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 md:self-end"
        >
          + Novo afiliado
        </button>
      </header>

      {/* Pending payouts alert — shown across every tab when there's money to move */}
      {!loading && totals.pendingPayouts > 0 && (
        <button
          type="button"
          onClick={() => setTab('payouts')}
          className="ozly-card flex w-full items-center gap-3 border-amber-200 bg-amber-50/80 p-3 text-left transition-colors hover:bg-amber-100"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700">
            <span aria-hidden className="text-base font-bold">!</span>
          </span>
          <div className="flex-1 text-sm">
            <div className="font-semibold text-amber-900">
              {totals.pendingPayouts} afiliado{totals.pendingPayouts === 1 ? '' : 's'} aguardando pagamento
            </div>
            <div className="text-[12px] text-amber-700">
              Total pendente: {formatMoney(totals.payableCents, headerCurrency)}. Vá pra aba Payouts pra processar.
            </div>
          </div>
          <span className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800">
            Ver Payouts →
          </span>
        </button>
      )}

      {/* Tabs nav (URL-persisted) */}
      <div role="tablist" aria-label="Affiliates sections" className="flex flex-wrap gap-1 border-b border-navy-50">
        {TABS.map((t) => {
          const active = tab === t.key;
          const showBadge = t.key === 'payouts' && totals.pendingPayouts > 0;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={[
                'relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'text-brand-700'
                  : 'text-navy-400 hover:text-navy-600',
              ].join(' ')}
            >
              {t.label}
              {showBadge && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {totals.pendingPayouts}
                </span>
              )}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-500"
                />
              )}
            </button>
          );
        })}
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

      {error && tab === 'list' && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* ─── Overview ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* KPI strip */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Afiliados ativos"
              value={loading ? null : totals.active}
              hint={`de ${totals.totalCount} total`}
              tone="brand"
            />
            <KpiTile
              label="A pagar agora"
              value={loading ? null : totals.payableCents / 100}
              formatter={(v) =>
                v === null ? '—' : `${headerCurrency} ${v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              hint={`${totals.pendingPayouts} pendentes`}
              tone={totals.pendingPayouts > 0 ? 'warning' : 'lime'}
            />
            <KpiTile
              label="Pago lifetime"
              value={loading ? null : totals.totalPaidCents / 100}
              formatter={(v) =>
                v === null ? '—' : `${headerCurrency} ${v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              hint="todos payouts já feitos"
              tone="neutral"
            />
            <KpiTile
              label="Signups (30d)"
              value={loading ? null : totals.signups30d}
              hint={`${totals.last30dActive} afiliados ativos`}
              tone="lime"
            />
          </section>

          <AffiliateInsightsCard />
        </div>
      )}

      {/* ─── List ──────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Text className="font-medium text-navy-700">Affiliates</Text>
                {loading && <Spinner size="sm" />}
                <span className="text-xs text-navy-400">
                  ({filteredAffiliates.length} de {affiliates.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar code, nome, email…"
                  className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  style={{ minWidth: '220px' }}
                />
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
            </div>
            {!loading && filteredAffiliates.length === 0 ? (
              <div className="py-10 text-center text-sm text-navy-400">
                {affiliates.length === 0
                  ? 'Nenhum afiliado ainda — clique em "+ Novo afiliado".'
                  : 'Nenhum afiliado bate com o filtro atual.'}
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>
                        <button
                          type="button"
                          onClick={() => toggleSort('code')}
                          className="inline-flex items-center hover:text-brand-700"
                        >
                          Code{sortIndicator('code')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell className="text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('signups_30d')}
                          className="inline-flex items-center hover:text-brand-700"
                        >
                          Signups (30d){sortIndicator('signups_30d')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right">Pipeline</TableHeaderCell>
                      <TableHeaderCell className="text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('payable_cents')}
                          className="inline-flex items-center hover:text-brand-700"
                        >
                          Pagar agora{sortIndicator('payable_cents')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('total_paid_cents')}
                          className="inline-flex items-center hover:text-brand-700"
                        >
                          Pago lifetime{sortIndicator('total_paid_cents')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell>
                        <button
                          type="button"
                          onClick={() => toggleSort('last_signup_at')}
                          className="inline-flex items-center hover:text-brand-700"
                        >
                          Última atividade{sortIndicator('last_signup_at')}
                        </button>
                      </TableHeaderCell>
                      <TableHeaderCell></TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAffiliates.map((a) => (
                      <TableRow
                        key={a.id}
                        className={selected?.id === a.id ? 'bg-brand-50/40' : ''}
                      >
                        <TableCell>
                          <span className="font-mono text-xs font-medium text-navy-700">
                            {a.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-navy-700">
                            <span>{a.name ?? '—'}</span>
                            <a
                              href={`https://ozly.au/v/${a.code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Abrir landing pública de ${a.code}`}
                              title={`Abrir ozly.au/v/${a.code}`}
                              className="inline-flex h-5 w-5 items-center justify-center rounded text-navy-300 hover:bg-brand-50 hover:text-brand-700"
                            >
                              <ExternalLinkIcon className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="text-[11px] text-navy-300">
                            {a.email ?? a.pay_id ?? ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.active ? (
                            <Badge color="emerald" size="xs">active</Badge>
                          ) : (
                            <Badge color="slate" size="xs">inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="text-navy-700">
                            {formatNumber(a.signups)}
                          </div>
                          <div className="text-[10px] text-navy-300">
                            {a.signups_30d > 0
                              ? `+${a.signups_30d} em 30d`
                              : 'sem 30d'}
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
                          {a.total_paid_cents > 0 ? (
                            formatMoney(a.total_paid_cents, a.currency)
                          ) : (
                            <span className="text-navy-300">—</span>
                          )}
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
                              Edit
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
                              {deleting === a.id ? '…' : 'Del'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void openAsAffiliate(a);
                              }}
                              disabled={opening === a.id}
                              aria-label={`Entrar como ${a.code}`}
                              title="Entrar no dashboard /me/CODE como o afiliado (magic link 5min, audit logged)"
                              className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:border-amber-500 hover:bg-amber-100 disabled:opacity-50"
                            >
                              {opening === a.id ? '…' : '🔑'}
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
              phone={selected.phone}
              pay_id={selected.pay_id}
              currency={selected.currency}
              baseCents={selected.commission_cents ?? 1000}
              bonusTiers={selected.bonus_tiers}
              bonusPeriod={selected.bonus_period}
              retentionBonuses={selected.retention_bonuses ?? []}
              currentPeriodCount={selected.current_period_count}
              volumeAwardsCents={selected.volume_awards_cents}
              milestoneCents={selected.milestone_cents}
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
                                <Badge
                                  color={STATUS_TONE[c.status] ?? 'slate'}
                                  size="xs"
                                >
                                  {c.status.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {c.referred_user_id.slice(0, 8)}…
                              </TableCell>
                              <TableCell>{formatRelativeTime(c.signup_at)}</TableCell>
                              <TableCell>
                                {c.first_purchase_at
                                  ? formatRelativeTime(c.first_purchase_at)
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {c.first_renewal_at
                                  ? formatRelativeTime(c.first_renewal_at)
                                  : '—'}
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
      )}

      {/* ─── Payouts ───────────────────────────────────────────────────── */}
      {tab === 'payouts' && (
        <div className="space-y-4">
          <PendingPayoutsCard
            refreshKey={refreshKey}
            onSelectAffiliate={(id) => {
              const found = affiliates.find((a) => a.id === id);
              if (found) {
                setSelected(found);
                setTab('list');
              }
            }}
          />
          <PayoutsHistoryCard refreshKey={refreshKey} />
        </div>
      )}

      {/* ─── Approvals (V2 placeholder) ────────────────────────────────── */}
      {tab === 'approvals' && (
        <HubPlaceholder
          title="Approvals"
          subtitle="Fila de aplicações pra novos afiliados (signup self-serve) — cross-link com Inbox."
          wave="V2 — após onboarding self-serve"
          links={[
            {
              label: 'Voltar para Affiliates',
              to: '/affiliates',
              description: 'Lista completa de afiliados ativos.',
              icon: HandshakeIcon,
            },
          ]}
        />
      )}
    </div>
  );
}

interface KpiTileProps {
  label: string;
  value: number | null;
  formatter?: (v: number | null) => string;
  hint?: string;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
}

const TILE_TONE_CLASS: Record<KpiTileProps['tone'], string> = {
  brand: 'text-brand-600',
  lime: 'text-lime-600',
  warning: 'text-amber-600',
  neutral: 'text-navy-700',
};

function KpiTile({ label, value, formatter, hint, tone }: KpiTileProps) {
  const formatted = formatter
    ? formatter(value)
    : value === null
      ? '—'
      : formatNumber(value);
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      {value === null ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-navy-50" />
      ) : (
        <div className={`mt-1 text-2xl font-semibold ${TILE_TONE_CLASS[tone]}`}>
          {formatted}
        </div>
      )}
      {hint && value !== null && (
        <div className="mt-1 text-[11px] text-navy-400">{hint}</div>
      )}
    </div>
  );
}
