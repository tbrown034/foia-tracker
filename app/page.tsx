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
  getWallOfShame,
  getSlopeChartData,
  getThroughputDuringTrump2,
  getEditorialStats,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtSigned(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString()}`;
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
  if (pct == null) return "#a8a29e";
  if (pct > 10) return "#dc2626";
  if (pct < -10) return "#059669";
  return "#57534e";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtUpdatedAt(d: Date): string {
  const dateStr = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
    .toLowerCase()
    .replace("am", "a.m.")
    .replace("pm", "p.m.");
  return `${timeStr}, ${dateStr}`;
}

export default async function Home() {
  const [rows, period, wall, slope, throughput, stats] = await Promise.all([
    getQuarterlyRanking(25),
    getMostRecentQuarter(),
    getWallOfShame(5),
    getSlopeChartData(),
    getThroughputDuringTrump2(12),
    getEditorialStats(25),
  ]);
  const periodLabel = period ? `FY${period.fy} Q${period.q}` : "—";
  const prevQ = period
    ? period.q === 1
      ? `FY${period.fy - 1} Q4`
      : `FY${period.fy} Q${period.q - 1}`
    : "—";

  const updatedAt = fmtUpdatedAt(new Date());
  const dojOldestYears =
    stats.doj_oldest_days != null
      ? (stats.doj_oldest_days / 365).toFixed(1)
      : "—";
  const overallOldestYears =
    stats.oldest_overall_days != null
      ? (stats.oldest_overall_days / 365).toFixed(1)
      : "—";

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl w-full px-6 py-12">
        {/* Kicker */}
        <p className="font-display italic text-stone-500 text-sm">
          Where federal records requests go to die · {stats.current_label}
        </p>

        {/* Headline */}
        <h1 className="font-display text-stone-900 text-5xl md:text-7xl leading-[0.95] mt-3">
          The Trump 2.0 backlog
        </h1>

        {/* Standfirst */}
        <p className="font-display text-stone-800 text-xl md:text-2xl leading-snug mt-6 max-w-2xl">
          Federal FOIA backlogs grew by{" "}
          <span className="text-red-700">
            {fmtSigned(stats.total_change)}
          </span>{" "}
          requests in the fifteen months after Donald Trump&rsquo;s second
          inauguration.{" "}
          <span className="tabular-nums">
            {stats.agencies_falling_behind ?? "—"} of the top{" "}
            {stats.top_n}
          </span>{" "}
          agencies closed fewer requests than they received during that
          window. The oldest pending request in the federal government has
          been waiting{" "}
          <span className="tabular-nums">{overallOldestYears} years</span>.
        </p>

        {/* Article timestamp */}
        <p className="text-xs italic text-stone-500 mt-6">
          Updated {updatedAt}.
        </p>

        {/* Hero number — total federal backlog */}
        <section className="mt-12 pt-10 border-t border-stone-200">
          <p className="font-display italic text-stone-500 text-sm">
            Total federal FOIA backlog, end of {stats.current_label}
          </p>
          <p className="font-display text-stone-900 text-7xl md:text-8xl leading-none mt-3 tabular-nums">
            {fmt(stats.total_current)}
          </p>
          <p className="font-display text-stone-700 text-lg leading-snug mt-5 max-w-prose">
            Up from{" "}
            <span className="tabular-nums">{fmt(stats.total_baseline)}</span>{" "}
            at {stats.baseline_label}. The Department of Justice alone is
            holding the longest unanswered request: filed{" "}
            {fmtDate(stats.doj_oldest_date)}, still pending after{" "}
            <span className="tabular-nums">{dojOldestYears} years</span>.
          </p>
          <p className="text-xs italic text-stone-500 mt-4">
            Source: FOIA.gov Quarterly Report API. Retrieved May 4, 2026.
            Agency-overall rows only; components excluded.
          </p>
        </section>

        {/* Slope chart — break out of the narrow column */}
      </article>

      <section className="mx-auto max-w-5xl w-full px-6 mt-16">
        <p className="font-display italic text-stone-500 text-sm">
          Slope chart · agencies by absolute change in backlog
        </p>
        <h2 className="font-display text-stone-900 text-3xl md:text-4xl leading-tight mt-2">
          Where backlogs went after January 2025
        </h2>
        <p className="text-stone-700 mt-3 max-w-prose leading-relaxed">
          Each line is one of the top 20 agencies by absolute change. Left
          dot = backlog at the close of {slope.baselineLabel}, the last
          full quarter before the Trump 2.0 inauguration. Right dot =
          backlog at the close of {slope.currentLabel}. Slope tells you
          what changed; the bars below tell you why.
        </p>
        <div className="mt-8">
          <SlopeChart data={slope} width={980} height={620} topN={20} />
        </div>
        <p className="text-xs italic text-stone-500 mt-4 max-w-3xl">
          Source: FOIA.gov Quarterly Report API. Retrieved May 4, 2026.
          Backlogged means perfected requests open more than 20 working
          days. Log scale on the y-axis. Hover any line for exact numbers.{" "}
          <a
            href="/api/data/slope.csv"
            className="underline hover:text-stone-700"
            download
          >
            Download data (CSV)
          </a>{" "}
          ·{" "}
          <a
            href="/api/chart/slope.svg"
            className="underline hover:text-stone-700"
            download
          >
            Download chart (SVG)
          </a>
        </p>

        <div className="mt-16">
          <p className="font-display italic text-stone-500 text-sm">
            Throughput · what drove the change
          </p>
          <h2 className="font-display text-stone-900 text-3xl md:text-4xl leading-tight mt-2">
            Why backlogs moved
          </h2>
          <p className="text-stone-700 mt-3 max-w-prose leading-relaxed">
            A backlog grows when an agency takes in more requests than it
            closes. The bars below show the top 12 agencies by request
            volume during the Trump 2.0 window: dark = received, green =
            processed. The &ldquo;closed / received&rdquo; column is that
            ratio — anything below 100% means the queue grew.
          </p>
          <div className="mt-8">
            <ThroughputPanel data={throughput} />
          </div>
          <p className="text-xs italic text-stone-500 mt-4 max-w-3xl">
            Source: FOIA.gov Quarterly Report API, FY2025 Q1 through{" "}
            {stats.current_label}. Retrieved May 4, 2026.{" "}
            <a
              href="/api/data/quarterly.csv"
              className="underline hover:text-stone-700"
              download
            >
              Download underlying quarterly CSV
            </a>
          </p>
        </div>

        <MetricsExplainer className="mt-16" />
      </section>

      {/* Ranked table */}
      <section className="mx-auto max-w-5xl w-full px-6 mt-16">
        <p className="font-display italic text-stone-500 text-sm">
          Ranked table · {periodLabel}
        </p>
        <h2 className="font-display text-stone-900 text-3xl md:text-4xl leading-tight mt-2">
          Largest current backlogs
        </h2>
        <p className="text-stone-700 mt-3 max-w-prose leading-relaxed">
          Top 25 federal agencies by pending FOIA requests at end of{" "}
          {periodLabel}, with the trend across recent quarters and
          quarter-over-quarter change vs. {prevQ}. Click any agency for
          its full history.
        </p>

        <div className="mt-8 border-t border-stone-300">
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className="py-3 text-left text-sm font-display italic text-stone-500 w-12">
                  Rank
                </th>
                <th className="py-3 text-left text-sm font-display italic text-stone-500">
                  Agency
                </th>
                <th className="py-3 text-right text-sm font-display italic text-stone-500">
                  Backlog ({periodLabel})
                </th>
                <th className="py-3 text-right text-sm font-display italic text-stone-500">
                  vs. {prevQ}
                </th>
                <th className="py-3 text-left text-sm font-display italic text-stone-500 w-36 pl-4">
                  Trend
                </th>
                <th className="py-3 text-right text-sm font-display italic text-stone-500">
                  Received
                </th>
                <th className="py-3 text-right text-sm font-display italic text-stone-500">
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
                  <td className="py-3 text-stone-500 font-mono text-sm">
                    {i + 1}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/agency/${row.slug}`}
                      className="text-stone-900 hover:underline"
                    >
                      {row.agency}
                    </Link>
                  </td>
                  <td className="py-3 text-right font-display text-lg text-stone-900 tabular-nums">
                    {fmt(row.backlog_latest)}
                  </td>
                  <td
                    className={`py-3 text-right font-mono text-sm tabular-nums ${deltaColor(
                      row.delta_pct
                    )}`}
                  >
                    {fmtDelta(row.delta_pct)}
                  </td>
                  <td className="py-3 pl-4" style={{ color: sparkColor(row.delta_pct) }}>
                    <Sparkline
                      data={row.series}
                      width={120}
                      height={28}
                      stroke={sparkColor(row.delta_pct)}
                      markers={quarterlyMarkers()}
                      ariaLabel={`Backlog trend for ${row.agency}`}
                    />
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-stone-500 tabular-nums">
                    {fmt(row.received_latest)}
                  </td>
                  <td className="py-3 text-right font-mono text-sm text-stone-500 tabular-nums">
                    {fmt(row.processed_latest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs italic text-stone-500 mt-4 max-w-3xl">
          Source: FOIA.gov Quarterly Report API. Retrieved May 4, 2026.
          &ldquo;All agencies&rdquo; meta-row excluded. Trend covers up to
          eight most recent quarters.{" "}
          <a
            href="/api/data/quarterly.csv"
            className="underline hover:text-stone-700"
            download
          >
            Download CSV
          </a>{" "}
          ·{" "}
          <Link href="/annual" className="underline hover:text-stone-700">
            See seventeen-year annual history
          </Link>
        </p>
      </section>

      {/* Wall of Shame */}
      {wall.length > 0 && (
        <section className="mx-auto max-w-3xl w-full px-6 mt-20 mb-16">
          <p className="font-display italic text-stone-500 text-sm">
            Wall of Shame · cross-agency
          </p>
          <h2 className="font-display text-stone-900 text-3xl md:text-4xl leading-tight mt-2">
            The five oldest requests in the government
          </h2>
          <p className="text-stone-700 mt-3 leading-relaxed max-w-prose">
            Every federal agency that reports a top-10 oldest list does so
            once a year. These five are the five oldest across that pool at
            end of FY{wall[0]?.fiscal_year}. The longest has been pending
            since before the iPhone shipped.
          </p>
          <ol className="mt-8 space-y-6">
            {wall.map((r, i) => (
              <li
                key={`${r.agency}-${r.rank}`}
                className="border-t border-stone-200 pt-4"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-display italic text-stone-400 text-sm">
                    No. {i + 1}
                  </span>
                  <span className="font-display text-stone-900 text-3xl tabular-nums">
                    {(r.days_pending / 365).toFixed(1)} years
                  </span>
                </div>
                <Link
                  href={`/agency/${r.slug}`}
                  className="font-display text-stone-900 text-2xl block mt-1 hover:underline"
                >
                  {r.agency}
                </Link>
                <p className="text-stone-700 mt-1">
                  Filed {fmtDate(r.date_received)}.{" "}
                  <span className="tabular-nums text-stone-500">
                    {r.days_pending.toLocaleString()} days pending.
                  </span>
                </p>
              </li>
            ))}
          </ol>
          <p className="text-xs italic text-stone-500 mt-6">
            Source: FOIA.gov bulk Annual Report CSVs, FY{wall[0]?.fiscal_year}.
            Retrieved May 4, 2026.{" "}
            <a
              href="/api/data/oldest-pending.csv"
              className="underline hover:text-stone-700"
              download
            >
              Download CSV
            </a>
          </p>
        </section>
      )}
    </SiteShell>
  );
}
