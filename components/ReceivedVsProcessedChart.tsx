import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import type { ReceivedProcessedTimeline } from "@/lib/queries";

type Props = {
  data: ReceivedProcessedTimeline;
};

// Inaugurations always fall on Jan 20 — 20 days into Q2 of the FY.
const Q_INAUG_OFFSET = 20 / 90;
const BIDEN_INAUG_X = 2021 * 4 + 1 + Q_INAUG_OFFSET;
const TRUMP_INAUG_X = 2025 * 4 + 1 + Q_INAUG_OFFSET;

// SVG geometry. The bar panel — the gap, which is the story — is the
// taller of the two. The line panel sits on top as scale-setting context.
const W = 1000;
const H_LINE = 220;
const H_BAR = 240;
const H_GAP_BETWEEN = 14;
const PAD_LEFT = 78;
const PAD_RIGHT = 148;
const PAD_TOP = 78;
const PAD_BOTTOM = 60;
const H = PAD_TOP + H_LINE + H_GAP_BETWEEN + H_BAR + PAD_BOTTOM;

// Top panel is muted context; the bar panel carries the saturated colors
// because the gap is the story. (Knaflic: spot color on the insight.)
const COLOR_RECEIVED = "#7f1d1d"; // burgundy
const COLOR_PROCESSED = "#44403c"; // stone-700, deliberately neutral
const COLOR_BAR_BAD = "#b91c1c"; // red-700, the lede
const COLOR_BAR_GOOD = "#047857"; // emerald-700
const COLOR_GRID = "#e7e5e4"; // stone-200
const COLOR_AXIS = "#78716c"; // stone-500
const COLOR_INK = "#44403c"; // stone-700

