import type { InvoiceStatus, MembershipStatus } from '@/lib/types';

interface Style {
  pill: string;
  dot: string;
}

// Pills now have a subtle ring of the same hue — gives them more presence
// without leaving the "soft" register. Reads cleaner against tinted KPI cards.
const INVOICE_STYLE: Record<InvoiceStatus, Style> = {
  draft:   { pill: 'bg-navy-50 text-navy-500 ring-1 ring-navy-100',     dot: 'bg-navy-300' },
  sent:    { pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',     dot: 'bg-blue-500' },
  overdue: { pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',     dot: 'bg-rose-500' },
  paid:    { pill: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',  dot: 'bg-brand-500' },
};

const MEMBER_STYLE: Record<MembershipStatus, Style> = {
  pending:  { pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100', dot: 'bg-amber-500' },
  accepted: { pill: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100', dot: 'bg-brand-500' },
  declined: { pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',    dot: 'bg-rose-500' },
  removed:  { pill: 'bg-navy-50 text-navy-400 ring-1 ring-navy-100',    dot: 'bg-navy-300' },
};

function Pill({ style, label }: { style: Style; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize ${style.pill}`}
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

// Tone-based generic badge for ad-hoc statuses (inbox, downgrade alerts, etc.).
export type StatusTone = 'positive' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_STYLE: Record<StatusTone, Style> = {
  positive: { pill: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100', dot: 'bg-brand-500' },
  warning:  { pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100', dot: 'bg-amber-500' },
  danger:   { pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',    dot: 'bg-rose-500'  },
  neutral:  { pill: 'bg-navy-50 text-navy-500 ring-1 ring-navy-100',    dot: 'bg-navy-300'  },
  info:     { pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',    dot: 'bg-blue-500'  },
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return <Pill style={TONE_STYLE[tone]} label={label} />;
}
