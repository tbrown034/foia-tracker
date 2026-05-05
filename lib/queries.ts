import { sql } from "./db";
import { slugify } from "./slug";

export type FreshnessRow = {
  source: string;
  ended_at: string | null;
  records: number | null;
  status: string | null;
};

export type SiteFreshness = {
  annual_fy: number | null;
  quarterly_fy: number | null;
  quarterly_q: number | null;
  latest_sync_at: string | null;
};

export async function getSiteFreshness(): Promise<SiteFreshness> {
  const [annualRows, quarterlyRows, syncRows] = await Promise.all([
    sql`
      SELECT MAX(fiscal_year)::int AS fy
      FROM foia_annual
      WHERE component = 'Agency Overall'
        AND agency <> 'All agencies'
    `,
    sql`
      SELECT fiscal_year::int AS fy, fiscal_quarter::int AS q
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND agency <> 'All agencies'
      ORDER BY fiscal_year DESC, fiscal_quarter DESC
      LIMIT 1
    `,
    sql`
      SELECT MAX(ended_at)::text AS ended_at
      FROM sync_log
      WHERE status = 'ok'
    `,
  ]);

  const annual = annualRows[0] as { fy: number | null } | undefined;
  const quarterly = quarterlyRows[0] as
    | { fy: number | null; q: number | null }
    | undefined;
  const sync = syncRows[0] as { ended_at: string | null } | undefined;

  return {
    annual_fy: annual?.fy ?? null,
    quarterly_fy: quarterly?.fy ?? null,
    quarterly_q: quarterly?.q ?? null,
    latest_sync_at: sync?.ended_at ?? null,
  };
}

export type DatasetCounts = {
  annual: number;
  quarterly: number;
  oldest_pending: number;
  exemptions: number;
  personnel: number;
};

export async function getDatasetCounts(): Promise<DatasetCounts> {
  const tables = [
    "foia_annual",
    "foia_quarterly",
    "foia_oldest_pending",
    "foia_exemptions",
    "foia_personnel",
  ] as const;
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const [r] = (await sql.query(`SELECT count(*)::int AS n FROM ${t}`)) as {
      n: number;
    }[];
    counts[t] = r?.n ?? 0;
  }
  return {
    annual: counts.foia_annual,
    quarterly: counts.foia_quarterly,
    oldest_pending: counts.foia_oldest_pending,
    exemptions: counts.foia_exemptions,
    personnel: counts.foia_personnel,
  };
}

export async function getLatestSyncByEachSource(): Promise<FreshnessRow[]> {
  const rows = (await sql`
    SELECT DISTINCT ON (source) source, ended_at, records, status
    FROM sync_log
    WHERE status = 'ok'
    ORDER BY source, started_at DESC
  `) as FreshnessRow[];
  return rows;
}

export async function getLatestSync(): Promise<FreshnessRow | null> {
  const rows = await sql`
    SELECT source, ended_at, records, status
    FROM sync_log
    WHERE status = 'ok'
    ORDER BY started_at DESC
    LIMIT 1
  `;
  return (rows[0] as FreshnessRow) ?? null;
}

// ---------- Annual ----------

export type AnnualRankRow = {
  agency: string;
  slug: string;
  pending_end_2024: number | null;
  pending_end_2023: number | null;
  delta_pct: number | null;
  series: { x: number; y: number | null }[];
};

export async function getAnnualRanking(limit: number = 25): Promise<AnnualRankRow[]> {
  const summary = (await sql`
    SELECT
      agency,
      MAX(CASE WHEN fiscal_year = 2024 THEN pending_end END)::int AS pending_end_2024,
      MAX(CASE WHEN fiscal_year = 2023 THEN pending_end END)::int AS pending_end_2023,
      CASE
        WHEN MAX(CASE WHEN fiscal_year = 2023 THEN pending_end END) > 0
        THEN ROUND(
          (MAX(CASE WHEN fiscal_year = 2024 THEN pending_end END)::numeric
            - MAX(CASE WHEN fiscal_year = 2023 THEN pending_end END))
          / MAX(CASE WHEN fiscal_year = 2023 THEN pending_end END) * 100,
          1
        )::float
        ELSE NULL
      END AS delta_pct
    FROM foia_annual
    WHERE component = 'Agency Overall' AND agency <> 'All agencies'
    GROUP BY agency
    HAVING MAX(CASE WHEN fiscal_year = 2024 THEN pending_end END) IS NOT NULL
    ORDER BY pending_end_2024 DESC NULLS LAST
    LIMIT ${limit}
  `) as Omit<AnnualRankRow, "slug" | "series">[];

  if (summary.length === 0) return [];

  const agencies = summary.map((r) => r.agency);
  const series = (await sql`
    SELECT agency, fiscal_year, pending_end::int AS pending_end
    FROM foia_annual
    WHERE component = 'Agency Overall'
      AND agency = ANY(${agencies})
    ORDER BY agency, fiscal_year
  `) as { agency: string; fiscal_year: number; pending_end: number | null }[];

  const seriesByAgency = new Map<string, { x: number; y: number | null }[]>();
  for (const row of series) {
    const arr = seriesByAgency.get(row.agency) ?? [];
    arr.push({ x: row.fiscal_year, y: row.pending_end });
    seriesByAgency.set(row.agency, arr);
  }

  return summary.map((r) => ({
    ...r,
    slug: slugify(r.agency),
    series: seriesByAgency.get(r.agency) ?? [],
  }));
}

// ---------- Quarterly ----------

