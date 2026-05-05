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
      <table className="w-full">
        <thead>
          <tr className="border-b border-[--color-rule]">
            <th className="text-left font-display italic text-sm text-stone-700 pb-2">
              Agency
            </th>
            <th className="text-left font-display italic text-sm text-stone-700 pb-2 w-1/2">
              Received vs. processed
            </th>
            <th className="text-right font-display italic text-sm text-stone-700 pb-2">
              Closed / received
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const receivedWidth = (row.received / maxReceived) * 100;
            const processedWidth = (row.processed / maxReceived) * 100;
            const fallingBehind = row.catch_up_ratio < 1;
            const ratioColor = fallingBehind
              ? "text-red-600"
              : "text-emerald-600";
            return (
              <tr
                key={row.agency}
                className="border-b border-[--color-rule] last:border-b-0"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/agency/${row.slug}`}
                    className="text-stone-900 hover:underline text-sm"
                  >
                    {row.agency}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-12 text-[10px] font-mono text-stone-500 text-right">
                        rcvd
                      </div>
                      <div className="flex-1 h-3 bg-[--color-paper-deep] rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-stone-700"
                          style={{ width: `${receivedWidth}%` }}
                        />
                      </div>
                      <div className="w-20 text-xs font-mono text-stone-700 text-right tabular-nums">
                        {fmt(row.received)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 text-[10px] font-mono text-stone-500 text-right">
                        prcsd
                      </div>
                      <div className="flex-1 h-3 bg-[--color-paper-deep] rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${processedWidth}%` }}
                        />
                      </div>
                      <div className="w-20 text-xs font-mono text-stone-700 text-right tabular-nums">
                        {fmt(row.processed)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`py-3 text-right font-mono text-sm tabular-nums ${ratioColor}`}>
                  {pct(row.catch_up_ratio)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-stone-500 mt-4 max-w-3xl">
        <strong>Closed / received = processed ÷ received</strong> across
        FY2025 Q1 through the most recent quarter. 100% means the agency
        closed exactly as many as it received. Below 100% means the queue
        grew. Above 100% means it&rsquo;s closing old requests faster than
        new ones arrive.
      </p>
    </div>
  );
}
