type Variant = "compact" | "detailed";

type Props = {
  variant?: Variant;
  className?: string;
};

export function MetricsExplainer({
  variant = "compact",
  className = "",
}: Props) {
  return (
    <aside
      className={`border border-stone-200 bg-stone-50 rounded-lg p-5 ${className}`}
      aria-label="How to read annual vs. quarterly data"
    >
      <div className="text-xs uppercase tracking-wide text-stone-500">
        How to read this
      </div>
      <h3 className="font-display text-xl text-stone-900 mt-1">
        Annual and quarterly numbers don&rsquo;t mean the same thing
      </h3>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
        <div>
          <div className="font-mono text-xs uppercase tracking-wide text-stone-700">
            Annual report
          </div>
          <ul className="mt-2 space-y-1.5 text-stone-700">
            <li>
              <strong>Window:</strong> full fiscal year (Oct 1 — Sep 30).
            </li>
            <li>
              <strong>Coverage:</strong> every federal agency. ~122 agencies in
              FY2024.
            </li>
            <li>
              <strong>Detail:</strong> received, processed, pending, exemption
              counts (b1–b9), ten oldest, personnel, costs.
            </li>
            <li>
              <strong>&ldquo;Pending&rdquo; means:</strong> every request still
              open at year-end, regardless of age.
            </li>
            <li>
              <strong>Freshness:</strong> ~6 months after fiscal year end.
              Latest published is FY2024.
            </li>
          </ul>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-wide text-stone-700">
            Quarterly report
          </div>
          <ul className="mt-2 space-y-1.5 text-stone-700">
            <li>
              <strong>Window:</strong> three months. FY2026 Q2 = Jan–Mar 2026.
            </li>
            <li>
              <strong>Coverage:</strong> larger agencies only. ~95 file
              quarterly. <strong>DHS does not.</strong>
            </li>
            <li>
              <strong>Detail:</strong> received, processed, backlogged. Three
              numbers only.
            </li>
            <li>
              <strong>&ldquo;Backlogged&rdquo; means:</strong> perfected
              requests open more than 20 working days. Stricter than annual
              &ldquo;pending.&rdquo;
            </li>
            <li>
              <strong>Freshness:</strong> ~5 weeks after quarter end. Latest
              is FY2026 Q2.
            </li>
          </ul>
        </div>
      </div>

      {variant === "detailed" && (
        <div className="mt-5 pt-4 border-t border-stone-200 text-sm text-stone-700">
          <strong>Why we keep them on separate views.</strong> The two
          &ldquo;pending&rdquo; counts use different denominators, so plotting
          them on a single continuous timeline would misrepresent the
          underlying change. Within each series, comparisons are clean —
          quarter-over-quarter, year-over-year. Across series, only the
          direction of change is comparable, not the magnitude.
        </div>
      )}

      {variant === "compact" && (
        <p className="mt-4 text-xs text-stone-500">
          Bottom line: trust quarter-over-quarter and year-over-year
          comparisons within a single series. Be careful when comparing a
          quarterly number to an annual number — the definitions differ.
        </p>
      )}
    </aside>
  );
}
