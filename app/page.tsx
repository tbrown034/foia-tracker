import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Sparkline } from "@/components/Sparkline";
import { QuarterlySmallMultiples } from "@/components/QuarterlySmallMultiples";
import { CumulativeNetChart } from "@/components/CumulativeNetChart";
import { SlopeChartInteractive } from "@/components/SlopeChartInteractive";
import { SlopeMobileList } from "@/components/SlopeMobileList";
import { ThroughputPanel } from "@/components/ThroughputPanel";
import { MetricsExplainer } from "@/components/MetricsExplainer";
import { quarterlyMarkers } from "@/lib/admin-transitions";
import {
  fiscalQuarterShort,
  fiscalQuarterDateRange,
  fiscalYearDateRange,
  type FiscalQuarter,
} from "@/lib/fiscal";
import {
  getQuarterlyRanking,
  getMostRecentQuarter,
  getWallOfShame,
  getQuarterlySmallMultiples,
  getReceivedVsProcessedTimeline,
  getAgenciesFilingPerQuarter,
  getSlopeChartData,
  getThroughputDuringTrump2,
  getEditorialStats,
  getLatestSyncByEachSource,
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

function retrievedLabel(iso: string | null): string {
  return iso ? `Retrieved ${fmtDate(iso)}.` : "Retrieved date unavailable.";
}

export default async function Home() {
  const [rows, period, wall, smallMultiples, rxVsProc, filing, slope, throughput, stats, syncs] = await Promise.all([
    getQuarterlyRanking(25),
    getMostRecentQuarter(),
    getWallOfShame(5),
    getQuarterlySmallMultiples(10),
    getReceivedVsProcessedTimeline(),
    getAgenciesFilingPerQuarter(),
    getSlopeChartData(),
    getThroughputDuringTrump2(12),
    getEditorialStats(25),
    getLatestSyncByEachSource(),
  ]);
  const syncBySource = new Map(syncs.map((s) => [s.source, s]));
  const quarterlyRetrieved = retrievedLabel(
    syncBySource.get("quarterly-api")?.ended_at ?? null
  );
  const bulkRetrieved = retrievedLabel(
    syncBySource.get("bulk-csv")?.ended_at ?? null
  );
  const periodLabel = period
    ? fiscalQuarterShort(period.fy, period.q as FiscalQuarter)
    : "—";
  const periodDates = period
    ? fiscalQuarterDateRange(period.fy, period.q as FiscalQuarter)
    : "—";
  const prevQ = period
    ? period.q === 1
      ? fiscalQuarterShort(period.fy - 1, 4)
      : fiscalQuarterShort(period.fy, (period.q - 1) as FiscalQuarter)
    : "—";
  const prevQDates = period
    ? period.q === 1
      ? fiscalQuarterDateRange(period.fy - 1, 4)
      : fiscalQuarterDateRange(period.fy, (period.q - 1) as FiscalQuarter)
    : "—";

  // Throughput-derived anecdote stats (no fabrication; all from the bars
  // immediately below).
  const fallingBehindCount = throughput.filter((t) => t.catch_up_ratio < 1)
    .length;
  const worstThroughput = [...throughput].sort(
    (a, b) => a.catch_up_ratio - b.catch_up_ratio
  )[0];
  const latestStableBacklog = rxVsProc.points.at(-1)?.total_backlog ?? null;

  return (
    <SiteShell>
      <article className="mx-auto max-w-5xl w-full px-6 pt-10 md:pt-14 pb-6">
        <h1 className="font-display text-stone-900 text-4xl md:text-5xl lg:text-6xl leading-[1.08] tracking-tight text-balance">
          Investigating the federal <span className="italic">FOIA backlog</span>
        </h1>

        <p className="font-display text-stone-900 text-xl md:text-2xl leading-snug mt-8 max-w-3xl">
          Pending FOIA requests across the 10 largest stable-filing
          federal agencies climbed to{" "}
          <span className="tabular-nums font-semibold">
            {fmt(latestStableBacklog)}
          </span>{" "}
          by the end of {periodLabel} — the highest level on record, after
          Biden-era agencies had drawn the pile back near its FY2021
          starting level. Another 27 agencies, including the Department of
          Homeland Security, have stopped filing quarterly reports
          altogether.
        </p>
      </article>


      <section className="mx-auto max-w-5xl w-full px-6 mt-8">
        <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed max-w-3xl">
          <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
            Figure 1.
          </span>{" "}
          Combined pending FOIA requests across DOJ, DoD, HHS, DOT, EEOC,
          Labor, SEC, Interior, EPA, and Education at the end of each
          quarter. The pile climbed through Biden&rsquo;s first half,
          dropped back near its FY2021 starting level by mid-2024 as
          agencies caught up, then climbed to a new high through the first
          five quarters of the Trump administration.
        </figcaption>
        <div className="mt-4">
          <CumulativeNetChart data={rxVsProc} />
        </div>
        <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
          Source: FOIA.gov Quarterly Report API. {quarterlyRetrieved}
          DHS stopped filing quarterly reports after FY2025 Q3 — see
          Figure 2.{" "}
          <a
            href="/api/data/quarterly.csv"
            className="underline hover:text-stone-800"
            download
          >
            Download data (CSV)
          </a>
        </p>

        <div className="mt-16">
          <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed max-w-3xl">
            <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
              Figure 2.
            </span>{" "}
            Per-agency change in FOIA backlog from{" "}
            <span className="not-italic">{slope.baselineLabel}</span> (the
            last full quarter before the Trump administration) to{" "}
            <span className="not-italic">{slope.currentLabel}</span> (the
            most recent published quarter). Each line is one agency. Left
            dot = baseline backlog; right dot = current. Lines slanting up
            mean the pile grew; down means agencies caught up.
          </figcaption>
          <div className="figure-frame mt-4">
            <div className="hidden md:block">
              <SlopeChartInteractive
                data={slope}
                width={980}
                height={620}
                defaultTopN={10}
                expandedTopN={25}
              />
            </div>
            <div className="md:hidden">
              <SlopeMobileList
                data={slope}
                defaultTopN={10}
                expandedTopN={25}
              />
            </div>
          </div>

          {/* Dropout callout box */}
          <aside className="mt-6 border-l-2 border-red-700 bg-stone-50 px-5 py-4 max-w-3xl">
            <div className="text-xs font-display [font-variant-caps:small-caps] tracking-wider text-stone-900 mb-2">
              Why some agencies are missing
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              <span className="tabular-nums">{filing.total_dropouts}</span>{" "}
              federal agencies that had been filing quarterly FOIA reports
              stopped doing so during the Trump administration. The largest, by volume, is the Department of
              Homeland Security — the federal government&rsquo;s biggest
              FOIA filer at roughly 225,000 requests per quarter — which
              reported through{" "}
              <span className="not-italic">FY2025 Q3 (April–June 2025)</span>{" "}
              and stopped. Other notable absences include the Department
              of Veterans Affairs, the State Department, the Department of
              Agriculture, the Office of Personnel Management, the Office
              of the Director of National Intelligence, and the Office of
              Management and Budget. Outside reporting from{" "}
              <a
                href="https://notus.org/trump-white-house/trump-administration-dismantling-foia"
                className="underline hover:text-stone-900"
                target="_blank"
                rel="noreferrer"
              >
                NOTUS
              </a>
              , Federal News Network, and Poynter has confirmed a broader
              collapse in agency FOIA program staffing — eliminated FOIA
              offices at OPM and CDC, more than 50% staff cuts at the
              Department of Education, and missed annual reporting
              deadlines at DHS, OMB, and others. Their absence from this
              chart is itself a finding; see{" "}
              <Link href="/about" className="underline hover:text-stone-900">
                methodology
              </Link>{" "}
              for the full list.
            </p>
          </aside>

          <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
            Source: FOIA.gov Quarterly Report API. {quarterlyRetrieved}{" "}
            <a
              href="/api/data/slope.csv"
              className="underline hover:text-stone-800"
              download
            >
              Download chart data (CSV)
            </a>
          </p>
        </div>

        <div className="mt-16">
          <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed">
            <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
              Figure 3.
            </span>{" "}
            The 10 federal agencies with the largest current FOIA
            backlogs, one panel each, across every quarter the FOIA.gov
            Quarterly Report API exposes — FY2021 Q1 (Oct 1 – Dec 31, 2020)
            through{" "}
            {smallMultiples[0]?.series[
              smallMultiples[0].series.length - 1
            ]?.label.split(" (")[0] ?? "the latest quarter"}
            . Figure 1 shows the combined pile; this panel shows where it
            lives, agency by agency. The percentage is the change from the
            first quarter to the most recent. Click an agency for its full
            history.
          </figcaption>
          <div className="figure-frame mt-4">
            <QuarterlySmallMultiples data={smallMultiples} />
          </div>
          <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
            Source: FOIA.gov Quarterly Report API. {quarterlyRetrieved}
            Backlogged means perfected requests open more than twenty
            working days at quarter end. Each panel uses its own y-scale
            so the shape of each agency&rsquo;s trajectory reads at a
            glance — the absolute number above the line carries the
            comparison. Quarterly data does not exist before FY2021 Q1; for
            the longer view see the{" "}
            <Link href="/annual" className="underline hover:text-stone-800">
              17-year annual history
            </Link>
            .
          </p>
        </div>

        <div className="mt-16">
          <figcaption className="font-display italic text-stone-700 text-sm">
            <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
              Figure 4.
            </span>{" "}
            Where the gap is widest. Cumulative requests received versus
            requests processed for the top 12 agencies by request volume
            during the Trump administration (FY2025 Q1 onward). Dark =
            received, green = processed. The &ldquo;closed/received&rdquo;
            column is that ratio — anything below 100% means the queue
            grew.
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
            {stats.current_label}. {quarterlyRetrieved}{" "}
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
          FOIA requests at end of {periodLabel} ({periodDates}), with the
          trend across recent quarters and quarter-over-quarter change vs.{" "}
          {prevQ} ({prevQDates}). Federal fiscal year runs Oct 1 – Sept 30,
          named for the year it ends. Click any agency for its full history.
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
          Source: FOIA.gov Quarterly Report API. {quarterlyRetrieved}
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
            See 17-year annual history
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
            at end of FY{wall[0]?.fiscal_year} (Sept 30, {wall[0]?.fiscal_year}).
            The longest has been pending since before the iPhone shipped.
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
            Source: FOIA.gov bulk Annual Report CSVs, FY{wall[0]?.fiscal_year}
            ({fiscalYearDateRange(wall[0]?.fiscal_year ?? 2024)}).{" "}
            {bulkRetrieved}{" "}
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
                ZIPs, FY2008 through FY2024 (Oct 1, 2007 – Sept 30, 2024).
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
