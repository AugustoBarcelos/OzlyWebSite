import { Card, Text, Title } from '@tremor/react';

export interface HeatmapCell {
  weekday: number; // 0 = Mon, 6 = Sun
  hour: number;    // 0..23
  count: number;
}

interface Props {
  cells: HeatmapCell[] | null;
  maxCount: number;
  loading?: boolean;
  total: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * 7×24 heatmap mostrando quando os users mais usam o app.
 * Tons de brand-500 com opacidade proporcional à intensidade.
 */
export function ActivityHeatmap({ cells, maxCount, loading, total }: Props) {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  if (cells) {
    for (const c of cells) {
      if (c.weekday >= 0 && c.weekday < 7 && c.hour >= 0 && c.hour < 24) {
        const row = grid[c.weekday];
        if (row) row[c.hour] = c.count;
      }
    }
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <Title>Atividade · weekday × hora</Title>
        <Text className="text-xs text-navy-400">
          {total.toLocaleString()} eventos no período
        </Text>
      </div>
      <Text className="mt-1 text-xs text-navy-300">
        Tons de azul = densidade de eventos. Mais escuro = mais atividade.
      </Text>

      {loading ? (
        <div className="mt-4 grid grid-cols-25 gap-0.5">
          {Array.from({ length: 7 * 24 }).map((_, i) => (
            <div key={i} className="h-5 rounded-sm bg-navy-50/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* hour header */}
            <div className="flex items-end gap-0.5 pl-10">
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className="w-5 text-center text-[9px] text-navy-300"
                  title={`${h}h`}
                >
                  {h % 3 === 0 ? h : ''}
                </div>
              ))}
            </div>
            {grid.map((row, day) => (
              <div key={day} className="flex items-center gap-0.5 mt-0.5">
                <div className="w-10 text-right text-[10px] text-navy-500 pr-1">
                  {DAYS[day]}
                </div>
                {row.map((count, hour) => {
                  const opacity =
                    maxCount > 0 ? Math.min(1, 0.05 + (count / maxCount) * 0.95) : 0;
                  return (
                    <div
                      key={hour}
                      title={`${DAYS[day]} ${hour}:00 — ${count} events`}
                      className="h-5 w-5 rounded-sm border border-navy-50/60"
                      style={{
                        backgroundColor:
                          count > 0
                            ? `rgba(20, 184, 166, ${opacity})`
                            : 'transparent',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
