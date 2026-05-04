import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Sparkline } from "@/components/Sparkline";
import { SlopeChart } from "@/components/SlopeChart";
import { ThroughputPanel } from "@/components/ThroughputPanel";
import { MetricsExplainer } from "@/components/MetricsExplainer";
import { quarterlyMarkers } from "@/lib/admin-transitions";
import {
  getQuarterlyRanking,
  getMostRecentQuarter,
  getHomeCallouts,
  getWallOfShame,
  getSlopeChartData,
  getThroughputDuringTrump2,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtDelta(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(pct: number | null): string {
  if (pct == null) return "text-stone-400";
  if (pct > 10) return "text-red-600";
  if (pct < -10) return "text-emerald-600";
  return "text-stone-500";
}

function sparkColor(pct: number | null): string {
  if (pct == null) return "#a8a29e"; // stone-400
  if (pct > 10) return "#dc2626"; // red-600
  if (pct < -10) return "#059669"; // emerald-600
  return "#57534e"; // stone-600
}

export default async function Home() {
  const [rows, period, callouts, wall, slope, throughput] = await Promise.all([
    getQuarterlyRanking(25),
    getMostRecentQuarter(),
    getHomeCallouts(),
    getWallOfShame(5),
    getSlopeChartData(),
    getThroughputDuringTrump2(12),
  ]);
  const periodLabel = period ? `FY${period.fy} Q${period.q}` : "—";
  const prevQ = period
    ? period.q === 1
      ? `FY${period.fy - 1} Q4`
      : `FY${period.fy} Q${period.q - 1}`
    : "—";

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl w-full px-6 py-10">
        <div className="mb-2 text-xs uppercase tracking-wide text-stone-500">
          Quarterly snapshot · most recent published period
        </div>
        <h1 className="font-display text-4xl text-stone-900">
          Where federal FOIA requests go to die
        </h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Top 25 federal agencies by pending FOIA requests at end of{" "}
          <strong>{periodLabel}</strong>, with the trend across recent
          quarters and quarter-over-quarter change vs. {prevQ}.
        </p>

        {/* Three callout cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Biggest backlog
            </div>
            <div className="font-display text-3xl text-stone-900 mt-2 tabular-nums">
              {callouts.biggestBacklog
                ? callouts.biggestBacklog.value.toLocaleString()
                : "—"}
            </div>
            {callouts.biggestBacklog && (
              <Link
                href={`/agency/${callouts.biggestBacklog.slug}`}
                className="text-sm text-stone-700 hover:underline block mt-1 truncate"
              >
                {callouts.biggestBacklog.agency}
              </Link>
            )}
            <div className="text-xs text-stone-500 mt-1">
              {callouts.biggestBacklog?.period}
            </div>
          </div>
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Fastest-growing backlog
            </div>
            <div className="font-display text-3xl text-red-600 mt-2 tabular-nums">
              {callouts.fastestGrowing
                ? `+${callouts.fastestGrowing.delta_pct.toFixed(1)}%`
                : "—"}
            </div>
            {callouts.fastestGrowing && (
              <Link
                href={`/agency/${callouts.fastestGrowing.slug}`}
                className="text-sm text-stone-700 hover:underline block mt-1 truncate"
              >
                {callouts.fastestGrowing.agency}
              </Link>
            )}
            <div className="text-xs text-stone-500 mt-1">
              vs. previous quarter
            </div>
          </div>
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Oldest unanswered request
            </div>
            <div className="font-display text-3xl text-stone-900 mt-2 tabular-nums">
              {callouts.oldestPending
                ? `${callouts.oldestPending.days.toLocaleString()}d`
                : "—"}
            </div>
            {callouts.oldestPending && (
              <Link
                href={`/agency/${callouts.oldestPending.slug}`}
                className="text-sm text-stone-700 hover:underline block mt-1 truncate"
              >
                {callouts.oldestPending.agency}
              </Link>
            )}
            <div className="text-xs text-stone-500 mt-1">
              {callouts.oldestPending?.date_received
                ? `Filed ${callouts.oldestPending.date_received}`
                : "—"}
            </div>
          </div>
        </div>

        {/* Killer graphic: slope chart pre-Trump-2 vs. now */}
        <section className="mt-12">
          <div className="text-xs uppercase tracking-wide text-stone-500">
            Headline view · slope chart
          </div>
          <h2 className="font-display text-3xl text-stone-900 mt-1">
            Where federal FOIA backlogs went after January 2025
          </h2>
          <p className="text-stone-600 mt-2 max-w-2xl">
            Each line is one of the top 20 agencies by absolute change. Left
            dot = backlog at the close of {slope.baselineLabel} — the last
            full quarter before the Trump 2.0 inauguration. Right dot =
            backlog at the close of {slope.currentLabel}, the most recent
            published quarter. Slope tells you what changed; the panel below
            tells you why.
          </p>
          <div className="mt-6 border border-stone-200 rounded-lg p-6 bg-white overflow-x-auto">
            <SlopeChart data={slope} width={980} height={620} topN={20} />
          </div>
          <div className="mt-3 flex justify-between items-center flex-wrap gap-3 text-xs text-stone-500">
            <span className="max-w-2xl">
              Backlogged = perfected requests open more than 20 working days,
              per agency self-reporting. Log scale on the y-axis to keep both
              tiny and giant agencies visible.
            </span>
            <span className="flex items-center gap-4 whitespace-nowrap">
              <a
                href="/api/data/slope.csv"
                className="underline hover:text-stone-900"
                download
              >
                Download CSV
              </a>
              <a
                href="/api/chart/slope.svg"
                className="underline hover:text-stone-900"
                download
              >
                Download chart (SVG)
              </a>
            </span>
          </div>

          {/* Throughput companion: why did the backlog move? */}
          <div className="mt-10">
            <h3 className="font-display text-2xl text-stone-900">
              Why did backlogs move? Received versus processed
            </h3>
            <p className="text-stone-600 mt-2 max-w-2xl">
              A backlog grows when an agency takes in more requests than it
              closes. The bars below show the top 12 agencies by request
              volume during the Trump 2.0 window: dark = requests received,
              green = requests processed. The catch-up ratio on the right
              is the share of incoming requests the agency closed. Anything
              under 100% means the queue grew.
            </p>
            <div className="mt-6">
              <ThroughputPanel data={throughput} />
            </div>
            <div className="mt-3 flex justify-end text-xs text-stone-500">
              <a
                href="/api/data/quarterly.csv"
                className="underline hover:text-stone-900"
                download
              >
                Download underlying quarterly CSV
              </a>
            </div>
          </div>
        </section>

        <MetricsExplainer className="mt-12" />

        <div className="mt-8 border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600 w-12">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Agency
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Backlog ({periodLabel})
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  vs. {prevQ}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600 w-36">
                  Trend
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Received
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Processed
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.agency}
                  className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-3 text-stone-500 font-mono text-sm">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/agency/${row.slug}`}
                      className="text-stone-900 hover:underline"
                    >
                      {row.agency}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-stone-900 tabular-nums">
                    {fmt(row.backlog_latest)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${deltaColor(
                      row.delta_pct
                    )}`}
                  >
                    {fmtDelta(row.delta_pct)}
                  </td>
                  <td className="px-4 py-3" style={{ color: sparkColor(row.delta_pct) }}>
                    <Sparkline
                      data={row.series}
                      width={120}
                      height={28}
                      stroke={sparkColor(row.delta_pct)}
                      markers={quarterlyMarkers()}
                      ariaLabel={`Backlog trend for ${row.agency}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-stone-500 tabular-nums">
                    {fmt(row.received_latest)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-stone-500 tabular-nums">
                    {fmt(row.processed_latest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center flex-wrap gap-3 text-xs text-stone-500">
          <span>
            Source: FOIA.gov Quarterly Report API. &ldquo;All agencies&rdquo;
            meta-row excluded. Trend covers up to 8 most recent quarters.
          </span>
          <span className="flex items-center gap-4">
            <a
              href="/api/data/quarterly.csv"
              className="underline hover:text-stone-900"
              download
            >
              Download quarterly CSV
            </a>
            <Link href="/annual" className="underline hover:text-stone-900">
              See 17-year annual history →
            </Link>
          </span>
        </div>

        {/* Wall of Shame teaser */}
        {wall.length > 0 && (
          <section className="mt-16">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Wall of Shame · cross-agency
            </div>
            <h2 className="font-display text-3xl text-stone-900 mt-1">
              Five oldest unanswered FOIA requests in the federal government
            </h2>
            <p className="text-stone-600 mt-2 max-w-2xl">
              Across every agency that reported a top-10 oldest list at end
              of FY{wall[0]?.fiscal_year}. Each one is a request the
              government has been sitting on for the better part of a decade
              or more.
            </p>
            <div className="mt-6 border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600 w-12">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Agency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Filed
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Days pending
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Years
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wall.map((r, i) => (
                    <tr
                      key={`${r.agency}-${r.rank}`}
                      className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-stone-500">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/agency/${r.slug}`}
                          className="text-stone-900 hover:underline"
                        >
                          {r.agency}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-stone-700">
                        {r.date_received ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-stone-900">
                        {r.days_pending.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-red-600">
                        {(r.days_pending / 365).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-stone-500 mt-3">
              Full Wall of Shame across all agency top-10 lists is a v2
              feature. For now: drill into any agency to see its own oldest
              pending list.
            </p>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
