import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';

/**
 * /product/at-risk — Retenção, Reativação & Conversão.
 *
 * Agrupa os usuários acionáveis em 3 classes mutuamente exclusivas:
 *  • Em risco (salvável agora)   — paying_at_risk, cancel_winback
 *  • Já perdemos (reativar)      — churned, trial_expired
 *  • Conversão (nunca pagou)     — activated_no_convert, trial_idle
 * "Risco" descreve só o que ainda dá pra salvar — conta já perdida ≠ risco.
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

const SEGMENT_META: Record<string, { label: string; action: string; tone: Tone }> = {
  paying_at_risk: {
    label: 'Pagante em risco',
    action: 'Auto-renovação off ou sumido 21d+. Contato direto + oferta de retenção AGORA.',
    tone: 'rose',
  },
  cancel_winback: {
    label: 'Cancelou — ainda tem acesso',
    action: 'Janela de resgate: win-back com desconto antes do período acabar.',
    tone: 'orange',
  },
  churned: {
    label: 'Saiu — período acabou',
    action: 'Era pagante e o período acabou. Campanha de reativação com incentivo.',
    tone: 'slate',
  },
  trial_expired: {
    label: 'Trial expirou',
    action: 'Trial acabou sem pagar. Oferta de reativação / segunda chance de trial.',
    tone: 'slate',
  },
  activated_no_convert: {
    label: 'Ativou, não converteu',
    action: 'Mandou a 1ª invoice (viu valor) mas não assinou. Nudge de assinatura / prova de valor.',
    tone: 'teal',
  },
  trial_idle: {
    label: 'Trial parado',
    action: 'Em trial mas não abre há 5d+. Push urgente antes de expirar sem converter.',
    tone: 'amber',
  },
};

// 3 grupos mutuamente exclusivos — "risco" nunca descreve conta já perdida.
const GROUPS: Array<{ title: string; subtitle: string; segments: string[] }> = [
  {
    title: 'Em risco (salvável agora)',
    subtitle: 'Ainda paga ou tem acesso pago — dá pra reverter. É o MRR real em risco.',
    segments: ['paying_at_risk', 'cancel_winback'],
  },
  {
    title: 'Já perdemos (reativar)',
    subtitle: 'Período ou trial acabou sem ficar. Campanha de reativação — não é risco, é frio.',
    segments: ['churned', 'trial_expired'],
  },
  {
    title: 'Conversão (nunca pagou)',
    subtitle: 'Free ainda no funil — pode virar pagante com o nudge certo.',
    segments: ['activated_no_convert', 'trial_idle'],
  },
];

const TONE_STYLE: Record<Tone, { ring: string; chip: string }> = {
  rose: { ring: 'border-rose-200', chip: 'bg-rose-50 text-rose-700 ring-rose-100' },
  orange: { ring: 'border-orange-200', chip: 'bg-orange-50 text-orange-700 ring-orange-100' },
  amber: { ring: 'border-amber-200', chip: 'bg-amber-50 text-amber-700 ring-amber-100' },
  teal: { ring: 'border-teal-200', chip: 'bg-teal-50 text-teal-700 ring-teal-100' },
  slate: { ring: 'border-navy-200', chip: 'bg-navy-50 text-navy-500 ring-navy-100' },
};

const INSTALL_LABEL: Record<string, string> = {
  installed: 'instalado',
  uninstalled: 'desinstalou',
  recent_no_push: 'sem push',
  unknown: 'sem dados',
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

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

  const bySegment: Record<string, AtRiskSegment> = {};
  for (const s of data?.segments ?? []) bySegment[s.segment] = s;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Retenção, Reativação &amp; Conversão
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Quem você ataca essa semana — separado por salvável, já perdido e nunca pagou.
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
      ) : (
        GROUPS.map((group) => {
          const segs = group.segments.map((s) => bySegment[s]).filter((s): s is AtRiskSegment => !!s);
          const total = segs.reduce((a, s) => a + s.count, 0);
          if (segs.length === 0) return null;
          return (
            <section key={group.title} className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-navy-100 pb-1.5">
                <div>
                  <h2 className="text-sm font-semibold text-navy-700">{group.title}</h2>
                  <p className="text-[11px] text-navy-400">{group.subtitle}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-navy-400">{formatNumber(total)}</span>
              </div>
              {segs.map((seg) => (
                <SegmentCard key={seg.segment} seg={seg} />
              ))}
            </section>
          );
        })
      )}

      <RawDataPanel
        page="product-at-risk"
        sources={[{ rpc: 'admin_at_risk_board', params: { p_limit_per_segment: 50 }, data }]}
      />
    </div>
  );
}

function SegmentCard({ seg }: { seg: AtRiskSegment }) {
  const meta = SEGMENT_META[seg.segment] ?? { label: seg.segment, action: '', tone: 'slate' as Tone };
  const tone = TONE_STYLE[meta.tone];
  const isWinback = seg.segment === 'cancel_winback';

  // Winback: priorizar pela janela fechando (period_end mais próximo no topo).
  const users = isWinback
    ? seg.users
        .slice()
        .sort((a, b) => (daysUntil(a.current_period_end) ?? 9999) - (daysUntil(b.current_period_end) ?? 9999))
    : seg.users;

  return (
    <Card className={`ozly-card ${tone.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Title className="!text-sm !font-semibold text-navy-700">{meta.label}</Title>
          <p className="mt-1 text-[12px] text-navy-500">{meta.action}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone.chip}`}>
          {formatNumber(seg.count)}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="mt-3 text-xs text-navy-300">Sem usuários neste segmento.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
              <tr className="border-b border-navy-50">
                <th className="px-3 py-2 text-left">Usuário</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">MRR</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Inativo</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">App</th>
                {isWinback && <th className="px-3 py-2 text-right whitespace-nowrap">Janela</th>}
                <th className="px-3 py-2 text-left">Motivo cancel.</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-navy-700">
              {users.map((u) => {
                const janela = daysUntil(u.current_period_end);
                return (
                  <tr key={u.user_id} className="border-b border-navy-50/60 last:border-0">
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{u.full_name ?? u.email_masked ?? '—'}</span>
                      {u.full_name && <span className="ml-1 text-navy-300">{u.email_masked}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                      {u.monthly_price_aud ? formatCurrencyAUD(u.monthly_price_aud) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                      {u.days_inactive === null ? '—' : `${u.days_inactive}d`}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-navy-500">
                      {INSTALL_LABEL[u.install_status] ?? u.install_status}
                    </td>
                    {isWinback && (
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums whitespace-nowrap ${
                          janela !== null && janela < 7 ? 'font-semibold text-rose-600' : 'text-navy-500'
                        }`}
                      >
                        {janela === null ? '—' : `${janela}d`}
                      </td>
                    )}
                    <td className="max-w-[14rem] truncate px-3 py-1.5 text-navy-500">
                      {u.last_cancel_reason ?? '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Link
                        to={`/users/${u.user_id}`}
                        className="rounded-md border border-navy-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:border-brand-200 hover:bg-brand-50"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
