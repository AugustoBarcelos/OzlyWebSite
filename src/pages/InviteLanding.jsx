import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// Fallback web para links de convite de organização (/invite/:token).
//
// O caminho feliz é o app interceptar o Universal Link / App Link e abrir
// a InviteAcceptScreen. Esta página só aparece quando:
//  • o user não tem o app instalado (ou abriu no desktop);
//  • o iOS abriu o Safari porque o app ainda não estava instalado.
//
// Fluxo: resolve o convite via RPC pública `org_get_invitation` (mostra o
// nome da org), e direciona pra store certa. O aceite em si SÓ acontece
// dentro do app, autenticado — esta página nunca consome o token.

import { appStoreUrl, playStoreUrl } from "../lib/track";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL ?? appStoreUrl("invite_landing");
const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL ?? playStoreUrl("invite_landing");

function detectOS() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "desktop";
}

async function fetchInvitation(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/org_get_invitation`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    return row && row.org_name ? row : null;
  } catch {
    return null;
  }
}

export default function InviteLanding() {
  const { token } = useParams();
  const [state, setState] = useState({ phase: "loading", invite: null });
  const os = detectOS();

  useEffect(() => {
    let alive = true;
    fetchInvitation(token).then((invite) => {
      if (!alive) return;
      setState({ phase: invite ? "ok" : "invalid", invite });
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const storeUrl = os === "android" ? PLAY_STORE_URL : APP_STORE_URL;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {state.phase === "loading" && (
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        )}

        {state.phase === "invalid" && (
          <>
            <h1 className="text-2xl font-bold mb-3">
              This invitation link isn&apos;t valid
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              It may have expired or already been used. Ask the organisation
              that invited you to send a new one.
            </p>
          </>
        )}

        {state.phase === "ok" && (
          <>
            <h1 className="text-2xl font-bold mb-3">
              You&apos;ve been invited to join{" "}
              <span className="text-brand-600">{state.invite.org_name}</span> on
              Ozly
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Invitations are accepted inside the Ozly app. Install it (or open
              it) on your phone, then tap this invite link again from the
              email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {os !== "desktop" ? (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 transition"
                >
                  Get the Ozly app
                </a>
              ) : (
                <>
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 transition"
                  >
                    App Store (iPhone)
                  </a>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-brand-600 text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 font-semibold px-6 py-3 transition"
                  >
                    Google Play (Android)
                  </a>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-6">
              Already have the app? Open the invite link on your phone and it
              will open Ozly directly.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
