import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Sparkline } from "@/components/Sparkline";
import { annualMarkers } from "@/lib/admin-transitions";
import { getAnnualRanking } from "@/lib/queries";

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

export default async function AnnualPage() {
  const rows = await getAnnualRanking(50);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl w-full px-6 py-10">
        <div className="mb-2 text-xs uppercase tracking-wide text-stone-500">
          Annual report · 17-year window, FY2008–FY2024 (Oct 1, 2007 – Sept 30, 2024)
        </div>
        <h1 className="font-display text-4xl text-stone-900">
          Annual backlogs and the long view
        </h1>
        <p className="text-stone-600 mt-2 max-w-2xl">
          Top 50 federal agencies by pending FOIA requests at end of FY2024
          (Sept 30, 2024), with the 17-year trend per agency. Federal fiscal
          year runs Oct 1 – Sept 30, named for the year it ends. FY2025
          annual report (Oct 1, 2024 – Sept 30, 2025) not yet published as
          of May 2026 — the current quarterly view at{" "}
          <Link href="/" className="underline">
            the home page
          </Link>{" "}
          shows fresher numbers.
        </p>

        <div className="mt-8 border border-stone-200 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[42rem]">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600 w-12">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Agency
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Pending FY2024
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Pending FY2023
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
                  YoY change
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-600 w-44">
                  17-year trend
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.agency}
                  className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-3 text-stone-500 font-mono text-sm">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/agency/${row.slug}`}
                      className="text-stone-900 hover:underline"
                    >
                      {row.agency}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-stone-900 tabular-nums">
                    {fmt(row.pending_end_2024)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-stone-500 tabular-nums">
                    {fmt(row.pending_end_2023)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${deltaColor(
                      row.delta_pct
                    )}`}
                  >
                    {fmtDelta(row.delta_pct)}
                  </td>
                  <td className="px-4 py-3">
                    <Sparkline
                      data={row.series}
                      width={150}
                      height={32}
                      stroke={sparkColor(row.delta_pct)}
                      markers={annualMarkers()}
                      ariaLabel={`17-year backlog trend for ${row.agency}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-start flex-wrap gap-3 text-xs text-stone-500">
          <p className="max-w-3xl">
            Source: FOIA.gov bulk Annual Report CSVs, FY2008–FY2024
            (Oct 1, 2007 – Sept 30, 2024). Agency-level totals only.
            &ldquo;All agencies&rdquo; meta-row excluded. Vertical dashed
            lines mark presidential inaugurations: Obama (Jan 20, 2009),
            Trump 1 (Jan 20, 2017), Biden (Jan 20, 2021). Trump&rsquo;s
            second inauguration (Jan 20, 2025) lands in FY2025 — shown on
            the quarterly view.
          </p>
          <a
            href="/api/data/annual.csv"
            className="underline hover:text-stone-900 whitespace-nowrap"
            download
          >
            Download annual CSV
          </a>
        </div>
      </div>
    </SiteShell>
  );
}
