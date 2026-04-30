import type { UserPlan, UserStatus } from './types';

/** Status badge: paying=green, trial=amber, churned=red, never=slate. */
export function StatusBadge({ status }: { status: UserStatus }) {
  const styles: Record<UserStatus, string> = {
    paying: 'bg-brand-50 text-brand-700 ring-brand-100',
    trial: 'bg-amber-50 text-amber-700 ring-amber-100',
    churned: 'bg-rose-50 text-rose-700 ring-rose-100',
    never: 'bg-navy-50 text-navy-500 ring-navy-100',
  };
  const labels: Record<UserStatus, string> = {
    paying: 'Pagando',
    trial: 'Trial',
    churned: 'Cancelou',
    never: 'Nunca pagou',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        styles[status],
      ].join(' ')}
    >
      {labels[status]}
    </span>
  );
}

/** Plan badge: TFN/ABN/PRO colored, Free muted. */
export function PlanBadge({ plan }: { plan: UserPlan }) {
  const styles: Record<UserPlan, string> = {
    tfn: 'bg-sky-50 text-sky-700 ring-sky-100',
    abn: 'bg-violet-50 text-violet-700 ring-violet-100',
    pro: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    free: 'bg-navy-50 text-navy-400 ring-navy-100',
  };
  const labels: Record<UserPlan, string> = {
    tfn: 'TFN',
    abn: 'ABN',
    pro: 'PRO',
    free: 'Free',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        styles[plan],
      ].join(' ')}
    >
      {labels[plan]}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        isAdmin ? 'bg-rose-100 text-rose-800' : 'bg-navy-50 text-navy-500',
      ].join(' ')}
    >
      {role}
    </span>
  );
}
