import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber } from '@/lib/format';

/**
 * /product/at-risk — "Risco & Churn".
 *
 * One screen answering "quem eu ataco essa semana?". admin_at_risk_board groups
 * every user into the actionable churn segments and returns a roster per
 * segment with the data needed to act. Each segment carries a recommended next
 * action; rows link to the User 360.
 */

interface AtRiskUser {
  user_id: string;
  email_masked: string | null;
  full_name: string | null;
  fine_stage: string;
  plan: string;
  monthly_price_aud: number | null;
  last_activity: string | null;
  days_inactive: number | null;
  install_status: string;
  last_cancel_reason: string | null;
  current_period_end: string | null;
}

interface AtRiskSegment {
  segment: string;
  count: number;
  shown: number;
  users: AtRiskUser[];
}

interface AtRiskBoardResponse {
  generated_at: string;
  limit_per_segment: number;
  segments: AtRiskSegment[];
}

type Tone = 'rose' | 'orange' | 'amber' | 'teal' | 'slate';

const SEGMENT_META: Record<
  string,
  { label: string; action: string; tone: Tone; priority: number }
> = {
  paying_at_risk: {
    label: 'Pagante em risco',
    action: 'Auto-renovação off ou sumido 21d+. Contato direto + oferta de retenção AGORA.',
    tone: 'rose',
    priority: 1,
  },
  cancel_winback: {
    label: 'Cancelou — ainda tem acesso',
    action: 'Janela de resgate: win-back com desconto antes do período acabar.',
    tone: 'orange',
    priority: 2,
  },
  trial_idle: {
    label: 'Trial parado',
    action: 'Em trial mas não abre há 5d+. Push urgente antes de expirar sem converter.',
    tone: 'amber',
    priority: 3,
  },
  activated_no_convert: {
    label: 'Ativou, não converteu',
    action: 'Mandou a 1ª invoice (viu valor) mas não assinou. Nudge de assinatura / prova de valor.',
    tone: 'teal',
    priority: 4,
  },
  trial_expired: {
    label: 'Trial expirou',
    action: 'Expirou sem pagar. Oferta de reativação / segunda chance de trial.',
    tone: 'orange',
    priority: 5,
  },
  churned: {
    label: 'Cancelou (churned)',
    action: 'Era pagante e o período acabou. Campanha de reativação com incentivo.',
    tone: 'slate',
    priority: 6,
  },
};

const TONE_STYLE: Record<Tone, { ring: string; chip: string; bar: string }> = {
  rose: { ring: 'border-rose-200', chip: 'bg-rose-50 text-rose-700 ring-rose-100', bar: 'bg-rose-500' },
  orange: { ring: 'border-orange-200', chip: 'bg-orange-50 text-orange-700 ring-orange-100', bar: 'bg-orange-500' },
  amber: { ring: 'border-amber-200', chip: 'bg-amber-50 text-amber-700 ring-amber-100', bar: 'bg-amber-500' },
  teal: { ring: 'border-teal-200', chip: 'bg-teal-50 text-teal-700 ring-teal-100', bar: 'bg-teal-500' },
  slate: { ring: 'border-navy-200', chip: 'bg-navy-50 text-navy-500 ring-navy-100', bar: 'bg-navy-400' },
};

const INSTALL_LABEL: Record<string, string> = {
  installed: 'app instalado',
  uninstalled: 'desinstalou',
  recent_no_push: 'sem push',
  unknown: '—',
};

export function ProductAtRiskPage() {
  const [data, setData] = useState<AtRiskBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<AtRiskBoardResponse>('admin_at_risk_board', { p_limit_per_segment: 50 })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof RpcError ? e.message : 'Falha ao carregar');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const segments = (data?.segments ?? [])
    .slice()
    .sort(
      (a, b) =>
        (SEGMENT_META[a.segment]?.priority ?? 99) - (SEGMENT_META[b.segment]?.priority ?? 99),
    );

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
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Risco &amp; Churn
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Quem você ataca essa semana — por segmento, com a próxima ação recomendada.
            </p>
          </div>
        </div>
        <Link
          to="/product"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Product Hub
        </Link>
      </header>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando segmentos…
        </div>
      ) : segments.length === 0 ? (
        <Card className="ozly-card">
          <div className="py-6 text-center text-sm text-navy-400">
            Ninguém em risco no momento. 🎉
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {segments.map((seg) => (
            <SegmentCard key={seg.segment} seg={seg} />
          ))}
        </div>
      )}

      <RawDataPanel
        page="product-at-risk"
        sources={[
          { rpc: 'admin_at_risk_board', params: { p_limit_per_segment: 50 }, data },
        ]}
      />
    </div>
  );
}

function SegmentCard({ seg }: { seg: AtRiskSegment }) {
  const meta = SEGMENT_META[seg.segment] ?? {
    label: seg.segment,
    action: '',
    tone: 'slate' as Tone,
    priority: 99,
  };
  const tone = TONE_STYLE[meta.tone];

  return (
    <Card className={`ozly-card ${tone.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Title className="!text-sm !font-semibold text-navy-700">
            {meta.label}
          </Title>
          <p className="mt-1 text-[12px] text-navy-500">{meta.action}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone.chip}`}
        >
          {formatNumber(seg.count)}
        </span>
      </div>

      {seg.users.length === 0 ? (
        <div className="mt-3 text-xs text-navy-300">Sem usuários neste segmento.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
              <tr className="border-b border-navy-50">
                <th className="py-2 text-left">Usuário</th>
                <th className="py-2 text-right">MRR</th>
                <th className="py-2 text-right">Inativo (d)</th>
                <th className="py-2 text-left">App</th>
                <th className="py-2 text-left">Motivo cancel.</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="text-navy-700">
              {seg.users.map((u) => (
                <tr key={u.user_id} className="border-b border-navy-50/60 last:border-0">
                  <td className="py-1.5">
                    <span className="font-medium">{u.full_name ?? u.email_masked ?? '—'}</span>
                    {u.full_name && (
                      <span className="ml-1 text-navy-300">{u.email_masked}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {u.monthly_price_aud ? `$${u.monthly_price_aud.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {u.days_inactive ?? '—'}
                  </td>
                  <td className="py-1.5 text-navy-500">
                    {INSTALL_LABEL[u.install_status] ?? u.install_status}
                  </td>
                  <td className="py-1.5 text-navy-500">{u.last_cancel_reason ?? '—'}</td>
                  <td className="py-1.5 text-right">
                    <Link
                      to={`/users/${u.user_id}`}
                      className="rounded-md border border-navy-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:border-brand-200 hover:bg-brand-50"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {seg.count > seg.shown && (
            <p className="mt-2 text-[11px] text-navy-300">
              Mostrando os {seg.shown} mais prioritários de {seg.count}.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
