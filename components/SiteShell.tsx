import Link from "next/link";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="h-[3px] bg-stone-800" />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-baseline justify-between gap-6 flex-wrap">
          <Link
            href="/"
            className="font-display text-2xl text-stone-900 leading-none"
          >
            FOIA Tracker
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-stone-700 hover:text-stone-900">
              Quarterly
            </Link>
            <Link
              href="/annual"
              className="text-stone-700 hover:text-stone-900"
            >
              Annual
            </Link>
            <Link
              href="/data"
              className="text-stone-700 hover:text-stone-900"
            >
              Data
            </Link>
            <Link
              href="/about"
              className="text-stone-700 hover:text-stone-900"
            >
              About
            </Link>
          </nav>
          <p className="text-xs text-stone-500 italic font-display max-w-[26rem] text-right leading-snug">
            Quarterly data through March 31, 2026 · annual through Sept 30,
            2024 · next quarterly report expected August 2026.
          </p>
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
            {" · "}
            <Link href="/data" className="underline hover:text-stone-700">
              Data downloads
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
