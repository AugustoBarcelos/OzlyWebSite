import type { UserListStats, UserFilters, UserStatus, UserPlan } from './types';

interface Props {
  totalUnfiltered: number;
  totalFiltered: number;
  stats: UserListStats;
  filters: UserFilters;
  onToggleStatus: (status: UserStatus) => void;
  onTogglePlan: (plan: UserPlan) => void;
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
  onToggleStatus,
  onTogglePlan,
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
            value={stats.paying}
            tone="brand"
            active={filters.statuses.includes('paying')}
            onClick={() => onToggleStatus('paying')}
          />
          <Chip
            label="Trial"
            value={stats.trial}
            tone="amber"
            active={filters.statuses.includes('trial')}
            onClick={() => onToggleStatus('trial')}
          />
          <Chip
            label="Cancelou"
            value={stats.churned}
            tone="rose"
            active={filters.statuses.includes('churned')}
            onClick={() => onToggleStatus('churned')}
          />
          <Chip
            label="Nunca pagou"
            value={stats.never}
            tone="slate"
            active={filters.statuses.includes('never')}
            onClick={() => onToggleStatus('never')}
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
      </div>
    </div>
  );
}

type Tone = 'brand' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet' | 'emerald';

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
