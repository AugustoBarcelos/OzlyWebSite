// Inline-SVG donut chart with legend on the right.
//
// We render each slice as a proper SVG <path> sector (M + A arc + L + A arc
// back + Z) rather than the stroke-dasharray trick. The dasharray approach
// produced visible flat caps at segment boundaries — strokeLinecap="butt"
// cuts perpendicular to the curve, which from a distance looks like the
// donut is a polygon. Path sectors render true curves with no facets.

import { useMemo } from 'react';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** Override the colour for this slice. CSS colour, hex or var(). */
  colour?: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Big number rendered in the centre — defaults to sum of all slices. */
  centreLabel?: string;
  centreSub?: string;
  ariaLabel?: string;
  /** Format slice value in the legend. */
  formatValue?: (n: number) => string;
  /** Click a slice (the arc OR its legend row) to drill down by its key. */
  onSliceClick?: (key: string) => void;
}

const DEFAULT_COLOURS = [
  '#2bbb97', // brand teal
  '#9dd760', // lime
  '#e11d48', // rose (overdue)
  '#607387', // navy slate (drafts)
  '#c9a43c', // sand
];

/** Build the SVG d="" for one annular sector. */
function sectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  // Guard tiny slivers so we don't try to render a 0-degree arc.
  const sweep = endAngle - startAngle;
  if (sweep <= 0.0001) return '';

  // Full ring needs to be drawn as two half-arcs (a single Arc can't draw
  // a complete 360° because start == end).
  if (sweep >= Math.PI * 2 - 0.001) {
    return [
      `M ${cx + rOuter} ${cy}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx - rOuter} ${cy}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx + rOuter} ${cy}`,
      `M ${cx + rInner} ${cy}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy}`,
      'Z',
    ].join(' ');
  }

  const largeArc = sweep > Math.PI ? 1 : 0;
  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);
  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export function DonutChart({
  data,
  size = 160,
  thickness = 22,
  centreLabel,
  centreSub,
  ariaLabel = 'Distribution chart',
  formatValue = (n) => String(n),
  onSliceClick,
}: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter - thickness;

  const total = data.reduce((s, d) => s + d.value, 0);

  const segments = useMemo(() => {
    // Start at 12 o'clock (−π/2) and sweep clockwise.
    let cursor = -Math.PI / 2;
    return data.map((d, i) => {
      const pct = total > 0 ? d.value / total : 0;
      const sweep = pct * Math.PI * 2;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      return {
        ...d,
        pct,
        colour: d.colour ?? DEFAULT_COLOURS[i % DEFAULT_COLOURS.length]!,
        path: sectorPath(cx, cy, rOuter, rInner, start, end),
      };
    });
  }, [data, total, cx, cy, rOuter, rInner]);

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
          {/* Faint track ring so a single-segment 100% donut still reads as a ring */}
          <path
            d={sectorPath(cx, cy, rOuter, rInner, 0, Math.PI * 2)}
            fill="var(--border-hairline)"
          />
          {segments.map((s) =>
            s.pct > 0 && s.path ? (
              <path
                key={s.key}
                d={s.path}
                fill={s.colour}
                role={onSliceClick ? 'button' : undefined}
                tabIndex={onSliceClick ? 0 : undefined}
                aria-label={onSliceClick ? `${s.label} — drill down` : undefined}
                onClick={onSliceClick ? () => onSliceClick(s.key) : undefined}
                onKeyDown={
                  onSliceClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSliceClick(s.key);
                        }
                      }
                    : undefined
                }
                style={onSliceClick ? { cursor: 'pointer', transition: 'opacity 120ms ease' } : undefined}
                className={onSliceClick ? 'hover:opacity-85' : undefined}
              />
            ) : null,
          )}
        </svg>

        {(centreLabel || centreSub) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centreLabel && (
              <div className="font-display text-xl font-bold tracking-tight text-navy-800">
                {centreLabel}
              </div>
            )}
            {centreSub && (
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                {centreSub}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 text-[12.5px]">
        {segments.map((s) => {
          const row = (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: s.colour }}
                />
                <span className="truncate text-navy-700">{s.label}</span>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-semibold text-navy-800">{formatValue(s.value)}</span>
                <span className="ml-1.5 text-[10.5px] text-navy-400">
                  {(s.pct * 100).toFixed(0)}%
                </span>
              </div>
            </>
          );
          if (onSliceClick) {
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSliceClick(s.key)}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-navy-50/60"
              >
                {row}
              </button>
            );
          }
          return (
            <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