export type QuarterPeriod = { fy: number; q: number };

export async function getMostRecentQuarter(): Promise<QuarterPeriod | null> {
  const rows = (await sql`
    SELECT fiscal_year, fiscal_quarter
    FROM foia_quarterly
    ORDER BY fiscal_year DESC, fiscal_quarter DESC
    LIMIT 1
  `) as { fiscal_year: number; fiscal_quarter: number }[];
  if (!rows[0]) return null;
  return { fy: rows[0].fiscal_year, q: rows[0].fiscal_quarter };
}

export type QuarterlyRankRow = {
  agency: string;
  slug: string;
  backlog_latest: number | null;
  backlog_prev: number | null;
  delta_pct: number | null;
  received_latest: number | null;
  processed_latest: number | null;
  series: { x: number; y: number | null }[];
};

function periodIndex(fy: number, q: number): number {
  return fy * 4 + q;
}

export async function getQuarterlyRanking(limit: number = 25): Promise<QuarterlyRankRow[]> {
  const recent = await getMostRecentQuarter();
  if (!recent) return [];
  const { fy: latestFy, q: latestQ } = recent;
  const prevQ = latestQ === 1 ? 4 : latestQ - 1;
  const prevFy = latestQ === 1 ? latestFy - 1 : latestFy;

  const summary = (await sql`
    WITH latest AS (
      SELECT agency, backlog, received, processed
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND fiscal_year = ${latestFy}
        AND fiscal_quarter = ${latestQ}
        AND agency <> 'All agencies'
    ),
    prev AS (
      SELECT agency, backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND fiscal_year = ${prevFy}
        AND fiscal_quarter = ${prevQ}
    )
    SELECT
      l.agency,
      l.backlog::int AS backlog_latest,
      p.backlog::int AS backlog_prev,
      l.received::int AS received_latest,
      l.processed::int AS processed_latest,
      CASE
        WHEN p.backlog > 0
        THEN ROUND((l.backlog::numeric - p.backlog) / p.backlog * 100, 1)::float
        ELSE NULL
      END AS delta_pct
    FROM latest l
    LEFT JOIN prev p USING (agency)
    WHERE l.backlog IS NOT NULL
    ORDER BY l.backlog DESC NULLS LAST
    LIMIT ${limit}
  `) as Omit<QuarterlyRankRow, "slug" | "series">[];

  if (summary.length === 0) return [];

  const agencies = summary.map((r) => r.agency);
  const seriesRows = (await sql`
    SELECT agency, fiscal_year, fiscal_quarter, backlog::int AS backlog
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND agency = ANY(${agencies})
    ORDER BY agency, fiscal_year, fiscal_quarter
  `) as {
    agency: string;
    fiscal_year: number;
    fiscal_quarter: number;
    backlog: number | null;
  }[];

  const seriesByAgency = new Map<string, { x: number; y: number | null }[]>();
  for (const row of seriesRows) {
    const arr = seriesByAgency.get(row.agency) ?? [];
    arr.push({ x: periodIndex(row.fiscal_year, row.fiscal_quarter), y: row.backlog });
    seriesByAgency.set(row.agency, arr);
  }

  return summary.map((r) => ({
    ...r,
    slug: slugify(r.agency),
    series: seriesByAgency.get(r.agency) ?? [],
  }));
}

// ---------- Received vs processed timeline (hero) ----------

export type ReceivedProcessedPoint = {
  fy: number;
  q: number;
  /** fy*4+q ordering index */
  x: number;
  /** "FY2026 Q2 (Jan 1 – Mar 31, 2026)" */
  label: string;
  received: number;
  processed: number;
  /** received - processed; positive = pile grew that quarter */
  net: number;
  /** Total pending backlog summed across the agency set at quarter end. */
  total_backlog: number;
};

export type ReceivedProcessedTimeline = {
  points: ReceivedProcessedPoint[];
  /** Names of the agencies summed in this timeline (the stable top filers). */
  agencies: string[];
  /** Sum of all-quarter received across these agencies. */
  total_received: number;
  /** Sum of all-quarter processed across these agencies. */
  total_processed: number;
};

/**
 * The ten federal agencies with the largest FY2024 received volume that
 * also filed in every one of the 22 quarters from FY2021 Q1 through the
 * most recent quarter. Hardcoded list — the audit ranking is in
 * `docs/data-findings-quarterly-dropout.md`. These ten cover roughly a
 * third of federal FOIA volume by request count, but every one of them
 * filed every quarter so the time series is unbroken — no false trend
 * from agencies dropping in or out (DHS, VA, State and 24 others stopped
 * filing under Trump 2 — see the dropout doc for the full list).
 */
const TOP_TEN_STABLE_FILERS = [
  "Department of Justice",
  "Department of Defense",
  "Department of Health and Human Services",
  "Department of Transportation",
  "Equal Employment Opportunity Commission",
  "Department of Labor",
  "Securities and Exchange Commission",
  "Department of the Interior",
  "Environmental Protection Agency",
  "Department of Education",
];

/**
 * Top-10-stable-filer received vs. processed across every quarter the API
 * exposes (FY2021 Q1 → most recent). The set is fixed across all quarters
 * so the time series is genuinely apples-to-apples — agencies that
 * stopped filing under Trump 2 (DHS, VA, etc.) are not in this set and
 * therefore not silently dropping out mid-window.
 */
