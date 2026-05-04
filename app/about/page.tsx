import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";

export const metadata = {
  title: "About — FOIA Tracker",
  description:
    "Methodology, data sources, freshness, and caveats for FOIA Tracker.",
};

export default function AboutPage() {
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
            to more than 30,000 pending requests by end of FY25. State
            Department&rsquo;s backlog grew from roughly 21,000 to 27,619 in
            one fiscal year. CDC&rsquo;s entire FOIA office was eliminated in
            April 2025. OPM lost all of its FOIA staff.
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
          <h2 className="font-display text-2xl text-stone-900">Data sources</h2>
          <ul className="mt-3 space-y-3 text-stone-700">
            <li>
              <strong>Annual Report bulk CSVs</strong> — FY2008 through FY2024,
              downloaded from{" "}
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
              JSON:API endpoint. Most recent: FY2026 Q2 (data through March 31,
              2026). Authenticated via api.data.gov key.
            </li>
            <li>
              <strong>Agency Components API</strong> —{" "}
              <code className="text-xs">api.foia.gov/api/agency_components</code>
              . Used for canonical agency naming.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Freshness reality
          </h2>
          <ul className="mt-3 space-y-2 text-stone-700">
            <li>
              <strong>Most recent annual:</strong> FY2024 (data through Sept
              30, 2024; published April 2025; about 8 months stale).
            </li>
            <li>
              <strong>Most recent quarterly:</strong> FY2026 Q2 (data through
              March 31, 2026; about 5 weeks stale).
            </li>
            <li>
              <strong>FY2025 annual report:</strong> not yet published as of
              May 2026. DOJ OIP appears late this year. We poll daily.
            </li>
          </ul>
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
            <Link href="/annual" className="underline hover:text-stone-900">
              the 17-year annual history
            </Link>
            .
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
