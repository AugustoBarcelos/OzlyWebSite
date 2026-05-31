// Compact badge for the Members table — at-a-glance "who pays for this seat".
//
// Pulls from user_entitlements (topup_*) + org_entitlement_grants (subsidy) +
// revenuecat_snapshot.plan (self-paid). The data fetch is centralised in
// `useMembersBillingState` so the table makes ONE round-trip for all rows.

import type { BillingSource } from '@/lib/orgMembers';

interface Props {
  source: BillingSource;
  orgName?: string;
}

const COPY: Record<BillingSource, { label: string; tone: string; description: string }> = {
  org_only: {
    label: '🏢 On org plan',
    tone:  'bg-brand-50 text-brand-700 ring-brand-100',
    description: 'Covered fully by this org subscription.',
  },
  topup_abn: {
    label: '➕ ABN top-up',
    tone:  'bg-amber-50 text-amber-700 ring-amber-100',
    description: 'Org plan + $5/mo store top-up (full ABN access).',
  },
  topup_pro: {
    label: '➕ PRO top-up',
    tone:  'bg-purple-50 text-purple-700 ring-purple-100',
    description: 'Org plan + $9/mo store top-up (full PRO access).',
  },
  self_paid_abn: {
    label: '💼 Self-paid ABN',
    tone:  'bg-navy-50 text-navy-700 ring-navy-100',
    description: 'Member pays their own ABN — your org plan covers nothing for them.',
  },
  self_paid_pro: {
    label: '💼 Self-paid PRO',
    tone:  'bg-navy-50 text-navy-700 ring-navy-100',
    description: 'Member pays their own PRO plan.',
  },
  none: {
    label: '·',
    tone:  'bg-rose-50 text-rose-700 ring-rose-100',
    description: 'Not covered by any plan — they cannot send invoices.',
  },
};

export function MixedBillingBadge({ source }: Props) {
  const c = COPY[source];
  return (
    <span
      title={c.description}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${c.tone}`}
    >
      {c.label}
    </span>
  );
}
