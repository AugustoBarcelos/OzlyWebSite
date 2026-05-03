import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, BarList, Card, Title } from '@tremor/react';
import {
  ArrowDownRightIcon,
  XIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatCurrencyAUD } from '@/lib/format';

type Category = 'ad_spend' | 'infra' | 'tools' | 'affiliate' | 'whatsapp' | 'ai' | 'other';

const CATEGORY_LABEL: Record<Category, string> = {
  ad_spend: 'Ad spend (não-snapshot)',
  infra: 'Infra (Supabase, Apple, Google)',
  tools: 'Tools (SaaS)',
  affiliate: 'Affiliate payouts',
  whatsapp: 'WhatsApp Business (Meta)',
  ai: 'AI inference (Gemini)',
  other: 'Other',
};

const CATEGORIES: ReadonlyArray<Category> = [
  'ad_spend',
  'infra',
  'tools',
  'affiliate',
  'whatsapp',
  'ai',
  'other',
];

interface CostRow {
  id: string;
  period_month: string;
  category: Category;
  amount_aud: number;
  vendor: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface ByCategoryRow {
  category: Category;
  total: number;
}
interface ByMonthRow {
  month: string;
  total: number;
}

interface CostsResponse {
  period_days: number;
  total_aud: number;
  by_category: ByCategoryRow[];
  by_month: ByMonthRow[];
  rows: CostRow[];
}

interface FormState {
  id: string | null;
  period_month: string;
  category: Category;
  amount_aud: string;
  vendor: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  period_month: new Date().toISOString().slice(0, 7) + '-01',
  category: 'infra',
  amount_aud: '',
  vendor: '',
  note: '',
};

/**
 * /finance/costs — manual input + list of monthly costs.
 *
 * RPCs:
 *   - admin_finance_costs_list(period_days)
 *   - admin_finance_costs_upsert(...)
 *   - admin_finance_costs_delete(id)
 *
 * If the migration isn't applied yet, the page renders a single warning
 * banner instead of crashing.
 */
export function FinanceCostsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<CostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState(180);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await callRpc<CostsResponse>('admin_finance_costs_list', {
        p_period_days: period,
      });
      setData(r);
      setMigrationPending(false);
    } catch (e) {
      if (
        e instanceof RpcError &&
        (e.code === '42883' || e.message.includes('does not exist'))
      ) {
        setMigrationPending(true);
      } else {
        setError(e instanceof RpcError ? e.message : 'Erro ao carregar');
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function save() {
    const amount = parseFloat(form.amount_aud);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ variant: 'error', title: 'Valor inválido', description: 'Use número >= 0' });
      return;
    }
    setSaving(true);
    try {
      await callRpc('admin_finance_costs_upsert', {
        p_id: form.id,
        p_period_month: form.period_month,
        p_category: form.category,
        p_amount_aud: amount,
        p_vendor: form.vendor || null,
        p_note: form.note || null,
      });
      toast({
        variant: 'success',
        title: form.id ? 'Custo atualizado' : 'Custo adicionado',
      });
      setForm(EMPTY_FORM);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao salvar',
        description: e instanceof RpcError ? e.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm('Remover este custo? Não pode desfazer.')) return;
    setDeleting(id);
    try {
      await callRpc('admin_finance_costs_delete', { p_id: id });
      toast({ variant: 'success', title: 'Custo removido' });
      setRefreshKey((k) => k + 1);
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

  function startEdit(row: CostRow) {
    setForm({
      id: row.id,
      period_month: row.period_month.slice(0, 10),
      category: row.category,
      amount_aud: row.amount_aud.toString(),
      vendor: row.vendor ?? '',
      note: row.note ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const byMonthChart = useMemo(() => {
    if (!data) return [];
    return data.by_month.map((m) => ({ date: m.month, value: m.total }));
  }, [data]);

  const byCategoryList = useMemo(() => {
    if (!data) return [];
    return data.by_category.map((c) => ({
      name: CATEGORY_LABEL[c.category],
      value: c.total,
    }));
  }, [data]);

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
            <ArrowDownRightIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Costs
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Custos mensais por categoria — input manual no MVP.
            </p>
          </div>
        </div>
        <Link
          to="/finance"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Finance Hub
        </Link>
      </header>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">20260503160000_finance_costs.sql</code> em prod
          pra ativar esta página.
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
              <Title className="!text-sm !font-semibold text-navy-700">
                {form.id ? 'Editar custo' : 'Adicionar custo'}
              </Title>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(EMPTY_FORM)}
                  className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-600"
                >
                  <XIcon className="h-3 w-3" /> cancelar edição
                </button>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6"
            >
              <Field label="Mês" className="md:col-span-1">
                <input
                  type="month"
                  value={form.period_month.slice(0, 7)}
                  onChange={(e) =>
                    setForm({ ...form, period_month: `${e.target.value}-01` })
                  }
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <Field label="Categoria" className="md:col-span-2">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as Category })
                  }
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valor (AUD)" className="md:col-span-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount_aud}
                  onChange={(e) => setForm({ ...form, amount_aud: e.target.value })}
                  required
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <Field label="Vendor (opcional)" className="md:col-span-1">
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="Ex: Supabase"
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <Field label="Nota (opcional)" className="md:col-span-1">
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </Field>
              <div className="flex items-end md:col-span-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : form.id ? 'Atualizar' : 'Adicionar custo'}
                </button>
              </div>
            </form>
          </Card>

          {/* Summary + chart */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="ozly-card">
              <Title className="!text-sm !font-semibold text-navy-700">Total no período</Title>
              <div className="mt-2 text-3xl font-semibold text-brand-600">
                {formatCurrencyAUD(data?.total_aud ?? null)}
              </div>
              <div className="mt-1 text-[11px] text-navy-400">
                últimos {period} dias ·{' '}
                <button
                  type="button"
                  onClick={() => setPeriod((p) => (p === 90 ? 180 : 90))}
                  className="text-brand-600 hover:underline"
                >
                  alternar pra {period === 90 ? '180d' : '90d'}
                </button>
              </div>
            </Card>
            <Card className="ozly-card lg:col-span-2">
              <Title className="!text-sm !font-semibold text-navy-700">Por categoria</Title>
              {byCategoryList.length > 0 ? (
                <BarList
                  data={byCategoryList}
                  color="emerald"
                  valueFormatter={(v: number) => formatCurrencyAUD(v)}
                  className="mt-3"
                />
              ) : (
                <div className="mt-3 text-xs text-navy-300">Sem dados ainda.</div>
              )}
            </Card>
          </div>

          {byMonthChart.length > 0 && (
            <Card className="ozly-card">
              <Title className="!text-sm !font-semibold text-navy-700">Por mês</Title>
              <BarChart
                data={byMonthChart}
                index="date"
                categories={['value']}
                colors={['emerald']}
                valueFormatter={(v) => formatCurrencyAUD(v)}
                className="mt-3 h-48"
                showLegend={false}
              />
            </Card>
          )}

          {/* Rows table */}
          <Card className="ozly-card">
            <div className="mb-2 flex items-center justify-between">
              <Title className="!text-sm !font-semibold text-navy-700">Lançamentos</Title>
              {loading && <Spinner size="sm" />}
            </div>
            {!data || data.rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-navy-300">
                Nenhum custo cadastrado no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                    <tr className="border-b border-navy-50">
                      <th className="py-2 text-left">Mês</th>
                      <th className="py-2 text-left">Categoria</th>
                      <th className="py-2 text-left">Vendor</th>
                      <th className="py-2 text-left">Nota</th>
                      <th className="py-2 text-right">Valor</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="text-navy-700">
                    {data.rows.map((row) => (
                      <tr key={row.id} className="border-b border-navy-50/60 last:border-0">
                        <td className="py-2 font-mono text-xs">
                          {row.period_month.slice(0, 7)}
                        </td>
                        <td className="py-2">{CATEGORY_LABEL[row.category]}</td>
                        <td className="py-2 text-navy-500">{row.vendor ?? '—'}</td>
                        <td className="py-2 text-navy-500">
                          <span className="line-clamp-1">{row.note ?? '—'}</span>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {formatCurrencyAUD(row.amount_aud)}
                        </td>
                        <td className="py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void deleteRow(row.id);
                              }}
                              disabled={deleting === row.id}
                              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deleting === row.id ? '…' : 'Del'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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
