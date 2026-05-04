import { sql } from "@/lib/db";
import { csvResponse, rowsToCsv } from "@/lib/csv";
import { getSlopeChartData } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Dataset = {
  filename: string;
  fetch: () => Promise<{ rows: Record<string, unknown>[]; columns?: string[] }>;
};

const DATASETS: Record<string, Dataset> = {
  annual: {
    filename: "foia-tracker-annual.csv",
    async fetch() {
      const rows = (await sql`
        SELECT agency, component, fiscal_year, pending_start, received,
          processed, pending_end
        FROM foia_annual
        ORDER BY agency, component, fiscal_year
      `) as Record<string, unknown>[];
      return { rows };
    },
  },
  quarterly: {
    filename: "foia-tracker-quarterly.csv",
    async fetch() {
      const rows = (await sql`
        SELECT agency, component, fiscal_year, fiscal_quarter,
          received, processed, backlog
        FROM foia_quarterly
        ORDER BY agency, fiscal_year, fiscal_quarter
      `) as Record<string, unknown>[];
      return { rows };
    },
  },
  "oldest-pending": {
    filename: "foia-tracker-oldest-pending.csv",
    async fetch() {
      const rows = (await sql`
        SELECT agency, component, fiscal_year, rank,
          date_received::text AS date_received, days_pending
        FROM foia_oldest_pending
        ORDER BY agency, fiscal_year, rank
      `) as Record<string, unknown>[];
      return { rows };
    },
  },
  exemptions: {
    filename: "foia-tracker-exemptions.csv",
    async fetch() {
      const rows = (await sql`
        SELECT agency, component, fiscal_year, exemption, invocations
        FROM foia_exemptions
        ORDER BY agency, fiscal_year, exemption
      `) as Record<string, unknown>[];
      return { rows };
    },
  },
  personnel: {
    filename: "foia-tracker-personnel.csv",
    async fetch() {
      const rows = (await sql`
        SELECT agency, component, fiscal_year, full_time, equivalent_fte, total_fte
        FROM foia_personnel
        ORDER BY agency, fiscal_year
      `) as Record<string, unknown>[];
      return { rows };
    },
  },
  slope: {
    filename: "foia-tracker-slope.csv",
    async fetch() {
      const data = await getSlopeChartData();
      const columns = [
        "agency",
        "baseline_period",
        "baseline_backlog",
        "current_period",
        "current_backlog",
        "delta_abs",
        "delta_pct",
      ];
      const rows = data.points.map((p) => ({
        agency: p.agency,
        baseline_period: data.baselineLabel,
        baseline_backlog: p.baseline ?? "",
        current_period: data.currentLabel,
        current_backlog: p.current ?? "",
        delta_abs: p.delta_abs ?? "",
        delta_pct: p.delta_pct ?? "",
      }));
      return { rows, columns };
    },
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dataset: string }> }
) {
  const { dataset } = await params;
  const key = dataset.replace(/\.csv$/i, "");
  const def = DATASETS[key];
  if (!def) {
    return new Response(
      `Unknown dataset: ${dataset}. Available: ${Object.keys(DATASETS).join(", ")}`,
      { status: 404 }
    );
  }
  const { rows, columns } = await def.fetch();
  const body = rowsToCsv(rows, columns);
  return csvResponse(def.filename, body);
}
