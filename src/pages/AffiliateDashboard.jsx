import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

// Dashboard público do afiliado — ozly.au/me/:code
//
// Sem auth. O código já é semi-público (afiliado distribui ele em QR/link),
// e a RPC `public_affiliate_dashboard` no Supabase só retorna dados agregados
// (sem PII de ninguém referenciado, sem outros afiliados).
//
// Pra ele ver:
//   - Quantas conversões fez (total / 30d / no período atual)
//   - Quanto vai receber (pendente + breakdown por categoria)
//   - Próximo tier de bonus de volume (e quanto falta)
//   - Configuração de comissão dele (base, tiers, retention)
//   - Histórico de pagamentos (lifetime + último)
//
// Pra promover engajamento: mostra próximo milestone de retenção (ex:
// "3 clientes seus completam 3 meses semana que vem").

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchDashboard(code) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { found: false, reason: "config_missing" };
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/public_affiliate_dashboard`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_code: code }),
      }
    );
    if (!res.ok) {
      if (res.status === 429) return { found: false, reason: "rate_limit" };
      return { found: false, reason: "rpc_error" };
    }
    return await res.json();
  } catch {
    return { found: false, reason: "network" };
  }
}

function formatMoney(cents, currency) {
  if (cents == null) return "—";
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso) {
  if (!iso) return "nunca";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} mes${months > 1 ? "es" : ""}`;
}

function activeVolumeIdx(tiers, count) {
  if (!Array.isArray(tiers) || tiers.length === 0) return -1;
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  let idx = -1;
  sorted.forEach((t, i) => {
    if (count >= t.threshold) idx = i;
  });
  return idx;
}

function nextVolumeTier(tiers, count) {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  for (const t of sorted) {
    if (count < t.threshold) return { tier: t, needs: t.threshold - count };
  }
  return null;
}

