// Inline-SVG line chart — no recharts/d3 dependency. ~3KB.
//
// Renders a single time-series with smoothed line + area fill + dotted
// gridlines + min/max labels. Hover crosshair shows the value at the
// nearest x. Designed for the dashboard "revenue trend" panel.

import { useId, useMemo, useState } from 'react';

export interface LinePoint {
  label: string;   // x-axis label (e.g. date string)
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  height?: number;
  /** Format the value for the tooltip / max label. Defaults to `$1,234`. */
  formatValue?: (n: number) => string;
  /** Optional y-axis prefix shown on the max line. */
  topLabel?: string;
  ariaLabel?: string;
  /** When set, clicking anywhere on the chart fires this (e.g. → reports). */
  onClick?: (point?: LinePoint, index?: number) => void;
}

const PADDING = { top: 18, right: 18, bottom: 22, left: 14 };

function defaultFormat(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export function LineChart({
  data,
  height = 200,
  formatValue = defaultFormat,
  ariaLabel = 'Trend chart',
  onClick,
}: LineChartProps) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Responsive: we use viewBox so width can flow to container. Pick a wide
  // base to give the line room to breathe.
  const width = 720;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const { points, min, max } = useMemo(() => {
    if (data.length === 0) return { points: [] as Array<readonly [number, number]>, min: 0, max: 0 };
    const values = data.map((d) => d.value);
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    // Pad the range so a flat-ish line doesn't render against the chart edge.
    const range = (mx - mn) || mx || 1;
    const padBottom = mn - range * 0.08;
    const padTop = mx + range * 0.12;
    const span = padTop - padBottom;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    const pts = data.map((d, i) => {
      const x = PADDING.left + i * stepX;
      const y = PADDING.top + innerH * (1 - (d.value - padBottom) / span);
      return [x, y] as const;
    });
    return { points: pts, min: mn, max: mx };
  }, [data, innerW, innerH]);

  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-navy-400">No data yet</div>;
  }

  // Build a smooth path using cubic bézier between consecutive points.
  const linePath = points
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = points[i - 1]!;
      const cx = (px + x) / 2;
      return `C${cx},${py} ${cx},${y} ${x},${y}`;
    })
    .join(' ');

  const lastX = points[points.length - 1]?.[0] ?? PADDING.left;
  const firstX = points[0]?.[0] ?? PADDING.left;
  const areaPath =
    `${linePath} L${lastX},${height - PADDING.bottom} L${firstX},${height - PADDING.bottom} Z`;

  // Gridlines — 3 horizontal divisions
  const grid = Array.from({ length: 3 }, (_, i) => {
    const y = PADDING.top + (innerH * (i + 1)) / 4;
    return y;
  });

  return (
    <div className={`relative ${onClick ? 'cursor-pointer' : ''}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        aria-label={ariaLabel}
        role={onClick ? 'button' : 'img'}
        tabIndex={onClick ? 0 : undefined}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const xPct = (e.clientX - rect.left) / rect.width;
          const idx = Math.round(xPct * (data.length - 1));
          setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
        }}
        onMouseLeave={() => setHoverIdx(null)}
        onClick={
          onClick
            ? () => {
                const idx = hoverIdx ?? data.length - 1;
                onClick(data[idx], idx);
              }
            : undefined
        }
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const idx = hoverIdx ?? data.length - 1;
                  onClick(data[idx], idx);
                }
              }
            : undefined
        }
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"  stopColor="var(--color-brand-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Gridlines — dotted, very subtle. */}
        {grid.map((y, i) => (
          <line
            key={`g-${i}`}
            x1={PADDING.left}
            y1={y}
            x2={width - PADDING.right}
            y2={y}
            stroke="var(--border-hairline)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}

        {/* Area fill under the line. */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* The line itself. */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Last-point dot — fixes the eye on "what we have today". */}
        {points.length > 0 && (
          <>
            <circle
              cx={points[points.length - 1]![0]}
              cy={points[points.length - 1]![1]}
              r={6}
              fill="var(--color-brand-500)"
              opacity={0.15}
            />
            <circle
              cx={points[points.length - 1]![0]}
              cy={points[points.length - 1]![1]}
              r={3}
              fill="var(--color-brand-500)"
            />
          </>
        )}

        {/* Hover crosshair + dot */}
        {hoverIdx !== null && points[hoverIdx] && (
          <>
            <line
              x1={points[hoverIdx]![0]}
              x2={points[hoverIdx]![0]}
              y1={PADDING.top}
              y2={height - PADDING.bottom}
              stroke="var(--color-brand-400)"
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <circle
              cx={points[hoverIdx]![0]}
              cy={points[hoverIdx]![1]}
              r={4}
              fill="var(--color-brand-500)"
              stroke="white"
              strokeWidth={2}
            />
          </>
        )}

        {/* y-axis labels — min + max only */}
        <text
          x={PADDING.left}
          y={PADDING.top - 4}
          fontSize="10"
          fontWeight="600"
          fill="var(--ink-tertiary)"
        >
          {formatValue(max)}
        </text>
        <text
          x={PADDING.left}
          y={height - 6}
          fontSize="10"
          fontWeight="600"
          fill="var(--ink-tertiary)"
        >
          {formatValue(min)}
        </text>
      </svg>

      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm"
          style={{
            left: `${((points[hoverIdx]![0]) / width) * 100}%`,
            top: `${(points[hoverIdx]![1] / height) * 100}%`,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-soft)',
            color: 'var(--ink-primary)',
          }}
        >
          <div className="font-display font-bold">{formatValue(data[hoverIdx]!.value)}</div>
          <div className="text-[10px] font-normal" style={{ color: 'var(--ink-tertiary)' }}>
            {data[hoverIdx]!.label}
          </div>
        </div>
      )}
    </div>
  );
}
