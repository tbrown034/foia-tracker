import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import {
  getDatasetCounts,
  getLatestSyncByEachSource,
  getMostRecentQuarter,
} from "@/lib/queries";
import {
  fiscalQuarterDateRange,
  fiscalQuarterShort,
  type FiscalQuarter,
} from "@/lib/fiscal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data downloads — FOIA Tracker",
  description:
    "Every dataset behind FOIA Tracker, downloadable as CSV. Public domain. Schema docs included.",
};

type Dataset = {
  key: string;
  name: string;
  description: string;
  source: string;
  columns: string[];
  csvUrl: string;
  svgUrl?: string;
  countKey: keyof Awaited<ReturnType<typeof getDatasetCounts>>;
};

const DATASETS: Dataset[] = [
  {
    key: "annual",
    name: "Annual report — headline",
    description:
      "Per agency-component, per fiscal year: requests pending at start, received, processed, pending at end. The core long-term series.",
    source: "FOIA.gov bulk Annual Report ZIPs (FY2008–FY2024)",
    columns: [
      "agency",
      "component",
      "fiscal_year",
      "pending_start",
      "received",
      "processed",
      "pending_end",
    ],
    csvUrl: "/api/data/annual.csv",
    countKey: "annual",
  },
  {
    key: "quarterly",
    name: "Quarterly report",
    description:
      "Per agency, per fiscal-year quarter: received, processed, backlogged. The freshest series.",
    source: "FOIA.gov Quarterly Report JSON:API",
    columns: [
      "agency",
      "component",
      "fiscal_year",
      "fiscal_quarter",
      "received",
      "processed",
      "backlog",
    ],
    csvUrl: "/api/data/quarterly.csv",
    countKey: "quarterly",
  },
  {
    key: "oldest-pending",
    name: "10 oldest pending requests",
    description:
      "Per agency, per fiscal year: the 10 oldest unanswered requests still open at year-end, with their original filing dates and days pending. Litigation-priority data.",
    source: "FOIA.gov bulk Annual Report ZIPs",
    columns: [
      "agency",
      "component",
      "fiscal_year",
      "rank",
      "date_received",
      "days_pending",
    ],
    csvUrl: "/api/data/oldest-pending.csv",
    countKey: "oldest_pending",
  },
  {
    key: "exemptions",
    name: "Exemption invocations",
    description:
      "Per agency, per fiscal year, per FOIA exemption (b1–b9): how often the agency invoked that exemption when redacting or denying records. Counts are per invocation, not per request.",
    source: "FOIA.gov bulk Annual Report ZIPs",
    columns: [
      "agency",
      "component",
      "fiscal_year",
      "exemption",
      "invocations",
    ],
    csvUrl: "/api/data/exemptions.csv",
    countKey: "exemptions",
  },
  {
    key: "personnel",
    name: "FOIA personnel",
    description:
      "Per agency, per fiscal year: full-time FOIA employees, equivalent FTE, total full-time staff. The denominator behind processing-time arguments.",
    source: "FOIA.gov bulk Annual Report ZIPs",
    columns: [
      "agency",
      "component",
      "fiscal_year",
      "full_time",
      "equivalent_fte",
      "total_fte",
    ],
    csvUrl: "/api/data/personnel.csv",
    countKey: "personnel",
  },
  {
    key: "slope",
    name: "Slope chart — pre/post Trump",
    description:
      "Pre-computed snapshot for the home-page slope chart: each agency's quarterly backlog at FY2025 Q1 (Oct 1 – Dec 31, 2024, the last full quarter before Trump's Jan. 20, 2025 inauguration) versus the most recent published quarter, with absolute and percentage change.",
    source: "Derived from quarterly report data",
    columns: [
      "agency",
      "baseline_period",
      "baseline_backlog",
      "current_period",
      "current_backlog",
      "delta_abs",
      "delta_pct",
    ],
    csvUrl: "/api/data/slope.csv",
    svgUrl: "/api/chart/slope.svg",
    countKey: "quarterly",
  },
];

