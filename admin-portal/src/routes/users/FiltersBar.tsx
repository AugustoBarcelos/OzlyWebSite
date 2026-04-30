import { useEffect, useRef, useState } from 'react';
import {
  AU_STATES,
  EMPTY_FILTERS,
  PLAN_LABEL,
  STATUS_LABEL,
  countActiveFilters,
  type UserFilters,
  type UserPlan,
  type UserStatus,
} from './types';
import { SearchIcon, XIcon } from '@/components/Icons';

interface Props {
  filters: UserFilters;
  onChange: (next: UserFilters) => void;
  loading: boolean;
}

/**
 * Toolbar with search, multiselect filters and a "Limpar" pill.
 * Each dropdown is a self-contained <details> for keyboard + click-outside
 * support without bringing in a popover library.
 */
export function FiltersBar({ filters, onChange, loading }: Props) {
  const set = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const active = countActiveFilters(filters);

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <label htmlFor="user-list-search" className="sr-only">
          Buscar
        </label>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-navy-100 bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
          <SearchIcon className="h-4 w-4 text-navy-300" />
          <input
            id="user-list-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="email ou nome (3+ chars)…"
            className="flex-1 bg-transparent text-sm text-navy-700 placeholder:text-navy-300 focus:outline-none"
          />
        </div>

        {/* Plan */}
        <MultiSelect
          label="Plano"
          options={(['tfn', 'abn', 'pro', 'free'] as UserPlan[]).map((p) => ({
            value: p,
            label: PLAN_LABEL[p],
          }))}
          values={filters.plans}
          onChange={(v) => set('plans', v as UserPlan[])}
        />

        {/* Status */}
        <MultiSelect
          label="Status"
          options={(['paying', 'trial', 'churned', 'never'] as UserStatus[]).map(
            (s) => ({ value: s, label: STATUS_LABEL[s] }),
          )}
          values={filters.statuses}
          onChange={(v) => set('statuses', v as UserStatus[])}
        />

        {/* Signup */}
        <SingleSelect
          label="Signup"
          options={[
            { value: '', label: 'Tudo' },
            { value: '7', label: 'Últ. 7 dias' },
            { value: '30', label: 'Últ. 30 dias' },
            { value: '90', label: 'Últ. 90 dias' },
            { value: '365', label: 'Últ. 12 meses' },
          ]}
          value={filters.signup_within_days ? String(filters.signup_within_days) : ''}
          onChange={(v) => set('signup_within_days', v ? Number(v) : null)}
        />

        {/* Atividade */}
        <SingleSelect
          label="Atividade"
          options={[
            { value: '', label: 'Tudo' },
            { value: 'a7', label: 'Ativo 7 dias' },
            { value: 'a30', label: 'Ativo 30 dias' },
            { value: 'i', label: 'Inativo > 30 dias' },
          ]}
          value={
            filters.inactive
              ? 'i'
              : filters.active_within_days === 7
                ? 'a7'
                : filters.active_within_days === 30
                  ? 'a30'
                  : ''
          }
          onChange={(v) => {
            if (v === 'i') {
              onChange({ ...filters, inactive: true, active_within_days: null });
            } else if (v === 'a7') {
              onChange({ ...filters, active_within_days: 7, inactive: false });
            } else if (v === 'a30') {
              onChange({ ...filters, active_within_days: 30, inactive: false });
            } else {
              onChange({ ...filters, active_within_days: null, inactive: false });
            }
          }}
        />

        {/* Mais filtros — colapsáveis pra não poluir */}
        <MoreFiltersDropdown filters={filters} onChange={onChange} />

        {/* Limpar */}
        {(active > 0 || filters.query.trim()) && (
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-500 transition-colors hover:border-rose-200 hover:text-rose-700"
          >
            <XIcon className="h-3 w-3" />
            Limpar ({active + (filters.query.trim() ? 1 : 0)})
          </button>
        )}

        {loading && (
          <span className="ml-auto text-[11px] text-navy-300" aria-live="polite">
            atualizando…
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Single + Multi select primitives (no popover lib) ───────────────────────

interface Option {
  value: string;
  label: string;
}

function SingleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  const current = options.find((o) => o.value === value);
  const isActive = !!value;
  return (
    <label
      className={[
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
        isActive
          ? 'border-brand-300 bg-brand-50 text-brand-700'
          : 'border-navy-100 bg-white text-navy-600 hover:border-brand-200',
      ].join(' ')}
    >
      <span className="text-navy-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer bg-transparent pr-3 text-xs font-medium focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="sr-only">{current?.label}</span>
    </label>
  );
}

function MultiSelect({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const isActive = values.length > 0;
  const summary =
    values.length === 0
      ? 'Tudo'
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? values[0])
        : `${values.length} selecionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
          isActive
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-navy-100 bg-white text-navy-600 hover:border-brand-200',
        ].join(' ')}
      >
        <span className="text-navy-400">{label}:</span>
        <span>{summary}</span>
        <span aria-hidden className="text-navy-300">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-md border border-navy-100 bg-white p-1 shadow-lg"
        >
          {options.map((o) => {
            const checked = values.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-navy-600 hover:bg-brand-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...values, o.value]);
                    else onChange(values.filter((v) => v !== o.value));
                  }}
                  className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MoreFiltersDropdown({
  filters,
  onChange,
}: {
  filters: UserFilters;
  onChange: (next: UserFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const moreActive =
    !!filters.role ||
    filters.state.length > 0 ||
    filters.banned !== null ||
    filters.deleted !== null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
          moreActive
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-navy-100 bg-white text-navy-600 hover:border-brand-200',
        ].join(' ')}
      >
        Mais filtros
        <span aria-hidden className="text-navy-300">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-md border border-navy-100 bg-white p-3 shadow-lg">
          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 font-medium text-navy-600">Role</div>
              <div className="flex gap-1.5">
                {(['admin', 'user'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      onChange({ ...filters, role: filters.role === r ? null : r })
                    }
                    className={[
                      'rounded px-2 py-1 ring-1 ring-inset',
                      filters.role === r
                        ? 'bg-brand-50 text-brand-700 ring-brand-200'
                        : 'bg-white text-navy-500 ring-navy-100 hover:bg-navy-50',
                    ].join(' ')}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 font-medium text-navy-600">Estado (AU)</div>
              <div className="flex flex-wrap gap-1">
                {AU_STATES.map((s) => {
                  const on = filters.state.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...filters,
                          state: on
                            ? filters.state.filter((x) => x !== s)
                            : [...filters.state, s],
                        })
                      }
                      className={[
                        'rounded px-1.5 py-0.5 text-[11px] ring-1 ring-inset',
                        on
                          ? 'bg-brand-50 text-brand-700 ring-brand-200'
                          : 'bg-white text-navy-500 ring-navy-100 hover:bg-navy-50',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Tristate
                label="Banido"
                value={filters.banned}
                onChange={(v) => onChange({ ...filters, banned: v })}
              />
              <Tristate
                label="Deletado"
                value={filters.deleted}
                onChange={(v) => onChange({ ...filters, deleted: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tristate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const next = (curr: boolean | null): boolean | null =>
    curr === null ? true : curr === true ? false : null;
  const display = value === null ? 'Tudo' : value ? 'Sim' : 'Não';
  return (
    <button
      type="button"
      onClick={() => onChange(next(value))}
      className={[
        'rounded border px-2 py-1 text-left',
        value !== null
          ? 'border-brand-300 bg-brand-50 text-brand-700'
          : 'border-navy-100 bg-white text-navy-500 hover:bg-navy-50',
      ].join(' ')}
    >
      <span className="block text-[10px] uppercase tracking-wide text-navy-400">
        {label}
      </span>
      <span className="font-medium">{display}</span>
    </button>
  );
}
