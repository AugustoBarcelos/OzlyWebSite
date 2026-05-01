import { useMemo, useState } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { CHANNELS, TEAM_ROLE_LABELS } from '@/lib/channels';
import type { ChannelGrant, ChannelKind, TeamRole } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { GrantsMatrix } from './GrantsMatrix';
import type { MemberRow } from './index';

interface Props {
  member: MemberRow;
  onClose: () => void;
  onSaved: () => void;
}

export function EditGrantsDialog({ member, onClose, onSaved }: Props) {
  const [grants, setGrants] = useState<ChannelGrant[]>(member.grants);
  const [role, setRole] = useState<TeamRole>(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const enabledKinds = useMemo(
    () => new Set(grants.map((g) => g.channel_kind)),
    [grants],
  );

  function toggleChannel(kind: ChannelKind) {
    if (enabledKinds.has(kind)) {
      setGrants(grants.filter((g) => g.channel_kind !== kind));
    } else {
      const meta = CHANNELS.find((c) => c.kind === kind);
      setGrants([
        ...grants,
        {
          channel_kind: kind,
          ...(meta?.defaultPerms ?? { can_read: true, can_publish: false, can_edit: false, can_manage_budget: false }),
        },
      ]);
    }
  }

  function updateGrant(kind: ChannelKind, perm: keyof Omit<ChannelGrant, 'channel_kind'>, value: boolean) {
    setGrants(grants.map((g) => (g.channel_kind === kind ? { ...g, [perm]: value } : g)));
  }

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      // If role changed, re-invite (idempotent — updates row).
      if (role !== member.role) {
        await callRpc('team_invite_by_email', {
          p_email: member.email,
          p_role: role,
          p_display_name: member.display_name,
          p_grants: grants,
        });
      } else {
        await callRpc('team_update_grants', {
          p_member_id: member.id,
          p_grants: grants,
        });
      }
      toast({ title: 'Grants updated', variant: 'success' });
      onSaved();
    } catch (err) {
      const msg = err instanceof RpcError ? err.message : 'Failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <Title>Edit grants — {member.display_name ?? member.email}</Title>
            <Text className="mt-1 text-xs text-navy-400">{member.email}</Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-navy-400 hover:text-navy-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-navy-600 mb-1">Role</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['content_creator', 'traffic_manager', 'messaging_manager'] as TeamRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                disabled={busy}
                className={
                  'rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-50 ' +
                  (role === r
                    ? 'border-brand-400 bg-brand-50 text-brand-800'
                    : 'border-navy-100 text-navy-600 hover:border-brand-200')
                }
              >
                {TEAM_ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <GrantsMatrix
          grants={grants}
          enabledKinds={enabledKinds}
          onToggleChannel={toggleChannel}
          onUpdateGrant={updateGrant}
          disabled={busy}
        />

        <Card className="mt-4 !bg-navy-50/50">
          <Text className="text-xs text-navy-500">
            <strong>Limit to specific campaigns</strong> · available once Meta /
            Google Ads APIs are connected. Today an empty override = sees all
            campaigns of the channel. Preencher = inclusion list.
          </Text>
          <button
            type="button"
            disabled
            className="mt-2 rounded-md border border-navy-100 px-3 py-1.5 text-xs text-navy-400"
            title="Available after Meta/Google API connected"
          >
            Limit campaigns…
          </button>
        </Card>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-navy-100 px-4 py-2 text-sm text-navy-600 hover:border-brand-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save grants'}
          </button>
        </div>
      </Card>
    </div>
  );
}