export async function getReceivedVsProcessedTimeline(): Promise<ReceivedProcessedTimeline> {
  const recent = await getMostRecentQuarter();
  if (!recent) {
    return {
      points: [],
      agencies: TOP_TEN_STABLE_FILERS,
      total_received: 0,
      total_processed: 0,
    };
  }

  const rows = (await sql`
    SELECT
      fiscal_year AS fy,
      fiscal_quarter AS q,
      SUM(received)::int  AS received,
      SUM(processed)::int AS processed,
      SUM(backlog)::int   AS total_backlog
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND agency = ANY(${TOP_TEN_STABLE_FILERS})
    GROUP BY fiscal_year, fiscal_quarter
    ORDER BY fiscal_year, fiscal_quarter
  `) as {
    fy: number;
    q: number;
    received: number;
    processed: number;
    total_backlog: number;
  }[];

  const QUARTER_DATES: Record<number, string> = {
    1: "Oct 1 – Dec 31",
    2: "Jan 1 – Mar 31",
    3: "Apr 1 – Jun 30",
    4: "Jul 1 – Sep 30",
  };
  function pointLabel(fy: number, q: number): string {
    const calYear = q === 1 ? fy - 1 : fy;
    return `FY${fy} Q${q} (${QUARTER_DATES[q]}, ${calYear})`;
  }

  const points: ReceivedProcessedPoint[] = rows.map((r) => ({
    fy: r.fy,
    q: r.q,
    x: r.fy * 4 + r.q,
    label: pointLabel(r.fy, r.q),
    received: r.received,
    processed: r.processed,
    net: r.received - r.processed,
    total_backlog: r.total_backlog,
  }));

  return {
    points,
    agencies: TOP_TEN_STABLE_FILERS,
    total_received: points.reduce((s, p) => s + p.received, 0),
    total_processed: points.reduce((s, p) => s + p.processed, 0),
  };
}

// ---------- Agencies-filing-per-quarter dropout chart ----------

export type FilingDropout = {
  agency: string;
  /** "FY2025 Q3" — the last quarter this agency filed. */
  last_quarter_label: string;
  /** Their typical FY2024 received volume; null if they didn't file in FY2024. */
  typical_received_fy2024: number | null;
};

export type FilingPoint = {
  fy: number;
  q: number;
  x: number;
  /** "FY2026 Q2 (Jan 1 – Mar 31, 2026)" */
  label: string;
  agency_count: number;
  /** Agencies whose LAST quarter filed is this one — i.e. who dropped after. */
  dropouts: FilingDropout[];
};

export type FilingTimeline = {
  points: FilingPoint[];
  /** Total dropout count between the peak filer count and the latest. */
  total_dropouts: number;
};

/**
 * Per-quarter count of agencies that filed a quarterly report, plus the
 * specific agencies whose final filed quarter was that quarter (i.e.
 * they dropped out after). Surfaces the Trump 2 reporting cliff
 * documented in `docs/data-findings-quarterly-dropout.md`.
 */
export async function getAgenciesFilingPerQuarter(): Promise<FilingTimeline> {
  const counts = (await sql`
    SELECT fiscal_year fy, fiscal_quarter q, COUNT(*)::int n
    FROM foia_quarterly
    WHERE component = 'Agency Overall' AND agency <> 'All agencies'
      AND received IS NOT NULL
    GROUP BY fiscal_year, fiscal_quarter
    ORDER BY fiscal_year, fiscal_quarter
  `) as { fy: number; q: number; n: number }[];

  // For every agency, find their LAST filed quarter.
  const lastFiled = (await sql`
    WITH last_x AS (
      SELECT agency, MAX(fiscal_year * 4 + fiscal_quarter) AS x
      FROM foia_quarterly
      WHERE component = 'Agency Overall' AND agency <> 'All agencies'
        AND received IS NOT NULL
      GROUP BY agency
    ),
    fy24_avg AS (
      SELECT agency, AVG(received)::int AS avg_received
      FROM foia_quarterly
      WHERE component = 'Agency Overall' AND fiscal_year = 2024
      GROUP BY agency
    )
    SELECT lx.agency, lx.x AS last_x, fy.avg_received
    FROM last_x lx
    LEFT JOIN fy24_avg fy ON lx.agency = fy.agency
  `) as { agency: string; last_x: number; avg_received: number | null }[];

  // Group dropouts by their last-filed quarter, but EXCLUDE agencies whose
  // last-filed quarter is the most recent one (they haven't dropped — that's
  // just the current cutoff).
  const maxX = Math.max(...counts.map((c) => c.fy * 4 + c.q));
  const dropoutsByX = new Map<number, FilingDropout[]>();
  for (const r of lastFiled) {
    if (r.last_x >= maxX) continue;
    const fy = Math.floor(r.last_x / 4);
    const q = r.last_x - fy * 4;
    const arr = dropoutsByX.get(r.last_x) ?? [];
    arr.push({
      agency: r.agency,
      last_quarter_label: `FY${fy} Q${q}`,
      typical_received_fy2024: r.avg_received,
    });
    dropoutsByX.set(r.last_x, arr);
  }

  // Sort dropouts within each quarter by typical volume desc.
  for (const arr of dropoutsByX.values()) {
    arr.sort(
      (a, b) =>
        (b.typical_received_fy2024 ?? 0) - (a.typical_received_fy2024 ?? 0)
    );
  }

  const QUARTER_DATES: Record<number, string> = {
    1: "Oct 1 – Dec 31",
    2: "Jan 1 – Mar 31",
    3: "Apr 1 – Jun 30",
    4: "Jul 1 – Sep 30",
  };
  function pointLabel(fy: number, q: number): string {
    const calYear = q === 1 ? fy - 1 : fy;
    return `FY${fy} Q${q} (${QUARTER_DATES[q]}, ${calYear})`;
  }

  const points: FilingPoint[] = counts.map((c) => {
    const x = c.fy * 4 + c.q;
    return {
      fy: c.fy,
      q: c.q,
      x,
      label: pointLabel(c.fy, c.q),
      agency_count: c.n,
      dropouts: dropoutsByX.get(x) ?? [],
    };
  });

  const peak = Math.max(...points.map((p) => p.agency_count));
  const latest = points[points.length - 1]?.agency_count ?? peak;

  return {
    points,
    total_dropouts: peak - latest,
  };
}

