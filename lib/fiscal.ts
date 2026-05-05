// US federal fiscal year. FY runs Oct 1 -> Sept 30 of the named year.
// FY2026 = Oct 1, 2025 -> Sept 30, 2026.
// Single source of truth for every FY/quarter label, date range, and
// administration mapping in the UI. Do not hardcode FY/quarter strings
// elsewhere; always go through these helpers.

export type FiscalQuarter = 1 | 2 | 3 | 4;

export type QuarterMonths = {
  /** Calendar month-day the quarter starts (e.g. "Oct 1"). */
  startMonthDay: string;
  /** Calendar month-day the quarter ends (e.g. "Dec 31"). */
  endMonthDay: string;
  /**
   * Calendar-year offset from the FY label.
   * Q1 starts in (FY - 1); Q2/Q3/Q4 are in (FY).
   */
  startYearOffset: -1 | 0;
  endYearOffset: -1 | 0;
};

export const QUARTER_MONTHS: Record<FiscalQuarter, QuarterMonths> = {
  1: { startMonthDay: "Oct 1", endMonthDay: "Dec 31", startYearOffset: -1, endYearOffset: -1 },
  2: { startMonthDay: "Jan 1", endMonthDay: "Mar 31", startYearOffset:  0, endYearOffset:  0 },
  3: { startMonthDay: "Apr 1", endMonthDay: "Jun 30", startYearOffset:  0, endYearOffset:  0 },
  4: { startMonthDay: "Jul 1", endMonthDay: "Sep 30", startYearOffset:  0, endYearOffset:  0 },
};

/** Returns ISO calendar dates for the bounds of a fiscal quarter. */
export function fiscalQuarterISORange(fy: number, q: FiscalQuarter): { start: string; end: string } {
  const m = QUARTER_MONTHS[q];
  const startYear = fy + m.startYearOffset;
  const endYear = fy + m.endYearOffset;
  const startISO = `${startYear}-${q === 1 ? "10-01" : q === 2 ? "01-01" : q === 3 ? "04-01" : "07-01"}`;
  const endISO = `${endYear}-${q === 1 ? "12-31" : q === 2 ? "03-31" : q === 3 ? "06-30" : "09-30"}`;
  return { start: startISO, end: endISO };
}

/** "Jan 1 – Mar 31, 2026" — spaced en dash, AP style. */
export function fiscalQuarterDateRange(fy: number, q: FiscalQuarter): string {
  const m = QUARTER_MONTHS[q];
  const startYear = fy + m.startYearOffset;
  const endYear = fy + m.endYearOffset;
  if (startYear === endYear) {
    return `${m.startMonthDay} – ${m.endMonthDay}, ${endYear}`;
  }
  return `${m.startMonthDay}, ${startYear} – ${m.endMonthDay}, ${endYear}`;
}

/** "FY2026 Q2" — terse label without dates. */
export function fiscalQuarterShort(fy: number, q: FiscalQuarter): string {
  return `FY${fy} Q${q}`;
}

/** "FY2026 Q2 (Jan 1 – Mar 31, 2026)" — bulletproof full label. */
export function fiscalQuarterLabel(fy: number, q: FiscalQuarter): string {
  return `${fiscalQuarterShort(fy, q)} (${fiscalQuarterDateRange(fy, q)})`;
}

/** "Oct 1, 2025 – Sept 30, 2026" — full FY date range. */
export function fiscalYearDateRange(fy: number): string {
  return `Oct 1, ${fy - 1} – Sept 30, ${fy}`;
}

/** "FY2026 (Oct 1, 2025 – Sept 30, 2026)" — bulletproof full label. */
export function fiscalYearLabel(fy: number): string {
  return `FY${fy} (${fiscalYearDateRange(fy)})`;
}

// ---------- Administrations ----------

export type AdministrationName = "Bush II" | "Obama" | "Trump 1" | "Biden" | "Trump 2";

export type Administration = {
  name: AdministrationName;
  president: string;
  party: "D" | "R";
  /** ISO date the president was inaugurated. */
  start: string;
  /** ISO date the president left office, or null if still serving. */
  end: string | null;
  /** Fiscal years entirely under this administration (no transition). */
  cleanFYs: number[];
  /** FY where the president was inaugurated mid-year (Q2). */
  transitionInFY: number;
  /** FY where the president left mid-year (Q2), or null if still serving. */
  transitionOutFY: number | null;
};

export const ADMINISTRATIONS: Administration[] = [
  {
    name: "Bush II",
    president: "George W. Bush (2nd term)",
    party: "R",
    start: "2005-01-20",
    end: "2009-01-20",
    cleanFYs: [2006, 2007, 2008],
    transitionInFY: 2005,
    transitionOutFY: 2009,
  },
  {
    name: "Obama",
    president: "Barack Obama",
    party: "D",
    start: "2009-01-20",
    end: "2017-01-20",
    cleanFYs: [2010, 2011, 2012, 2013, 2014, 2015, 2016],
    transitionInFY: 2009,
    transitionOutFY: 2017,
  },
  {
    name: "Trump 1",
    president: "Donald Trump (1st term)",
    party: "R",
    start: "2017-01-20",
    end: "2021-01-20",
    cleanFYs: [2018, 2019, 2020],
    transitionInFY: 2017,
    transitionOutFY: 2021,
  },
  {
    name: "Biden",
    president: "Joe Biden",
    party: "D",
    start: "2021-01-20",
    end: "2025-01-20",
    cleanFYs: [2022, 2023, 2024],
    transitionInFY: 2021,
    transitionOutFY: 2025,
  },
  {
    name: "Trump 2",
    president: "Donald Trump (2nd term)",
    party: "R",
    start: "2025-01-20",
    end: null,
    cleanFYs: [2026],
    transitionInFY: 2025,
    transitionOutFY: null,
  },
];

export type AdministrationLabel =
  | { kind: "clean"; admin: Administration }
  | { kind: "transition"; outgoing: Administration; incoming: Administration };

/**
 * Returns which administration owns a given fiscal year. Transition years
 * (FY2017, FY2021, FY2025, etc.) return both the outgoing and incoming
 * administration so callers can footnote the split.
 */
export function administrationForFY(fy: number): AdministrationLabel | null {
  const clean = ADMINISTRATIONS.find((a) => a.cleanFYs.includes(fy));
  if (clean) return { kind: "clean", admin: clean };

  const incoming = ADMINISTRATIONS.find((a) => a.transitionInFY === fy);
  const outgoing = ADMINISTRATIONS.find((a) => a.transitionOutFY === fy);
  if (incoming && outgoing) {
    return { kind: "transition", outgoing, incoming };
  }
  return null;
}

/**
 * Returns which administration owns a fiscal quarter. More precise than
 * by-year since inauguration always falls in Q2 of a transition FY.
 * - Q1 of a transition-in FY: still outgoing (Oct-Dec, before Jan 20).
 * - Q2 of a transition-in FY: split (Jan 1-19 outgoing, Jan 20+ incoming).
 *   We attribute Q2 to the incoming admin since most of the quarter is theirs.
 * - Q3, Q4 of a transition-in FY: incoming.
 */
export function administrationForFQ(fy: number, q: FiscalQuarter): Administration | null {
  const label = administrationForFY(fy);
  if (!label) return null;
  if (label.kind === "clean") return label.admin;
  // Transition FY: Q1 belongs to outgoing, Q2-Q4 to incoming.
  return q === 1 ? label.outgoing : label.incoming;
}
