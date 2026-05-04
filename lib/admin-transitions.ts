// Federal inaugurations (Jan 20). Federal fiscal year starts Oct 1, so Jan 20
// falls about 112/365 ≈ 0.31 of the way through the FY (which is Q2,
// 20/90 ≈ 0.22 of the way through that quarter).

export type AdminTransition = {
  date: string;        // ISO YYYY-MM-DD, for accessibility / tooltip
  president: string;   // incoming president
  party: "D" | "R";
  /** x-coordinate when sparkline x-axis is fiscal_year (e.g. 2009.31) */
  fyX: number;
  /** x-coordinate when sparkline x-axis is fiscal_year*4+quarter */
  qX: number;
};

const FY_OFFSET = 112 / 365;
const Q_OFFSET_IN_Q2 = 20 / 90;

function transition(date: string, president: string, party: "D" | "R"): AdminTransition {
  const fy = Number(date.slice(0, 4));
  // Jan 20 is in FY+0 because Oct-Sep FY: Jan 2009 is in FY2009 (Oct 2008–Sep 2009).
  return {
    date,
    president,
    party,
    fyX: fy + FY_OFFSET,
    qX: fy * 4 + 2 + Q_OFFSET_IN_Q2,
  };
}

export const ADMIN_TRANSITIONS: AdminTransition[] = [
  transition("2009-01-20", "Obama", "D"),
  transition("2017-01-20", "Trump", "R"),
  transition("2021-01-20", "Biden", "D"),
  transition("2025-01-20", "Trump", "R"),
];

export type SparklineMarker = {
  x: number;
  label?: string;
  color?: string;
};

export function annualMarkers(): SparklineMarker[] {
  return ADMIN_TRANSITIONS.map((t) => ({
    x: t.fyX,
    label: t.president,
    color: t.party === "R" ? "#dc2626" : "#2563eb",
  }));
}

export function quarterlyMarkers(): SparklineMarker[] {
  return ADMIN_TRANSITIONS.map((t) => ({
    x: t.qX,
    label: t.president,
    color: t.party === "R" ? "#dc2626" : "#2563eb",
  }));
}
