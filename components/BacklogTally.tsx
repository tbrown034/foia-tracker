"use client";

import { useEffect, useState } from "react";

type Props = {
  value: number;
  asOf: string;
  unitLine: string;
  sourceLine: string;
  /** Optional asterisk footnote explaining the as-of date. */
  footnote?: string;
  durationMs?: number;
  /** "hero" is the page-lead size; "compact" is for section-level tallies. */
  size?: "hero" | "compact";
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function BacklogTally({
  value,
  asOf,
  unitLine,
  sourceLine,
  footnote,
  durationMs = 1800,
  size = "hero",
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
    <div
      className={
        size === "hero"
          ? "border-y border-stone-300 py-6 md:py-8"
          : "border-y border-stone-200 py-5 md:py-6"
      }
    >
      <div
        className={
          size === "hero"
            ? "font-mono tabular-nums text-stone-900 leading-none tracking-tight text-6xl sm:text-7xl md:text-8xl lg:text-[9rem]"
            : "font-mono tabular-nums text-stone-900 leading-none tracking-tight text-5xl sm:text-6xl md:text-7xl"
        }
        aria-label={`${value.toLocaleString()} ${unitLine} as of ${asOf}`}
      >
        {n.toLocaleString()}
      </div>
      <p className="mt-4 font-display text-stone-700 text-base md:text-lg leading-snug">
        {unitLine}{" "}
        <span className="text-stone-900">
          as of {asOf}
          {footnote ? <sup aria-hidden="true">*</sup> : null}
        </span>
      </p>
      <p className="mt-1 font-display italic text-stone-500 text-xs md:text-sm">
        {sourceLine}
      </p>
      {footnote ? (
        <p className="mt-3 font-display italic text-stone-500 text-xs md:text-sm max-w-2xl leading-snug">
          * {footnote}
        </p>
      ) : null}
    </div>
  );
}
