import Link from "next/link";
import {
  fiscalQuarterDateRange,
  fiscalQuarterShort,
  type FiscalQuarter,
} from "@/lib/fiscal";
import { getSiteFreshness } from "@/lib/queries";

const LINKS = [
  { href: "/agencies", label: "Agencies" },
  { href: "/data", label: "Data" },
  { href: "/about", label: "About" },
];

function syncAgeDays(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

function quarterEndLabel(fy: number | null, q: number | null): string | null {
  if (!fy || !q) return null;
  return fiscalQuarterDateRange(fy, q as FiscalQuarter).split(" – ").at(-1) ?? null;
}

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const freshness = await getSiteFreshness();
  const quarterLabel =
    freshness.quarterly_fy && freshness.quarterly_q
      ? fiscalQuarterShort(
          freshness.quarterly_fy,
          freshness.quarterly_q as FiscalQuarter
        )
      : null;
  const quarterEnd = quarterEndLabel(
    freshness.quarterly_fy,
    freshness.quarterly_q
  );
  const age = syncAgeDays(freshness.latest_sync_at);
  const isStale = age != null && age > 60;

  return (
    <div className="flex flex-col flex-1">
      <div className="h-[3px] bg-stone-900" />

      <header className="border-b border-[--color-rule]">
        <nav className="mx-auto max-w-5xl px-5 sm:px-6 py-4 flex items-center justify-between gap-4 sm:gap-6">
          <Link
            href="/"
            className="font-display text-stone-900 text-xl sm:text-2xl md:text-3xl leading-none tracking-tight"
            aria-label="FOIA Tracker home"
          >
            FOIA Tracker
          </Link>
          <div className="flex items-center gap-4 sm:gap-5 text-sm font-display text-stone-600">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-stone-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/about#freshness"
              className={`hidden md:inline-block rounded-sm border px-2.5 py-1 text-xs font-display italic tabular-nums ${
                isStale
                  ? "border-stone-300 text-stone-600 bg-stone-50"
                  : "border-amber-300 text-stone-900 bg-amber-50"
              }`}
            >
              {quarterEnd ? `Through ${quarterEnd}` : "Freshness unknown"}
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[--color-rule] mt-20">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-stone-600 font-display italic">
          <div className="border border-[--color-rule] bg-[--color-paper-deep] px-4 py-3 text-stone-800">
            <strong className="not-italic text-stone-900">Freshness:</strong>{" "}
            Most recent annual:{" "}
            {freshness.annual_fy ? `FY${freshness.annual_fy}` : "unknown"}.
            Most recent quarterly: {quarterLabel ?? "unknown"}
            {quarterEnd ? `, through ${quarterEnd}` : ""}. Source data is
            self-reported by agencies and may be revised by DOJ.
          </div>
          <div className="mt-5 flex justify-between flex-wrap gap-3">
            <span>
              Built by Trevor Brown. Data: FOIA.gov public domain. American
              Oversight February 2025 analysis cited for framing. Not
              affiliated with American Oversight.
            </span>
            <span>
              <Link href="/about" className="underline hover:text-stone-800">
                Methodology
              </Link>{" "}
              ·{" "}
              <Link href="/data" className="underline hover:text-stone-800">
                Data downloads
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
