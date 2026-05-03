import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@tremor/react';
import { AlertTriangleIcon, BellIcon, XIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { useToast } from '@/components/Toast';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';
import {
  useOpsItems,
  type ItemPriority,
  type ItemStatus,
  type OpsItem,
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from './_shared';

const STATUSES: ReadonlyArray<{ status: ItemStatus; label: string }> = [
  { status: 'open', label: 'Open' },
  { status: 'doing', label: 'Investigating' },
  { status: 'resolved', label: 'Resolved' },
];

const PRIORITIES: ReadonlyArray<ItemPriority> = ['p0', 'p1', 'p2', 'p3'];

interface FormState {
  id: string | null;
  title: string;
  description: string;
  priority: ItemPriority;
  status: ItemStatus;
  area: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  description: '',
  priority: 'p1',
  status: 'open',
  area: '',
};

/**
 * /operations/incidents — production incidents log with severity + RCA.
 *
 * Filters: open / investigating / resolved. Inline status update.
 */
export function OperationsIncidentsPage() {
  const { toast } = useToast();
  const { rows, loading, error, migrationPending, refresh } = useOpsItems('incident');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ItemStatus>('all');

  async function save() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: 'Título obrigatório' });
      return;
    }
    setSaving(true);
    try {
      await callRpc('admin_operations_upsert', {
        p_id: form.id,
        p_kind: 'incident',
        p_status: form.status,
        p_priority: form.priority,
        p_title: form.title,
        p_description: form.description || null,
        p_area: form.area || null,
      });
      toast({
        variant: 'success',
        title: form.id ? 'Incident atualizado' : 'Incident criado',
      });
      setForm(EMPTY_FORM);
      refresh();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao salvar',
        description: e instanceof RpcError ? e.message : 'Erro',
      });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: OpsItem, status: ItemStatus) {
    try {
      await callRpc('admin_operations_upsert', {
        p_id: item.id,
        p_kind: 'incident',
        p_status: status,
        p_priority: item.priority,
        p_title: item.title,
        p_description: item.description,
        p_area: item.area,
      });
      refresh();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao atualizar',
        description: e instanceof RpcError ? e.message : 'Erro',
      });
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Remover este incident?')) return;
    setDeleting(id);
    try {
      await callRpc('admin_operations_delete', { p_id: id });
      refresh();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao remover',
        description: e instanceof RpcError ? e.message : 'Erro',
      });
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(item: OpsItem) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      priority: item.priority,
      status: item.status,
      area: item.area ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c = { all: rows.length, open: 0, doing: 0, resolved: 0 };
    for (const r of rows) {
      if (r.status === 'open') c.open += 1;
      else if (r.status === 'doing') c.doing += 1;
      else if (r.status === 'resolved') c.resolved += 1;
    }
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <BellIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Incidents
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Log de incidentes de produção — severidade + RCA notes.
            </p>
          </div>
        </div>
        <Link
          to="/operations"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Operations Hub
        </Link>
      </header>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">20260503170000_operations_items.sql</code> em prod.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {!migrationPending && (
        <>
          {/* Form */}
          <Card className="ozly-card">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-navy-700">
                {form.id ? 'Editar incident' : 'Novo incident'}
              </h2>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(EMPTY_FORM)}
                  className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-600"
                >
                  <XIcon className="h-3 w-3" /> cancelar
                </button>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="mt-3 space-y-3"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <Field label="Título" className="md:col-span-3">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </Field>
                <Field label="Severidade" className="md:col-span-1">
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as ItemPriority })
                    }
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status" className="md:col-span-1">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ItemStatus })
                    }
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.status} value={s.status}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Área" className="md:col-span-1">
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="ex: edge functions"
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </Field>
              </div>
              <Field label="RCA / descrição">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="O que aconteceu, root cause, impacto, correção…"
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : form.id ? 'Atualizar' : 'Criar incident'}
                </button>
                {loading && <Spinner size="sm" />}
              </div>
            </form>
          </Card>

          {/* Filter + counts */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterBtn
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="Todos"
              count={counts.all}
              tone="neutral"
            />
            <FilterBtn
              active={filter === 'open'}
              onClick={() => setFilter('open')}
              label="Open"
              count={counts.open}
              tone="warning"
            />
            <FilterBtn
              active={filter === 'doing'}
              onClick={() => setFilter('doing')}
              label="Investigating"
              count={counts.doing}
              tone="brand"
            />
            <FilterBtn
              active={filter === 'resolved'}
              onClick={() => setFilter('resolved')}
              label="Resolved"
              count={counts.resolved}
              tone="lime"
            />
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="ozly-card">
              <div className="py-8 text-center text-sm text-navy-300">
                {rows.length === 0
                  ? 'Sem incidents registrados — esperamos que continue assim.'
                  : 'Sem incidents nesse filtro.'}
              </div>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="ozly-card group bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ring-1 ${PRIORITY_TONE[item.priority].bg} ${PRIORITY_TONE[item.priority].text} ${PRIORITY_TONE[item.priority].ring}`}
                        >
                          {PRIORITY_LABEL[item.priority]}
                        </span>
                        <StatusBadge status={item.status} />
                        {item.area && (
                          <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] text-navy-500">
                            {item.area}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-base font-semibold text-navy-700">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="mt-1 whitespace-pre-line text-sm text-navy-500">
                          {item.description}
                        </div>
                      )}
                      <div className="mt-2 text-[11px] text-navy-300">
                        criado {formatRelativeTime(item.created_at)}
                        {item.resolved_at && (
                          <> · resolvido {formatRelativeTime(item.resolved_at)}</>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          void updateStatus(item, e.target.value as ItemStatus)
                        }
                        className="rounded border border-navy-100 bg-white px-2 py-1 text-xs text-navy-600 focus:border-brand-500 focus:outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.status} value={s.status}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteItem(item.id);
                        }}
                        disabled={deleting === item.id}
                        className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {deleting === item.id ? '…' : 'Del'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <RawDataPanel
            page="operations-incidents"
            sources={[
              {
                rpc: 'admin_operations_list',
                params: { p_kind: 'incident' },
                data: rows,
              },
            ]}
          />
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { label: string; cls: string }> = {
    open: { label: 'Open', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    doing: {
      label: 'Investigating',
      cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    resolved: {
      label: 'Resolved',
      cls: 'bg-lime-50 text-lime-700 ring-lime-200',
    },
    todo: { label: 'To do', cls: 'bg-navy-50 text-navy-600 ring-navy-200' },
    done: { label: 'Done', cls: 'bg-lime-50 text-lime-700 ring-lime-200' },
  };
  const m = map[status];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${m.cls}`}>
      <span className="mr-1 inline-block">
        <AlertTriangleIcon className="inline h-2.5 w-2.5" />
      </span>
      {m.label}
    </span>
  );
}

function FilterBtn({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-700',
    lime: 'text-lime-700',
    warning: 'text-amber-700',
    neutral: 'text-navy-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? `border-brand-300 bg-brand-50 ${TONE[tone]}`
          : 'border-navy-100 bg-white text-navy-500 hover:border-brand-200',
      ].join(' ')}
    >
      {label}{' '}
      <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-mono text-navy-500">
        {count}
      </span>
    </button>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
        {label}
      </span>
      {children}
    </label>
  );
}
