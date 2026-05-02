import { useEffect, useState, useCallback } from 'react';
import { Card, Title, Text, Badge } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { callEdge } from '@/lib/edge';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';

/**
 * ConnectionsCard — gerencia conexões OAuth com plataformas externas (TikTok,
 * YouTube, etc). Cada provider tem botão "Connect / Reconnect" que abre nova
 * janela com OAuth flow. Quando user autoriza, edge function callback salva
 * tokens em oauth_connections; este card faz refetch e mostra status.
 *
 * Health states: active (token ok), expiring_soon (<7d), expired, never_expires
 */

interface Connection {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  provider: string;
  external_username: string | null;
  expires_at: string | null;
  scope: string | null;
  created_at: string;
  health: 'active' | 'expiring_soon' | 'expired' | 'never_expires';
}

const PROVIDERS = [
  { kind: 'tiktok', label: 'TikTok', icon: '🎵', initFn: 'tiktok-oauth-init' },
  // Future: youtube, google_ads, meta, etc.
] as const;

const HEALTH_TONE: Record<Connection['health'], 'emerald' | 'amber' | 'rose' | 'slate'> = {
  active: 'emerald',
  expiring_soon: 'amber',
  expired: 'rose',
  never_expires: 'slate',
};

const HEALTH_LABEL: Record<Connection['health'], string> = {
  active: 'Conectado',
  expiring_soon: 'Expira em breve',
  expired: 'Expirado',
  never_expires: 'Permanente',
};

export function ConnectionsCard() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callRpc<{ rows: Connection[] }>(
        'admin_oauth_connections_list',
        { p_provider: null },
      );
      setConnections(data.rows ?? []);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao carregar conexões',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Listen for the OAuth popup announcing it just saved a connection. The
  // popup lands on /oauth/popup-callback (same origin as us), so postMessage
  // is restricted to our own origin. Storage event is the COOP fallback for
  // browsers that sever window.opener after cross-origin nav.
  useEffect(() => {
    const consumed = new Set<string>();

    function consume(payload: unknown) {
      const data = payload as
        | { type?: string; provider?: string; ts?: number; desc?: string }
        | null;
      if (!data?.type) return;
      const dedupeKey = `${data.type}:${data.provider ?? ''}:${data.ts ?? ''}`;
      if (consumed.has(dedupeKey)) return;
      consumed.add(dedupeKey);

      if (data.type === 'oauth_connected') {
        toast({
          variant: 'success',
          title: `${data.provider ?? 'Conta'} conectado`,
          description: 'Atualizando lista de conexões…',
        });
        void load();
      } else if (data.type === 'oauth_failed') {
        toast({
          variant: 'error',
          title: `Falha ao conectar ${data.provider ?? ''}`.trim(),
          description: data.desc ?? 'Tente de novo no fluxo OAuth.',
        });
      }
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      consume(e.data);
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== 'ozly_oauth_event' || !e.newValue) return;
      try {
        consume(JSON.parse(e.newValue));
      } catch {
        /* corrupt payload — ignore */
      }
    }
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
    };
  }, [load, toast]);

  async function startConnect(provider: typeof PROVIDERS[number]) {
    setConnecting(provider.kind);
    try {
      const r = await callEdge<{ authorize_url?: string; error?: string }>(
        provider.initFn,
        {
          method: 'POST',
          body: { redirect_after: '/ops/marketing' },
        },
      );
      if (!r.ok || !r.data.authorize_url) {
        const detail = r.ok
          ? r.data.error ?? 'no_url_returned'
          : r.error ?? 'edge_fn_failed';
        toast({
          variant: 'error',
          title: `Falha ao iniciar conexão ${provider.label}`,
          description: detail,
        });
        return;
      }
      // Open OAuth in popup. Polls for window close → reload connections.
      const popup = window.open(
        r.data.authorize_url,
        'oauth_connect',
        'width=600,height=720,scrollbars=yes',
      );
      if (!popup) {
        toast({
          variant: 'error',
          title: 'Popup bloqueado',
          description: 'Permite popups pra esse domínio e tenta de novo.',
        });
        return;
      }
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          // Refresh connections list — if user authorized, será updated.
          void load();
          toast({
            variant: 'info',
            title: `Verificando conexão ${provider.label}…`,
            description: 'Se você autorizou, a conexão aparecerá em segundos.',
          });
        }
      }, 1000);
    } catch (e) {
      toast({
        variant: 'error',
        title: `Falha ${provider.label}`,
        description: e instanceof Error ? e.message : 'Unknown',
      });
    } finally {
      setConnecting(null);
    }
  }

  return (
    <Card>
      <Title className="!text-sm">🔌 Conexões externas (OAuth)</Title>
      <Text className="mt-0.5 text-xs text-navy-300">
        Conecte contas das plataformas (TikTok, etc) pro Ozly publicar via API.
        Tokens ficam encrypted no servidor — você pode desconectar a qualquer
        momento revogando no painel da plataforma.
      </Text>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-navy-400">
          <Spinner size="sm" />
          Carregando…
        </div>
      )}

      {!loading && (
        <div className="mt-4 space-y-3">
          {PROVIDERS.map((p) => {
            const myConn = connections.find((c) => c.provider === p.kind);
            return (
              <div
                key={p.kind}
                className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-navy-700">
                      {p.label}
                    </div>
                    {myConn ? (
                      <div className="mt-0.5 text-xs text-navy-400">
                        @{myConn.external_username ?? 'unknown'} ·{' '}
                        conectado {formatRelativeTime(myConn.created_at)}
                        {myConn.expires_at && (
                          <>
                            {' '}· expira {formatRelativeTime(myConn.expires_at)}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-navy-400">
                        Não conectado
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {myConn && (
                    <Badge color={HEALTH_TONE[myConn.health]} size="xs">
                      {HEALTH_LABEL[myConn.health]}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => void startConnect(p)}
                    disabled={connecting === p.kind}
                    className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
                  >
                    {connecting === p.kind
                      ? 'Abrindo…'
                      : myConn
                        ? 'Reconectar'
                        : 'Conectar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-navy-300">
        💡 Dica: TikTok em modo Sandbox aceita só usuários adicionados na lista
        de testers. Em produção (após App Review), qualquer usuário pode
        conectar.
      </p>
    </Card>
  );
}