function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = n / 1000;
    return `${k >= 0 ? "" : "-"}${Math.abs(k).toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
  return n.toLocaleString();
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  if (n < 0) return `−${Math.abs(n).toLocaleString()}`;
  return "0";
}

function fmtSignedK(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
  return `${sign}${abs.toLocaleString()}`;
}

export function ReceivedVsProcessedChart({ data }: Props) {
  const { points, agencies } = data;
  if (points.length < 2) {
    return (
      <div className="border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Quarterly throughput data unavailable.
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const lineYs = points.flatMap((p) => [p.received, p.processed]);
  const netVals = points.map((p) => p.net);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const lineYMin = Math.min(...lineYs);
  const lineYMax = Math.max(...lineYs);
  const netMax = Math.max(...netVals);
  const netMin = Math.min(...netVals);
  const netAbsMax = Math.max(Math.abs(netMax), Math.abs(netMin));

  // Truncated y on the line panel so the divergence is visually
  // proportionate (received and processed both sit in a narrow band).
  // The figcaption notes the truncation in plain English.
  const linePadding = (lineYMax - lineYMin) * 0.18;
  const lineYDomainMin = Math.max(0, lineYMin - linePadding);
  const lineYDomainMax = lineYMax + linePadding;

  const lineTop = PAD_TOP;
  const lineBottom = PAD_TOP + H_LINE;
  const barTop = lineBottom + H_GAP_BETWEEN;
  const barBottom = barTop + H_BAR;

  const x = scaleLinear()
    .domain([xMin, xMax])
    .range([PAD_LEFT, W - PAD_RIGHT]);
  const yLine = scaleLinear()
    .domain([lineYDomainMin, lineYDomainMax])
    .range([lineBottom, lineTop]);

  // Asymmetric bar y-domain — the worst quarter is +24k and we want it to
  // dominate the panel, while still giving negatives meaningful room.
  const yBarMax = netMax * 1.18;
  const yBarMin = Math.min(netMin * 1.4, -netAbsMax * 0.5);
  const yBar = scaleLinear()
    .domain([yBarMin, yBarMax])
    .range([barBottom, barTop]);
  const barZero = yBar(0);

  // Y line ticks every 20k.
  const lineTickStep = 20000;
  const lineTicks: number[] = [];
  for (
    let v = Math.ceil(lineYDomainMin / lineTickStep) * lineTickStep;
    v <= lineYDomainMax;
    v += lineTickStep
  ) {
    lineTicks.push(v);
  }

  // Y bar ticks at 0, ±10k, ±20k where they fit.
  const barTickCandidates = [-20000, -10000, 0, 10000, 20000];
  const barTicks = barTickCandidates.filter(
    (t) => t >= yBarMin && t <= yBarMax
  );

  const xTicks = points.filter((p) => p.q === 1);

  const receivedPath =
    line<typeof points[number]>()
      .x((d) => x(d.x))
      .y((d) => yLine(d.received))
      .curve(curveMonotoneX)(points) ?? "";
  const processedPath =
    line<typeof points[number]>()
      .x((d) => x(d.x))
      .y((d) => yLine(d.processed))
      .curve(curveMonotoneX)(points) ?? "";

  const barWidth = ((W - PAD_RIGHT - PAD_LEFT) / (xMax - xMin)) * 0.62;

  const last = points[points.length - 1];
  const worst = [...points].sort((a, b) => b.net - a.net)[0];
  const best = [...points].sort((a, b) => a.net - b.net)[0];

  // Endpoint labels: drop them below/above when the lines converge.
  const labelGap = Math.abs(yLine(last.received) - yLine(last.processed));
  const collide = labelGap < 32;
  const receivedLabelY = collide
    ? yLine(last.received) - 16
    : yLine(last.received);
  const processedLabelY = collide
    ? yLine(last.processed) + 16
    : yLine(last.processed);

  return (
    <div className="figure-frame">
      {/* Horizontal-scroll guard for narrow viewports — at <640px the
          chart needs ~640px to keep axis labels readable, so we scroll
          rather than shrink labels into illegibility. */}
      <div className="overflow-x-auto -mx-1 px-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block bg-white"
        style={{ width: "100%", minWidth: 720, height: "auto" }}
        role="img"
        aria-label={`Federal FOIA quarterly throughput across ${points.length} quarters. Top panel: requests received vs. processed per quarter. Bottom panel: net gap. The largest positive gap is ${worst.label} at ${fmtSigned(worst.net)} requests. The most recent quarter is ${last.label} at ${fmtSigned(last.net)} requests.`}
      >
        {/* ============ Admin era bands, drawn behind everything ============ */}
        {/* Biden era: from his inauguration to Trump's. */}
        {BIDEN_INAUG_X < TRUMP_INAUG_X && BIDEN_INAUG_X <= xMax && (
          <rect
            x={x(Math.max(BIDEN_INAUG_X, xMin))}
            y={lineTop}
            width={x(Math.min(TRUMP_INAUG_X, xMax)) - x(Math.max(BIDEN_INAUG_X, xMin))}
            height={barBottom - lineTop}
            fill="#dbeafe"
            opacity={0.35}
          />
        )}
        {/* Trump era: from his inauguration to end of data. */}
        {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
          <rect
            x={x(TRUMP_INAUG_X)}
            y={lineTop}
            width={x(xMax) - x(TRUMP_INAUG_X)}
            height={barBottom - lineTop}
            fill="#fee2e2"
            opacity={0.4}
          />
        )}

        {/* ============ Top panel: line chart (muted context) ============ */}

        {/* Y-axis grid */}
        {lineTicks.map((t) => (
          <g key={`yl-${t}`}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={yLine(t)}
              y2={yLine(t)}
              stroke={COLOR_GRID}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 10}
              y={yLine(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={16}
              fill={COLOR_AXIS}
              fontFamily="ui-monospace, monospace"
            >
              {fmtK(t)}
            </text>
          </g>
        ))}

        {/* Biden inauguration marker */}
        {BIDEN_INAUG_X >= xMin && BIDEN_INAUG_X <= xMax && (
          <>
            <line
              x1={x(BIDEN_INAUG_X)}
              x2={x(BIDEN_INAUG_X)}
              y1={lineTop}
              y2={barBottom}
              stroke="#1e3a8a"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={x(BIDEN_INAUG_X)}
              y={lineTop - 24}
              textAnchor="start"
              fontSize={16}
              fill="#1e3a8a"
              fontFamily="ui-monospace, monospace"
              fontStyle="italic"
            >
              Biden inaugurated
            </text>
            <text
              x={x(BIDEN_INAUG_X)}
              y={lineTop - 10}
              textAnchor="start"
              fontSize={14}
              fill="#1e3a8a"
              fontFamily="ui-monospace, monospace"
            >
              Jan 20, 2021
            </text>
          </>
        )}

        {/* Trump inauguration marker */}
        {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
          <>
            <line
              x1={x(TRUMP_INAUG_X)}
              x2={x(TRUMP_INAUG_X)}
              y1={lineTop}
              y2={barBottom}
              stroke="#991b1b"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={x(TRUMP_INAUG_X)}
              y={lineTop - 24}
              textAnchor="middle"
              fontSize={16}
              fill="#7f1d1d"
              fontFamily="ui-monospace, monospace"
              fontStyle="italic"
            >
              Trump inaugurated
            </text>
            <text
              x={x(TRUMP_INAUG_X)}
              y={lineTop - 10}
              textAnchor="middle"
              fontSize={14}
              fill="#7f1d1d"
              fontFamily="ui-monospace, monospace"
            >
              Jan 20, 2025
            </text>
          </>
        )}

        {/* Trend lines — processed first so received sits on top */}
        <path
          d={processedPath}
          stroke={COLOR_PROCESSED}
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
        />
        <path
          d={receivedPath}
          stroke={COLOR_RECEIVED}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Endpoint dots + labels */}
        <circle
          cx={x(last.x)}
          cy={yLine(last.received)}
          r={4}
          fill={COLOR_RECEIVED}
        />
        <circle
          cx={x(last.x)}
          cy={yLine(last.processed)}
          r={4}
          fill={COLOR_PROCESSED}
        />

        {collide && (
          <>
            <line
              x1={x(last.x) + 4}
              x2={x(last.x) + 14}
              y1={yLine(last.received)}
              y2={receivedLabelY}
              stroke={COLOR_RECEIVED}
              strokeWidth={0.75}
            />
            <line
              x1={x(last.x) + 4}
              x2={x(last.x) + 14}
              y1={yLine(last.processed)}
              y2={processedLabelY}
              stroke={COLOR_PROCESSED}
              strokeWidth={0.75}
            />
          </>
        )}

        <text
          x={x(last.x) + 16}
          y={receivedLabelY - 1}
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={600}
          fill={COLOR_RECEIVED}
          fontFamily="ui-monospace, monospace"
        >
          {last.received.toLocaleString()}
        </text>
        <text
          x={x(last.x) + 16}
          y={receivedLabelY + 14}
          dominantBaseline="middle"
          fontSize={14}
          fill={COLOR_RECEIVED}
          fontFamily="ui-monospace, monospace"
        >
          received
        </text>
        <text
          x={x(last.x) + 16}
          y={processedLabelY - 1}
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={600}
          fill={COLOR_PROCESSED}
          fontFamily="ui-monospace, monospace"
        >
          {last.processed.toLocaleString()}
        </text>
        <text
          x={x(last.x) + 16}
          y={processedLabelY + 14}
          dominantBaseline="middle"
          fontSize={14}
          fill={COLOR_PROCESSED}
          fontFamily="ui-monospace, monospace"
        >
          processed
        </text>

        {/* Top-panel y-axis label */}
        <text
          x={PAD_LEFT - 10}
          y={lineTop - 42}
          textAnchor="start"
          fontSize={16}
          fill={COLOR_INK}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          Requests per quarter
        </text>
        <text
          x={PAD_LEFT - 10}
          y={lineTop - 24}
          textAnchor="start"
          fontSize={14}
          fill={COLOR_AXIS}
          fontFamily="ui-monospace, monospace"
        >
          y-axis truncated to ~{fmtK(lineYDomainMin)}–{fmtK(lineYDomainMax)}
        </text>

        {/* ============ Bottom panel: net-gap bars (the lede) ============ */}

        {/* Y-grid for bar panel */}
        {barTicks.map((t) => (
          <g key={`yb-${t}`}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={yBar(t)}
              y2={yBar(t)}
              stroke={t === 0 ? COLOR_INK : COLOR_GRID}
              strokeWidth={t === 0 ? 1.25 : 1}
              strokeDasharray={t === 0 ? undefined : "2 3"}
              opacity={t === 0 ? 0.7 : 1}
            />
            <text
              x={PAD_LEFT - 10}
              y={yBar(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={16}
              fill={t === 0 ? COLOR_INK : COLOR_AXIS}
              fontFamily="ui-monospace, monospace"
              fontWeight={t === 0 ? 600 : 400}
            >
              {t === 0 ? "0" : fmtSignedK(t)}
            </text>
          </g>
        ))}

        {/* Zone labels — single line each, sat tightly against zero */}
        <text
          x={W - PAD_RIGHT + 10}
          y={yBar(0) - 10}
          fontSize={14}
          fill={COLOR_BAR_BAD}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          falling behind
        </text>
        <text
          x={W - PAD_RIGHT + 10}
          y={yBar(0) + 20}
          fontSize={14}
          fill={COLOR_BAR_GOOD}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          catching up
        </text>

        {/* Bars */}
        {points.map((p) => {
          const yTop = p.net >= 0 ? yBar(p.net) : barZero;
          const height = Math.abs(yBar(p.net) - barZero);
          const isWorst = p.x === worst.x;
          const isBest = p.x === best.x;
          const isLast = p.x === last.x;
          const baseColor = p.net >= 0 ? COLOR_BAR_BAD : COLOR_BAR_GOOD;
          // Spotlight: full opacity on worst/best/last; mute the rest.
          const opacity = isWorst || isBest || isLast ? 0.95 : 0.6;
          return (
            <rect
              key={`bar-${p.x}`}
              x={x(p.x) - barWidth / 2}
              y={yTop}
              width={barWidth}
              height={Math.max(height, 0.5)}
              fill={baseColor}
              opacity={opacity}
            >
              <title>
                {p.label}: {fmtSigned(p.net)} (received{" "}
                {p.received.toLocaleString()}, processed{" "}
                {p.processed.toLocaleString()})
              </title>
            </rect>
          );
        })}

        {/* Worst-quarter callout — the lede annotation */}
        {worst.net > 0 && (
          <g>
            <text
              x={x(worst.x)}
              y={yBar(worst.net) - 22}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill={COLOR_BAR_BAD}
              fontFamily="ui-monospace, monospace"
            >
              {fmtSigned(worst.net)}
            </text>
            <text
              x={x(worst.x)}
              y={yBar(worst.net) - 8}
              textAnchor="middle"
              fontSize={14}
              fill={COLOR_BAR_BAD}
              fontFamily="ui-monospace, monospace"
              fontStyle="italic"
            >
              worst quarter on record
            </text>
          </g>
        )}

        {/* Most-recent quarter callout — the recovery */}
        {last.x !== worst.x && (
          <g>
            <line
              x1={x(last.x)}
              x2={x(last.x) + 14}
              y1={yBar(last.net) - (last.net >= 0 ? 4 : -4)}
              y2={yBar(last.net) - (last.net >= 0 ? 30 : -30)}
              stroke={last.net >= 0 ? COLOR_BAR_BAD : COLOR_BAR_GOOD}
              strokeWidth={0.75}
            />
            <text
              x={x(last.x) + 16}
              y={yBar(last.net) - (last.net >= 0 ? 36 : -36)}
              textAnchor="start"
              fontSize={16}
              fontWeight={700}
              fill={last.net >= 0 ? COLOR_BAR_BAD : COLOR_BAR_GOOD}
              fontFamily="ui-monospace, monospace"
            >
              {fmtSigned(last.net)}
            </text>
            <text
              x={x(last.x) + 16}
              y={yBar(last.net) - (last.net >= 0 ? 22 : -22)}
              textAnchor="start"
              fontSize={14}
              fill={last.net >= 0 ? COLOR_BAR_BAD : COLOR_BAR_GOOD}
              fontFamily="ui-monospace, monospace"
              fontStyle="italic"
            >
              latest quarter
            </text>
          </g>
        )}

        {/* Best-quarter callout — only if it's a real outlier */}
        {best.net < -3000 && best.x !== last.x && (
          <text
            x={x(best.x)}
            y={yBar(best.net) + 18}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            fill={COLOR_BAR_GOOD}
            fontFamily="ui-monospace, monospace"
          >
            {fmtSigned(best.net)}
          </text>
        )}

        {/* Bar-panel y-axis label — sits between the two panels */}
        <text
          x={PAD_LEFT - 10}
          y={barTop - 4}
          textAnchor="start"
          fontSize={16}
          fill={COLOR_INK}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          Net gap each quarter (received − processed)
        </text>

        {/* ============ Shared X-axis ============ */}

        <line
          x1={PAD_LEFT}
          x2={W - PAD_RIGHT}
          y1={barBottom}
          y2={barBottom}
          stroke={COLOR_AXIS}
          strokeWidth={1}
        />

        {xTicks.map((p) => (
          <g key={`x-${p.x}`}>
            <line
              x1={x(p.x)}
              x2={x(p.x)}
              y1={barBottom}
              y2={barBottom + 6}
              stroke={COLOR_AXIS}
              strokeWidth={1}
            />
            <text
              x={x(p.x)}
              y={barBottom + 24}
              textAnchor="middle"
              fontSize={14}
              fill={COLOR_INK}
              fontFamily="ui-monospace, monospace"
            >
              FY{p.fy}
            </text>
          </g>
        ))}
      </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-4 pb-3 text-xs font-display italic text-stone-700">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-4 h-0.5"
            style={{ backgroundColor: COLOR_RECEIVED }}
          />
          Requests received
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-4 h-0.5"
            style={{ backgroundColor: COLOR_PROCESSED }}
          />
          Requests processed
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-3 h-3"
            style={{ backgroundColor: COLOR_BAR_BAD, opacity: 0.95 }}
          />
          Net gap that quarter
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-4 h-2.5"
            style={{ backgroundColor: "#dbeafe", opacity: 0.7 }}
          />
          Biden era
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-4 h-2.5"
            style={{ backgroundColor: "#fee2e2", opacity: 0.7 }}
          />
          Trump era
        </span>
        <span className="text-stone-500 not-italic">
          n = {agencies.length} agencies, filed every quarter from FY2021
          Q1 through {last.label.split(" (")[0]}.
        </span>
      </div>
    </div>
  );
}