// ---------- Quarterly small multiples (Figure 2) ----------

export type SmallMultipleSeriesPoint = {
  fy: number;
  q: number;
  /** fy*4+q ordering index for x-axis */
  x: number;
  /** "FY2026 Q2 (Jan 1 – Mar 31, 2026)" */
  label: string;
  backlog: number | null;
  received: number | null;
  processed: number | null;
};

export type SmallMultipleAgency = {
  agency: string;
  slug: string;
  latest_backlog: number;
  earliest_backlog: number | null;
  /** Percent change from the first to the most recent quarter. */
  pct_change: number | null;
  series: SmallMultipleSeriesPoint[];
};

/**
 * Top N agencies by current backlog with their full available quarterly
 * series. The API exposes data from FY2021 Q1 onward; this returns every
 * available quarter so the panel can show the full Biden → Trump 2 arc.
 */
export async function getQuarterlySmallMultiples(
  limit: number = 10
): Promise<SmallMultipleAgency[]> {
  const recent = await getMostRecentQuarter();
  if (!recent) return [];
  const { fy: latestFy, q: latestQ } = recent;

  const top = (await sql`
    SELECT agency, backlog::int AS backlog
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND fiscal_year = ${latestFy}
      AND fiscal_quarter = ${latestQ}
      AND agency <> 'All agencies'
      AND backlog IS NOT NULL
    ORDER BY backlog DESC
    LIMIT ${limit}
  `) as { agency: string; backlog: number }[];

  if (top.length === 0) return [];

  const agencies = top.map((r) => r.agency);
  const seriesRows = (await sql`
    SELECT
      agency, fiscal_year, fiscal_quarter,
      backlog::int AS backlog,
      received::int AS received,
      processed::int AS processed
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND agency = ANY(${agencies})
    ORDER BY agency, fiscal_year, fiscal_quarter
  `) as {
    agency: string;
    fiscal_year: number;
    fiscal_quarter: number;
    backlog: number | null;
    received: number | null;
    processed: number | null;
  }[];

  const QUARTER_DATES: Record<number, string> = {
    1: "Oct 1 – Dec 31",
    2: "Jan 1 – Mar 31",
    3: "Apr 1 – Jun 30",
    4: "Jul 1 – Sep 30",
  };
  function pointLabel(fy: number, q: number): string {
    const calYear = q === 1 ? fy - 1 : fy;
    return `FY${fy} Q${q} (${QUARTER_DATES[q]}, ${calYear})`;
  }

  const seriesByAgency = new Map<string, SmallMultipleSeriesPoint[]>();
  for (const row of seriesRows) {
    const arr = seriesByAgency.get(row.agency) ?? [];
    arr.push({
      fy: row.fiscal_year,
      q: row.fiscal_quarter,
      x: row.fiscal_year * 4 + row.fiscal_quarter,
      label: pointLabel(row.fiscal_year, row.fiscal_quarter),
      backlog: row.backlog,
      received: row.received,
      processed: row.processed,
    });
    seriesByAgency.set(row.agency, arr);
  }

  return top.map((r) => {
    const series = seriesByAgency.get(r.agency) ?? [];
    const firstWithBacklog = series.find((p) => p.backlog != null);
    const earliest = firstWithBacklog?.backlog ?? null;
    const pct =
      earliest != null && earliest > 0
        ? ((r.backlog - earliest) / earliest) * 100
        : null;
    return {
      agency: r.agency,
      slug: slugify(r.agency),
      latest_backlog: r.backlog,
      earliest_backlog: earliest,
      pct_change: pct,
      series,
    };
  });
}

// ---------- Home callout cards ----------

export type HomeCallouts = {
  biggestBacklog: { agency: string; slug: string; value: number; period: string } | null;
  fastestGrowing: {
    agency: string;
    slug: string;
    delta_pct: number;
    period: string;
  } | null;
  oldestPending: {
    agency: string;
    slug: string;
    days: number;
    date_received: string | null;
  } | null;
};

