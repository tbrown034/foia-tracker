"use client";

import { useState } from "react";
import Link from "next/link";
import type { SlopeChartData, SlopePoint } from "@/lib/queries";

type Props = {
  data: SlopeChartData;
  defaultTopN?: number;
  expandedTopN?: number;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function pct(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function deltaColor(p: SlopePoint): string {
  if (p.delta_pct == null) return "text-stone-500";
  if (p.delta_pct > 10) return "text-red-700";
  if (p.delta_pct < -10) return "text-emerald-700";
  return "text-stone-700";
}

export function SlopeMobileList({
  data,
  defaultTopN = 10,
  expandedTopN = 25,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const topN = expanded ? expandedTopN : defaultTopN;

  const valid = data.points.filter(
    (p): p is SlopePoint & { baseline: number; current: number } =>
      p.baseline != null &&
      p.current != null &&
      (p.baseline > 0 || p.current > 0)
  );
  const sorted = [...valid].sort(
    (a, b) => Math.abs(b.delta_abs ?? 0) - Math.abs(a.delta_abs ?? 0)
  );
  const points = sorted.slice(0, topN);

  // Common scale across rows so the bars are comparable. Use the
  // larger of either endpoint as the bar length.
  const maxValue = points.length
    ? Math.max(...points.flatMap((p) => [p.baseline, p.current]))
    : 1;

  return (
    <div>
      <p className="font-display italic text-stone-700 text-xs leading-snug mb-4">
        Each row shows one agency&rsquo;s pending FOIA backlog at the close
        of {data.baselineLabel} (top bar, {data.baselineFiscal}) versus
        the close of {data.currentLabel} (bottom bar, {data.currentFiscal}).
        Tap any agency for its full history.
      </p>
      <ol className="border-t border-stone-900">
        {points.map((p, i) => {
          const baseW = (p.baseline / maxValue) * 100;
          const currW = (p.current / maxValue) * 100;
          const grew = (p.delta_pct ?? 0) > 10;
          const shrunk = (p.delta_pct ?? 0) < -10;
          const barColor = grew
            ? "bg-red-700"
            : shrunk
            ? "bg-emerald-700"
            : "bg-stone-700";
          return (
            <li
              key={p.agency}
              className="border-b border-[--color-rule] py-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="font-display italic text-stone-500 text-sm tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/agency/${p.slug}`}
                    className="font-display text-stone-900 text-base hover:underline truncate"
                  >
                    {p.agency}
                  </Link>
                </div>
                <span
                  className={`font-display tabular-nums text-base shrink-0 ${deltaColor(
                    p
                  )}`}
                >
                  {pct(p.delta_pct)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="w-24 font-display italic text-stone-600 text-right shrink-0">
                  {data.baselineLabel}
                </span>
                <div className="flex-1 h-2.5 bg-[--color-paper-deep] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-stone-500"
                    style={{ width: `${baseW}%` }}
                  />
                </div>
                <span className="w-16 text-right font-display tabular-nums text-stone-700 shrink-0">
                  {fmt(p.baseline)}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <span className="w-24 font-display italic text-stone-700 text-right shrink-0">
                  {data.currentLabel}
                </span>
                <div className="flex-1 h-2.5 bg-[--color-paper-deep] rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${currW}%` }}
                  />
                </div>
                <span className="w-16 text-right font-display tabular-nums text-stone-900 shrink-0">
                  {fmt(p.current)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="font-display italic text-stone-600 text-xs leading-snug">
          Showing top {topN} of {data.points.length} reporting agencies.
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="font-display italic text-stone-700 text-sm underline underline-offset-2 hover:text-stone-900 whitespace-nowrap py-2"
        >
          {expanded ? "Show top 10" : `Show all ${expandedTopN}`}
        </button>
      </div>
    </div>
  );
}
