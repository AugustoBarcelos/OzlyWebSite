import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

// Dashboard privado do afiliado — ozly.au/me/:code
//
// Auth via magic link por email (Opção B):
//  1. Sem session local → mostra "send my link" CTA.
//  2. Click envia email com link /me/auth?t=TOKEN (vale 1h).
//  3. Verify troca por session 30d salva em localStorage.
//  4. Dashboard busca via affiliate_dashboard_authed(token).
//
// O code da URL é "claim" — afiliado pede pra receber o link no email
// já cadastrado. Resposta da RPC é uniforme (ok=true sempre) pra evitar
// enumeração de codes válidos.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = "ozly_aff_session";

function loadSession(forCode) {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expires_at || !parsed?.code) return null;
    if (parsed.code.toUpperCase() !== forCode.toUpperCase()) return null;
    if (new Date(parsed.expires_at).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function callRpc(name, body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { _error: "config_missing" };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status === 429) return { _error: "rate_limit" };
      return { _error: "rpc_error", _status: res.status };
    }
    return await res.json();
  } catch {
    return { _error: "network" };
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

// ─── Magic-link request UI ───────────────────────────────────────────────────

function RequestLinkScreen({ code }) {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

  async function handleRequest() {
    setStatus("sending");
    setError(null);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError("Configuração ausente. Avisa o suporte.");
      setStatus("error");
      return;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/affiliate-request-link`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );
      if (res.status === 429) {
        setError("Muitas tentativas. Aguarda 1 minuto e tenta de novo.");
        setStatus("error");
        return;
      }
      if (!res.ok) {
        setError("Erro ao pedir o link. Tenta de novo.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Erro de rede. Tenta de novo.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/40 to-white dark:from-navy-900 dark:to-navy-900">
      <div className="max-w-md mx-auto px-4 py-12 sm:py-20">
        <div className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-mono font-semibold mb-3">
              {code}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-700 dark:text-white">
              Dashboard do afiliado
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Pra ver suas conversões e ganhos, vamos te mandar um link no
              email cadastrado nesse código.
            </p>
          </div>

          {status === "sent" ? (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-4 py-4 text-sm text-emerald-800 dark:text-emerald-200 text-center">
              <div className="text-3xl mb-2">📧</div>
              <strong className="block mb-1">Link enviado!</strong>
              <p>
                Se esse código tem email cadastrado, ele já recebeu o link.
                Confere a caixa de entrada (e o spam) — vale por 1 hora.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-3 text-xs underline text-emerald-700 dark:text-emerald-300"
              >
                Reenviar
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRequest}
                disabled={status === "sending"}
                className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "sending"
                  ? "Enviando…"
                  : "📧 Receber meu link de acesso"}
              </button>

              {status === "error" && error && (
                <div className="mt-3 rounded-md bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                Sua sessão fica salva por 30 dias depois que abrir o link.
                Email não cadastrado? Avisa no{" "}
                <a
                  href="https://wa.me/61493735179"
                  className="text-brand-600 underline"
                >
                  WhatsApp
                </a>
                .
              </p>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-500 underline">
            Voltar pro site
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AffiliateDashboard() {
  const { code } = useParams();
  const [session, setSession] = useState(() => loadSession(code));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(session));

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    callRpc("affiliate_dashboard_authed", {
      p_session_token: session.token,
    }).then((d) => {
      if (!alive) return;
      // Sessão inválida (expirou no servidor antes do client expiry) — limpa.
      if (d?.found === false && d?.reason === "invalid_session") {
        clearSession();
        setSession(null);
        setLoading(false);
        return;
      }
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [session, code]);

  function handleSignOut() {
    if (session?.token) {
      // Best-effort revoke — não bloqueia.
      callRpc("affiliate_session_revoke", {
        p_session_token: session.token,
      }).catch(() => {});
    }
    clearSession();
    setSession(null);
    setData(null);
  }

  if (!session) {
    return <RequestLinkScreen code={code} />;
  }

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
        <h1 className="text-2xl font-bold mb-2">Dashboard indisponível</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Não consegui carregar os dados desse afiliado. Pede um novo link
          de acesso ou avisa o suporte.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-block rounded-md border border-slate-300 dark:border-navy-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:border-brand-300"
        >
          Pedir novo link
        </button>
      </div>
    );
  }

  const {
    code: aff_code,
    name,
    currency,
    commission_structure,
    stats,
    earnings,
  } = data;
  const tierIdx = activeVolumeIdx(
    commission_structure.volume_tiers,
    stats.current_period_count
  );
  const next = nextVolumeTier(
    commission_structure.volume_tiers,
    stats.current_period_count
  );
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
        <header className="flex items-start justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-mono font-semibold mb-3">
              {aff_code}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-navy-700 dark:text-white">
              Olá{name ? `, ${name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Seu progresso no programa de afiliados Ozly · atualizado agora
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sair"
            className="shrink-0 rounded-md border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-brand-300"
          >
            Sair
          </button>
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
