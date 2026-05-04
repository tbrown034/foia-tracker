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

  // Throughput-derived anecdote stats (no fabrication; all from the bars
  // immediately below).
  const fallingBehindCount = throughput.filter((t) => t.catch_up_ratio < 1)
    .length;
  const worstThroughput = [...throughput].sort(
    (a, b) => a.catch_up_ratio - b.catch_up_ratio
  )[0];
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
      <article className="mx-auto max-w-3xl w-full px-6 pt-14 pb-12">
        {/* Kicker */}
        <p className="font-display italic text-stone-500 text-sm">
          Federal records requests · five quarters · {stats.baseline_label}–
          {stats.current_label}
        </p>

        {/* Headline — neutral, descriptive */}
        <h1 className="font-display text-stone-900 text-5xl md:text-7xl leading-[0.95] mt-3">
          The federal FOIA backlog
        </h1>

        {/* Hero stat woven into the standfirst */}
        <p className="font-display text-stone-900 text-xl md:text-2xl leading-snug mt-7 max-w-2xl">
          As of the close of {stats.current_label}, federal agencies are
          holding{" "}
          <span className="tabular-nums">{fmt(stats.total_current)}</span>{" "}
          unanswered FOIA requests — up from{" "}
          <span className="tabular-nums">{fmt(stats.total_baseline)}</span>{" "}
          five quarters earlier.{" "}
          <span className="tabular-nums">
            {stats.agencies_falling_behind ?? "—"} of the top {stats.top_n}
          </span>{" "}
          agencies closed fewer requests than they received during that
          window. The oldest pending request in the federal government has
          been waiting{" "}
          <span className="tabular-nums">{overallOldestYears} years</span>.
        </p>

        {/* Lede / dateline */}
        <p className="font-display text-stone-700 text-base italic mt-5 max-w-2xl leading-relaxed">
          The numbers are self-reported by agencies under the FOIA Improvement
          Act of 2016. They include perfected requests still open at quarter
          end and exclude administrative appeals. Updated {updatedAt}.
        </p>
      </article>

      <section className="mx-auto max-w-5xl w-full px-6 mt-16">
        <p className="font-display italic text-stone-500 text-sm">
          Slope chart · top 20 agencies by absolute change in backlog
        </p>
        <h2 className="font-display text-stone-900 text-3xl md:text-4xl leading-tight mt-2">
          Five quarters of backlog change
        </h2>
        <p className="text-stone-700 mt-3 max-w-prose leading-relaxed">
          Each line is one of the top 20 agencies by absolute change. Left
          dot = backlog at the close of {slope.baselineLabel}, the last
          full quarter of the Biden administration. Right dot = backlog at
          the close of {slope.currentLabel}, the most recent published
          quarter. Slope tells you what changed; the bars below tell you
          why.
        </p>
        <div className="mt-8">
          <SlopeChart
            data={slope}
            width={980}
            height={620}
            topN={20}
            annotations={[
              {
                agency: "Department of Justice",
                text: "FBI, ATF, DEA all report through DOJ",
                side: "right",
              },
              {
                agency: "Department of Health and Human Services",
                text: "CDC FOIA office eliminated, April 2025",
                side: "right",
              },
              {
                agency: "Department of Transportation",
                text: "Lost 10% of FOIA staff",
                side: "right",
              },
            ]}
          />
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

        {/* Pull quote */}
        <figure className="mt-12 mx-auto max-w-2xl border-l-2 border-stone-800 pl-6">
          <blockquote className="font-display text-stone-900 text-2xl md:text-3xl leading-snug italic">
            &ldquo;An unprecedented breakdown in the infrastructure
            supporting public access to government information.&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm text-stone-600 font-display not-italic [font-variant-caps:small-caps]">
            American Oversight, congressional testimony, April 25, 2025
          </figcaption>
        </figure>

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
            volume across the same five-quarter window: dark = received,
            green = processed. The &ldquo;closed / received&rdquo; column
            is that ratio — anything below 100% means the queue grew.
          </p>
          {worstThroughput && (
            <p className="font-display italic text-stone-700 text-base mt-3 max-w-prose">
              Of the {throughput.length} highest-volume agencies on the
              list, {fallingBehindCount} closed fewer requests than they
              received over the five quarters. The widest gap was at{" "}
              {worstThroughput.agency}, which processed{" "}
              <span className="not-italic tabular-nums">
                {Math.round(worstThroughput.catch_up_ratio * 100)}%
              </span>{" "}
              of what came in.
            </p>
          )}
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

      {/* Reading list */}
      <section className="mx-auto max-w-3xl w-full px-6 mt-20 mb-16 border-t border-stone-200 pt-10">
        <p className="font-display italic text-stone-500 text-sm">
          Further reading
        </p>
        <h2 className="font-display text-stone-900 text-2xl md:text-3xl leading-tight mt-2">
          The reporting underneath this dashboard
        </h2>
        <ul className="mt-6 space-y-5">
          <li>
            <a
              href="https://americanoversight.org/american-oversight-urges-congress-to-protect-and-strengthen-foia-during-unprecedented-attacks-on-transparency/"
              className="block group"
              target="_blank"
              rel="noreferrer"
            >
              <p className="font-display text-stone-900 text-lg group-hover:underline">
                American Oversight urges Congress to protect and strengthen
                FOIA during unprecedented attacks on transparency
              </p>
              <p className="text-sm text-stone-600 mt-1">
                American Oversight congressional testimony, April 25, 2025.
                Names the structural breakdown — eliminated FOIA offices,
                ephemeral-messaging evasion, exemption abuse — and lays out
                concrete asks for Congress.
              </p>
            </a>
          </li>
          <li>
            <a
              href="https://americanoversight.org/"
              className="block group"
              target="_blank"
              rel="noreferrer"
            >
              <p className="font-display text-stone-900 text-lg group-hover:underline">
                Not All Federal Agencies Are Equal When It Comes to FOIA
                Response Times
              </p>
              <p className="text-sm text-stone-600 mt-1">
                American Oversight, February 2025. The agency-level
                disparity argument that the Quarterly Report API makes
                queryable in real time.
              </p>
            </a>
          </li>
          <li>
            <a
              href="https://www.foia.gov/foia-dataset-download.html"
              className="block group"
              target="_blank"
              rel="noreferrer"
            >
              <p className="font-display text-stone-900 text-lg group-hover:underline">
                FOIA.gov dataset downloads
              </p>
              <p className="text-sm text-stone-600 mt-1">
                Department of Justice Office of Information Policy. The
                source of every number on this page. Bulk Annual Report
                ZIPs, FY2008 through FY2024.
              </p>
            </a>
          </li>
          <li>
            <Link href="/data" className="block group">
              <p className="font-display text-stone-900 text-lg group-hover:underline">
                FOIA Tracker open data
              </p>
              <p className="text-sm text-stone-600 mt-1">
                Six datasets behind this site, downloadable as CSV. Schema,
                row counts, refresh cadence.
              </p>
            </Link>
          </li>
        </ul>
      </section>
    </SiteShell>
  );
}
