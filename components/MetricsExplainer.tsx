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
      className={`border-t border-b border-[--color-rule] py-6 ${className}`}
      aria-label="How to read annual vs. quarterly data"
    >
      <p className="font-display italic text-stone-700 text-sm">
        <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
          A note on the figures.
        </span>{" "}
        Annual and quarterly numbers don&rsquo;t mean the same thing.
      </p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <div className="font-display italic text-stone-700">
            Annual report
          </div>
          <ul className="mt-2 space-y-1.5 text-stone-700">
            <li>
              <strong>Window:</strong> full fiscal year, Oct 1 through Sept 30.
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
          <div className="font-display italic text-stone-700">
            Quarterly report
          </div>
          <ul className="mt-2 space-y-1.5 text-stone-700">
            <li>
              <strong>Window:</strong> three months. The latest quarter is
              shown in the sitewide freshness banner.
            </li>
            <li>
              <strong>Coverage:</strong> larger agencies only. About 95 filed
              before the Trump 2 reporting cliff. DHS filed through FY2025 Q3,
              then stopped.
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
              <strong>Freshness:</strong> usually about five weeks after
              quarter end.
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
