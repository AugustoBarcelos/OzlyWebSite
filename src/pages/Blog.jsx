import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Clock, Search, User, Building2 } from "lucide-react";
import { useI18n, useLangPath, useSeoMeta } from "../i18n";

/** Date → localized "15 Jun 2026" style, best-effort per language. */
function formatDate(iso, lang) {
  if (!iso) return "";
  try {
    const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-AU";
    return new Date(iso + "T00:00:00").toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Deterministic brand gradient per post (so cards look designed without needing
// cover images). Same slug → same gradient every render.
const GRADIENTS = [
  "linear-gradient(135deg,#2BBB97,#1d8a6e)",
  "linear-gradient(135deg,#89c94e,#24a383)",
  "linear-gradient(135deg,#162431,#24a383)",
  "linear-gradient(135deg,#33c19e,#9DD760)",
  "linear-gradient(135deg,#1d8a6e,#162431)",
];
function gradientFor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const PER_PAGE = 4;
const AUDIENCE_KEY = "ozly_blog_audience";
// A post is "business" (Ozly for Organisations) if any tag mentions
// companies / empresas / organisations. Everything else is for the individual.
const BUSINESS_TAG_RE = /compan|empresa|organi/i;
function audienceOf(post) {
  return (post.tags || []).some((t) => BUSINESS_TAG_RE.test(String(t))) ? "business" : "consumer";
}

const UI = {
  en: { all: "All", me: "For me", org: "For business", searchPh: "Search articles…",
        pickTitle: "What are you here for?", pickSub: "Pick one so we show what's relevant — you can switch anytime.",
        pickMe: "I work for myself", pickMeSub: "ABN, tax, GST, visas",
        pickOrg: "I run a business", pickOrgSub: "Contractors, compliance, retention", none: "No articles match." },
  pt: { all: "Todos", me: "Pra mim", org: "Pra empresa", searchPh: "Buscar artigos…",
        pickTitle: "O que te traz aqui?", pickSub: "Escolha uma opção pra mostrarmos o que faz sentido — dá pra trocar quando quiser.",
        pickMe: "Trabalho por conta própria", pickMeSub: "ABN, imposto, GST, vistos",
        pickOrg: "Tenho uma empresa", pickOrgSub: "Contractors, compliance, retenção", none: "Nenhum artigo encontrado." },
  es: { all: "Todos", me: "Para mí", org: "Para empresa", searchPh: "Buscar artículos…",
        pickTitle: "¿Qué te trae por acá?", pickSub: "Elegí una opción para mostrarte lo relevante — podés cambiar cuando quieras.",
        pickMe: "Trabajo por mi cuenta", pickMeSub: "ABN, impuestos, GST, visas",
        pickOrg: "Tengo una empresa", pickOrgSub: "Contractors, compliance, retención", none: "No hay artículos." },
};

export default function Blog() {
  const { t, lang } = useI18n();
  const lp = useLangPath();
  useSeoMeta("blog");
  const ui = UI[lang] || UI.en;
  const tb = t.blog || {};
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [audience, setAudience] = useState(() => {
    try { return localStorage.getItem(AUDIENCE_KEY) || ""; } catch { return ""; }
  });

  // Honour ?for=business|consumer (e.g. clicked from the home / business landing)
  // so the visitor lands straight on the relevant content.
  useEffect(() => {
    const f = searchParams.get("for");
    if (f === "business" || f === "consumer") {
      setAudience(f);
      try { localStorage.setItem(AUDIENCE_KEY, f); } catch { /* ignore */ }
    }
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    // Source of truth: the worker's Supabase-backed API. Falls back to the
    // static index (local dev / worker outage).
    fetch(`/blog-api/index`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => fetch(`${import.meta.env.BASE_URL}blog-data/index.json`).then((r) => (r.ok ? r.json() : Promise.reject())))
      .then((data) => active && setPosts(data))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, []);

  const setAud = (a) => {
    setAudience(a);
    setPage(1);
    try { localStorage.setItem(AUDIENCE_KEY, a); } catch { /* ignore */ }
  };

  const sumFor = (p) => p.summaries[lang] || p.summaries[p.langs[0]];

  // Filter by audience + live search query.
  const filtered = useMemo(() => {
    let list = posts || [];
    if (audience === "business" || audience === "consumer") {
      list = list.filter((p) => audienceOf(p) === audience);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const s = sumFor(p);
        return `${s.title} ${s.description} ${(s.tags || []).join(" ")}`.toLowerCase().includes(q);
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, audience, query, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const goTo = (p) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const empty = error || (posts && filtered.length === 0);
  const showPicker = posts && !audience;
  // Autocomplete suggestions for the search box (current audience scope).
  const suggestions = (posts || [])
    .filter((p) => !audience || audienceOf(p) === audience)
    .map((p) => sumFor(p).title);

  const seg = (val, label) => (
    <button
      type="button"
      onClick={() => setAud(val)}
      className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
        audience === val ? "bg-brand-500 text-white" : "text-navy-500 hover:bg-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-50/70 to-white border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-5 pt-32 pb-12 md:pt-40 md:pb-16 text-center">
          <span className="inline-block text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600 mb-4">
            {tb.eyebrow || "Ozly Blog"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-navy-700 tracking-tight mb-4">
            {tb.title || "Ozly Blog"}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{tb.intro}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        {/* Audience picker (first visit / direct access) */}
        {showPicker && (
          <div className="mb-12 rounded-3xl border border-slate-200 bg-slate-50/60 p-7 text-center">
            <h2 className="text-xl font-extrabold text-navy-700">{ui.pickTitle}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{ui.pickSub}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAud("consumer")}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <User size={22} />
                </span>
                <span>
                  <span className="block font-bold text-navy-700">{ui.pickMe}</span>
                  <span className="block text-xs text-slate-400">{ui.pickMeSub}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAud("business")}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Building2 size={22} />
                </span>
                <span>
                  <span className="block font-bold text-navy-700">{ui.pickOrg}</span>
                  <span className="block text-xs text-slate-400">{ui.pickOrgSub}</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Controls: audience toggle + search */}
        {posts && (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-1 self-start rounded-full bg-slate-100 p-1">
              {seg("", ui.all)}
              {seg("consumer", ui.me)}
              {seg("business", ui.org)}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                list="blog-search-suggestions"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder={ui.searchPh}
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
              />
              <datalist id="blog-search-suggestions">
                {suggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
        )}

        {empty && (
          <p className="text-center text-slate-400 py-20">
            {query || audience ? ui.none : (tb.empty || "No articles yet — check back soon.")}
          </p>
        )}

        <div className="grid gap-7 md:grid-cols-2">
          {visible.map((post) => {
            const s = sumFor(post);
            const tags = (s.tags || []).slice(0, 2);
            return (
              <Link
                key={post.slug}
                to={lp(`/blog/${post.slug}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10"
              >
                <div className="relative h-32 w-full" style={{ background: gradientFor(post.slug) }}>
                  {tags[0] && (
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-navy-700">
                      {tags[0]}
                    </span>
                  )}
                  <span className="absolute right-4 top-4 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                    {audienceOf(post) === "business" ? ui.org : ui.me}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span>{formatDate(s.date, lang)}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {s.readingTime} {tb.read || "min read"}
                    </span>
                    {!post.langs.includes(lang) && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase">{post.langs[0]}</span>
                    )}
                  </div>
                  <h2 className="mb-2 text-xl font-bold leading-snug text-navy-700 transition group-hover:text-brand-600">
                    {s.title}
                  </h2>
                  <p className="mb-5 flex-1 text-[15px] leading-relaxed text-slate-500 line-clamp-3">
                    {s.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                    {tb.readMore || "Read article"}
                    <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label={tb.pagination || "Pagination"}>
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-navy-600 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={p === current ? "page" : undefined}
                className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-bold transition ${
                  p === current
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-200 text-navy-600 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={current === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-navy-600 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
