import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

// /me/auth?t=TOKEN — troca o magic link por um session token de 30d e
// redireciona pro dashboard. Sem token, mostra mensagem genérica.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SESSION_KEY = "ozly_aff_session";

async function verifyToken(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, reason: "config_missing" };
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/affiliate_verify_magic_link`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_token: token }),
      }
    );
    if (!res.ok) return { ok: false, reason: "rpc_error" };
    return await res.json();
  } catch {
    return { ok: false, reason: "network" };
  }
}

export default function AffiliateAuth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "verifying" });
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = params.get("t");
    if (!token) {
      setState({ status: "error", reason: "missing_token" });
      return;
    }

    verifyToken(token).then((result) => {
      if (result.ok) {
        try {
          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
              token: result.session_token,
              code: result.code,
              expires_at: result.expires_at,
            })
          );
        } catch {
          // localStorage may be blocked — still redirect, dashboard will fail
          // and prompt for a new link.
        }
        navigate(`/me/${result.code}`, { replace: true });
      } else {
        setState({ status: "error", reason: result.reason ?? "unknown" });
      }
    });
  }, [params, navigate]);

  if (state.status === "verifying") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="h-12 w-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Validando seu link…
        </p>
      </div>
    );
  }

  const messages = {
    missing_token: "Link sem token. Pede um novo no /me/SEUCODIGO.",
    invalid: "Link inválido. Pode ter sido reutilizado ou expirou.",
    used: "Esse link já foi usado. Pede um novo no /me/SEUCODIGO.",
    expired: "Esse link expirou (vale só 1 hora). Pede um novo.",
    network: "Erro de rede. Tenta de novo.",
    rpc_error: "Erro ao validar. Tenta de novo daqui a pouco.",
    config_missing: "Configuração ausente. Avisa o suporte.",
    unknown: "Não consegui validar esse link.",
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">⏳</div>
      <h1 className="text-2xl font-bold mb-2 text-navy-700 dark:text-white">
        Link inválido ou expirado
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        {messages[state.reason] ?? messages.unknown}
      </p>
      <Link
        to="/"
        className="inline-block rounded-md border border-slate-300 dark:border-navy-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:border-brand-300"
      >
        Voltar pro site
      </Link>
    </div>
  );
}
