import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import en from "./en.json";

// English ships in the main bundle (primary audience). PT and ES are lazy-
// loaded only when the user actually picks them, saving ~20KB gz on first
// paint for the vast majority of visitors.
const locales = { en };

const STORAGE_KEY = "ozly-lang";

// Routes that exist under /pt/ and /es/ prefixes (prerendered at build time
// by scripts/postbuild.js — keep both lists in sync). Everything else
// (affiliate, legal, invites) lives at the root only.
// eslint-disable-next-line react-refresh/only-export-components
export const LOCALIZED_ROUTES = ["/", "/support", "/guide", "/guide/business", "/business", "/blog"];

/** True for routes that exist under /pt and /es — including blog posts
 *  (/blog/<slug>), which are dynamic so they can't be listed literally. */
// eslint-disable-next-line react-refresh/only-export-components
export function isLocalizedRoute(bare) {
  return LOCALIZED_ROUTES.includes(bare) || bare.startsWith("/blog/");
}

/** "/pt/guide" → "pt"; "/es" → "es"; "/guide" → null */
// eslint-disable-next-line react-refresh/only-export-components
export function langFromPath(pathname) {
  if (pathname === "/pt" || pathname.startsWith("/pt/")) return "pt";
  if (pathname === "/es" || pathname.startsWith("/es/")) return "es";
  return null;
}

/** "/pt/guide/" → "/guide"; "/es" → "/"; "/guide" → "/guide" */
// eslint-disable-next-line react-refresh/only-export-components
export function stripLangPrefix(pathname) {
  const bare = pathname.replace(/^\/(pt|es)(?=\/|$)/, "");
  const noTrail = bare.replace(/\/+$/, "");
  return noTrail === "" ? "/" : noTrail;
}

/** langHref("pt", "/guide") → "/pt/guide"; langHref("en", "/") → "/" */
// eslint-disable-next-line react-refresh/only-export-components
export function langHref(lang, path) {
  const bare = stripLangPrefix(path);
  if (lang === "en" || !lang) return bare;
  return bare === "/" ? `/${lang}/` : `/${lang}${bare}`;
}

function getBrowserLang() {
  const lang = navigator.language?.slice(0, 2);
  if (lang === "es") return "es";
  if (lang === "pt") return "pt";
  return "en";
}

function getInitialLang(pathname) {
  // URL prefix is the source of truth (it's what crawlers and shared links
  // see); saved preference and browser language are fallbacks for the root.
  const fromUrl = langFromPath(pathname);
  if (fromUrl) return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en" || saved === "es") return saved;
  } catch {}
  return getBrowserLang();
}

async function loadLocale(lang) {
  if (locales[lang]) return locales[lang];
  if (lang === "pt") {
    const m = await import("./pt.json");
    locales.pt = m.default;
    return locales.pt;
  }
  if (lang === "es") {
    const m = await import("./es.json");
    locales.es = m.default;
    return locales.es;
  }
  return locales.en;
}

function htmlLang(lang) {
  return lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-AU";
}

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [lang, setLangState] = useState(() => getInitialLang(location.pathname));
  const [t, setT] = useState(() => locales[lang] || en);

  // Back/forward navigation or in-app links across language prefixes must
  // re-sync the language with the URL. Render-time adjustment (not an
  // effect) — React re-renders immediately before committing.
  const urlLang = langFromPath(location.pathname);
  if (urlLang && urlLang !== lang) {
    setLangState(urlLang);
  }

  useEffect(() => {
    let active = true;
    loadLocale(lang).then((bundle) => {
      if (active) setT(bundle);
    });
    document.documentElement.lang = htmlLang(lang);
    return () => {
      active = false;
    };
  }, [lang]);

  const setLang = useCallback(
    (l) => {
      setLangState(l);
      try { localStorage.setItem(STORAGE_KEY, l); } catch {}
      // On a localized route, switching language moves to the equivalent
      // prefixed URL so the address bar, canonical and content agree.
      const bare = stripLangPrefix(location.pathname);
      if (isLocalizedRoute(bare)) {
        const target = langHref(l, bare);
        if (target !== location.pathname) navigate(target + location.hash, { replace: false });
      }
    },
    [location.pathname, location.hash, navigate]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext);
}

/**
 * Language-aware internal link builder: `const lp = useLangPath();
 * <Link to={lp("/business")} />` → "/pt/business" when browsing in PT.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLangPath() {
  const { lang } = useI18n();
  return useCallback((path) => langHref(lang, path), [lang]);
}

/**
 * Per-page SEO meta for SPA navigation. The prerendered HTML already carries
 * the right tags for the hard load; this keeps title/description in sync as
 * the user navigates client-side or switches language.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSeoMeta(pageKey) {
  const { t, lang } = useI18n();
  useEffect(() => {
    const meta = t.seo?.[pageKey];
    if (!meta) return;
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", meta.description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", meta.title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", meta.description);
  }, [t, lang, pageKey]);
}

// eslint-disable-next-line react-refresh/only-export-components
export const supportedLangs = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];
