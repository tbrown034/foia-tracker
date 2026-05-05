import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Sparkline } from "@/components/Sparkline";
import { QuarterlySmallMultiples } from "@/components/QuarterlySmallMultiples";
import { CumulativeNetChart } from "@/components/CumulativeNetChart";
import { BacklogTally } from "@/components/BacklogTally";
import { SlopeChartInteractive } from "@/components/SlopeChartInteractive";
import { SlopeMobileList } from "@/components/SlopeMobileList";
import { ThroughputPanel } from "@/components/ThroughputPanel";
import { MetricsExplainer } from "@/components/MetricsExplainer";
import { quarterlyMarkers } from "@/lib/admin-transitions";
import {
  fiscalQuarterShort,
  fiscalQuarterDateRange,
  fiscalQuarterISORange,
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
  const periodEndIso = period
    ? fiscalQuarterISORange(period.fy, period.q as FiscalQuarter).end
    : null;
  const periodEndLabel = periodEndIso
    ? new Date(periodEndIso + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <SiteShell>
      <article className="mx-auto max-w-5xl w-full px-6 pt-10 md:pt-14 pb-6">
        <h1 className="font-display text-stone-900 text-4xl md:text-5xl lg:text-6xl leading-[1.08] tracking-tight text-balance">
          Investigating the federal <span className="italic">FOIA backlog</span>
        </h1>

        {latestStableBacklog != null && (
          <div className="mt-8">
            <BacklogTally
              value={latestStableBacklog}
              asOf={periodEndLabel}
              unitLine="pending federal FOIA requests"
              sourceLine={`Across the 10 largest stable-filing agencies · ${periodLabel} · FOIA.gov quarterly reports`}
            />
          </div>
        )}

        <p className="font-display text-stone-900 text-xl md:text-2xl leading-snug mt-8 max-w-3xl">
          The highest level on record across the 10 largest stable-filing
          federal agencies — a reversal of the Biden-era catch-up that had
          drawn the pile back near its FY2021 starting level. Another 27
          agencies, including the Department of Homeland Security, last
          filed a quarterly report between April and December 2025 and
          have not filed since.
        </p>
      </article>


      <section className="mx-auto max-w-5xl w-full px-6 mt-8">
        <h2 className="font-display text-3xl md:text-4xl text-stone-900 leading-tight max-w-3xl">
          The pile, over time
        </h2>
        <p className="font-display italic text-stone-600 text-base mt-2 max-w-3xl">
          Combined backlog of the 10 largest stable-filing agencies, every
          quarter from FY2021 to today.
        </p>
        <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed max-w-3xl mt-6">
          The pile climbed through Biden&rsquo;s first half, dropped back
          near its FY2021 starting level by mid-2024 as agencies caught
          up, then climbed to a new high through the first five quarters
          of the Trump administration.
        </figcaption>
        <div className="mt-4">
          <CumulativeNetChart data={rxVsProc} />
        </div>
        <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
          Source: FOIA.gov Quarterly Report API. {quarterlyRetrieved} DHS
          stopped filing after FY2025 Q3.{" "}
          <a
            href="/api/data/quarterly.csv"
            className="underline hover:text-stone-800"
            download
          >
            Download data (CSV)
          </a>
        </p>

        <div className="mt-20">
          <h2 className="font-display text-3xl md:text-4xl text-stone-900 leading-tight max-w-3xl">
            Which agencies moved
          </h2>
          <p className="font-display italic text-stone-600 text-base mt-2 max-w-3xl">
            Per-agency change in FOIA backlog from the last full quarter
            before Trump took office to today.
          </p>
          <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed max-w-3xl mt-6">
            Each line is one agency from{" "}
            <span className="not-italic">{slope.baselineLabel}</span> (the
            last full quarter before Trump) to{" "}
            <span className="not-italic">{slope.currentLabel}</span> (the
            most recent published quarter). Lines slanting up mean the
            pile grew; down means the agency caught up.
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
              last did so between April and December 2025 and have not
              filed since. The largest, by volume, is the Department of
              Homeland Security — the federal government&rsquo;s biggest
              FOIA filer at roughly 225,000 requests per quarter — whose
              last filing was{" "}
              <span className="not-italic">FY2025 Q3 (April–June 2025)</span>. Other notable absences include the Department
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

        <div className="mt-20">
          <h2 className="font-display text-3xl md:text-4xl text-stone-900 leading-tight max-w-3xl">
            Trajectories, agency by agency
          </h2>
          <p className="font-display italic text-stone-600 text-base mt-2 max-w-3xl">
            Five years of quarterly backlog data for each of the 10
            largest filers, side by side.
          </p>
          <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed mt-6 max-w-3xl">
            One panel per agency, FY2021 Q1 (Oct 1 – Dec 31, 2020) through{" "}
            {smallMultiples[0]?.series[
              smallMultiples[0].series.length - 1
            ]?.label.split(" (")[0] ?? "the latest quarter"}
            . The percentage on each panel is the change from the first
            quarter to the most recent. Click an agency for its full
            history.
          </figcaption>
          <div className="figure-frame mt-4">
            <QuarterlySmallMultiples data={smallMultiples} />
          </div>
          <p className="font-display text-xs italic text-stone-600 mt-3 max-w-3xl leading-snug">
            Source: FOIA.gov Quarterly Report API. {quarterlyRetrieved}{" "}
            Each panel uses its own y-scale so the shape reads at a
            glance; the number above the line carries the comparison. For
            history before FY2021 see the{" "}
            <Link href="/agencies" className="underline hover:text-stone-800">
              the agency directory
            </Link>
            .
          </p>
        </div>

        <div className="mt-20">
          <h2 className="font-display text-3xl md:text-4xl text-stone-900 leading-tight max-w-3xl">
            Why the pile is growing
          </h2>
          <p className="font-display italic text-stone-600 text-base mt-2 max-w-3xl">
            Requests are coming in faster than agencies are closing them.
          </p>
          <figcaption className="font-display italic text-stone-700 text-sm leading-relaxed mt-6 max-w-3xl">
            Top 12 agencies by request volume during the Trump
            administration (FY2025 Q1 onward), with cumulative received
            vs. cumulative processed. Dark = received, green = processed.
            The &ldquo;closed/received&rdquo; column is that ratio —
            anything below 100% means the queue grew.
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
