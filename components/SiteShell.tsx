import Link from "next/link";

const ISSUE_DATE = "May 4, 2026";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="h-[3px] bg-stone-900" />

      <header className="border-b border-[--color-rule]">
        <div className="mx-auto max-w-5xl px-6 pt-6 pb-3 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <Link
              href="/"
              className="block font-display text-stone-900 text-3xl md:text-4xl leading-none tracking-tight"
            >
              FOIA Tracker
            </Link>
            <p className="font-display italic text-stone-600 text-xs mt-1.5">
              Federal records-request data, queryable. Volume 1, {ISSUE_DATE}.
            </p>
          </div>
          <p className="font-display italic text-stone-600 text-xs max-w-[24rem] text-right leading-snug">
            Quarterly through March 31, 2026 · annual through Sept 30, 2024 ·
            next quarterly report expected August 2026.
          </p>
        </div>
        <div className="border-t border-[--color-rule]">
          <div className="mx-auto max-w-5xl px-6 py-2.5">
            <nav className="flex items-center gap-6 text-sm font-display">
              <Link href="/" className="text-stone-700 hover:text-stone-900">
                Quarterly
              </Link>
              <span className="text-stone-300">·</span>
              <Link
                href="/annual"
                className="text-stone-700 hover:text-stone-900"
              >
                Annual
              </Link>
              <span className="text-stone-300">·</span>
              <Link
                href="/data"
                className="text-stone-700 hover:text-stone-900"
              >
                Data
              </Link>
              <span className="text-stone-300">·</span>
              <Link
                href="/about"
                className="text-stone-700 hover:text-stone-900"
              >
                About
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[--color-rule] mt-20">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-stone-600 flex justify-between flex-wrap gap-3 font-display italic">
          <span>
            Built by Trevor Brown. Data: FOIA.gov public domain. Not affiliated
            with American Oversight.
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
      </footer>
    </div>
  );
}
