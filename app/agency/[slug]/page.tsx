import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { Sparkline } from "@/components/Sparkline";
import { ExemptionBars } from "@/components/ExemptionBars";
import { MetricsExplainer } from "@/components/MetricsExplainer";
import { annualMarkers, quarterlyMarkers } from "@/lib/admin-transitions";
import {
  fiscalQuarterLabel,
  fiscalYearDateRange,
  type FiscalQuarter,
} from "@/lib/fiscal";
import {
  getAgencyDetail,
  getAllAgencySlugs,
  getAgencyOldestPending,
  getAgencyExemptions,
  getAgencyPersonnel,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getAgencyDetail(slug);
  if (!detail) return { title: "Agency not found — FOIA Tracker" };
  return {
    title: `${detail.agency} — FOIA Tracker`,
    description: `FOIA backlog and processing data for ${detail.agency}, FY2008 through the most recent quarterly report.`,
  };
}

export default async function AgencyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getAgencyDetail(slug);
  if (!detail) notFound();

  const [oldestPending, exemptions, personnel] = await Promise.all([
    getAgencyOldestPending(detail.agency, 2024),
    getAgencyExemptions(detail.agency, 2024),
    getAgencyPersonnel(detail.agency),
  ]);

  const annual = detail.annual;
  const quarterly = detail.quarterly;
  const latestPersonnel = personnel[personnel.length - 1];
  const latestAnnual = annual[annual.length - 1];
  const latestQuarter = quarterly[quarterly.length - 1];
  const firstAnnual = annual[0];

  const annualSeries = annual.map((r) => ({ x: r.fiscal_year, y: r.pending_end }));
  const quarterlyBacklogSeries = quarterly.map((r) => ({
    x: r.fiscal_year * 4 + r.fiscal_quarter,
    y: r.backlog,
  }));
  const quarterlyReceivedSeries = quarterly.map((r) => ({
    x: r.fiscal_year * 4 + r.fiscal_quarter,
    y: r.received,
  }));
  const quarterlyProcessedSeries = quarterly.map((r) => ({
    x: r.fiscal_year * 4 + r.fiscal_quarter,
    y: r.processed,
  }));

  const annualWindowChange =
    firstAnnual?.pending_end != null && latestAnnual?.pending_end != null
      ? ((latestAnnual.pending_end - firstAnnual.pending_end) /
          (firstAnnual.pending_end || 1)) *
        100
      : null;

  const allAgencies = await getAllAgencySlugs();
  const idx = allAgencies.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? allAgencies[idx - 1] : null;
  const next = idx >= 0 && idx < allAgencies.length - 1 ? allAgencies[idx + 1] : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl w-full px-6 py-10">
        <Link
          href="/"
          className="text-xs text-stone-500 hover:text-stone-900"
        >
          ← All agencies
        </Link>
        <h1 className="font-display text-4xl text-stone-900 mt-2">
          {detail.agency}
        </h1>

        {/* Headline numbers */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Most recent quarterly backlog
            </div>
            <div className="font-display text-3xl text-stone-900 mt-2">
              {fmt(latestQuarter?.backlog ?? null)}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {latestQuarter
                ? `End of ${fiscalQuarterLabel(latestQuarter.fiscal_year, latestQuarter.fiscal_quarter as FiscalQuarter)}`
                : "Not in quarterly reporting"}
            </div>
          </div>
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Latest annual report
            </div>
            <div className="font-display text-3xl text-stone-900 mt-2">
              {fmt(latestAnnual?.pending_end ?? null)}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {latestAnnual
                ? `End of FY${latestAnnual.fiscal_year} (Sept 30, ${latestAnnual.fiscal_year})`
                : "End of FY—"}
            </div>
          </div>
          <div className="border border-stone-200 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              17-year change
            </div>
            <div
              className={`font-display text-3xl mt-2 ${
                annualWindowChange == null
                  ? "text-stone-400"
                  : annualWindowChange > 0
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}
            >
              {annualWindowChange == null
                ? "—"
                : `${annualWindowChange > 0 ? "+" : ""}${annualWindowChange.toFixed(0)}%`}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {firstAnnual && latestAnnual
                ? `FY${firstAnnual.fiscal_year} → FY${latestAnnual.fiscal_year} (Oct 1, ${firstAnnual.fiscal_year - 1} – Sept 30, ${latestAnnual.fiscal_year})`
                : "FY— → FY—"}
            </div>
          </div>
        </div>

        {/* Annual sparkline */}
        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Annual backlog, FY{firstAnnual?.fiscal_year ?? "—"}–FY
            {latestAnnual?.fiscal_year ?? "—"}
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Pending requests at end of each fiscal year
            {firstAnnual && latestAnnual
              ? ` (Oct 1, ${firstAnnual.fiscal_year - 1} – Sept 30, ${latestAnnual.fiscal_year})`
              : ""}
            . Federal fiscal year runs Oct 1 – Sept 30, named for the year
            it ends.
          </p>
          <div className="mt-4 border border-stone-200 rounded-lg p-6 bg-white fluid-svg">
            <Sparkline
              data={annualSeries}
              width={900}
              height={200}
              stroke="#1c1917"
              fill="#1c1917"
              markers={annualMarkers()}
              showMarkerLabels
              ariaLabel={`17-year annual backlog for ${detail.agency}`}
            />
            <div className="mt-3 grid grid-cols-3 md:grid-cols-9 gap-2 text-[10px] text-stone-500">
              {annual
                .filter((_, i) => i % 2 === 0 || i === annual.length - 1)
                .map((r) => (
                  <div key={r.fiscal_year} className="font-mono">
                    FY{String(r.fiscal_year).slice(-2)}: {fmt(r.pending_end)}
                  </div>
                ))}
            </div>
            <p className="text-[10px] text-stone-500 mt-3">
              Dashed verticals mark presidential inaugurations.
            </p>
          </div>
        </section>

        {/* Explainer between annual and quarterly */}
        <MetricsExplainer variant="detailed" className="mt-10" />

        {/* Quarterly recent */}
        {quarterly.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-stone-900">
              Recent quarterly activity
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Last {quarterly.length} quarters of received, processed, and
              backlog. Most recent: {fiscalQuarterLabel(latestQuarter.fiscal_year, latestQuarter.fiscal_quarter as FiscalQuarter)}.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-stone-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Backlog
                </div>
                <Sparkline
                  data={quarterlyBacklogSeries}
                  width={260}
                  height={60}
                  stroke="#dc2626"
                  fill="#dc2626"
                  markers={quarterlyMarkers()}
                />
                <div className="font-mono text-sm text-stone-900 mt-2">
                  {fmt(latestQuarter.backlog)}
                </div>
              </div>
              <div className="border border-stone-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Received per quarter
                </div>
                <Sparkline
                  data={quarterlyReceivedSeries}
                  width={260}
                  height={60}
                  stroke="#57534e"
                  markers={quarterlyMarkers()}
                />
                <div className="font-mono text-sm text-stone-900 mt-2">
                  {fmt(latestQuarter.received)}
                </div>
              </div>
              <div className="border border-stone-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Processed per quarter
                </div>
                <Sparkline
                  data={quarterlyProcessedSeries}
                  width={260}
                  height={60}
                  stroke="#059669"
                  markers={quarterlyMarkers()}
                />
                <div className="font-mono text-sm text-stone-900 mt-2">
                  {fmt(latestQuarter.processed)}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Ten oldest pending */}
        {oldestPending.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-stone-900">
              10 oldest pending requests, end of FY2024 (Sept 30, 2024)
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Days pending counts forward from the day the request was
              received. The longer this list runs, the more litigation-ripe
              the agency&rsquo;s backlog.
            </p>
            <div className="mt-4 border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-600 w-16">
                      Rank
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Date received
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Days pending
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Years pending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {oldestPending.map((r) => (
                    <tr
                      key={r.rank}
                      className="border-b border-stone-100 last:border-b-0"
                    >
                      <td className="px-4 py-2 font-mono text-sm text-stone-500">
                        #{r.rank}
                      </td>
                      <td className="px-4 py-2 font-mono text-sm">
                        {r.date_received ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">
                        {r.days_pending != null
                          ? r.days_pending.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm tabular-nums text-stone-500">
                        {r.days_pending != null
                          ? (r.days_pending / 365).toFixed(1)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Exemptions */}
        {exemptions.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-stone-900">
              Exemption invocations, FY2024 (Oct 1, 2023 – Sept 30, 2024)
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              How often each FOIA exemption (b1–b9) was invoked when
              redacting or denying records. Exemption 5 (deliberative process,
              attorney-client) is highlighted — it&rsquo;s the most-fought
              exemption in FOIA litigation.
            </p>
            <div className="mt-4 border border-stone-200 rounded-lg p-6 bg-white fluid-svg">
              <ExemptionBars data={exemptions} width={720} height={220} />
            </div>
          </section>
        )}

        {/* Personnel */}
        {latestPersonnel && (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-stone-900">
              FOIA staffing, FY{latestPersonnel.fiscal_year} ({fiscalYearDateRange(latestPersonnel.fiscal_year)})
            </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-stone-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Full-time employees
                </div>
                <div className="font-display text-3xl text-stone-900 mt-2">
                  {latestPersonnel.full_time != null
                    ? latestPersonnel.full_time.toLocaleString()
                    : "—"}
                </div>
              </div>
              <div className="border border-stone-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Equivalent FTE
                </div>
                <div className="font-display text-3xl text-stone-900 mt-2">
                  {latestPersonnel.equivalent_fte != null
                    ? latestPersonnel.equivalent_fte.toFixed(1)
                    : "—"}
                </div>
              </div>
              <div className="border border-stone-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Total FTE
                </div>
                <div className="font-display text-3xl text-stone-900 mt-2">
                  {latestPersonnel.total_fte != null
                    ? latestPersonnel.total_fte.toFixed(1)
                    : "—"}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Annual table */}
        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone-900">
            Annual report history
          </h2>
          <div className="mt-4 border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                    FY
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Received
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Processed
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Pending end
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...annual].reverse().map((r) => (
                  <tr
                    key={r.fiscal_year}
                    className="border-b border-stone-100 last:border-b-0"
                  >
                    <td className="px-4 py-2 font-mono text-sm">
                      FY{r.fiscal_year}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">
                      {fmt(r.received)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">
                      {fmt(r.processed)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm tabular-nums text-stone-900">
                      {fmt(r.pending_end)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Raw data downloads */}
        <section className="mt-12 border-t border-stone-200 pt-6">
          <div className="text-xs uppercase tracking-wide text-stone-500">
            Download raw data
          </div>
          <p className="text-sm text-stone-600 mt-2">
            Every dataset behind this page is available as CSV. Filter by
            agency name in your spreadsheet of choice.
          </p>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <li>
              <a
                href="/api/data/annual.csv"
                className="text-stone-700 underline hover:text-stone-900"
                download
              >
                Annual report headline (FY2008–FY2024)
              </a>
            </li>
            <li>
              <a
                href="/api/data/quarterly.csv"
                className="text-stone-700 underline hover:text-stone-900"
                download
              >
                Quarterly reports
              </a>
            </li>
            <li>
              <a
                href="/api/data/oldest-pending.csv"
                className="text-stone-700 underline hover:text-stone-900"
                download
              >
                10 oldest pending requests
              </a>
            </li>
            <li>
              <a
                href="/api/data/exemptions.csv"
                className="text-stone-700 underline hover:text-stone-900"
                download
              >
                Exemption invocations (b1–b9)
              </a>
            </li>
            <li>
              <a
                href="/api/data/personnel.csv"
                className="text-stone-700 underline hover:text-stone-900"
                download
              >
                FOIA personnel
              </a>
            </li>
            <li>
              <a
                href="/api/data/slope.csv"
                className="text-stone-700 underline hover:text-stone-900"
                download
              >
                Pre/post Trump slope-chart data
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-10 flex justify-between text-sm">
          {prev ? (
            <Link
              href={`/agency/${prev.slug}`}
              className="text-stone-600 hover:text-stone-900"
            >
              ← {prev.agency}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/agency/${next.slug}`}
              className="text-stone-600 hover:text-stone-900"
            >
              {next.agency} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </SiteShell>
  );
}
