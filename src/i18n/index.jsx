import { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "./en.json";

// English ships in the main bundle (primary audience). PT and ES are lazy-
// loaded only when the user actually picks them, saving ~20KB gz on first
// paint for the vast majority of visitors.
const locales = { en };

const STORAGE_KEY = "ozly-lang";

function getBrowserLang() {
  const lang = navigator.language?.slice(0, 2);
  if (lang === "es") return "es";
  if (lang === "pt") return "pt";
  return "en";
}

function getInitialLang() {
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

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);
  const [t, setT] = useState(() => locales[lang] || en);

  useEffect(() => {
    let active = true;
    loadLocale(lang).then((bundle) => {
      if (active) setT(bundle);
    });
    return () => {
      active = false;
    };
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    document.documentElement.lang = l === "pt" ? "pt-BR" : l === "es" ? "es" : "en";
  }, []);

  useEffect(() => {
    document.title = t.siteTitle;
  }, [t.siteTitle]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const supportedLangs = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];
