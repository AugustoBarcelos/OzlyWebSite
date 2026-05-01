import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Text } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  STATUS_LABELS,
  getMarketingCalendar,
  type CalendarItem,
} from '@/lib/marketing';
import { RpcError } from '@/lib/rpc';
import { PageHeader } from './_PageHeader';

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/**
 * Retorna a primeira segunda-feira ≤ p_date (calendário começa na segunda).
 */
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0=dom, 1=seg, ...
  const diff = (day + 6) % 7; // segunda = 0, terça = 1, ..., domingo = 6
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfWeek(d: Date): Date {
  const out = startOfWeek(d);
  out.setDate(out.getDate() + 7);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date): string {
  // YYYY-MM-DD em horário local (não UTC) — usado pra deep-link no composer.
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  );
}

function MonthLabel({ date }: { date: Date }) {
  return (
    <span className="text-base font-semibold capitalize text-navy-700">
      {date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
    </span>
  );
}

export function MarketingCalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Range que cobre o grid: começa na segunda da semana do dia 1 e termina
  // na próxima segunda após o fim do mês. Garante exibir 5-6 semanas.
  const gridStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(cursor)), [cursor]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMarketingCalendar(gridStart, gridEnd);
      setItems(res.items);
    } catch (err) {
      setError(err instanceof RpcError ? err.message : 'Erro ao carregar calendário');
    } finally {
      setLoading(false);
    }
  }, [gridStart, gridEnd]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const dt = new Date(it.scheduled_at);
      const key = dateKey(dt);
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const cur = new Date(gridStart);
    while (cur < gridEnd) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const dayItems = selectedDay
    ? (itemsByDay.get(dateKey(selectedDay)) ?? [])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Calendário"
          description="Visão mensal do que está agendado — orgânico + email broadcast. Click em um dia abre os posts."
        />
        <Link
          to="/marketing/composer"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          + Novo post
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MonthLabel date={cursor} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
              }
              className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-sm hover:bg-navy-50"
              aria-label="Mês anterior"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="rounded-md border border-navy-100 bg-white px-3 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() =>
                setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
              }
              className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-sm hover:bg-navy-50"
              aria-label="Próximo mês"
            >
              →
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        <div className="relative mt-4">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
              <Spinner size="md" />
            </div>
          )}

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-navy-100 bg-navy-100">
            {WEEKDAY_LABELS.map((wd) => (
              <div
                key={wd}
                className="bg-navy-50 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-navy-400"
              >
                {wd}
              </div>
            ))}
            {days.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = isSameDay(d, today);
              const isSelected = selectedDay && isSameDay(d, selectedDay);
              const dayItems = itemsByDay.get(dateKey(d)) ?? [];

              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={[
                    'flex min-h-[72px] flex-col items-stretch gap-1 bg-white p-1.5 text-left transition-colors hover:bg-navy-50/40',
                    inMonth ? '' : 'opacity-40',
                    isSelected ? 'ring-2 ring-inset ring-brand-400' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={[
                        'font-medium',
                        isToday
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white'
                          : 'text-navy-600',
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="rounded-full bg-brand-100 px-1.5 text-[10px] font-medium text-brand-700">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayItems.slice(0, 6).map((it) => (
                      <span
                        key={it.variant_id}
                        title={`${CHANNEL_LABELS[it.channel]} · ${STATUS_LABELS[it.status]}`}
                        className="text-sm leading-none"
                      >
                        {CHANNEL_ICONS[it.channel]}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedDay && (
        <Card>
          <div className="flex items-center justify-between">
            <Text className="font-medium text-navy-700">
              {selectedDay.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Link
              to={`/marketing/composer?date=${dateKey(selectedDay)}`}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              + Agendar para este dia
            </Link>
          </div>

          {dayItems.length === 0 ? (
            <Text className="mt-3 text-xs italic text-navy-400">
              Sem posts agendados.
            </Text>
          ) : (
            <div className="mt-3 space-y-2">
              {dayItems.map((it) => {
                const dt = new Date(it.scheduled_at);
                const time = dt.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={it.variant_id}
                    className="flex items-start gap-3 rounded-md border border-navy-100 bg-white p-2.5"
                  >
                    <div className="shrink-0 text-2xl">
                      {CHANNEL_ICONS[it.channel]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-navy-700">
                          {CHANNEL_LABELS[it.channel]}
                        </span>
                        <span className="text-navy-400">·</span>
                        <span className="font-mono text-navy-500">{time}</span>
                        <span className="text-navy-400">·</span>
                        <span className="text-[10px] uppercase tracking-wide text-navy-400">
                          {STATUS_LABELS[it.status]}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-navy-600">
                        {it.caption || (
                          <span className="italic text-navy-300">
                            (sem caption específica)
                          </span>
                        )}
                      </div>
                    </div>
                    {it.external_url && (
                      <a
                        href={it.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 self-center text-xs text-brand-600 hover:underline"
                      >
                        Ver ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
