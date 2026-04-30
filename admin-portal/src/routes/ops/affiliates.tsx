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
  commission_cents: number;
  currency: string;
  active: boolean;
  signups: number;
  purchases: number;
  renewals: number;
  commission_ready: number;
  paid_count: number;
  payable_cents: number;
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

  async function markPaid(conversionId: string) {
    setMarking(conversionId);
    try {
      await callRpc('admin_mark_conversion_paid', {
        p_conversion_id: conversionId,
        p_note: 'Marked paid via portal',
      });
      toast({ variant: 'success', title: 'Conversion marked as paid' });
      // Refresh both tables
      void loadAffiliates();
      if (selected) void loadConversions(selected.id);
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

  return (
    <div className="space-y-6">
      <div>
        <Title>Affiliates</Title>
        <Text className="mt-0.5 text-xs text-navy-300">
          Vendor / partner program · payouts are manual (PIX or transfer)
        </Text>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <Text className="font-medium text-navy-700">All affiliates</Text>
          {loading && <Spinner size="sm" />}
        </div>
        {error && (
          <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        )}
        {!loading && affiliates.length === 0 ? (
          <div className="py-10 text-center text-sm text-navy-400">
            No affiliates yet
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Active</TableHeaderCell>
                  <TableHeaderCell className="text-right">Signups</TableHeaderCell>
                  <TableHeaderCell className="text-right">Purchases</TableHeaderCell>
                  <TableHeaderCell className="text-right">Renewals</TableHeaderCell>
                  <TableHeaderCell className="text-right">Ready to pay</TableHeaderCell>
                  <TableHeaderCell className="text-right">Payable</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {affiliates.map((a) => (
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
                      <div className="text-[11px] text-navy-300">{a.email ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      {a.active ? (
                        <Badge color="emerald" size="xs">active</Badge>
                      ) : (
                        <Badge color="slate" size="xs">inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(a.signups)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(a.purchases)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(a.renewals)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.commission_ready > 0 ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                          {a.commission_ready}
                        </span>
                      ) : (
                        formatNumber(a.commission_ready)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {a.payable_cents > 0
                        ? formatMoney(a.payable_cents, a.currency)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(selected?.id === a.id ? null : a);
                        }}
                        className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                      >
                        {selected?.id === a.id ? 'Hide' : 'View'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {selected && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium text-navy-700">
                Conversions for{' '}
                <span className="font-mono text-xs">{selected.code}</span>
              </Text>
              <Text className="text-xs text-navy-300">
                {selected.name ?? '—'} · {selected.email ?? '—'}
              </Text>
            </div>
            {convLoading && <Spinner size="sm" />}
          </div>

          {!convLoading && conversions.length === 0 ? (
            <div className="py-10 text-center text-sm text-navy-400">
              No conversions yet for this affiliate
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
                      <TableCell>
                        {formatRelativeTime(c.signup_at)}
                      </TableCell>
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
      )}
    </div>
  );
}
