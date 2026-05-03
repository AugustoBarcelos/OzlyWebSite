import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import {
  AlertTriangleIcon,
  BellIcon,
  HandshakeIcon,
  TrendingUpIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc } from '@/lib/rpc';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';
import type {
  ErrorRateResponse,
  KpiDashboardResponse,
  RevenueSummaryResponse,
} from '@/routes/dashboard/types';

interface PendingPayoutsResp {
  pending_summary: Array<{ currency: string; count: number; cents: number }>;
}

type Severity = 'info' | 'warning' | 'critical';
interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * /inbox/alerts — anomaly detection (client-side rules).
 *
 * V1 rules (no AI yet):
 *   - Pending affiliate payouts > 0 → warning
 *   - Trial→Paid conversion < 10% → warning, < 5% → critical
 *   - Churn period > 5 → warning, > 10 → critical
 *   - Error rate increased ≥ 50% vs previous period → warning, ≥ 100% → critical
 *   - Active trials about to expire (7d) but trial→paid is low → warning
 *
 * V2 (AI Composer wave) replaces this with adaptive thresholds + plain-language
 * explanations.
 */
export function InboxAlertsPage() {
  const [kpi, setKpi] = useState<KpiDashboardResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummaryResponse | null>(null);
  const [errorRate, setErrorRate] = useState<ErrorRateResponse | null>(null);
  const [payouts, setPayouts] = useState<PendingPayoutsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.allSettled([
      callRpc<KpiDashboardResponse>('admin_kpi_dashboard', { p_period_days: 30 }),
      callRpc<RevenueSummaryResponse>('admin_revenue_summary', { p_period_days: 30 }),
      callRpc<ErrorRateResponse>('admin_app_error_rate', { p_period_days: 30 }),
      callRpc<PendingPayoutsResp>('admin_affiliate_payout_planning', {}),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1, r2, r3] = results;
      if (r0.status === 'fulfilled') setKpi(r0.value);
      if (r1.status === 'fulfilled') setRevenue(r1.value);
      if (r2.status === 'fulfilled') setErrorRate(r2.value);
      if (r3.status === 'fulfilled') setPayouts(r3.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const alerts: Alert[] = useMemo(() => {
    const out: Alert[] = [];

    // Pending payouts
    const pendingTotal = payouts?.pending_summary.reduce((s, c) => s + c.count, 0) ?? 0;
    if (pendingTotal > 0) {
      const totalAud = payouts?.pending_summary
        .filter((s) => s.currency === 'AUD')
        .reduce((sum, s) => sum + s.cents / 100, 0) ?? 0;
      out.push({
        id: 'payouts-pending',
        severity: 'warning',
        title: `${pendingTotal} payout${pendingTotal === 1 ? '' : 's'} de afiliado pendente${pendingTotal === 1 ? '' : 's'}`,
        detail: totalAud > 0 ? `Total AUD: ${formatCurrencyAUD(totalAud)}` : 'Verifica os valores e processa.',
        to: '/affiliates?tab=payouts',
        icon: HandshakeIcon,
      });
    }

    // Trial → Paid conversion
    const tToP = revenue?.conversion_trial_to_paid_period;
    if (tToP !== null && tToP !== undefined && Number.isFinite(tToP)) {
      const pct = tToP * 100;
      if (pct < 5) {
        out.push({
          id: 'trial-to-paid-critical',
          severity: 'critical',
          title: `Trial→Paid em ${pct.toFixed(1)}% — bem abaixo do alvo`,
          detail: 'Target inicial é ≥15%. Investiga o flow de paywall + trial reminder.',
          to: '/revenue',
          icon: TrendingUpIcon,
        });
      } else if (pct < 10) {
        out.push({
          id: 'trial-to-paid-warning',
          severity: 'warning',
          title: `Trial→Paid em ${pct.toFixed(1)}% — abaixo do alvo (15%)`,
          detail: 'Vale revisar o paywall e timing de reminder.',
          to: '/revenue',
          icon: TrendingUpIcon,
        });
      }
    }

    // Churn
    const churn = kpi?.churn_period ?? 0;
    if (churn > 10) {
      out.push({
        id: 'churn-critical',
        severity: 'critical',
        title: `${formatNumber(churn)} cancelamentos no período`,
        detail: 'Acima de 10/período é zona vermelha. Olha cohort retention.',
        to: '/product/retention',
        icon: AlertTriangleIcon,
      });
    } else if (churn > 5) {
      out.push({
        id: 'churn-warning',
        severity: 'warning',
        title: `${formatNumber(churn)} cancelamentos no período`,
        detail: 'Acima de 5 — vale investigar. Verifica cohort retention.',
        to: '/product/retention',
        icon: AlertTriangleIcon,
      });
    }

    // Error rate
    if (errorRate && errorRate.previous > 0 && errorRate.current > errorRate.previous) {
      const delta = (errorRate.current - errorRate.previous) / errorRate.previous;
      if (delta >= 1.0) {
        out.push({
          id: 'errors-critical',
          severity: 'critical',
          title: `Erros do app dobraram (+${(delta * 100).toFixed(0)}%)`,
          detail: `Atual: ${formatNumber(errorRate.current)} · Anterior: ${formatNumber(errorRate.previous)}.`,
          to: '/tech/errors',
          icon: AlertTriangleIcon,
        });
      } else if (delta >= 0.5) {
        out.push({
          id: 'errors-warning',
          severity: 'warning',
          title: `Erros do app subiram ${(delta * 100).toFixed(0)}%`,
          detail: `Atual: ${formatNumber(errorRate.current)} · Anterior: ${formatNumber(errorRate.previous)}.`,
          to: '/tech/errors',
          icon: AlertTriangleIcon,
        });
      }
    }

    // Trials expiring
    const expiring = kpi?.trials_expiring_7d ?? 0;
    if (expiring >= 5 && tToP !== null && tToP !== undefined && tToP < 0.1) {
      out.push({
        id: 'trials-expiring-low-conv',
        severity: 'warning',
        title: `${expiring} trials expirando nos próximos 7 dias`,
        detail: 'Combinado com Trial→Paid baixo, vale ativar reminder push antes do vencimento.',
        to: '/revenue',
        icon: BellIcon,
      });
    }

    return out;
  }, [kpi, revenue, errorRate, payouts]);

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };

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
              Alerts
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Anomalias detectadas com regras client-side. AI adaptive em V2.
            </p>
          </div>
        </div>
        <Link
          to="/inbox"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Inbox
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <CounterTile label="Críticos" value={counts.critical} tone="critical" />
        <CounterTile label="Atenção" value={counts.warning} tone="warning" />
        <CounterTile label="Total" value={alerts.length} tone="neutral" />
      </section>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Avaliando regras…
        </div>
      ) : alerts.length === 0 ? (
        <Card className="ozly-card border-emerald-200 bg-emerald-50/60">
          <div className="py-8 text-center text-emerald-700">
            <BellIcon className="mx-auto mb-2 h-8 w-8" />
            <div className="text-base font-semibold">Tudo verde.</div>
            <div className="mt-1 text-xs">
              Nenhum alerta ativo no momento. Bom sinal.
            </div>
          </div>
        </Card>
      ) : (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Alertas ativos
          </Title>
          <ul className="mt-3 space-y-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              const tone = SEVERITY_CLASS[alert.severity];
              const inner = (
                <div className={`flex items-start gap-3 rounded-md border p-3 ${tone.card}`}>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone.iconBg}`}>
                    <Icon className={`h-4 w-4 ${tone.iconText}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tone.badge}`}>
                        {alert.severity}
                      </span>
                      <span className={`font-medium ${tone.title}`}>{alert.title}</span>
                    </div>
                    <p className={`mt-0.5 text-[12px] ${tone.detail}`}>{alert.detail}</p>
                  </div>
                  {alert.to && (
                    <span className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      Abrir →
                    </span>
                  )}
                </div>
              );
              return (
                <li key={alert.id}>
                  {alert.to ? (
                    <Link to={alert.to} className="block">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="ozly-card border-navy-100 bg-navy-50/40 p-3 text-[12px] text-navy-500">
        <strong>V2 — AI anomaly detection:</strong> regras adaptativas com Gemini
        analisando trend + sazonalidade. Habilita junto com o AI Composer (precisa
        Gemini token + brand voice curado).
      </div>

      <RawDataPanel
        page="inbox-alerts"
        sources={[
          { rpc: 'admin_kpi_dashboard', params: { p_period_days: 30 }, data: kpi },
          { rpc: 'admin_revenue_summary', params: { p_period_days: 30 }, data: revenue },
          { rpc: 'admin_app_error_rate', params: { p_period_days: 30 }, data: errorRate },
          { rpc: 'admin_affiliate_payout_planning', params: {}, data: payouts },
        ]}
      />
    </div>
  );
}

const SEVERITY_CLASS: Record<
  Severity,
  {
    card: string;
    iconBg: string;
    iconText: string;
    title: string;
    detail: string;
    badge: string;
  }
> = {
  critical: {
    card: 'border-rose-200 bg-rose-50/60',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-700',
    title: 'text-rose-900',
    detail: 'text-rose-700',
    badge: 'bg-rose-200 text-rose-900',
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/60',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    title: 'text-amber-900',
    detail: 'text-amber-700',
    badge: 'bg-amber-200 text-amber-900',
  },
  info: {
    card: 'border-navy-100 bg-navy-50/40',
    iconBg: 'bg-navy-100',
    iconText: 'text-navy-700',
    title: 'text-navy-700',
    detail: 'text-navy-500',
    badge: 'bg-navy-100 text-navy-700',
  },
};

function CounterTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'critical' | 'warning' | 'neutral';
}) {
  const TONE: Record<typeof tone, string> = {
    critical: 'text-rose-600',
    warning: 'text-amber-600',
    neutral: 'text-navy-700',
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

