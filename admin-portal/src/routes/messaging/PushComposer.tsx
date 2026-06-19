import { useEffect, useRef, useState } from 'react';
import { Card, Text, Title } from '@tremor/react';
import { useToast } from '@/components/Toast';
import {
  PUSH_SEGMENTS,
  PUSH_USERS_SEGMENT,
  createPushBroadcast,
  fetchPushAudienceCount,
  searchPushUsers,
  type PushSegmentValue,
  type PushUserHit,
} from '@/lib/push';
import { RpcError } from '@/lib/rpc';

interface Props {
  onCreated?: () => void;
}

type RecipientMode = 'segment' | 'users';

/**
 * Composer pra push notification (FCM). Segment picker (com contagem de
 * aparelhos em tempo real), título, corpo, agendamento opcional. Cria via
 * push_create_broadcast RPC; o cron/edge fn despacha e grava destinatários
 * pra rastrear quem abriu.
 */
export function PushComposer({ onCreated }: Props) {
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('segment');
  const [segment, setSegment] = useState<PushSegmentValue>('__all__');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // Specific-clients picker state.
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<PushUserHit[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<PushUserHit[]>([]);
  const selectedIds = new Set(selectedUsers.map((u) => u.id));

  // Live audience count — only meaningful in segment mode.
  useEffect(() => {
    if (recipientMode !== 'segment') return;
    let alive = true;
    setLoadingAudience(true);
    fetchPushAudienceCount(segment)
      .then((r) => {
        if (alive) {
          setAudienceCount(r.count);
          setLoadingAudience(false);
        }
      })
      .catch(() => {
        if (alive) {
          setAudienceCount(null);
          setLoadingAudience(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [segment, recipientMode]);

  // Debounced user search (specific-clients mode).
  const searchSeq = useRef(0);
  useEffect(() => {
    if (recipientMode !== 'users') return;
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(() => {
      searchPushUsers(q, 20)
        .then((r) => {
          if (seq === searchSeq.current) setUserResults(r.users);
        })
        .catch(() => {
          if (seq === searchSeq.current) setUserResults([]);
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearchingUsers(false);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery, recipientMode]);

  function toggleUser(u: PushUserHit) {
    setSelectedUsers((prev) =>
      prev.some((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u],
    );
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'error' });
      return;
    }
    if (scheduleType === 'later' && !scheduleAt) {
      toast({ title: 'Data/hora obrigatórias quando agendado', variant: 'error' });
      return;
    }
    if (recipientMode === 'users' && selectedUsers.length === 0) {
      toast({ title: 'Selecione ao menos um cliente', variant: 'error' });
      return;
    }

    setBusy(true);
    try {
      const result = await createPushBroadcast({
        segment: recipientMode === 'users' ? PUSH_USERS_SEGMENT : segment,
        title,
        body,
        scheduledAt: scheduleType === 'later' ? new Date(scheduleAt).toISOString() : null,
        userIds: recipientMode === 'users' ? selectedUsers.map((u) => u.id) : null,
      });
      toast({
        title: result.status === 'scheduled' ? 'Push agendado' : 'Push criado (draft)',
        description: `${result.audience_count.toLocaleString()} aparelhos · status: ${result.status}`,
        variant: 'success',
      });
      setTitle('');
      setBody('');
      setScheduleAt('');
      setScheduleType('now');
      setSelectedUsers([]);
      setUserQuery('');
      setUserResults([]);
      onCreated?.();
    } catch (e) {
      toast({ title: e instanceof RpcError ? e.message : 'Failed', variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const segmentMeta = PUSH_SEGMENTS.find((s) => s.value === segment);
  const canSubmit =
    !!title.trim() && (recipientMode === 'segment' || selectedUsers.length > 0);

  return (
    <Card>
      <Title>Novo push</Title>
      <Text className="mt-1 text-xs text-navy-300">
        Só atinge quem tem o app instalado e push autorizado. Aberturas = quem
        tocou na notificação.
      </Text>

      <div className="mt-4 space-y-4">
        {/* Recipient mode toggle */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">
            Destinatários
          </label>
          <div className="inline-flex rounded-md border border-navy-100 p-0.5">
            {(
              [
                ['segment', 'Segmento / Todos'],
                ['users', 'Clientes específicos'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                disabled={busy}
                onClick={() => setRecipientMode(mode)}
                className={
                  'rounded px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ' +
                  (recipientMode === mode
                    ? 'bg-brand-500 text-white'
                    : 'text-navy-600 hover:text-navy-800')
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Segment picker */}
        {recipientMode === 'segment' && (
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">
              Audiência (segment)
            </label>
            <div className="flex flex-wrap gap-2">
              {PUSH_SEGMENTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={busy}
                  onClick={() => setSegment(s.value)}
                  title={s.hint}
                  className={
                    'rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ' +
                    (segment === s.value
                      ? 'border-brand-400 bg-brand-50 text-brand-800'
                      : 'border-navy-100 text-navy-600 hover:border-brand-200')
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Text className="mt-2 text-xs text-navy-500">
              {segmentMeta?.hint} ·{' '}
              <strong>
                {loadingAudience
                  ? '…'
                  : audienceCount !== null
                    ? `${audienceCount.toLocaleString()} aparelhos`
                    : '—'}
              </strong>
            </Text>
          </div>
        )}

        {/* Specific-clients picker */}
        {recipientMode === 'users' && (
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">
              Buscar cliente (email ou nome)
            </label>
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              disabled={busy}
              placeholder="Digite ao menos 2 letras…"
              className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50"
            />

            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleUser(u)}
                    title="Remover"
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-xs text-brand-800 disabled:opacity-50"
                  >
                    {u.full_name || u.email_masked || u.id.slice(0, 8)}
                    <span className="text-brand-400">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search results */}
            {userQuery.trim().length >= 2 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-navy-100">
                {searchingUsers ? (
                  <div className="px-3 py-2 text-xs text-navy-400">Buscando…</div>
                ) : userResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-navy-400">Nenhum cliente encontrado</div>
                ) : (
                  userResults.map((u) => {
                    const checked = selectedIds.has(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs hover:bg-navy-50/50 border-b border-navy-50 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleUser(u)}
                        />
                        <span className="flex-1">
                          <span className="text-navy-700">{u.full_name || '(sem nome)'}</span>
                          <span className="text-navy-400"> · {u.email_masked ?? '—'}</span>
                        </span>
                        {!u.has_device && (
                          <span className="text-[10px] text-amber-700">sem app</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            )}

            <Text className="mt-2 text-xs text-navy-500">
              <strong>{selectedUsers.length}</strong> cliente(s) selecionado(s).
              Só recebem quem tem o app com push ativo.
            </Text>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            maxLength={80}
            placeholder="Saiu novidade no Ozly 🎉"
            className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">
            Mensagem
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
            rows={3}
            maxLength={240}
            className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50"
            placeholder="Atualize o app para a versão mais recente e aproveite as melhorias."
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">Agendamento</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="push-schedule"
                checked={scheduleType === 'now'}
                onChange={() => setScheduleType('now')}
                disabled={busy}
              />
              Cria draft (você revisa e dá "Enviar agora")
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="push-schedule"
                checked={scheduleType === 'later'}
                onChange={() => setScheduleType('later')}
                disabled={busy}
              />
              Agendar
            </label>
            {scheduleType === 'later' && (
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                disabled={busy}
                className="rounded-md border border-navy-100 px-2 py-1 text-xs"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-50">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || !canSubmit}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? 'Criando…' : scheduleType === 'later' ? 'Agendar push' : 'Criar draft'}
          </button>
        </div>
      </div>
    </Card>
  );
}
