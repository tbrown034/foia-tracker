import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";

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
};

export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = "currentColor",
  fill = "transparent",
  showEndDot = true,
  ariaLabel,
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
  const padY = 4;
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

  const areaGen = line<{ x: number; y: number }>()
    .x((d) => x(d.x))
    .y((d) => y(d.y))
    .curve(curveMonotoneX);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? "trend"}
    >
      {fill !== "transparent" && (
        <path
          d={`${areaGen(valid)} L ${x(xMax)},${height - padY} L ${x(xMin)},${
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
