import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
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

const PER_PAGE = 4;
const AUDIENCE_KEY = "ozly_blog_audience";
// A post is "business" (Ozly for Organisations) if any tag mentions
// companies / empresas / organisations. Everything else is for the individual.
const BUSINESS_TAG_RE = /compan|empresa|organi/i;
function audienceOf(post) {
  return (post.tags || []).some((t) => BUSINESS_TAG_RE.test(String(t))) ? "business" : "consumer";
}

const UI = {
  en: { all: "All", me: "For sole traders", org: "For business", searchPh: "Search articles",
        pickTitle: "What are you here for?", pickSub: "Pick one so we show what's relevant — you can switch anytime.",
        pickMe: "I work for myself", pickMeSub: "ABN, tax, GST, visas",
        pickOrg: "I run a business", pickOrgSub: "Contractors, compliance, retention",
        none: "No articles match.", featured: "Featured", min: "min read", read: "Read" },
  pt: { all: "Todos", me: "Pra autônomos", org: "Pra empresas", searchPh: "Buscar artigos",
        pickTitle: "O que te traz aqui?", pickSub: "Escolha uma opção pra mostrarmos o que faz sentido — dá pra trocar quando quiser.",
        pickMe: "Trabalho por conta própria", pickMeSub: "ABN, imposto, GST, vistos",
        pickOrg: "Tenho uma empresa", pickOrgSub: "Contractors, compliance, retenção",
        none: "Nenhum artigo encontrado.", featured: "Destaque", min: "min de leitura", read: "Ler" },
  es: { all: "Todos", me: "Para autónomos", org: "Para empresas", searchPh: "Buscar artículos",
        pickTitle: "¿Qué te trae por acá?", pickSub: "Elegí una opción para mostrarte lo relevante — podés cambiar cuando quieras.",
        pickMe: "Trabajo por mi cuenta", pickMeSub: "ABN, impuestos, GST, visas",
        pickOrg: "Tengo una empresa", pickOrgSub: "Contractors, compliance, retención",
        none: "No hay artículos.", featured: "Destacado", min: "min de lectura", read: "Leer" },
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
  const pageItems = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  // On page 1 with no active search, lead with a featured article.
  const featured = current === 1 && !query.trim() ? pageItems[0] : null;
  const rest = featured ? pageItems.slice(1) : pageItems;
  const goTo = (p) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const empty = error || (posts && filtered.length === 0);
  const showPicker = posts && !audience;
  const suggestions = (posts || [])
    .filter((p) => !audience || audienceOf(p) === audience)
    .map((p) => sumFor(p).title);

  const audienceLabel = (p) => (audienceOf(p) === "business" ? ui.org : ui.me);

  const seg = (val, label) => (
    <button
      type="button"
      onClick={() => setAud(val)}
      className={`relative pb-2 text-sm font-semibold transition-colors ${
        audience === val ? "text-navy-700" : "text-slate-400 hover:text-navy-600"
      }`}
    >
      {label}
      {audience === val && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />}
    </button>
  );

  const Meta = ({ s, p }) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-400">
      <span className="font-medium text-brand-600">{audienceLabel(p)}</span>
      <span aria-hidden>·</span>
      <span>{formatDate(s.date, lang)}</span>
      <span aria-hidden>·</span>
      <span>{s.readingTime} {ui.min}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-16 md:pt-28">
        {/* Compact header: brand logo + Blog, search on the right; the intro on
            its own line below. Articles start right below — no oversized hero. */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}OSLY.svg`} alt="Ozly" width="36" height="36" className="h-9 w-auto" />
              <span className="text-2xl font-bold tracking-tight text-navy-700">Blog</span>
            </h1>
            {posts && (
              <div className="relative w-full sm:w-60">
                <Search size={15} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  list="blog-search-suggestions"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder={ui.searchPh}
                  className="w-full border-0 border-b border-slate-200 bg-transparent py-1.5 pl-6 pr-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-0"
                />
                <datalist id="blog-search-suggestions">
                  {suggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            )}
          </div>
          {tb.intro && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500">{tb.intro}</p>}
        </div>

        {/* Audience tabs */}
        {posts && (
          <div className="mb-10 flex items-center gap-6 border-b border-slate-100">
            {seg("", ui.all)}
            {seg("consumer", ui.me)}
            {seg("business", ui.org)}
            {showPicker && (
              <span className="ml-auto hidden pb-2 text-xs text-slate-400 sm:inline">{ui.pickSub}</span>
            )}
          </div>
        )}

        {empty && (
          <p className="py-24 text-center text-slate-400">
            {query || audience ? ui.none : (tb.empty || "No articles yet — check back soon.")}
          </p>
        )}

        {/* Featured lead — full-width card */}
        {featured && (() => {
          const s = sumFor(featured);
          return (
            <Link
              to={lp(`/blog/${featured.slug}`)}
              className="group mb-8 block rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition hover:border-brand-300 hover:bg-white hover:shadow-sm md:p-9"
            >
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className="rounded bg-brand-500/10 px-2 py-0.5 text-brand-700">{ui.featured}</span>
                <span className="text-slate-400">{audienceLabel(featured)}</span>
              </div>
              <h2 className="max-w-3xl text-2xl font-bold leading-tight tracking-tight text-navy-700 transition group-hover:text-brand-600 sm:text-3xl">
                {s.title}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">{s.description}</p>
              <div className="mt-5 flex items-center gap-x-2 text-[13px] text-slate-400">
                <span>{formatDate(s.date, lang)}</span>
                <span aria-hidden>·</span>
                <span>{s.readingTime} {ui.min}</span>
              </div>
            </Link>
          );
        })()}

        {/* Article list — bordered cards, clear separation, no gradient */}
        <div className="grid gap-5 sm:grid-cols-2">
          {rest.map((post) => {
            const s = sumFor(post);
            return (
              <Link
                key={post.slug}
                to={lp(`/blog/${post.slug}`)}
                className="group flex flex-col rounded-2xl border border-slate-200 p-6 transition hover:border-brand-300 hover:shadow-sm"
              >
                <Meta s={s} p={post} />
                <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-navy-700 transition group-hover:text-brand-600">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-500 line-clamp-3">
                  {s.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  {ui.read}
                  <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-16 flex items-center justify-center gap-1.5" aria-label={tb.pagination || "Pagination"}>
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 1}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={p === current ? "page" : undefined}
                className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-bold transition ${
                  p === current ? "bg-navy-700 text-white" : "text-navy-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={current === totalPages}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
