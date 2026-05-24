import type { LifecycleState, UserPlan, UserStatus, UserStore } from './types';
import { LIFECYCLE_HINT, LIFECYCLE_LABEL } from './types';

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

/** Lifecycle badge — six buckets distinguishing signup-only / trial-lapsed /
 *  churned-paying / etc. Replaces the ambiguous StatusBadge. Hovering shows
 *  the LIFECYCLE_HINT line so the operator knows what to do next. */
export function LifecycleBadge({ state }: { state: LifecycleState }) {
  const styles: Record<LifecycleState, string> = {
    paying: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    trial: 'bg-amber-50 text-amber-700 ring-amber-100',
    promo: 'bg-violet-50 text-violet-700 ring-violet-100',
    trial_expired: 'bg-orange-50 text-orange-700 ring-orange-100',
    churned: 'bg-rose-50 text-rose-700 ring-rose-100',
    never_engaged: 'bg-navy-50 text-navy-500 ring-navy-100',
  };
  return (
    <span
      title={LIFECYCLE_HINT[state]}
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        styles[state],
      ].join(' ')}
    >
      {LIFECYCLE_LABEL[state]}
    </span>
  );
}

/** Store badge: distinguishes paid (App/Play Store) from comp (Promo). */
export function StoreBadge({ store }: { store: UserStore | null }) {
  if (!store) return <span className="text-[11px] text-navy-300">—</span>;
  const styles: Record<UserStore, string> = {
    app_store: 'bg-slate-50 text-slate-700 ring-slate-200',
    play_store: 'bg-lime-50 text-lime-700 ring-lime-100',
    promotional: 'bg-amber-50 text-amber-800 ring-amber-200',
  };
  const labels: Record<UserStore, string> = {
    app_store: 'App Store',
    play_store: 'Play Store',
    promotional: 'Promo',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        styles[store],
      ].join(' ')}
    >
      {labels[store]}
    </span>
  );
}

/** Platform badge: iOS (slate) vs Android (lime). Falls back to em-dash. */
export function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return <span className="text-[11px] text-navy-300">—</span>;
  const p = platform.toLowerCase();
  const isIos = p === 'ios' || p === 'app_store' || p === 'macos';
  const isAndroid = p === 'android' || p === 'play_store';
  if (!isIos && !isAndroid) {
    return <span className="text-[11px] text-navy-300">—</span>;
  }
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        isIos
          ? 'bg-slate-50 text-slate-700 ring-slate-200'
          : 'bg-lime-50 text-lime-700 ring-lime-100',
      ].join(' ')}
    >
      {isIos ? 'iOS' : 'Android'}
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