export default function AffiliateDashboard() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchDashboard(code).then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data || !data.found) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-2xl font-bold mb-2">Código não encontrado</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          O código <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-sm">{code}</code>{" "}
          não está ativo no programa de afiliados.
        </p>
        {data?.reason === "rate_limit" ? (
          <p className="text-amber-700 text-sm">
            Muitas requisições. Aguarda 1 minuto e tenta de novo.
          </p>
        ) : (
          <Link to="/" className="text-brand-600 underline">
            Voltar pro site
          </Link>
        )}
      </div>
    );
  }

  const { code: aff_code, name, currency, commission_structure, stats, earnings } = data;
  const tierIdx = activeVolumeIdx(commission_structure.volume_tiers, stats.current_period_count);
  const next = nextVolumeTier(commission_structure.volume_tiers, stats.current_period_count);
  const sortedTiers = [...(commission_structure.volume_tiers ?? [])].sort(
    (a, b) => a.threshold - b.threshold
  );
  const sortedRetention = [...(commission_structure.retention_bonuses ?? [])].sort(
    (a, b) => a.months - b.months
  );

  const periodLabels = {
    monthly: "este mês",
    quarterly: "este trimestre",
    yearly: "este ano",
    lifetime: "lifetime",
  };
  const periodLabel = periodLabels[commission_structure.volume_period] ?? "este período";

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/40 to-white dark:from-navy-900 dark:to-navy-900">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <header className="text-center sm:text-left">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-mono font-semibold mb-3">
            {aff_code}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-700 dark:text-white">
            Olá{name ? `, ${name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Seu progresso no programa de afiliados Ozly · atualizado agora
          </p>
        </header>

        {/* Hero earnings */}
        <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white p-6 sm:p-8 shadow-lg">
          <div className="text-xs uppercase tracking-wide opacity-90 mb-1">
            A receber
          </div>
          <div className="text-4xl sm:text-5xl font-bold tabular-nums">
            {formatMoney(earnings.pending_total_cents, currency)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="opacity-80 text-xs">Conversões</div>
              <div className="font-semibold">
                {formatMoney(earnings.pending_conversion_cents, currency)}
              </div>
            </div>
            <div>
              <div className="opacity-80 text-xs">Volume bonus</div>
              <div className="font-semibold">
                {formatMoney(earnings.pending_volume_cents, currency)}
              </div>
            </div>
            <div>
              <div className="opacity-80 text-xs">Retenção</div>
              <div className="font-semibold">
                {formatMoney(earnings.pending_milestone_cents, currency)}
              </div>
            </div>
          </div>
          {earnings.lifetime_paid_cents > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 text-xs opacity-90">
              Total já recebido lifetime:{" "}
              <strong>{formatMoney(earnings.lifetime_paid_cents, currency)}</strong>
              {earnings.last_paid_at && (
                <span> · último pagamento {relativeTime(earnings.last_paid_at)}</span>
              )}
            </div>
          )}
        </section>

        {/* Funnel */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Funil</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total desde sempre · todas as conversões com seu código
          </p>
          <div className="mt-4 space-y-2">
            {[
              { label: "Signups", value: stats.signups, color: "bg-sky-500" },
              { label: "Trial / 1ª compra", value: stats.purchases, color: "bg-amber-500" },
              { label: "Pagantes (renovaram)", value: stats.renewals, color: "bg-emerald-500" },
            ].map((step) => {
              const pct =
                stats.signups > 0 ? (step.value / stats.signups) * 100 : 0;
              return (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="w-32 sm:w-40 shrink-0 text-sm text-slate-700 dark:text-slate-300">
                    {step.label}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-navy-700">
                    <div
                      className={`h-full ${step.color}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono font-semibold text-slate-800 dark:text-white">
                      {step.value}
                    </span>
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-slate-500">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Volume tier progress */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-navy-700 dark:text-white">
                💰 Volume bonus · {periodLabel}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <strong>{stats.current_period_count}</strong> conversões{" "}
                {periodLabel}. Cada cliente pago = base{" "}
                {formatMoney(commission_structure.base_cents, currency)}
              </p>
            </div>
            {!next && tierIdx >= 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-800">
                🏆 top tier
              </span>
            )}
          </div>

          {next && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              📈 Faltam <strong>{next.needs}</strong> conversões pra atingir{" "}
              ≥{next.tier.threshold} e ganhar lump{" "}
              <strong>{formatMoney(next.tier.bonus_cents, currency)}</strong>
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {sortedTiers.map((t, i) => {
              const reached = stats.current_period_count >= t.threshold;
              const isCurrent = i === tierIdx;
              return (
                <li
                  key={i}
                  className={[
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-sm",
                    isCurrent
                      ? "border-brand-300 bg-brand-50 dark:bg-brand-900/30"
                      : reached
                        ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20"
                        : "border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-800",
                  ].join(" ")}
                >
                  <span className="w-16 font-mono text-slate-700 dark:text-slate-300">
                    ≥{t.threshold}
                  </span>
                  <span className="flex-1 text-slate-600 dark:text-slate-400">
                    lump{" "}
                    <strong className="text-slate-800 dark:text-white">
                      {formatMoney(t.bonus_cents, currency)}
                    </strong>
                  </span>
                  <span className="text-xs">{reached ? "✓" : "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Retention bonuses */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            ⏰ Retention bonus
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Você ganha um extra por cada cliente seu que mantiver assinatura.
          </p>
          <ul className="mt-4 space-y-2">
            {sortedRetention.map((r) => (
              <li
                key={r.months}
                className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm"
              >
                <span className="w-16 font-mono text-slate-700 dark:text-slate-300">
                  {r.months}m
                </span>
                <span className="flex-1 text-slate-600 dark:text-slate-400">
                  +{formatMoney(r.bonus_cents, currency)} por cliente
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tools / how to share */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            🚀 Compartilhe seu link
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Quanto mais pessoas baixarem usando seu código, mais você ganha.
          </p>
          <div className="mt-4 rounded-lg bg-slate-100 dark:bg-navy-700 p-3 font-mono text-sm break-all text-slate-800 dark:text-slate-200">
            ozly.au/v/{aff_code}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/v/${aff_code}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Ver landing pública →
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(`https://ozly.au/v/${aff_code}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-brand-300"
            >
              Copiar link
            </button>
          </div>
        </section>

        {/* Activity */}
        {stats.last_signup_at && (
          <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">
              📊 Atividade recente
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 dark:bg-navy-700 px-3 py-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Último signup
                </div>
                <div className="font-semibold text-slate-800 dark:text-white">
                  {relativeTime(stats.last_signup_at)}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 dark:bg-navy-700 px-3 py-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Signups últimos 30 dias
                </div>
                <div className="font-semibold text-slate-800 dark:text-white">
                  {stats.signups_30d}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4">
          Programa de afiliados Ozly · dúvidas?{" "}
          <a href="https://wa.me/61493735179" className="text-brand-600 underline">
            WhatsApp
          </a>
          <br />
          Atualizado em tempo real · {formatDate(new Date().toISOString())}
        </footer>
      </div>
    </div>
  );
}