function fmtTime(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DataPage() {
  const [counts, syncs, latestQuarter] = await Promise.all([
    getDatasetCounts(),
    getLatestSyncByEachSource(),
    getMostRecentQuarter(),
  ]);

  const syncBySource = new Map(syncs.map((s) => [s.source, s]));
  const bulkSync = syncBySource.get("bulk-csv");
  const quarterlySync = syncBySource.get("quarterly-api");
  const latestQuarterLabel = latestQuarter
    ? `${fiscalQuarterShort(
        latestQuarter.fy,
        latestQuarter.q as FiscalQuarter
      )} (${fiscalQuarterDateRange(
        latestQuarter.fy,
        latestQuarter.q as FiscalQuarter
      )})`
    : "unknown";

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl w-full px-6 py-10">
        <div className="text-xs uppercase tracking-wide text-stone-500">
          Open data
        </div>
        <h1 className="font-display text-4xl text-stone-900 mt-1">
          Download every dataset behind this site
        </h1>
        <p className="text-stone-600 mt-3 max-w-2xl">
          Source data is public domain (US government works). Mirrors of the
          FOIA.gov bulk CSVs and the Quarterly Report API, normalized into
          Postgres and re-exported as RFC 4180 CSV. Filter by agency name in
          your spreadsheet of choice; no auth required.
        </p>

        {/* Pipeline freshness */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Annual ingest
            </div>
            <div className="font-display text-xl text-stone-900 mt-2">
              {fmtTime(bulkSync?.ended_at ?? null)}
            </div>
            <div className="text-sm text-stone-500 mt-1">
              {bulkSync?.records?.toLocaleString() ?? "—"} rows ingested.
              Bulk CSV ZIPs FY2008–FY2024.
            </div>
          </div>
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Quarterly ingest
            </div>
            <div className="font-display text-xl text-stone-900 mt-2">
              {fmtTime(quarterlySync?.ended_at ?? null)}
            </div>
            <div className="text-sm text-stone-500 mt-1">
              {quarterlySync?.records?.toLocaleString() ?? "—"} rows
              ingested. Latest quarter: {latestQuarterLabel}.
            </div>
          </div>
        </section>

        {/* Datasets */}
        <section className="mt-10 space-y-6">
          {DATASETS.map((d) => (
            <article
              key={d.key}
              className="border border-stone-200 rounded-lg p-6"
            >
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h2 className="font-display text-2xl text-stone-900">
                  {d.name}
                </h2>
                <div className="font-mono text-sm text-stone-500 tabular-nums">
                  {counts[d.countKey]?.toLocaleString() ?? "—"} rows
                </div>
              </div>
              <p className="text-stone-700 mt-2">
                {d.description}
                {d.key === "quarterly"
                  ? ` Most recent in the database: ${latestQuarterLabel}.`
                  : ""}
              </p>
              <div className="text-xs text-stone-500 mt-3">
                Source: {d.source}
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Columns
                </div>
                <div className="mt-1 font-mono text-xs text-stone-700 leading-relaxed">
                  {d.columns.join(", ")}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4 flex-wrap">
                <a
                  href={d.csvUrl}
                  className="inline-block px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded hover:bg-stone-800"
                  download
                >
                  Download CSV
                </a>
                {d.svgUrl && (
                  <a
                    href={d.svgUrl}
                    className="inline-block px-4 py-2 border border-stone-300 text-stone-700 text-sm font-medium rounded hover:bg-stone-50"
                    download
                  >
                    Download chart (SVG)
                  </a>
                )}
                <code className="text-xs text-stone-500 font-mono">
                  {d.csvUrl}
                </code>
              </div>
            </article>
          ))}
        </section>

        {/* Notes */}
        <section className="mt-12 border-t border-stone-200 pt-8">
          <h2 className="font-display text-2xl text-stone-900">
            Using the data
          </h2>
          <ul className="mt-4 space-y-3 text-stone-700">
            <li>
              <strong>License.</strong> US government works are public
              domain. Attribution to FOIA.gov and FOIA Tracker is polite but
              not legally required.
            </li>
            <li>
              <strong>Refresh cadence.</strong> Bulk CSVs monthly, quarterly
              API weekly during a published quarter. All ingest scripts are
              idempotent — re-running them upserts in place.
            </li>
            <li>
              <strong>Schema.</strong> Postgres source-of-truth lives in{" "}
              <code className="text-xs">scripts/schema.sql</code> in the
              repo. Each CSV column maps 1:1 to a database column.
            </li>
            <li>
              <strong>Caveats.</strong> Numbers are self-reported by
              agencies; definitions vary across years. See{" "}
              <Link href="/about" className="underline hover:text-stone-900">
                the about page
              </Link>{" "}
              for the full caveat list before doing analysis.
            </li>
            <li>
              <strong>API access.</strong> Each CSV URL is a stable HTTP
              endpoint — script against it directly. Cache headers allow
              public, 5-minute caching.
            </li>
          </ul>
        </section>
      </div>
    </SiteShell>
  );
}