export async function getHomeCallouts(): Promise<HomeCallouts> {
  const recent = await getMostRecentQuarter();
  const period = recent ? `FY${recent.fy} Q${recent.q}` : "—";
  const fy = recent?.fy ?? null;
  const q = recent?.q ?? null;
  const prevQ = q === 1 ? 4 : (q ?? 0) - 1;
  const prevFy = q === 1 ? (fy ?? 0) - 1 : fy;

  const biggestRows = (await sql`
    SELECT agency, backlog::int AS value
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND fiscal_year = ${fy}
      AND fiscal_quarter = ${q}
      AND agency <> 'All agencies'
      AND backlog IS NOT NULL
    ORDER BY backlog DESC
    LIMIT 1
  `) as { agency: string; value: number }[];

  const growingRows = (await sql`
    WITH latest AS (
      SELECT agency, backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND fiscal_year = ${fy}
        AND fiscal_quarter = ${q}
        AND agency <> 'All agencies'
    ),
    prev AS (
      SELECT agency, backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND fiscal_year = ${prevFy}
        AND fiscal_quarter = ${prevQ}
    )
    SELECT
      l.agency,
      ROUND((l.backlog::numeric - p.backlog) / NULLIF(p.backlog, 0) * 100, 1)::float AS delta_pct
    FROM latest l
    JOIN prev p USING (agency)
    WHERE l.backlog > 1000 AND p.backlog > 1000
    ORDER BY delta_pct DESC NULLS LAST
    LIMIT 1
  `) as { agency: string; delta_pct: number }[];

  const oldestRows = (await sql`
    SELECT agency, days_pending::int AS days, date_received::text AS date_received
    FROM foia_oldest_pending
    WHERE component = 'Agency Overall'
      AND fiscal_year = (SELECT MAX(fiscal_year) FROM foia_oldest_pending WHERE component = 'Agency Overall')
      AND days_pending IS NOT NULL
    ORDER BY days_pending DESC
    LIMIT 1
  `) as { agency: string; days: number; date_received: string | null }[];

  return {
    biggestBacklog: biggestRows[0]
      ? {
          agency: biggestRows[0].agency,
          slug: slugify(biggestRows[0].agency),
          value: biggestRows[0].value,
          period,
        }
      : null,
    fastestGrowing: growingRows[0]
      ? {
          agency: growingRows[0].agency,
          slug: slugify(growingRows[0].agency),
          delta_pct: growingRows[0].delta_pct,
          period,
        }
      : null,
    oldestPending: oldestRows[0]
      ? {
          agency: oldestRows[0].agency,
          slug: slugify(oldestRows[0].agency),
          days: oldestRows[0].days,
          date_received: oldestRows[0].date_received,
        }
      : null,
  };
}

// ---------- Slope chart: pre-Trump-2 vs. now ----------

export type QuarterlyPoint = {
  fy: number;
  q: number;
  /** Calendar-month label, e.g. "Oct–Dec 2024" */
  label: string;
  /** Decimal-year x for ordering */
  x: number;
  backlog: number | null;
};

export type SlopePoint = {
  agency: string;
  slug: string;
  baseline: number | null;
  current: number | null;
  delta_abs: number | null;
  delta_pct: number | null;
  /** Full per-quarter trajectory between baseline and current, inclusive. */
  series: QuarterlyPoint[];
};

export type SlopeChartData = {
  /** Calendar-month label for the baseline period (e.g. "Oct–Dec 2024"). */
  baselineLabel: string;
  /** Calendar-month label for the current period (e.g. "Jan–Mar 2026"). */
  currentLabel: string;
  /** Federal-fiscal label for footnotes ("FY2025 Q1" etc.). */
  baselineFiscal: string;
  currentFiscal: string;
  points: SlopePoint[];
};

const QUARTER_MONTH_LABELS: Record<number, string> = {
  1: "Oct–Dec",
  2: "Jan–Mar",
  3: "Apr–Jun",
  4: "Jul–Sep",
};

function calendarLabel(fy: number, q: number): string {
  // FY runs Oct 1 → Sep 30 (named after the year it ends in).
  // Q1 = Oct-Dec of FY-1, Q2 = Jan-Mar of FY, Q3 = Apr-Jun of FY, Q4 = Jul-Sep of FY.
  const calendarYear = q === 1 ? fy - 1 : fy;
  return `${QUARTER_MONTH_LABELS[q]} ${calendarYear}`;
}

function quarterDecimalX(fy: number, q: number): number {
  const calendarYear = q === 1 ? fy - 1 : fy;
  const monthFraction = q === 1 ? 12 / 12 : ((q - 1) * 3) / 12;
  return calendarYear + monthFraction;
}

export async function getSlopeChartData(): Promise<SlopeChartData> {
  const recent = await getMostRecentQuarter();
  const currentFy = recent?.fy ?? 2026;
  const currentQ = recent?.q ?? 2;

  // Baseline: FY2025 Q1 = Oct–Dec 2024, the last full quarter before
  // Trump's January 20, 2025 inauguration. (FY2024 Q4 = Jul–Sep 2024
  // would also be Biden-era but is one quarter further back.)
  const baselineFy = 2025;
  const baselineQ = 1;

  const summaryRows = (await sql`
    WITH baseline AS (
      SELECT agency, backlog::int AS backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND fiscal_year = ${baselineFy}
        AND fiscal_quarter = ${baselineQ}
        AND agency <> 'All agencies'
    ),
    current AS (
      SELECT agency, backlog::int AS backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND fiscal_year = ${currentFy}
        AND fiscal_quarter = ${currentQ}
        AND agency <> 'All agencies'
    )
    SELECT
      COALESCE(b.agency, c.agency) AS agency,
      b.backlog AS baseline,
      c.backlog AS current,
      (c.backlog - b.backlog) AS delta_abs,
      CASE
        WHEN b.backlog > 0
        THEN ROUND((c.backlog::numeric - b.backlog) / b.backlog * 100, 1)::float
        ELSE NULL
      END AS delta_pct
    FROM baseline b
    FULL OUTER JOIN current c USING (agency)
    WHERE b.backlog IS NOT NULL OR c.backlog IS NOT NULL
    ORDER BY GREATEST(COALESCE(b.backlog, 0), COALESCE(c.backlog, 0)) DESC
  `) as {
    agency: string;
    baseline: number | null;
    current: number | null;
    delta_abs: number | null;
    delta_pct: number | null;
  }[];

  const agencies = summaryRows.map((r) => r.agency);
  const seriesRows = (await sql`
    SELECT agency, fiscal_year, fiscal_quarter, backlog::int AS backlog
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND agency = ANY(${agencies})
      AND (fiscal_year > ${baselineFy} OR
           (fiscal_year = ${baselineFy} AND fiscal_quarter >= ${baselineQ}))
      AND (fiscal_year < ${currentFy} OR
           (fiscal_year = ${currentFy} AND fiscal_quarter <= ${currentQ}))
    ORDER BY agency, fiscal_year, fiscal_quarter
  `) as {
    agency: string;
    fiscal_year: number;
    fiscal_quarter: number;
    backlog: number | null;
  }[];

  const seriesByAgency = new Map<string, QuarterlyPoint[]>();
  for (const row of seriesRows) {
    const arr = seriesByAgency.get(row.agency) ?? [];
    arr.push({
      fy: row.fiscal_year,
      q: row.fiscal_quarter,
      label: calendarLabel(row.fiscal_year, row.fiscal_quarter),
      x: quarterDecimalX(row.fiscal_year, row.fiscal_quarter),
      backlog: row.backlog,
    });
    seriesByAgency.set(row.agency, arr);
  }

  return {
    baselineLabel: calendarLabel(baselineFy, baselineQ),
    currentLabel: calendarLabel(currentFy, currentQ),
    baselineFiscal: `FY${baselineFy} Q${baselineQ}`,
    currentFiscal: `FY${currentFy} Q${currentQ}`,
    points: summaryRows.map((r) => ({
      ...r,
      slug: slugify(r.agency),
      series: seriesByAgency.get(r.agency) ?? [],
    })),
  };
}

