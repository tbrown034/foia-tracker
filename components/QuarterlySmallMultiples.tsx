import Link from "next/link";
import { scaleLinear } from "d3-scale";
import { line, area, curveMonotoneX } from "d3-shape";
import type { SmallMultipleAgency } from "@/lib/queries";

type Props = {
  data: SmallMultipleAgency[];
};

// X-axis uses fiscal_year*4 + fiscal_quarter, so each integer is one quarter
// end. Inaugurations land in Q2 (Jan 20), 20/90 ≈ 0.22 of the way from
// Q1's end to Q2's end.
const Q_INAUG_OFFSET = 20 / 90;
const TRUMP2_INAUG_X = 2025 * 4 + 1 + Q_INAUG_OFFSET; // = 8101.22

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
}

function pctColor(pct: number | null): string {
  if (pct == null) return "text-stone-400";
  if (pct > 10) return "text-red-700";
  if (pct < -10) return "text-emerald-700";
  return "text-stone-600";
}

function lineColor(pct: number | null): string {
  if (pct == null) return "#78716c";
  if (pct > 10) return "#b91c1c";
  if (pct < -10) return "#047857";
  return "#44403c";
}

function Panel({ row }: { row: SmallMultipleAgency }) {
  const W = 280;
  const H = 110;
  const PADX = 8;
  const PADY = 18;

  const valid = row.series.filter(
    (p): p is typeof p & { backlog: number } => p.backlog != null
  );
  if (valid.length < 2) {
    return (
      <div className="border border-stone-200 bg-white p-4">
        <div className="text-sm font-display text-stone-900">{row.agency}</div>
        <div className="text-xs text-stone-500 mt-1">Insufficient data</div>
      </div>
    );
  }

  const xs = valid.map((d) => d.x);
  const ys = valid.map((d) => d.backlog);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const x = scaleLinear()
    .domain([xMin, xMax])
    .range([PADX, W - PADX]);
  const y = scaleLinear()
    .domain([Math.max(0, yMin - (yMax - yMin) * 0.1), yMax + (yMax - yMin) * 0.1])
    .range([H - PADY, PADY]);

  const stroke = lineColor(row.pct_change);

  const linePath =
    line<{ x: number; backlog: number }>()
      .x((d) => x(d.x))
      .y((d) => y(d.backlog))
      .curve(curveMonotoneX)(valid as { x: number; backlog: number }[]) ?? "";

  const areaPath =
    area<{ x: number; backlog: number }>()
      .x((d) => x(d.x))
      .y0(H - PADY)
      .y1((d) => y(d.backlog))
      .curve(curveMonotoneX)(valid as { x: number; backlog: number }[]) ?? "";

  // Admin background bands: Biden runs from data start to Trump 2 inaug;
  // Trump 2 from inaug to data end. Both bands clamp to data domain.
  const bidenStart = Math.max(xMin, 2021 * 4 + 1 + Q_INAUG_OFFSET);
  const bidenEnd = Math.min(xMax, TRUMP2_INAUG_X);
  const trump2Start = Math.max(xMin, TRUMP2_INAUG_X);
  const trump2End = xMax;

  const last = valid[valid.length - 1];
  const first = valid[0];

  return (
    <div className="border border-stone-200 bg-white p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/agency/${row.slug}`}
          className="font-display text-sm text-stone-900 hover:underline leading-tight line-clamp-2"
        >
          {row.agency}
        </Link>
        <span
          className={`font-display italic text-xs whitespace-nowrap tabular-nums ${pctColor(
            row.pct_change
          )}`}
        >
          {fmtPct(row.pct_change)}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl tabular-nums text-stone-900 leading-none">
          {fmt(row.latest_backlog)}
        </span>
        <span className="text-[10px] text-stone-500 leading-tight">
          backlog,
          <br />
          {last.label.split(" (")[0]}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${row.agency} quarterly backlog ${first.label} to ${last.label}`}
      >
        {/* Admin bands */}
        {bidenEnd > bidenStart && (
          <rect
            x={x(bidenStart)}
            y={PADY}
            width={x(bidenEnd) - x(bidenStart)}
            height={H - PADY * 2}
            fill="#dbeafe"
            opacity={0.35}
          />
        )}
        {trump2End > trump2Start && (
          <rect
            x={x(trump2Start)}
            y={PADY}
            width={x(trump2End) - x(trump2Start)}
            height={H - PADY * 2}
            fill="#fee2e2"
            opacity={0.45}
          />
        )}

        {/* Trump 2 inauguration marker */}
        {TRUMP2_INAUG_X >= xMin && TRUMP2_INAUG_X <= xMax && (
          <g>
            <line
              x1={x(TRUMP2_INAUG_X)}
              x2={x(TRUMP2_INAUG_X)}
              y1={PADY}
              y2={H - PADY}
              stroke="#dc2626"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.6}
            />
          </g>
        )}

        {/* Filled area under line */}
        <path d={areaPath} fill={stroke} opacity={0.08} />
        {/* Trend line */}
        <path
          d={linePath}
          stroke={stroke}
          strokeWidth={1.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Endpoint dots */}
        <circle cx={x(first.x)} cy={y(first.backlog)} r={2} fill={stroke} opacity={0.6} />
        <circle cx={x(last.x)} cy={y(last.backlog)} r={2.5} fill={stroke} />
      </svg>
      <div className="flex justify-between text-[10px] text-stone-500 font-mono leading-tight">
        <span>{first.label.match(/\(([^,]+)/)?.[1] ?? ""}</span>
        <span>{last.label.match(/\(([^,]+)/)?.[1] ?? ""}</span>
      </div>
    </div>
  );
}

export function QuarterlySmallMultiples({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Quarterly data unavailable.
      </div>
    );
  }

  const first = data[0]?.series[0];
  const last = data[0]?.series[data[0].series.length - 1];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-stone-200 border border-stone-200">
        {data.map((row) => (
          <Panel key={row.agency} row={row} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-600 font-display italic">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-3 h-3"
            style={{ backgroundColor: "#dbeafe", opacity: 0.7 }}
          />
          Biden (through Jan 19, 2025)
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-3 h-3"
            style={{ backgroundColor: "#fee2e2", opacity: 0.85 }}
          />
          Trump (from Jan 20, 2025)
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-3 h-px border-t border-dashed border-red-700"
          />
          Inauguration, Jan 20, 2025
        </span>
        <span className="text-stone-500 not-italic">
          Each panel scaled to its own range. Window:{" "}
          {first?.label.split(" (")[0]} – {last?.label.split(" (")[0]}.
        </span>
      </div>
    </div>
  );
}
