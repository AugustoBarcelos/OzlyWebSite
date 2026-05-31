// Tiny inline-SVG sparkline. Used in KPI cards to show trend at a glance.
// No animation — these read like little graphs of a value over time, drawing
// attention without being noisy.
//
// Pass `values` in chronological order (oldest → newest). Empty/single-value
// renders as a faint flat line so the card layout doesn't jump when data is
// still loading.

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
}

export function Sparkline({
  values,
  width = 80,
  height = 24,
  stroke = 'currentColor',
  fill,
  className = '',
}: SparklineProps) {
  if (!values || values.length < 2) {
    // Stable flat line — keeps the card height predictable.
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={className}
        aria-hidden="true"
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke={stroke}
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.25}
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - 4) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = 2 + i * stepX;
    // Flip Y so high values draw at the top.
    const y = 2 + (height - 4) * (1 - (v - min) / span);
    return [x, y] as const;
  });

  const d = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const area = fill
    ? `${d} L${points[points.length - 1]![0]},${height} L${points[0]![0]},${height} Z`
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      {area && <path d={area} fill={fill} opacity={0.18} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
