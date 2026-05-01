import { Text } from '@tremor/react';
import { CHANNELS, channelsByGroup } from '@/lib/channels';
import type { ChannelGrant, ChannelKind } from '@/lib/auth';

interface Props {
  grants: ChannelGrant[];
  enabledKinds: Set<ChannelKind>;
  onToggleChannel: (kind: ChannelKind) => void;
  onUpdateGrant: (
    kind: ChannelKind,
    perm: keyof Omit<ChannelGrant, 'channel_kind'>,
    value: boolean,
  ) => void;
  disabled?: boolean;
}

const PERM_COLS: Array<{
  key: keyof Omit<ChannelGrant, 'channel_kind'>;
  label: string;
  hint: string;
}> = [
  { key: 'can_read', label: 'Read', hint: 'See data + insights' },
  { key: 'can_publish', label: 'Publish', hint: 'Post / send / launch campaigns' },
  { key: 'can_edit', label: 'Edit', hint: 'Modify drafts + creative' },
  { key: 'can_manage_budget', label: 'Budget', hint: 'Change ad spend / pause / resume' },
];

const GROUP_LABELS: Record<'organic' | 'paid' | 'messaging', string> = {
  organic: 'Organic social',
  paid: 'Paid ads',
  messaging: 'Messaging',
};

/**
 * Reusable matrix used by Invite + Edit dialogs.
 * Shows channel × permission checkboxes grouped by area.
 */
export function GrantsMatrix({
  grants,
  enabledKinds,
  onToggleChannel,
  onUpdateGrant,
  disabled,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Text className="text-xs font-medium text-navy-600">
          Channel grants ({grants.length} of {CHANNELS.length} enabled)
        </Text>
      </div>

      {(['organic', 'paid', 'messaging'] as const).map((group) => {
        const channels = channelsByGroup(group);
        return (
          <div key={group} className="rounded-md border border-navy-50 overflow-hidden">
            <div className="bg-navy-50/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
              {GROUP_LABELS[group]}
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-navy-50 bg-white">
                <tr className="text-left text-[10px] uppercase tracking-wide text-navy-400">
                  <th className="px-3 py-1.5 w-1/3">Channel</th>
                  {PERM_COLS.map((c) => (
                    <th key={c.key} className="px-2 py-1.5 text-center" title={c.hint}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => {
                  const enabled = enabledKinds.has(ch.kind);
                  const grant = grants.find((g) => g.channel_kind === ch.kind);
                  return (
                    <tr key={ch.kind} className="border-b border-navy-50 last:border-0">
                      <td className="px-3 py-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => onToggleChannel(ch.kind)}
                            disabled={disabled}
                            className="h-4 w-4 rounded border-navy-300 text-brand-500 focus:ring-brand-400"
                          />
                          <span className="text-base">{ch.icon}</span>
                          <span className="text-sm">{ch.label}</span>
                        </label>
                      </td>
                      {PERM_COLS.map((p) => (
                        <td key={p.key} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            disabled={disabled || !enabled}
                            checked={enabled && grant ? Boolean(grant[p.key]) : false}
                            onChange={(e) => onUpdateGrant(ch.kind, p.key, e.target.checked)}
                            className="h-4 w-4 rounded border-navy-300 text-brand-500 focus:ring-brand-400 disabled:opacity-30"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
