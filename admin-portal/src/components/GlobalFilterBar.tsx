import { useGlobalFilters } from '@/lib/useGlobalFilters';
import type { ChannelValue, PeriodValue, PlanValue } from '@/lib/useGlobalFilters';
import { FilterIcon } from './Icons';

const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodValue; label: string }> = [
  { value: '1', label: '24h' },
  { value: '7', label: '7d' },
  { value: '14', label: '14d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
];

const CHANNEL_OPTIONS: ReadonlyArray<{ value: ChannelValue; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'organic', label: 'Organic' },
  { value: 'google', label: 'Google' },
  { value: 'meta', label: 'Meta' },
  { value: 'asa', label: 'ASA' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'referral', label: 'Referral' },
  { value: 'affiliate', label: 'Affiliate' },
];

const PLAN_OPTIONS: ReadonlyArray<{ value: PlanValue; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'tfn', label: 'TFN' },
  { value: 'abn', label: 'ABN' },
  { value: 'pro', label: 'PRO' },
];

interface GlobalFilterBarProps {
  /** Which filters to show (omit to show all) */
  show?: ReadonlyArray<'period' | 'channel' | 'plan'>;
  /** Slot for page-specific actions */
  rightSlot?: React.ReactNode;
}

/**
 * Sticky filter bar shown on hub/data pages. Reads/writes URL params via
 * useGlobalFilters so navigating between hubs preserves selection.
 */
export function GlobalFilterBar({
  show = ['period', 'channel', 'plan'],
  rightSlot,
}: GlobalFilterBarProps) {
  const { filters, setFilter, clearAll } = useGlobalFilters();
  const showPeriod = show.includes('period');
  const showChannel = show.includes('channel');
  const showPlan = show.includes('plan');

  const hasNonDefault =
    filters.period !== '30' ||
    filters.channel !== 'all' ||
    filters.plan !== 'all' ||
    filters.geo !== 'all';

  return (
    <div className="ozly-card flex flex-wrap items-center gap-2 bg-white p-2.5">
      <FilterIcon className="ml-1 h-3.5 w-3.5 text-navy-300" />
      {showPeriod && (
        <SegmentedControl
          ariaLabel="Período"
          value={filters.period}
          options={PERIOD_OPTIONS}
          onChange={(v) => setFilter('period', v)}
        />
      )}
      {showChannel && (
        <Select
          ariaLabel="Canal"
          value={filters.channel}
          options={CHANNEL_OPTIONS}
          onChange={(v) => setFilter('channel', v)}
        />
      )}
      {showPlan && (
        <Select
          ariaLabel="Plano"
          value={filters.plan}
          options={PLAN_OPTIONS}
          onChange={(v) => setFilter('plan', v)}
        />
      )}
      {hasNonDefault && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-1 rounded-md px-2 py-1 text-xs text-navy-400 hover:bg-navy-50 hover:text-navy-600"
        >
          Limpar
        </button>
      )}
      {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}

function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-md bg-navy-50 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-navy-400 hover:text-navy-600',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface SelectProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}

function Select<T extends string>({ ariaLabel, value, options, onChange }: SelectProps<T>) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 focus:border-brand-400 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {ariaLabel}: {opt.label}
        </option>
      ))}
    </select>
  );
}
