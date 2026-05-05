import Link from "next/link";
import type { ThroughputRow } from "@/lib/queries";

type Props = {
  data: ThroughputRow[];
};

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function ThroughputPanel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-stone-500">
        No throughput data available.
      </div>
    );
  }

  // Common scale across rows so the bars are comparable.
  const maxReceived = Math.max(...data.map((d) => d.received));

  return (
    <div>
      {/* Header row — sm and up. On mobile each entry has its own caption row. */}
      <div className="hidden sm:grid sm:grid-cols-12 gap-4 border-b border-[--color-rule] pb-2 font-display italic text-sm text-stone-700">
        <div className="sm:col-span-3">Agency</div>
        <div className="sm:col-span-7">Received vs. processed</div>
        <div className="sm:col-span-2 text-right">Closed / received</div>
      </div>

      <ul>
        {data.map((row) => {
          const receivedWidth = (row.received / maxReceived) * 100;
          const processedWidth = (row.processed / maxReceived) * 100;
          const fallingBehind = row.catch_up_ratio < 1;
          const ratioColor = fallingBehind
            ? "text-red-700"
            : "text-emerald-700";
          return (
            <li
              key={row.agency}
              className="border-b border-[--color-rule] last:border-b-0 py-4 sm:py-3 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center"
            >
              {/* Agency + ratio together on mobile (top row), separate cells on sm+ */}
              <div className="flex items-baseline justify-between gap-4 sm:contents">
                <Link
                  href={`/agency/${row.slug}`}
                  className="text-stone-900 hover:underline font-display text-base sm:text-sm sm:col-span-3 leading-tight"
                >
                  {row.agency}
                </Link>
                <span
                  className={`sm:hidden font-display tabular-nums text-base ${ratioColor}`}
                  aria-label="Closed over received"
                >
                  {pct(row.catch_up_ratio)}
                </span>
              </div>

              {/* Bars */}
              <div className="mt-3 sm:mt-0 sm:col-span-7">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-20 sm:w-16 font-display italic text-stone-600 text-xs text-right">
                      Received
                    </div>
                    <div className="flex-1 h-3 bg-[--color-paper-deep] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-stone-800"
                        style={{ width: `${receivedWidth}%` }}
                      />
                    </div>
                    <div className="w-20 sm:w-16 font-display text-sm text-stone-800 text-right tabular-nums">
                      {fmt(row.received)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 sm:w-16 font-display italic text-stone-600 text-xs text-right">
                      Processed
                    </div>
                    <div className="flex-1 h-3 bg-[--color-paper-deep] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-emerald-700"
                        style={{ width: `${processedWidth}%` }}
                      />
                    </div>
                    <div className="w-20 sm:w-16 font-display text-sm text-stone-800 text-right tabular-nums">
                      {fmt(row.processed)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratio cell — shown sm and up only */}
              <span
                className={`hidden sm:block sm:col-span-2 text-right font-display tabular-nums text-base ${ratioColor}`}
              >
                {pct(row.catch_up_ratio)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="font-display italic text-stone-600 text-xs mt-4 max-w-3xl leading-relaxed">
        <span className="not-italic [font-variant-caps:small-caps] tracking-wider text-stone-900">
          Closed / received = processed ÷ received
        </span>{" "}
        across FY2025 Q1 through the most recent quarter. 100% means the
        agency closed exactly as many as it received. Below 100% means the
        queue grew. Above 100% means it&rsquo;s closing old requests faster
        than new ones arrive.
      </p>
    </div>
  );
}