// ---------- Bridged annual + quarterly timeline ----------

export type TimelinePoint = {
  /** Decimal year for the END of the period (e.g. FY2024 → 2024.75). */
  x: number;
  /** Sum of pending_end (annual) or backlog (quarterly) across agencies. */
  y: number | null;
  /** Display label for tooltips. */
  label: string;
};

export type BridgedTimeline = {
  annual: TimelinePoint[];
  quarterly: TimelinePoint[];
};

/**
 * Total federal FOIA pending across every agency, with annual values
 * FY2008-FY2024 and quarterly values from FY2025 Q1 onward (so the
 * series don't overlap). Both segments use end-of-period decimal years
 * for the x-axis, so the chart reads as one continuous timeline even
 * though the metric definitions differ slightly.
 */
export async function getBridgedTimeline(): Promise<BridgedTimeline> {
  const annualRows = (await sql`
    SELECT fiscal_year, SUM(pending_end)::int AS total
    FROM foia_annual
    WHERE component = 'Agency Overall'
      AND agency <> 'All agencies'
      AND pending_end IS NOT NULL
    GROUP BY fiscal_year
    ORDER BY fiscal_year
  `) as { fiscal_year: number; total: number | null }[];

  const quarterlyRows = (await sql`
    SELECT fiscal_year, fiscal_quarter, SUM(backlog)::int AS total
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND agency <> 'All agencies'
      AND backlog IS NOT NULL
      AND (fiscal_year > 2024 OR (fiscal_year = 2024 AND fiscal_quarter = 4))
    GROUP BY fiscal_year, fiscal_quarter
    ORDER BY fiscal_year, fiscal_quarter
  `) as {
    fiscal_year: number;
    fiscal_quarter: number;
    total: number | null;
  }[];

  // Federal fiscal years end Sept 30. So FY2024 → x = 2024 + 9/12 = 2024.75.
  const fyEndOffset = 9 / 12;

  const annual: TimelinePoint[] = annualRows.map((r) => ({
    x: r.fiscal_year + fyEndOffset,
    y: r.total,
    label: `FY${r.fiscal_year}`,
  }));

  // Quarter end months: Q1 → Dec 31, Q2 → Mar 31, Q3 → Jun 30, Q4 → Sep 30.
  // Of the calendar year that contains the END of the quarter:
  // FY2025 Q1 ends Dec 31, 2024 → x = 2024 + 12/12 = 2025.
  // FY2025 Q2 ends Mar 31, 2025 → x = 2025 + 3/12 = 2025.25.
  function quarterEndX(fy: number, q: number): number {
    const calendarYear = q === 1 ? fy - 1 : fy;
    const monthFraction = q === 1 ? 12 / 12 : ((q - 1) * 3) / 12;
    return calendarYear + monthFraction;
  }

  const quarterly: TimelinePoint[] = quarterlyRows.map((r) => ({
    x: quarterEndX(r.fiscal_year, r.fiscal_quarter),
    y: r.total,
    label: `FY${r.fiscal_year} Q${r.fiscal_quarter}`,
  }));

  return { annual, quarterly };
}

// ---------- Editorial standfirst stats ----------

export type EditorialStats = {
  total_baseline: number | null;
  total_current: number | null;
  total_change: number | null;
  /** Agencies present in BOTH the baseline and current quarter, which
   *  defines the comparable set the totals are summed over. DHS and other
   *  non-quarterly filers are not included. */
  compared_agency_count: number;
  agencies_falling_behind: number | null;
  top_n: number;
  doj_oldest_date: string | null;
  doj_oldest_days: number | null;
  oldest_overall_agency: string | null;
  oldest_overall_days: number | null;
  oldest_overall_date: string | null;
  baseline_label: string;
  current_label: string;
};

