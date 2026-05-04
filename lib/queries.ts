import { sql } from "./db";
import { slugify } from "./slug";

export type FreshnessRow = {
  source: string;
  ended_at: string | null;
  records: number | null;
  status: string | null;
};

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

export type SlopePoint = {
  agency: string;
  slug: string;
  baseline: number | null;
  current: number | null;
  delta_abs: number | null;
  delta_pct: number | null;
};

export type SlopeChartData = {
  baselineLabel: string;  // e.g. "FY2024 Q4" — last quarter fully before Jan 20, 2025
  currentLabel: string;   // e.g. "FY2026 Q2" — most recent published
  points: SlopePoint[];
};

export async function getSlopeChartData(): Promise<SlopeChartData> {
  const recent = await getMostRecentQuarter();
  const currentFy = recent?.fy ?? 2026;
  const currentQ = recent?.q ?? 2;

  // Baseline: FY2024 Q4 = Jul–Sep 2024, the last full quarter before Trump 2.
  const baselineFy = 2024;
  const baselineQ = 4;

  const rows = (await sql`
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
  `) as Omit<SlopePoint, "slug">[];

  return {
    baselineLabel: `FY${baselineFy} Q${baselineQ}`,
    currentLabel: `FY${currentFy} Q${currentQ}`,
    points: rows.map((r) => ({ ...r, slug: slugify(r.agency) })),
  };
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
