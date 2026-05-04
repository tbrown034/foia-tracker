import Link from "next/link";
import { getLatestSync } from "@/lib/queries";

function fmtTime(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const sync = await getLatestSync();

  return (
    <div className="flex flex-col flex-1">
      <div className="h-[3px] bg-stone-800" />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between gap-6">
          <Link href="/" className="font-display text-2xl text-stone-900">
            FOIA Tracker
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-stone-700 hover:text-stone-900"
            >
              Quarterly
            </Link>
            <Link
              href="/annual"
              className="text-stone-700 hover:text-stone-900"
            >
              Annual
            </Link>
            <Link
              href="/about"
              className="text-stone-700 hover:text-stone-900"
            >
              About
            </Link>
          </nav>
          <div className="text-xs text-right">
            <div className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded">
              Quarterly: FY2026 Q2 · Annual: FY2024
            </div>
            <div className="text-stone-500 mt-1">
              Last ingest: {fmtTime(sync?.ended_at ?? null)}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-stone-500 flex justify-between flex-wrap gap-2">
          <span>
            Built by Trevor Brown. Data: FOIA.gov public domain. Not affiliated
            with American Oversight.
          </span>
          <span>
            <Link href="/about" className="underline hover:text-stone-700">
              Methodology
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
