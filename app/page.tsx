import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { QuarterlySmallMultiples } from "@/components/QuarterlySmallMultiples";
import { CumulativeNetChart } from "@/components/CumulativeNetChart";
import { BacklogTally } from "@/components/BacklogTally";
import { SlopeChartInteractive } from "@/components/SlopeChartInteractive";
import { SlopeMobileList } from "@/components/SlopeMobileList";
import { ThroughputPanel } from "@/components/ThroughputPanel";
import { MetricsExplainer } from "@/components/MetricsExplainer";
import {
  fiscalQuarterShort,
  fiscalQuarterDateRange,
  fiscalQuarterISORange,
  fiscalYearDateRange,
  type FiscalQuarter,
} from "@/lib/fiscal";
import {
  getAnnualFindings,
  getMostRecentQuarter,
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

function fmtMagnitude(pct: number | null): string {
  return pct == null ? "—" : `${Math.abs(pct).toFixed(1)}%`;
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
  const [annualFindings, period, smallMultiples, rxVsProc, filing, slope, throughput, stats, syncs] = await Promise.all([
    getAnnualFindings(),
    getMostRecentQuarter(),
    getQuarterlySmallMultiples(10),
    getReceivedVsProcessedTimeline(),
    getAgenciesFilingPerQuarter(),
    getSlopeChartData(),
    getThroughputDuringTrump2(12),
    getEditorialStats(25),
    getLatestSyncByEachSource(),
  ]);
  const syncBySource = new Map(syncs.map((s) => [s.source, s]));
  // Agencies whose last quarterly filing falls in the Trump 2 reporting
  // cliff (FY2025 Q3 through FY2026 Q1 = April to December 2025). Distinct
  // from filing.total_dropouts, which is the net loss from the peak filer
  // count and also reflects agencies that dropped before the cliff.
  const cliffDropoutCount = filing.points
    .filter((p) => (p.fy === 2025 && p.q >= 3) || (p.fy === 2026 && p.q === 1))
    .reduce((s, p) => s + p.dropouts.length, 0);
  const quarterlyRetrieved = retrievedLabel(
    syncBySource.get("quarterly-api")?.ended_at ?? null
  );
  const bulkRetrieved = retrievedLabel(
    syncBySource.get("bulk-csv")?.ended_at ?? null
  );

  // Throughput-derived anecdote stats (no fabrication; all from the bars
  // immediately below).
  const fallingBehindCount = throughput.filter((t) => t.catch_up_ratio < 1)
    .length;
  const worstThroughput = [...throughput].sort(
    (a, b) => a.catch_up_ratio - b.catch_up_ratio
  )[0];
  const stableTip = rxVsProc.points.at(-1) ?? null;
  const latestStableBacklog = stableTip?.total_backlog ?? null;
  // Whether the current stable-ten backlog is the series peak. Computed, not
  // asserted — cohort math can move the tip below an earlier high.
  const stableTipIsPeak =
    stableTip != null &&
    rxVsProc.points.every((p) => p.total_backlog <= stableTip.total_backlog);
  // Date the tally from the stable-ten series tip, not the site-wide period:
  // the timeline query drops quarters missing any of the ten, so its tip can
  // trail the most recent quarter in the table.
  const tallyEndIso = stableTip
    ? fiscalQuarterISORange(stableTip.fy, stableTip.q as FiscalQuarter).end
    : null;
  const tallyEndLabel = tallyEndIso
    ? new Date(tallyEndIso + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const tallyPeriodLabel = stableTip
    ? fiscalQuarterShort(stableTip.fy, stableTip.q as FiscalQuarter)
    : "—";

  // When the next quarterly drop should land: agencies file roughly six
  // weeks after a quarter closes. Derived from the most recent quarter we
  // hold so the footnote rolls forward on its own.
  const nextQ = period
    ? period.q === 4
      ? { fy: period.fy + 1, q: 1 as FiscalQuarter }
      : { fy: period.fy, q: (period.q + 1) as FiscalQuarter }
    : null;
  const nextQEndIso = nextQ ? fiscalQuarterISORange(nextQ.fy, nextQ.q).end : null;
  const nextQExpectedLabel = nextQEndIso
    ? new Date(
        new Date(nextQEndIso + "T00:00:00").getTime() + 42 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const heroFootnote =
    nextQ && nextQExpectedLabel
      ? `This is the newest quarter agencies have filed. New data lands on a lag — quarterly reports arrive roughly six weeks after a quarter closes, so ${fiscalQuarterShort(
          nextQ.fy,
          nextQ.q
        )} (${fiscalQuarterDateRange(
          nextQ.fy,
          nextQ.q
        )}) is expected around mid-${nextQExpectedLabel}. Annual reports run further behind: FY2025 published in June 2026.`
      : undefined;

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
              asOf={tallyEndLabel}
              unitLine="backlogged federal FOIA requests"
              sourceLine={`Across the 10 largest stable-filing agencies · ${tallyPeriodLabel} · FOIA.gov quarterly reports`}
              footnote={heroFootnote}
            />
          </div>
        )}

        <p className="font-display text-stone-900 text-xl md:text-2xl leading-snug mt-8 max-w-3xl">
          {stableTipIsPeak
            ? "The highest point in the quarterly series across the 10 largest stable-filing federal agencies"
            : "Near the peak of the quarterly series across the 10 largest stable-filing federal agencies"}{" "}
          — a reversal of the Biden-era catch-up that had
          drawn the pile back near its FY2021 starting level. Another{" "}
          <span className="tabular-nums">{cliffDropoutCount}</span>{" "}
          agencies, including the Department of Homeland Security, last
          filed a quarterly report between April and December 2025 and
          have not filed since.
        </p>
      </article>

      {annualFindings && (
        <section
          id="findings"
          className="mx-auto max-w-5xl w-full px-6 mt-8 scroll-mt-24"
        >
          <div className="border-t border-stone-300 pt-8">
            <div className="text-xs font-display [font-variant-caps:small-caps] tracking-wider text-stone-600">
              Latest findings
            </div>
            <div className="mt-2 flex items-end justify-between gap-6 flex-wrap">
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-stone-900 leading-tight">
                  What the newest annual reports show
                </h2>
                <p className="font-display italic text-stone-600 text-base mt-2 max-w-3xl">
                  FY{annualFindings.latest_fy} covers{" "}
                  {fiscalYearDateRange(annualFindings.latest_fy)}. These
                  figures are older but wider than the quarterly data above:
                  they count every open request at every reporting agency,
                  including the ones that no longer file quarterly, not just
                  overdue requests at the ten stable filers. That is why the
                  totals run several times larger.
                </p>
              </div>
              <Link
                href="/data"
                className="text-sm text-stone-600 underline hover:text-stone-900"
              >
                Inspect the source data
              </Link>
            </div>

            <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-px bg-stone-200 border border-stone-200">
              <Link
                href="/agencies"
                className="group bg-white p-6 hover:bg-stone-50 transition-colors"
              >
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Government-wide pending, all agencies
                </div>
                <div className="font-display text-4xl text-stone-900 mt-3 tabular-nums">
                  {fmt(annualFindings.pending_latest)}
                </div>
                <p className="text-sm text-stone-700 mt-3 leading-relaxed">
                  {fmtDelta(annualFindings.pending_change_pct)} from FY
                  {annualFindings.prev_fy}
                  {annualFindings.pending_is_series_high
                    ? " — the highest total in the 18-year series."
                    : "."}{" "}
                  The bulk release contains agency-overall reports from{" "}
                  {annualFindings.latest_filers} agencies.
                </p>
                <div className="font-display text-sm text-stone-900 mt-5 group-hover:underline">
                  See the annual ranking →
                </div>
              </Link>

              {annualFindings.homeland_security && (
                <Link
                  href={`/agency/${annualFindings.homeland_security.slug}`}
                  className="group bg-white p-6 hover:bg-stone-50 transition-colors"
                >
                  <div className="text-xs uppercase tracking-wide text-stone-500">
                    Homeland Security received
                  </div>
                  <div className="font-display text-4xl text-stone-900 mt-3 tabular-nums">
                    {fmt(annualFindings.homeland_security.received_latest)}
                  </div>
                  <p className="text-sm text-stone-700 mt-3 leading-relaxed">
                    {annualFindings.homeland_security.first_over_million
                      ? "The first agency in the 18-year series to cross one million requests in a fiscal year."
                      : `Requests received in FY${annualFindings.latest_fy}.`}{" "}
                    Its reported FOIA staffing fell{" "}
                    {fmtMagnitude(
                      annualFindings.homeland_security.staff_change_pct
                    )}{" "}
                    from FY{annualFindings.prev_fy}.
                  </p>
                  <div className="font-display text-sm text-stone-900 mt-5 group-hover:underline">
                    Explore DHS →
                  </div>
                </Link>
              )}

              {annualFindings.veterans_affairs && (
                <Link
                  href={`/agency/${annualFindings.veterans_affairs.slug}#staffing`}
                  className="group bg-white p-6 hover:bg-stone-50 transition-colors"
                >
                  <div className="text-xs uppercase tracking-wide text-stone-500">
                    Veterans Affairs staffing
                  </div>
                  <div className="font-display text-4xl text-stone-900 mt-3 tabular-nums">
                    {fmtDelta(
                      annualFindings.veterans_affairs.staff_change_pct
                    )}
                  </div>
                  <p className="text-sm text-stone-700 mt-3 leading-relaxed">
                    Reported FOIA staffing fell from{" "}
                    {annualFindings.veterans_affairs.staff_prev?.toFixed(1)} to{" "}
                    {annualFindings.veterans_affairs.staff_latest?.toFixed(1)}
                    {" "}FTE while pending requests rose{" "}
                    {fmtDelta(
                      annualFindings.veterans_affairs.pending_change_pct
                    )}
                    .
                  </p>
                  <div className="font-display text-sm text-stone-900 mt-5 group-hover:underline">
                    Explore Veterans Affairs →
                  </div>
                </Link>
              )}
            </div>

            <p className="font-display text-xs italic text-stone-600 mt-3 max-w-4xl leading-snug">
              Source: FOIA.gov bulk Annual Report CSVs.{" "}
              {annualFindings.latest_fy === 2025
                ? "FY2025 was published June 9, 2026. "
                : ""}
              {bulkRetrieved} Comparisons use agency-overall rows from the
              same annual source; they show what changed together, not what
              caused the change.
              {annualFindings.latest_filers < annualFindings.prev_filers
                ? ` FY${annualFindings.latest_fy} totals remain partial because not every expected agency had filed.`
                : ""}
            </p>

            <MetricsExplainer variant="detailed" className="mt-10" />
          </div>
        </section>
      )}


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
          up, then climbed to a new high under the Trump
          administration.
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
              <span className="tabular-nums">{cliffDropoutCount}</span>{" "}
              federal agencies that had been filing quarterly FOIA reports
              last did so between April and December 2025 and have not
              filed since. The largest, by volume, is the Department of
              Homeland Security — the federal government&rsquo;s biggest
              FOIA filer at roughly 225,000 requests per quarter — whose
              last filing was{" "}
              <span className="not-italic">FY2025 Q3 (April–June 2025)</span>, reporting a backlog of 269,788 requests —
              larger than every still-filing agency combined. Other
              notable absences include the Department of Veterans
              Affairs, the National Archives and Records Administration,
              the Office of Personnel Management, and the Office of
              Management and Budget. The Office
              of the Director of National Intelligence resumed filing
              with FY2026 Q3 after missing one quarter.
              Outside reporting from{" "}
              <a
                href="https://notus.org/trump-white-house/trump-administration-dismantling-foia"
                className="underline hover:text-stone-900"
                target="_blank"
                rel="noreferrer"
              >
                NOTUS
              </a>
              ,{" "}
              <a
                href="https://federalnewsnetwork.com/agency-oversight/2026/03/significant-staff-cuts-drive-rising-foia-backlogs/"
                className="underline hover:text-stone-900"
                target="_blank"
                rel="noreferrer"
              >
                Federal News Network
              </a>
              , and{" "}
              <a
                href="https://www.poynter.org/reporting-editing/2025/public-records-requests-trump-administration-federal-government-foia/"
                className="underline hover:text-stone-900"
                target="_blank"
                rel="noreferrer"
              >
                Poynter
              </a>{" "}
              has confirmed a broader
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
              received over that stretch. The widest gap was at{" "}
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
              href="https://americanoversight.org/not-all-federal-agencies-are-equal-when-it-comes-to-foia-response-times/"
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
                ZIPs, FY2008 through FY2025 (Oct 1, 2007 – Sept 30, 2025).
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
