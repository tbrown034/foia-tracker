import { scaleLinear } from "d3-scale";
import type { ExemptionRow } from "@/lib/queries";

type Props = {
  data: ExemptionRow[];
  width?: number;
  height?: number;
};

export function ExemptionBars({ data, width = 600, height = 220 }: Props) {
  const valid = data.filter((d): d is { exemption: string; invocations: number } => d.invocations != null);
  if (valid.length === 0) {
    return (
      <div className="text-sm text-stone-500">
        No exemption data for this period.
      </div>
    );
  }
  const max = Math.max(...valid.map((d) => d.invocations));
  const padX = 40;
  const padY = 24;
  const barGap = 8;
  const barWidth =
    (width - padX * 2 - barGap * (valid.length - 1)) / valid.length;
  const y = scaleLinear()
    .domain([0, max])
    .range([height - padY, padY]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {valid.map((d, i) => {
        const xPos = padX + i * (barWidth + barGap);
        const barHeight = height - padY - y(d.invocations);
        const labelShort = d.exemption.replace("Ex. ", "");
        return (
          <g key={d.exemption}>
            <rect
              x={xPos}
              y={y(d.invocations)}
              width={barWidth}
              height={barHeight}
              fill="#1c1917"
              opacity={d.exemption.startsWith("Ex. 5") ? 1 : 0.6}
            />
            <text
              x={xPos + barWidth / 2}
              y={height - padY + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#57534e"
              fontFamily="ui-monospace"
            >
              {labelShort}
            </text>
            <text
              x={xPos + barWidth / 2}
              y={y(d.invocations) - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#1c1917"
              fontFamily="ui-monospace"
            >
              {d.invocations.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
