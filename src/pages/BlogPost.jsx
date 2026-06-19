import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useI18n, useLangPath } from "../i18n";
import { appStoreUrl, playStoreUrl, trackStoreClick, APP_STORE_BASE, PLAY_STORE_BASE } from "../lib/track";

function formatDate(iso, lang) {
  if (!iso) return "";
  try {
    const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-AU";
    return new Date(iso + "T00:00:00").toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const BUSINESS_TAG_RE = /compan|empresa|organi/i;
function audienceLabel(tags, lang) {
  const biz = (tags || []).some((t) => BUSINESS_TAG_RE.test(String(t)));
  const L = {
    en: { org: "For business", me: "For sole traders" },
    pt: { org: "Pra empresas", me: "Pra autônomos" },
    es: { org: "Para empresas", me: "Para autónomos" },
  }[lang] || { org: "For business", me: "For sole traders" };
  return biz ? L.org : L.me;
}

/** The prerender hands React the post body inline so the first paint needs no
 *  fetch. Only valid for the post the page was server-rendered for. */
function readInline(slug, lang) {
  const el = document.getElementById("blog-post-data");
  if (!el) return null;
  try {
    const data = JSON.parse(el.textContent);
    if (data.slug === slug && data.lang === lang) return data;
  } catch {
    /* ignore malformed */
  }
  return null;
}

async function fetchPost(slug, lang) {
  // Source of truth: the worker's Supabase-backed API. Falls back to the static
  // prerender JSON (local dev / worker outage) so the page always renders.
  try {
    const api = await fetch(`/blog-api/post?slug=${encodeURIComponent(slug)}&lang=${lang}`);
    if (api.ok) return api.json();
  } catch {
    /* fall through to static */
  }
  const base = import.meta.env.BASE_URL;
  const direct = await fetch(`${base}blog-data/${slug}.${lang}.json`);
  if (direct.ok) return direct.json();
  const idx = await fetch(`${base}blog-data/index.json`);
  if (!idx.ok) throw new Error("not found");
  const entry = (await idx.json()).find((p) => p.slug === slug);
  if (!entry) throw new Error("not found");
  const fb = await fetch(`${base}blog-data/${slug}.${entry.langs[0]}.json`);
  if (!fb.ok) throw new Error("not found");
  return fb.json();
}

function applyMeta(post) {
  document.title = `${post.title} — Ozly`;
  const set = (sel, val) => document.querySelector(sel)?.setAttribute("content", val);
  set('meta[name="description"]', post.description);
  set('meta[property="og:title"]', `${post.title} — Ozly`);
  set('meta[property="og:description"]', post.description);
}

// Remount on slug/language change so the inline-data read runs fresh.
export default function BlogPost() {
  const { slug } = useParams();
  const { lang } = useI18n();
  return <BlogPostInner key={`${slug}:${lang}`} slug={slug} lang={lang} />;
}

function BlogPostInner({ slug, lang }) {
  const { t } = useI18n();
  const lp = useLangPath();
  const tb = t.blog || {};
  const [post, setPost] = useState(() => readInline(slug, lang));
  const [error, setError] = useState(false);
  // Per-article campaign → shows up in App Store Connect / Play Console and GA4
  // so you can see which post drove each install.
  const campaign = `blog-${slug}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    const inline = readInline(slug, lang);
    if (inline) {
      applyMeta(inline);
      return;
    }
    let active = true;
    fetchPost(slug, lang)
      .then((data) => {
        if (!active) return;
        setPost(data);
        applyMeta(data);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [slug, lang]);

  // Attribute store links inside the article body: stamp the campaign onto the
  // href and fire a GA4 store_click event on tap.
  useEffect(() => {
    if (!post) return;
    const root = document.querySelector(".prose-blog");
    if (!root) return;
    const bound = [];
    root.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      let store = null;
      if (href.startsWith(APP_STORE_BASE)) { a.href = appStoreUrl(campaign); store = "ios"; }
      else if (href.startsWith(PLAY_STORE_BASE)) { a.href = playStoreUrl(campaign); store = "android"; }
      if (store) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        const fn = () => trackStoreClick(store, campaign, lang);
        a.addEventListener("click", fn);
        bound.push([a, fn]);
      }
    });
    return () => bound.forEach(([a, fn]) => a.removeEventListener("click", fn));
  }, [post, campaign, lang]);

  if (error) {
    return (
      <div className="bg-white pt-40 pb-28 min-h-screen">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-slate-500 mb-6">{tb.notFound || "This article isn't available."}</p>
          <Link to={lp("/blog")} className="inline-flex items-center gap-2 font-semibold text-brand-600">
            <ArrowLeft size={16} /> {tb.back || "All articles"}
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const category = (post.tags || [])[0];

  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <header className="pt-28 md:pt-36">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <Link to={lp("/blog")} className="inline-flex items-center gap-1.5 font-medium text-slate-400 transition hover:text-brand-600">
              <ArrowLeft size={14} /> {tb.title || "Blog"}
            </Link>
          </nav>

          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]">
            <span className="text-brand-600">{audienceLabel(post.tags, lang)}</span>
            {category && <><span className="text-slate-300" aria-hidden>/</span><span className="text-slate-400">{category}</span></>}
          </div>

          <h1 className="mt-4 text-[2rem] sm:text-[2.7rem] font-bold leading-[1.1] tracking-tight text-navy-700">
            {post.title}
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-slate-500">{post.description}</p>

          {/* Byline */}
          <div className="mt-8 flex items-center gap-3 border-y border-slate-100 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white">
              O
            </div>
            <div className="text-sm">
              <div className="font-semibold text-navy-700">{post.author || "Ozly"}</div>
              <div className="flex items-center gap-2 text-slate-400">
                <span>{formatDate(post.date, lang)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {post.readingTime} {tb.read || "min read"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="prose-blog py-10 md:py-12" dangerouslySetInnerHTML={{ __html: post.html }} />

        {/* Download CTA */}
        <div className="mb-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold text-navy-700">{tb.ctaTitle || "Run your ABN the easy way"}</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            {tb.ctaSubtitle || "Free invoicing and real-time tax estimates, built for Australian sole traders."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={appStoreUrl(campaign)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStoreClick("ios", campaign, lang)}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
            >
              App Store <ArrowRight size={16} />
            </a>
            <a
              href={playStoreUrl(campaign)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStoreClick("android", campaign, lang)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-navy-700 transition hover:border-brand-300 hover:bg-white"
            >
              Google Play <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Back */}
        <div className="border-t border-slate-100 py-10 text-center">
          <Link to={lp("/blog")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-600">
            <ArrowLeft size={16} /> {tb.back || "All articles"}
          </Link>
        </div>
      </article>
    </div>
  );
}
