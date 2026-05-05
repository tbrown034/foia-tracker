import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import type { SmallMultipleAgency } from "@/lib/queries";

type Props = {
  data: SmallMultipleAgency[];
};

const Q_INAUG_OFFSET = 20 / 90;
const BIDEN_INAUG_X = 2021 * 4 + 1 + Q_INAUG_OFFSET;
const TRUMP_INAUG_X = 2025 * 4 + 1 + Q_INAUG_OFFSET;

const W = 560;
const H = 320;
const PAD_LEFT = 12;
const PAD_RIGHT = 96;
const PAD_TOP = 44;
const PAD_BOTTOM = 36;

const COLOR_LINE = "#7f1d1d";
const COLOR_INK = "#44403c";
const COLOR_AXIS = "#78716c";
const COLOR_BAND_TRUMP = "#fee2e2";
const COLOR_BAND_BIDEN = "#dbeafe";
const COLOR_MARKER_TRUMP = "#991b1b";
const COLOR_MARKER_BIDEN = "#1e3a8a";

function fmtK(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 100 ? 0 : 1)}k`;
  }
  return n.toLocaleString();
}

type Pt = { x: number; fy: number; q: number; total: number; label: string };

export function HeroBacklogChart({ data }: Props) {
  if (data.length === 0) {
    return null;
  }

  const totals = new Map<number, Pt>();
  for (const agency of data) {
    for (const p of agency.series) {
      if (p.backlog == null) continue;
      const existing = totals.get(p.x);
      if (existing) {
        existing.total += p.backlog;
      } else {
        totals.set(p.x, {
          x: p.x,
          fy: p.fy,
          q: p.q,
          total: p.backlog,
          label: p.label,
        });
      }
    }
  }

  const points: Pt[] = [...totals.values()].sort((a, b) => a.x - b.x);
  if (points.length < 2) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.total);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.08;

  const x = scaleLinear().domain([xMin, xMax]).range([PAD_LEFT, W - PAD_RIGHT]);
  const y = scaleLinear().domain([yMin, yMax]).range([H - PAD_BOTTOM, PAD_TOP]);

  const path =
    line<Pt>()
      .x((d) => x(d.x))
      .y((d) => y(d.total))
      .curve(curveMonotoneX)(points) ?? "";

  const first = points[0];
  const last = points[points.length - 1];

  const fyTicks = points.filter((p) => p.q === 1);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full h-auto"
        role="img"
        aria-label={`Combined FOIA backlog across the top ten federal agencies, ${first.label} through ${last.label}. Rose from ${first.total.toLocaleString()} to ${last.total.toLocaleString()}.`}
      >
        {/* Biden era band */}
        {BIDEN_INAUG_X < TRUMP_INAUG_X && BIDEN_INAUG_X <= xMax && (
          <rect
            x={x(Math.max(BIDEN_INAUG_X, xMin))}
            y={PAD_TOP}
            width={x(Math.min(TRUMP_INAUG_X, xMax)) - x(Math.max(BIDEN_INAUG_X, xMin))}
            height={H - PAD_BOTTOM - PAD_TOP}
            fill={COLOR_BAND_BIDEN}
            opacity={0.5}
          />
        )}
        {/* Trump era band */}
        {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
          <rect
            x={x(TRUMP_INAUG_X)}
            y={PAD_TOP}
            width={x(xMax) - x(TRUMP_INAUG_X)}
            height={H - PAD_BOTTOM - PAD_TOP}
            fill={COLOR_BAND_TRUMP}
            opacity={0.55}
          />
        )}

        {/* Biden inauguration */}
        {BIDEN_INAUG_X >= xMin && BIDEN_INAUG_X <= xMax && (
          <>
            <line
              x1={x(BIDEN_INAUG_X)}
              x2={x(BIDEN_INAUG_X)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke={COLOR_MARKER_BIDEN}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <text
              x={x(BIDEN_INAUG_X) + 4}
              y={PAD_TOP + 12}
              fontSize={11}
              fill={COLOR_MARKER_BIDEN}
              fontFamily="ui-monospace, monospace"
              fontStyle="italic"
            >
              Biden
            </text>
          </>
        )}

        {/* Trump inauguration */}
        {TRUMP_INAUG_X >= xMin && TRUMP_INAUG_X <= xMax && (
          <>
            <line
              x1={x(TRUMP_INAUG_X)}
              x2={x(TRUMP_INAUG_X)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke={COLOR_MARKER_TRUMP}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <text
              x={x(TRUMP_INAUG_X) + 4}
              y={PAD_TOP + 12}
              fontSize={11}
              fill={COLOR_MARKER_TRUMP}
              fontFamily="ui-monospace, monospace"
              fontStyle="italic"
            >
              Trump
            </text>
          </>
        )}

        <line
          x1={PAD_LEFT}
          x2={W - PAD_RIGHT}
          y1={H - PAD_BOTTOM}
          y2={H - PAD_BOTTOM}
          stroke={COLOR_AXIS}
          strokeWidth={1}
        />

        <path
          d={path}
          stroke={COLOR_LINE}
          strokeWidth={2.25}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle cx={x(first.x)} cy={y(first.total)} r={3.5} fill={COLOR_LINE} />
        <text
          x={x(first.x) + 8}
          y={y(first.total) + 18}
          fontSize={13}
          fontWeight={600}
          fill={COLOR_LINE}
          fontFamily="ui-monospace, monospace"
        >
          {fmtK(first.total)}
        </text>
        <text
          x={x(first.x) + 8}
          y={y(first.total) + 32}
          fontSize={11}
          fill={COLOR_INK}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          {first.label.split(" (")[0]}
        </text>

        <circle cx={x(last.x)} cy={y(last.total)} r={4} fill={COLOR_LINE} />
        <text
          x={x(last.x) + 8}
          y={y(last.total) - 6}
          fontSize={15}
          fontWeight={700}
          fill={COLOR_LINE}
          fontFamily="ui-monospace, monospace"
        >
          {fmtK(last.total)}
        </text>
        <text
          x={x(last.x) + 8}
          y={y(last.total) + 10}
          fontSize={11}
          fill={COLOR_INK}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          {last.label.split(" (")[0]}
        </text>

        {fyTicks.map((p) => (
          <text
            key={`fy-${p.x}`}
            x={x(p.x)}
            y={H - PAD_BOTTOM + 16}
            textAnchor="middle"
            fontSize={11}
            fill={COLOR_AXIS}
            fontFamily="ui-monospace, monospace"
          >
            FY{p.fy}
          </text>
        ))}
      </svg>
      <figcaption className="font-display italic text-xs text-stone-600 mt-2 leading-snug">
        Combined backlog of the ten agencies with the largest current FOIA
        piles, every quarter from {first.label.split(" (")[0]} to{" "}
        {last.label.split(" (")[0]}.
      </figcaption>
    </figure>
  );
}
