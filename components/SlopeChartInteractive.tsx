"use client";

import { useMemo, useState } from "react";
import { scaleLog } from "d3-scale";
import { renderSlopeChartSvg } from "@/lib/charts/slope-svg";
import type { SlopeAnnotation } from "@/lib/charts/slope-svg";
import type { SlopeChartData, SlopePoint } from "@/lib/queries";

type Props = {
  data: SlopeChartData;
  width?: number;
  height?: number;
  defaultTopN?: number;
  expandedTopN?: number;
  annotations?: SlopeAnnotation[];
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

export function SlopeChartInteractive({
  data,
  width = 980,
  height = 620,
  defaultTopN = 10,
  expandedTopN = 25,
  annotations = [],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<SlopePoint | null>(null);
  const [pointer, setPointer] = useState<
    { x: number; y: number; wrapperWidth: number } | null
  >(null);

  const topN = expanded ? expandedTopN : defaultTopN;

  const baseSvg = useMemo(
    () => renderSlopeChartSvg(data, { width, height, topN, annotations }),
    [data, width, height, topN, annotations]
  );

  // Re-derive the top-N points and the y-scale on the client so the
  // hover overlay can compute coordinates that match the static SVG.
  const { points, scale, geometry } = useMemo(() => {
    const valid = data.points.filter(
      (p): p is SlopePoint & { baseline: number; current: number } =>
        p.baseline != null &&
        p.current != null &&
        (p.baseline > 0 || p.current > 0)
    );
    const sorted = [...valid].sort(
      (a, b) => Math.abs(b.delta_abs ?? 0) - Math.abs(a.delta_abs ?? 0)
    );
    const top = sorted.slice(0, topN);

    const padTop = 56;
    const padBottom = 40;
    const padLeftLabel = 240;
    const padRightLabel = 240;
    const xLeft = padLeftLabel;
    const xRight = width - padRightLabel;

    const allValues = top.flatMap((p) => [
      Math.max(p.baseline, 1),
      Math.max(p.current, 1),
    ]);
    const yMin = allValues.length ? Math.min(...allValues) : 1;
    const yMax = allValues.length ? Math.max(...allValues) : 100;
    const y = scaleLog()
      .domain([yMin, yMax])
      .range([height - padBottom, padTop])
      .clamp(true);

    return {
      points: top,
      scale: y,
      geometry: { xLeft, xRight, padTop, padBottom },
    };
  }, [data, topN, width, height]);

  // Build per-agency hit zones: a fat invisible diagonal band to make
  // hovering easier than the 2px visible line.
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const wrapper = e.currentTarget.getBoundingClientRect();
    // Pointer for the tooltip lives in CSS pixels (DOM space).
    const cssX = e.clientX - wrapper.left;
    const cssY = e.clientY - wrapper.top;
    setPointer({ x: cssX, y: cssY, wrapperWidth: wrapper.width });

    // The SVG scales to fill the wrapper; convert cursor to authored
    // (viewBox) coordinates so the geometry maths stays consistent.
    const sx = wrapper.width > 0 ? width / wrapper.width : 1;
    const sy = wrapper.height > 0 ? height / wrapper.height : 1;
    const localX = cssX * sx;
    const localY = cssY * sy;

    // Find the agency whose diagonal passes closest to the cursor.
    const { xLeft, xRight } = geometry;
    if (localX < xLeft - 6 || localX > xRight + 6) {
      setHover(null);
      return;
    }
    const t = Math.max(0, Math.min(1, (localX - xLeft) / (xRight - xLeft)));
    let best: { agency: SlopePoint; distance: number } | null = null;
    for (const p of points) {
      const yL = scale(Math.max(p.baseline ?? 1, 1));
      const yR = scale(Math.max(p.current ?? 1, 1));
      const yAt = yL + t * (yR - yL);
      const distance = Math.abs(localY - yAt);
      if (best === null || distance < best.distance) {
        best = { agency: p, distance };
      }
    }
    // Hit threshold scales with the chart's vertical zoom so it stays
    // generous on small screens.
    if (best && best.distance < 24 * sy) {
      setHover(best.agency);
    } else {
      setHover(null);
    }
  }

  function handleMouseLeave() {
    setHover(null);
    setPointer(null);
  }

  // Build a polyline through the hovered agency's quarterly series so the
  // line "breathes" into showing every quarter, not just two endpoints.
  const overlayPath = useMemo(() => {
    if (!hover) return null;
    const { xLeft, xRight } = geometry;
    const series = hover.series.filter(
      (s): s is typeof s & { backlog: number } => s.backlog != null
    );
    if (series.length < 2) return null;
    const xMin = series[0].x;
    const xMax = series[series.length - 1].x;
    const xRange = xMax - xMin || 1;
    const points = series.map((s) => {
      const px = xLeft + ((s.x - xMin) / xRange) * (xRange === 0 ? 0 : xRight - xLeft);
      const py = scale(Math.max(s.backlog, 1));
      return { px, py, label: s.label, value: s.backlog };
    });
    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.px} ${p.py}`)
      .join(" ");
    return { d, points };
  }, [hover, geometry, scale]);

  return (
    <div className="relative">
      <div
        className="relative w-full fluid-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div dangerouslySetInnerHTML={{ __html: baseSvg }} />
        {hover && overlayPath && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 pointer-events-none w-full h-full"
          >
            {/* Trajectory polyline through every reported quarter */}
            <path
              d={overlayPath.d}
              stroke="#dc2626"
              strokeWidth={2.25}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {overlayPath.points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.px}
                  cy={p.py}
                  r={3.5}
                  fill="#dc2626"
                  stroke="#faf7ee"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>
        )}
      </div>

      {hover && pointer && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 bg-stone-900 text-white rounded shadow-lg px-3 py-2.5 min-w-[240px] max-w-[calc(100vw-2rem)]"
          style={{
            left: Math.max(
              8,
              Math.min(pointer.x + 16, pointer.wrapperWidth - 260)
            ),
            top: Math.max(pointer.y - 12, 8),
          }}
        >
          <div className="font-display text-base leading-snug">
            {hover.agency}
          </div>
          <table className="mt-2 w-full text-xs font-display">
            <tbody>
              {hover.series.map((s) => (
                <tr key={`${s.fy}-${s.q}`}>
                  <td className="text-stone-400 italic pr-3 py-0.5">
                    {s.label}
                  </td>
                  <td className="text-stone-300 italic pr-3">
                    FY{s.fy} Q{s.q}
                  </td>
                  <td className="text-right tabular-nums text-white">
                    {fmt(s.backlog)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hover.delta_pct != null && (
            <div className="mt-2 pt-2 border-t border-stone-700 text-xs flex items-baseline justify-between">
              <span className="italic text-stone-400">change over period</span>
              <span
                className={`tabular-nums font-medium ${
                  hover.delta_pct > 10
                    ? "text-red-400"
                    : hover.delta_pct < -10
                    ? "text-emerald-400"
                    : "text-stone-200"
                }`}
              >
                {pct(hover.delta_pct)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="font-display italic text-stone-600 text-xs">
          Showing top {topN} of {data.points.length} reporting agencies, by
          absolute change. Hover any line for the full per-quarter
          trajectory.
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="font-display italic text-stone-700 text-xs underline underline-offset-2 hover:text-stone-900 whitespace-nowrap"
        >
          {expanded ? "Show top 10" : `Show all ${expandedTopN}`}
        </button>
      </div>
    </div>
  );
}
