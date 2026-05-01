import { useMemo, useState } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { supabase } from '@/lib/supabase';
import { callRpc, RpcError } from '@/lib/rpc';
import { CHANNELS, ROLE_PRESETS, TEAM_ROLE_LABELS } from '@/lib/channels';
import type { ChannelGrant, ChannelKind, TeamRole } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { GrantsMatrix } from './GrantsMatrix';
import { appUrl } from '@/lib/env';

interface Props {
  onClose: () => void;
  onInvited: () => void;
}

/**
 * Convidar um team member novo.
 *
 * Fluxo:
 *  1. Admin preenche email + role + ajusta matriz de grants (preset por role)
 *  2. Frontend chama signInWithOtp(email) → Supabase cria auth.users + envia
 *     magic link (mesmo do admin login). Sem reset de password.
 *  3. RPC `team_invite_by_email` (admin-only, SECURITY DEFINER) faz lookup
 *     do user por email e cria team_members + channel_grants atomicamente.
 *
 * Limitação: signInWithOtp client-side não retorna user_id imediatamente.
 * O lookup por email no RPC server-side resolve isso — a criação do auth.users
 * pelo signInWithOtp é síncrona, então quando o RPC roda o user já existe.
 */
export function InviteMemberDialog({ onClose, onInvited }: Props) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<TeamRole>('content_creator');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Default grants based on selected role.
  const [grants, setGrants] = useState<ChannelGrant[]>(() =>
    buildDefaultGrants('content_creator'),
  );

  function buildDefaultGrants(r: TeamRole): ChannelGrant[] {
    if (r === 'admin') return [];
    const kinds = ROLE_PRESETS[r] ?? [];
    return kinds.map((kind) => {
      const meta = CHANNELS.find((c) => c.kind === kind);
      return {
        channel_kind: kind,
        ...(meta?.defaultPerms ?? { can_read: true, can_publish: false, can_edit: false, can_manage_budget: false }),
      };
    });
  }

  function handleRoleChange(r: TeamRole) {
    setRole(r);
    setGrants(buildDefaultGrants(r));
  }

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

  async function handleSubmit() {
    setError(null);
    if (!email.includes('@')) {
      setError('Valid email required');
      return;
    }
    setBusy(true);
    try {
      // Step 1: send magic link (creates auth.users if doesn't exist).
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${appUrl()}/auth/callback`, shouldCreateUser: true },
      });
      if (otpErr) throw otpErr;

      // Step 2: register team_member via RPC. We need user_id, which requires
      // looking it up. Use the helper RPC that does both lookup + invite.
      const result = await callRpc<{ ok: boolean; member_id: string }>('team_invite_by_email', {
        p_email: email.trim().toLowerCase(),
        p_role: role,
        p_display_name: displayName.trim() || null,
        p_grants: grants,
      });
      if (!result.ok) throw new Error('Invite failed');

      toast({
        title: 'Member invited',
        description: `Magic link sent to ${email}. They get access on first login.`,
        variant: 'success',
      });
      onInvited();
    } catch (err) {
      const msg = err instanceof RpcError ? err.message : err instanceof Error ? err.message : 'Failed';
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
            <Title>Invite team member</Title>
            <Text className="mt-1 text-xs text-navy-400">
              Magic link sent on save. They access the portal as soon as they click.
            </Text>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50"
              placeholder="maria@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Display name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50"
              placeholder="Maria Silva"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-navy-600 mb-1">Role</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['content_creator', 'traffic_manager', 'messaging_manager'] as TeamRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
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
          <Text className="mt-1 text-xs text-navy-400">
            Role only sets default channel selection — you can override below.
          </Text>
        </div>

        <GrantsMatrix
          grants={grants}
          enabledKinds={enabledKinds}
          onToggleChannel={toggleChannel}
          onUpdateGrant={updateGrant}
          disabled={busy}
        />

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
            onClick={() => void handleSubmit()}
            disabled={busy || !email.includes('@')}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </Card>
    </div>
  );
}
