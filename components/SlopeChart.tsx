import { scaleLog } from "d3-scale";
import type { SlopeChartData, SlopePoint } from "@/lib/queries";

type Props = {
  data: SlopeChartData;
  width?: number;
  height?: number;
  highlightTop?: number;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function pct(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function SlopeChart({
  data,
  width = 980,
  height = 600,
  highlightTop = 12,
}: Props) {
  const points = data.points.filter(
    (p): p is SlopePoint & { baseline: number; current: number } =>
      p.baseline != null && p.current != null && (p.baseline > 0 || p.current > 0)
  );
  if (points.length === 0) {
    return (
      <div className="text-sm text-stone-500">No quarterly data available.</div>
    );
  }

  const padTop = 56;
  const padBottom = 40;
  const padLeftLabel = 240;
  const padRightLabel = 240;

  const xLeft = padLeftLabel;
  const xRight = width - padRightLabel;

  // Log scale handles the wide spread (Udall Foundation 1, DOJ 37k)
  const allValues = points.flatMap((p) => [
    Math.max(p.baseline, 1),
    Math.max(p.current, 1),
  ]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const y = scaleLog()
    .domain([yMin, yMax])
    .range([height - padBottom, padTop])
    .clamp(true);

  // Top movers by absolute delta get the spotlight; everyone else dims.
  const sortedByAbsDelta = [...points].sort(
    (a, b) => Math.abs(b.delta_abs ?? 0) - Math.abs(a.delta_abs ?? 0)
  );
  const highlightSet = new Set(
    sortedByAbsDelta.slice(0, highlightTop).map((p) => p.agency)
  );

  function lineColor(p: SlopePoint, isHighlighted: boolean): string {
    if (!isHighlighted) return "#d6d3d1"; // stone-300, dimmed background
    const dp = p.delta_pct;
    if (dp == null) return "#78716c";
    if (dp > 10) return "#dc2626"; // red-600
    if (dp < -10) return "#059669"; // emerald-600
    return "#57534e"; // stone-600
  }

  function strokeWidth(isHighlighted: boolean): number {
    return isHighlighted ? 1.75 : 0.75;
  }

  // Stagger nearby labels so they don't collide. Group highlighted points by
  // y-bucket; only label highlighted ones.
  type LabelEntry = {
    agency: string;
    side: "left" | "right";
    y: number;
    color: string;
    valueLabel: string;
    deltaLabel: string;
  };

  const leftLabels: LabelEntry[] = [];
  const rightLabels: LabelEntry[] = [];
  for (const p of points) {
    if (!highlightSet.has(p.agency)) continue;
    const color = lineColor(p, true);
    leftLabels.push({
      agency: p.agency,
      side: "left",
      y: y(Math.max(p.baseline, 1)),
      color,
      valueLabel: fmt(p.baseline),
      deltaLabel: "",
    });
    rightLabels.push({
      agency: p.agency,
      side: "right",
      y: y(Math.max(p.current, 1)),
      color,
      valueLabel: fmt(p.current),
      deltaLabel: pct(p.delta_pct),
    });
  }

  // Greedy de-overlap: walk top→bottom, push each label down if it crowds.
  function deOverlap(entries: LabelEntry[]): LabelEntry[] {
    const sorted = [...entries].sort((a, b) => a.y - b.y);
    const minGap = 14;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - sorted[i - 1].y < minGap) {
        sorted[i] = { ...sorted[i], y: sorted[i - 1].y + minGap };
      }
    }
    // Bound to chart area
    for (let i = 0; i < sorted.length; i++) {
      const upper = padTop;
      const lower = height - padBottom;
      if (sorted[i].y < upper) sorted[i] = { ...sorted[i], y: upper };
      if (sorted[i].y > lower) sorted[i] = { ...sorted[i], y: lower };
    }
    return sorted;
  }

  const leftAdjusted = deOverlap(leftLabels);
  const rightAdjusted = deOverlap(rightLabels);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Federal FOIA backlogs, ${data.baselineLabel} versus ${data.currentLabel}`}
    >
      {/* Column headers */}
      <text
        x={xLeft}
        y={padTop - 28}
        textAnchor="middle"
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill="#57534e"
      >
        {data.baselineLabel}
      </text>
      <text
        x={xLeft}
        y={padTop - 12}
        textAnchor="middle"
        fontSize={11}
        fill="#78716c"
      >
        last quarter before Jan 2025
      </text>
      <text
        x={xRight}
        y={padTop - 28}
        textAnchor="middle"
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill="#57534e"
      >
        {data.currentLabel}
      </text>
      <text
        x={xRight}
        y={padTop - 12}
        textAnchor="middle"
        fontSize={11}
        fill="#78716c"
      >
        most recent published
      </text>

      {/* Vertical axis lines */}
      <line
        x1={xLeft}
        x2={xLeft}
        y1={padTop - 4}
        y2={height - padBottom + 4}
        stroke="#e7e5e4"
        strokeWidth={1}
      />
      <line
        x1={xRight}
        x2={xRight}
        y1={padTop - 4}
        y2={height - padBottom + 4}
        stroke="#e7e5e4"
        strokeWidth={1}
      />

      {/* Faint dimmed lines first (behind), highlighted on top */}
      {points
        .filter((p) => !highlightSet.has(p.agency))
        .map((p) => {
          const yL = y(Math.max(p.baseline, 1));
          const yR = y(Math.max(p.current, 1));
          return (
            <g key={`dim-${p.agency}`}>
              <line
                x1={xLeft}
                y1={yL}
                x2={xRight}
                y2={yR}
                stroke={lineColor(p, false)}
                strokeWidth={strokeWidth(false)}
                opacity={0.45}
              >
                <title>{`${p.agency}: ${fmt(p.baseline)} → ${fmt(p.current)} (${pct(p.delta_pct)})`}</title>
              </line>
              <circle cx={xLeft} cy={yL} r={1.75} fill={lineColor(p, false)} opacity={0.6} />
              <circle cx={xRight} cy={yR} r={1.75} fill={lineColor(p, false)} opacity={0.6} />
            </g>
          );
        })}

      {points
        .filter((p) => highlightSet.has(p.agency))
        .map((p) => {
          const yL = y(Math.max(p.baseline, 1));
          const yR = y(Math.max(p.current, 1));
          return (
            <g key={`hi-${p.agency}`}>
              <line
                x1={xLeft}
                y1={yL}
                x2={xRight}
                y2={yR}
                stroke={lineColor(p, true)}
                strokeWidth={strokeWidth(true)}
              >
                <title>{`${p.agency}: ${fmt(p.baseline)} → ${fmt(p.current)} (${pct(p.delta_pct)})`}</title>
              </line>
              <circle cx={xLeft} cy={yL} r={3.25} fill={lineColor(p, true)} />
              <circle cx={xRight} cy={yR} r={3.25} fill={lineColor(p, true)} />
            </g>
          );
        })}

      {/* Left-side labels for highlighted */}
      {leftAdjusted.map((entry) => (
        <text
          key={`l-${entry.agency}`}
          x={xLeft - 12}
          y={entry.y + 3}
          textAnchor="end"
          fontSize={11}
          fill="#1c1917"
          fontFamily="DM Sans, system-ui, sans-serif"
        >
          {entry.agency.length > 32
            ? `${entry.agency.slice(0, 30)}…`
            : entry.agency}
          <tspan
            fill="#78716c"
            fontFamily="ui-monospace, monospace"
            fontSize={10}
          >
            {"  "}
            {entry.valueLabel}
          </tspan>
        </text>
      ))}

      {/* Right-side labels: value + delta */}
      {rightAdjusted.map((entry) => (
        <text
          key={`r-${entry.agency}`}
          x={xRight + 12}
          y={entry.y + 3}
          textAnchor="start"
          fontSize={11}
          fontFamily="ui-monospace, monospace"
          fill="#1c1917"
        >
          {entry.valueLabel}
          <tspan
            fill={entry.color}
            fontFamily="ui-monospace, monospace"
            fontSize={10}
          >
            {"  "}
            {entry.deltaLabel}
          </tspan>
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${width / 2 - 200}, ${height - 16})`}>
        <rect width={10} height={2} y={4} fill="#dc2626" />
        <text x={16} y={8} fontSize={10} fill="#57534e">
          backlog grew &gt;10%
        </text>
        <rect width={10} height={2} y={4} x={130} fill="#059669" />
        <text x={146} y={8} fontSize={10} fill="#57534e">
          backlog shrunk &gt;10%
        </text>
        <rect width={10} height={2} y={4} x={290} fill="#d6d3d1" />
        <text x={306} y={8} fontSize={10} fill="#57534e">
          smaller agencies (dimmed)
        </text>
      </g>
    </svg>
  );
}
