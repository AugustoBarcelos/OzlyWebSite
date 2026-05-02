import { useEffect, useMemo, useState } from 'react';

/**
 * OAuth popup landing page. The provider's edge function (e.g.
 * tiktok-oauth-callback) does the token exchange + DB upsert, then 302s the
 * popup here so we can render a real React UI and notify the opener.
 *
 * We can't render the success page directly from the edge function because
 * Supabase's gateway force-applies `Content-Type: text/plain` and a sandbox
 * CSP on unauthenticated function responses, killing inline scripts and HTML.
 *
 * Same-origin as the opener (peixes.ozly.au) → postMessage Just Works. As a
 * COOP-severed-opener fallback we also write a sentinel to localStorage so
 * the opener can pick it up via a `storage` event.
 */

type Status = 'success' | 'error';

interface Parsed {
  provider: string;
  status: Status;
  username: string | null;
  error: string | null;
  desc: string | null;
}

function parseQuery(): Parsed {
  const sp = new URLSearchParams(window.location.search);
  const status = sp.get('status') === 'success' ? 'success' : 'error';
  return {
    provider: sp.get('provider') ?? 'unknown',
    status,
    username: sp.get('username'),
    error: sp.get('error'),
    desc: sp.get('desc'),
  };
}

const PROVIDER_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
};

export function OAuthPopupCallbackPage() {
  const parsed = useMemo(parseQuery, []);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const messageType =
      parsed.status === 'success' ? 'oauth_connected' : 'oauth_failed';
    const payload = {
      type: messageType,
      provider: parsed.provider,
      username: parsed.username,
      error: parsed.error,
      desc: parsed.desc,
      ts: Date.now(),
    };

    // Tell the opener directly (works when same-origin opener is preserved).
    try {
      window.opener?.postMessage(payload, window.location.origin);
    } catch {
      /* opener gone — fall through to storage fallback */
    }

    // Storage fallback: same-origin admin portal tabs receive a `storage`
    // event whenever this key changes. Survives COOP-severed openers.
    try {
      window.localStorage.setItem('ozly_oauth_event', JSON.stringify(payload));
    } catch {
      /* private mode / disabled storage — nothing to do */
    }

    const t = setTimeout(() => {
      setClosing(true);
      try {
        window.close();
      } catch {
        /* user closes manually */
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [parsed]);

  const providerLabel = PROVIDER_LABEL[parsed.provider] ?? parsed.provider;
  const isSuccess = parsed.status === 'success';

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-navy-50 p-6">
      <section
        className={`w-full max-w-md rounded-xl border p-8 text-center bg-white ${
          isSuccess ? 'border-emerald-200' : 'border-rose-200'
        }`}
      >
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
            isSuccess
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-rose-50 text-rose-600'
          }`}
        >
          {isSuccess ? '✓' : '✗'}
        </div>
        <h1
          className={`text-base font-semibold ${
            isSuccess ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {isSuccess
            ? `${providerLabel} conectado`
            : `Falha ao conectar ${providerLabel}`}
        </h1>
        {isSuccess ? (
          <p className="mt-2 text-sm text-navy-500">
            Conta{' '}
            <strong className="text-navy-700">
              {parsed.username ?? 'desconhecida'}
            </strong>{' '}
            agora está vinculada ao Ozly.
            <br />
            Pode fechar esta janela.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-navy-500">
              {parsed.desc ?? 'Algo deu errado durante a autorização.'}
            </p>
            {parsed.error && (
              <p className="mt-1 text-xs text-navy-400">
                código:{' '}
                <code className="rounded bg-navy-50 px-1.5 py-0.5">
                  {parsed.error}
                </code>
              </p>
            )}
          </>
        )}
        <p className="mt-6 text-xs text-navy-400">
          {closing
            ? 'Fechando…'
            : 'Esta janela fecha sozinha em alguns segundos.'}
        </p>
      </section>
    </main>
  );
}