export async function getEditorialStats(topN: number = 25): Promise<EditorialStats> {
  const recent = await getMostRecentQuarter();
  const fy = recent?.fy ?? 2026;
  const q = recent?.q ?? 2;

  // Baseline: FY2025 Q1 = Oct–Dec 2024, the last full quarter before the
  // Trump 2.0 inauguration (Jan 20, 2025).
  const baselineFy = 2025;
  const baselineQ = 1;

  // Total federal backlog at baseline and current — apples-to-apples by
  // restricting to the intersection of agencies that reported BOTH the
  // baseline and the current quarter. DHS (largest non-quarterly filer)
  // never appears here; agencies that drop in or out across the window
  // are excluded from both sides so the totals stay comparable.
  const totals = (await sql`
    WITH baseline AS (
      SELECT agency, backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND agency <> 'All agencies'
        AND fiscal_year = ${baselineFy}
        AND fiscal_quarter = ${baselineQ}
        AND backlog IS NOT NULL
    ),
    current AS (
      SELECT agency, backlog
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND agency <> 'All agencies'
        AND fiscal_year = ${fy}
        AND fiscal_quarter = ${q}
        AND backlog IS NOT NULL
    )
    SELECT
      SUM(b.backlog)::int AS baseline,
      SUM(c.backlog)::int AS current,
      COUNT(*)::int AS agency_count
    FROM baseline b
    JOIN current c USING (agency)
  `) as {
    baseline: number | null;
    current: number | null;
    agency_count: number;
  }[];

  // Count of top-N (by backlog at current) agencies whose received > processed
  // across the Trump-2.0 window.
  const fallingBehind = (await sql`
    WITH window_totals AS (
      SELECT
        agency,
        SUM(received) AS received,
        SUM(processed) AS processed
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND agency <> 'All agencies'
        AND received IS NOT NULL AND processed IS NOT NULL
        AND (
          fiscal_year = 2025 OR
          (fiscal_year = ${fy} AND fiscal_quarter <= ${q})
        )
      GROUP BY agency
    ),
    current_top AS (
      SELECT agency
      FROM foia_quarterly
      WHERE component = 'Agency Overall'
        AND agency <> 'All agencies'
        AND fiscal_year = ${fy} AND fiscal_quarter = ${q}
        AND backlog IS NOT NULL
      ORDER BY backlog DESC NULLS LAST
      LIMIT ${topN}
    )
    SELECT count(*)::int AS n
    FROM window_totals w
    JOIN current_top t USING (agency)
    WHERE w.received > w.processed
  `) as { n: number }[];

  // DOJ's oldest pending request (FY2024 reporting)
  const doj = (await sql`
    SELECT date_received::text AS date_received, days_pending::int AS days_pending
    FROM foia_oldest_pending
    WHERE agency = 'Department of Justice'
      AND component = 'Agency Overall'
      AND fiscal_year = (
        SELECT MAX(fiscal_year) FROM foia_oldest_pending
        WHERE agency = 'Department of Justice' AND component = 'Agency Overall'
      )
      AND days_pending IS NOT NULL
    ORDER BY days_pending DESC
    LIMIT 1
  `) as { date_received: string | null; days_pending: number | null }[];

  // Oldest pending request across the whole federal government (latest year)
  const overall = (await sql`
    SELECT agency, date_received::text AS date_received, days_pending::int AS days_pending
    FROM foia_oldest_pending
    WHERE component = 'Agency Overall'
      AND agency <> 'All agencies'
      AND fiscal_year = (
        SELECT MAX(fiscal_year) FROM foia_oldest_pending WHERE component = 'Agency Overall'
      )
      AND days_pending IS NOT NULL
    ORDER BY days_pending DESC
    LIMIT 1
  `) as { agency: string; date_received: string | null; days_pending: number | null }[];

  return {
    total_baseline: totals[0]?.baseline ?? null,
    total_current: totals[0]?.current ?? null,
    total_change:
      totals[0]?.baseline != null && totals[0]?.current != null
        ? totals[0].current - totals[0].baseline
        : null,
    compared_agency_count: totals[0]?.agency_count ?? 0,
    agencies_falling_behind: fallingBehind[0]?.n ?? null,
    top_n: topN,
    doj_oldest_date: doj[0]?.date_received ?? null,
    doj_oldest_days: doj[0]?.days_pending ?? null,
    oldest_overall_agency: overall[0]?.agency ?? null,
    oldest_overall_days: overall[0]?.days_pending ?? null,
    oldest_overall_date: overall[0]?.date_received ?? null,
    baseline_label: calendarLabel(baselineFy, baselineQ),
    current_label: calendarLabel(fy, q),
  };
}

// ---------- Throughput companion (received vs processed) ----------

export type ThroughputRow = {
  agency: string;
  slug: string;
  received: number;
  processed: number;
  net_gap: number;       // received - processed; positive = falling behind
  catch_up_ratio: number; // processed / received; <1 means falling behind
};

/**
 * Sums received and processed across the Trump-2.0 quarterly window
 * (FY2025 Q1 through the most recent published quarter). Returns the
 * gap and the catch-up ratio so the home page can show "why" backlogs
 * moved, not just that they did.
 */
