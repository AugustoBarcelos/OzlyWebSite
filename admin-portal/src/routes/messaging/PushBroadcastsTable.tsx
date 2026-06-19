import { useCallback, useEffect, useState } from 'react';
import { Card, Text, Title, Badge } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import {
  PUSH_SEGMENTS,
  deletePushBroadcast,
  listPushBroadcasts,
  sendPushNow,
  type PushBroadcastRow,
} from '@/lib/push';
import { RpcError } from '@/lib/rpc';

interface Props {
  refreshKey?: number;
}

const STATUS_COLORS: Record<string, 'gray' | 'amber' | 'sky' | 'emerald' | 'rose'> = {
  draft: 'gray',
  scheduled: 'amber',
  sending: 'sky',
  sent: 'emerald',
  failed: 'rose',
  cancelled: 'gray',
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d < 1) {
    const h = Math.floor(ms / (1000 * 60 * 60));
    if (h < 1) return 'agora';
    return `${h}h atrás`;
  }
  if (d === 1) return 'ontem';
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString('en-AU');
}

const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(
  PUSH_SEGMENTS.map((s) => [s.value, s.label]),
);

export function PushBroadcastsTable({ refreshKey = 0 }: Props) {
  const [rows, setRows] = useState<PushBroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listPushBroadcasts(50);
      setRows(r.broadcasts);
    } catch (e) {
      setError(e instanceof RpcError ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  async function handleDelete(id: string) {
    if (!window.confirm('Deletar push? Só permitido se draft/scheduled/cancelled/failed.')) return;
    try {
      await deletePushBroadcast(id);
      toast({ title: 'Push deletado', variant: 'success' });
      await reload();
    } catch (e) {
      toast({ title: e instanceof RpcError ? e.message : 'Failed', variant: 'error' });
    }
  }

  async function handleSendNow(r: PushBroadcastRow) {
    if (!window.confirm(`Enviar agora para ${r.audience_count ?? '—'} aparelhos? Envio em até ~1 min.`)) return;
    try {
      await sendPushNow(r.id);
      toast({ title: 'Push na fila de envio (≤1 min)', variant: 'success' });
      await reload();
    } catch (e) {
      toast({ title: e instanceof RpcError ? e.message : 'Failed', variant: 'error' });
    }
  }

  return (
    <Card>
      <Title>Histórico de push</Title>
      <Text className="mt-1 text-xs text-navy-300">
        Últimos 50. Aberturas = usuários que tocaram na notificação (atualiza
        conforme as pessoas abrem).
      </Text>

      {loading ? (
        <div className="mt-4 flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          Sem push ainda
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-50 text-left text-[11px] uppercase tracking-wide text-navy-400">
              <tr>
                <th className="py-2">Quando</th>
                <th className="py-2">Título / Mensagem</th>
                <th className="py-2">Audiência</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Enviados / Aberturas</th>
                <th className="py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-navy-50 last:border-0">
                  <td className="py-3 text-xs text-navy-500">
                    <div>{relativeTime(r.created_at)}</div>
                    {r.scheduled_at && (
                      <div className="text-[10px] text-amber-700">
                        agend.: {new Date(r.scheduled_at).toLocaleString('en-AU')}
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="font-medium text-navy-700 line-clamp-1">{r.title}</div>
                    <div className="text-xs text-navy-500 line-clamp-2">{r.body_preview}</div>
                  </td>
                  <td className="py-3 text-xs">
                    <div className="text-navy-700">
                      {r.segment === '__users__'
                        ? `Clientes específicos (${r.audience_count ?? 0})`
                        : SEGMENT_LABEL[r.segment] ?? r.segment}
                    </div>
                    <div className="text-navy-400">
                      {r.audience_count?.toLocaleString() ?? '—'} aparelhos
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge color={STATUS_COLORS[r.status]} size="xs">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right text-xs">
                    <div className="text-navy-700">
                      {r.sent_count.toLocaleString()} enviados
                      {r.failed_count > 0 && (
                        <span className="text-rose-600"> · {r.failed_count} falha</span>
                      )}
                    </div>
                    <div className="text-navy-400">
                      {r.opened_count.toLocaleString()} aberturas
                      {r.open_rate_pct !== null ? ` · ${r.open_rate_pct}%` : ''}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {(r.status === 'draft' ||
                        r.status === 'scheduled' ||
                        r.status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => void handleSendNow(r)}
                          className="text-xs font-medium text-emerald-600 hover:underline"
                        >
                          {r.status === 'failed' ? 'Reenviar' : 'Enviar agora'}
                        </button>
                      )}
                      {(r.status === 'draft' ||
                        r.status === 'scheduled' ||
                        r.status === 'cancelled' ||
                        r.status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(r.id)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Deletar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
