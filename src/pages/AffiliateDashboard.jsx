import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useI18n } from "../i18n";

// Dashboard privado do afiliado — ozly.au/me/:code

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = "ozly_aff_session";

const RANGE_OPTIONS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "lifetime", days: null },
];

const TABLE_PAGE_SIZE = 20;
const STATUS_FILTERS = [
  "pending_signup",
  "subscribed",
  "commission_ready",
  "paid",
  "cancelled",
  "refunded",
];

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

function formatDateShort(iso, lang) {
  if (!iso) return "—";
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-AU";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
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

function computeDelta(current, previous) {
  const c = Number(current ?? 0);
  const p = Number(previous ?? 0);
  const diff = c - p;
  if (diff === 0) return { diff: 0, arrow: "→", tone: "neutral" };
  if (diff > 0) return { diff, arrow: "↑", tone: "up" };
  return { diff, arrow: "↓", tone: "down" };
}

// ─── Magic-link request UI ───────────────────────────────────────────────────

function RequestLinkScreen({ code, d }) {
  const [status, setStatus] = useState("idle");
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

// ─── Period toggle ───────────────────────────────────────────────────────────

function PeriodToggle({ value, onChange, d }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-0.5">
      {RANGE_OPTIONS.map((opt) => {
        const isActive = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={[
              "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
              isActive
                ? "bg-brand-500 text-white"
                : "text-slate-600 dark:text-slate-300 hover:text-brand-600",
            ].join(" ")}
          >
            {d[`range_${opt.key}`] ?? opt.key}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sparkline (SVG inline) ──────────────────────────────────────────────────

function Sparkline({ data, d, lang }) {
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const width = 560;
  const height = 140;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const max = Math.max(
      1,
      ...data.map((p) => Math.max(p.signups, p.purchases, p.renewals))
    );
    const x = (i) =>
      data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1);
    const y = (v) => innerH - (v / max) * innerH;
    const series = (key) =>
      data
        .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p[key])}`)
        .join(" ");
    return {
      max,
      signups: series("signups"),
      purchases: series("purchases"),
      renewals: series("renewals"),
      lastPoints: data.length - 1,
      x,
      y,
    };
  }, [data, innerW, innerH]);

  if (!points || data.length < 2) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400 italic py-6 text-center">
        {d.sparklineEmpty}
      </div>
    );
  }

  const labels = [
    data[0],
    data[Math.floor(data.length / 2)],
    data[data.length - 1],
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full max-w-[560px] mx-auto block"
        role="img"
        aria-label={d.sparklineAlt}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={0}
              x2={innerW}
              y1={innerH * t}
              y2={innerH * t}
              stroke="currentColor"
              strokeOpacity={t === 1 ? 0.25 : 0.08}
              strokeWidth={1}
            />
          ))}
          <path d={points.signups}   fill="none" stroke="#0ea5e9" strokeWidth={2} />
          <path d={points.purchases} fill="none" stroke="#f59e0b" strokeWidth={2} />
          <path d={points.renewals}  fill="none" stroke="#10b981" strokeWidth={2.5} />
          {labels.map((p, i) => {
            const idx =
              i === 0 ? 0 : i === 1 ? Math.floor(data.length / 2) : data.length - 1;
            return (
              <text
                key={i}
                x={points.x(idx)}
                y={innerH + 16}
                fontSize="10"
                textAnchor="middle"
                fill="currentColor"
                opacity={0.5}
              >
                {formatDateShort(p.date, lang)}
              </text>
            );
          })}
          <text x={0} y={-2} fontSize="10" fill="currentColor" opacity={0.5}>
            max {points.max}
          </text>
        </g>
      </svg>
      <div className="flex justify-center gap-4 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-3 rounded bg-sky-500" /> {d.funnelSignups}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-3 rounded bg-amber-500" /> {d.funnelTrial}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-3 rounded bg-emerald-500" /> {d.funnelPaying}
        </span>
      </div>
    </div>
  );
}

// ─── Status chip helpers ─────────────────────────────────────────────────────

function statusLabel(s, d) {
  return (
    {
      pending_signup:    d.statusPendingSignup,
      subscribed:        d.statusSubscribed,
      commission_ready:  d.statusCommissionReady,
      paid:              d.statusPaid,
      cancelled:         d.statusCancelled,
      refunded:          d.statusRefunded,
    }[s] ?? s
  );
}

function statusTone(s) {
  return (
    {
      pending_signup:   "bg-slate-100 text-slate-700 dark:bg-navy-700 dark:text-slate-300",
      subscribed:       "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
      commission_ready: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      paid:             "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      cancelled:        "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
      refunded:         "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    }[s] ?? "bg-slate-100 text-slate-700"
  );
}

// ─── Conversions table (paginated, filterable) ───────────────────────────────

function ConversionsTable({ token, rangeDays, currency, d, lang }) {
  const [statusFilter, setStatusFilter] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset paging when filters change.
    setPage(0);
  }, [rangeDays, statusFilter]);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag tied to fetch.
    setLoading(true);
    callRpc("affiliate_conversions_paged", {
      p_session_token: token,
      p_range_days: rangeDays,
      p_status_filter: statusFilter.length ? statusFilter : null,
      p_offset: page * TABLE_PAGE_SIZE,
      p_limit: TABLE_PAGE_SIZE,
    }).then((res) => {
      if (!alive) return;
      if (res?.found === false) {
        setRows([]);
        setTotal(0);
      } else {
        setRows(Array.isArray(res?.rows) ? res.rows : []);
        setTotal(res?.total ?? 0);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [token, rangeDays, statusFilter, page]);

  const totalPages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));

  function toggleStatus(s) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <section
      id="conversions-table"
      className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            🧾 {d.recentTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {d.tableSubtitle.replace("{total}", total)}
          </p>
        </div>
        {statusFilter.length > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter([])}
            className="text-xs underline text-slate-500 hover:text-brand-600"
          >
            {d.clearFilters}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                active
                  ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                  : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-brand-300",
              ].join(" ")}
            >
              {statusLabel(s, d)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {d.loading}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {statusFilter.length > 0 ? d.tableEmptyFiltered : d.recentEmpty}
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                  <th className="pb-2 pr-2 font-medium">{d.recentColDate}</th>
                  <th className="pb-2 pr-2 font-medium">{d.tableColPurchase}</th>
                  <th className="pb-2 pr-2 font-medium">{d.tableColRenewal}</th>
                  <th className="pb-2 pr-2 font-medium">{d.recentColStatus}</th>
                  <th className="pb-2 pr-2 font-medium text-right">{d.recentColCommission}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 dark:border-navy-700/60 last:border-0"
                  >
                    <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">
                      {formatDate(c.signup_at, lang)}
                    </td>
                    <td className="py-2 pr-2 text-xs text-slate-500 dark:text-slate-400">
                      {c.first_purchase_at ? formatDate(c.first_purchase_at, lang) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-xs text-slate-500 dark:text-slate-400">
                      {c.first_renewal_at ? formatDate(c.first_renewal_at, lang) : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${statusTone(c.status)}`}>
                        {statusLabel(c.status, d)}
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

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {d.paginationLabel
                  .replace("{page}", page + 1)
                  .replace("{pages}", totalPages)
                  .replace("{total}", total)}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md border border-slate-200 dark:border-navy-700 px-2 py-1 disabled:opacity-30 hover:border-brand-300"
                >
                  ← {d.prev}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-slate-200 dark:border-navy-700 px-2 py-1 disabled:opacity-30 hover:border-brand-300"
                >
                  {d.next} →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
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
  const [rangeKey, setRangeKey] = useState("30d");
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [retentionOpen, setRetentionOpen] = useState(false);

  const rangeDays = useMemo(
    () => RANGE_OPTIONS.find((r) => r.key === rangeKey)?.days ?? 30,
    [rangeKey]
  );

  const fetchDashboard = useCallback(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    callRpc("affiliate_dashboard_authed_v2", {
      p_session_token: session.token,
      p_range_days: rangeDays,
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
  }, [session, rangeDays]);

  useEffect(() => {
    if (!session) {
      queueMicrotask(() => setLoading(false));
      return undefined;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading is tied to the fetch; cascade is intentional.
    const cleanup = fetchDashboard();
    return cleanup;
  }, [session, fetchDashboard]);

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

  function openWelcomeKit(kitLang) {
    const url = `/kit/?code=${encodeURIComponent(code)}&lang=${kitLang}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!session) {
    return <RequestLinkScreen code={code} d={d} />;
  }

  if (loading && !data) {
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
    volume_awards = [],
    retention_history = [],
    retention_pipeline = [],
    timeseries = [],
  } = data;

  const rangeStats = stats.range ?? { signups: 0, purchases: 0, renewals: 0, new_paying: 0 };
  const prevStats  = stats.previous_range ?? { signups: 0, purchases: 0, renewals: 0, new_paying: 0 };
  const lifeStats  = stats.lifetime ?? { signups: 0, purchases: 0, renewals: 0 };

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
    monthly:   d.periodMonthly,
    quarterly: d.periodQuarterly,
    yearly:    d.periodYearly,
    lifetime:  d.periodLifetime,
  };
  const periodLabel = periodLabels[commission_structure.volume_period] ?? d.periodFallback;

  const payingDelta = computeDelta(rangeStats.new_paying, prevStats.new_paying);
  const signupDelta = computeDelta(rangeStats.signups, prevStats.signups);

  const rangeLabel = d[`range_${rangeKey}`] ?? rangeKey;
  const prevRangeLabel =
    rangeKey === "lifetime"
      ? d.prevRangeLifetime
      : d.prevRangeOther.replace("{n}", rangeDays);

  function scrollToTable() {
    const el = document.getElementById("conversions-table");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/40 to-white dark:from-navy-900 dark:to-navy-900">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 flex-wrap">
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

        {/* Period toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wide">
            {d.periodFilterLabel}
          </div>
          <PeriodToggle value={rangeKey} onChange={setRangeKey} d={d} />
        </div>

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

          {/* Range deltas */}
          {rangeKey !== "lifetime" && (
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="opacity-80">
                  {d.rangeDeltaSignups.replace("{range}", rangeLabel)}
                </div>
                <div className="font-semibold tabular-nums">
                  {rangeStats.signups}{" "}
                  <span className="opacity-80">
                    {signupDelta.arrow}{signupDelta.diff > 0 ? "+" : ""}
                    {signupDelta.diff} {d.vsPrev.replace("{range}", prevRangeLabel)}
                  </span>
                </div>
              </div>
              <div>
                <div className="opacity-80">
                  {d.rangeDeltaPaying.replace("{range}", rangeLabel)}
                </div>
                <div className="font-semibold tabular-nums">
                  {rangeStats.new_paying}{" "}
                  <span className="opacity-80">
                    {payingDelta.arrow}{payingDelta.diff > 0 ? "+" : ""}
                    {payingDelta.diff} {d.vsPrev.replace("{range}", prevRangeLabel)}
                  </span>
                </div>
              </div>
            </div>
          )}

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

        {/* Timeline sparkline */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-navy-700 dark:text-white">
                📈 {d.timelineTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {d.timelineSubtitle.replace("{range}", rangeLabel)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={timeseries} d={d} lang={lang} />
          </div>
        </section>

        {/* Funnel — uses range stats */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{d.funnelTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {d.funnelSubtitleRange.replace("{range}", rangeLabel)}
          </p>
          <div className="mt-4 space-y-2">
            {[
              { key: "signups",   label: d.funnelSignups, value: rangeStats.signups,    color: "bg-sky-500"     },
              { key: "purchases", label: d.funnelTrial,   value: rangeStats.purchases,  color: "bg-amber-500"   },
              { key: "renewals",  label: d.funnelPaying,  value: rangeStats.new_paying, color: "bg-emerald-500" },
            ].map((step) => {
              const denom = rangeStats.signups > 0 ? rangeStats.signups : 0;
              const pct = denom > 0 ? (step.value / denom) * 100 : 0;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => scrollToTable()}
                  className="w-full flex items-center gap-3 text-left rounded-md hover:bg-slate-50 dark:hover:bg-navy-700/60 transition-colors p-1"
                  title={d.funnelClickHint}
                >
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
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-3">
            <span>{d.lifetimeSignupsLabel}: <strong>{lifeStats.signups}</strong></span>
            <span>{d.lifetimePurchasesLabel}: <strong>{lifeStats.purchases}</strong></span>
            <span>{d.lifetimeRenewalsLabel}: <strong>{lifeStats.renewals}</strong></span>
          </div>
        </section>

        {/* Volume tier progress (expandable) */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setVolumeOpen((v) => !v)}
            className="w-full text-left flex items-start justify-between gap-2"
          >
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
            <div className="flex items-center gap-2 shrink-0">
              {!next && tierIdx >= 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-800">
                  {d.topTier}
                </span>
              )}
              <span className="text-slate-400 text-sm">{volumeOpen ? "▾" : "▸"}</span>
            </div>
          </button>

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

          {volumeOpen && (
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-navy-700">
              <h3 className="text-sm font-semibold text-navy-700 dark:text-white mb-2">
                {d.volumeAwardsHistoryTitle}
              </h3>
              {volume_awards.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  {d.volumeAwardsEmpty}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                        <th className="pb-2 pr-2 font-medium">{d.awardColPeriod}</th>
                        <th className="pb-2 pr-2 font-medium">{d.awardColThreshold}</th>
                        <th className="pb-2 pr-2 font-medium">{d.awardColAmount}</th>
                        <th className="pb-2 pr-2 font-medium">{d.awardColStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volume_awards.map((a, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-navy-700/60 last:border-0">
                          <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">
                            {formatDate(a.period_start, lang)}
                          </td>
                          <td className="py-2 pr-2 font-mono">≥{a.threshold}</td>
                          <td className="py-2 pr-2 tabular-nums">
                            {formatMoney(a.bonus_cents, a.currency ?? currency)}
                          </td>
                          <td className="py-2 pr-2">
                            <span className={`inline-block rounded px-2 py-0.5 ${a.paid_at ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                              {a.paid_at
                                ? `${d.awardPaidOn} ${formatDate(a.paid_at, lang)}`
                                : d.awardPending}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Retention bonuses (expandable) */}
        <section className="rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setRetentionOpen((v) => !v)}
            className="w-full text-left flex items-start justify-between gap-2"
          >
            <div>
              <h2 className="text-lg font-bold text-navy-700 dark:text-white">
                ⏰ {d.retentionTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {d.retentionSubtitle}
              </p>
            </div>
            <span className="text-slate-400 text-sm shrink-0">
              {retentionOpen ? "▾" : "▸"}
            </span>
          </button>

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

          {retentionOpen && (
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-navy-700 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-navy-700 dark:text-white mb-2">
                  {d.retentionPipelineTitle}
                </h3>
                {retention_pipeline.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {d.retentionPipelineEmpty}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {retention_pipeline.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-md bg-slate-50 dark:bg-navy-700/50 px-3 py-2 text-xs"
                      >
                        <span className="w-14 font-mono text-slate-600 dark:text-slate-300">
                          {p.next_milestone_months}m
                        </span>
                        <span className="flex-1 text-slate-700 dark:text-slate-200">
                          <strong>{p.client_count}</strong>{" "}
                          {d.retentionPipelineClients}{" "}
                          <span className="text-slate-500 dark:text-slate-400">
                            ({d[`bucket_${p.bucket}`] ?? p.bucket})
                          </span>
                        </span>
                        <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
                          +{formatMoney(p.potential_cents, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-navy-700 dark:text-white mb-2">
                  {d.retentionHistoryTitle}
                </h3>
                {retention_history.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {d.retentionHistoryEmpty}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                          <th className="pb-2 pr-2 font-medium">{d.awardColPeriod}</th>
                          <th className="pb-2 pr-2 font-medium">{d.retentionColMilestone}</th>
                          <th className="pb-2 pr-2 font-medium">{d.awardColAmount}</th>
                          <th className="pb-2 pr-2 font-medium">{d.awardColStatus}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retention_history.map((m, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-navy-700/60 last:border-0">
                            <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">
                              {formatDate(m.awarded_at, lang)}
                            </td>
                            <td className="py-2 pr-2 font-mono">{m.months_alive}m</td>
                            <td className="py-2 pr-2 tabular-nums">
                              {formatMoney(m.bonus_cents, m.currency ?? currency)}
                            </td>
                            <td className="py-2 pr-2">
                              <span className={`inline-block rounded px-2 py-0.5 ${m.paid_at ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                                {m.paid_at
                                  ? `${d.awardPaidOn} ${formatDate(m.paid_at, lang)}`
                                  : d.awardPending}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
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

        {/* Activity micro-stats */}
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
                  {d.signupsInRange.replace("{range}", rangeLabel)}
                </div>
                <div className="font-semibold text-slate-800 dark:text-white">
                  {rangeStats.signups}
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

        {/* Conversions table — paginated, filterable */}
        <ConversionsTable
          token={session.token}
          rangeDays={rangeDays}
          currency={currency}
          d={d}
          lang={lang}
        />

        {/* Sign out + footer */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs underline text-slate-500 hover:text-rose-600"
          >
            {d.signOut}
          </button>
        </div>

        <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
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
