import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { SITE_URL } from "@/lib/site";
import {
  fiscalQuarterDateRange,
  fiscalQuarterShort,
  fiscalYearDateRange,
  type FiscalQuarter,
} from "@/lib/fiscal";
import {
  getAnnualFindings,
  getLatestSyncByEachSource,
  getSiteFreshness,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About",
  description:
    "Methodology, data sources, freshness, and caveats for FOIA Tracker.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

function fmtNumber(value: number | null | undefined): string {
  return value == null ? "—" : value.toLocaleString();
}

function fmtPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function fmtPulled(iso: string | null | undefined): string {
  if (!iso) return "pull date unavailable";
  return `pulled ${new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default async function AboutPage() {
  const [freshness, annualFindings, syncs] = await Promise.all([
    getSiteFreshness(),
    getAnnualFindings(),
    getLatestSyncByEachSource(),
  ]);
  const syncBySource = new Map(syncs.map((sync) => [sync.source, sync]));
  const bulkPulled = fmtPulled(syncBySource.get("bulk-csv")?.ended_at);
  const quarterlyPulled = fmtPulled(
    syncBySource.get("quarterly-api")?.ended_at
  );
  const annualLabel = freshness.annual_fy
    ? `FY${freshness.annual_fy} (${fiscalYearDateRange(freshness.annual_fy)})`
    : "unknown";
  const quarterlyLabel =
    freshness.quarterly_fy && freshness.quarterly_q
      ? `${fiscalQuarterShort(
          freshness.quarterly_fy,
          freshness.quarterly_q as FiscalQuarter
        )} (${fiscalQuarterDateRange(
          freshness.quarterly_fy,
          freshness.quarterly_q as FiscalQuarter
        )})`
      : "unknown";
  const annualFy = freshness.annual_fy ?? 2025;
  const annualSpanYears = annualFy - 2008 + 1;

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl w-full px-6 py-10">
        <h1 className="font-display text-4xl text-stone-900">
          About FOIA Tracker
        </h1>
        <p className="text-stone-600 mt-3">
          A federal FOIA backlog dashboard. The data substrate behind American
          Oversight&rsquo;s thesis that not all federal agencies are equal when
          it comes to FOIA response times.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">What this is</h2>
          <p className="text-stone-700 mt-3">
            The FY{annualFindings?.latest_fy ?? annualFy} annual release shows{" "}
            {fmtNumber(annualFindings?.pending_latest)} requests still pending
            at year-end, {fmtPercent(annualFindings?.pending_change_pct)} from
            the prior year.
            {annualFindings?.pending_is_series_high
              ? " That is the highest total in 18 years of reports,"
              : " The current bulk release contains"}{" "}
            {annualFindings?.pending_is_series_high ? "even though it contains only" : ""}{" "}
            {annualFindings?.latest_filers ?? "—"} agency-overall reports.
          </p>
          <p className="text-stone-700 mt-3">
            American Oversight has done the analysis. Their{" "}
            <a
              href="https://americanoversight.org/not-all-federal-agencies-are-equal-when-it-comes-to-foia-response-times/"
              className="underline hover:text-stone-900"
              target="_blank"
              rel="noreferrer"
            >
              February 2025 article on agency response times
            </a>{" "}
            walked through the agency-level disparity. Their{" "}
            <a
              href="https://americanoversight.org/american-oversight-urges-congress-to-protect-and-strengthen-foia-during-unprecedented-attacks-on-transparency/"
              className="underline hover:text-stone-900"
              target="_blank"
              rel="noreferrer"
            >
              April 25, 2025 congressional testimony
            </a>{" "}
            named the structural breakdown. This site makes the federal report
            data underneath that problem easier to inspect, compare, and
            download. It is not affiliated with American Oversight.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            How federal fiscal years work
          </h2>
          <p className="text-stone-700 mt-3">
            Every FY label on this site is the US federal fiscal year, which
            runs Oct 1 through Sept 30 and is named for the year it ends.
            FY2024 = Oct 1, 2023 – Sept 30, 2024. FY2026 = Oct 1, 2025 –
            Sept 30, 2026.
          </p>
          <p className="text-stone-700 mt-3">
            Federal quarters split the year as follows:
          </p>
          <ul className="mt-2 space-y-1 text-stone-700 font-mono text-sm">
            <li>Q1 = Oct 1 – Dec 31 (in the prior calendar year)</li>
            <li>Q2 = Jan 1 – Mar 31</li>
            <li>Q3 = Apr 1 – Jun 30</li>
            <li>Q4 = Jul 1 – Sep 30</li>
          </ul>
          <p className="text-stone-700 mt-3">
            Presidential inaugurations always fall in Q2 (Jan 20), so any FY
            that contains an inauguration is a transition year split between
            two administrations. The clean fiscal years for each
            administration in our data window:
          </p>
          <ul className="mt-2 space-y-1 text-stone-700 text-sm">
            <li>
              <strong>Trump 1:</strong> FY2018, FY2019, FY2020 (Oct 1, 2017 –
              Sept 30, 2020)
            </li>
            <li>
              <strong>Biden:</strong> FY2022, FY2023, FY2024 (Oct 1, 2021 –
              Sept 30, 2024)
            </li>
            <li>
              <strong>Trump 2:</strong> FY2026 so far (Oct 1, 2025 – present),
              quarterly only — no annual published yet
            </li>
            <li className="text-stone-500">
              FY2017, FY2021, FY2025 are transition years; we footnote them
              rather than attributing to one administration.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">Data sources</h2>
          <ul className="mt-3 space-y-3 text-stone-700">
            <li>
              <strong>Annual Report bulk CSVs</strong> — FY2008 through FY
              {annualFy} (Oct 1, 2007 – Sept 30, {annualFy}), downloaded from{" "}
              <a
                href="https://www.foia.gov/foia-dataset-download.html"
                className="underline hover:text-stone-900"
              >
                FOIA.gov
              </a>
              . Public domain. Each ZIP contains 32 CSVs covering different
              report sections. Anonymous, no auth required.
            </li>
            <li>
              <strong>Quarterly FOIA Report API</strong> —{" "}
              <code className="text-xs">api.foia.gov/api/quarterly_foia_report</code>{" "}
              JSON:API endpoint. Most recent in the database: {quarterlyLabel}.
              Authenticated via api.data.gov key.
            </li>
          </ul>
          <p className="text-sm text-stone-500 mt-4">
            FOIA.gov also publishes Agency Components and annual XML APIs. The
            current FOIA Tracker pipeline does not ingest either one; they are
            not sources for the numbers shown here.
          </p>
        </section>

        <section id="freshness" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-2xl text-stone-900">
            Freshness reality
          </h2>
          <ul className="mt-3 space-y-2 text-stone-700">
            <li>
              <strong>Most recent annual:</strong> {annualLabel}. The FY2025
              bulk ZIP was published by FOIA.gov on June 9, 2026 and was{" "}
              {bulkPulled.replace(/^pulled /, "pulled into this database ")}.
            </li>
            <li>
              <strong>Most recent quarterly:</strong> {quarterlyLabel};{" "}
              {quarterlyPulled} from the API.
            </li>
            <li>
              <strong>Annual coverage:</strong>{" "}
              {annualFindings?.latest_filers ?? "—"} agency-overall reports in
              FY{annualFindings?.latest_fy ?? annualFy}, compared with{" "}
              {annualFindings?.prev_filers ?? "—"} in FY
              {annualFindings?.prev_fy ?? annualFy - 1}. Government-wide totals
              are not adjusted for missing reports.
            </li>
            <li>
              <strong>Update process:</strong> syncs are run manually after a
              source release is checked. No cron or automated poll is running.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Methodology
          </h2>
          <p className="text-stone-700 mt-3">
            The quarterly home page ranks agency-overall rows by the most
            recent published backlog, excluding the FOIA.gov &ldquo;All
            agencies&rdquo; meta-row. Quarter-over-quarter changes compare
            the same agency against the prior fiscal quarter when both rows
            exist.
          </p>
          <p className="text-stone-700 mt-3">
            The slope chart uses FY2025 Q1 (Oct 1 – Dec 31, 2024), the last
            full quarter before the Jan. 20, 2025 inauguration, as the
            baseline and compares it with the most recent published quarter.
            Agencies missing either endpoint are treated as reporting gaps,
            not inferred values.
          </p>
          <p className="text-stone-700 mt-3">
            The {annualSpanYears}-year annual view uses FY2008 through FY
            {annualFy} bulk annual CSVs. Quarterly &ldquo;backlog&rdquo; and
            annual
            &ldquo;pending&rdquo; are intentionally kept on separate views
            because FOIA.gov defines them differently.
          </p>
          <p className="text-stone-700 mt-3">
            Homepage annual findings compare FY{annualFindings?.prev_fy ?? 2024}
            {" "}with FY{annualFindings?.latest_fy ?? 2025} using agency-overall
            rows from the same bulk release. Staffing and pending-request
            changes are shown together as an editorial lead, not as proof that
            one caused the other.
          </p>
        </section>

        <section id="reporting-gaps" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-2xl text-stone-900">
            Agencies that have stopped filing
          </h2>
          <p className="text-stone-700 mt-3">
            15 federal agencies that had been reporting quarterly FOIA
            data last did so between April and December 2025 and have
            not filed since, through FY2026 Q3 (Apr–Jun 2026). The list,
            grouped by the last quarter each agency filed, with their
            FY2024 average requests received per quarter where available:
          </p>
          <h3 className="text-sm font-display [font-variant-caps:small-caps] tracking-wider text-stone-900 mt-5">
            Last filed FY2025 Q3 (April–June 2025)
          </h3>
          <ul className="text-sm text-stone-700 mt-2 space-y-1">
            <li>Department of Homeland Security (~225,168/q)</li>
            <li>Office of Management and Budget (~248/q)</li>
            <li>Council of the Inspectors General on Integrity and Efficiency (~52/q)</li>
            <li>U.S. Agency for Global Media (~44/q)</li>
          </ul>
          <h3 className="text-sm font-display [font-variant-caps:small-caps] tracking-wider text-stone-900 mt-5">
            Last filed FY2025 Q4 (July–September 2025)
          </h3>
          <ul className="text-sm text-stone-700 mt-2 space-y-1">
            <li>Department of Veterans Affairs (~23,774/q)</li>
            <li>Small Business Administration (~1,318/q)</li>
            <li>Office of National Drug Control Policy (~23/q)</li>
            <li>Office of the Intellectual Property Enforcement Coordinator (~11/q)</li>
            <li>National Capital Planning Commission (~9/q)</li>
          </ul>
          <h3 className="text-sm font-display [font-variant-caps:small-caps] tracking-wider text-stone-900 mt-5">
            Last filed FY2026 Q1 (October–December 2025)
          </h3>
          <ul className="text-sm text-stone-700 mt-2 space-y-1">
            <li>National Archives and Records Administration (~14,179/q)</li>
            <li>Office of Personnel Management (~242/q)</li>
            <li>Office of Special Counsel (~61/q)</li>
            <li>Institute of Museum and Library Services (~52/q)</li>
            <li>United States Access Board (~10/q)</li>
            <li>James Madison Memorial Fellowship Foundation (no FY2024 baseline)</li>
          </ul>
          <p className="text-stone-700 mt-5">
            Filing status churns rather than strictly shrinking. Several
            agencies that had gone dark for one or more quarters have
            since resumed: the Department of Agriculture, the General
            Services Administration and the Office of the United States
            Trade Representative now file steadily again, and the Office
            of the Director of National Intelligence returned with FY2026
            Q3 after missing one quarter. Several other agencies that
            earlier appeared to have stopped filing, including the State
            Department, the Consumer Financial Protection Bureau, the
            Federal Energy Regulatory Commission, the Inter-American
            Foundation, Amtrak and the Millennium Challenge Corporation,
            have since backfilled late reports and now show an unbroken
            run of filings through FY2026 Q3. In the other direction,
            12 agencies that filed FY2026 Q2 have no Q3 report in the
            current FOIA.gov data — among them the CIA, HUD, the FTC, and
            the Consumer Product Safety Commission. Several of those
            filed their Q2 reports months late, so some are likely late
            rather than gone; they are not counted in the list above. The
            National Archives and Records Administration — a top-ten FOIA
            agency at roughly 14,000 requests received per quarter in
            FY2024 — remains dark, with FY2026 Q1 its most recent
            filing.
          </p>
          <p className="text-stone-700 mt-5 leading-relaxed">
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
            collapse in agency FOIA program staffing — the entire
            public-records team at OPM was fired in February 2025; CDC&rsquo;s
            FOIA office was eliminated in April 2025; the Department of
            Education has lost more than half of its full-time FOIA staff;
            HUD has lost 40% of its FOIA staff; the Defense Technical
            Information Center&rsquo;s FOIA staff has been reduced to zero.
            FY2025 annual FOIA reports, due March 1, 2026, only began
            appearing in May 2026 — months past the statutory deadline.
            The June 9, 2026 bulk publication brought in most of the
            holdouts, including State, Treasury, Labor, Commerce,
            Education, and Energy. Six smaller entities — among them the
            U.S. Institute of Peace and the Council of the Inspectors
            General on Integrity and Efficiency — still had no FY2025
            annual report as of August 2026.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">Caveats</h2>
          <ul className="mt-3 space-y-2 text-stone-700">
            <li>
              All numbers are self-reported by agencies; definitions vary
              across agencies and across years.
            </li>
            <li>
              &ldquo;Backlog&rdquo; definitions are stretched by some
              agencies — for example, requests &ldquo;administratively
              closed&rdquo; without disposition.
            </li>
            <li>
              Exemption counts are invocations, not unique requests. A single
              response can invoke multiple exemptions.
            </li>
            <li>
              Component naming is inconsistent across years (USCIS vs.
              &ldquo;U.S. Citizenship and Immigration Services&rdquo;, etc.).
              We surface agency-overall totals in v1; component drill-down is
              a v2 feature.
            </li>
            <li>
              Agency Overall vs. component double-counting risk. We filter
              explicitly to &ldquo;Agency Overall&rdquo; rows when ranking, and
              exclude the &ldquo;All agencies&rdquo; meta-row.
            </li>
            <li>
              Intelligence community agencies report less detail by statute.
            </li>
            <li>
              Annual report schema variance across years means some field
              names move between FOIA.gov source versions. We map those at
              ingest time.
            </li>
            <li>
              DOJ retroactively revises prior years. Refreshes are manual, and
              the latest pull date is shown above and on the data page.
            </li>
            <li>
              The National Archives&rsquo; FY2024 Q2–Q4 quarterly reports on
              FOIA.gov carry numbers identical to its FY2023 Q2–Q4 filings —
              an apparent upstream reporting error, verified against the API
              in August 2026. Treat NARA&rsquo;s FY2024 quarterly line with
              caution.
            </li>
            <li>
              Ten-oldest &ldquo;days pending&rdquo; are working days, as
              agencies report them. Where an agency&rsquo;s reported days
              exceed the calendar days since its own received date — a
              reporting error; OPM&rsquo;s FY2025 filing contains one — we
              exclude the row from cross-agency superlatives but still show
              it on the agency&rsquo;s own page.
            </li>
            <li>
              The FY2016 bulk ZIP ships two CSVs for the headline section —
              the canonical file and a stray FY2018 file. We prefer the
              canonical file by name. (See{" "}
              <code className="text-xs">scripts/ingest/bulk-csv.ts</code>.)
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Refresh process
          </h2>
          <ul className="mt-3 space-y-2 text-stone-700">
            <li>
              All syncs are manual. The annual bulk ZIP and quarterly API are
              checked before an ingest is run.
            </li>
            <li>
              A newly opened quarter is not treated as current until agency
              coverage is substantial enough to support comparisons.
            </li>
            <li>All re-pulls are idempotent — safe to re-run.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Provenance
          </h2>
          <p className="text-stone-700 mt-3">
            Built by Trevor Brown. Open source under the MIT license. Not
            affiliated with American Oversight, the Department of Justice, or
            any other organization. Source data is public domain (US
            government works). Attribution is polite, not required.
          </p>
          <p className="text-stone-700 mt-3">
            Bug reports and data caveats welcome. Start at{" "}
            <Link href="/" className="underline hover:text-stone-900">
              the home page
            </Link>{" "}
            or browse{" "}
            <Link href="/agencies" className="underline hover:text-stone-900">
              the agency directory
            </Link>
            .
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
