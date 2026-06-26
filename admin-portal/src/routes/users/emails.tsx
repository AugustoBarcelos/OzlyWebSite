import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';
import {
  MESSAGING_SEGMENTS,
  fetchSegmentEmails,
  type SegmentEmail,
} from '@/lib/messaging';

/**
 * /users/emails — lista de emails REAIS por segmento, pra outreach pessoal.
 *
 * PII: o admin_segment_emails é admin-only e AUDITADO no backend a cada uso.
 * Aqui o fundador escolhe um segmento (ex.: "Não ativou"), vê os emails de
 * verdade, copia todos ou exporta CSV.
 */
export function UserEmailsPage() {
  const { toast } = useToast();
  const [segment, setSegment] = useState<string>('not-activated');
  const [rows, setRows] = useState<SegmentEmail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = MESSAGING_SEGMENTS.find((s) => s.value === segment);

  const load = (seg: string) => {
    setSegment(seg);
    setRows(null);
    setError(null);
    setLoading(true);
    fetchSegmentEmails(seg)
      .then((r) => setRows(r.emails))
      .catch((e) => setError(e instanceof RpcError ? e.message : 'Falha ao carregar'))
      .finally(() => setLoading(false));
  };

  const emailsCsv = (rows ?? []).map((r) => r.email).join(', ');

  const copyAll = async () => {
    if (!rows || rows.length === 0) return;
    try {
      await navigator.clipboard.writeText(emailsCsv);
      toast({ variant: 'success', title: 'Copiado', description: `${rows.length} emails na área de transferência.` });
    } catch {
      toast({ variant: 'error', title: 'Não consegui copiar', description: 'Selecione e copie manualmente.' });
    }
  };

  const exportCsv = () => {
    if (!rows || rows.length === 0) return;
    const header = 'email,full_name,created_at\n';
    const body = rows
      .map((r) => `${r.email},"${(r.full_name ?? '').replace(/"/g, '""')}",${r.created_at}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emails-${segment}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-700">Lista de emails por segmento</h1>
          <p className="mt-0.5 text-sm text-navy-400">
            Emails reais pra outreach pessoal. Uso de PII é auditado.
          </p>
        </div>
        <Link
          to="/users"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Usuários
        </Link>
      </header>

      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">Escolha o segmento</Title>
        <div className="mt-2 flex flex-wrap gap-2">
          {MESSAGING_SEGMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => load(s.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                segment === s.value
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-navy-100 bg-white text-navy-600 hover:border-brand-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {meta && <p className="mt-2 text-[11px] text-navy-400">{meta.hint}</p>}
      </Card>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando emails…
        </div>
      ) : rows ? (
        <Card className="ozly-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Title className="!text-sm !font-semibold text-navy-700">
              {rows.length} {rows.length === 1 ? 'email' : 'emails'} · {meta?.label ?? segment}
            </Title>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyAll()}
                disabled={rows.length === 0}
                className="rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
              >
                Copiar todos
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={rows.length === 0}
                className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 disabled:opacity-50"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-3 text-xs text-navy-300">Ninguém neste segmento agora.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                  <tr className="border-b border-navy-50">
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Cadastrou</th>
                  </tr>
                </thead>
                <tbody className="text-navy-700">
                  {rows.map((r) => (
                    <tr key={r.user_id} className="border-b border-navy-50/60 last:border-0">
                      <td className="px-3 py-1.5">{r.full_name ?? '—'}</td>
                      <td className="px-3 py-1.5 font-mono">{r.email}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap text-navy-400">
                        {formatRelativeTime(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="ozly-card">
          <div className="py-6 text-center text-sm text-navy-400">
            Escolha um segmento acima pra ver os emails.
          </div>
        </Card>
      )}
    </div>
  );
}
