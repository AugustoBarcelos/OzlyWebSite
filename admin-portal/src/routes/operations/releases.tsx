import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@tremor/react';
import { PackageIcon, XIcon } from '@/components/Icons';
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
  { status: 'todo', label: 'Planned' },
  { status: 'doing', label: 'In testing' },
  { status: 'done', label: 'Released' },
];

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
  status: 'done',
  area: 'ios',
};

/**
 * /operations/releases — release log (TestFlight / Play / web).
 *
 * Manual entry for now. Each release: title (e.g. "1.0.14+304"), area
 * (ios|android|web|edge), description (release notes), priority (severity
 * if there's a hotfix vibe), status (planned/testing/released).
 */
export function OperationsReleasesPage() {
  const { toast } = useToast();
  const { rows, loading, error, migrationPending, refresh } = useOpsItems('release');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<'all' | 'ios' | 'android' | 'web' | 'edge'>('all');

  async function save() {
    if (!form.title.trim()) {
      toast({ variant: 'error', title: 'Versão obrigatória', description: 'Ex: 1.0.14+304' });
      return;
    }
    setSaving(true);
    try {
      await callRpc('admin_operations_upsert', {
        p_id: form.id,
        p_kind: 'release',
        p_status: form.status,
        p_priority: form.priority,
        p_title: form.title,
        p_description: form.description || null,
        p_area: form.area || null,
      });
      toast({ variant: 'success', title: form.id ? 'Release atualizado' : 'Release registrado' });
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
    if (!window.confirm('Remover este release do log?')) return;
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
    if (filterArea === 'all') return rows;
    return rows.filter((r) => r.area === filterArea);
  }, [rows, filterArea]);

  const counts = useMemo(() => {
    const c = { all: rows.length, ios: 0, android: 0, web: 0, edge: 0, other: 0 };
    for (const r of rows) {
      if (r.area === 'ios') c.ios += 1;
      else if (r.area === 'android') c.android += 1;
      else if (r.area === 'web') c.web += 1;
      else if (r.area === 'edge') c.edge += 1;
      else c.other += 1;
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
            <PackageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Releases
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Histórico de builds — TestFlight, Play, web, edge functions.
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
                {form.id ? 'Editar release' : 'Registrar release'}
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
                <Field label="Versão" className="md:col-span-2">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="ex: 1.0.14+304"
                    required
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </Field>
                <Field label="Plataforma" className="md:col-span-1">
                  <select
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                    <option value="web">Web</option>
                    <option value="edge">Edge functions</option>
                    <option value="db">Database</option>
                  </select>
                </Field>
                <Field label="Tipo" className="md:col-span-1">
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as ItemPriority })
                    }
                    className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="p0">Hotfix</option>
                    <option value="p1">Major</option>
                    <option value="p2">Normal</option>
                    <option value="p3">Patch</option>
                  </select>
                </Field>
                <Field label="Status" className="md:col-span-2">
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
              </div>
              <Field label="Release notes (markdown OK)">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="O que mudou nesta versão…"
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : form.id ? 'Atualizar' : 'Registrar'}
                </button>
                {loading && <Spinner size="sm" />}
              </div>
            </form>
          </Card>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { v: 'all', label: 'Todos', count: counts.all },
              { v: 'ios', label: 'iOS', count: counts.ios },
              { v: 'android', label: 'Android', count: counts.android },
              { v: 'web', label: 'Web', count: counts.web },
              { v: 'edge', label: 'Edge', count: counts.edge },
            ].map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setFilterArea(f.v as typeof filterArea)}
                className={[
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  filterArea === f.v
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-navy-100 bg-white text-navy-500 hover:border-brand-200',
                ].join(' ')}
              >
                {f.label}{' '}
                <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-mono text-navy-500">
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="ozly-card">
              <div className="py-8 text-center text-sm text-navy-300">
                {rows.length === 0
                  ? 'Nenhum release registrado ainda.'
                  : 'Sem releases nessa plataforma.'}
              </div>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => (
                <li key={item.id} className="ozly-card bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ring-1 ${PRIORITY_TONE[item.priority].bg} ${PRIORITY_TONE[item.priority].text} ${PRIORITY_TONE[item.priority].ring}`}
                        >
                          {PRIORITY_LABEL[item.priority]}
                        </span>
                        <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] uppercase font-medium text-navy-600">
                          {item.area ?? '?'}
                        </span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          {STATUSES.find((s) => s.status === item.status)?.label ?? item.status}
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-base font-semibold text-navy-700">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="mt-1 whitespace-pre-line text-sm text-navy-500">
                          {item.description}
                        </div>
                      )}
                      <div className="mt-2 text-[11px] text-navy-300">
                        registrado {formatRelativeTime(item.created_at)}
                        {item.resolved_at && (
                          <> · released {formatRelativeTime(item.resolved_at)}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
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
            page="operations-releases"
            sources={[
              { rpc: 'admin_operations_list', params: { p_kind: 'release' }, data: rows },
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
