import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import {
  fiscalQuarterDateRange,
  fiscalQuarterShort,
  fiscalYearDateRange,
  type FiscalQuarter,
} from "@/lib/fiscal";
import { getSiteFreshness } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About — FOIA Tracker",
  description:
    "Methodology, data sources, freshness, and caveats for FOIA Tracker.",
};

export default async function AboutPage() {
  const freshness = await getSiteFreshness();
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
  const fy2025AnnualStatus =
    freshness.annual_fy != null && freshness.annual_fy >= 2025
      ? "present in the current database."
      : "not yet published in the current database. The Department of Justice Office of Information Policy is running late this year. We poll daily.";

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
            Federal FOIA backlogs are exploding. DoD&rsquo;s backlog grew 42%
            to more than 30,000 pending requests by end of FY2025 (Sept 30,
            2025). State Department&rsquo;s backlog grew from roughly 21,000
            to 27,619 in one fiscal year. CDC&rsquo;s entire FOIA office was
            eliminated in April 2025. OPM lost all of its FOIA staff.
          </p>
          <p className="text-stone-700 mt-3">
            American Oversight has done the analysis. Their February 2025
            article &ldquo;Not All Federal Agencies Are Equal When It Comes to
            FOIA Response Times&rdquo; walked through the agency-level
            disparity. Their{" "}
            <a
              href="https://americanoversight.org/american-oversight-urges-congress-to-protect-and-strengthen-foia-during-unprecedented-attacks-on-transparency/"
              className="underline hover:text-stone-900"
            >
              April 25, 2025 congressional testimony
            </a>{" "}
            named the structural breakdown. Both pieces are static. This site
            is the live, queryable version.
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
              <strong>Annual Report bulk CSVs</strong> — FY2008 through FY2024
              (Oct 1, 2007 – Sept 30, 2024), downloaded from{" "}
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
            <li>
              <strong>Agency Components API</strong> —{" "}
              <code className="text-xs">api.foia.gov/api/agency_components</code>
              . Used for canonical agency naming.
            </li>
            <li>
              <strong>Annual report XML</strong> — per-agency, per-year NIEM
              XML from{" "}
              <code className="text-xs">api.foia.gov/api/annual-report-xml</code>
              . Reserved for deeper component-level drill-down; the MVP uses
              bulk CSVs for historical seeding.
            </li>
          </ul>
        </section>

        <section id="freshness" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-2xl text-stone-900">
            Freshness reality
          </h2>
          <ul className="mt-3 space-y-2 text-stone-700">
            <li>
              <strong>Most recent annual:</strong> {annualLabel}.
            </li>
            <li>
              <strong>Most recent quarterly:</strong> {quarterlyLabel}.
            </li>
            <li>
              <strong>FY2025 annual report:</strong> Oct 1, 2024 –
              Sept 30, 2025; {fy2025AnnualStatus}
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
            The 17-year annual view uses FY2008 through FY2024 bulk annual
            CSVs. Quarterly &ldquo;backlog&rdquo; and annual
            &ldquo;pending&rdquo; are intentionally kept on separate views
            because FOIA.gov defines them differently.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Agencies that have stopped filing
          </h2>
          <p className="text-stone-700 mt-3">
            27 federal agencies that had been reporting quarterly FOIA
            data last did so between April and December 2025 and have
            not filed since. None of them filed FY2026 Q2 (Jan–Mar
            2026). The list, grouped by the last quarter each agency
            filed, with their FY2024 average requests received per
            quarter where available:
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
            <li>General Services Administration (~387/q)</li>
            <li>National Railroad Passenger Corporation (~187/q)</li>
            <li>Office of the United States Trade Representative (~34/q)</li>
            <li>Office of National Drug Control Policy (~23/q)</li>
            <li>United States Trade and Development Agency (~20/q)</li>
            <li>Millennium Challenge Corporation (~18/q)</li>
            <li>Office of the Intellectual Property Enforcement Coordinator (~11/q)</li>
            <li>National Capital Planning Commission (~9/q)</li>
            <li>Office of Science and Technology Policy (~54/q)</li>
          </ul>
          <h3 className="text-sm font-display [font-variant-caps:small-caps] tracking-wider text-stone-900 mt-5">
            Last filed FY2026 Q1 (October–December 2025)
          </h3>
          <ul className="text-sm text-stone-700 mt-2 space-y-1">
            <li>U.S. Department of State (~5,473/q)</li>
            <li>Department of Agriculture (~4,242/q)</li>
            <li>Consumer Financial Protection Bureau (~244/q)</li>
            <li>Office of Personnel Management (~242/q)</li>
            <li>Consumer Product Safety Commission (~196/q)</li>
            <li>Council on Environmental Quality (~105/q)</li>
            <li>Office of the Director of National Intelligence (~103/q)</li>
            <li>Office of Special Counsel (~61/q)</li>
            <li>Institute of Museum and Library Services (~52/q)</li>
            <li>Federal Energy Regulatory Commission (~33/q)</li>
            <li>Inter-American Foundation (~13/q)</li>
            <li>United States Access Board (~10/q)</li>
          </ul>
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
            , Federal News Network, and Poynter has confirmed a broader
            collapse in agency FOIA program staffing — the entire
            public-records team at OPM was fired in February 2025; CDC&rsquo;s
            FOIA office was eliminated in April 2025; the Department of
            Education has lost more than half of its full-time FOIA staff;
            HUD has lost 40% of its FOIA staff; the Defense Technical
            Information Center&rsquo;s FOIA staff has been reduced to zero.
            DHS, OMB, and HHS had not filed their FY2025 annual FOIA
            reports as of late April 2026, weeks past the March 1 statutory
            deadline.
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
              DOJ retroactively revises prior years. We re-pull bulk CSVs
              monthly.
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
            Refresh cadence
          </h2>
          <ul className="mt-3 space-y-2 text-stone-700">
            <li>Bulk CSVs: monthly cron.</li>
            <li>Quarterly API: weekly cron during a published quarter.</li>
            <li>
              Annual XML for the current FY: daily poll until 200, then
              weekly.
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
