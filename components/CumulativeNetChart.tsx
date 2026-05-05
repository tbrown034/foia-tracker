import { scaleLinear } from "d3-scale";
import { line, area, curveMonotoneX } from "d3-shape";
import type { ReceivedProcessedTimeline } from "@/lib/queries";

type Props = {
  data: ReceivedProcessedTimeline;
};

const Q_INAUG_OFFSET = 20 / 90;
const BIDEN_INAUG_X = 2021 * 4 + 1 + Q_INAUG_OFFSET;
const TRUMP_INAUG_X = 2025 * 4 + 1 + Q_INAUG_OFFSET;

const W = 1000;
const H = 460;
const PAD_LEFT = 80;
const PAD_RIGHT = 160;
const PAD_TOP = 80;
const PAD_BOTTOM = 64;

const COLOR_LINE = "#7f1d1d";
const COLOR_AREA = "#fecaca";
const COLOR_GRID = "#e7e5e4";
const COLOR_AXIS = "#78716c";
const COLOR_BIDEN = "#1e3a8a";
const COLOR_TRUMP = "#991b1b";
const COLOR_BAND_BIDEN = "#dbeafe";
const COLOR_BAND_TRUMP = "#fee2e2";

function fmtK(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 100 ? 0 : 1)}k`;
  }
  return n.toLocaleString();
}

export function CumulativeNetChart({ data }: Props) {
  const { points, agencies } = data;
  if (points.length < 2) {
    return (
      <div className="border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Backlog data unavailable.
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.total_backlog);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys);
  const yMin = 0;

  const x = scaleLinear()
    .domain([xMin, xMax])
    .range([PAD_LEFT, W - PAD_RIGHT]);
  const y = scaleLinear()
    .domain([yMin, yMax * 1.1])
    .range([H - PAD_BOTTOM, PAD_TOP]);

  const linePath =
    line<typeof points[number]>()
      .x((d) => x(d.x))
      .y((d) => y(d.total_backlog))
      .curve(curveMonotoneX)(points) ?? "";

  const areaPath =
    area<typeof points[number]>()
      .x((d) => x(d.x))
      .y0(H - PAD_BOTTOM)
      .y1((d) => y(d.total_backlog))
      .curve(curveMonotoneX)(points) ?? "";

  // Y ticks at every 25k
  const tickStep = 25000;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax * 1.1; v += tickStep) {
    yTicks.push(v);
  }

  const xTicks = points.filter((p) => p.q === 1);
  const last = points[points.length - 1];
  const first = points[0];
  const peak = points.reduce((acc, p) =>
    p.total_backlog > acc.total_backlog ? p : acc
  );
  const trough = points.reduce((acc, p) =>
    p.total_backlog < acc.total_backlog ? p : acc
  );

  return (
    <div className="figure-frame">
      <div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block bg-white w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Combined FOIA backlog across ten federal agencies, ${first.label} through ${last.label}. Final value ${last.total_backlog.toLocaleString()}.`}
        >
          {/* Admin era bands */}
          {BIDEN_INAUG_X < TRUMP_INAUG_X && BIDEN_INAUG_X <= xMax && (
            <rect
              x={x(Math.max(BIDEN_INAUG_X, xMin))}
              y={PAD_TOP}
              width={x(Math.min(TRUMP_INAUG_X, xMax)) - x(Math.max(BIDEN_INAUG_X, xMin))}
              height={H - PAD_TOP - PAD_BOTTOM}
              fill={COLOR_BAND_BIDEN}
              opacity={0.35}
            />
          )}
          {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
            <rect
              x={x(TRUMP_INAUG_X)}
              y={PAD_TOP}
              width={x(xMax) - x(TRUMP_INAUG_X)}
              height={H - PAD_TOP - PAD_BOTTOM}
              fill={COLOR_BAND_TRUMP}
              opacity={0.4}
            />
          )}

          {/* Era labels — placed in middle of each band */}
          <text
            x={(x(Math.max(BIDEN_INAUG_X, xMin)) + x(Math.min(TRUMP_INAUG_X, xMax))) / 2}
            y={PAD_TOP - 12}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            fill={COLOR_BIDEN}
            fontFamily="ui-monospace, monospace"
            fontStyle="italic"
          >
            Biden
          </text>
          <text
            x={(x(TRUMP_INAUG_X) + x(xMax)) / 2}
            y={PAD_TOP - 12}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            fill={COLOR_TRUMP}
            fontFamily="ui-monospace, monospace"
            fontStyle="italic"
          >
            Trump
          </text>

          {/* Trump inauguration vertical */}
          <line
            x1={x(TRUMP_INAUG_X)}
            x2={x(TRUMP_INAUG_X)}
            y1={PAD_TOP}
            y2={H - PAD_BOTTOM}
            stroke={COLOR_TRUMP}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
          />

          {/* Y grid + tick labels */}
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
                {fmtK(t)}
              </text>
            </g>
          ))}

          {/* Filled area under line */}
          <path d={areaPath} fill={COLOR_AREA} opacity={0.5} />

          {/* Trend line */}
          <path
            d={linePath}
            stroke={COLOR_LINE}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Peak annotation — only if the peak isn't the latest point
              (otherwise it collides with the endpoint label) */}
          {peak.x !== last.x && (
            <>
              <circle
                cx={x(peak.x)}
                cy={y(peak.total_backlog)}
                r={3.5}
                fill={COLOR_LINE}
              />
              <text
                x={x(peak.x)}
                y={y(peak.total_backlog) - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={COLOR_LINE}
                fontFamily="ui-monospace, monospace"
              >
                peak: {fmtK(peak.total_backlog)}
              </text>
            </>
          )}

          {/* Trough annotation (Biden catch-up low) */}
          {trough.x !== first.x && trough.x !== last.x && (
            <>
              <circle cx={x(trough.x)} cy={y(trough.total_backlog)} r={3.5} fill="#047857" />
              <text
                x={x(trough.x)}
                y={y(trough.total_backlog) + 18}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#047857"
                fontFamily="ui-monospace, monospace"
              >
                low: {fmtK(trough.total_backlog)}
              </text>
              <text
                x={x(trough.x)}
                y={y(trough.total_backlog) + 32}
                textAnchor="middle"
                fontSize={10}
                fill="#047857"
                fontFamily="ui-monospace, monospace"
                fontStyle="italic"
              >
                {trough.label.split(" (")[0]}
              </text>
            </>
          )}

          {/* Endpoint dot + big number */}
          <circle
            cx={x(last.x)}
            cy={y(last.total_backlog)}
            r={5}
            fill={COLOR_LINE}
          />
          <text
            x={x(last.x) + 10}
            y={y(last.total_backlog) - 8}
            fontSize={22}
            fontWeight={700}
            fill={COLOR_LINE}
            fontFamily="ui-monospace, monospace"
          >
            {last.total_backlog.toLocaleString()}
          </text>
          <text
            x={x(last.x) + 10}
            y={y(last.total_backlog) + 12}
            fontSize={11}
            fill={COLOR_LINE}
            fontFamily="ui-monospace, monospace"
            fontStyle="italic"
          >
            pending requests
          </text>
          <text
            x={x(last.x) + 10}
            y={y(last.total_backlog) + 26}
            fontSize={11}
            fill={COLOR_LINE}
            fontFamily="ui-monospace, monospace"
            fontStyle="italic"
          >
            {last.label.split(" (")[0]}
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
                Oct {String(p.fy - 1).slice(-2)}
              </text>
            </g>
          ))}

          {/* Y-axis title */}
          <text
            x={PAD_LEFT}
            y={PAD_TOP - 36}
            fontSize={11}
            fill="#44403c"
            fontFamily="ui-monospace, monospace"
          >
            Pending FOIA requests, end of quarter
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 px-4 pb-3 text-xs font-display italic text-stone-700">
        <span className="text-stone-500 not-italic">
          Sum of pending FOIA requests across {agencies.length} agencies
          (DOJ, DoD, HHS, DOT, EEOC, Labor, SEC, Interior, EPA, Education)
          — every one filed every quarter from FY2021 Q1 through{" "}
          {last.label.split(" (")[0]}.
        </span>
      </div>
    </div>
  );
}
