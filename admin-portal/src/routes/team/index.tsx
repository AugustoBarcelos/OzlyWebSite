import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Title, Text, Badge } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { CHANNELS, TEAM_ROLE_LABELS } from '@/lib/channels';
import type { ChannelGrant, TeamRole } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { InviteMemberDialog } from './InviteMemberDialog';
import { EditGrantsDialog } from './EditGrantsDialog';

/**
 * /team — admin only. Lista membros do time, mostra grants resumidos,
 * permite invite/edit/disable.
 *
 * Fluxo:
 *  - "Add member" → InviteMemberDialog (cria auth user + team_members + grants
 *    + envia magic-link standard do Supabase)
 *  - "Edit"       → EditGrantsDialog (matriz canal × permission)
 *  - "Disable"    → soft delete via team_set_status
 *
 * Server gate: todos os RPCs já checam is_admin() — UI é só UX.
 */

export interface MemberRow {
  id: string;
  user_id: string;
  email: string;
  role: TeamRole;
  display_name: string | null;
  status: 'active' | 'disabled';
  created_at: string;
  last_login_at: string | null;
  grants: ChannelGrant[];
  campaign_overrides_count: number;
}

interface ListResult {
  members: MemberRow[];
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return `${m}mo ago`;
}

function grantSummary(grants: ChannelGrant[]): string {
  if (grants.length === 0) return 'no channels';
  const groups = { org: 0, paid: 0, msg: 0 };
  for (const g of grants) {
    if (g.channel_kind.startsWith('org_')) groups.org += 1;
    else if (g.channel_kind.startsWith('paid_')) groups.paid += 1;
    else if (g.channel_kind.startsWith('msg_')) groups.msg += 1;
  }
  const parts: string[] = [];
  if (groups.org > 0) parts.push(`${groups.org} organic`);
  if (groups.paid > 0) parts.push(`${groups.paid} paid`);
  if (groups.msg > 0) parts.push(`${groups.msg} messaging`);
  return parts.join(' · ');
}

export function TeamPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const { toast } = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callRpc<ListResult>('team_list_members');
      setMembers(result.members ?? []);
    } catch (err) {
      setError(err instanceof RpcError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSetStatus = useCallback(
    async (m: MemberRow, status: 'active' | 'disabled') => {
      try {
        await callRpc('team_set_status', { p_member_id: m.id, p_status: status });
        toast({ title: status === 'disabled' ? 'Member disabled' : 'Member re-enabled', variant: 'success' });
        await reload();
      } catch (err) {
        toast({ title: err instanceof RpcError ? err.message : 'Failed', variant: 'error' });
      }
    },
    [reload, toast],
  );

  const totals = useMemo(() => {
    return {
      active: members.filter((m) => m.status === 'active').length,
      disabled: members.filter((m) => m.status === 'disabled').length,
    };
  }, [members]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title className="!text-navy-700">Team</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Manage who can access the portal and which channels they own.
            Server re-checks every action — sidebar is just UX.
          </Text>
        </div>
        <button
          type="button"
          onClick={() => setInviting(true)}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          + Add member
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-sm text-navy-400">
            No team members yet. Click "Add member" to invite someone.
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3 text-xs text-navy-400">
              <span>
                <strong>{totals.active}</strong> active
              </span>
              {totals.disabled > 0 && (
                <span>
                  · <strong>{totals.disabled}</strong> disabled
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-navy-50 text-left text-[11px] uppercase tracking-wide text-navy-400">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Channels</th>
                    <th className="py-2">Last login</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className={
                        'border-b border-navy-50 last:border-0 ' +
                        (m.status === 'disabled' ? 'opacity-50' : '')
                      }
                    >
                      <td className="py-3">
                        <div className="font-medium text-navy-700">
                          {m.display_name ?? m.email.split('@')[0]}
                        </div>
                        <div className="text-xs text-navy-400">{m.email}</div>
                      </td>
                      <td className="py-3">
                        <Badge color={m.role === 'admin' ? 'amber' : 'sky'} size="xs">
                          {TEAM_ROLE_LABELS[m.role]}
                        </Badge>
                        {m.status === 'disabled' && (
                          <Badge color="gray" size="xs" className="ml-1">
                            disabled
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-navy-600">
                        {grantSummary(m.grants)}
                        {m.campaign_overrides_count > 0 && (
                          <span className="ml-1 text-xs text-navy-400">
                            (+{m.campaign_overrides_count} campaign limits)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-navy-500">
                        {relativeTime(m.last_login_at)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditing(m)}
                          className="rounded-md border border-navy-100 px-2 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
                        >
                          Edit grants
                        </button>
                        {m.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => void handleSetStatus(m, 'disabled')}
                            className="ml-1 rounded-md border border-navy-100 px-2 py-1 text-xs text-rose-600 hover:border-rose-300"
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleSetStatus(m, 'active')}
                            className="ml-1 rounded-md border border-navy-100 px-2 py-1 text-xs text-emerald-700 hover:border-emerald-300"
                          >
                            Re-enable
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card className="!bg-navy-50/50">
        <Title className="!text-navy-600 !text-base">How RBAC works here</Title>
        <Text className="mt-2 text-xs text-navy-500">
          Each member gets <strong>per-channel grants</strong> (read / publish / edit / manage budget).
          Sidebar items appear only if the user has at least 1 grant in that group
          (Organic / Paid / Messaging). To restrict to specific campaigns inside
          a paid channel, click "Edit grants" → "Limit campaigns" (available
          once Meta/Google APIs are connected).
        </Text>
        <Text className="mt-2 text-xs text-navy-400">
          {CHANNELS.length} channels available · admin sees everything ·
          server re-checks via SECURITY DEFINER on every RPC.
        </Text>
      </Card>

      {inviting && (
        <InviteMemberDialog
          onClose={() => setInviting(false)}
          onInvited={() => {
            setInviting(false);
            void reload();
          }}
        />
      )}
      {editing && (
        <EditGrantsDialog
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
