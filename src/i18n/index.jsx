import { createContext, useContext, useState, useCallback } from "react";
import pt from "./pt.json";
import en from "./en.json";
import es from "./es.json";

const locales = { pt, en, es };

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
    if (saved && locales[saved]) return saved;
  } catch {}
  return getBrowserLang();
}

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    document.documentElement.lang = l === "pt" ? "pt-BR" : l === "es" ? "es" : "en";
  }, []);

  const t = locales[lang] || locales.en;

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
