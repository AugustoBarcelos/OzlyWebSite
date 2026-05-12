import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useI18n } from "../i18n";

// Dashboard privado do afiliado — ozly.au/me/:code

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

function formatDate(iso, lang) {
  if (!iso) return "—";
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-AU";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso, d) {
  if (!iso) return d.relativeNever;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return d.relativeToday;
  if (days === 1) return d.relativeYesterday;
  if (days < 30) return d.relativeDays.replace("{n}", days);
  const months = Math.floor(days / 30);
  if (months === 1) return d.relativeMonth.replace("{n}", months);
  return d.relativeMonths.replace("{n}", months);
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

function RequestLinkScreen({ code, d }) {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

  async function handleRequest() {
    setStatus("sending");
    setError(null);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError(d.configError);
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
        setError(d.rateLimitError);
        setStatus("error");
        return;
      }
      if (!res.ok) {
        setError(d.requestError);
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError(d.networkError);
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
              {d.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {d.requestIntro}
            </p>
          </div>

          {status === "sent" ? (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-4 py-4 text-sm text-emerald-800 dark:text-emerald-200 text-center">
              <div className="text-3xl mb-2">📧</div>
              <strong className="block mb-1">{d.requestSent}</strong>
              <p>{d.requestSentDetail}</p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-3 text-xs underline text-emerald-700 dark:text-emerald-300"
              >
                {d.resend}
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
                {status === "sending" ? d.requestSending : d.requestCta}
              </button>

              {status === "error" && error && (
                <div className="mt-3 rounded-md bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                {d.noEmailHint}{" "}
                <a
                  href="https://wa.me/61493735179"
                  className="text-brand-600 underline"
                >
                  {d.whatsapp}
                </a>
                .
              </p>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-500 underline">
            {d.backToSite}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AffiliateDashboard() {
  const { t, lang } = useI18n();
  const d = t.affiliateDashboard;
  const { code } = useParams();
  const [session, setSession] = useState(() => loadSession(code));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!session) {
      // Async to avoid setState-during-effect-body lint warning.
      queueMicrotask(() => setLoading(false));
      return undefined;
    }
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag tied to fetch; the cascade is intentional and contained.
    setLoading(true);
    callRpc("affiliate_dashboard_authed", {
      p_session_token: session.token,
    }).then((r) => {
      if (!alive) return;
      if (r?.found === false && r?.reason === "invalid_session") {
        clearSession();
        setSession(null);
        setLoading(false);
        return;
      }
      setData(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [session, code]);

  function handleSignOut() {
    if (session?.token) {
      callRpc("affiliate_session_revoke", {
        p_session_token: session.token,
      }).catch(() => {});
    }
    clearSession();
    setSession(null);
    setData(null);
  }

  function openWelcomeKit(lang) {
    const url = `/kit/?code=${encodeURIComponent(code)}&lang=${lang}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!session) {
    return <RequestLinkScreen code={code} d={d} />;
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
        <h1 className="text-2xl font-bold mb-2">{d.indisponivelTitle}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {d.indisponivelDetail}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-block rounded-md border border-slate-300 dark:border-navy-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:border-brand-300"
        >
          {d.requestNewLink}
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
    recent_conversions = [],
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
    monthly: d.periodMonthly,
    quarterly: d.periodQuarterly,
    yearly: d.periodYearly,
    lifetime: d.periodLifetime,
  };
  const periodLabel = periodLabels[commission_structure.volume_period] ?? d.periodFallback;

  const statusLabel = (s) =>
    ({
      pending_signup: d.statusPendingSignup,
      subscribed: d.statusSubscribed,
      commission_ready: d.statusCommissionReady,
      paid: d.statusPaid,
      cancelled: d.statusCancelled,
      refunded: d.statusRefunded,
    }[s] ?? s);

  const statusTone = (s) =>
    ({
      pending_signup: "bg-slate-100 text-slate-700 dark:bg-navy-700 dark:text-slate-300",
      subscribed: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
      commission_ready: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
      refunded: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    }[s] ?? "bg-slate-100 text-slate-700");

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
              {d.hello}{name ? `, ${name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {d.subtitle}
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-1.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 text-right font-semibold">
              {d.welcomeKit}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => openWelcomeKit("pt")}
                title="Português"
                className="rounded-md border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => openWelcomeKit("es")}
                title="Español"
                className="rounded-md border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => openWelcomeKit("en")}
                title="English"
                className="rounded-md border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Hero earnings */}
        <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white p-6 sm:p-8 shadow-lg">
          <div className="text-xs uppercase tracking-wide opacity-90 mb-1">
            {d.pendingTotal}
          </div>
          <div className="text-4xl sm:text-5xl font-bold tabular-nums">
            {formatMoney(earnings.pending_total_cents, currency)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="opacity-80 text-xs">{d.conversions}</div>
              <div className="font-semibold">
                {formatMoney(earnings.pending_conversion_cents, currency)}
              </div>
            </div>
            <div>
              <div className="opacity-80 text-xs">{d.volumeBonus}</div>
              <div className="font-semibold">
                {formatMoney(earnings.pending_volume_cents, currency)}
              </div>
            </div>
            <div>
              <div className="opacity-80 text-xs">{d.retentionBonus}</div>
              <div className="font-semibold">
                {formatMoney(earnings.pending_milestone_cents, currency)}
              </div>
            </div>
          </div>
          {earnings.lifetime_paid_cents > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 text-xs opacity-90">
              {d.lifetimePaid}{" "}
              <strong>{formatMoney(earnings.lifetime_paid_cents, currency)}</strong>
              {earnings.last_paid_at && (
                <span> · {d.lastPayment} {relativeTime(earnings.last_paid_at, d)}</span>
              )}
            </div>
          )}
        </section>

        {/* Funnel */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{d.funnelTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {d.funnelSubtitle}
          </p>
          <div className="mt-4 space-y-2">
            {[
              { label: d.funnelSignups, value: stats.signups, color: "bg-sky-500" },
              { label: d.funnelTrial, value: stats.purchases, color: "bg-amber-500" },
              { label: d.funnelPaying, value: stats.renewals, color: "bg-emerald-500" },
            ].map((step) => {
              const pct = stats.signups > 0 ? (step.value / stats.signups) * 100 : 0;
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
                💰 {d.volumeTitle} · {periodLabel}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {d.volumeProgress
                  .replace("{count}", stats.current_period_count)
                  .replace("{period}", periodLabel)
                  .replace("{base}", formatMoney(commission_structure.base_cents, currency))}
              </p>
            </div>
            {!next && tierIdx >= 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-800">
                {d.topTier}
              </span>
            )}
          </div>

          {next && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              📈 {d.volumeNeeds
                .replace("{n}", next.needs)
                .replace("{threshold}", next.tier.threshold)
                .replace("{bonus}", formatMoney(next.tier.bonus_cents, currency))}
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {sortedTiers.map((tt, i) => {
              const reached = stats.current_period_count >= tt.threshold;
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
                    ≥{tt.threshold}
                  </span>
                  <span className="flex-1 text-slate-600 dark:text-slate-400">
                    {d.tierLump}{" "}
                    <strong className="text-slate-800 dark:text-white">
                      {formatMoney(tt.bonus_cents, currency)}
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
            ⏰ {d.retentionTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {d.retentionSubtitle}
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
                  +{formatMoney(r.bonus_cents, currency)} {d.retentionPerClient}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tools / how to share */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            🚀 {d.shareTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {d.shareSubtitle}
          </p>
          <div className="mt-4 rounded-lg bg-slate-100 dark:bg-navy-700 p-3 font-mono text-sm break-all text-slate-800 dark:text-slate-200">
            ozly.au/v/{aff_code}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/v/${aff_code}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              {d.viewLanding}
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(`https://ozly.au/v/${aff_code}`).then(() => {
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-brand-300"
            >
              {linkCopied ? d.linkCopied : d.copyLink}
            </button>
          </div>
        </section>

        {/* Activity */}
        {(stats.last_signup_at || stats.views_30d > 0) && (
          <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">
              📊 {d.activityTitle}
            </h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {stats.last_signup_at && (
                <div className="rounded-md bg-slate-50 dark:bg-navy-700 px-3 py-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {d.lastSignup}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-white">
                    {relativeTime(stats.last_signup_at, d)}
                  </div>
                </div>
              )}
              <div className="rounded-md bg-slate-50 dark:bg-navy-700 px-3 py-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {d.signups30d}
                </div>
                <div className="font-semibold text-slate-800 dark:text-white">
                  {stats.signups_30d}
                </div>
              </div>
              {typeof stats.views_30d === "number" && (
                <div className="rounded-md bg-slate-50 dark:bg-navy-700 px-3 py-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {d.views30d}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-white">
                    {stats.views_30d}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Recent conversions */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            🧾 {d.recentTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {d.recentSubtitle.replace("{n}", recent_conversions.length || 20)}
          </p>
          {recent_conversions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {d.recentEmpty}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                    <th className="pb-2 pr-2 font-medium">{d.recentColDate}</th>
                    <th className="pb-2 pr-2 font-medium">{d.recentColStatus}</th>
                    <th className="pb-2 pr-2 font-medium text-right">{d.recentColCommission}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_conversions.map((c, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-navy-700/60 last:border-0">
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">
                        {formatDate(c.signup_at, lang)}
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${statusTone(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        {c.commission_cents
                          ? formatMoney(c.commission_cents, c.currency ?? currency)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4">
          {d.footer}{" "}
          <a href="https://wa.me/61493735179" className="text-brand-600 underline">
            {d.whatsapp}
          </a>
          <br />
          {d.updatedNow} · {formatDate(new Date().toISOString(), lang)}
        </footer>
      </div>
    </div>
  );
}