export async function getThroughputDuringTrump2(
  limit: number = 12
): Promise<ThroughputRow[]> {
  const recent = await getMostRecentQuarter();
  const fy = recent?.fy ?? 2026;
  const q = recent?.q ?? 2;

  const rows = (await sql`
    SELECT
      agency,
      SUM(received)::int  AS received,
      SUM(processed)::int AS processed
    FROM foia_quarterly
    WHERE component = 'Agency Overall'
      AND agency <> 'All agencies'
      AND received IS NOT NULL
      AND processed IS NOT NULL
      AND (
        (fiscal_year = 2025) OR
        (fiscal_year = ${fy} AND fiscal_quarter <= ${q})
      )
    GROUP BY agency
    HAVING SUM(received) > 0
    ORDER BY SUM(received) DESC
    LIMIT ${limit}
  `) as { agency: string; received: number; processed: number }[];

  return rows.map((r) => ({
    agency: r.agency,
    slug: slugify(r.agency),
    received: r.received,
    processed: r.processed,
    net_gap: r.received - r.processed,
    catch_up_ratio: r.received > 0 ? r.processed / r.received : 0,
  }));
}

// ---------- Wall of Shame teaser ----------

export type WallOfShameRow = {
  agency: string;
  slug: string;
  rank: number;
  date_received: string | null;
  days_pending: number;
  fiscal_year: number;
};

export async function getWallOfShame(limit: number = 5): Promise<WallOfShameRow[]> {
  const rows = (await sql`
    SELECT
      agency,
      rank,
      date_received::text AS date_received,
      days_pending::int AS days_pending,
      fiscal_year
    FROM foia_oldest_pending
    WHERE component = 'Agency Overall'
      AND fiscal_year = (SELECT MAX(fiscal_year) FROM foia_oldest_pending WHERE component = 'Agency Overall')
      AND days_pending IS NOT NULL
      AND agency <> 'All agencies'
    ORDER BY days_pending DESC
    LIMIT ${limit}
  `) as Omit<WallOfShameRow, "slug">[];
  return rows.map((r) => ({ ...r, slug: slugify(r.agency) }));
}

// ---------- Agency detail ----------

export type AgencyDetail = {
  agency: string;
  slug: string;
  annual: { fiscal_year: number; pending_end: number | null; received: number | null; processed: number | null }[];
  quarterly: { fiscal_year: number; fiscal_quarter: number; backlog: number | null; received: number | null; processed: number | null }[];
};

export async function getAllAgencySlugs(): Promise<{ agency: string; slug: string }[]> {
  const rows = (await sql`
    SELECT DISTINCT agency
    FROM foia_annual
    WHERE component = 'Agency Overall' AND agency <> 'All agencies'
    ORDER BY agency
  `) as { agency: string }[];
  return rows.map((r) => ({ agency: r.agency, slug: slugify(r.agency) }));
}

export async function getAgencyBySlug(slug: string): Promise<string | null> {
  const all = await getAllAgencySlugs();
  return all.find((a) => a.slug === slug)?.agency ?? null;
}

export type OldestPendingRow = {
  rank: number;
  date_received: string | null;
  days_pending: number | null;
};

export type ExemptionRow = {
  exemption: string;
  invocations: number | null;
};

export type PersonnelRow = {
  fiscal_year: number;
  full_time: number | null;
  equivalent_fte: number | null;
  total_fte: number | null;
};

export async function getAgencyDetail(slug: string): Promise<AgencyDetail | null> {
  const agency = await getAgencyBySlug(slug);
  if (!agency) return null;

  const [annual, quarterly] = await Promise.all([
    sql`
      SELECT fiscal_year, pending_end::int AS pending_end, received::int AS received, processed::int AS processed
      FROM foia_annual
      WHERE agency = ${agency} AND component = 'Agency Overall'
      ORDER BY fiscal_year
    `,
    sql`
      SELECT fiscal_year, fiscal_quarter, backlog::int AS backlog, received::int AS received, processed::int AS processed
      FROM foia_quarterly
      WHERE agency = ${agency} AND component = 'Agency Overall'
      ORDER BY fiscal_year, fiscal_quarter
    `,
  ]);

  return {
    agency,
    slug,
    annual: annual as AgencyDetail["annual"],
    quarterly: quarterly as AgencyDetail["quarterly"],
  };
}

export async function getAgencyOldestPending(
  agency: string,
  fiscalYear: number = 2024
): Promise<OldestPendingRow[]> {
  const rows = (await sql`
    SELECT rank, date_received::text AS date_received, days_pending::int AS days_pending
    FROM foia_oldest_pending
    WHERE agency = ${agency}
      AND component = 'Agency Overall'
      AND fiscal_year = ${fiscalYear}
    ORDER BY rank
  `) as OldestPendingRow[];
  return rows;
}

export async function getAgencyExemptions(
  agency: string,
  fiscalYear: number = 2024
): Promise<ExemptionRow[]> {
  const rows = (await sql`
    SELECT exemption, invocations::int AS invocations
    FROM foia_exemptions
    WHERE agency = ${agency}
      AND component = 'Agency Overall'
      AND fiscal_year = ${fiscalYear}
    ORDER BY
      CASE WHEN exemption LIKE 'Ex. 7%' THEN 7 ELSE
        CAST(REGEXP_REPLACE(exemption, '[^0-9]', '', 'g') AS int)
      END,
      exemption
  `) as ExemptionRow[];
  return rows;
}

export async function getAgencyPersonnel(
  agency: string
): Promise<PersonnelRow[]> {
  const rows = (await sql`
    SELECT fiscal_year, full_time::int AS full_time,
      equivalent_fte::float AS equivalent_fte,
      total_fte::float AS total_fte
    FROM foia_personnel
    WHERE agency = ${agency} AND component = 'Agency Overall'
    ORDER BY fiscal_year
  `) as PersonnelRow[];
  return rows;
}
