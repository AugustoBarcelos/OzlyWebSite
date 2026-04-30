import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tab,
  TabGroup,
  TabList,
  Title,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';

/**
 * /ops/grants — unified view of every promotional entitlement we know about:
 *
 *   1. Manual grants from the admin portal (audit_log: action=admin_grant_promo)
 *   2. Auto-grants from the referral webhook (referral_grants table — fires
 *      when the referred user's first paid event triggers the referrer's
 *      14-day reward)
 *   3. Currently-active entitlements with store=promotional from RC snapshot
 *      (the source of truth for "is this person actually getting the perk
 *      RIGHT NOW?")
 *
 * The page is filterable by source and status. Active vs expired is computed
 * from the 14-day default OR the RC snapshot's expires_at when available.
 */

type SourceFilter = 'all' | 'admin' | 'referral' | 'active_now';
type StatusFilter = 'all' | 'active' | 'expired';

const REFERRAL_DAYS = 14;
const SOURCE_LABEL: Record<string, string> = {
  admin: 'Manual (portal)',
  referral_reward: 'Auto (referral)',
  active_now: 'Active in RC',
};

interface AuditRow {
  id?: string;
  created_at?: string;
  admin_id?: string | null;
  admin_email_masked?: string | null;
  target_user_id?: string | null;
  target_email_masked?: string | null;
  payload?: Record<string, unknown> | null;
}

interface AuditList {
  rows?: AuditRow[];
}

interface RCSnapshotActive {
  user_id: string;
  plan: string | null;
  store: string | null;
  expires_at: string | null;
  monthly_price_aud: number | null;
}

// Frontend uses callRpc which auto-escapes / wraps in admin_ RPCs;
// for active RC entitlements we read directly via PostgREST since the table
// has admin RLS already.
import { supabase } from '@/lib/supabase';

interface GrantRow {
  key: string;
  source: 'admin' | 'referral' | 'active_now';
  targetUserId: string | null;
  targetEmailMasked: string;
  entitlement: string;
  grantedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  detail: string;
}

