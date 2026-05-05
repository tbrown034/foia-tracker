import { scaleLinear } from "d3-scale";
import { line, curveStepAfter } from "d3-shape";
import type { FilingTimeline, FilingPoint } from "@/lib/queries";

type Props = {
  data: FilingTimeline;
};

const Q_INAUG_OFFSET = 20 / 90;
const BIDEN_INAUG_X = 2021 * 4 + 1 + Q_INAUG_OFFSET;
const TRUMP_INAUG_X = 2025 * 4 + 1 + Q_INAUG_OFFSET;

const W = 1000;
const H = 380;
const PAD_LEFT = 64;
const PAD_RIGHT = 90;
const PAD_TOP = 50;
const PAD_BOTTOM = 60;

const COLOR_LINE = "#44403c";
const COLOR_DOT = "#7f1d1d";
const COLOR_GRID = "#e7e5e4";
const COLOR_AXIS = "#78716c";

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export function AgenciesFilingChart({ data }: Props) {
  const { points, total_dropouts } = data;
  if (points.length < 2) {
    return (
      <div className="border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Filer-count data unavailable.
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.agency_count);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const yPad = Math.max(2, (yMax - yMin) * 0.18);
  const x = scaleLinear()
    .domain([xMin, xMax])
    .range([PAD_LEFT, W - PAD_RIGHT]);
  const y = scaleLinear()
    .domain([yMin - yPad, yMax + yPad])
    .range([H - PAD_BOTTOM, PAD_TOP]);

  const linePath =
    line<FilingPoint>()
      .x((d) => x(d.x))
      .y((d) => y(d.agency_count))
      .curve(curveStepAfter)(points) ?? "";

  const xTicks = points.filter((p) => p.q === 1);

  // Build y ticks at sensible intervals
  const yRange = yMax - yMin;
  const yTickStep = yRange > 30 ? 10 : 5;
  const yTicks: number[] = [];
  for (
    let v = Math.ceil((yMin - yPad) / yTickStep) * yTickStep;
    v <= yMax + yPad;
    v += yTickStep
  ) {
    yTicks.push(v);
  }

  const last = points[points.length - 1];
  const peak = points.reduce((acc, p) =>
    p.agency_count > acc.agency_count ? p : acc
  );

  // Notable-dropout annotations: pick quarters where a high-volume agency left.
  // Build them as right-side leader-line callouts.
  const notable = points
    .filter((p) =>
      p.dropouts.some((d) => (d.typical_received_fy2024 ?? 0) >= 100)
    )
    .map((p) => {
      const big = p.dropouts.filter(
        (d) => (d.typical_received_fy2024 ?? 0) >= 100
      );
      return { x: p.x, fy: p.fy, q: p.q, dropouts: big };
    });

  return (
    <div className="figure-frame">
      <div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block bg-white w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Number of federal agencies filing quarterly FOIA reports per quarter, FY2021 Q1 through ${last.label}.`}
        >
          {/* Biden era band */}
          {BIDEN_INAUG_X < TRUMP_INAUG_X && BIDEN_INAUG_X <= xMax && (
            <rect
              x={x(Math.max(BIDEN_INAUG_X, xMin))}
              y={PAD_TOP}
              width={x(Math.min(TRUMP_INAUG_X, xMax)) - x(Math.max(BIDEN_INAUG_X, xMin))}
              height={H - PAD_TOP - PAD_BOTTOM}
              fill="#dbeafe"
              opacity={0.35}
            />
          )}
          {/* Trump era band */}
          {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
            <rect
              x={x(TRUMP_INAUG_X)}
              y={PAD_TOP}
              width={x(xMax) - x(TRUMP_INAUG_X)}
              height={H - PAD_TOP - PAD_BOTTOM}
              fill="#fee2e2"
              opacity={0.4}
            />
          )}

          {/* Y-axis grid */}
          {yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line
                x1={PAD_LEFT}
                x2={W - PAD_RIGHT}
                y1={y(t)}
                y2={y(t)}
                stroke={COLOR_GRID}
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 10}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fill={COLOR_AXIS}
                fontFamily="ui-monospace, monospace"
              >
                {t}
              </text>
            </g>
          ))}

          {/* Biden inauguration vertical */}
          {BIDEN_INAUG_X >= xMin && BIDEN_INAUG_X <= xMax && (
            <>
              <line
                x1={x(BIDEN_INAUG_X)}
                x2={x(BIDEN_INAUG_X)}
                y1={PAD_TOP}
                y2={H - PAD_BOTTOM}
                stroke="#1e3a8a"
                strokeWidth={1.25}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <text
                x={x(BIDEN_INAUG_X)}
                y={PAD_TOP - 8}
                textAnchor="start"
                fontSize={11}
                fill="#1e3a8a"
                fontFamily="ui-monospace, monospace"
                fontStyle="italic"
              >
                Biden inaugurated
              </text>
            </>
          )}
          {/* Trump inauguration vertical */}
          {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
            <>
              <line
                x1={x(TRUMP_INAUG_X)}
                x2={x(TRUMP_INAUG_X)}
                y1={PAD_TOP}
                y2={H - PAD_BOTTOM}
                stroke="#991b1b"
                strokeWidth={1.25}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <text
                x={x(TRUMP_INAUG_X)}
                y={PAD_TOP - 8}
                textAnchor="middle"
                fontSize={11}
                fill="#991b1b"
                fontFamily="ui-monospace, monospace"
                fontStyle="italic"
              >
                Trump inaugurated
              </text>
            </>
          )}

          {/* Step line */}
          <path
            d={linePath}
            stroke={COLOR_LINE}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
          />

          {/* Per-quarter dots, with hover-title showing dropouts */}
          {points.map((p) => {
            const dropoutNames = p.dropouts
              .map((d) => {
                const vol = d.typical_received_fy2024
                  ? ` (~${d.typical_received_fy2024.toLocaleString()}/q)`
                  : "";
                return `${d.agency}${vol}`;
              })
              .join(", ");
            const titleText =
              p.dropouts.length > 0
                ? `${p.label}: ${p.agency_count} agencies filed. Last quarter for: ${dropoutNames}`
                : `${p.label}: ${p.agency_count} agencies filed`;
            const hasNotableDropout = p.dropouts.some(
              (d) => (d.typical_received_fy2024 ?? 0) >= 1000
            );
            return (
              <g key={`pt-${p.x}`}>
                <circle
                  cx={x(p.x)}
                  cy={y(p.agency_count)}
                  r={3.5}
                  fill={hasNotableDropout ? COLOR_DOT : COLOR_LINE}
                >
                  <title>{titleText}</title>
                </circle>
              </g>
            );
          })}

          {/* Peak annotation */}
          <text
            x={x(peak.x)}
            y={y(peak.agency_count) - 10}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={COLOR_LINE}
            fontFamily="ui-monospace, monospace"
          >
            peak: {peak.agency_count}
          </text>

          {/* Latest annotation */}
          <text
            x={x(last.x) + 6}
            y={y(last.agency_count)}
            dominantBaseline="middle"
            fontSize={13}
            fontWeight={600}
            fill={COLOR_DOT}
            fontFamily="ui-monospace, monospace"
          >
            {last.agency_count}
          </text>
          <text
            x={x(last.x) + 6}
            y={y(last.agency_count) + 13}
            dominantBaseline="middle"
            fontSize={10}
            fill={COLOR_DOT}
          >
            latest
          </text>

          {/* X-axis */}
          <line
            x1={PAD_LEFT}
            x2={W - PAD_RIGHT}
            y1={H - PAD_BOTTOM}
            y2={H - PAD_BOTTOM}
            stroke={COLOR_AXIS}
            strokeWidth={1}
          />
          {xTicks.map((p) => (
            <g key={`x-${p.x}`}>
              <line
                x1={x(p.x)}
                x2={x(p.x)}
                y1={H - PAD_BOTTOM}
                y2={H - PAD_BOTTOM + 5}
                stroke={COLOR_AXIS}
                strokeWidth={1}
              />
              <text
                x={x(p.x)}
                y={H - PAD_BOTTOM + 20}
                textAnchor="middle"
                fontSize={12}
                fill={COLOR_AXIS}
                fontFamily="ui-monospace, monospace"
              >
                FY{p.fy}
              </text>
              <text
                x={x(p.x)}
                y={H - PAD_BOTTOM + 36}
                textAnchor="middle"
                fontSize={10}
                fill="#a8a29e"
                fontFamily="ui-monospace, monospace"
              >
                starts Oct {String(p.fy - 1).slice(-2)}
              </text>
            </g>
          ))}

          {/* Y-axis title */}
          <text
            x={PAD_LEFT - 48}
            y={PAD_TOP - 18}
            fontSize={11}
            fill={COLOR_LINE}
            fontFamily="ui-monospace, monospace"
          >
            Agencies filing per quarter
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 px-4 text-xs font-display italic text-stone-700">
        <span>
          Peak: <strong className="not-italic">{fmt(peak.agency_count)}</strong>{" "}
          agencies in {peak.label.split(" (")[0]}
        </span>
        <span>
          Latest:{" "}
          <strong className="not-italic">{fmt(last.agency_count)}</strong> in{" "}
          {last.label.split(" (")[0]}
        </span>
        <span className="text-stone-500 not-italic">
          Net loss of {total_dropouts} agencies from peak.
        </span>
      </div>

      {/* Plain-text dropout list — readable on any viewport */}
      {notable.length > 0 && (
        <div className="mt-4 px-4 pb-4">
          <div className="text-xs font-display [font-variant-caps:small-caps] tracking-wider text-stone-900 mb-2">
            Stopped filing
          </div>
          <ul className="text-sm text-stone-700 space-y-1.5">
            {notable.map((n) => {
              const calYear = n.q === 1 ? n.fy - 1 : n.fy;
              const monthShort = (
                { 1: "Dec", 2: "Mar", 3: "Jun", 4: "Sep" } as Record<number, string>
              )[n.q];
              return (
                <li key={`drop-${n.x}`} className="flex flex-wrap gap-x-2">
                  <span className="text-stone-500 font-mono text-xs whitespace-nowrap">
                    {monthShort} {calYear} →
                  </span>
                  <span>
                    {n.dropouts.map((d, i) => (
                      <span key={d.agency}>
                        {i > 0 && ", "}
                        {d.agency}
                        {d.typical_received_fy2024
                          ? ` (~${d.typical_received_fy2024.toLocaleString()}/q)`
                          : ""}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
