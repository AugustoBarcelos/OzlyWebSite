import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@tremor/react';
import { PenSquareIcon, XIcon } from '@/components/Icons';
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

const COLUMNS: ReadonlyArray<{ status: ItemStatus; label: string; tone: string }> = [
  { status: 'todo', label: 'To do', tone: 'border-navy-200 bg-navy-50/40' },
  { status: 'doing', label: 'Doing', tone: 'border-brand-200 bg-brand-50/40' },
  { status: 'done', label: 'Done', tone: 'border-lime-200 bg-lime-50/40' },
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
  priority: 'p2',
  status: 'todo',
  area: '',
};

/**
 * /operations/roadmap — personal Kanban for the founder.
 *
 * Renders three columns (To do / Doing / Done) with cards. Move via the
 * card's status select (no drag-drop in MVP — keyboard-friendly + mobile-OK).
 */
export function OperationsRoadmapPage() {
  const { toast } = useToast();
  const { rows, loading, error, migrationPending, refresh } = useOpsItems('task');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  async function save() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: 'Título obrigatório' });
      return;
    }
    setSaving(true);
    try {
      await callRpc('admin_operations_upsert', {
        p_id: form.id,
        p_kind: 'task',
        p_status: form.status,
        p_priority: form.priority,
        p_title: form.title,
        p_description: form.description || null,
        p_area: form.area || null,
      });
      toast({
        variant: 'success',
        title: form.id ? 'Tarefa atualizada' : 'Tarefa criada',
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

  async function moveItem(item: OpsItem, nextStatus: ItemStatus) {
    setMoving(item.id);
    try {
      await callRpc('admin_operations_upsert', {
        p_id: item.id,
        p_kind: 'task',
        p_status: nextStatus,
        p_priority: item.priority,
        p_title: item.title,
        p_description: item.description,
        p_area: item.area,
      });
      refresh();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao mover',
        description: e instanceof RpcError ? e.message : 'Erro',
      });
    } finally {
      setMoving(null);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Remover esta tarefa?')) return;
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

  const byColumn = COLUMNS.map((col) => ({
    ...col,
    items: rows.filter((r) => r.status === col.status),
  }));

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
            <PenSquareIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Roadmap
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Seu Kanban pessoal — backlog, em progresso, feito.
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
                {form.id ? 'Editar tarefa' : 'Nova tarefa'}
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
                <Field label="Prioridade" className="md:col-span-1">
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
                <Field label="Coluna" className="md:col-span-1">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ItemStatus })
                    }
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.status} value={c.status}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Área" className="md:col-span-1">
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="ex: marketing"
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </Field>
              </div>
              <Field label="Descrição (opcional)">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : form.id ? 'Atualizar' : 'Criar tarefa'}
                </button>
                {loading && <Spinner size="sm" />}
              </div>
            </form>
          </Card>

          {/* Kanban columns */}
          <div className="grid gap-3 md:grid-cols-3">
            {byColumn.map((col) => (
              <div
                key={col.status}
                className={`flex flex-col gap-2 rounded-lg border-2 ${col.tone} p-3`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-700">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-mono text-navy-400">
                    {col.items.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {col.items.length === 0 ? (
                    <li className="rounded-md border border-dashed border-navy-200 bg-white/60 p-4 text-center text-[11px] text-navy-300">
                      sem cards
                    </li>
                  ) : (
                    col.items.map((item) => (
                      <li
                        key={item.id}
                        className="ozly-card group bg-white p-3 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ring-1 ${PRIORITY_TONE[item.priority].bg} ${PRIORITY_TONE[item.priority].text} ${PRIORITY_TONE[item.priority].ring}`}
                              >
                                {PRIORITY_LABEL[item.priority]}
                              </span>
                              {item.area && (
                                <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] text-navy-500">
                                  {item.area}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 text-sm font-medium text-navy-700">
                              {item.title}
                            </div>
                            {item.description && (
                              <div className="mt-1 line-clamp-2 text-[11px] text-navy-500">
                                {item.description}
                              </div>
                            )}
                            <div className="mt-1.5 text-[10px] text-navy-300">
                              {formatRelativeTime(item.updated_at)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-navy-50 pt-2">
                          <select
                            value={item.status}
                            disabled={moving === item.id}
                            onChange={(e) =>
                              void moveItem(item, e.target.value as ItemStatus)
                            }
                            className="rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] text-navy-600 focus:border-brand-500 focus:outline-none disabled:opacity-50"
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.status} value={c.status}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] text-navy-600 hover:border-brand-300 hover:text-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void deleteItem(item.id);
                              }}
                              disabled={deleting === item.id}
                              className="rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deleting === item.id ? '…' : 'Del'}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>

          <RawDataPanel
            page="operations-roadmap"
            sources={[
              {
                rpc: 'admin_operations_list',
                params: { p_kind: 'task' },
                data: rows,
              },
            ]}
          />
        </>
      )}
    </div>
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
