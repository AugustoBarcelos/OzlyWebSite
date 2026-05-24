import type { LifecycleState, UserFilters, UserListStats, UserPlan, UserStore } from './types';

interface Props {
  totalUnfiltered: number;
  totalFiltered: number;
  stats: UserListStats;
  filters: UserFilters;
  onToggleLifecycle: (state: LifecycleState) => void;
  onTogglePlan: (plan: UserPlan) => void;
  onToggleStore?: (store: UserStore) => void;
}

/**
 * Stat ribbon — counts reflect the *filtered* set so the numbers match the
 * table below. Click on a status/plan chip toggles that filter.
 */
export function StatRibbon({
  totalUnfiltered,
  totalFiltered,
  stats,
  filters,
  onToggleLifecycle,
  onTogglePlan,
  onToggleStore,
}: Props) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <div>
          <span className="text-[10px] uppercase tracking-wide text-navy-400">
            Resultado
          </span>
          <div className="text-lg font-semibold text-navy-700">
            {totalFiltered.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-navy-300">
              de {totalUnfiltered.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="ml-2 hidden h-8 w-px bg-navy-100 sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            label="Pagando"
            value={stats.lc_paying}
            tone="emerald"
            active={filters.lifecycles.includes('paying')}
            onClick={() => onToggleLifecycle('paying')}
          />
          <Chip
            label="Trial"
            value={stats.lc_trial}
            tone="amber"
            active={filters.lifecycles.includes('trial')}
            onClick={() => onToggleLifecycle('trial')}
          />
          <Chip
            label="Promo"
            value={stats.lc_promo}
            tone="violet"
            active={filters.lifecycles.includes('promo')}
            onClick={() => onToggleLifecycle('promo')}
          />
          <Chip
            label="Trial expirou"
            value={stats.lc_trial_expired}
            tone="orange"
            active={filters.lifecycles.includes('trial_expired')}
            onClick={() => onToggleLifecycle('trial_expired')}
          />
          <Chip
            label="Churn"
            value={stats.lc_churned}
            tone="rose"
            active={filters.lifecycles.includes('churned')}
            onClick={() => onToggleLifecycle('churned')}
          />
          <Chip
            label="Nunca engajou"
            value={stats.lc_never_engaged}
            tone="slate"
            active={filters.lifecycles.includes('never_engaged')}
            onClick={() => onToggleLifecycle('never_engaged')}
          />
        </div>

        <div className="ml-2 hidden h-8 w-px bg-navy-100 sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            label="TFN"
            value={stats.plan_tfn}
            tone="sky"
            active={filters.plans.includes('tfn')}
            onClick={() => onTogglePlan('tfn')}
          />
          <Chip
            label="ABN"
            value={stats.plan_abn}
            tone="violet"
            active={filters.plans.includes('abn')}
            onClick={() => onTogglePlan('abn')}
          />
          <Chip
            label="PRO"
            value={stats.plan_pro}
            tone="emerald"
            active={filters.plans.includes('pro')}
            onClick={() => onTogglePlan('pro')}
          />
          <Chip
            label="Free"
            value={stats.plan_free}
            tone="slate"
            active={filters.plans.includes('free')}
            onClick={() => onTogglePlan('free')}
          />
        </div>

        {onToggleStore && (stats.store_promotional > 0 || filters.stores.includes('promotional')) && (
          <>
            <div className="ml-2 hidden h-8 w-px bg-navy-100 sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip
                label="Promo"
                value={stats.store_promotional}
                tone="amber"
                active={filters.stores.includes('promotional')}
                onClick={() => onToggleStore('promotional')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type Tone = 'brand' | 'amber' | 'orange' | 'rose' | 'slate' | 'sky' | 'violet' | 'emerald';

function Chip({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: Tone;
  active: boolean;
  onClick: () => void;
}) {
  const tones: Record<Tone, { on: string; off: string }> = {
    brand: {
      on: 'bg-brand-500 text-white ring-brand-500',
      off: 'bg-brand-50 text-brand-700 ring-brand-100 hover:bg-brand-100',
    },
    amber: {
      on: 'bg-amber-500 text-white ring-amber-500',
      off: 'bg-amber-50 text-amber-700 ring-amber-100 hover:bg-amber-100',
    },
    orange: {
      on: 'bg-orange-500 text-white ring-orange-500',
      off: 'bg-orange-50 text-orange-700 ring-orange-100 hover:bg-orange-100',
    },
    rose: {
      on: 'bg-rose-500 text-white ring-rose-500',
      off: 'bg-rose-50 text-rose-700 ring-rose-100 hover:bg-rose-100',
    },
    slate: {
      on: 'bg-navy-700 text-white ring-navy-700',
      off: 'bg-navy-50 text-navy-500 ring-navy-100 hover:bg-navy-100',
    },
    sky: {
      on: 'bg-sky-500 text-white ring-sky-500',
      off: 'bg-sky-50 text-sky-700 ring-sky-100 hover:bg-sky-100',
    },
    violet: {
      on: 'bg-violet-500 text-white ring-violet-500',
      off: 'bg-violet-50 text-violet-700 ring-violet-100 hover:bg-violet-100',
    },
    emerald: {
      on: 'bg-emerald-500 text-white ring-emerald-500',
      off: 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100',
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors',
        active ? tones[tone].on : tones[tone].off,
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value.toLocaleString()}</span>
    </button>
  );
}
