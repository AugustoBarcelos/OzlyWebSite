import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@tremor/react';
import { ScrollTextIcon, XIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { useToast } from '@/components/Toast';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';
import {
  useOpsItems,
  type ItemPriority,
  type OpsItem,
} from './_shared';

interface FormState {
  id: string | null;
  title: string;
  description: string;
  priority: ItemPriority;
  area: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  description: '',
  priority: 'p2',
  area: '',
};

/**
 * /operations/runbooks — procedures playbook.
 *
 * Markdown-friendly notes for "como faço X?" — deploy, refund, payout,
 * incident response, etc. Reuses operations_items (kind=runbook).
 *
 * Search filters by title + description text. Click to expand inline.
 */
export function OperationsRunbooksPage() {
  const { toast } = useToast();
  const { rows, loading, error, migrationPending, refresh } = useOpsItems('runbook');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function save() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: 'Título obrigatório' });
      return;
    }
    setSaving(true);
    try {
      await callRpc('admin_operations_upsert', {
        p_id: form.id,
        p_kind: 'runbook',
        p_status: 'done', // runbooks são reference; status só pra validation
        p_priority: form.priority,
        p_title: form.title,
        p_description: form.description || null,
        p_area: form.area || null,
      });
      toast({ variant: 'success', title: form.id ? 'Runbook atualizado' : 'Runbook criado' });
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

  async function deleteItem(id: string) {
    if (!window.confirm('Remover este runbook?')) return;
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
      area: item.area ?? '',
    });
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [r.title, r.description, r.area]
        .filter((x): x is string => Boolean(x))
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

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
            <ScrollTextIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Runbooks
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Procedimentos passo-a-passo: deploy, refund, payout, incident response.
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
          <strong>Migrations pendentes.</strong> Aplique{' '}
          <code className="font-mono">20260503170000_operations_items.sql</code> e{' '}
          <code className="font-mono">20260504010000_operations_items_releases_runbooks.sql</code>.
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
                {form.id ? 'Editar runbook' : 'Novo runbook'}
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
                    placeholder='ex: "Como fazer refund manual via RevenueCat"'
                    required
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </Field>
                <Field label="Área" className="md:col-span-2">
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="ex: support, deploy, payment"
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </Field>
                <Field label="Importância" className="md:col-span-1">
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as ItemPriority })
                    }
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="p0">Crítico</option>
                    <option value="p1">Importante</option>
                    <option value="p2">Normal</option>
                    <option value="p3">Reference</option>
                  </select>
                </Field>
              </div>
              <Field label="Procedimento (markdown OK)">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  placeholder={`# Passos
1. ...
2. ...

## Quando usar
...

## Quem aprova
...`}
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 font-mono text-xs focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : form.id ? 'Atualizar' : 'Criar runbook'}
                </button>
                {loading && <Spinner size="sm" />}
              </div>
            </form>
          </Card>

          {/* Search + count */}
          <div className="ozly-card flex items-center gap-2 bg-white p-2.5">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar runbook…"
              className="flex-1 bg-transparent text-sm text-navy-700 placeholder:text-navy-300 focus:outline-none"
            />
            <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-500">
              {filtered.length} de {rows.length}
            </span>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="ozly-card">
              <div className="py-8 text-center text-sm text-navy-300">
                {rows.length === 0
                  ? 'Sem runbooks ainda — cadastra o primeiro acima.'
                  : 'Nada bate com a busca.'}
              </div>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <li key={item.id} className="ozly-card bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-navy-50/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.area && (
                            <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium text-navy-600">
                              {item.area}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-navy-400">
                            atualizado {formatRelativeTime(item.updated_at)}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-navy-700">
                          {item.title}
                        </h3>
                      </div>
                      <span className="text-navy-400">{isExpanded ? '−' : '+'}</span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-navy-50 px-4 pb-4 pt-3">
                        {item.description ? (
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-navy-700">
                            {item.description}
                          </pre>
                        ) : (
                          <div className="text-xs text-navy-300">Sem conteúdo.</div>
                        )}
                        <div className="mt-3 flex items-center justify-end gap-1.5">
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
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <RawDataPanel
            page="operations-runbooks"
            sources={[
              { rpc: 'admin_operations_list', params: { p_kind: 'runbook' }, data: rows },
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
