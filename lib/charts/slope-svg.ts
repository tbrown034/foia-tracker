// Pure SVG-string generator for the slope chart. No React, no DOM.
// Used both by the React component (via dangerouslySetInnerHTML) and by
// the standalone /api/chart/slope.svg export route.

import { scaleLog } from "d3-scale";
import type { SlopeChartData, SlopePoint } from "@/lib/queries";

export type SlopeAnnotation = {
  agency: string;
  text: string;
  /** Which endpoint to anchor to. Defaults to right (current period). */
  side?: "left" | "right";
};

type Options = {
  width?: number;
  height?: number;
  /** How many agencies to include, sorted by absolute backlog change. */
  topN?: number;
  /** Hand-placed annotations attached to specific agencies. */
  annotations?: SlopeAnnotation[];
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSlopeChartSvg(
  data: SlopeChartData,
  opts: Options = {}
): string {
  const width = opts.width ?? 980;
  const height = opts.height ?? 600;
  const topN = opts.topN ?? 20;
  const annotations = opts.annotations ?? [];

  const allValid = data.points.filter(
    (p): p is SlopePoint & { baseline: number; current: number } =>
      p.baseline != null && p.current != null && (p.baseline > 0 || p.current > 0)
  );
  if (allValid.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40"><text x="10" y="20" font-size="12" fill="#78716c">No quarterly data available.</text></svg>`;
  }

  // Show only the top-N agencies by absolute change. No dimming, no
  // washed-out background lines — every line on the chart is fully drawn
  // and labeled.
  const points = [...allValid]
    .sort((a, b) => Math.abs(b.delta_abs ?? 0) - Math.abs(a.delta_abs ?? 0))
    .slice(0, topN);

  const padTop = 56;
  const padBottom = 40;
  const padLeftLabel = 240;
  const padRightLabel = 240;
  const xLeft = padLeftLabel;
  const xRight = width - padRightLabel;

  const allValues = points.flatMap((p) => [
    Math.max(p.baseline, 1),
    Math.max(p.current, 1),
  ]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const y = scaleLog()
    .domain([yMin, yMax])
    .range([height - padBottom, padTop])
    .clamp(true);

  function lineColor(p: SlopePoint): string {
    const dp = p.delta_pct;
    if (dp == null) return "#78716c";
    if (dp > 10) return "#dc2626";
    if (dp < -10) return "#059669";
    return "#57534e";
  }

  type LabelEntry = {
    agency: string;
    y: number;
    color: string;
    valueLabel: string;
    deltaLabel: string;
  };

  const leftLabels: LabelEntry[] = [];
  const rightLabels: LabelEntry[] = [];
  for (const p of points) {
    const color = lineColor(p);
    leftLabels.push({
      agency: p.agency,
      y: y(Math.max(p.baseline, 1)),
      color,
      valueLabel: fmt(p.baseline),
      deltaLabel: "",
    });
    rightLabels.push({
      agency: p.agency,
      y: y(Math.max(p.current, 1)),
      color,
      valueLabel: fmt(p.current),
      deltaLabel: pct(p.delta_pct),
    });
  }

  function deOverlap(entries: LabelEntry[]): LabelEntry[] {
    const sorted = [...entries].sort((a, b) => a.y - b.y);
    const minGap = 14;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - sorted[i - 1].y < minGap) {
        sorted[i] = { ...sorted[i], y: sorted[i - 1].y + minGap };
      }
    }
    for (let i = 0; i < sorted.length; i++) {
      const upper = padTop;
      const lower = height - padBottom;
      if (sorted[i].y < upper) sorted[i] = { ...sorted[i], y: upper };
      if (sorted[i].y > lower) sorted[i] = { ...sorted[i], y: lower };
    }
    return sorted;
  }

  const leftAdjusted = deOverlap(leftLabels);
  const rightAdjusted = deOverlap(rightLabels);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Federal FOIA backlogs, ${escapeXml(data.baselineLabel)} versus ${escapeXml(data.currentLabel)}">`
  );

  // Headers
  parts.push(
    `<text x="${xLeft}" y="${padTop - 28}" text-anchor="middle" font-size="11" font-family="ui-monospace, monospace" fill="#57534e">${escapeXml(data.baselineLabel)}</text>`
  );
  parts.push(
    `<text x="${xLeft}" y="${padTop - 12}" text-anchor="middle" font-size="11" fill="#78716c">last quarter before Jan 2025</text>`
  );
  parts.push(
    `<text x="${xRight}" y="${padTop - 28}" text-anchor="middle" font-size="11" font-family="ui-monospace, monospace" fill="#57534e">${escapeXml(data.currentLabel)}</text>`
  );
  parts.push(
    `<text x="${xRight}" y="${padTop - 12}" text-anchor="middle" font-size="11" fill="#78716c">most recent published</text>`
  );

  // Axis lines
  parts.push(
    `<line x1="${xLeft}" x2="${xLeft}" y1="${padTop - 4}" y2="${height - padBottom + 4}" stroke="#e7e5e4" stroke-width="1" />`
  );
  parts.push(
    `<line x1="${xRight}" x2="${xRight}" y1="${padTop - 4}" y2="${height - padBottom + 4}" stroke="#e7e5e4" stroke-width="1" />`
  );

  // Lines (no dimming — every shown agency is fully drawn)
  for (const p of points) {
    const yL = y(Math.max(p.baseline, 1));
    const yR = y(Math.max(p.current, 1));
    const color = lineColor(p);
    const tooltip = escapeXml(
      `${p.agency}: ${fmt(p.baseline)} → ${fmt(p.current)} (${pct(p.delta_pct)})`
    );
    parts.push(
      `<g><line x1="${xLeft}" y1="${yL}" x2="${xRight}" y2="${yR}" stroke="${color}" stroke-width="1.75"><title>${tooltip}</title></line><circle cx="${xLeft}" cy="${yL}" r="3.25" fill="${color}"/><circle cx="${xRight}" cy="${yR}" r="3.25" fill="${color}"/></g>`
    );
  }

  // Left labels
  for (const entry of leftAdjusted) {
    const labelText =
      entry.agency.length > 32
        ? `${entry.agency.slice(0, 30)}…`
        : entry.agency;
    parts.push(
      `<text x="${xLeft - 12}" y="${entry.y + 3}" text-anchor="end" font-size="11" fill="#1c1917" font-family="Source Serif 4, Georgia, serif">${escapeXml(labelText)}<tspan fill="#78716c" font-family="ui-monospace, monospace" font-size="10">  ${escapeXml(entry.valueLabel)}</tspan></text>`
    );
  }

  // Right labels
  for (const entry of rightAdjusted) {
    parts.push(
      `<text x="${xRight + 12}" y="${entry.y + 3}" text-anchor="start" font-size="11" font-family="ui-monospace, monospace" fill="#1c1917">${escapeXml(entry.valueLabel)}<tspan fill="${entry.color}" font-family="ui-monospace, monospace" font-size="10">  ${escapeXml(entry.deltaLabel)}</tspan></text>`
    );
  }

  // Annotations: small italic stone text anchored next to a specific
  // agency's endpoint, with a hairline connector. Used to surface
  // specific reported context ("CDC's FOIA office was eliminated April
  // 2025") directly on the chart.
  for (const ann of annotations) {
    const point = points.find((p) => p.agency === ann.agency);
    if (!point) continue;
    const side = ann.side ?? "right";
    const value = side === "left" ? point.baseline : point.current;
    const anchorX = side === "left" ? xLeft : xRight;
    const anchorY = y(Math.max(value, 1));
    // Place annotation text 8px outside the column, on a row offset by 18px
    // below the dot to avoid colliding with the value label.
    const textX = side === "left" ? anchorX - 8 : anchorX + 8;
    const textY = anchorY + 22;
    const anchor = side === "left" ? "end" : "start";
    parts.push(
      `<g><line x1="${anchorX}" y1="${anchorY + 4}" x2="${anchorX}" y2="${textY - 8}" stroke="#a8a29e" stroke-width="0.75" stroke-dasharray="2 2"/><text x="${textX}" y="${textY}" text-anchor="${anchor}" font-size="10" font-style="italic" font-family="Source Serif 4, Georgia, serif" fill="#57534e">${escapeXml(ann.text)}</text></g>`
    );
  }

  // Legend
  const legendX = width / 2 - 140;
  const legendY = height - 16;
  parts.push(
    `<g transform="translate(${legendX}, ${legendY})">` +
      `<rect width="10" height="2" y="4" fill="#dc2626"/>` +
      `<text x="16" y="8" font-size="10" fill="#57534e">backlog grew &gt;10%</text>` +
      `<rect width="10" height="2" y="4" x="150" fill="#059669"/>` +
      `<text x="166" y="8" font-size="10" fill="#57534e">backlog shrunk &gt;10%</text>` +
      `</g>`
  );

  parts.push("</svg>");
  return parts.join("");
}
