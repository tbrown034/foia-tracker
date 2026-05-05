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
  if (pct > 10) return "text-red-700";
  if (pct < -10) return "text-emerald-700";
  return "text-stone-500";
}

function sparkColor(pct: number | null): string {
  if (pct == null) return "#a8a29e";
  if (pct > 10) return "#dc2626";
  if (pct < -10) return "#059669";
  return "#57534e";
}

export default async function AgenciesPage() {
  const rows = await getAnnualRanking(50);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl w-full px-6 py-10">
        <h1 className="font-display text-4xl md:text-5xl text-stone-900 leading-tight max-w-3xl">
          Federal agencies, by FOIA backlog
        </h1>
        <p className="font-display italic text-stone-600 text-base md:text-lg mt-3 max-w-3xl">
          The 50 largest federal FOIA filers, ranked by pending requests
          at the end of FY2024 (Sept 30, 2024) — the most recent year for
          which annual data has been published. Tap any agency for its
          full history. The sparkline shows 17 years of annual backlog
          (FY2008–FY2024); for current quarterly figures, see{" "}
          <Link href="/" className="underline hover:text-stone-900">
            the home page
          </Link>
          .
        </p>

        {/* Mobile: stacked cards. Tablet+: table. */}
        <ul className="mt-8 sm:hidden border-t border-stone-200">
          {rows.map((row, i) => (
            <li
              key={row.agency}
              className="border-b border-stone-200 py-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-stone-500 w-6 shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <Link
                  href={`/agency/${row.slug}`}
                  className="font-display text-stone-900 text-base leading-tight hover:underline flex-1"
                >
                  {row.agency}
                </Link>
              </div>
              <div className="mt-2 ml-9 grid grid-cols-3 gap-2 items-end">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-stone-500">
                    Pending FY24
                  </div>
                  <div className="font-mono tabular-nums text-stone-900 text-base">
                    {fmt(row.pending_end_2024)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-stone-500">
                    YoY
                  </div>
                  <div
                    className={`font-mono tabular-nums text-sm ${deltaColor(
                      row.delta_pct
                    )}`}
                  >
                    {fmtDelta(row.delta_pct)}
                  </div>
                </div>
                <div className="justify-self-end">
                  <Sparkline
                    data={row.series}
                    width={90}
                    height={24}
                    stroke={sparkColor(row.delta_pct)}
                    markers={annualMarkers()}
                    ariaLabel={`17-year backlog trend for ${row.agency}`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Tablet+ table */}
        <div className="hidden sm:block mt-8 border border-stone-200 rounded-lg overflow-x-auto">
          <table className="w-full">
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
                <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-600">
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
                  <td className="hidden md:table-cell px-4 py-3 text-right font-mono text-stone-500 tabular-nums">
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
            lines on the sparkline mark presidential inaugurations: Obama
            (Jan 20, 2009), Trump 1 (Jan 20, 2017), Biden (Jan 20, 2021).
            Trump&rsquo;s second inauguration (Jan 20, 2025) lands in
            FY2025 — shown on the home page.
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
