import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Spinner } from '@/components/Spinner';

export type Option = { value: string; label: string };
export type SortDir = 'asc' | 'desc' | null;
export type DateRange = { from: string; to: string };

const inputCls =
  'w-full rounded-md border border-navy-100 bg-white px-2.5 py-1.5 text-sm text-navy-700 placeholder:text-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

function Arrow({ dir }: { dir: SortDir }) {
  if (!dir) return null;
  return <span className="text-brand-600">{dir === 'asc' ? '↑' : '↓'}</span>;
}

function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" className={active ? 'text-brand-600' : 'opacity-50'} aria-hidden>
      <path d="M2.5 4.5h15L12 11.2v4.3l-4 1.5v-5.8z" />
    </svg>
  );
}

/**
 * Shared popover shell for column headers: the trigger button (label + sort
 * arrow + funnel), fixed positioning (so it escapes the table's scroll clip),
 * click-outside / scroll-to-close, and the sort asc/desc row. `children` is a
 * render-prop given a `close()` callback for the column-specific body.
 */
function FilterShell({
  label,
  active,
  align = 'left',
  width = 240,
  sortDir,
  onSort,
  children,
}: {
  label: string;
  active: boolean;
  align?: 'left' | 'right';
  width?: number;
  sortDir: SortDir;
  onSort: (dir: 'asc' | 'desc') => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const left = align === 'right' ? b.right - width : b.left;
    setPos({ top: b.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  const sortBtn = (dir: 'asc' | 'desc', text: string) => (
    <button
      type="button"
      onClick={() => onSort(dir)}
      className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
        sortDir === dir ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50'
      }`}
    >
      {text}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 font-medium ${active || sortDir ? 'text-brand-600' : 'text-navy-400 hover:text-navy-600'}`}
      >
        {label}
        <Arrow dir={sortDir} />
        <FunnelIcon active={active} />
      </button>
      {open && pos && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
          className="z-50 rounded-xl border border-navy-100 bg-white p-3 shadow-xl"
        >
          <div className="flex gap-1.5">
            {sortBtn('asc', '↑ Asc')}
            {sortBtn('desc', '↓ Desc')}
          </div>
          <div className="mt-2 border-t border-navy-50 pt-2">{children(() => setOpen(false))}</div>
        </div>
      )}
    </>
  );
}

/**
 * Distinct-value checklist column filter: a search box + the values that exist
 * in the data, multi-select. `options === undefined` means still loading.
 */
