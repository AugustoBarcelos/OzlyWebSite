import type { InvoiceStatus, MembershipStatus } from '@/lib/types';

interface Style {
  pill: string;
  dot: string;
}

const INVOICE_STYLE: Record<InvoiceStatus, Style> = {
  draft: { pill: 'bg-navy-50 text-navy-500', dot: 'bg-navy-300' },
  sent: { pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  overdue: { pill: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  paid: { pill: 'bg-brand-50 text-brand-700', dot: 'bg-brand-500' },
};

const MEMBER_STYLE: Record<MembershipStatus, Style> = {
  pending: { pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  accepted: { pill: 'bg-brand-50 text-brand-700', dot: 'bg-brand-500' },
  declined: { pill: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  removed: { pill: 'bg-navy-50 text-navy-400', dot: 'bg-navy-300' },
};

function Pill({ style, label }: { style: Style; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.pill}`}
    >
      <span className={`dot ${style.dot}`} />
      {label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Pill style={INVOICE_STYLE[status]} label={status} />;
}

export function MemberStatusBadge({ status }: { status: MembershipStatus }) {
  return <Pill style={MEMBER_STYLE[status]} label={status} />;
}
