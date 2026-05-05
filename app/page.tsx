import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Sparkline } from "@/components/Sparkline";
import { SlopeChartInteractive } from "@/components/SlopeChartInteractive";
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
  const overallOldestYears =
    stats.oldest_overall_days != null
      ? (stats.oldest_overall_days / 365).toFixed(1)
      : "—";

  return (
    <SiteShell>
      <article className="mx-auto max-w-5xl w-full px-6 pt-12 pb-10">
        {/* Editorial dateline — small caps, all-caps */}
        <p className="font-display italic text-stone-600 text-xs [font-variant-caps:small-caps] tracking-wider">
          Federal records requests &middot; {stats.baseline_label} through{" "}
          {stats.current_label}
        </p>

        {/* Headline — neutral, descriptive */}
        <h1 className="font-display text-stone-900 text-5xl md:text-7xl leading-[0.95] mt-4 max-w-3xl">
          The federal
          <br />
          <span className="italic">FOIA backlog</span>
        </h1>

        {/* Editorial byline rule */}
        <div className="mt-8 flex items-center gap-4">
          <span className="font-display italic text-stone-700 text-sm">
            By&nbsp;<span className="not-italic">Trevor Brown</span>
          </span>
          <span className="text-stone-400">·</span>
          <span className="font-display italic text-stone-600 text-sm">
            Updated {updatedAt}
          </span>
        </div>

        {/* Standfirst with drop cap */}
        <p className="lede font-display text-stone-900 text-lg md:text-xl leading-relaxed mt-8 max-w-prose">
          As of the close of {stats.current_label}, federal agencies are
          holding{" "}
          <span className="tabular-nums font-semibold">
            {fmt(stats.total_current)}
          </span>{" "}
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

        {/* Methodological dateline */}
        <p className="text-stone-600 text-sm italic mt-6 max-w-prose leading-relaxed font-display">
          The numbers are self-reported by agencies under the FOIA Improvement
          Act of 2016. They include perfected requests still open at quarter
          end and exclude administrative appeals.
        </p>
      </article>


      <section className="mx-auto max-w-5xl w-full px-6 mt-8">
        <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed">
          <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
            Figure 1.
          </span>{" "}
          Five quarters of backlog change. Each line is one of the top 20
          agencies by absolute change. Left dot = backlog at the close of{" "}
          <span className="not-italic">{slope.baselineLabel}</span> (
          {slope.baselineFiscal}), the last full quarter before Trump&rsquo;s
          January 20, 2025 inauguration. Right dot ={" "}
          <span className="not-italic">{slope.currentLabel}</span> (
          {slope.currentFiscal}), the most recent published quarter. Slope
          tells you what changed; the bars in Figure 2 tell you why.
        </figcaption>
        <div className="figure-frame mt-4">
          <SlopeChartInteractive
            data={slope}
            width={980}
            height={620}
            defaultTopN={10}
            expandedTopN={25}
            annotations={[
              {
                agency: "Department of Health and Human Services",
                text: "CDC FOIA office eliminated, April 2025",
                // April 2025 falls ~27% into the Oct 2024 → Mar 2026 period.
                dateFraction: 0.27,
              },
              {
                agency: "Department of Transportation",
                text: "Lost 10% of FOIA staff, early 2025",
                dateFraction: 0.18,
              },
            ]}
          />
        </div>
        <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
          Source: FOIA.gov Quarterly Report API. Retrieved May 4, 2026.
          Backlogged means perfected requests open more than twenty working
          days. Log scale on the y-axis. Hover any line for exact numbers.{" "}
          <a
            href="/api/data/slope.csv"
            className="underline hover:text-stone-800"
            download
          >
            Download data (CSV)
          </a>{" "}
          &middot;{" "}
          <a
            href="/api/chart/slope.svg"
            className="underline hover:text-stone-800"
            download
          >
            Download chart (SVG)
          </a>
        </p>

        {/* Pull quote — editorial set, larger ornamental quote mark */}
        <figure className="mt-16 mx-auto max-w-3xl text-center">
          <span
            aria-hidden="true"
            className="block font-display text-stone-300 text-7xl leading-none mb-2 select-none"
          >
            &ldquo;
          </span>
          <blockquote className="font-display text-stone-900 text-2xl md:text-3xl leading-snug italic">
            An unprecedented breakdown in the infrastructure supporting
            public access to government information.
          </blockquote>
          <figcaption className="mt-5 text-sm text-stone-700 font-display not-italic [font-variant-caps:small-caps] tracking-wider">
            American Oversight &middot; Congressional Testimony &middot;
            April&nbsp;25,&nbsp;2025
          </figcaption>
        </figure>

  
        <div className="mt-12">
          <figcaption className="font-display italic text-stone-700 text-sm">
            <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
              Figure 2.
            </span>{" "}
            Why backlogs moved. A backlog grows when an agency takes in
            more requests than it closes. The bars show the top 12
            agencies by request volume across the same five-quarter
            window: dark = received, green = processed. The &ldquo;closed
            / received&rdquo; column is that ratio — anything below 100%
            means the queue grew.
          </figcaption>
          <div className="figure-frame mt-4">
            <ThroughputPanel data={throughput} />
          </div>
          {worstThroughput && (
            <p className="font-display italic text-stone-700 text-base mt-4 max-w-prose leading-relaxed">
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
          <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
            Source: FOIA.gov Quarterly Report API, FY2025 Q1 through{" "}
            {stats.current_label}. Retrieved May 4, 2026.{" "}
            <a
              href="/api/data/quarterly.csv"
              className="underline hover:text-stone-800"
              download
            >
              Download underlying quarterly CSV
            </a>
          </p>
        </div>

  
        <MetricsExplainer className="mt-12" />
      </section>


      {/* Ranked table */}
      <section className="mx-auto max-w-5xl w-full px-6 mt-12">
        <figcaption className="font-display italic text-stone-700 text-sm">
          <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
            Table 1.
          </span>{" "}
          Largest current backlogs. Top 25 federal agencies by pending
          FOIA requests at end of {periodLabel}, with the trend across
          recent quarters and quarter-over-quarter change vs. {prevQ}.
          Click any agency for its full history.
        </figcaption>

        <div className="mt-4 border-t border-stone-900 overflow-x-auto">
          <table className="w-full min-w-[42rem]">
            <thead className="border-b border-[--color-rule]">
              <tr>
                <th className="py-3 text-left font-display italic text-sm text-stone-700 w-12">
                  Rank
                </th>
                <th className="py-3 text-left font-display italic text-sm text-stone-700">
                  Agency
                </th>
                <th className="py-3 text-right font-display italic text-sm text-stone-700">
                  Backlog ({periodLabel})
                </th>
                <th className="py-3 text-right font-display italic text-sm text-stone-700">
                  vs. {prevQ}
                </th>
                <th className="hidden sm:table-cell py-3 text-left font-display italic text-sm text-stone-700 w-36 pl-4">
                  Trend
                </th>
                <th className="hidden md:table-cell py-3 text-right font-display italic text-sm text-stone-700">
                  Received
                </th>
                <th className="hidden md:table-cell py-3 text-right font-display italic text-sm text-stone-700">
                  Processed
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.agency}
                  className="border-b border-[--color-rule] last:border-b-0 hover:bg-[--color-paper-deep]"
                >
                  <td className="py-3 text-stone-500 font-display italic text-sm">
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
                    className={`py-3 text-right font-display italic text-sm tabular-nums ${deltaColor(
                      row.delta_pct
                    )}`}
                  >
                    {fmtDelta(row.delta_pct)}
                  </td>
                  <td className="hidden sm:table-cell py-3 pl-4" style={{ color: sparkColor(row.delta_pct) }}>
                    <Sparkline
                      data={row.series}
                      width={120}
                      height={28}
                      stroke={sparkColor(row.delta_pct)}
                      markers={quarterlyMarkers()}
                      ariaLabel={`Backlog trend for ${row.agency}`}
                    />
                  </td>
                  <td className="hidden md:table-cell py-3 text-right font-display text-sm text-stone-600 tabular-nums">
                    {fmt(row.received_latest)}
                  </td>
                  <td className="hidden md:table-cell py-3 text-right font-display text-sm text-stone-600 tabular-nums">
                    {fmt(row.processed_latest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
          Source: FOIA.gov Quarterly Report API. Retrieved May 4, 2026.
          &ldquo;All agencies&rdquo; meta-row excluded. Trend covers up to
          eight most recent quarters.{" "}
          <a
            href="/api/data/quarterly.csv"
            className="underline hover:text-stone-800"
            download
          >
            Download CSV
          </a>{" "}
          &middot;{" "}
          <Link href="/annual" className="underline hover:text-stone-800">
            See seventeen-year annual history
          </Link>
        </p>
      </section>


      {/* Wall of Shame */}
      {wall.length > 0 && (
        <section className="mx-auto max-w-5xl w-full px-6 mt-12">
          <figcaption className="font-display italic text-stone-700 text-sm">
            <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
              Wall of Shame.
            </span>{" "}
            The five oldest unanswered FOIA requests in the federal
            government, drawn from every agency&rsquo;s top-10 oldest list
            at end of FY{wall[0]?.fiscal_year}. The longest has been
            pending since before the iPhone shipped.
          </figcaption>
          <ol className="mt-6 border-t border-stone-900">
            {wall.map((r, i) => (
              <li
                key={`${r.agency}-${r.rank}`}
                className="border-b border-[--color-rule] py-5 grid grid-cols-12 gap-4 items-baseline"
              >
                <span className="col-span-1 font-display italic text-stone-500 text-base">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-7">
                  <Link
                    href={`/agency/${r.slug}`}
                    className="font-display text-stone-900 text-xl md:text-2xl block hover:underline leading-tight"
                  >
                    {r.agency}
                  </Link>
                  <p className="text-stone-700 mt-1 text-sm font-display italic">
                    Filed {fmtDate(r.date_received)} ·{" "}
                    <span className="tabular-nums">
                      {r.days_pending.toLocaleString()} days pending
                    </span>
                  </p>
                </div>
                <span className="col-span-4 font-display text-stone-900 text-3xl md:text-4xl tabular-nums text-right leading-none">
                  {(r.days_pending / 365).toFixed(1)}
                  <span className="text-base italic text-stone-500 ml-1">
                    yrs
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
            Source: FOIA.gov bulk Annual Report CSVs, FY{wall[0]?.fiscal_year}.
            Retrieved May 4, 2026.{" "}
            <a
              href="/api/data/oldest-pending.csv"
              className="underline hover:text-stone-800"
              download
            >
              Download CSV
            </a>
          </p>
        </section>
      )}


      {/* Reading list */}
      <section className="mx-auto max-w-5xl w-full px-6 mt-12 mb-16">
        <figcaption className="font-display italic text-stone-700 text-sm">
          <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
            Further reading.
          </span>{" "}
          The reporting underneath this dashboard.
        </figcaption>
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
