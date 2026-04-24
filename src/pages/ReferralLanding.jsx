import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "../i18n";

// Landing pública acessada pelo QR code do vendedor (/v/:code).
//
// Fluxo:
//  1. Valida o código via RPC `validate_referral_code` do Supabase.
//  2. Mostra o nome do vendedor e instruções.
//  3. Detecta OS — iOS/Android mostram botão direto pra store + clipboard
//     com prefixo `OZLY_` para autofill no signup do app.
//  4. Desktop mostra QR code da mesma URL pra abrir no celular.
//
// A segurança de conversão vive no backend: quando o user baixa o app e
// digita o código na tela de setup, o RPC `apply_referral_code` cria a
// linha em `affiliate_conversions`. Esta página é só "porta de entrada".

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL ??
  "https://apps.apple.com/au/app/ozly/id6760398649";
const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL ??
  "https://play.google.com/store/apps/details?id=com.augusto.ozly";

// Detecção simples de OS. Basta para escolher store correta — não
// precisamos de precisão cirúrgica (iPadOS cai em "ios" o que está ok).
function detectOS() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  // Mac com toque (iPad moderno se apresenta como Mac) — tratar como iOS
  // para direcionar à App Store.
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "desktop";
}

async function validateCode(code) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { valid: false, reason: "config_missing" };
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/validate_referral_code`,
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
    if (!res.ok) return { valid: false, reason: "rpc_error" };
    return await res.json();
  } catch {
    return { valid: false, reason: "network" };
  }
}

// Gera QR code via serviço público (não precisa instalar pacote). Retorna
// URL da imagem; o <img> carrega direto.
function qrImageUrl(text) {
  const enc = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=1&data=${enc}`;
}

export default function ReferralLanding() {
  const { t } = useI18n();
  const r = t.referralLanding;
  const { code: rawCode } = useParams();
  const code = useMemo(() => (rawCode ?? "").toUpperCase().trim(), [rawCode]);
  // Começa como `loading` apenas se realmente vamos consultar; sem código,
  // já nasce inválido para evitar o `setState` dentro do effect.
  const [validation, setValidation] = useState(() =>
    code ? { state: "loading" } : { state: "invalid" }
  );
  const [copied, setCopied] = useState(false);
  const os = useMemo(() => detectOS(), []);
  const pageUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    []
  );

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    validateCode(code).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        setValidation({
          state: "valid",
          ownerName: res.owner_name,
          kind: res.kind,
        });
      } else {
        setValidation({ state: "invalid" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Assim que o código for validado, copia para o clipboard com prefixo
  // `OZLY_` — o app na primeira abertura verifica o clipboard e preenche
  // o campo de código automaticamente se encontrar esse prefixo.
  useEffect(() => {
    if (validation.state !== "valid") return;
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(`OZLY_${code}`)
      .then(() => setCopied(true))
      .catch(() => {
        /* alguns browsers bloqueiam clipboard sem interação — sem estresse */
      });
  }, [validation.state, code]);

  const copyManually = () => {
    navigator.clipboard
      ?.writeText(code)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  if (validation.state === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-28">
        <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (validation.state === "invalid") {
    return (
      <section className="max-w-xl mx-auto px-6 pt-32 pb-20 text-center">
        <h1 className="text-2xl font-bold mb-2">{r.invalidTitle}</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {r.invalidDescription}
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href={APP_STORE_URL}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold"
          >
            {r.appStore}
          </a>
          <a
            href={PLAY_STORE_URL}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold"
          >
            {r.playStore}
          </a>
        </div>
      </section>
    );
  }

  const { ownerName } = validation;
  const displayOwner = ownerName ?? r.defaultOwner;
  const step3 = (copied ? r.step3Copied : r.step3Manual).replace("{code}", code);

  return (
    <section className="max-w-xl mx-auto px-6 pt-32 pb-12">
      <div className="text-center mb-8">
        <p className="text-sm uppercase tracking-wider text-brand-500 font-semibold mb-2">
          {r.invitedBy.replace("{name}", displayOwner)}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{r.title}</h1>
        <p className="text-slate-500 dark:text-slate-400">{r.subtitle}</p>
      </div>

      {/* Código em destaque */}
      <div className="rounded-2xl border-2 border-dashed border-brand-500/60 bg-brand-500/5 p-6 text-center mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
          {r.codeLabel}
        </p>
        <p className="text-4xl sm:text-5xl font-black tracking-widest text-brand-600 dark:text-brand-400 mb-3">
          {code}
        </p>
        <button
          onClick={copyManually}
          className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          {copied ? r.copied : r.copy}
        </button>
      </div>

      {/* Botões de download contextuais ao OS */}
      {os === "ios" && (
        <DownloadBlock
          primary={{ url: APP_STORE_URL, label: r.iosPrimary }}
          secondary={{ url: PLAY_STORE_URL, label: r.iosSecondary }}
        />
      )}
      {os === "android" && (
        <DownloadBlock
          primary={{ url: PLAY_STORE_URL, label: r.androidPrimary }}
          secondary={{ url: APP_STORE_URL, label: r.androidSecondary }}
        />
      )}
      {os === "desktop" && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {r.desktopHint}
          </p>
          <img
            src={qrImageUrl(pageUrl)}
            alt={r.qrAlt.replace("{url}", pageUrl)}
            width={280}
            height={280}
            className="mx-auto rounded-lg"
          />
          <div className="flex gap-3 justify-center mt-6">
            <a
              href={APP_STORE_URL}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
            >
              {r.appStore}
            </a>
            <a
              href={PLAY_STORE_URL}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
            >
              {r.playStore}
            </a>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="mt-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold mb-2">{r.howToTitle}</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>{r.step1}</li>
          <li>{r.step2}</li>
          <li>{step3}</li>
        </ol>
      </div>
    </section>
  );
}

function DownloadBlock({ primary, secondary }) {
  return (
    <div className="flex flex-col gap-3">
      <a
        href={primary.url}
        className="block w-full text-center px-6 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold shadow-lg shadow-brand-500/30 transition"
      >
        {primary.label}
      </a>
      <a
        href={secondary.url}
        className="block w-full text-center px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold"
      >
        {secondary.label}
      </a>
    </div>
  );
}