function asString(o: Record<string, unknown> | null | undefined, k: string): string | null {
  if (!o) return null;
  const v = o[k];
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(o: Record<string, unknown> | null | undefined, k: string): number | null {
  if (!o) return null;
  const v = o[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function GrantsPage() {
  const [adminRows, setAdminRows] = useState<GrantRow[]>([]);
  const [referralRows, setReferralRows] = useState<GrantRow[]>([]);
  const [activeRows, setActiveRows] = useState<GrantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Manual portal grants (admin_audit_list filtered)
        const audit = await callRpc<AuditList>('admin_audit_list', {
          p_limit: 200,
          p_offset: 0,
          p_filter: { action: 'admin_grant_promo' },
        });

        // 2. Referral auto-grants from referral_grants table (read via PostgREST
        // since the rows are admin-readable and we don't have a dedicated RPC).
        const { data: refData } = await supabase
          .from('referral_grants')
          .select('id, referrer_user_id, referrer_reward_granted_at, referrer_reward_status')
          .not('referrer_reward_granted_at', 'is', null)
          .order('referrer_reward_granted_at', { ascending: false })
          .limit(200);

        // 3. Currently active promotional entitlements from rc_snapshot.
        const { data: rcData } = await supabase
          .from('revenuecat_snapshot')
          .select('user_id, plan, store, expires_at, monthly_price_aud')
          .eq('store', 'promotional')
          .eq('is_active', true)
          .order('expires_at', { ascending: true })
          .limit(200);

        if (!alive) return;

        const adminMapped: GrantRow[] = (audit.rows ?? [])
          .filter((r) => r.id)
          .map((r) => {
            const grantedAt = r.created_at ? new Date(r.created_at) : null;
            const days = asNumber(r.payload, 'days') ?? 0;
            const expiresAt = grantedAt && days > 0
              ? new Date(grantedAt.getTime() + days * 86_400_000)
              : null;
            return {
              key: `admin-${r.id}`,
              source: 'admin' as const,
              targetUserId: r.target_user_id ?? null,
              targetEmailMasked: r.target_email_masked ?? '—',
              entitlement: asString(r.payload, 'entitlement') ?? 'unknown',
              grantedAt,
              expiresAt,
              isActive: expiresAt ? expiresAt.getTime() > Date.now() : true,
              detail: r.admin_email_masked ?? r.admin_id ?? '—',
            };
          });

        const referralMapped: GrantRow[] = (refData ?? []).map((r) => {
          const grantedAt = r.referrer_reward_granted_at
            ? new Date(r.referrer_reward_granted_at)
            : null;
          const expiresAt = grantedAt
            ? new Date(grantedAt.getTime() + REFERRAL_DAYS * 86_400_000)
            : null;
          return {
            key: `referral-${r.id}`,
            source: 'referral' as const,
            targetUserId: r.referrer_user_id,
            targetEmailMasked: r.referrer_user_id?.slice(0, 8) ?? '—',
            entitlement: 'pro',
            grantedAt,
            expiresAt,
            isActive: expiresAt ? expiresAt.getTime() > Date.now() : true,
            detail: `status ${r.referrer_reward_status ?? '?'}`,
          };
        });

        const activeMapped: GrantRow[] = (rcData ?? []).map((r: RCSnapshotActive) => {
          const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
          return {
            key: `active-${r.user_id}`,
            source: 'active_now' as const,
            targetUserId: r.user_id,
            targetEmailMasked: r.user_id.slice(0, 8),
            entitlement: r.plan ?? 'unknown',
            grantedAt: null,
            expiresAt,
            isActive: expiresAt ? expiresAt.getTime() > Date.now() : true,
            detail: `RC: ${r.store}`,
          };
        });

        setAdminRows(adminMapped);
        setReferralRows(referralMapped);
        setActiveRows(activeMapped);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof RpcError ? err.message : 'Failed to load grants');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(
    () => [...activeRows, ...adminRows, ...referralRows],
    [adminRows, referralRows, activeRows],
  );

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (sourceFilter === 'admin' && r.source !== 'admin') return false;
      if (sourceFilter === 'referral' && r.source !== 'referral') return false;
      if (sourceFilter === 'active_now' && r.source !== 'active_now') return false;
      if (statusFilter === 'active' && !r.isActive) return false;
      if (statusFilter === 'expired' && r.isActive) return false;
      return true;
    });
  }, [all, sourceFilter, statusFilter]);

  const tabIndex = ['all', 'admin', 'referral', 'active_now'].indexOf(sourceFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title>Promotional Grants</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Unified view: portal grants + referral auto-grants + active RC promos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-navy-400">
          <span>{activeRows.length} active in RC</span>
          <span>·</span>
          <span>{adminRows.length} manual</span>
          <span>·</span>
          <span>{referralRows.length} referral</span>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <TabGroup
            index={tabIndex === -1 ? 0 : tabIndex}
            onIndexChange={(i) => {
              const next = (['all', 'admin', 'referral', 'active_now'] as SourceFilter[])[i];
              if (next) setSourceFilter(next);
            }}
          >
            <TabList variant="solid">
              <Tab>All</Tab>
              <Tab>Manual</Tab>
              <Tab>Referral</Tab>
              <Tab>Active in RC</Tab>
            </TabList>
          </TabGroup>
          <span className="h-4 w-px bg-navy-100" />
          {(['all', 'active', 'expired'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={[
                'rounded-full border px-3 py-1 text-xs transition-colors',
                statusFilter === s
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-navy-100 bg-white text-navy-500 hover:bg-navy-50',
              ].join(' ')}
            >
              {s === 'all' ? 'All status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-navy-400">Loading…</div>
        ) : error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-navy-400">
            {all.length === 0 ? 'No grants yet' : 'No grants match the filters'}
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Target</TableHeaderCell>
                <TableHeaderCell>Entitlement</TableHeaderCell>
                <TableHeaderCell>Granted</TableHeaderCell>
                <TableHeaderCell>Expires</TableHeaderCell>
                <TableHeaderCell>Detail</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((g) => (
                <TableRow key={g.key}>
                  <TableCell>
                    <Badge
                      color={g.source === 'admin' ? 'amber' : g.source === 'referral' ? 'emerald' : 'sky'}
                      size="xs"
                    >
                      {SOURCE_LABEL[g.source === 'admin' ? 'admin' : g.source === 'referral' ? 'referral_reward' : 'active_now']}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {g.targetUserId ? (
                      <Link
                        to={`/users/${g.targetUserId}`}
                        className="font-mono text-xs text-brand-600 hover:underline"
                      >
                        {g.targetEmailMasked}
                      </Link>
                    ) : (
                      g.targetEmailMasked
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium uppercase text-navy-700">
                      {g.entitlement}
                    </span>
                  </TableCell>
                  <TableCell>
                    {g.grantedAt ? formatRelativeTime(g.grantedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    {g.expiresAt ? g.expiresAt.toLocaleDateString('en-AU') : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-navy-400">
                    {g.detail}
                  </TableCell>
                  <TableCell>
                    {g.isActive ? (
                      <Badge color="emerald" size="xs">
                        active
                      </Badge>
                    ) : (
                      <Badge color="slate" size="xs">
                        expired
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
