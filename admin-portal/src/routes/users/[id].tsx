/**
 * User 360 (BRIEFING § 11.4).
 *
 * Story: an admin lands here from /users → search → row click. They need to
 * answer a support ticket in <30s without opening five tabs. Layout:
 *
 *   ┌──────────────────────────────────┬───────────────────────┐
 *   │ Breadcrumbs / Title / Reveal-PII │                       │
 *   ├──────────────────────────────────┤  Action panel         │
 *   │ TabGroup:                        │  (sticky on desktop)  │
 *   │  Profile · Subscription ·        │                       │
 *   │  Activity · Sync · Referral ·    │  Status badges        │
 *   │  Errors · Audit                  │  W5 actions (disabled)│
 *   └──────────────────────────────────┴───────────────────────┘
 *
 * Hardening:
 *  - Email/phone/address default to MASKED. "Reveal PII" re-fetches with
 *    `p_include_pii=true`; the RPC server-side audit-logs a 'pii_revealed'
 *    row so we have an immutable trail of who saw what.
 *  - All destructive actions are placeholders (disabled) — Wave 5 wires them.
 *  - We never render TFN here (it's not in the RPC payload anyway).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Card,
  Metric,
  Text,
  Title,
  Button,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { env } from '@/lib/env';
import { Avatar } from '@/components/Avatar';
import { MaskedField } from '@/components/MaskedField';
import { Spinner } from '@/components/Spinner';
import { DangerZone } from '@/components/DangerZone';
import { useToast } from '@/components/Toast';
import {
  grantPromo,
  forceResync,
  softDeleteUser,
  banUser,
  exportUserData,
  downloadJson,
  type Entitlement,
} from '@/lib/admin-actions';
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  EyeIcon,
  LockOpenIcon,
} from '@/components/Icons';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the RPC payload contract documented in the briefing.
// ─────────────────────────────────────────────────────────────────────────────

interface User360Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string;
  theme_mode: string | null;
  country: string | null;
  state: string | null;
  login_count: number | null;
  is_banned: boolean;
  banned_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  force_full_sync_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface User360Activity {
  jobs: number;
  invoices: number;
  expenses: number;
}

interface User360Subscription {
  source: string;
  status?: 'trial' | 'paying' | 'churned' | 'never' | 'never_synced';
  plan?: string | null;
  period_type?: string | null;
  is_active?: boolean;
  auto_renew?: boolean | null;
  store?: string | null;
  monthly_price_aud?: number | null;
  total_revenue_usd?: number | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  last_seen_app_version?: string | null;
  last_seen_country?: string | null;
  last_seen_platform?: string | null;
  last_seen_platform_version?: string | null;
  synced_at?: string | null;
  note?: string | null;
}

interface UserGrantRow {
  id?: string;
  source: 'referral_reward' | 'admin_portal';
  entitlement?: string | null;
  days?: number | null;
  granted_at: string | null;
  status_code?: number | null;
  admin_id?: string | null;
  note?: string | null;
}

interface UserGrantsPayload {
  user_id: string;
  active_now: {
    plan: string | null;
    expires_at: string | null;
    store: string | null;
    is_promotional: boolean;
    monthly_price_aud: number | null;
  } | null;
  referral_grants: UserGrantRow[];
  admin_grants: UserGrantRow[];
}

interface UserAuditRow {
  id: string;
  admin_id: string | null;
  action: string;
  payload: Record<string, unknown> | null;
  result: string | null;
  created_at: string;
}

interface UserAuditPayload {
  rows: UserAuditRow[];
}

interface User360Referrer {
  id: string;
  full_name: string | null;
}

interface User360Payload {
  found: boolean;
  profile: User360Profile | null;
  subscription: User360Subscription | null;
  activity_30d: User360Activity | null;
  last_sync_at: string | null;
  referrer: User360Referrer | null;
  referrals_made: number;
  referrer_reward_granted_at: string | null;
  pii_included: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} mo ago`;
  const year = Math.floor(month / 12);
  return `${year} yr${year === 1 ? '' : 's'} ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FullPageSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-8">
        <div className="h-8 w-1/3 animate-pulse rounded bg-navy-100" />
        <div className="h-9 w-full animate-pulse rounded bg-navy-50" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
      <div className="lg:col-span-4">
        <div className="h-64 w-full animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'green' | 'red' | 'amber' | 'slate';
  children: ReactNode;
}) {
  const TONE: Record<typeof tone, string> = {
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-rose-100 text-rose-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-navy-50 text-navy-600',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-navy-50 py-2 last:border-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
        {label}
      </div>
      <div className="text-sm text-navy-700">
        {value === null || value === '' ? '—' : String(value)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Panel (right column — sticky)
// ─────────────────────────────────────────────────────────────────────────────

function ActionPanel({
  profile,
  onAfterAction,
}: {
  profile: User360Profile | null;
  onAfterAction: () => void;
}) {
  const { toast } = useToast();
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantEntitlement, setGrantEntitlement] = useState<Entitlement>('pro');
  const [grantDays, setGrantDays] = useState(30);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [resyncSubmitting, setResyncSubmitting] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);

  const targetId = profile?.id ?? '';
  const confirmPhrase = profile?.email ?? profile?.id ?? 'CONFIRM';

  async function handleGrantPromo() {
    if (!targetId) return;
    setGrantSubmitting(true);
    const result = await grantPromo(targetId, grantEntitlement, grantDays);
    setGrantSubmitting(false);
    if (result.success) {
      toast({
        variant: 'success',
        title: 'Promo granted',
        description: `${grantEntitlement} for ${grantDays} days`,
      });
      setShowGrantForm(false);
      onAfterAction();
    } else {
      toast({
        variant: 'error',
        title: 'Failed to grant promo',
        description: result.error ?? 'Request failed',
      });
    }
  }

  async function handleExport() {
    if (!targetId) return;
    setExportSubmitting(true);
    const result = await exportUserData(targetId);
    setExportSubmitting(false);
    if (result.success) {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`ozly-user-${targetId}-${stamp}.json`, result.bundle);
      toast({
        variant: 'success',
        title: 'Export ready',
        description: 'Bundle saved to your Downloads. The export is logged in the audit trail.',
      });
      onAfterAction();
    } else {
      toast({
        variant: 'error',
        title: 'Export failed',
        description: result.error ?? 'Request failed',
      });
    }
  }

  async function handleForceResync() {
    if (!targetId) return;
    setResyncSubmitting(true);
    const result = await forceResync(targetId);
    setResyncSubmitting(false);
    if (result.success) {
      toast({
        variant: 'success',
        title: 'Force resync queued',
        description: 'User will receive on next foreground.',
      });
      onAfterAction();
    } else {
      toast({
        variant: 'error',
        title: 'Failed to queue resync',
        description: result.error ?? 'Request failed',
      });
    }
  }

  return (
    <aside className="lg:sticky lg:top-20">
      <Card className="space-y-4">
        <Title>Actions</Title>

        {/* Status badges */}
        {profile && (
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge tone={profile.role === 'admin' ? 'red' : 'slate'}>
              role: {profile.role}
            </StatusBadge>
            {profile.is_banned ? (
              <StatusBadge tone="red">banned</StatusBadge>
            ) : (
              <StatusBadge tone="green">active</StatusBadge>
            )}
            {profile.is_deleted && (
              <StatusBadge tone="red">deleted</StatusBadge>
            )}
            {profile.force_full_sync_at && (
              <StatusBadge tone="amber">resync queued</StatusBadge>
            )}
          </div>
        )}

        <hr className="border-navy-50" />

        {/* Grant promo */}
        <div className="space-y-2">
          {!showGrantForm ? (
            <Button
              variant="secondary"
              className="w-full justify-start"
              disabled={!targetId}
              onClick={() => setShowGrantForm(true)}
            >
              Grant promo
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border border-navy-100 bg-navy-50 p-3">
              <Text className="text-xs font-medium text-navy-600">
                Grant promo entitlement
              </Text>
              <select
                value={grantEntitlement}
                onChange={(e) =>
                  setGrantEntitlement(e.target.value as Entitlement)
                }
                className="w-full rounded-md border border-navy-100 bg-white px-2 py-1 text-xs"
              >
                <option value="tfn_access">TFN access</option>
                <option value="abn_access">ABN access</option>
                <option value="pro">PRO</option>
              </select>
              <input
                type="number"
                min={1}
                max={365}
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full rounded-md border border-navy-100 bg-white px-2 py-1 text-xs"
                placeholder="Days (1-365)"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGrantPromo}
                  disabled={grantSubmitting}
                  className="flex-1 rounded-md bg-navy-700 px-2 py-1 text-xs font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {grantSubmitting ? 'Granting…' : 'Grant'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGrantForm(false)}
                  disabled={grantSubmitting}
                  className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Force resync */}
          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={!targetId || resyncSubmitting}
            onClick={handleForceResync}
          >
            {resyncSubmitting ? 'Queuing…' : 'Force resync'}
          </Button>

          {/* Export user data (GDPR / APP 12) */}
          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={!targetId || exportSubmitting}
            onClick={handleExport}
            title="Download a JSON bundle of everything Ozly stores about this user. The export is logged."
          >
            {exportSubmitting ? 'Exporting…' : 'Export data (GDPR)'}
          </Button>
        </div>

        {/* Danger zone */}
        <div className="space-y-2">
          <DangerZone
            title="Soft delete user"
            description="Soft-deletes the profile. Reversible only via SQL. Reason is logged in the audit trail."
            confirmPhrase={confirmPhrase}
            disabled={!targetId || profile?.is_deleted === true}
            requireReason
            onConfirm={async (reason) => {
              const result = await softDeleteUser(targetId, reason ?? '');
              if (!result.success) {
                throw new Error(result.error ?? 'Request failed');
              }
              onAfterAction();
            }}
          />
          <DangerZone
            title="Ban user"
            description="Bans the user, revokes all active sessions, and locks the account. Reversible via SQL."
            confirmPhrase={confirmPhrase}
            disabled={!targetId || profile?.is_banned === true}
            requireReason
            onConfirm={async (reason) => {
              const result = await banUser(targetId, reason ?? '');
              if (!result.success) {
                throw new Error(result.error ?? 'Request failed');
              }
              onAfterAction();
            }}
          />
        </div>
      </Card>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function User360Page() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<User360Payload | null>(null);
  const [grants, setGrants] = useState<UserGrantsPayload | null>(null);
  const [audit, setAudit] = useState<UserAuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [piiRevealed, setPiiRevealed] = useState(false);
  const [piiLoading, setPiiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user 360 payload + grants + audit in parallel.
  const fetchUser = useCallback(
    async (target: string, includePii: boolean) => {
      const [payload, grantsData, auditData] = await Promise.all([
        callRpc<User360Payload>('admin_get_user_360', {
          p_target: target,
          p_include_pii: includePii,
        }),
        callRpc<UserGrantsPayload>('admin_user_grants', {
          p_target: target,
        }).catch(() => null),
        callRpc<UserAuditPayload>('admin_audit_for_user', {
          p_target: target,
          p_limit: 30,
        }).catch(() => null),
      ]);
      setGrants(grantsData);
      setAudit(auditData);
      return payload;
    },
    []
  );

  // Initial load + reload when `id` param changes.
  useEffect(() => {
    if (!id) {
      setError('Missing user id in URL.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPiiRevealed(false);

    fetchUser(id, false)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof RpcError
            ? err.message
            : 'Failed to load user.';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, fetchUser]);

  // Reveal PII — re-fetches with p_include_pii=true. The RPC logs a
  // 'pii_revealed' audit row server-side; we don't (and can't) bypass that.
  const onRevealPii = useCallback(async () => {
    if (!id || piiLoading || piiRevealed) return;
    setPiiLoading(true);
    setError(null);
    try {
      const payload = await fetchUser(id, true);
      setData(payload);
      setPiiRevealed(true);
    } catch (err: unknown) {
      const msg =
        err instanceof RpcError ? err.message : 'Failed to reveal PII.';
      setError(msg);
    } finally {
      setPiiLoading(false);
    }
  }, [id, piiLoading, piiRevealed, fetchUser]);

  // Loading shell
  if (loading) {
    return <FullPageSkeleton />;
  }

  // Error banner with retry
  if (error && !data) {
    return (
      <div className="space-y-3">
        <Link
          to="/users"
          className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-600"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Users
        </Link>
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Could not load user</div>
            <div className="text-xs">{error}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!id) return;
              setLoading(true);
              setError(null);
              fetchUser(id, false)
                .then((p) => setData(p))
                .catch((err: unknown) => {
                  const msg =
                    err instanceof RpcError
                      ? err.message
                      : 'Failed to load user.';
                  setError(msg);
                })
                .finally(() => setLoading(false));
            }}
            className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not-found state
  if (data && !data.found) {
    return (
      <div className="space-y-3">
        <Link
          to="/users"
          className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-600"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Users
        </Link>
        <Card>
          <Title>User not found</Title>
          <Text>No user matches id {id}.</Text>
        </Card>
      </div>
    );
  }

  if (!data || !data.profile) {
    // Defensive: shouldn't happen if found=true, but TS needs the narrowing.
    return null;
  }

  const profile = data.profile;
  const masked = !data.pii_included;

  // Sentry deep-link: only meaningful if a DSN is configured for the portal.
  const sentryConfigured = Boolean(env.sentryDsn);
  const sentryQueryUrl = `https://sentry.io/?query=user.id:${encodeURIComponent(profile.id)}`;

  // RevenueCat deep link — project id is known now.
  const rcUrl = `https://app.revenuecat.com/customers/projf3e1c45d/${encodeURIComponent(profile.id)}`;
  const sub = data.subscription;
  const subStatusTone: 'green' | 'amber' | 'red' | 'slate' =
    sub?.status === 'paying'
      ? 'green'
      : sub?.status === 'trial'
        ? 'amber'
        : sub?.status === 'churned'
          ? 'red'
          : 'slate';

  return (
    <div className="space-y-4">
      {/* Top bar: breadcrumbs + reveal PII */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/users"
            className="inline-flex items-center gap-1 text-navy-400 hover:text-navy-600"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Users
          </Link>
          <span className="text-navy-100">/</span>
          <span className="font-medium text-navy-700">
            {profile.full_name ?? 'Unknown'}
          </span>
        </div>

        {piiRevealed ? (
          <span
            title="PII has been revealed and audit-logged"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
          >
            <LockOpenIcon className="h-3.5 w-3.5" />
            PII visible (audited)
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              void onRevealPii();
            }}
            disabled={piiLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Re-fetches user with PII included. The RPC writes a 'pii_revealed' audit row server-side."
          >
            {piiLoading ? (
              <Spinner size="sm" label="Revealing" />
            ) : (
              <EyeIcon className="h-3.5 w-3.5" />
            )}
            {piiLoading ? 'Revealing…' : 'Reveal PII'}
          </button>
        )}
      </div>

      {/* Inline error banner if a refetch failed but we still have data */}
      {error && data && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1 text-xs">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-medium text-rose-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header card: avatar + name + role */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar userId={profile.id} name={profile.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Title>{profile.full_name ?? 'Unknown user'}</Title>
              <StatusBadge
                tone={profile.role === 'admin' ? 'red' : 'slate'}
              >
                {profile.role}
              </StatusBadge>
              {profile.is_banned && (
                <StatusBadge tone="red">banned</StatusBadge>
              )}
              {profile.is_deleted && (
                <StatusBadge tone="red">deleted</StatusBadge>
              )}
            </div>
            <Text className="mt-0.5 truncate font-mono text-xs text-navy-400">
              {profile.id}
            </Text>
          </div>
        </div>
      </Card>

      {/* 2-col layout */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: tabs */}
        <div className="lg:col-span-8">
          <Card>
            <TabGroup>
              <TabList>
                <Tab>Profile</Tab>
                <Tab>Subscription</Tab>
                <Tab>Activity</Tab>
                <Tab>Device & Sync</Tab>
                <Tab>Grants</Tab>
                <Tab>Referral</Tab>
                <Tab>Errors</Tab>
                <Tab>Audit</Tab>
              </TabList>
              <TabPanels>
                {/* PROFILE */}
                <TabPanel>
                  <div className="mt-3 space-y-1">
                    <FieldRow label="Full name" value={profile.full_name} />
                    <MaskedField
                      label="Email"
                      value={profile.email}
                      masked={masked}
                      onReveal={() => {
                        void onRevealPii();
                      }}
                      revealLoading={piiLoading}
                    />
                    <MaskedField
                      label="Phone"
                      value={profile.phone}
                      masked={masked}
                      onReveal={() => {
                        void onRevealPii();
                      }}
                      revealLoading={piiLoading}
                    />
                    <MaskedField
                      label="Address"
                      value={profile.address}
                      masked={masked}
                      onReveal={() => {
                        void onRevealPii();
                      }}
                      revealLoading={piiLoading}
                    />
                    <FieldRow label="Country" value={profile.country} />
                    <FieldRow label="Theme mode" value={profile.theme_mode} />
                    <FieldRow label="Login count" value={profile.login_count} />
                    <FieldRow label="Created at" value={formatDate(profile.created_at)} />
                    <FieldRow label="Updated at" value={formatDate(profile.updated_at)} />
                    {profile.is_banned && (
                      <FieldRow label="Banned at" value={formatDate(profile.banned_at)} />
                    )}
                    {profile.is_deleted && (
                      <FieldRow label="Deleted at" value={formatDate(profile.deleted_at)} />
                    )}
                  </div>
                </TabPanel>

                {/* SUBSCRIPTION */}
                <TabPanel>
                  <div className="mt-3 space-y-3">
                    {sub?.status === 'never_synced' ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Not yet synced from RevenueCat. The cron runs hourly.
                      </div>
                    ) : sub?.status === 'never' ? (
                      <div className="rounded-md border border-navy-100 bg-navy-50 p-3 text-sm text-navy-600">
                        Never seen by RevenueCat (no purchases / promos).
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={subStatusTone}>{sub?.status ?? '—'}</StatusBadge>
                          {sub?.plan && (
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                              {sub.plan.toUpperCase()}
                            </span>
                          )}
                          {sub?.store === 'promotional' && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Promotional grant
                            </span>
                          )}
                          {sub?.auto_renew === false && sub?.is_active && (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              Cancellation pending
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <FieldRow label="Plan" value={sub?.plan ?? null} />
                          <FieldRow label="Period type" value={sub?.period_type ?? null} />
                          <FieldRow label="Store" value={sub?.store ?? null} />
                          <FieldRow
                            label="MRR contribution"
                            value={
                              sub?.monthly_price_aud
                                ? `A$${sub.monthly_price_aud.toFixed(2)}/mo`
                                : sub?.store === 'promotional'
                                  ? 'A$0.00 (promo)'
                                  : '—'
                            }
                          />
                          <FieldRow
                            label="Total revenue"
                            value={
                              sub?.total_revenue_usd && sub.total_revenue_usd > 0
                                ? `US$${sub.total_revenue_usd.toFixed(2)}`
                                : '—'
                            }
                          />
                          <FieldRow
                            label="Current period ends"
                            value={formatDate(sub?.current_period_end ?? null)}
                          />
                          <FieldRow label="Trial ends" value={formatDate(sub?.trial_ends_at ?? null)} />
                          <FieldRow label="Cancelled at" value={formatDate(sub?.cancelled_at ?? null)} />
                          <FieldRow
                            label="Last RC sync"
                            value={`${formatRelative(sub?.synced_at ?? null)} (${formatDate(sub?.synced_at ?? null)})`}
                          />
                        </div>
                      </>
                    )}
                    <a
                      href={rcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
                    >
                      Open in RevenueCat
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </TabPanel>

                {/* ACTIVITY */}
                <TabPanel>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Card>
                      <Text>Jobs (30d)</Text>
                      <Metric>{data.activity_30d?.jobs ?? 0}</Metric>
                    </Card>
                    <Card>
                      <Text>Invoices (30d)</Text>
                      <Metric>{data.activity_30d?.invoices ?? 0}</Metric>
                    </Card>
                    <Card>
                      <Text>Expenses (30d)</Text>
                      <Metric>{data.activity_30d?.expenses ?? 0}</Metric>
                    </Card>
                  </div>
                </TabPanel>

                {/* DEVICE & SYNC */}
                <TabPanel>
                  <div className="mt-3 space-y-1">
                    <FieldRow
                      label="App version"
                      value={sub?.last_seen_app_version ?? null}
                    />
                    <FieldRow
                      label="Platform"
                      value={
                        sub?.last_seen_platform
                          ? `${sub.last_seen_platform}${sub.last_seen_platform_version ? ` (${sub.last_seen_platform_version})` : ''}`
                          : null
                      }
                    />
                    <FieldRow
                      label="Country"
                      value={sub?.last_seen_country ?? profile.country}
                    />
                    <FieldRow label="State (AU)" value={profile.state} />
                    <FieldRow
                      label="First seen by RC"
                      value={formatDate(sub?.first_seen_at ?? null)}
                    />
                    <FieldRow
                      label="Last seen by RC"
                      value={`${formatRelative(sub?.last_seen_at ?? null)} (${formatDate(sub?.last_seen_at ?? null)})`}
                    />
                    <FieldRow
                      label="Last DB sync"
                      value={`${formatRelative(data.last_sync_at)} (${formatDate(data.last_sync_at)})`}
                    />
                    <FieldRow
                      label="Force resync flag"
                      value={
                        profile.force_full_sync_at
                          ? formatDate(profile.force_full_sync_at)
                          : null
                      }
                    />
                  </div>
                </TabPanel>

                {/* GRANTS */}
                <TabPanel>
                  <div className="mt-3 space-y-3">
                    {grants?.active_now ? (
                      <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm">
                        <div className="font-medium text-brand-800">
                          Active now: {grants.active_now.plan?.toUpperCase()}
                          {grants.active_now.is_promotional && ' (promo)'}
                        </div>
                        <div className="mt-1 text-xs text-brand-700">
                          Expires {formatDate(grants.active_now.expires_at)} ·{' '}
                          store: {grants.active_now.store ?? '—'}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-navy-100 bg-navy-50 p-3 text-sm text-navy-600">
                        No active entitlement
                      </div>
                    )}

                    <div>
                      <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-navy-400">
                        Referral auto-grants
                      </Text>
                      {grants && grants.referral_grants.length > 0 ? (
                        <div className="space-y-1.5">
                          {grants.referral_grants.map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
                            >
                              <span className="font-medium text-navy-700">
                                {(g.entitlement ?? 'pro').toUpperCase()} · 14d
                              </span>
                              <span className="text-navy-300">
                                {formatRelative(g.granted_at)} · status {g.status_code}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-navy-400">No referral auto-grants</div>
                      )}
                    </div>

                    <div>
                      <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-navy-400">
                        Manual grants from portal
                      </Text>
                      {grants && grants.admin_grants.length > 0 ? (
                        <div className="space-y-1.5">
                          {grants.admin_grants.map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
                            >
                              <span className="font-medium text-navy-700">
                                {(g.entitlement ?? 'pro').toUpperCase()}
                                {g.days ? ` · ${g.days}d` : ''}
                              </span>
                              <span className="text-navy-300">
                                {formatRelative(g.granted_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-navy-400">
                          No manual grants — use Action panel to grant promo
                        </div>
                      )}
                    </div>
                  </div>
                </TabPanel>

                {/* REFERRAL */}
                <TabPanel>
                  <div className="mt-3 space-y-1">
                    <FieldRow
                      label="Referrer"
                      value={
                        data.referrer
                          ? data.referrer.full_name ?? data.referrer.id
                          : null
                      }
                    />
                    <FieldRow label="Referrals made" value={data.referrals_made} />
                    <FieldRow
                      label="Referrer reward"
                      value={
                        data.referrer_reward_granted_at
                          ? `Bonus earned · ${formatDate(data.referrer_reward_granted_at)}`
                          : data.referrer
                            ? 'Pending'
                            : 'N/A'
                      }
                    />
                  </div>
                </TabPanel>

                {/* ERRORS */}
                <TabPanel>
                  <div className="mt-3 space-y-2">
                    {sentryConfigured ? (
                      <>
                        <Text className="text-sm">
                          Filter errors by user_id in Sentry:
                        </Text>
                        <a
                          href={sentryQueryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
                        >
                          Open in Sentry
                          <ExternalLinkIcon className="h-3.5 w-3.5" />
                        </a>
                        <Text className="text-[11px] text-navy-300">
                          Sentry filter: <code>user.id:{profile.id}</code>
                        </Text>
                      </>
                    ) : (
                      <div className="rounded-md border border-dashed border-navy-100 bg-navy-50 p-3 text-xs text-navy-400">
                        Configure Sentry (set <code>VITE_SENTRY_DSN</code>) to
                        enable a deep link to errors filtered by this user&apos;s id.
                      </div>
                    )}
                  </div>
                </TabPanel>

                {/* AUDIT */}
                <TabPanel>
                  <div className="mt-3 space-y-2">
                    {!audit ? (
                      <div className="rounded-md border border-dashed border-navy-100 bg-navy-50 p-4 text-xs text-navy-400">
                        Loading audit history…
                      </div>
                    ) : audit.rows.length === 0 ? (
                      <div className="rounded-md border border-dashed border-navy-100 bg-navy-50 p-4 text-xs text-navy-400">
                        No admin actions on this user yet
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {audit.rows.map((row) => {
                          const tone =
                            row.result === 'success'
                              ? 'green'
                              : row.result === 'forbidden'
                                ? 'red'
                                : 'slate';
                          return (
                            <li
                              key={row.id}
                              className="rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <StatusBadge tone={tone}>
                                  {row.result ?? '—'}
                                </StatusBadge>
                                <span className="font-medium text-navy-700">
                                  {row.action.replace(/^admin_/, '').replace(/_/g, ' ')}
                                </span>
                                <span className="ml-auto text-navy-300">
                                  {formatRelative(row.created_at)}
                                </span>
                              </div>
                              {row.payload && Object.keys(row.payload).length > 0 && (
                                <pre className="mt-1.5 overflow-x-auto rounded bg-navy-50 p-1.5 text-[10px] text-navy-600">
                                  {JSON.stringify(row.payload, null, 2)}
                                </pre>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </Card>
        </div>

        {/* Right: actions */}
        <div className="lg:col-span-4">
          <ActionPanel
            profile={profile}
            onAfterAction={() => {
              if (id) fetchUser(id, piiRevealed);
            }}
          />
        </div>
      </div>
    </div>
  );
}