export function ColumnFilter({
  label,
  align = 'left',
  options,
  selected,
  onChange,
  sortDir,
  onSort,
  numericSort = false,
  formatLabel,
  searchPlaceholder = 'Type to filter…',
}: {
  label: string;
  align?: 'left' | 'right';
  options: Option[] | undefined;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  sortDir: SortDir;
  onSort: (dir: 'asc' | 'desc') => void;
  numericSort?: boolean;
  formatLabel?: (raw: string) => string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState('');
  const display = (o: Option) => (formatLabel ? formatLabel(o.label) : o.label);

  const sorted = useMemo(() => {
    const arr = [...(options ?? [])];
    if (numericSort) arr.sort((a, b) => Number(a.value) - Number(b.value));
    return arr;
  }, [options, numericSort]);

  const filtered = useMemo(() => {
    if (!q) return sorted;
    const needle = q.toLowerCase();
    return sorted.filter((o) => display(o).toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, q, formatLabel]);

  function toggle(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next);
  }

  return (
    <FilterShell label={label} align={align} active={selected.size > 0} sortDir={sortDir} onSort={onSort}>
      {() => (
        <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className={inputCls} />
          <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto">
            {options === undefined ? (
              <div className="flex justify-center py-3">
                <Spinner size="sm" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-1 py-2 text-xs text-navy-400">{q ? 'No matches' : 'No values'}</p>
            ) : (
              filtered.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-navy-700 hover:bg-navy-50">
                  <input
                    type="checkbox"
                    checked={selected.has(o.value)}
                    onChange={() => toggle(o.value)}
                    className="h-3.5 w-3.5 rounded border-navy-200 text-brand-600 focus:ring-brand-200"
                  />
                  <span className="truncate">{display(o)}</span>
                </label>
              ))
            )}
          </div>
          {selected.size > 0 && (
            <button type="button" onClick={() => onChange(new Set())} className="mt-2 w-full rounded-md px-2 py-1 text-xs font-medium text-navy-500 hover:bg-navy-50">
              Clear ({selected.size})
            </button>
          )}
        </>
      )}
    </FilterShell>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const lastDayOf = (y: number, m: number) => new Date(y, m, 0).getDate(); // m is 1-12

/**
 * Date column filter: pick an interval with the native calendar (From / To) or
 * drill a Year → Month → Day tree of the dates that exist. Both produce one
 * {from, to} range (inclusive of both ends).
 */
export function DateColumnFilter({
  label,
  align = 'left',
  dates,
  range,
  onChange,
  sortDir,
  onSort,
}: {
  label: string;
  align?: 'left' | 'right';
  dates: string[] | undefined; // 'YYYY-MM-DD'[]
  range: DateRange;
  onChange: (next: DateRange) => void;
  sortDir: SortDir;
  onSort: (dir: 'asc' | 'desc') => void;
}) {
  // tree: year -> month(1-12) -> sorted unique days
  const tree = useMemo(() => {
    const map = new Map<number, Map<number, Set<number>>>();
    for (const d of dates ?? []) {
      const [y, m, day] = d.split('-').map(Number);
      if (!y || !m || !day) continue;
      if (!map.has(y)) map.set(y, new Map());
      const months = map.get(y)!;
      if (!months.has(m)) months.set(m, new Set());
      months.get(m)!.add(day);
    }
    return map;
  }, [dates]);

  const years = useMemo(() => [...tree.keys()].sort((a, b) => b - a), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-open the most recent year once the data arrives.
  useEffect(() => {
    if (years.length > 0) setExpanded((prev) => (prev.size === 0 ? new Set([`y:${years[0]}`]) : prev));
  }, [years]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const active = !!range.from || !!range.to;
  const eq = (from: string, to: string) => range.from === from && range.to === to;
  const nodeCls = (selected: boolean) =>
    `flex-1 rounded px-1.5 py-0.5 text-left text-xs ${selected ? 'bg-brand-50 font-medium text-brand-700' : 'text-navy-600 hover:bg-navy-50'}`;

  return (
    <FilterShell label={label} align={align} width={272} active={active} sortDir={sortDir} onSort={onSort}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium text-navy-500">
              From
              <input type="date" value={range.from} onChange={(e) => onChange({ ...range, from: e.target.value })} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-[11px] font-medium text-navy-500">
              To
              <input type="date" value={range.to} onChange={(e) => onChange({ ...range, to: e.target.value })} className={`mt-1 ${inputCls}`} />
            </label>
          </div>

          <div className="mt-3 border-t border-navy-50 pt-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-navy-300">Browse</div>
            <div className="max-h-56 overflow-y-auto pr-1">
              {dates === undefined ? (
                <div className="flex justify-center py-3">
                  <Spinner size="sm" />
                </div>
              ) : years.length === 0 ? (
                <p className="px-1 py-2 text-xs text-navy-400">No dates</p>
              ) : (
                years.map((y) => {
                  const yKey = `y:${y}`;
                  const yOpen = expanded.has(yKey);
                  const months = [...tree.get(y)!.keys()].sort((a, b) => b - a);
                  return (
                    <div key={y}>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => toggle(yKey)} className="w-4 text-navy-300 hover:text-navy-500" aria-label="Toggle year">
                          {yOpen ? '▾' : '▸'}
                        </button>
                        <button type="button" onClick={() => onChange({ from: `${y}-01-01`, to: `${y}-12-31` })} className={nodeCls(eq(`${y}-01-01`, `${y}-12-31`))}>
                          {y}
                        </button>
                      </div>
                      {yOpen &&
                        months.map((m) => {
                          const mKey = `m:${y}-${m}`;
                          const mOpen = expanded.has(mKey);
                          const mFrom = `${y}-${pad2(m)}-01`;
                          const mTo = `${y}-${pad2(m)}-${pad2(lastDayOf(y, m))}`;
                          const days = [...tree.get(y)!.get(m)!].sort((a, b) => a - b);
                          return (
                            <div key={m} className="ml-4">
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => toggle(mKey)} className="w-4 text-navy-300 hover:text-navy-500" aria-label="Toggle month">
                                  {mOpen ? '▾' : '▸'}
                                </button>
                                <button type="button" onClick={() => onChange({ from: mFrom, to: mTo })} className={nodeCls(eq(mFrom, mTo))}>
                                  {MONTHS[m - 1]} {y}
                                </button>
                              </div>
                              {mOpen && (
                                <div className="ml-6 flex flex-wrap gap-1 py-1">
                                  {days.map((d) => {
                                    const ds = `${y}-${pad2(m)}-${pad2(d)}`;
                                    return (
                                      <button
                                        key={d}
                                        type="button"
                                        onClick={() => onChange({ from: ds, to: ds })}
                                        className={`h-6 w-6 rounded text-xs ${eq(ds, ds) ? 'bg-brand-600 text-white' : 'text-navy-600 hover:bg-navy-50'}`}
                                      >
                                        {d}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {active && (
            <button type="button" onClick={() => onChange({ from: '', to: '' })} className="mt-2 w-full rounded-md px-2 py-1 text-xs font-medium text-navy-500 hover:bg-navy-50">
              Clear
            </button>
          )}
        </>
      )}
    </FilterShell>
  );
}
