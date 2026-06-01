"use client";

import { useEffect, useState } from "react";

type Props = {
  value: number;
  asOf: string;
  unitLine: string;
  sourceLine: string;
  durationMs?: number;
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function BacklogTally({
  value,
  asOf,
  unitLine,
  sourceLine,
  durationMs = 1800,
}: Props) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Jump straight to the final value, but defer out of the effect body
      // so we don't setState synchronously during the effect.
      const jump = requestAnimationFrame(() => setN(value));
      return () => cancelAnimationFrame(jump);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setN(Math.round(easeOutCubic(t) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <div className="border-y border-stone-300 py-6 md:py-8">
      <div
        className="font-mono tabular-nums text-stone-900 leading-none tracking-tight text-6xl sm:text-7xl md:text-8xl lg:text-[9rem]"
        aria-label={`${value.toLocaleString()} ${unitLine} as of ${asOf}`}
      >
        {n.toLocaleString()}
      </div>
      <p className="mt-4 font-display text-stone-700 text-base md:text-lg leading-snug">
        {unitLine}{" "}
        <span className="text-stone-900">as of {asOf}</span>
      </p>
      <p className="mt-1 font-display italic text-stone-500 text-xs md:text-sm">
        {sourceLine}
      </p>
    </div>
  );
}
