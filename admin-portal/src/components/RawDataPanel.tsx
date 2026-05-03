import { useState } from 'react';
import { useEngineerMode } from '@/lib/useEngineerMode';
import { downloadJson } from '@/lib/csvExport';
import { ChevronDownIcon, CommandIcon } from './Icons';

export interface RawSource {
  /** RPC name or data origin (e.g. `admin_kpi_dashboard`) */
  rpc: string;
  /** Params used in the call (object) — null/empty if none */
  params?: Record<string, unknown> | null;
  /** Raw payload returned */
  data: unknown;
  /** Optional notes (e.g. "fallback to mock — RPC missing") */
  note?: string;
}

interface RawDataPanelProps {
  /** Page identifier — used as a CSV/JSON download filename suffix */
  page: string;
  sources: ReadonlyArray<RawSource>;
}

/**
 * Engineer-mode-only debug panel — renders nothing unless engineer mode is on.
 *
 * Drop one in any data-heavy page to expose the raw RPC payloads, params,
 * and a JSON export button. The panel collapses on default to keep the
 * page tidy.
 */
export function RawDataPanel({ page, sources }: RawDataPanelProps) {
  const { enabled } = useEngineerMode();
  const [expanded, setExpanded] = useState(false);
  if (!enabled) return null;

  return (
    <section className="ozly-card overflow-hidden border-navy-200 bg-navy-700/95 text-navy-50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-700"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <CommandIcon className="h-4 w-4 text-brand-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-200">
            raw data — {page}
          </span>
          <span className="text-[11px] text-navy-200">
            {sources.length} source{sources.length === 1 ? '' : 's'}
          </span>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-navy-200 transition-transform ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-navy-600 px-4 py-4">
          {sources.map((src, i) => (
            <SourceBlock key={`${src.rpc}-${i}`} source={src} pagePrefix={page} />
          ))}
        </div>
      )}
    </section>
  );
}

function SourceBlock({ source, pagePrefix }: { source: RawSource; pagePrefix: string }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(source.data, null, 2);
  const preview = json.length > 200 ? json.slice(0, 200) + '…' : json;

  return (
    <div className="rounded-md border border-navy-600 bg-navy-800/60">
      <div className="flex items-center justify-between gap-2 border-b border-navy-700 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <code className="truncate font-mono text-xs font-semibold text-brand-300">
            {source.rpc}
          </code>
          {source.note && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
              {source.note}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              downloadJson(`${pagePrefix}-${source.rpc}.json`, source.data)
            }
            className="rounded-md border border-navy-600 bg-navy-900 px-2 py-1 text-[10px] font-medium text-navy-100 hover:border-brand-400 hover:text-brand-300"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-navy-600 bg-navy-900 px-2 py-1 text-[10px] font-medium text-navy-100 hover:border-brand-400 hover:text-brand-300"
          >
            {open ? 'Hide' : 'Expand'}
          </button>
        </div>
      </div>
      {source.params && Object.keys(source.params).length > 0 && (
        <div className="border-b border-navy-700 px-3 py-2 text-[11px] text-navy-200">
          <span className="font-semibold uppercase tracking-wider text-navy-300">
            params:
          </span>{' '}
          <code className="font-mono text-brand-200">
            {JSON.stringify(source.params)}
          </code>
        </div>
      )}
      <pre className="overflow-x-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-navy-100">
        {open ? json : preview}
      </pre>
    </div>
  );
}

/**
 * Small toggle button for the topbar.
 */
export function EngineerModeToggle() {
  const { enabled, toggle } = useEngineerMode();
  return (
    <button
      type="button"
      onClick={toggle}
      title="Engineer mode (toggle with `r`)"
      aria-pressed={enabled}
      className={[
        'hidden items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors lg:flex',
        enabled
          ? 'border-brand-300 bg-brand-50 text-brand-700'
          : 'border-navy-100 bg-white text-navy-400 hover:border-brand-200 hover:text-brand-600',
      ].join(' ')}
    >
      <span className="font-mono text-[10px]">{'</>'}</span>
      <span>Raw{enabled ? ' on' : ''}</span>
      <kbd className="hidden rounded border border-navy-100 bg-navy-50 px-1 py-0.5 font-mono text-[10px] text-navy-400 lg:inline">
        r
      </kbd>
    </button>
  );
}
