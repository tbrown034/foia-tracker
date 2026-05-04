import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import type { SparklineMarker } from "@/lib/admin-transitions";

export type SparklinePoint = {
  x: number;
  y: number | null;
};

type Props = {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  showEndDot?: boolean;
  ariaLabel?: string;
  markers?: SparklineMarker[];
  showMarkerLabels?: boolean;
};

export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = "currentColor",
  fill = "transparent",
  showEndDot = true,
  ariaLabel,
  markers = [],
  showMarkerLabels = false,
}: Props) {
  const valid = data.filter((d): d is { x: number; y: number } => d.y != null);
  if (valid.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel ?? "no data"}
      />
    );
  }

  const padX = 2;
  const padY = showMarkerLabels ? 16 : 4;
  const xs = valid.map((d) => d.x);
  const ys = valid.map((d) => d.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const x = scaleLinear()
    .domain([xMin, xMax])
    .range([padX, width - padX]);
  const y = scaleLinear()
    .domain([yMin === yMax ? yMin - 1 : yMin, yMax === yMin ? yMax + 1 : yMax])
    .range([height - padY, padY]);

  const pathGen = line<{ x: number; y: number }>()
    .x((d) => x(d.x))
    .y((d) => y(d.y))
    .curve(curveMonotoneX);

  const d = pathGen(valid) ?? "";
  const last = valid[valid.length - 1];

  const visibleMarkers = markers.filter((m) => m.x >= xMin && m.x <= xMax);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? "trend"}
    >
      {/* Vertical admin-transition markers, drawn behind the trendline */}
      {visibleMarkers.map((m, i) => {
        const xPos = x(m.x);
        const color = m.color ?? "#a8a29e";
        return (
          <g key={`marker-${i}`}>
            <line
              x1={xPos}
              x2={xPos}
              y1={padY * 0.5}
              y2={height - padY * 0.5}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.55}
            />
            {showMarkerLabels && m.label && (
              <text
                x={xPos}
                y={12}
                textAnchor="middle"
                fontSize={10}
                fill={color}
                fontFamily="ui-monospace, monospace"
              >
                {m.label}
              </text>
            )}
          </g>
        );
      })}

      {fill !== "transparent" && (
        <path
          d={`${pathGen(valid)} L ${x(xMax)},${height - padY} L ${x(xMin)},${
            height - padY
          } Z`}
          fill={fill}
          opacity={0.15}
        />
      )}
      <path d={d} stroke={stroke} strokeWidth={1.5} fill="none" />
      {showEndDot && (
        <circle cx={x(last.x)} cy={y(last.y)} r={2.25} fill={stroke} />
      )}
    </svg>
  );
}
