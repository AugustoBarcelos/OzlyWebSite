import { useEffect, useState } from 'react';
import { Card, Text, Title, Badge } from '@tremor/react';
import { useToast } from '@/components/Toast';
import { AiSuggestButton } from '@/components/AiSuggestButton';
import {
  MESSAGING_SEGMENTS,
  createBroadcast,
  fetchAudienceCount,
  type MsgChannel,
  type SegmentValue,
} from '@/lib/messaging';
import { RpcError } from '@/lib/rpc';

interface Props {
  channel: MsgChannel;
  /** Disable form when channel isn't operational yet (e.g. WhatsApp pre-verification). */
  disabled?: boolean;
  disabledReason?: string;
  onCreated?: () => void;
}

/**
 * Composer pra broadcast de email/whatsapp/sms. Segment picker (com
 * audience count em tempo real), subject (só email), body, schedule
 * opcional. Cria via messaging_create_broadcast RPC — backend resolve
 * audience e cria deliveries. Edge fn dispatcher despacha depois.
 */
export function BroadcastComposer({ channel, disabled, disabledReason, onCreated }: Props) {
  const [segment, setSegment] = useState<SegmentValue>(
    (MESSAGING_SEGMENTS[0]?.value ?? 'all-active') as SegmentValue,
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    setLoadingAudience(true);
    fetchAudienceCount(segment)
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
  }, [segment]);

  async function handleSubmit() {
    if (!body.trim()) {
      toast({ title: 'Body é obrigatório', variant: 'error' });
      return;
    }
    if (channel === 'msg_email' && !subject.trim()) {
      toast({ title: 'Subject é obrigatório pra email', variant: 'error' });
      return;
    }
    if (scheduleType === 'later' && !scheduleAt) {
      toast({ title: 'Data/hora obrigatórias quando agendado', variant: 'error' });
      return;
    }

    setBusy(true);
    try {
      const result = await createBroadcast({
        channel,
        segment,
        subject: channel === 'msg_email' ? subject : null,
        body,
        scheduledAt: scheduleType === 'later' ? new Date(scheduleAt).toISOString() : null,
      });
      toast({
        title: result.status === 'scheduled' ? 'Broadcast agendado' : 'Broadcast criado (draft)',
        description: `${result.audience_count.toLocaleString()} destinatários · status: ${result.status}`,
        variant: 'success',
      });
      setSubject('');
      setBody('');
      setScheduleAt('');
      setScheduleType('now');
      onCreated?.();
    } catch (e) {
      toast({
        title: e instanceof RpcError ? e.message : 'Failed',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  const segmentMeta = MESSAGING_SEGMENTS.find((s) => s.value === segment);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Title>Novo broadcast</Title>
          <Text className="mt-1 text-xs text-navy-300">
            Audience é resolvido pelo servidor — você não vê IDs, só contagem.
          </Text>
        </div>
        {disabled && (
          <Badge color="amber" size="xs">
            {disabledReason ?? 'Indisponível'}
          </Badge>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {/* Segment picker */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">
            Audiência (segment)
          </label>
          <div className="flex flex-wrap gap-2">
            {MESSAGING_SEGMENTS.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={disabled || busy}
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
            {segmentMeta?.hint} · {' '}
            <strong>
              {loadingAudience ? '…' : audienceCount !== null ? `${audienceCount.toLocaleString()} usuários` : '—'}
            </strong>
          </Text>
        </div>

        {/* AI assist — fills subject + body from a brief */}
        {!disabled && (
          <AiSuggestButton
            source={`broadcast_composer_${channel}`}
            channel={channel}
            segmentHint={segment}
            onAccept={(r) => {
              if (r.subject !== null) setSubject(r.subject);
              setBody(r.body);
            }}
          />
        )}

        {/* Subject (email only) */}
        {channel === 'msg_email' && (
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={disabled || busy}
              placeholder="Tax tips this week..."
              className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50"
            />
          </div>
        )}

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">
            Mensagem (body)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={disabled || busy}
            rows={6}
            className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:opacity-50 font-mono"
            placeholder={
              channel === 'msg_email'
                ? 'Hi there,\n\nFiscal year end is around the corner...\n\n— Ozly team'
                : channel === 'msg_whatsapp'
                  ? 'Heads up — your trial expires in 2 days.'
                  : 'Trial expirando: ozly.au/upgrade'
            }
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-xs font-medium text-navy-600 mb-1">Agendamento</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="schedule"
                checked={scheduleType === 'now'}
                onChange={() => setScheduleType('now')}
                disabled={disabled || busy}
              />
              Manda agora (vira draft pra você revisar)
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="schedule"
                checked={scheduleType === 'later'}
                onChange={() => setScheduleType('later')}
                disabled={disabled || busy}
              />
              Agendar
            </label>
            {scheduleType === 'later' && (
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                disabled={disabled || busy}
                className="rounded-md border border-navy-100 px-2 py-1 text-xs"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-50">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={disabled || busy || !body.trim()}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? 'Criando…' : scheduleType === 'later' ? 'Agendar broadcast' : 'Criar draft'}
          </button>
        </div>
      </div>
    </Card>
  );
}
