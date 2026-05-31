// Compliance status pills + cluster. Reusable across Members list, member
// detail modal, dashboard "issues to fix" widget, etc.

import type { ComplianceState } from '@/lib/compliance';
import { daysUntil } from '@/lib/compliance';

interface ToneCfg { bg: string; fg: string; ring: string }
const TONES: Record<'ok' | 'warn' | 'blocked', ToneCfg> = {
  ok:      { bg: 'rgba(43, 187, 151, 0.14)', fg: 'var(--color-brand-700)', ring: 'rgba(43, 187, 151, 0.30)' },
  warn:    { bg: 'rgba(245, 158, 11, 0.16)', fg: '#92400e',                 ring: 'rgba(245, 158, 11, 0.36)' },
  blocked: { bg: 'rgba(225, 29, 72, 0.14)',  fg: '#9f1239',                 ring: 'rgba(225, 29, 72, 0.32)' },
};

function Pill({ tone, label, icon }: { tone: 'ok' | 'warn' | 'blocked'; label: string; icon?: string }) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}

export function ComplianceCluster({ c }: { c: ComplianceState }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Pill
        tone={c.abn === 'verified' ? 'ok' : c.abn === 'pending' ? 'warn' : 'blocked'}
        icon={c.abn === 'verified' ? '✓' : c.abn === 'pending' ? '⋯' : '⚠'}
        label={c.abn === 'verified' ? 'ABN' : c.abn === 'pending' ? 'ABN pending' : 'ABN missing'}
      />
      {c.insurance === 'current' && (
        <Pill tone="ok" icon="✓" label="Insurance" />
      )}
      {c.insurance === 'expiring' && c.insuranceExpiresAt && (
        <Pill tone="warn" icon="!" label={`Ins. ${daysUntil(c.insuranceExpiresAt)}d`} />
      )}
      {c.insurance === 'missing' && (
        <Pill tone="blocked" icon="⚠" label="No insurance" />
      )}
      {c.agreement === 'pending' && (
        <Pill tone="warn" icon="✎" label="Agreement" />
      )}
    </div>
  );
}

/** One overall dot showing the worst state. Used when space is tight. */
export function ComplianceDot({ c }: { c: ComplianceState }) {
  const t = TONES[c.overall];
  const labels = {
    ok: 'Compliance OK',
    warn: 'Some compliance items pending',
    blocked: 'Compliance issues — invoices may not flow',
  };
  return (
    <span
      className="relative inline-flex h-2.5 w-2.5"
      title={labels[c.overall]}
      aria-label={labels[c.overall]}
    >
      <span className="absolute inline-flex h-full w-full rounded-full" style={{ background: t.bg, boxShadow: `0 0 0 1px ${t.ring}` }} />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: t.fg }} />
    </span>
  );
}
