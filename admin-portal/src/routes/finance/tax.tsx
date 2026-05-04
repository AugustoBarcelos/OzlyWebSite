import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { DollarSignIcon, ScrollTextIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { downloadCsv, toCsv } from '@/lib/csvExport';

/**
 * /finance/tax — Tax & Reports (option A: CSV export)
 *
 * Aggregates monthly revenue from revenuecat_snapshot via the
 * admin_finance_tax_monthly RPC. CSV download for accountant.
 *
 * Apple fee 15% (Small Business Program). GST 10% shown as informational —
 * Apple is merchant of record on AU App Store and remits GST itself.
 */

interface TaxRow {
  month: string;
  month_start: string;
  active_subs: number;
  plan_tfn: number;
  plan_abn: number;
  plan_pro: number;
  gross_aud: number;
  apple_fee_aud: number;
  net_aud: number;
  gst_remitted_by_apple_aud: number;
}

interface TaxResponse {
  months_back: number;
  apple_fee_pct: number;
  gst_pct: number;
  currency: string;
  note: string;
  rows: TaxRow[];
}

function fmtAud(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

export function FinanceTaxPage() {
  const [data, setData] = useState<TaxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthsBack, setMonthsBack] = useState(12);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setMigrationPending(false);
    callRpc<TaxResponse>('admin_finance_tax_monthly', { p_months_back: monthsBack })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist') || e.message.includes('Could not find the function'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [monthsBack]);

  const totals = useMemo(() => {
    if (!data) return { gross: 0, fee: 0, net: 0, gst: 0 };
    return data.rows.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross_aud,
        fee: acc.fee + r.apple_fee_aud,
        net: acc.net + r.net_aud,
        gst: acc.gst + r.gst_remitted_by_apple_aud,
      }),
      { gross: 0, fee: 0, net: 0, gst: 0 },
    );
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const csv = toCsv<TaxRow>(data.rows, [
      { header: 'Month', get: (r) => r.month },
      { header: 'Active subs', get: (r) => r.active_subs },
      { header: 'TFN plan subs', get: (r) => r.plan_tfn },
      { header: 'ABN plan subs', get: (r) => r.plan_abn },
      { header: 'PRO plan subs', get: (r) => r.plan_pro },
      { header: 'Gross AUD', get: (r) => r.gross_aud.toFixed(2) },
      { header: 'Apple fee AUD (15%)', get: (r) => r.apple_fee_aud.toFixed(2) },
      { header: 'Net AUD (received)', get: (r) => r.net_aud.toFixed(2) },
      { header: 'GST remitted by Apple AUD', get: (r) => r.gst_remitted_by_apple_aud.toFixed(2) },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`ozly-tax-monthly-${monthsBack}m-${stamp}.csv`, csv);
  }

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
              Tax & Reports
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Receita mensal agregada — pronta pra contador / BAS.
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
          <strong>Migration pendente.</strong> Aplicar{' '}
          <code className="font-mono">
            20260504060000_admin_finance_tax_export.sql
          </code>{' '}
          em prod.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong className="font-semibold">Erro:</strong> {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={`Gross ${monthsBack}m`}
          value={loading ? '…' : fmtAud(totals.gross)}
          tone="brand"
        />
        <Tile
          label={`Apple fee ${monthsBack}m`}
          value={loading ? '…' : fmtAud(totals.fee)}
          tone="warn"
        />
        <Tile
          label={`Net (you got) ${monthsBack}m`}
          value={loading ? '…' : fmtAud(totals.net)}
          tone="good"
        />
        <Tile
          label={`GST (Apple remitted)`}
          value={loading ? '…' : fmtAud(totals.gst)}
          tone="muted"
        />
      </section>

      <Card className="ozly-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Title className="!text-sm !font-semibold text-navy-700">
            Monthly breakdown
          </Title>
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-700"
              value={monthsBack}
              onChange={(e) => setMonthsBack(Number(e.target.value))}
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || !data || data.rows.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:bg-navy-200"
            >
              <DollarSignIcon className="h-3.5 w-3.5" />
              Download CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
            <Spinner size="sm" /> Carregando…
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="mt-4 text-sm text-navy-400">Sem dados.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                <tr className="border-b border-navy-50">
                  <th className="py-2 text-left">Month</th>
                  <th className="py-2 text-right">Active subs</th>
                  <th className="py-2 text-right">TFN/ABN/PRO</th>
                  <th className="py-2 text-right">Gross</th>
                  <th className="py-2 text-right">Apple 15%</th>
                  <th className="py-2 text-right">Net</th>
                  <th className="py-2 text-right">GST (info)</th>
                </tr>
              </thead>
              <tbody className="text-navy-700">
                {data.rows.map((r) => (
                  <tr key={r.month} className="border-b border-navy-50/60 last:border-0">
                    <td className="py-2 font-mono text-[12px]">{r.month}</td>
                    <td className="py-2 text-right tabular-nums">{r.active_subs}</td>
                    <td className="py-2 text-right text-[11px] text-navy-500 tabular-nums">
                      {r.plan_tfn}/{r.plan_abn}/{r.plan_pro}
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {fmtAud(r.gross_aud)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-amber-700">
                      {fmtAud(r.apple_fee_aud)}
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold text-emerald-700">
                      {fmtAud(r.net_aud)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-navy-400">
                      {fmtAud(r.gst_remitted_by_apple_aud)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="ozly-card border-navy-100 bg-navy-50/40 p-4 text-[12px] text-navy-600">
        <div className="font-semibold text-navy-700">Como ler</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Gross</strong> = preço total cobrado dos usuários no mês (estimativa
            baseada em subs ativos × preço mensal — sem transaction log na RC snapshot).
          </li>
          <li>
            <strong>Apple fee</strong> = 15% (Small Business Program).
          </li>
          <li>
            <strong>Net</strong> = o que cai na conta (gross − apple fee).
          </li>
          <li>
            <strong>GST</strong> é informacional — Apple é merchant of record nas vendas
            App Store australianas e <strong>remete GST direto à ATO</strong>. O dev{' '}
            <em>não</em> deve incluir essa receita como GST-taxable supply no BAS.
            Reporta como <em>GST-free supply</em> ou <em>not taxable</em>.
          </li>
        </ul>
      </Card>

      <RawDataPanel
        page="finance-tax"
        sources={[
          {
            rpc: 'admin_finance_tax_monthly',
            params: { p_months_back: monthsBack },
            data,
          },
        ]}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'good' | 'warn' | 'muted';
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    muted: 'text-navy-400',
  };
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>{value}</div>
    </div>
  );
}
